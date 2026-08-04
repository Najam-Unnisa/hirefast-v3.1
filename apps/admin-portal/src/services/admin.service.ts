import { apiClient } from '@/services/api-client';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

function toQuery(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* ── Overview ─────────────────────────────────────────────── */

export interface AdminOverview {
  totalCandidates: number;
  guestUsers: number;
  registeredUsers: number;
  premiumUsers: number;
  activeAssessments: number;
  pendingEvaluations: number;
  completedEvaluations: number;
  failedEvaluations: number;
  platformHealth: {
    status: string;
    pendingEvaluations: number;
    failedEvaluations: number;
  };
  recentAdministrativeActions: Array<{
    id: string;
    action: string;
    resourceType: string;
    message: string | null;
    actorEmail: string | null;
    createdAt: string;
  }>;
  quickActions: Array<{ key: string; title: string; href: string }>;
}

export async function fetchOverview(): Promise<AdminOverview> {
  return apiClient.get<AdminOverview>('/admin/analytics/overview');
}

/* ── Users / Candidates ───────────────────────────────────── */

export interface AdminUserListItem {
  id: string;
  email: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { name: string };
  profile: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    headline: string | null;
    isComplete: boolean;
  } | null;
  planCode: string | null;
  attemptCount: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: { id: string; name: string };
  profile: Record<string, unknown> | null;
  subscriptions: Array<{
    id: string;
    status: string;
    plan: { code: string; name: string };
  }>;
  latestJrs: {
    overallScore: number;
    band: string | null;
    calculatedAt: string;
    version: number;
  } | null;
  _count: { attempts: number; aiReports: number };
}

export async function listUsers(
  params?: Record<string, string | number | undefined | null>,
): Promise<Paginated<AdminUserListItem>> {
  return apiClient.get<Paginated<AdminUserListItem>>(`/admin/users${toQuery(params)}`);
}

export async function getUser(userId: string): Promise<AdminUserDetail> {
  return apiClient.get<AdminUserDetail>(`/admin/users/${userId}`);
}

export async function patchUser(
  userId: string,
  body: { status?: string; role?: string },
): Promise<{ id: string; email: string; status: string; role: { name: string } }> {
  return apiClient.patch(`/admin/users/${userId}`, body);
}

export interface UserAttemptItem {
  id: string;
  assessmentId: string;
  attemptNumber: number;
  status: string;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  resultsLocked: boolean;
  assessmentTitle: string;
  assessmentSlug: string;
  accessTier: string;
  evaluationStatus: string | null;
  score: number | null;
  jrs: { overallScore: number; band: string | null } | null;
}

export async function listUserAttempts(
  userId: string,
  params?: Record<string, string | number | undefined | null>,
): Promise<Paginated<UserAttemptItem>> {
  return apiClient.get<Paginated<UserAttemptItem>>(
    `/admin/users/${userId}/attempts${toQuery(params)}`,
  );
}

export interface UserReportItem {
  id: string;
  title: string;
  status: string;
  summary: string | null;
  generatedAt: string | null;
  attemptId: string | null;
  assessmentTitle: string | null;
}

export async function listUserReports(
  userId: string,
  params?: Record<string, string | number | undefined | null>,
): Promise<Paginated<UserReportItem>> {
  return apiClient.get<Paginated<UserReportItem>>(
    `/admin/users/${userId}/reports${toQuery(params)}`,
  );
}

/* ── Assessments ──────────────────────────────────────────── */

export interface AssessmentSkillLink {
  skillId: string;
  skillCode: string;
  skillName: string;
  weight: number;
}

export interface AdminAssessment {
  id: string;
  categoryId: string;
  categoryName: string | null;
  category: { id: string; code: string; name: string } | null;
  code: string;
  slug: string;
  title: string;
  description: string | null;
  instructions: string | null;
  status: string;
  accessTier: string;
  durationMinutes: number | null;
  passingScore: number | null;
  maxAttempts: number | null;
  version: number;
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  attemptCount: number;
  skills: AssessmentSkillLink[];
}

export interface CreateAssessmentInput {
  categoryId: string;
  code: string;
  slug: string;
  title: string;
  accessTier: string;
  description?: string;
  instructions?: string;
  durationMinutes?: number;
  passingScore?: number;
  maxAttempts?: number;
  skillIds?: string[];
}

export async function listAssessments(
  params?: Record<string, string | number | undefined | null>,
): Promise<Paginated<AdminAssessment>> {
  return apiClient.get<Paginated<AdminAssessment>>(`/admin/assessments${toQuery(params)}`);
}

export async function createAssessment(body: CreateAssessmentInput): Promise<AdminAssessment> {
  return apiClient.post<AdminAssessment>('/admin/assessments', body);
}

export async function getAssessment(assessmentId: string): Promise<AdminAssessment> {
  return apiClient.get<AdminAssessment>(`/admin/assessments/${assessmentId}`);
}

export async function updateAssessment(
  assessmentId: string,
  body: Partial<CreateAssessmentInput>,
): Promise<AdminAssessment> {
  return apiClient.put<AdminAssessment>(`/admin/assessments/${assessmentId}`, body);
}

export async function patchAssessmentStatus(
  assessmentId: string,
  status: string,
): Promise<AdminAssessment> {
  return apiClient.patch<AdminAssessment>(`/admin/assessments/${assessmentId}/status`, {
    status,
  });
}

export async function duplicateAssessment(assessmentId: string): Promise<AdminAssessment> {
  return apiClient.post<AdminAssessment>(`/admin/assessments/${assessmentId}/duplicate`);
}

/* ── Questions ────────────────────────────────────────────── */

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  isCorrect: boolean;
  points: number | null;
}

export interface AdminQuestion {
  id: string;
  assessmentId: string;
  code: string;
  prompt: string;
  questionType: string;
  sortOrder: number;
  points: number;
  isRequired: boolean;
  timeLimitSec: number | null;
  metadata: unknown;
  options: QuestionOption[];
}

export interface CreateQuestionInput {
  code?: string;
  prompt: string;
  questionType: string;
  sortOrder?: number;
  points?: number;
  isRequired?: boolean;
  timeLimitSec?: number;
  metadata?: Record<string, unknown>;
}

export async function listQuestions(
  assessmentId: string,
  params?: Record<string, string | number | undefined | null>,
): Promise<Paginated<AdminQuestion>> {
  return apiClient.get<Paginated<AdminQuestion>>(
    `/admin/assessments/${assessmentId}/questions${toQuery(params)}`,
  );
}

export async function createQuestion(
  assessmentId: string,
  body: CreateQuestionInput,
): Promise<AdminQuestion> {
  return apiClient.post<AdminQuestion>(`/admin/assessments/${assessmentId}/questions`, body);
}

export async function updateQuestion(
  questionId: string,
  body: Partial<CreateQuestionInput>,
): Promise<AdminQuestion> {
  return apiClient.put<AdminQuestion>(`/admin/questions/${questionId}`, body);
}

export async function deleteQuestion(questionId: string): Promise<{ id: string; deleted: true }> {
  return apiClient.delete<{ id: string; deleted: true }>(`/admin/questions/${questionId}`);
}

export async function addQuestionOption(
  questionId: string,
  body: {
    label: string;
    value: string;
    sortOrder?: number;
    isCorrect?: boolean;
    points?: number;
  },
): Promise<QuestionOption> {
  return apiClient.post<QuestionOption>(`/admin/questions/${questionId}/options`, body);
}

export async function updateQuestionOption(
  optionId: string,
  body: Partial<{
    label: string;
    value: string;
    sortOrder: number;
    isCorrect: boolean;
    points: number;
  }>,
): Promise<QuestionOption> {
  return apiClient.put<QuestionOption>(`/admin/question-options/${optionId}`, body);
}

export async function deleteQuestionOption(
  optionId: string,
): Promise<{ id: string; deleted: true }> {
  return apiClient.delete<{ id: string; deleted: true }>(`/admin/question-options/${optionId}`);
}

/* ── Categories & Skills ──────────────────────────────────── */

export interface AdminCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface AdminSkill {
  id: string;
  code: string;
  name: string;
  description: string | null;
  domain: string | null;
  assessmentSkills: Array<{
    assessmentId: string;
    weight: number | string;
    assessment: { code: string; title: string; status: string };
  }>;
}

export async function listCategories(): Promise<AdminCategory[]> {
  return apiClient.get<AdminCategory[]>('/admin/categories');
}

export async function listSkills(): Promise<AdminSkill[]> {
  return apiClient.get<AdminSkill[]>('/admin/skills');
}

export async function updateSkillWeight(
  assessmentId: string,
  skillId: string,
  weight: number,
): Promise<{
  id: string;
  assessmentId: string;
  skillId: string;
  skillCode: string;
  skillName: string;
  weight: number;
}> {
  return apiClient.put(`/admin/assessments/${assessmentId}/skills/${skillId}`, { weight });
}

/* ── Evaluations ──────────────────────────────────────────── */

export interface EvaluationListItem {
  id: string;
  attemptId: string;
  status: string;
  percentage: number | null;
  passed: boolean | null;
  errorMessage: string | null;
  updatedAt: string;
  candidateEmail: string;
  assessmentTitle: string;
  attemptStatus: string;
  aiStatus: string | null;
}

export async function listEvaluations(
  params?: Record<string, string | number | undefined | null>,
): Promise<Paginated<EvaluationListItem>> {
  return apiClient.get<Paginated<EvaluationListItem>>(`/admin/evaluations${toQuery(params)}`);
}

export async function retryEvaluation(
  attemptId: string,
): Promise<{ attemptId: string; queued: true }> {
  return apiClient.post<{ attemptId: string; queued: true }>(
    `/admin/evaluations/${attemptId}/retry`,
  );
}

export interface AttemptReview {
  id: string;
  status: string;
  resultsLocked: boolean;
  candidate: { id: string; email: string; role: { name: string } };
  assessment: {
    id: string;
    title: string;
    code: string;
    accessTier: string;
  };
  responses: Array<{
    id: string;
    question: {
      id: string;
      code: string;
      prompt: string;
      questionType: string;
    };
    selectedOption: { id: string; label: string; value: string } | null;
    textAnswer: string | null;
    numericAnswer: number | null;
    answeredAt: string | null;
  }>;
  evaluation: {
    status: string;
    percentage: number | null;
    passed: boolean | null;
    errorMessage: string | null;
  } | null;
  aiEvaluation: Record<string, unknown> | null;
  jrs: {
    overallScore: number;
    band: string | null;
    skills: Array<{
      skillCode: string;
      skillName: string;
      score: number;
      weight: number;
    }>;
  } | null;
  reports: Array<Record<string, unknown>>;
  hrReviews: Array<Record<string, unknown>>;
}

export async function getAttemptReview(attemptId: string): Promise<AttemptReview> {
  return apiClient.get<AttemptReview>(`/admin/attempts/${attemptId}`);
}

/* ── Reports ──────────────────────────────────────────────── */

export interface ReportListItem {
  id: string;
  title: string;
  status: string;
  summary: string | null;
  generatedAt: string | null;
  userId: string;
  userEmail: string;
  attemptId: string | null;
  assessmentTitle: string | null;
}

export interface PlatformReport {
  jrsDistribution: Array<{ band: string; count: number }>;
  assessmentCompletion: Array<{ status: string; count: number }>;
  userGrowthLast30Days: number;
  guestGrowthLast30Days: number;
  registeredGrowthLast30Days: number;
}

export async function listReports(
  params?: Record<string, string | number | undefined | null>,
): Promise<Paginated<ReportListItem>> {
  return apiClient.get<Paginated<ReportListItem>>(`/admin/reports${toQuery(params)}`);
}

export async function fetchPlatformReport(): Promise<PlatformReport> {
  return apiClient.get<PlatformReport>('/admin/analytics/platform-report');
}

/* ── Settings ─────────────────────────────────────────────── */

export interface PlatformSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}

export async function listSettings(): Promise<PlatformSetting[]> {
  return apiClient.get<PlatformSetting[]>('/admin/settings');
}

export async function upsertSetting(
  key: string,
  body: { value: unknown; description?: string; isPublic?: boolean },
): Promise<PlatformSetting> {
  return apiClient.put<PlatformSetting>(`/admin/settings/${encodeURIComponent(key)}`, body);
}

/* ── Audit Logs ───────────────────────────────────────────── */

export interface AuditLogItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  message: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; email: string } | null;
}

export async function listAuditLogs(
  params?: Record<string, string | number | undefined | null>,
): Promise<Paginated<AuditLogItem>> {
  return apiClient.get<Paginated<AuditLogItem>>(`/admin/audit-logs${toQuery(params)}`);
}

/* ── HR Reviews ───────────────────────────────────────────── */

export interface HrReviewListItem {
  id: string;
  status: string;
  notes: string | null;
  decisionAt: string | null;
  createdAt: string;
  reviewer: { id: string; email: string } | null;
  attemptId: string;
  candidateEmail: string;
  assessmentTitle: string;
}

export async function listHrReviews(
  params?: Record<string, string | number | undefined | null>,
): Promise<Paginated<HrReviewListItem>> {
  return apiClient.get<Paginated<HrReviewListItem>>(`/admin/hr-reviews${toQuery(params)}`);
}

export async function getHrReview(reviewId: string): Promise<Record<string, unknown>> {
  return apiClient.get<Record<string, unknown>>(`/admin/hr-reviews/${reviewId}`);
}

export async function createHrReview(body: {
  attemptId: string;
  notes?: string;
}): Promise<Record<string, unknown>> {
  return apiClient.post<Record<string, unknown>>('/admin/hr-reviews', body);
}

export async function patchHrReview(
  reviewId: string,
  body: { status?: string; notes?: string },
): Promise<Record<string, unknown>> {
  return apiClient.patch<Record<string, unknown>>(`/admin/hr-reviews/${reviewId}`, body);
}
