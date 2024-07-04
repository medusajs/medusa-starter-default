import { defineMikroOrmCliConfig } from "@medusajs/utils";
import path from "path";
import Test from "./models/test";

export default defineMikroOrmCliConfig({
  entities: [Test],
  migrations: {
    path: path.join(__dirname, "migrations"),
  },
});
