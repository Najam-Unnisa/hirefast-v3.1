export const APP_NAME = 'HireFast';
export const APP_DESCRIPTION = 'HireFast Admin — platform management, assessments, and analytics.';

export const API_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? 'http://localhost:4000/api/v1';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const SESSION_ACCESS_TOKEN_KEY = 'hf_admin_access_token';
export const SESSION_REFRESH_TOKEN_KEY = 'hf_admin_refresh_token';
