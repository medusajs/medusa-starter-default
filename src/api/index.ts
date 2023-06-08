import { ConfigModule } from "@medusajs/medusa/dist/types/global";
import { Router } from "express";
import { getConfigFile } from "medusa-core-utils";
import { getAdminRouter } from "./routes/admin";
import { getStoreRouter } from "./routes/store";

export default (rootDirectory: string): Router | Router[] => {
  const { configModule } = getConfigFile<ConfigModule>(
    rootDirectory,
    "medusa-config"
  );
  const { projectConfig } = configModule;

  const storeCorsOptions = {
    origin: projectConfig.store_cors.split(","),
    credentials: true,
  };

  const adminCorsOptions = {
    origin: projectConfig.admin_cors.split(","),
    credentials: true,
  };

  const storeRouter = getStoreRouter(storeCorsOptions);
  const adminRouter = getAdminRouter(adminCorsOptions);

  return [storeRouter, adminRouter];
};
