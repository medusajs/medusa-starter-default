import { IEventBusService, ISearchService } from "@medusajs/types";
import StockLocationService from "@medusajs/stock-location/dist/services/stock-location";
import { StockLocation } from "@medusajs/stock-location/dist/models";
import {
  SubscriberConfig,
  SubscriberArgs,
} from "@medusajs/medusa/dist/types/subscribers";
import { MedusaContainer } from "@medusajs/medusa";
import {
  FlagRouter,
  defaultSearchIndexingProductRelations,
} from "@medusajs/utils";
import { indexTypes } from "medusa-core-utils";
import ProductCategoryFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/product-categories";
import { SEARCH_INDEX_EVENT } from "@medusajs/medusa/dist/loaders/search-index";
import { Product } from "@medusajs/medusa/dist/models";
import ProductService from "@medusajs/medusa/dist/services/product";

class SearchStockLocationsIndexing {
  private readonly _indexName: string;
  private readonly _searchService: ISearchService;
  private readonly _stockLocationService: StockLocationService;
  private readonly _eventBusService: IEventBusService;
  private readonly _defaultRelations: string[];

  constructor(container: MedusaContainer) {
    this._indexName = "stock_locations";
    this._searchService = container.resolve("searchService");
    this._stockLocationService = container.resolve("stockLocationService");
    this._eventBusService = container.resolve("eventBusService");
    this._defaultRelations = ["address"];

    this.onCreationAsync = this.onCreationAsync.bind(this);
    this.onUpdateAsync = this.onUpdateAsync.bind(this);
    this.onDeletionAsync = this.onDeletionAsync.bind(this);

    this._eventBusService
      .subscribe(StockLocationService.Events.CREATED, this.onCreationAsync)
      .subscribe(StockLocationService.Events.UPDATED, this.onUpdateAsync)
      .subscribe(StockLocationService.Events.DELETED, this.onDeletionAsync);
  }

  public async indexDocumentsAsync(): Promise<void> {
    const take = (this._searchService?.options?.batch_size as number) ?? 1000;
    let hasMore = true;

    let skip: number = 0;
    while (hasMore) {
      const stockLocations = await this.retrieveNextStockLocationsAsync(
        skip,
        take
      );
      if (stockLocations.length > 0) {
        await this._searchService.addDocuments(
          this._indexName,
          stockLocations,
          "stock-locations"
        );
        skip += take;
      } else {
        hasMore = false;
      }
    }
  }

  private async retrieveNextStockLocationsAsync(
    skip: number,
    take: number
  ): Promise<StockLocation[]> {
    return await this._stockLocationService.list(
      {},
      {
        relations: this._defaultRelations,
        skip: skip,
        take: take,
        order: { id: "ASC" },
      }
    );
  }

  private async onCreationAsync(data): Promise<void> {
    const stockLocation = await this._stockLocationService.retrieve(data.id, {
      relations: this._defaultRelations,
    });
    await this._searchService.addDocuments(
      this._indexName,
      [stockLocation],
      "stock-locations"
    );
  }

  private async onUpdateAsync(data): Promise<void> {
    const stockLocation = await this._stockLocationService.retrieve(data.id, {
      relations: this._defaultRelations,
    });
    await this._searchService.addDocuments(
      this._indexName,
      [stockLocation],
      "stock-locations"
    );
  }

  private async onDeletionAsync(data): Promise<void> {
    await this._searchService.deleteDocument(this._indexName, data.id);
  }
}

class SearchProductIndexing {
  private readonly _indexName: string;
  private readonly _eventBusService: IEventBusService;
  private readonly _searchService: ISearchService;
  private readonly _productService: ProductService;
  private readonly _defaultRelations: string[];

  constructor(container: MedusaContainer) {
    this._indexName = "products_custom";
    this._searchService = container.resolve("searchService");
    this._eventBusService = container.resolve("eventBusService");
    this._productService = container.resolve("productService");
    this._defaultRelations = [
      "variants",
      "tags",
      "type",
      "collection",
      "variants.prices",
      "images",
      "variants.options",
      "options",
      "sales_channels",
    ];

    this.onCreationAsync = this.onCreationAsync.bind(this);
    this.onUpdateAsync = this.onUpdateAsync.bind(this);
    this.onDeletionAsync = this.onDeletionAsync.bind(this);

    this._eventBusService
      .subscribe(ProductService.Events.CREATED, this.onCreationAsync)
      .subscribe(ProductService.Events.UPDATED, this.onUpdateAsync)
      .subscribe(ProductService.Events.DELETED, this.onDeletionAsync);
  }

  public async indexDocumentsAsync(): Promise<void> {
    const take = (this._searchService?.options?.batch_size as number) ?? 1000;
    let hasMore = true;

    let lastSeenId = "";

    while (hasMore) {
      const products = await this.retrieveNextProducts(lastSeenId, take);

      if (products.length > 0) {
        await this._searchService.addDocuments(
          this._indexName,
          products,
          "products-custom"
        );
        lastSeenId = products[products.length - 1].id;
      } else {
        hasMore = false;
      }
    }
  }

  private async retrieveNextProducts(
    lastSeenId: string,
    take: number
  ): Promise<Product[]> {
    return await this._productService.list(
      { id: { gt: lastSeenId } },
      {
        relations: this._defaultRelations,
        take: take,
        order: { id: "ASC" },
      }
    );
  }

  private async onCreationAsync(data): Promise<void> {
    const products = await this._productService.retrieve(data.id, {
      relations: this._defaultRelations,
    });
    await this._searchService.addDocuments(
      this._indexName,
      [products],
      "products-custom"
    );
  }

  private async onUpdateAsync(data): Promise<void> {
    const stockLocation = await this._productService.retrieve(data.id, {
      relations: this._defaultRelations,
    });
    await this._searchService.addDocuments(
      this._indexName,
      [stockLocation],
      "products-custom"
    );
  }

  private async onDeletionAsync(data): Promise<void> {
    await this._searchService.deleteDocument(this._indexName, data.id);
  }
}

export default async function searchIndexHandler({
  data,
  eventName,
  container,
  pluginOptions,
}: SubscriberArgs<Record<string, any>>) {
  const searchProductsIndexing: SearchProductIndexing =
    new SearchProductIndexing(container);
  const searchStockLocationsIndexing: SearchStockLocationsIndexing =
    new SearchStockLocationsIndexing(container);
  await searchProductsIndexing.indexDocumentsAsync();
  await searchStockLocationsIndexing.indexDocumentsAsync();
}

export const config: SubscriberConfig = {
  event: "SEARCH_INDEX_EVENT",
  context: {
    subscriberId: "search-index-handler",
  },
};
