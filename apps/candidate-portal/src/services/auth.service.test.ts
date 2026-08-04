import { describe, expect, it } from 'vitest';
import { mapAuthUser, type AuthMeResponse } from '@/services/auth.service';

describe('mapAuthUser', () => {
  it('maps guest identity into AuthUser', () => {
    const me: AuthMeResponse = {
      id: 'user-1',
      email: 'guest@example.com',
      role: { name: 'GUEST' },
      profile: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        displayName: 'Ada Lovelace',
        isComplete: false,
      },
    };

    expect(mapAuthUser(me)).toEqual({
      id: 'user-1',
      email: 'guest@example.com',
      name: 'Ada Lovelace',
      role: 'GUEST',
    });
  });
});
