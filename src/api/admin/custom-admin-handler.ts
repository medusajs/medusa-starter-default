import { Request, Response, Router } from "express";
import * as bodyParser from "body-parser";

export default (): Router => {
  const app = Router();
  app.use(bodyParser.json());

  app.get("/my-custom-admin-route", async (req: Request, res: Response): Promise<Response<void>> => {
        return res.status(200).json({});
  });

  return app;
};