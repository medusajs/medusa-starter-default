import { NextFunction, Request, Response } from 'express';

export default (
    fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => Promise<void> => {
    return (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);
}