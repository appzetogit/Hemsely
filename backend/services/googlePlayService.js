import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

/**
 * Google Play Developer API Service
 * Handles server-side verification, acknowledgment, consumption,
 * and Real-Time Developer Notifications (RTDN) for Google Play Billing.
 */
class GooglePlayService {
  constructor() {
    this.authClient = null;
    this.publisher = null;
    this.defaultPackageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.hemsely.app';
    this.initialize();
  }

  /**
   * Initialize Google Auth client and Android Publisher v3 instance
   */
  initialize() {
    try {
      const email = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?.trim();
      let privateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY?.trim();
      const keyFile = process.env.GOOGLE_PLAY_KEY_FILE?.trim();
      const base64Key = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64?.trim();

      let credentials = null;

      if (base64Key) {
        try {
          const decoded = Buffer.from(base64Key, 'base64').toString('utf8');
          credentials = JSON.parse(decoded);
        } catch (e) {
          console.warn('⚠️ [GooglePlayService] Failed to parse GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64:', e.message);
        }
      } else if (keyFile && fs.existsSync(keyFile)) {
        try {
          const raw = fs.readFileSync(keyFile, 'utf8');
          credentials = JSON.parse(raw);
        } catch (e) {
          console.warn('⚠️ [GooglePlayService] Failed to read GOOGLE_PLAY_KEY_FILE:', e.message);
        }
      } else if (email && privateKey) {
        // Fix potential escaped newline strings from environment variables
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }
        credentials = {
          client_email: email,
          private_key: privateKey,
        };
      }

      if (credentials) {
        this.authClient = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });

        this.publisher = google.androidpublisher({
          version: 'v3',
          auth: this.authClient,
        });

        console.log('✅ Google Play Developer API service initialized successfully');
      } else {
        console.warn('⚠️ [GooglePlayService] Google Play credentials not configured in .env. API verification will run in development mode.');
        this.publisher = null;
      }
    } catch (err) {
      console.error('❌ [GooglePlayService] Initialization error:', err.message);
      this.publisher = null;
    }
  }

  /**
   * Check if Google Play service is configured with credentials
   */
  isConfigured() {
    return Boolean(this.publisher && this.authClient);
  }

  /**
   * Get target Android package name
   */
  getPackageName(overridePackageName) {
    return (overridePackageName || this.defaultPackageName || process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.hemsely.app').trim();
  }

  /**
   * Verify a Subscription Purchase using Google Play Developer API v3
   * @param {string} packageName - Application package name
   * @param {string} subscriptionId - Google Play Subscription product ID (e.g., 'hemsely_premium_monthly')
   * @param {string} token - Google Play purchase token
   * @returns {Promise<Object>} Subscription details
   */
  async verifySubscription(packageName, subscriptionId, token) {
    const pkg = this.getPackageName(packageName);

    if (!this.isConfigured()) {
      console.warn(`[GooglePlayService:DevFallback] Mocking successful subscription verification for: ${subscriptionId}`);
      const now = Date.now();
      const subLower = (subscriptionId || '').toLowerCase();
      let durationDays = 30;
      if (subLower.includes('week') || subLower.includes('7day') || subLower.includes('7_day')) {
        durationDays = 7;
      } else if (subLower.includes('3month') || subLower.includes('90day')) {
        durationDays = 90;
      } else if (subLower.includes('6month') || subLower.includes('180day')) {
        durationDays = 180;
      } else if (subLower.includes('year') || subLower.includes('365day') || subLower.includes('annual')) {
        durationDays = 365;
      } else if (subLower.includes('month') || subLower.includes('30day')) {
        durationDays = 30;
      }
      const expiryTime = new Date(now + durationDays * 24 * 60 * 60 * 1000);
      return {
        isTest: true,
        orderId: `GPA.DEV-MOCK-${now}`,
        packageName: pkg,
        productId: subscriptionId,
        purchaseTimeMillis: String(now),
        expiryTimeMillis: String(expiryTime.getTime()),
        durationDays,
        autoRenewing: true,
        acknowledgementState: 1, // ACKNOWLEDGED
        paymentState: 1, // Payment received
        subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
        lineItems: [
          {
            productId: subscriptionId,
            expiryTime: expiryTime.toISOString(),
            autoRenewingPlan: { autoRenewEnabled: true },
          },
        ],
      };
    }

    try {
      // First try Subscriptions V2 API for rich subscription state
      try {
        const resV2 = await this.publisher.purchases.subscriptionsv2.get({
          packageName: pkg,
          token,
        });

        if (resV2?.data) {
          const data = resV2.data;
          const lineItem = data.lineItems?.[0];
          const expiryDate = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : new Date(Date.now() + 30 * 86400000);

          return {
            isTest: data.testPurchase !== undefined,
            orderId: data.latestOrderId || `GPA.${Date.now()}`,
            packageName: pkg,
            productId: lineItem?.productId || subscriptionId,
            subscriptionState: data.subscriptionState || 'SUBSCRIPTION_STATE_ACTIVE',
            acknowledgementState: data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' ? 1 : 0,
            autoRenewing: lineItem?.autoRenewingPlan?.autoRenewEnabled ?? true,
            expiryTimeMillis: String(expiryDate.getTime()),
            purchaseTimeMillis: String(data.startTime ? new Date(data.startTime).getTime() : Date.now()),
            raw: data,
          };
        }
      } catch (v2Err) {
        console.warn('⚠️ [GooglePlayService] SubscriptionsV2 API fallback to legacy subscriptions.get:', v2Err.message);
      }

      // Legacy Subscriptions v1 fallback
      const response = await this.publisher.purchases.subscriptions.get({
        packageName: pkg,
        subscriptionId,
        token,
      });

      return {
        ...response.data,
        packageName: pkg,
        productId: subscriptionId,
        raw: response.data,
      };
    } catch (error) {
      console.error('❌ [GooglePlayService] verifySubscription failed:', error.message);
      throw new Error(`Google Play Subscription Verification Failed: ${error.message}`);
    }
  }

  /**
   * Acknowledge a Subscription Purchase
   */
  async acknowledgeSubscription(packageName, subscriptionId, token, developerPayload = '') {
    const pkg = this.getPackageName(packageName);

    if (!this.isConfigured()) {
      return { success: true, isTest: true };
    }

    try {
      await this.publisher.purchases.subscriptions.acknowledge({
        packageName: pkg,
        subscriptionId,
        token,
        requestBody: {
          developerPayload,
        },
      });
      return { success: true };
    } catch (error) {
      // Ignore already acknowledged error
      if (error.message && error.message.includes('already been acknowledged')) {
        return { success: true, alreadyAcknowledged: true };
      }
      console.error('❌ [GooglePlayService] acknowledgeSubscription error:', error.message);
      throw error;
    }
  }

  /**
   * Verify an In-App Product (Consumable Boosts, etc.)
   * @param {string} packageName - Application package name
   * @param {string} productId - Product SKU (e.g. 'hemsely_boost_1', 'hemsely_boost_5')
   * @param {string} token - Google Play purchase token
   * @returns {Promise<Object>} In-app product details
   */
  async verifyProduct(packageName, productId, token) {
    const pkg = this.getPackageName(packageName);

    if (!this.isConfigured()) {
      console.warn(`[GooglePlayService:DevFallback] Mocking product verification for: ${productId}`);
      const now = Date.now();
      return {
        isTest: true,
        orderId: `GPA.DEV-INAPP-${now}`,
        packageName: pkg,
        productId,
        purchaseTimeMillis: String(now),
        purchaseState: 0, // 0 = Purchased, 1 = Canceled, 2 = Pending
        consumptionState: 0, // 0 = Yet to be consumed, 1 = Consumed
        acknowledgementState: 1,
      };
    }

    try {
      const response = await this.publisher.purchases.products.get({
        packageName: pkg,
        productId,
        token,
      });

      return {
        ...response.data,
        packageName: pkg,
        productId,
        raw: response.data,
      };
    } catch (error) {
      console.error('❌ [GooglePlayService] verifyProduct failed:', error.message);
      throw new Error(`Google Play Product Verification Failed: ${error.message}`);
    }
  }

  /**
   * Acknowledge an In-App Product
   */
  async acknowledgeProduct(packageName, productId, token, developerPayload = '') {
    const pkg = this.getPackageName(packageName);

    if (!this.isConfigured()) {
      return { success: true, isTest: true };
    }

    try {
      await this.publisher.purchases.products.acknowledge({
        packageName: pkg,
        productId,
        token,
        requestBody: {
          developerPayload,
        },
      });
      return { success: true };
    } catch (error) {
      if (error.message && error.message.includes('already been acknowledged')) {
        return { success: true, alreadyAcknowledged: true };
      }
      console.error('❌ [GooglePlayService] acknowledgeProduct error:', error.message);
      throw error;
    }
  }

  /**
   * Consume an In-App Product (allows the user to buy the boost again)
   */
  async consumeProduct(packageName, productId, token) {
    const pkg = this.getPackageName(packageName);

    if (!this.isConfigured()) {
      return { success: true, isTest: true };
    }

    try {
      await this.publisher.purchases.products.consume({
        packageName: pkg,
        productId,
        token,
      });
      return { success: true };
    } catch (error) {
      console.warn('⚠️ [GooglePlayService] consumeProduct notice:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse Real-time Developer Notification (RTDN) from Google Cloud Pub/Sub
   * @param {string|Object} pubSubPayload - Raw Pub/Sub message
   * @returns {Object|null} Parsed notification payload
   */
  parsePubSubNotification(pubSubPayload) {
    try {
      let dataString = '';

      if (pubSubPayload?.message?.data) {
        dataString = Buffer.from(pubSubPayload.message.data, 'base64').toString('utf8');
      } else if (typeof pubSubPayload === 'string') {
        dataString = pubSubPayload;
      } else if (typeof pubSubPayload?.data === 'string') {
        dataString = Buffer.from(pubSubPayload.data, 'base64').toString('utf8');
      }

      if (!dataString) return null;

      const parsed = JSON.parse(dataString);
      return {
        version: parsed.version,
        packageName: parsed.packageName,
        eventTimeMillis: parsed.eventTimeMillis,
        subscriptionNotification: parsed.subscriptionNotification,
        oneTimeProductNotification: parsed.oneTimeProductNotification,
        testNotification: parsed.testNotification,
      };
    } catch (err) {
      console.error('❌ [GooglePlayService] parsePubSubNotification error:', err.message);
      return null;
    }
  }
}

export default new GooglePlayService();
