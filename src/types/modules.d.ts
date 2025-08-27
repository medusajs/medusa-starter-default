import { MedusaContainer } from "@medusajs/framework/types"
import BrandsService from "../modules/brands/service"
import InvoicingService from "../modules/invoicing/service" 
import MachinesModuleService from "../modules/machines/service"
import PurchasingService from "../modules/purchasing/service"
import RentalsModuleService from "../modules/rentals/service"
import ServiceOrdersService from "../modules/service-orders/service"
import StockLocationDetailsService from "../modules/stock-location-details/service"
import TechniciansService from "../modules/technicians/service"
import UserPreferencesService from "../modules/user-preferences/service"
import WarrantiesService from "../modules/warranties/service"

declare module "@medusajs/framework/types" {
  interface MedusaContainer {
    brands: BrandsService
    invoicing: InvoicingService
    machines: MachinesModuleService
    purchasing: PurchasingService
    rentals: RentalsModuleService
    serviceOrders: ServiceOrdersService
    stockLocationDetails: StockLocationDetailsService
    technicians: TechniciansService
    userPreferences: UserPreferencesService
    warranties: WarrantiesService
  }
}