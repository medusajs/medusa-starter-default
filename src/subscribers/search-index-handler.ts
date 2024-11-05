import { IEventBusService, ISearchService, IStockLocationService, ISalesChannelModuleService, AdminStockLocation, StockLocationExpandedDTO, IProductModuleService, ProductDTO } from "@medusajs/types";
import { Modules } from "@medusajs/framework/utils"
import {
  SubscriberConfig,
  SubscriberArgs,
  MedusaContainer
} from "@medusajs/framework";

class SearchStockLocationsIndexing {
  private readonly _indexName: string;
  private readonly _searchService: ISearchService;
  private readonly _stockLocationService: IStockLocationService;
  private readonly _salesChannelService: ISalesChannelModuleService;
  private readonly _eventBusService: IEventBusService;
  private readonly _defaultRelations: string[];

  constructor(container: MedusaContainer) {
    this._indexName = "stock_locations";
    this._searchService = container.resolve("searchService");
    this._stockLocationService = container.resolve(Modules.STOCK_LOCATION);
    this._salesChannelService = container.resolve(
      Modules.SALES_CHANNEL
    );
    this._eventBusService = container.resolve("eventBusService");
    this._defaultRelations = ["address", "sales_channels"];

    this.onCreationAsync = this.onCreationAsync.bind(this);
    this.onUpdateAsync = this.onUpdateAsync.bind(this);
    this.onDeletionAsync = this.onDeletionAsync.bind(this);

    this._eventBusService
      .subscribe('sales-channel.created', this.onCreationAsync)
      .subscribe('sales-channel.updated', this.onUpdateAsync)
      .subscribe('sales-channel.deleted', this.onDeletionAsync);
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
  ): Promise<(Partial<StockLocationExpandedDTO> & { sales_channel_ids: string[] })[]> {
    const customStockLocations: (Partial<StockLocationExpandedDTO> & {
      sales_channel_ids: string[];
    })[] = [];
    const stockLocations: StockLocationExpandedDTO[] = await this._stockLocationService.listStockLocations(
      {},
      {
        relations: this._defaultRelations,
        skip: skip,
        take: take,
        order: { id: "ASC" },
      }
    );
    for (const stockLocation of stockLocations) {
      const salesChannelIds = stockLocation.sales_channels.map((value) => value.id);
      customStockLocations.push({
        ...stockLocation,
        sales_channel_ids: salesChannelIds,
      });
    }
    return customStockLocations;
  }

  private async onCreationAsync(data): Promise<void> {
    const stockLocation: StockLocationExpandedDTO = await this._stockLocationService.retrieveStockLocation(data.id, {
      relations: this._defaultRelations,
    });
    const salesChannelIds = stockLocation.sales_channels.map((value) => value.id);
    const customStockLocation: Partial<StockLocationExpandedDTO> & {
      sales_channel_ids: string[];
    } = {
      ...stockLocation,
      sales_channel_ids: salesChannelIds,
    };
    await this._searchService.addDocuments(
      this._indexName,
      [customStockLocation],
      "stock-locations"
    );
  }

  private async onUpdateAsync(data): Promise<void> {
    const stockLocation: StockLocationExpandedDTO = await this._stockLocationService.retrieveStockLocation(data.id, {
      relations: this._defaultRelations,
    });
    const salesChannelIds = stockLocation.sales_channels.map((value) => value.id);
    const customStockLocation: Partial<StockLocationExpandedDTO> & {
      sales_channel_ids: string[];
    } = {
      ...stockLocation,
      sales_channel_ids: salesChannelIds,
    };
    await this._searchService.addDocuments(
      this._indexName,
      [customStockLocation],
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
  private readonly _productService: IProductModuleService;
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
      .subscribe('product.created', this.onCreationAsync)
      .subscribe('product.updated', this.onUpdateAsync)
      .subscribe('product.deleted', this.onDeletionAsync);
  }

  public async indexDocumentsAsync(): Promise<void> {
    const take = (this._searchService?.options?.batch_size as number) ?? 1000;
    let hasMore = true;

    let skip: number = 0;
    while (hasMore) {
      const products = await this.retrieveNextProducts(skip, take);
      const documents = this.transformDocuments(products);

      if (products.length > 0) {
        await this._searchService.addDocuments(
          this._indexName,
          documents,
          "products-custom"
        );
        skip += take;
      } else {
        hasMore = false;
      }
    }
  }

  private async retrieveNextProducts(
    skip: number,
    take: number
  ): Promise<ProductDTO[]> {
    return await this._productService.listProducts(
      {},
      {
        relations: this._defaultRelations,
        take: take,
        skip: skip,
        order: { id: "ASC" },
      }
    );
  }

  private async onCreationAsync(data): Promise<void> {
    const product = await this._productService.retrieveProduct(data.id, {
      relations: this._defaultRelations,
    });
    const documents = this.transformDocuments([product]);
    await this._searchService.addDocuments(
      this._indexName,
      documents,
      "products-custom"
    );
  }

  private async onUpdateAsync(data): Promise<void> {
    const product = await this._productService.retrieveProduct(data.id, {
      relations: this._defaultRelations,
    });
    const documents = this.transformDocuments([product]);
    await this._searchService.addDocuments(
      this._indexName,
      documents,
      "products-custom"
    );
  }

  private async onDeletionAsync(data): Promise<void> {
    await this._searchService.deleteDocument(this._indexName, data.id);
  }

  private transformDocuments(products: ProductDTO[]): Record<string, any> {
    const documents: Record<string, any>[] = [];
    for (const product of products) {
      let salesChannelIds = [];
      if (Object.keys(product).includes('sales_channels') && product['sales_channels']) {
        salesChannelIds =
          product['sales_channels']?.map((value) => value.id) ?? [];
      }
      const document = Object.keys(product)
        .filter((objKey) => objKey !== "sales_channels")
        .reduce((newObj, key) => {
          newObj[key] = product[key];
          return newObj;
        }, {});

      documents.push({ ...document, sales_channel_ids: salesChannelIds });
    }

    return documents;
  }
}

export default async function searchIndexHandler({
  event,
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
