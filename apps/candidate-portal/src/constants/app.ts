export const APP_NAME = 'HireFast';
export const APP_DESCRIPTION =
  'AI-powered employability assessment platform — become interview ready.';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const GUEST_ASSESSMENT_SLUG = 'general-communication';
export const SESSION_ACCESS_TOKEN_KEY = 'hf_access_token';
export const SESSION_REFRESH_TOKEN_KEY = 'hf_refresh_token';
export const SESSION_ATTEMPT_ID_KEY = 'hf_guest_attempt_id';
