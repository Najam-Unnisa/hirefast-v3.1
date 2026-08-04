import type { JwtPayload } from '@hirefast/shared-types';
import type { ActiveSubscriptionSnapshot } from '../services/subscription-access.service';

declare global {
  namespace Express {
    interface Request {
      /** Identity from JWT — role is RBAC only, never a commercial tier */
      user?: JwtPayload;
      /** Commercial access from subscription service — independent of RBAC */
      subscription?: ActiveSubscriptionSnapshot | null;
      requestId?: string;
    }
  }
}

export {};
