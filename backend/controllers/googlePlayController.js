import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Entitlement from '../models/Entitlement.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import googlePlayService from '../services/googlePlayService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { releaseFromQueue } from '../utils/queueService.js';
import { getOrCreateConfig } from './appConfigController.js';

// Default Product IDs configured in Google Play Console
export const GOOGLE_PLAY_CONFIG = {
  PREMIUM_SUBSCRIPTION_ID: process.env.GOOGLE_PLAY_PREMIUM_SUB_ID || 'hemsely_premium_monthly',
  BOOST_1_PRODUCT_ID: process.env.GOOGLE_PLAY_BOOST_1_ID || 'hemsely_boost_1',
  BOOST_5_PRODUCT_ID: process.env.GOOGLE_PLAY_BOOST_5_ID || 'hemsely_boost_5',
  PACKAGE_NAME: process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.hemsely.users',
};

const BOOST_PRODUCTS = {
  [GOOGLE_PLAY_CONFIG.BOOST_1_PRODUCT_ID]: 1,
  [GOOGLE_PLAY_CONFIG.BOOST_5_PRODUCT_ID]: 5,
};

// RTDN Subscription Notification Types Mapping
const RTDN_NOTIFICATION_TYPES = {
  1: 'SUBSCRIPTION_RECOVERED',
  2: 'SUBSCRIPTION_RENEWED',
  3: 'SUBSCRIPTION_CANCELED',
  4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD',
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
  7: 'SUBSCRIPTION_RESTARTED',
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
  9: 'SUBSCRIPTION_DEFERRED',
  10: 'SUBSCRIPTION_PAUSED',
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
  12: 'SUBSCRIPTION_REVOKED',
  13: 'SUBSCRIPTION_EXPIRED',
};

/**
 * @desc Get available Google Play products metadata and configuration
 * @route GET /api/google-play/products
 * @access Public / Authenticated
 */
export const getConfiguredProducts = asyncHandler(async (req, res) => {
  const activePlans = await Plan.find({ isActive: true }).sort({ durationDays: 1, price: 1 });
  
  // Default to monthly if found, or first plan
  const defaultSubPlan = activePlans.find((p) => p.durationDays === 30 || p.slug === 'monthly') || activePlans[0];

  const formattedSubscriptions = activePlans.map((p) => ({
    productId: p.productId || (p.durationDays === 7 ? 'hemsely_premium_weekly' : p.durationDays === 90 ? 'hemsely_premium_3months' : GOOGLE_PLAY_CONFIG.PREMIUM_SUBSCRIPTION_ID),
    slug: p.slug || (p.durationDays === 7 ? 'weekly' : p.durationDays === 90 ? '3months' : 'monthly'),
    type: 'subs',
    name: p.name,
    description: p.description || 'Full access to all premium dating features',
    price: p.price,
    defaultPrice: p.price,
    currency: p.currency || 'INR',
    durationDays: p.durationDays,
    badge: p.badge || (p.durationDays === 30 ? 'POPULAR' : p.durationDays === 90 ? 'BEST VALUE' : `${p.durationDays} DAYS`),
    features: p.features,
  }));

  res.status(200).json({
    success: true,
    packageName: googlePlayService.getPackageName(),
    products: {
      subscriptions: formattedSubscriptions,
      subscription: {
        productId: defaultSubPlan?.productId || GOOGLE_PLAY_CONFIG.PREMIUM_SUBSCRIPTION_ID,
        type: 'subs',
        name: defaultSubPlan?.name || 'Premium',
        description: defaultSubPlan?.description || 'Full access to all premium dating features',
        defaultPrice: defaultSubPlan?.price || 499,
        currency: defaultSubPlan?.currency || 'INR',
        durationDays: defaultSubPlan?.durationDays || 30,
        badge: defaultSubPlan?.badge || 'POPULAR',
      },
      consumables: [
        {
          productId: GOOGLE_PLAY_CONFIG.BOOST_1_PRODUCT_ID,
          type: 'inapp',
          boostCount: 1,
          name: '1 Profile Boost',
          defaultPrice: 199,
          currency: 'INR',
        },
        {
          productId: GOOGLE_PLAY_CONFIG.BOOST_5_PRODUCT_ID,
          type: 'inapp',
          boostCount: 5,
          name: '5 Profile Boosts',
          defaultPrice: 399,
          currency: 'INR',
        },
      ],
    },
  });
});

/**
 * @desc Verify Google Play Subscription and Grant Premium Access
 * @route POST /api/google-play/verify-subscription
 * @access Private/User
 */
export const verifySubscription = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const {
    purchaseToken,
    productId = GOOGLE_PLAY_CONFIG.PREMIUM_SUBSCRIPTION_ID,
    packageName = GOOGLE_PLAY_CONFIG.PACKAGE_NAME,
    orderId,
  } = req.body;

  if (!purchaseToken) {
    return res.status(400).json({
      success: false,
      message: 'purchaseToken is required for Google Play verification',
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Find matching plan in DB to accurately calculate duration and price
  const plan = await Plan.findOne({
    $or: [
      { productId },
      { slug: productId.replace('hemsely_premium_', '') },
      { name: new RegExp(productId.replace('hemsely_premium_', ''), 'i') }
    ]
  }) || await Plan.findOne({ isSystemPlan: true, durationDays: productId.includes('week') ? 7 : productId.includes('3month') ? 90 : 30 });

  const prodLower = (productId || '').toLowerCase();
  const planDurationDays = plan?.durationDays || (
    prodLower.includes('week') || prodLower.includes('7day') ? 7 :
    prodLower.includes('3month') || prodLower.includes('90day') ? 90 :
    prodLower.includes('6month') || prodLower.includes('180day') ? 180 :
    prodLower.includes('year') || prodLower.includes('365day') ? 365 : 30
  );
  const planAmount = plan?.price || (planDurationDays === 7 ? 199 : planDurationDays === 90 ? 1199 : 499);
  const planDisplayName = plan?.name ? `Premium (${plan.name})` : (
    planDurationDays === 7 ? 'Premium (1 Week)' :
    planDurationDays === 90 ? 'Premium (3 Months)' :
    planDurationDays === 180 ? 'Premium (6 Months)' :
    planDurationDays === 365 ? 'Premium (1 Year)' :
    'Premium (1 Month)'
  );

  // 1. Anti-replay check: verify if purchaseToken was already claimed by another user
  const existingEntitlement = await Entitlement.findOne({ purchaseToken });
  if (existingEntitlement && String(existingEntitlement.user) !== String(userId)) {
    return res.status(409).json({
      success: false,
      message: 'This Google Play purchase token has already been claimed by another account.',
    });
  }

  // 2. Call Google Play Developer API to verify purchase status
  let verification;
  try {
    verification = await googlePlayService.verifySubscription(packageName, productId, purchaseToken);
  } catch (apiErr) {
    console.error('❌ Google Play subscription verification error:', apiErr.message);
    return res.status(400).json({
      success: false,
      message: apiErr.message || 'Failed to verify subscription with Google Play',
    });
  }

  // Determine expiration date
  let expiryDate;
  if (verification.expiryTimeMillis && !verification.isTest) {
    expiryDate = new Date(parseInt(verification.expiryTimeMillis, 10));
  } else {
    // If existing active premium is in the future, extend it; otherwise start from now
    const baseTime = (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) > new Date())
      ? new Date(user.premiumExpiry).getTime()
      : Date.now();
    expiryDate = new Date(baseTime + planDurationDays * 24 * 60 * 60 * 1000);
  }

  // Check if subscription is active
  const isExpired = expiryDate.getTime() < Date.now();
  const subState = verification.subscriptionState || (isExpired ? 'SUBSCRIPTION_STATE_EXPIRED' : 'SUBSCRIPTION_STATE_ACTIVE');

  if (isExpired) {
    return res.status(400).json({
      success: false,
      message: 'The Google Play subscription has already expired.',
      expiryDate,
    });
  }

  // 3. Acknowledge the subscription with Google Play
  try {
    await googlePlayService.acknowledgeSubscription(
      packageName,
      productId,
      purchaseToken,
      String(userId)
    );
  } catch (ackErr) {
    console.warn('⚠️ Subscription acknowledgment notice:', ackErr.message);
  }

  // 4. Update / Save Entitlement Record
  const entitlement = await Entitlement.findOneAndUpdate(
    { purchaseToken },
    {
      user: userId,
      platform: 'google_play',
      packageName: googlePlayService.getPackageName(packageName),
      productId,
      purchaseToken,
      orderId: verification.orderId || orderId || `GPA.${Date.now()}`,
      productType: 'subscription',
      purchaseState: 'PURCHASED',
      acknowledgementState: 'ACKNOWLEDGED',
      subscriptionState: subState,
      purchaseTime: verification.purchaseTimeMillis ? new Date(parseInt(verification.purchaseTimeMillis, 10)) : new Date(),
      expiryTime: expiryDate,
      autoRenewing: verification.autoRenewing ?? true,
      environment: verification.isTest ? 'test' : 'production',
      rawVerificationData: verification.raw || verification,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 5. Update Transaction Audit Record
  const transactionId = `GP_SUB_${Date.now()}`;
  const subscriptionId = `SUB_${productId.toUpperCase()}_${String(userId).slice(-6)}`;
  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Hemsely User';

  const transaction = await Transaction.create({
    transactionId,
    subscriptionId,
    user: userId,
    userName,
    userEmail: user.email || `${user.phoneNumber || userId}@hemsely.com`,
    userPhone: user.phoneNumber || '',
    plan: plan?._id,
    planName: planDisplayName,
    durationDays: planDurationDays,
    amount: verification.priceAmountMicros ? verification.priceAmountMicros / 1000000 : planAmount,
    currency: verification.priceCurrencyCode || 'INR',
    status: 'success',
    gateway: 'google_play',
    gatewayOrderId: verification.orderId || orderId,
    gatewayPaymentId: purchaseToken.slice(0, 32),
    purchaseToken,
    packageName: googlePlayService.getPackageName(packageName),
    productId,
  });

  // 6. Activate Premium on User Profile & grant 1 free boost
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { isPremium: true, premiumExpiry: expiryDate, $inc: { boostCount: 1 } },
    { new: true, runValidators: true }
  );

  // Release user from Gender Queue if active
  await releaseFromQueue(userId);

  // 7. Send In-App Notification
  try {
    await Notification.create({
      user: userId,
      type: 'system',
      title: 'Premium Subscription Activated! 🎉',
      message: `Your Google Play Premium subscription is active until ${expiryDate.toLocaleDateString()}. Enjoy all VIP features!`,
    });
  } catch (_) {}

  res.status(200).json({
    success: true,
    message: 'Google Play subscription verified and Premium activated successfully!',
    user: updatedUser,
    entitlement,
    transaction,
  });
});

/**
 * @desc Verify a Google Play one-time purchase (Premium pass or Boost pack) and grant it.
 *       Premium passes are prepaid consumables: each purchase extends premiumExpiry.
 * @route POST /api/google-play/verify-purchase
 * @access Private/User
 */
export const verifyPurchase = asyncHandler(async (req, res) => {
  const userId = String(req.user?._id || req.user?.id);
  const { purchaseToken, productId } = req.body;
  const packageName = googlePlayService.getPackageName();

  if (!purchaseToken || !productId) {
    return res.status(400).json({ success: false, message: 'Both purchaseToken and productId are required' });
  }

  // 1. Resolve what this product grants
  const boostCount = BOOST_PRODUCTS[productId];
  const plan = boostCount ? null : await Plan.findOne({ productId });
  if (!boostCount && !plan) {
    return res.status(400).json({ success: false, message: `Unknown product: ${productId}` });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Already granted? Return idempotently so the app can finish the transaction.
  const existing = await Entitlement.findOne({ purchaseToken });
  if (existing) {
    if (String(existing.user) !== userId) {
      return res.status(409).json({ success: false, message: 'This purchase belongs to another account.' });
    }
    return res.status(200).json({ success: true, alreadyProcessed: true, message: 'Purchase already applied', user });
  }

  // 2. Verify with Google
  let verification;
  try {
    verification = await googlePlayService.verifyProduct(packageName, productId, purchaseToken);
  } catch (apiErr) {
    return res.status(400).json({ success: false, message: apiErr.message || 'Failed to verify purchase with Google Play' });
  }

  if (verification.purchaseState !== 0) {
    return res.status(400).json({
      success: false,
      pending: verification.purchaseState === 2,
      message: verification.purchaseState === 2 ? 'Payment is still pending.' : 'Purchase was canceled.',
    });
  }

  // Purchase must have been made from this account (app sets obfuscatedAccountIdAndroid = userId)
  if (!verification.isMock && verification.obfuscatedExternalAccountId !== userId) {
    return res.status(403).json({ success: false, message: 'Purchase does not belong to this account.' });
  }

  // 3. Consume on Google (makes it re-purchasable and stops the 3-day auto-refund). Don't grant if this fails.
  if (verification.consumptionState !== 1) {
    const consumed = await googlePlayService.consumeProduct(packageName, productId, purchaseToken);
    if (!consumed.success) {
      return res.status(502).json({ success: false, message: 'Could not finalize purchase with Google Play. Please retry.' });
    }
  }

  // 4. Atomic claim — unique purchaseToken index guarantees only one request grants.
  try {
    await Entitlement.create({
      user: userId,
      platform: 'google_play',
      packageName,
      productId,
      purchaseToken,
      orderId: verification.orderId,
      productType: 'inapp_consumable',
      purchaseState: 'PURCHASED',
      acknowledgementState: 'ACKNOWLEDGED',
      consumptionState: 'CONSUMED',
      purchaseTime: verification.purchaseTimeMillis ? new Date(Number(verification.purchaseTimeMillis)) : new Date(),
      environment: verification.isTest || verification.purchaseType === 0 ? 'test' : 'production',
      rawVerificationData: verification.raw || verification,
    });
  } catch (err) {
    if (err.code === 11000) {
      const fresh = await User.findById(userId);
      return res.status(200).json({ success: true, alreadyProcessed: true, message: 'Purchase already applied', user: fresh });
    }
    throw err;
  }

  // 5. Grant
  let update;
  let planName;
  let amount;
  if (plan) {
    const now = Date.now();
    const current = user.premiumExpiry ? new Date(user.premiumExpiry).getTime() : 0;
    const premiumExpiry = new Date(Math.max(now, current) + plan.durationDays * 86400000);
    update = { isPremium: true, premiumExpiry, $inc: { boostCount: 1 } };
    planName = `Premium (${plan.name})`;
    amount = plan.price;
  } else {
    const config = await getOrCreateConfig();
    update = { $inc: { boostCount } };
    planName = `${boostCount} Profile Boost${boostCount > 1 ? 's' : ''}`;
    amount = (boostCount === 5 ? config.boostPrice5 : config.boostPrice1) ?? 0;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
  if (plan) await releaseFromQueue(userId);

  await Transaction.create({
    transactionId: `GP_${plan ? 'SUB' : 'BST'}_${Date.now()}`,
    subscriptionId: `${productId.toUpperCase()}_${userId.slice(-6)}`,
    user: userId,
    userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Hemsely User',
    userEmail: user.email || `${user.phoneNumber || userId}@hemsely.com`,
    userPhone: user.phoneNumber || '',
    plan: plan?._id,
    planName,
    durationDays: plan?.durationDays,
    amount,
    currency: 'INR',
    status: 'success',
    gateway: 'google_play',
    gatewayOrderId: verification.orderId,
    gatewayPaymentId: purchaseToken.slice(0, 32),
    purchaseToken,
    packageName,
    productId,
  });

  try {
    await Notification.create({
      user: userId,
      type: 'system',
      title: plan ? 'Premium Activated! 🎉' : 'Boost Package Purchased! 🚀',
      message: plan
        ? `Your Premium is active until ${updatedUser.premiumExpiry.toLocaleDateString()}. Enjoy all VIP features!`
        : `${boostCount} Profile Boost(s) added to your account.`,
    });
  } catch (_) {}

  res.status(200).json({ success: true, message: `${planName} activated!`, user: updatedUser });
});

/**
 * @desc Get User Entitlements (Active Subscriptions and Boost balance)
 * @route GET /api/google-play/entitlement
 * @access Private/User
 */
export const getEntitlements = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;

  const user = await User.findById(userId).select('isPremium premiumExpiry boostCount');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const now = new Date();
  const isPremiumActive = Boolean(user.isPremium && user.premiumExpiry && user.premiumExpiry > now);

  const activeEntitlements = await Entitlement.find({
    user: userId,
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
    expiryTime: { $gt: now },
  }).sort({ expiryTime: -1 });

  res.status(200).json({
    success: true,
    isPremium: isPremiumActive,
    premiumExpiry: user.premiumExpiry,
    boostCount: user.boostCount || 0,
    activeEntitlements,
  });
});

/**
 * @desc Handle Google Cloud Pub/Sub Real-Time Developer Notifications (RTDN)
 * @route POST /api/google-play/webhook
 * @access Public (Protected by Pub/Sub Auth / Secret Token)
 */
export const handlePubSubWebhook = asyncHandler(async (req, res) => {
  const notification = googlePlayService.parsePubSubNotification(req.body);

  if (!notification) {
    return res.status(400).json({ success: false, message: 'Invalid Pub/Sub notification payload' });
  }

  console.log('📬 [Google Play RTDN] Received notification:', JSON.stringify(notification, null, 2));

  // Handle Subscription Notification
  if (notification.subscriptionNotification) {
    const subNotif = notification.subscriptionNotification;
    const { notificationType, purchaseToken, subscriptionId } = subNotif;
    const typeLabel = RTDN_NOTIFICATION_TYPES[notificationType] || `UNKNOWN_TYPE_${notificationType}`;

    console.log(`🔄 [Google Play RTDN] Processing Subscription event: ${typeLabel} for product: ${subscriptionId}`);

    const entitlement = await Entitlement.findOne({ purchaseToken });

    if (entitlement && entitlement.user) {
      const userId = entitlement.user;

      switch (notificationType) {
        // 1: SUBSCRIPTION_RECOVERED, 2: SUBSCRIPTION_RENEWED, 4: SUBSCRIPTION_PURCHASED, 7: SUBSCRIPTION_RESTARTED
        case 1:
        case 2:
        case 4:
        case 7: {
          try {
            const verification = await googlePlayService.verifySubscription(
              notification.packageName,
              subscriptionId,
              purchaseToken
            );

            const newExpiry = verification.expiryTimeMillis
              ? new Date(parseInt(verification.expiryTimeMillis, 10))
              : new Date(Date.now() + 30 * 86400000);

            entitlement.subscriptionState = 'SUBSCRIPTION_STATE_ACTIVE';
            entitlement.expiryTime = newExpiry;
            entitlement.autoRenewing = verification.autoRenewing ?? true;
            await entitlement.save();

            await User.findByIdAndUpdate(userId, {
              isPremium: true,
              premiumExpiry: newExpiry,
            });

            console.log(`✅ [Google Play RTDN] Subscription active/renewed for user ${userId} until ${newExpiry.toISOString()}`);
          } catch (renewErr) {
            console.error('❌ [Google Play RTDN] Failed to refresh renewed subscription:', renewErr.message);
          }
          break;
        }

        // 3: SUBSCRIPTION_CANCELED (User canceled auto-renew; remains active until current period end)
        case 3: {
          entitlement.autoRenewing = false;
          entitlement.subscriptionState = 'SUBSCRIPTION_STATE_CANCELED';
          await entitlement.save();
          console.log(`ℹ️ [Google Play RTDN] Auto-renewal canceled for user ${userId}`);
          break;
        }

        // 5: SUBSCRIPTION_ON_HOLD, 10: SUBSCRIPTION_PAUSED
        case 5:
        case 10: {
          entitlement.subscriptionState = notificationType === 5 ? 'SUBSCRIPTION_STATE_ON_HOLD' : 'SUBSCRIPTION_STATE_PAUSED';
          await entitlement.save();
          break;
        }

        // 12: SUBSCRIPTION_REVOKED (Refunded / Revoked)
        case 12: {
          entitlement.subscriptionState = 'SUBSCRIPTION_STATE_EXPIRED';
          entitlement.purchaseState = 'REFUNDED';
          await entitlement.save();

          await User.findByIdAndUpdate(userId, {
            isPremium: false,
          });
          console.log(`🛑 [Google Play RTDN] Subscription revoked/refunded for user ${userId}`);
          break;
        }

        // 13: SUBSCRIPTION_EXPIRED
        case 13: {
          entitlement.subscriptionState = 'SUBSCRIPTION_STATE_EXPIRED';
          await entitlement.save();

          // Check if user has other active subscriptions
          const otherActive = await Entitlement.findOne({
            user: userId,
            _id: { $ne: entitlement._id },
            subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
            expiryTime: { $gt: new Date() },
          });

          if (!otherActive) {
            await User.findByIdAndUpdate(userId, {
              isPremium: false,
            });
          }
          console.log(`⌛ [Google Play RTDN] Subscription expired for user ${userId}`);
          break;
        }

        default:
          console.log(`ℹ️ [Google Play RTDN] Unhandled notification type ${notificationType} (${typeLabel})`);
      }
    } else {
      console.warn(`⚠️ [Google Play RTDN] No local Entitlement record found for purchaseToken: ${purchaseToken}`);
    }
  }

  // Google Cloud Pub/Sub requires a 200 OK response to acknowledge receipt
  res.status(200).json({ success: true, message: 'Notification received and processed' });
});
