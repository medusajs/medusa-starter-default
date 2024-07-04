import { Module } from "@medusajs/utils";
import CustomModuleService from "./service";

export default Module("CustomModule", { service: CustomModuleService });
