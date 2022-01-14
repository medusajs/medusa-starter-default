import { Request, Response } from 'express';

export default async (req: Request, res: Response): Promise<Response<void | Response<{ message: string }>>> => {
    try {
        return res.sendStatus(200);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
}
