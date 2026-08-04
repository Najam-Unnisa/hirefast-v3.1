import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { assessmentsController } from '../controller/assessments.controller';

const assessmentsRouter = Router();
const attemptsRouter = Router();
const candidateAccess = [authenticate, authorize(ROLES.GUEST, ROLES.USER)];

assessmentsRouter.use(...candidateAccess);
assessmentsRouter.get('/', (req, res, next) => assessmentsController.list(req, res, next));
assessmentsRouter.get('/slug/:slug', (req, res, next) =>
  assessmentsController.getBySlug(req, res, next),
);
assessmentsRouter.post('/:assessmentId/attempts', (req, res, next) =>
  assessmentsController.startAttempt(req, res, next),
);
assessmentsRouter.get('/:id', (req, res, next) => assessmentsController.getById(req, res, next));

attemptsRouter.use(...candidateAccess);
attemptsRouter.get('/me', authorize(ROLES.USER, ROLES.ADMIN), (req, res, next) =>
  assessmentsController.listMyAttempts(req, res, next),
);
attemptsRouter.get('/:attemptId', (req, res, next) =>
  assessmentsController.getAttempt(req, res, next),
);
attemptsRouter.get('/:attemptId/questions', (req, res, next) =>
  assessmentsController.getQuestions(req, res, next),
);
attemptsRouter.put('/:attemptId/responses/:questionId', (req, res, next) =>
  assessmentsController.saveResponse(req, res, next),
);
attemptsRouter.patch('/:attemptId/responses', (req, res, next) =>
  assessmentsController.saveResponses(req, res, next),
);
attemptsRouter.post('/:attemptId/submit', (req, res, next) =>
  assessmentsController.submit(req, res, next),
);
attemptsRouter.get('/:attemptId/status', (req, res, next) =>
  assessmentsController.getStatus(req, res, next),
);
attemptsRouter.get('/:attemptId/evaluation', (req, res, next) =>
  assessmentsController.getEvaluation(req, res, next),
);
attemptsRouter.post('/:attemptId/evaluation', (req, res, next) =>
  assessmentsController.triggerEvaluation(req, res, next),
);
attemptsRouter.get('/:attemptId/jrs', (req, res, next) =>
  assessmentsController.getJrs(req, res, next),
);
attemptsRouter.get('/:attemptId/ai-evaluation', (req, res, next) =>
  assessmentsController.getAiEvaluation(req, res, next),
);
attemptsRouter.get('/:attemptId/reports', (req, res, next) =>
  assessmentsController.getReports(req, res, next),
);

export { assessmentsRouter, attemptsRouter };
