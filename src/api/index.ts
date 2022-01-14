import { Router } from "express";
import routes from "./routes";

export default (rootDirectory: string, pluginConfig: Record<string, unknown>): Router => {
  const app = Router();

  routes(app, rootDirectory);

  return app;
};
