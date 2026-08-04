import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { sendSuccess } from '../../../utils/api-response';
import { assessmentsService, type SaveResponseInput } from '../service/assessments.service';

export class AssessmentsController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.listAssessments(req.user!.role),
        'Assessments retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.getAssessmentById(req.params.id, req.user!.role),
        'Assessment retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.getAssessmentBySlug(req.params.slug, req.user!.role),
        'Assessment retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async startAttempt(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.startAttempt(
          req.params.assessmentId,
          req.user!.sub,
          req.user!.role,
        ),
        'Assessment attempt ready.',
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  async getAttempt(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.getAttempt(req.params.attemptId, req.user!.sub),
        'Assessment attempt retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.getQuestions(req.params.attemptId, req.user!.sub),
        'Assessment questions retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async saveResponse(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = {
        ...req.body,
        questionId: req.params.questionId,
      } as SaveResponseInput;
      sendSuccess(
        res,
        await assessmentsService.saveResponse(req.params.attemptId, req.user!.sub, input),
        'Response saved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async saveResponses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const responses = (Array.isArray(req.body) ? req.body : req.body?.responses) as
        SaveResponseInput[] | undefined;
      sendSuccess(
        res,
        await assessmentsService.saveResponses(
          req.params.attemptId,
          req.user!.sub,
          responses ?? [],
        ),
        'Responses saved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async submit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.submitAttempt(req.params.attemptId, req.user!.sub, req.user!.role),
        'Assessment submitted.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.getAttemptStatus(req.params.attemptId, req.user!.sub),
        'Attempt status retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.getEvaluation(req.params.attemptId, req.user!.sub, req.user!.role),
        'Evaluation retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async triggerEvaluation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.triggerEvaluation(req.params.attemptId, req.user!.sub),
        'Evaluation queued.',
        202,
      );
    } catch (error) {
      next(error);
    }
  }

  async getJrs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.getJobReadinessScore(
          req.params.attemptId,
          req.user!.sub,
          req.user!.role,
        ),
        'Job readiness score retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getAiEvaluation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.getAiEvaluation(
          req.params.attemptId,
          req.user!.sub,
          req.user!.role,
        ),
        'AI evaluation retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }

  async getReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(
        res,
        await assessmentsService.getReports(req.params.attemptId, req.user!.sub, req.user!.role),
        'Assessment reports retrieved.',
      );
    } catch (error) {
      next(error);
    }
  }
}

export const assessmentsController = new AssessmentsController();
