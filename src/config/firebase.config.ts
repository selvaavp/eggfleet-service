import { registerAs } from '@nestjs/config';

export const firebaseConfig = registerAs('firebase', () => ({
  enabled: process.env.FIREBASE_ENABLED === 'true',
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? './firebase-service-account.json',
}));
