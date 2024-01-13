import { IEventBusService, ISearchService } from "@medusajs/types";
import StockLocationService from "@medusajs/stock-location/dist/services/stock-location";
import { StockLocation } from "@medusajs/stock-location/dist/models";
import {
  SubscriberConfig,
  SubscriberArgs,
} from "@medusajs/medusa/dist/types/subscribers";
import { MedusaContainer } from "@medusajs/medusa";

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

export default async function searchStockLocationsIndexingUpdateHandler({
  data,
  eventName,
  container,
  pluginOptions,
}: SubscriberArgs<Record<string, any>>) {
  const searchStockLocationsIndexing: SearchStockLocationsIndexing =
    new SearchStockLocationsIndexing(container);
  await searchStockLocationsIndexing.indexDocumentsAsync();
}

export const config: SubscriberConfig = {
  event: "SEARCH_INDEX_EVENT",
  context: {
    subscriberId: "search-stock-locations-indexing",
  },
};
