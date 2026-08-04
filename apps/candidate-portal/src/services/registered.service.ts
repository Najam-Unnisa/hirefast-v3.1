import { apiClient } from '@/services/api-client';

export interface DashboardData {
  profile: {
    isComplete: boolean;
    displayName: string | null;
    headline: string | null;
    hasResume: boolean;
  };
  jrs: {
    overallScore: number;
    band: string | null;
    version: string;
    calculatedAt: string;
    skillScores: Array<{
      skillId: string;
      skillCode: string;
      skillName: string;
      score: number;
      weight: number;
    }>;
  } | null;
  assessments: {
    completed: number;
    inProgress: number;
    available: number;
    availableFree?: number;
    availablePremium?: number;
  };
  latestAttempt: {
    id: string;
    assessmentId: string;
    status: string;
    assessmentTitle: string;
    assessmentSlug: string;
    aiSummary: string | null;
    resultsLocked: boolean;
  } | null;
  gamification: {
    totalXp: number;
    level: { levelNumber: number; name: string; minXp: number; maxXp: number | null };
    nextLevel: { levelNumber: number; name: string; minXp: number; xpRemaining: number } | null;
    currentStreak: number;
    longestStreak: number;
    badgesEarned: number;
  };
  badges: Array<{
    code: string;
    name: string;
    description: string | null;
    iconKey: string | null;
    earnedAt: string;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string | null;
    priority: number;
    skill: { code: string; name: string } | null;
  }>;
  recentActivity?: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    at: string;
  }>;
  progressTrend?: Array<{
    overallScore: number;
    band: string | null;
    calculatedAt: string;
    assessmentTitle: string;
  }>;
  subscription: {
    planCode: string;
    status: string;
    features: string[];
    canAccessPremium: boolean;
    isPremium?: boolean;
  };
  nextSteps: Array<{ key: string; title: string; href: string }>;
  premiumHighlights?: string[];
  upsell: { title: string; message: string; cta: string; href: string } | null;
}

export async function fetchDashboard(): Promise<DashboardData> {
  return apiClient.get<DashboardData>('/dashboard/me');
}

export async function fetchProgress() {
  return apiClient.get<{
    jrsHistory: Array<{
      overallScore: number;
      band: string | null;
      calculatedAt: string;
      assessmentTitle: string;
      accessTier: string;
    }>;
    assessmentComparisons: Array<{
      attemptId: string;
      title: string;
      accessTier: string;
      completedAt: string | null;
      score: number | null;
      passed: boolean | null;
    }>;
    improvement: { jrsDelta: number; direction: string; points: number };
    latestSkills: Array<{ skillCode: string; skillName: string; score: number }>;
  }>('/dashboard/me/progress');
}

export async function fetchSkillAnalytics() {
  return apiClient.get<{
    skills: Array<{
      skillId: string;
      skillCode: string;
      skillName: string;
      latestScore: number;
      firstScore: number;
      averageScore: number;
      delta: number;
      samples: number;
      trend: Array<{ score: number; calculatedAt: string; assessmentTitle: string }>;
    }>;
    weakest: Array<{ skillName: string; latestScore: number }>;
    strongest: Array<{ skillName: string; latestScore: number }>;
    distribution: { ready: number; developing: number; foundational: number };
    jrsHistory: Array<{
      overallScore: number;
      band: string | null;
      calculatedAt: string;
      assessmentTitle: string;
    }>;
  }>('/users/me/analytics/skills');
}

export async function fetchSubscription() {
  return apiClient.get<{
    planCode: string | null;
    status: string;
    features: string[];
    isPremium: boolean;
    isExpired?: boolean;
    message?: string;
    currentPeriodEnd?: string;
  }>('/subscriptions/me');
}

export async function activatePremium() {
  return apiClient.post('/subscriptions/me/activate-premium');
}

export async function downgradeSubscription() {
  return apiClient.post('/subscriptions/me/downgrade');
}

export async function expirePremiumForTesting() {
  return apiClient.post('/subscriptions/dev/expire-premium');
}

export async function fetchMyReports(page = 1, limit = 20) {
  return apiClient.get<{
    items: Array<{
      id: string;
      title: string;
      status: string;
      summary: string | null;
      generatedAt: string | null;
      attemptId: string | null;
      assessmentTitle: string | null;
    }>;
    meta: { page: number; limit: number; total: number; hasNextPage: boolean };
  }>(`/users/me/reports?page=${page}&limit=${limit}`);
}

export async function fetchReport(reportId: string) {
  return apiClient.get<{
    id: string;
    title: string;
    status: string;
    summary: string | null;
    generatedAt: string | null;
    sections: Array<{ sectionKey: string; title: string; content: string; sortOrder: number }>;
    attempt: { id: string; assessment: { title: string; slug: string } } | null;
  }>(`/reports/${reportId}`);
}

export async function fetchRecommendations() {
  return apiClient.get<
    Array<{
      id: string;
      title: string;
      description: string | null;
      priority: number;
      skill: { code: string; name: string } | null;
    }>
  >('/users/me/recommendations');
}

export async function fetchMyAttempts(page = 1, limit = 20, status?: string) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set('status', status);
  return apiClient.get<{
    items: Array<{
      id: string;
      assessmentId: string;
      status: string;
      startedAt: string;
      submittedAt: string | null;
      completedAt: string | null;
      assessmentTitle: string;
      assessmentSlug: string;
      score: number | null;
      jrs: { overallScore: number; band: string | null } | null;
      resultsLocked: boolean;
    }>;
    meta: { page: number; total: number; hasNextPage: boolean; hasPreviousPage: boolean };
  }>(`/attempts/me?${params.toString()}`);
}
