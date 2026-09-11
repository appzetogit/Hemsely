# 🚀 Complete Google Play Billing End-to-End Integration Guide (Hemsely)

This document provides complete instructions for configuring, developing, deploying, and testing **Google Play Billing** for subscriptions and in-app consumable products across the Hemsely platform.

---

## 1. Architecture Overview

```
                      ┌────────────────────────────────────────────────────────┐
                      │                 Google Play Console                    │
                      │   - Subscriptions: hemsely_premium_monthly             │
                      │   - In-App Products: hemsely_boost_1, hemsely_boost_5  │
                      └───────────────────────────┬────────────────────────────┘
                                                  │
                                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Android Native Layer (App / WebView)                     │
│  - Google Play Billing Library (BillingClient 7.1.1)                         │
│  - BillingManager.kt (Query products, launch billing flow, listen)           │
│  - WebAppInterface.kt (JavaScriptInterface bridge)                           │
└───────────────────────────┬──────────────────────────────────────────────────┘
                            │ purchaseToken, orderId, productId
                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Frontend (React / Vite Web App)                          │
│  - googlePlayBillingBridge.js (Safe interface to Android bridge)             │
│  - PremiumPage.jsx (Dynamic localized Play prices + Subscribe + Restore)     │
│  - ProfilePreviewPage.jsx (Consumable Boosts Purchase Dialog)                │
└───────────────────────────┬──────────────────────────────────────────────────┘
                            │ POST /api/google-play/verify-* (JWT Auth)
                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Backend (Node.js / Express)                              │
│  - googlePlayService.js (Google Play Developer API - androidpublisher v3)   │
│  - googlePlayController.js (verify-subscription, verify-purchase, etc.)      │
│  - googlePlayRoutes.js (/api/google-play/*)                                  │
│  - RTDN Webhook Handler (Google Cloud Pub/Sub push notifications)            │
└───────────────────────────┬──────────────────────────────────────────────────┘
                            │ Entitlement Update & Anti-Replay Guard
                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Database (MongoDB / Mongoose)                            │
│  - Entitlement collection (unique purchaseToken index)                       │
│  - Transaction collection (status: 'success', gateway: 'google_play')        │
│  - User collection (isPremium: true, premiumExpiry, boostCount)              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Google Play Console Configuration

### A. Create Products

1. Go to [Google Play Console](https://play.google.com/console/) -> Select your App (**Hemsely**).
2. Under **Monetize with Play** in the left menu:
   - **Subscriptions**:
     - Click **Create subscription**.
     - **Product ID**: `hemsely_premium_monthly`
     - **Name**: `Hemsely Premium`
     - **Base Plan**:
       - Base Plan ID: `monthly-auto`
       - Type: **Auto-renewing**
       - Billing period: **1 month**
       - Grace period: **16 days** (recommended)
       - Set localized prices (e.g. ₹499 in India, $5.99 in US, etc.).
       - Click **Activate base plan**.
   - **In-App Products (Consumables)**:
     - Click **Create product**.
     - **Product ID 1**: `hemsely_boost_1`
       - Name: `1 Profile Boost`
       - Price: ₹199 (or desired tier)
       - Status: **Active**
     - **Product ID 2**: `hemsely_boost_5`
       - Name: `5 Profile Boosts`
       - Price: ₹399 (or desired tier)
       - Status: **Active**

### B. Configure License Testers

1. In Play Console -> **Setup** -> **License testing**.
2. Add your tester Google email addresses (the accounts logged into test Android devices).
3. **License test response**: Choose `RESPONDS_NORMALLY`.

---

## 3. Google Cloud Service Account & API Configuration

Backend purchase verification and RTDN notifications require a Google Cloud Service Account with access to the **Google Play Android Developer API**.

### A. Link Google Cloud Project to Play Console
1. In Google Play Console -> **API access** -> Link or create a Google Cloud project.

### B. Create Service Account in Google Cloud
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Play Android Developer API** in **APIs & Services**.
3. Go to **IAM & Admin** -> **Service Accounts** -> **Create Service Account**:
   - Name: `google-play-billing-backend`
   - Role: `Google Play Android Developer` (or `Service Account User`)
4. Click on the created service account -> **Keys** -> **Add Key** -> **Create new key** -> **JSON**.
5. Download the JSON key file.

### C. Grant Permissions in Play Console
1. Return to **Google Play Console** -> **API access**.
2. Locate the service account and click **Grant Access** / **Invite User**.
3. Under **App Permissions**, select your app (**Hemsely**).
4. Under **Account Permissions**, check:
   - *View app information and download bulk reports (read-only)*
   - *View financial data, orders, and cancellation survey responses*
   - *Manage orders and subscriptions*
5. Click **Apply** -> **Save**.

---

## 4. Environment Variables (`backend/.env`)

Add the following environment variables to your backend `.env` file:

```env
# Google Play Billing & Developer API
GOOGLE_PLAY_PACKAGE_NAME=com.hemsely.app
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Optional: Alternatively point to the downloaded JSON key file directly
GOOGLE_PLAY_KEY_FILE=./config/google-play-service-account.json

# Product IDs
GOOGLE_PLAY_PREMIUM_SUB_ID=hemsely_premium_monthly
GOOGLE_PLAY_BOOST_1_ID=hemsely_boost_1
GOOGLE_PLAY_BOOST_5_ID=hemsely_boost_5
```

---

## 5. Backend API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/google-play/products` | Public / User | Returns configured Google Play product IDs and metadata |
| `POST` | `/api/google-play/verify-subscription` | Protected (JWT) | Verifies subscription purchase token, acknowledges with Google, and activates Premium |
| `POST` | `/api/google-play/verify-purchase` | Protected (JWT) | Verifies consumable in-app product (Boosts), consumes token on Google Play, and credits boosts |
| `GET` | `/api/google-play/entitlement` | Protected (JWT) | Queries current active subscriptions, expiry dates, and boost credits for the user |
| `POST` | `/api/google-play/webhook` | Public (Pub/Sub) | Google Cloud Pub/Sub Real-Time Developer Notification (RTDN) webhook |

### Sample Request: Verify Subscription
```http
POST /api/google-play/verify-subscription
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "purchaseToken": "inapp_or_sub_token_from_google_play",
  "productId": "hemsely_premium_monthly",
  "orderId": "GPA.3344-5566-7788-99000",
  "packageName": "com.hemsely.app"
}
```

### Sample Response:
```json
{
  "success": true,
  "message": "Google Play subscription verified and Premium activated successfully!",
  "user": {
    "_id": "60d0fe4f5311236168a109ca",
    "isPremium": true,
    "premiumExpiry": "2026-10-08T10:30:00.000Z"
  },
  "entitlement": {
    "productId": "hemsely_premium_monthly",
    "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
    "expiryTime": "2026-10-08T10:30:00.000Z"
  }
}
```

---

## 6. Real-Time Developer Notifications (RTDN) Setup

1. In **Google Cloud Console**:
   - Go to **Pub/Sub** -> **Topics** -> **Create Topic** (e.g. `google-play-rtdn-hemsely`).
   - Add Principal: `google-play-developer-notifications@system.gserviceaccount.com` with role `Pub/Sub Publisher`.
   - Go to **Subscriptions** -> **Create Subscription**:
     - Delivery type: **Push**
     - Endpoint URL: `https://api.hemsely.com/api/google-play/webhook`
2. In **Google Play Console**:
   - Go to **Monetization setup** -> **Real-time developer notifications**.
   - Topic name: `projects/YOUR_PROJECT_ID/topics/google-play-rtdn-hemsely`.
   - Click **Send test notification** -> Verify `200 OK` in your server logs.

---

## 7. Android Integration (Native Android / WebView)

Complete Android Studio source files are provided in `android-integration/`:

1. [`android-integration/BillingManager.kt`](file:///d:/CurrentlyRunningProject/Hemsely/android-integration/BillingManager.kt): Manages `BillingClient 7.1.1` lifecycle, product queries, launch purchase flow, and purchases update listener.
2. [`android-integration/WebAppInterface.kt`](file:///d:/CurrentlyRunningProject/Hemsely/android-integration/WebAppInterface.kt): Exposes `@JavascriptInterface` bridge methods to the WebView.
3. [`android-integration/MainActivity.kt`](file:///d:/CurrentlyRunningProject/Hemsely/android-integration/MainActivity.kt): Injects `AndroidBridge` into the WebView.
4. [`android-integration/AndroidManifest.xml`](file:///d:/CurrentlyRunningProject/Hemsely/android-integration/AndroidManifest.xml): Declares `com.android.vending.BILLING` and `INTERNET` permissions.
5. [`android-integration/build.gradle.kts`](file:///d:/CurrentlyRunningProject/Hemsely/android-integration/build.gradle.kts): Adds `com.android.billingclient:billing-ktx:7.1.1`.

---

## 8. Frontend Integration

Frontend interacts with the native bridge via [`frontend/src/shared/utils/googlePlayBillingBridge.js`](file:///d:/CurrentlyRunningProject/Hemsely/frontend/src/shared/utils/googlePlayBillingBridge.js).

- **Premium Screen**: [`frontend/src/modules/user/pages/PremiumPage.jsx`](file:///d:/CurrentlyRunningProject/Hemsely/frontend/src/modules/user/pages/PremiumPage.jsx)
  - Shows localized price dynamically queried from Google Play.
  - "Subscribe Now" opens native Google Play dialog.
  - Verifies token with backend and unlocks premium.
  - Supports "Restore Purchases".
- **Boosts Purchase Dialog**: [`frontend/src/modules/user/pages/ProfilePreviewPage.jsx`](file:///d:/CurrentlyRunningProject/Hemsely/frontend/src/modules/user/pages/ProfilePreviewPage.jsx)
  - Triggers in-app purchase for 1 Boost or 5 Boosts.
  - Consumes the consumable item on Google Play and credits boost count.

---

## 9. End-to-End Testing Guide

1. **Build and upload APK / App Bundle (AAB)** to **Internal Testing Track** in Google Play Console.
2. Add your test Google account to the **Internal Testing List** and **License Testers List**.
3. Accept the internal testing invite URL on your Android test device.
4. Open the Hemsely App:
   - Navigate to **Premium Access**:
     - Localized price from Google Play will appear.
     - Tap **Subscribe with Google Play** -> Google Play bottom sheet will show test card (e.g. *Test card, always approves*).
     - Tap **Buy** -> Backend verifies token, acknowledges purchase, activates Premium in DB.
   - Navigate to **Profile Boost**:
     - Tap **Buy Now** for 1 Boost or 5 Boosts.
     - Complete test purchase -> Backend consumes the product and credits boosts.
5. **Test Subscriptions Renewal & Expiry**:
   - In License Testing, 1-month subscriptions renew every 5 minutes and expire after ~6 renewals.
   - Watch RTDN webhook logs receive `SUBSCRIPTION_RENEWED` and `SUBSCRIPTION_EXPIRED` events.

---

## 10. Production Deployment Checklist

- [x] Complete removal of Razorpay package and services from frontend and backend.
- [x] Installed `googleapis` (Android Publisher v3).
- [x] Implemented `Entitlement` collection with unique `purchaseToken` index to prevent replay attacks.
- [x] Implemented secure server-side verification and acknowledgment.
- [x] Implemented consumable product consumption logic for Profile Boosts.
- [x] Implemented RTDN Pub/Sub webhook handler for automatic renewal and cancellation lifecycle tracking.
- [x] Built frontend bridge with graceful web browser fallback.
- [x] Validated production frontend build (`npm run build`).
- [ ] Configure live Google Service Account credentials in production `.env`.
- [ ] Upload signed Release AAB with `com.android.vending.BILLING` to Google Play Console.
- [ ] Activate Products & Base Plans in Google Play Console.
