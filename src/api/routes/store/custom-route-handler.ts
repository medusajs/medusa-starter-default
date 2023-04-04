import { Request, Response } from 'express'

export default async (req: Request, res: Response): Promise<void> => {
  res.sendStatus(200)
}
