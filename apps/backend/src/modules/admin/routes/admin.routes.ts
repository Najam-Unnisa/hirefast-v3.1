import { Router } from 'express';
import { ROLES } from '../../../constants/roles';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';
import { adminController } from '../controller/admin.controller';

/**
 * Admin Portal API — Phase 10 contracts + operational extensions.
 * Authorization: authenticated ADMIN role only (no subscription gating).
 */
const adminRouter = Router();

adminRouter.use(authenticate, authorize(ROLES.ADMIN));

adminRouter.get('/analytics/overview', (req, res, next) =>
  adminController.overview(req, res, next),
);
adminRouter.get('/analytics/events', (req, res, next) =>
  adminController.listAnalyticsEvents(req, res, next),
);
adminRouter.post('/analytics/events', (req, res, next) =>
  adminController.ingestEvent(req, res, next),
);
adminRouter.get('/analytics/platform-report', (req, res, next) =>
  adminController.platformReport(req, res, next),
);

adminRouter.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
adminRouter.get('/users/:userId', (req, res, next) => adminController.getUser(req, res, next));
adminRouter.patch('/users/:userId', (req, res, next) => adminController.patchUser(req, res, next));
adminRouter.get('/users/:userId/attempts', (req, res, next) =>
  adminController.listUserAttempts(req, res, next),
);
adminRouter.get('/users/:userId/reports', (req, res, next) =>
  adminController.listUserReports(req, res, next),
);

adminRouter.get('/assessments', (req, res, next) =>
  adminController.listAssessments(req, res, next),
);
adminRouter.post('/assessments', (req, res, next) =>
  adminController.createAssessment(req, res, next),
);
adminRouter.get('/assessments/:assessmentId', (req, res, next) =>
  adminController.getAssessment(req, res, next),
);
adminRouter.put('/assessments/:assessmentId', (req, res, next) =>
  adminController.updateAssessment(req, res, next),
);
adminRouter.patch('/assessments/:assessmentId/status', (req, res, next) =>
  adminController.patchAssessmentStatus(req, res, next),
);
adminRouter.post('/assessments/:assessmentId/duplicate', (req, res, next) =>
  adminController.duplicateAssessment(req, res, next),
);
adminRouter.get('/assessments/:assessmentId/questions', (req, res, next) =>
  adminController.listQuestions(req, res, next),
);
adminRouter.post('/assessments/:assessmentId/questions', (req, res, next) =>
  adminController.createQuestion(req, res, next),
);
adminRouter.put('/assessments/:assessmentId/skills/:skillId', (req, res, next) =>
  adminController.updateSkillWeight(req, res, next),
);

adminRouter.put('/questions/:questionId', (req, res, next) =>
  adminController.updateQuestion(req, res, next),
);
adminRouter.delete('/questions/:questionId', (req, res, next) =>
  adminController.deleteQuestion(req, res, next),
);
adminRouter.post('/questions/:questionId/options', (req, res, next) =>
  adminController.addOption(req, res, next),
);
adminRouter.put('/question-options/:optionId', (req, res, next) =>
  adminController.updateOption(req, res, next),
);
adminRouter.delete('/question-options/:optionId', (req, res, next) =>
  adminController.deleteOption(req, res, next),
);

adminRouter.get('/categories', (req, res, next) => adminController.listCategories(req, res, next));
adminRouter.get('/skills', (req, res, next) => adminController.listSkills(req, res, next));

adminRouter.get('/reports', (req, res, next) => adminController.listReports(req, res, next));
adminRouter.get('/settings', (req, res, next) => adminController.listSettings(req, res, next));
adminRouter.put('/settings/:key', (req, res, next) =>
  adminController.upsertSetting(req, res, next),
);
adminRouter.get('/audit-logs', (req, res, next) => adminController.listAuditLogs(req, res, next));

adminRouter.get('/evaluations', (req, res, next) =>
  adminController.listEvaluations(req, res, next),
);
adminRouter.post('/evaluations/:attemptId/retry', (req, res, next) =>
  adminController.retryEvaluation(req, res, next),
);
adminRouter.get('/attempts/:attemptId', (req, res, next) =>
  adminController.getAttemptReview(req, res, next),
);

adminRouter.get('/hr-reviews', (req, res, next) => adminController.listHrReviews(req, res, next));
adminRouter.get('/hr-reviews/:reviewId', (req, res, next) =>
  adminController.getHrReview(req, res, next),
);
adminRouter.post('/hr-reviews', (req, res, next) => adminController.createHrReview(req, res, next));
adminRouter.patch('/hr-reviews/:reviewId', (req, res, next) =>
  adminController.patchHrReview(req, res, next),
);

export { adminRouter };
