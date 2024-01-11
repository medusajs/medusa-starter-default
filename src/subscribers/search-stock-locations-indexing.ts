import { IEventBusService, ISearchService } from "@medusajs/types";
import { defaultSearchIndexingProductRelations } from "@medusajs/utils";
import { indexTypes } from "medusa-core-utils";
import StockLocationService from "@medusajs/stock-location/dist/services/stock-location";
import { StockLocation } from "@medusajs/stock-location/dist/models";

type InjectedDependencies = {
  eventBusService: IEventBusService;
  searchService: ISearchService;
  stockLocationService: StockLocationService;
};

class SearchStockLocationsIndexingSubscriber {
  private readonly _indexName: string;
  private readonly _eventBusService: IEventBusService;
  private readonly _searchService: ISearchService;
  private readonly _stockLocationService: StockLocationService;

  constructor({
    eventBusService,
    searchService,
    stockLocationService,
  }: InjectedDependencies) {
    this._indexName = "stock_locations";
    this._eventBusService = eventBusService;
    this._searchService = searchService;
    this._stockLocationService = stockLocationService;

    this.indexDocumentsAsync = this.indexDocumentsAsync.bind(this);

    this._eventBusService.subscribe(
      "SEARCH_INDEX_EVENT",
      this.indexDocumentsAsync
    );
  }

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

  private indexDocumentsAsync = async (): Promise<void> => {
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
}

export default SearchStockLocationsIndexingSubscriber;
