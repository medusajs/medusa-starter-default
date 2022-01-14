import { Router } from "express";
import * as bodyParser from "body-parser";
import cors from "cors";
import { getConfigFile } from "medusa-core-utils";

import middlewares from "../middleware";

const route = Router()

export default (app: Router, rootDirectory: string): Router => {
    app.use("/my-custom-route", route);

    const { configModule } = getConfigFile(rootDirectory, "medusa-config") as Record<string, unknown>;
    const { projectConfig } = configModule as { projectConfig: { store_cors: string } };

    const corsOptions = {
        origin: projectConfig.store_cors.split(","),
        credentials: true,
    };

    route.options("/my-custom-path", cors(corsOptions));
    route.post(
        "/my-custom-path",
        cors(corsOptions),
        bodyParser.json(),
        middlewares.wrap(require("./custom-route-handle").default)
    );
    return app;
}
