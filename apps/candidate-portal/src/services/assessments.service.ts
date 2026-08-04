import { apiClient } from '@/services/api-client';

export interface GuestAssessmentSummary {
  id: string;
  code: string;
  slug: string;
  title: string;
  description: string | null;
  instructions: string | null;
  durationMinutes: number | null;
  accessTier?: 'FREE' | 'PREMIUM' | string;
  locked?: boolean;
  upgradeRequired?: boolean;
  _count: { questions: number };
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  status: string;
  resultsLocked: boolean;
  submittedAt: string | null;
  completedAt: string | null;
  assessment?: {
    id: string;
    code: string;
    slug: string;
    title: string;
  };
  responses?: AttemptResponse[];
}

export interface AttemptResponse {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  numericAnswer: string | number | null;
  answeredAt: string | null;
}

export interface AssessmentQuestion {
  id: string;
  code: string;
  prompt: string;
  questionType: string;
  sortOrder: number;
  points: string | number;
  isRequired: boolean;
  timeLimitSec: number | null;
  options: Array<{
    id: string;
    label: string;
    value: string;
    sortOrder: number;
  }>;
}

export interface AttemptStatus {
  attemptId: string;
  status: string;
  evaluationStatus: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  resultsLocked: boolean;
}

export async function listAssessments(): Promise<GuestAssessmentSummary[]> {
  return apiClient.get<GuestAssessmentSummary[]>('/assessments');
}

export async function getAssessmentBySlug(slug: string): Promise<GuestAssessmentSummary> {
  return apiClient.get<GuestAssessmentSummary>(`/assessments/slug/${slug}`);
}

export async function startAttempt(assessmentId: string): Promise<AssessmentAttempt> {
  return apiClient.post<AssessmentAttempt>(`/assessments/${assessmentId}/attempts`);
}

export async function getAttempt(attemptId: string): Promise<AssessmentAttempt> {
  return apiClient.get<AssessmentAttempt>(`/attempts/${attemptId}`);
}

export async function getQuestions(attemptId: string): Promise<AssessmentQuestion[]> {
  return apiClient.get<AssessmentQuestion[]>(`/attempts/${attemptId}/questions`);
}

export async function saveResponse(
  attemptId: string,
  questionId: string,
  body: {
    selectedOptionId?: string | null;
    textAnswer?: string | null;
    numericAnswer?: number | string | null;
  },
): Promise<AttemptResponse> {
  return apiClient.put<AttemptResponse>(`/attempts/${attemptId}/responses/${questionId}`, body);
}

export async function submitAttempt(attemptId: string): Promise<AssessmentAttempt> {
  return apiClient.post<AssessmentAttempt>(`/attempts/${attemptId}/submit`);
}

export async function getAttemptStatus(attemptId: string): Promise<AttemptStatus> {
  return apiClient.get<AttemptStatus>(`/attempts/${attemptId}/status`);
}
