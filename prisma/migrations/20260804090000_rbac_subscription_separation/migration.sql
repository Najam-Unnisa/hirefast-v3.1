-- RBAC vs Subscription separation (Blocker #2)
-- Identity roles: ADMIN | USER | GUEST
-- Commercial plans: FREE | PREMIUM (no commercial codes as roles)

-- 1) Ensure USER identity role exists
INSERT INTO "roles" ("id", "name", "display_name", "description", "is_system", "created_at", "updated_at")
SELECT gen_random_uuid(), 'USER', 'Registered User',
       'Registered candidate identity — commercial access via subscription only',
       true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'USER');

-- 2) Reassign users on legacy commercial roles → USER
UPDATE "users" u
SET "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'USER')
WHERE u."role_id" IN (
  SELECT "id" FROM "roles" WHERE "name" IN ('FREEMIUM', 'PREMIUM')
);

-- 3) Drop legacy role ↔ permission mappings
DELETE FROM "role_permissions"
WHERE "role_id" IN (
  SELECT "id" FROM "roles" WHERE "name" IN ('FREEMIUM', 'PREMIUM')
);

-- 4) Remove legacy commercial roles
DELETE FROM "roles" WHERE "name" IN ('FREEMIUM', 'PREMIUM');

-- 5) Rename subscription plan FREEMIUM → FREE (idempotent)
UPDATE "subscription_plans"
SET
  "code" = 'FREE',
  "name" = 'Free',
  "description" = 'Free registered candidate access',
  "updated_at" = NOW()
WHERE "code" = 'FREEMIUM';

-- 6) At most one ACTIVE/TRIALING subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS "user_subscriptions_one_active_per_user_idx"
ON "user_subscriptions" ("user_id")
WHERE "status" IN ('ACTIVE', 'TRIALING');
