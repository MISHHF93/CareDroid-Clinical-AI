import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.firebaseApp = admin.app();
        this.logger.log('Using existing Firebase app');
        return;
      }

      // Get Firebase configuration
      const firebaseConfig = this.configService.get<any>('firebase');
      const serviceAccount = firebaseConfig?.serviceAccount;
      const credentialsPath = firebaseConfig?.credentialsPath;

      if (!serviceAccount && !credentialsPath) {
        this.logger.warn(
          'Firebase credentials not configured. Push notifications will fail. ' +
            'Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS environment variable.',
        );
        return;
      }

      const projectId = firebaseConfig?.projectId || serviceAccount?.project_id;
      const storageBucket = firebaseConfig?.storageBucket || serviceAccount?.storage_bucket;
      const messagingSenderId = firebaseConfig?.messagingSenderId;

      const config: admin.AppOptions = serviceAccount
        ? {
            credential: admin.credential.cert(serviceAccount),
            projectId,
            storageBucket,
          }
        : {
            credential: admin.credential.applicationDefault(),
            projectId,
            storageBucket,
          };

      if (messagingSenderId) {
        (config as admin.AppOptions & { messagingSenderId?: string }).messagingSenderId =
          messagingSenderId;
      }

      this.firebaseApp = admin.initializeApp(config);
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
      throw error;
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging (FCM)
   */
  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    options?: {
      priority?: 'normal' | 'high';
      ttl?: number;
      badge?: number;
      sound?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: options?.priority === 'high' ? 'high' : 'normal',
          ttl: options?.ttl || 86400000, // 24 hours default
          notification: {
            sound: options?.sound || 'default',
            channelId: 'caredroid_default',
            priority: options?.priority === 'high' ? 'max' : 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              badge: options?.badge || 0,
              sound: options?.sound || 'default',
            },
          },
          headers: {
            'apns-priority': options?.priority === 'high' ? '10' : '5',
            'apns-expiration': options?.ttl
              ? String(Math.floor(Date.now() / 1000) + options.ttl / 1000)
              : '0',
          },
        },
      };

      const response = await admin.messaging().send(message);

      this.logger.log(`Notification sent successfully: ${response}`);

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      this.logger.error(`Failed to send notification to ${token}:`, error);

      // Handle specific error codes
      const firebaseError = error as any;
      if (
        firebaseError.code === 'messaging/invalid-registration-token' ||
        firebaseError.code === 'messaging/registration-token-not-registered'
      ) {
        return {
          success: false,
          error: 'invalid_token',
        };
      }

      return {
        success: false,
        error: firebaseError.message || 'Unknown error',
      };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendMulticastNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    options?: {
      priority?: 'normal' | 'high';
      ttl?: number;
    },
  ): Promise<{
    successCount: number;
    failureCount: number;
    failedTokens: string[];
  }> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      if (tokens.length === 0) {
        return { successCount: 0, failureCount: 0, failedTokens: [] };
      }

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: options?.priority === 'high' ? 'high' : 'normal',
          ttl: options?.ttl || 86400000,
          notification: {
            sound: 'default',
            channelId: 'caredroid_default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      this.logger.log(
        `Multicast notification sent: ${response.successCount} successes, ${response.failureCount} failures`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens,
      };
    } catch (error) {
      this.logger.error('Failed to send multicast notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      await admin.messaging().subscribeToTopic(tokens, topic);
      this.logger.log(`Subscribed ${tokens.length} tokens to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.log(`Unsubscribed ${tokens.length} tokens from topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string> {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase not initialized');
      }

      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
        },
        data: data || {},
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notification sent to topic ${topic}: ${response}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to send to topic ${topic}:`, error);
      throw error;
    }
  }
}
