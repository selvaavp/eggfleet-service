export const APP = {
  TIMEZONE: 'Asia/Kolkata',
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DDTHH:mm:ssZ',
} as const;

export const OTP = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  RESEND_COOLDOWN_SECONDS: 60,
} as const;

export const UPLOAD = {
  PAYMENT_PROOF_DIR: 'payments',
  PROFILE_PICTURE_DIR: 'profiles',
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  MAX_PAYMENT_PROOF_MB: 5,
  MAX_PROFILE_PICTURE_MB: 2,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 500,
} as const;

export const JWT_TYPE = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  RESET: 'reset',
} as const;
