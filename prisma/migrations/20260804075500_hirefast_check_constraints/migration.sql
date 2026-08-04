-- HireFast CHECK constraints (score bounds, non-negative counters)
-- Applied as a follow-up to the core schema migration.

ALTER TABLE "job_readiness_scores"
  ADD CONSTRAINT "job_readiness_scores_overall_score_check"
  CHECK ("overall_score" >= 0 AND "overall_score" <= 100);

ALTER TABLE "jrs_skill_scores"
  ADD CONSTRAINT "jrs_skill_scores_score_check"
  CHECK ("score" >= 0 AND "score" <= 100);

ALTER TABLE "attempt_evaluations"
  ADD CONSTRAINT "attempt_evaluations_percentage_check"
  CHECK ("percentage" IS NULL OR ("percentage" >= 0 AND "percentage" <= 100));

ALTER TABLE "evaluation_skill_scores"
  ADD CONSTRAINT "evaluation_skill_scores_percentage_check"
  CHECK ("percentage" >= 0 AND "percentage" <= 100);

ALTER TABLE "user_gamification"
  ADD CONSTRAINT "user_gamification_nonneg_check"
  CHECK ("total_xp" >= 0 AND "current_streak" >= 0 AND "longest_streak" >= 0);

ALTER TABLE "levels"
  ADD CONSTRAINT "levels_xp_range_check"
  CHECK ("min_xp" >= 0 AND ("max_xp" IS NULL OR "max_xp" >= "min_xp"));

ALTER TABLE "xp_rules"
  ADD CONSTRAINT "xp_rules_amount_check"
  CHECK ("xp_amount" >= 0);

ALTER TABLE "badges"
  ADD CONSTRAINT "badges_xp_reward_check"
  CHECK ("xp_reward" >= 0);

ALTER TABLE "subscription_plans"
  ADD CONSTRAINT "subscription_plans_price_check"
  CHECK ("price_cents" >= 0);

ALTER TABLE "files"
  ADD CONSTRAINT "files_size_check"
  CHECK ("size_bytes" >= 0);

ALTER TABLE "assessment_attempts"
  ADD CONSTRAINT "assessment_attempts_number_check"
  CHECK ("attempt_number" >= 1);
