/**
 * Google Play Billing Native Bridge Interface
 * Communicates with Android Native Layer (BillingClient / WebAppInterface)
 * seamlessly inside WebView wrappers or native container apps.
 */

// Pending Promise resolvers for asynchronous native bridge callbacks
const pendingPurchaseResolvers = new Map();
let pendingProductDetailsResolver = null;
let pendingRestoreResolver = null;

/**
 * Check if the Android Native Google Play Bridge is injected in the window
 */
export const isGooglePlayBridgeAvailable = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.AndroidBridge ||
    window.AndroidGooglePlayBridge ||
    window.AndroidBilling ||
    (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.AndroidBridge)
  );
};

/**
 * Get the active Android bridge object
 */
const getBridge = () => {
  if (typeof window === 'undefined') return null;
  return window.AndroidBridge || window.AndroidGooglePlayBridge || window.AndroidBilling || null;
};

/**
 * Initialize global JavaScript callback hooks called from Android Native Layer
 */
export const initGooglePlayBridgeCallbacks = () => {
  if (typeof window === 'undefined' || window.__googlePlayBridgeInitialized) return;
  window.__googlePlayBridgeInitialized = true;

  // Called by Android WebAppInterface when purchase is successful
  window.onGooglePlayPurchaseSuccess = (result) => {
    try {
      const data = typeof result === 'string' ? JSON.parse(result) : result;
      console.log('✅ [Google Play Bridge] Purchase successful from native:', data);

      const callback = pendingPurchaseResolvers.get(data.productId) || pendingPurchaseResolvers.get('DEFAULT');
      if (callback) {
        callback.resolve(data);
        pendingPurchaseResolvers.delete(data.productId);
        pendingPurchaseResolvers.delete('DEFAULT');
      }

      // Dispatch global window event for components
      window.dispatchEvent(new CustomEvent('googleplay:purchase_success', { detail: data }));
    } catch (err) {
      console.error('❌ [Google Play Bridge] onGooglePlayPurchaseSuccess error:', err);
    }
  };

  // Called by Android WebAppInterface when purchase encounters an error or cancellation
  window.onGooglePlayPurchaseError = (errorResult) => {
    try {
      const errorData = typeof errorResult === 'string' ? JSON.parse(errorResult) : errorResult;
      console.warn('⚠️ [Google Play Bridge] Purchase error from native:', errorData);

      pendingPurchaseResolvers.forEach((callback) => {
        callback.reject(new Error(errorData?.message || errorData?.error || 'Purchase was cancelled or failed'));
      });
      pendingPurchaseResolvers.clear();

      window.dispatchEvent(new CustomEvent('googleplay:purchase_error', { detail: errorData }));
    } catch (err) {
      console.error('❌ [Google Play Bridge] onGooglePlayPurchaseError error:', err);
    }
  };

  // Called by Android WebAppInterface with product pricing details
  window.onGooglePlayProductDetails = (detailsResult) => {
    try {
      const details = typeof detailsResult === 'string' ? JSON.parse(detailsResult) : detailsResult;
      console.log('📦 [Google Play Bridge] Product details loaded:', details);

      if (pendingProductDetailsResolver) {
        pendingProductDetailsResolver.resolve(details);
        pendingProductDetailsResolver = null;
      }

      window.dispatchEvent(new CustomEvent('googleplay:products_loaded', { detail: details }));
    } catch (err) {
      console.error('❌ [Google Play Bridge] onGooglePlayProductDetails error:', err);
    }
  };

  // Called by Android WebAppInterface when restore purchases completes
  window.onGooglePlayRestoreSuccess = (restoreResult) => {
    try {
      const restoreData = typeof restoreResult === 'string' ? JSON.parse(restoreResult) : restoreResult;
      console.log('🔄 [Google Play Bridge] Restored purchases:', restoreData);

      if (pendingRestoreResolver) {
        pendingRestoreResolver.resolve(restoreData);
        pendingRestoreResolver = null;
      }

      window.dispatchEvent(new CustomEvent('googleplay:restore_success', { detail: restoreData }));
    } catch (err) {
      console.error('❌ [Google Play Bridge] onGooglePlayRestoreSuccess error:', err);
    }
  };
};

/**
 * Fetch localized product details (Price, Title, Description) from Google Play Billing
 * @param {Array<string>} productIds - Array of product IDs e.g. ['hemsely_premium_monthly', 'hemsely_boost_1']
 * @returns {Promise<Array<Object>>} Product details list
 */
export const queryGooglePlayProductDetails = (productIds = []) => {
  initGooglePlayBridgeCallbacks();
  const bridge = getBridge();

  if (!bridge || typeof bridge.getProductDetails !== 'function') {
    // Return null so the frontend gracefully falls back to backend pricing
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    pendingProductDetailsResolver = { resolve };
    try {
      bridge.getProductDetails(JSON.stringify(productIds));
    } catch (e) {
      console.warn('⚠️ Bridge getProductDetails call failed:', e.message);
      resolve(null);
    }

    // Safety timeout fallback
    setTimeout(() => {
      if (pendingProductDetailsResolver) {
        pendingProductDetailsResolver.resolve(null);
        pendingProductDetailsResolver = null;
      }
    }, 4000);
  });
};

/**
 * Launch Google Play Billing Purchase Flow for Subscriptions or In-App Products
 * @param {Object} options
 * @param {string} options.productId - Google Play product SKU
 * @param {boolean} options.isSubscription - True for subscriptions, false for consumable in-app products
 * @param {string} [options.basePlanId] - Optional base plan ID for subscriptions
 * @returns {Promise<{ purchaseToken: string, orderId: string, productId: string }>}
 */
export const launchGooglePlayPurchase = ({ productId, isSubscription = false, basePlanId = '' }) => {
  initGooglePlayBridgeCallbacks();
  const bridge = getBridge();

  if (!bridge) {
    // If running outside native app (pure web browser), provide clear message or test purchase simulation in dev
    if (import.meta.env.DEV) {
      console.warn('🧪 [Google Play Bridge: DEV Fallback] Simulating native purchase in development browser');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            productId,
            purchaseToken: `mock_play_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            orderId: `GPA.DEV-${Date.now()}`,
            packageName: 'com.hemsely.app',
            isSubscription,
          });
        }, 1200);
      });
    }

    return Promise.reject(new Error('Google Play Billing is only available inside the Android App.'));
  }

  return new Promise((resolve, reject) => {
    pendingPurchaseResolvers.set(productId, { resolve, reject });
    pendingPurchaseResolvers.set('DEFAULT', { resolve, reject });

    try {
      if (typeof bridge.launchPurchase === 'function') {
        bridge.launchPurchase(productId, Boolean(isSubscription), basePlanId || '');
      } else if (typeof bridge.launchBilling === 'function') {
        bridge.launchBilling(productId, Boolean(isSubscription), basePlanId || '');
      } else {
        reject(new Error('Native Google Play launch method not found on bridge.'));
      }
    } catch (err) {
      pendingPurchaseResolvers.delete(productId);
      pendingPurchaseResolvers.delete('DEFAULT');
      reject(err);
    }
  });
};

/**
 * Request native Android app to query and restore existing purchases
 * @returns {Promise<Array<{ purchaseToken: string, productId: string }>>}
 */
export const restoreGooglePlayPurchases = () => {
  initGooglePlayBridgeCallbacks();
  const bridge = getBridge();

  if (!bridge || typeof bridge.restorePurchases !== 'function') {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    pendingRestoreResolver = { resolve };
    try {
      bridge.restorePurchases();
    } catch (e) {
      resolve([]);
    }

    setTimeout(() => {
      if (pendingRestoreResolver) {
        pendingRestoreResolver.resolve([]);
        pendingRestoreResolver = null;
      }
    }, 5000);
  });
};

// Auto-initialize callbacks on load
if (typeof window !== 'undefined') {
  initGooglePlayBridgeCallbacks();
}
