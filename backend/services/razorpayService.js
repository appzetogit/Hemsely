import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * Razorpay Service
 * Handles all Razorpay payment operations
 */
class RazorpayService {
  constructor() {
    // Initialize Razorpay with error handling
    try {
      // Trim and validate keys
      const keyId = process.env.RAZORPAY_KEY_ID?.trim();
      const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

      if (!keyId || !keySecret) {
        console.error('⚠️  RAZORPAY ENVIRONMENT VARIABLES NOT CONFIGURED!');
        console.error('Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file');
        this.razorpay = null;
        return;
      }

      // Validate key format (Razorpay keys usually start with rzp_)
      if (!keyId.startsWith('rzp_')) {
        console.warn('⚠️  RAZORPAY_KEY_ID format may be incorrect (should start with "rzp_")');
      }

      // Log masked credentials to verify correct env loading (safe for dev)
      const maskedKeyId = keyId.length > 9
        ? `${keyId.slice(0, 6)}***${keyId.slice(-3)}`
        : '***';
      const maskedSecret = keySecret.length > 7
        ? `${keySecret.slice(0, 4)}***${keySecret.slice(-3)}`
        : '***';
      console.log(`✅ Razorpay env loaded (id: ${maskedKeyId}, secret: ${maskedSecret})`);

      // Initialize Razorpay with trimmed keys
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      // Store keys for comparison later
      this._lastKeyId = keyId;
      this._lastKeySecret = keySecret;

      console.log('✅ Razorpay service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Razorpay service:', error.message);
      this.razorpay = null;
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId(prefix = 'TXN') {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Create Razorpay order
   * @param {Object} orderData - Order details
   * @param {number} orderData.amount - Amount in rupees
   * @param {string} orderData.receipt - Receipt ID
   * @param {Object} orderData.notes - Additional notes
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder(orderData) {
    try {
      // Re-validate and re-initialize if needed before creating order
      const keyId = process.env.RAZORPAY_KEY_ID?.trim();
      const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

      if (!keyId || !keySecret) {
        const error = new Error('Razorpay service not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
        error.code = 'RAZORPAY_NOT_CONFIGURED';
        throw error;
      }

      // Re-initialize Razorpay instance with fresh keys (in case keys were updated)
      if (!this.razorpay || keyId !== this._lastKeyId || keySecret !== this._lastKeySecret) {
        console.log('🔄 Re-initializing Razorpay with current keys...');
        try {
          this.razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
          });
          this._lastKeyId = keyId;
          this._lastKeySecret = keySecret;
          console.log('✅ Razorpay re-initialized successfully');
        } catch (initError) {
          console.error('❌ Failed to re-initialize Razorpay:', initError.message);
          throw new Error('Razorpay initialization failed. Please check your API keys.');
        }
      }

      const { amount, receipt, notes = {} } = orderData;

      if (!amount || amount <= 0) {
        throw new Error('Invalid amount');
      }

      // Convert rupees to paise (1 INR = 100 paise)
      const amountInPaise = Math.round(parseFloat(amount) * 100);

      if (amountInPaise < 100) {
        throw new Error('Minimum amount is ₹1 (100 paise)');
      }

      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || {},
        payment_capture: 1, // Auto capture payment
      };

      console.log('📤 Creating Razorpay order with options:', {
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
      });

      const order = await this.razorpay.orders.create(options);
      console.log('✅ Razorpay order created successfully:', order.id);

      return {
        id: order.id,
        amount: order.amount, // in paise
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        createdAt: order.created_at,
      };
    } catch (error) {
      console.error('❌ Error creating Razorpay order:', error);

      // Enhanced error logging for authentication issues
      if (error.statusCode === 401 || error.error?.code === 'BAD_REQUEST_ERROR') {
        const keyId = process.env.RAZORPAY_KEY_ID?.trim();
        const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

        console.error('🔐 Razorpay Authentication Error Details:');
        console.error('  - Status Code:', error.statusCode);
        console.error('  - Error Code:', error.error?.code);
        console.error('  - Description:', error.error?.description);

        const authError = new Error(error.error?.description || 'Razorpay authentication failed. Please verify your API keys.');
        authError.statusCode = 401;
        authError.code = 'RAZORPAY_AUTH_FAILED';
        authError.originalError = error;
        throw authError;
      }

      throw error;
    }
  }

  /**
   * Verify payment signature
   * @param {string} razorpay_order_id - Order ID
   * @param {string} razorpay_payment_id - Payment ID
   * @param {string} razorpay_signature - Payment signature
   * @returns {boolean} True if signature is valid
   */
  verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
      if (!keySecret) {
        throw new Error('RAZORPAY_KEY_SECRET not configured');
      }

      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      return expectedSignature === razorpay_signature;
    } catch (error) {
      console.error('❌ Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Fetch payment details from Razorpay
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment details
   */
  async fetchPayment(paymentId) {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay service not configured');
      }

      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('❌ Error fetching payment:', error);
      throw error;
    }
  }

  /**
   * Fetch order details from Razorpay
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order details
   */
  async fetchOrder(orderId) {
    try {
      if (!this.razorpay) {
        throw new Error('Razorpay service not configured');
      }

      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      throw error;
    }
  }
}

// Export singleton instance
const razorpayService = new RazorpayService();

// Add a method to check if Razorpay is configured
razorpayService.isConfigured = function () {
  return this.razorpay !== null;
};

// Method to re-initialize Razorpay
razorpayService.reinitialize = function () {
  console.log('🔄 Re-initializing Razorpay service...');
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    console.error('❌ Cannot re-initialize: Keys not found');
    this.razorpay = null;
    return false;
  }

  try {
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    console.log('✅ Razorpay re-initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to re-initialize Razorpay:', error.message);
    this.razorpay = null;
    return false;
  }
};

export default razorpayService;
