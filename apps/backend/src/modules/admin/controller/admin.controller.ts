import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { requestAuditContext } from '../../../services/audit.service';
import { trackEvent } from '../../../services/analytics.service';
import { sendSuccess } from '../../../utils/api-response';
import { adminAssessmentsService } from '../service/admin-assessments.service';
import { adminOpsService } from '../service/admin-ops.service';
import { adminUsersService } from '../service/admin-users.service';

function actorId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class AdminController {
  async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await adminUsersService.listUsers(req.query as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await adminUsersService.getUser(req.params.userId));
    } catch (error) {
      next(error);
    }
  }

  async patchUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminUsersService.patchUser(
          actorId(req),
          req.params.userId,
          req.body ?? {},
          requestAuditContext(req),
        ),
        'User updated.',
      );
    } catch (error) {
      next(error);
    }
  }

  async listUserAttempts(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminUsersService.listUserAttempts(
          req.params.userId,
          req.query as Record<string, unknown>,
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  async listUserReports(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminUsersService.listUserReports(
          req.params.userId,
          req.query as Record<string, unknown>,
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  async listAssessments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.listAssessments(req.query as Record<string, unknown>),
      );
    } catch (error) {
      next(error);
    }
  }

  async createAssessment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.createAssessment(
          actorId(req),
          req.body ?? {},
          requestAuditContext(req),
        ),
        'Assessment created.',
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async getAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await adminAssessmentsService.getAssessment(req.params.assessmentId));
    } catch (error) {
      next(error);
    }
  }

  async updateAssessment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.updateAssessment(
          actorId(req),
          req.params.assessmentId,
          req.body ?? {},
          requestAuditContext(req),
        ),
        'Assessment updated.',
      );
    } catch (error) {
      next(error);
    }
  }

  async patchAssessmentStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.patchStatus(
          actorId(req),
          req.params.assessmentId,
          req.body?.status,
          requestAuditContext(req),
        ),
        'Assessment status updated.',
      );
    } catch (error) {
      next(error);
    }
  }

  async duplicateAssessment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.duplicateAssessment(
          actorId(req),
          req.params.assessmentId,
          requestAuditContext(req),
        ),
        'Assessment duplicated.',
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async listQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.listQuestions(
          req.params.assessmentId,
          req.query as Record<string, unknown>,
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  async createQuestion(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.createQuestion(
          actorId(req),
          req.params.assessmentId,
          req.body ?? {},
          requestAuditContext(req),
        ),
        'Question created.',
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async updateQuestion(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.updateQuestion(
          actorId(req),
          req.params.questionId,
          req.body ?? {},
          requestAuditContext(req),
        ),
        'Question updated.',
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteQuestion(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.deleteQuestion(
          actorId(req),
          req.params.questionId,
          requestAuditContext(req),
        ),
        'Question deleted.',
      );
    } catch (error) {
      next(error);
    }
  }

  async addOption(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.addOption(
          actorId(req),
          req.params.questionId,
          req.body ?? {},
          requestAuditContext(req),
        ),
        'Option created.',
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async updateOption(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.updateOption(
          actorId(req),
          req.params.optionId,
          req.body ?? {},
          requestAuditContext(req),
        ),
        'Option updated.',
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteOption(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.deleteOption(
          actorId(req),
          req.params.optionId,
          requestAuditContext(req),
        ),
        'Option deleted.',
      );
    } catch (error) {
      next(error);
    }
  }

  async listCategories(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(res, await adminAssessmentsService.listCategories());
    } catch (error) {
      next(error);
    }
  }

  async listSkills(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await adminAssessmentsService.listSkills());
    } catch (error) {
      next(error);
    }
  }

  async updateSkillWeight(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminAssessmentsService.updateSkillWeight(
          actorId(req),
          req.params.assessmentId,
          req.params.skillId,
          req.body?.weight,
          requestAuditContext(req),
        ),
        'Skill weight updated.',
      );
    } catch (error) {
      next(error);
    }
  }

  async overview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminOpsService.getOverview();
      trackEvent({ eventName: 'admin.dashboard_viewed', userId: actorId(req) });
      sendSuccess(res, data, 'Admin overview retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async listAnalyticsEvents(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminOpsService.listAnalyticsEvents(req.query as Record<string, unknown>),
      );
    } catch (error) {
      next(error);
    }
  }

  async ingestEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminOpsService.ingestAdminEvent(
          actorId(req),
          req.body?.eventName,
          req.body?.properties,
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  async listReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await adminOpsService.listReports(req.query as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  }

  async platformReport(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(res, await adminOpsService.getPlatformReport());
    } catch (error) {
      next(error);
    }
  }

  async listSettings(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await adminOpsService.listSettings());
    } catch (error) {
      next(error);
    }
  }

  async upsertSetting(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminOpsService.upsertSetting(
          actorId(req),
          req.params.key,
          req.body ?? {},
          requestAuditContext(req),
        ),
        'Setting saved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async listAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await adminOpsService.listAuditLogs(req.query as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  }

  async listEvaluations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(res, await adminOpsService.listEvaluations(req.query as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  }

  async retryEvaluation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminOpsService.retryEvaluation(
          actorId(req),
          req.params.attemptId,
          requestAuditContext(req),
        ),
        'Evaluation requeued.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getAttemptReview(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(res, await adminOpsService.getAttemptReview(req.params.attemptId));
    } catch (error) {
      next(error);
    }
  }

  async listHrReviews(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await adminOpsService.listHrReviews(req.query as Record<string, unknown>));
    } catch (error) {
      next(error);
    }
  }

  async getHrReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await adminOpsService.getHrReview(req.params.reviewId));
    } catch (error) {
      next(error);
    }
  }

  async createHrReview(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminOpsService.createHrReview(
          actorId(req),
          req.body ?? {},
          requestAuditContext(req),
        ),
        'HR review created.',
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async patchHrReview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await adminOpsService.patchHrReview(
          actorId(req),
          req.params.reviewId,
          req.body ?? {},
          requestAuditContext(req),
        ),
        'HR review updated.',
      );
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
