import { getActiveSubscription } from '../../../services/subscription-access.service';
import { prisma } from '../../../config/database';

export class SubscriptionsService {
  async listPlans() {
    return prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      include: { features: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getMySubscription(userId: string) {
    const snapshot = await getActiveSubscription(userId);
    if (!snapshot) {
      return { planCode: null, status: 'NONE', features: [] as string[] };
    }
    return {
      subscriptionId: snapshot.subscriptionId,
      planCode: snapshot.planCode,
      status: snapshot.status,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      features: snapshot.featureKeys,
    };
  }

  async getMyFeatures(userId: string) {
    const snapshot = await getActiveSubscription(userId);
    return {
      planCode: snapshot?.planCode ?? null,
      features: snapshot?.featureKeys ?? [],
    };
  }
}

export const subscriptionsService = new SubscriptionsService();
