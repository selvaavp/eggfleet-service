import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = configService.get<boolean>('firebase.enabled') ?? false;
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Firebase is DISABLED (FIREBASE_ENABLED=false). Push notifications will be skipped.');
      return;
    }

    try {
      const serviceAccountPath = this.configService.get<string>('firebase.serviceAccountPath') ?? './firebase-service-account.json';
      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.join(process.cwd(), serviceAccountPath);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require(resolvedPath);
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.logger.log('Firebase initialized successfully');
    } catch (error) {
      this.logger.error('Firebase initialization failed', error);
    }
  }

  /**
   * Send a push notification to a single FCM device token.
   * No-ops when Firebase is disabled.
   *
   * Returns false if the token is invalid/unregistered so the caller can clear it.
   */
  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.enabled || !this.app) {
      this.logger.debug(`[Firebase SKIP] → ${title}: ${body}`);
      return true;
    }

    try {
      await admin.messaging(this.app).send({
        token: fcmToken,
        notification: { title, body },
        data,
        android: { priority: 'high' },
      });
      this.logger.log(`[Firebase] Push sent to ${fcmToken.slice(0, 10)}...`);
      return true;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        this.logger.warn(`Invalid FCM token ${fcmToken.slice(0, 10)}..., should be cleared`);
        return false;
      }
      this.logger.error(`Push notification failed for token ${fcmToken.slice(0, 10)}`, error);
      return true;
    }
  }

  /**
   * Send to multiple FCM tokens.
   */
  async sendToMultipleDevices(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await Promise.all(
      fcmTokens.map((token) => this.sendToDevice(token, title, body, data)),
    );
  }
}
