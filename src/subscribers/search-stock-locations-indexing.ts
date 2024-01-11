import { IEventBusService, ISearchService } from "@medusajs/types";
import StockLocationService from "@medusajs/stock-location/dist/services/stock-location";
import { StockLocation } from "@medusajs/stock-location/dist/models";
import {
  type SubscriberConfig,
  type SubscriberArgs,
} from "@medusajs/medusa/dist/types/subscribers";
import { MedusaContainer } from "@medusajs/medusa";

class SearchStockLocationsIndexing {
  private readonly _indexName: string;
  private readonly _eventBusService: IEventBusService;
  private readonly _searchService: ISearchService;
  private readonly _stockLocationService: StockLocationService;

  constructor(container: MedusaContainer) {
    this._indexName = "stock_locations";
    this._eventBusService = container.resolve("eventBusService");
    this._searchService = container.resolve("searchService");
    this._stockLocationService = container.resolve("stockLocationService");
  }

  public indexDocumentsAsync = async (): Promise<void> => {
    const TAKE = (this._searchService?.options?.batch_size as number) ?? 1000;
    let hasMore = true;

    let lastSeenId = "";

    while (hasMore) {
      const stockLocations = await this.retrieveNextStockLocations(
        lastSeenId,
        TAKE
      );

      if (stockLocations.length > 0) {
        await this._searchService.addDocuments(
          this._indexName,
          stockLocations,
          "stock-locations"
        );
        lastSeenId = stockLocations[stockLocations.length - 1].id;
      } else {
        hasMore = false;
      }
    }
  };

  protected async retrieveNextStockLocations(
    lastSeenId: string,
    take: number
  ): Promise<StockLocation[]> {
    const relations = ["address"];
    return await this._stockLocationService.list(
      { id: lastSeenId },
      {
        relations,
        take: take,
        order: { id: "ASC" },
      }
    );
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
