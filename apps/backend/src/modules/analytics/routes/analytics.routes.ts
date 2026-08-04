import { Router } from 'express';
import { optionalAuthenticate } from '../../../middlewares/auth.middleware';
import { analyticsController } from '../controller/analytics.controller';

const analyticsRouter = Router();

analyticsRouter.post('/events', optionalAuthenticate, (req, res, next) =>
  analyticsController.ingest(req, res, next),
);

export { analyticsRouter };
