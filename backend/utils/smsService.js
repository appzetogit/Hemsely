import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * SMSIndia Hub SMS Service for DatingApp / Hemsely
 * Handles OTP sending via SMSIndia Hub API
 */
class SMSIndiaHubService {
  constructor() {
    this.apiKey = process.env.SMSINDIAHUB_API_KEY?.trim();
    this.senderId = process.env.SMSINDIAHUB_SENDER_ID?.trim() || "SMSHUB";
    this.baseUrl = "http://cloud.smsindiahub.in/vendorsms/pushsms.aspx";

    if (process.env.NODE_ENV === "development") {
      if (!this.apiKey || !this.senderId) {
        console.warn(
          "⚠️ SMSIndia Hub credentials not fully configured. SMS functionality will use fallback/development mode."
        );
        console.warn(
          "   Please check SMSINDIAHUB_API_KEY and SMSINDIAHUB_SENDER_ID in .env file"
        );
      } else {
        console.log("✅ SMSIndia Hub credentials loaded successfully");
      }
    }
  }

  isConfigured() {
    const apiKey = (this.apiKey || process.env.SMSINDIAHUB_API_KEY)?.trim();
    const senderId = (this.senderId || process.env.SMSINDIAHUB_SENDER_ID)?.trim();
    return !!(apiKey && senderId);
  }

  normalizePhoneNumber(phone) {
    const digits = phone.replace(/[^0-9]/g, "");

    if (digits.startsWith("91") && digits.length === 12) {
      return digits;
    }

    if (digits.length === 10) {
      return "91" + digits;
    }

    if (digits.length === 11 && digits.startsWith("0")) {
      return "91" + digits.substring(1);
    }

    return "91" + digits.slice(-10);
  }

  async sendOTP(phone, otp, purpose = 'register') {
    try {
      const apiKey = (this.apiKey || process.env.SMSINDIAHUB_API_KEY)?.trim();
      const senderId = (this.senderId || process.env.SMSINDIAHUB_SENDER_ID)?.trim();

      if (!apiKey || !senderId) {
        console.warn("⚠️ SMSIndia Hub not configured. Simulating OTP dispatch:");
        console.log(`📱 [DEV OTP MOCK] Phone: ${phone} | OTP: ${otp} | Purpose: ${purpose}`);
        return {
          success: true,
          mock: true,
          messageId: `mock_${Date.now()}`,
          status: 'sent',
          to: phone,
          body: `Your OTP for ${purpose} is ${otp}`,
        };
      }

      const normalizedPhone = this.normalizePhoneNumber(phone);

      if (normalizedPhone.length !== 12 || !normalizedPhone.startsWith("91")) {
        throw new Error(
          `Invalid phone number format: ${phone}. Expected 10-digit Indian mobile number.`
        );
      }

      const customTemplate = process.env.SMSINDIAHUB_MESSAGE_TEMPLATE?.trim();
      const templateId = process.env.SMSINDIAHUB_TEMPLATE_ID?.trim();
      const peId = (this.peId || process.env.SMSINDIAHUB_PE_ID)?.trim();
      const usePromotional = process.env.SMSINDIAHUB_USE_PROMOTIONAL === 'true';
      const gatewayId = usePromotional ? "1" : "2";

      let message;
      if (customTemplate) {
        message = customTemplate.replace('{otp}', otp);
      } else if (usePromotional) {
        let purposeText = 'registration';
        if (purpose === 'login') {
          purposeText = 'login';
        } else if (purpose === 'reset_password') {
          purposeText = 'password reset';
        }
        message = `Welcome to Hemsely. Your OTP for ${purposeText} is ${otp}`;
      } else {
        message = `Welcome to Hemsely. Your OTP for registration is ${otp}`;
      }

      const params = new URLSearchParams({
        APIKey: apiKey,
        msisdn: normalizedPhone,
        sid: senderId,
        msg: message,
        fl: "0",
        dc: "0",
        gwid: gatewayId,
      });

      if (templateId) {
        params.append('templateid', templateId);
      }
      if (peId) {
        params.append('peid', peId);
      }

      const apiUrl = `${this.baseUrl}?${params.toString()}`;

      const response = await axios.get(apiUrl, {
        headers: {
          "User-Agent": "Hemsely/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 15000,
      });

      console.log("📱 SMSIndia Hub Response Status:", response.status);
      console.log("📱 SMSIndia Hub Response Data:", response.data);

      let responseData = response.data;
      const responseText = typeof responseData === "string" ? responseData : JSON.stringify(responseData);

      let parsedResponse = null;
      if (typeof responseData === "string") {
        try {
          parsedResponse = JSON.parse(responseData);
        } catch {
          // Not JSON
        }
      } else if (typeof responseData === "object") {
        parsedResponse = responseData;
      }

      if (parsedResponse && typeof parsedResponse === "object") {
        if (parsedResponse.ErrorCode === "000" && parsedResponse.ErrorMessage === "Done") {
          console.log("✅ SMS sent successfully - JSON success response");
          const messageId = parsedResponse.MessageData && parsedResponse.MessageData[0]
            ? parsedResponse.MessageData[0].MessageId
            : `sms_${Date.now()}`;
          return {
            success: true,
            messageId: messageId,
            jobId: parsedResponse.JobId,
            status: 'sent',
            to: normalizedPhone,
            body: message,
            provider: 'SMSIndia Hub',
            response: parsedResponse
          };
        } else if (parsedResponse.ErrorCode && parsedResponse.ErrorCode !== "000") {
          const errorMsg = parsedResponse.ErrorMessage || "Unknown error";
          console.error("❌ SMS failed - JSON error response:", parsedResponse);
          throw new Error(`SMSIndia Hub API error: ${errorMsg} (Code: ${parsedResponse.ErrorCode})`);
        }
      }

      if (responseText.includes('success') || responseText.includes('sent') || responseText.includes('accepted')) {
        console.log("✅ SMS sent successfully - success indicator found in text");
        return {
          success: true,
          messageId: `sms_${Date.now()}`,
          status: 'sent',
          to: normalizedPhone,
          body: message,
          provider: 'SMSIndia Hub',
          response: responseText
        };
      } else if (responseText.includes('error') || responseText.includes('failed') || responseText.includes('invalid')) {
        console.error("❌ SMS failed - error indicator found in text:", responseText);
        throw new Error(`SMSIndia Hub API error: ${responseText}`);
      } else {
        console.log("⚠️ Ambiguous response - assuming success");
        return {
          success: true,
          messageId: `sms_${Date.now()}`,
          status: 'sent',
          to: normalizedPhone,
          body: message,
          provider: 'SMSIndia Hub',
          response: responseText
        };
      }
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;
        if (error.response.status === 401) {
          throw new Error("SMSIndia Hub authentication failed. Please check your API key.");
        } else if (error.response.status === 400) {
          throw new Error(`SMSIndia Hub request error: Invalid request parameters`);
        } else if (error.response.status === 429) {
          throw new Error("SMSIndia Hub rate limit exceeded. Please try again later.");
        } else if (error.response.status === 500) {
          throw new Error("SMSIndia Hub server error. Please try again later.");
        } else {
          throw new Error(`SMSIndia Hub API error (${error.response.status}): ${errorData}`);
        }
      } else if (error.code === "ECONNABORTED") {
        throw new Error("SMSIndia Hub request timeout. Please try again.");
      } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        throw new Error("Unable to connect to SMSIndia Hub service. Please check your internet connection.");
      } else if (error.code === "ECONNRESET") {
        throw new Error("SMSIndia Hub connection was reset. Please try again.");
      }

      throw error;
    }
  }

  async sendCustomSMS(phone, message) {
    try {
      const apiKey = (this.apiKey || process.env.SMSINDIAHUB_API_KEY)?.trim();
      const senderId = (this.senderId || process.env.SMSINDIAHUB_SENDER_ID)?.trim();

      if (!apiKey || !senderId) {
        throw new Error("SMSIndia Hub not configured.");
      }

      const normalizedPhone = this.normalizePhoneNumber(phone);

      const params = new URLSearchParams({
        APIKey: apiKey,
        msisdn: normalizedPhone,
        sid: senderId,
        msg: message,
        fl: "0",
        dc: "0",
        gwid: "2",
      });

      const apiUrl = `${this.baseUrl}?${params.toString()}`;

      const response = await axios.get(apiUrl, {
        headers: {
          "User-Agent": "Hemsely/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 15000,
      });

      const responseText = response.data.toString();

      if (responseText.includes("success") || responseText.includes("sent") || responseText.includes("accepted")) {
        return {
          success: true,
          messageId: `sms_${Date.now()}`,
          status: "sent",
          to: normalizedPhone,
          body: message,
          provider: "SMSIndia Hub",
          response: responseText,
        };
      } else {
        throw new Error(`SMSIndia Hub API error: ${responseText}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async testConnection() {
    try {
      const apiKey = (this.apiKey || process.env.SMSINDIAHUB_API_KEY)?.trim();
      const senderId = (this.senderId || process.env.SMSINDIAHUB_SENDER_ID)?.trim();

      if (!apiKey || !senderId) {
        throw new Error("SMSIndia Hub credentials missing.");
      }

      const testPhone = "919109992290";
      const testMessage = "Test message from Hemsely.";

      const params = new URLSearchParams({
        APIKey: apiKey,
        msisdn: testPhone,
        sid: senderId,
        msg: testMessage,
        fl: "0",
        dc: "0",
        gwid: "2",
      });

      const testUrl = `${this.baseUrl}?${params.toString()}`;

      const response = await axios.get(testUrl, {
        headers: {
          "User-Agent": "Hemsely/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 10000,
      });

      return {
        success: true,
        message: "SMSIndia Hub connection successful",
        response: response.data.toString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  async getBalance() {
    try {
      const apiKey = (this.apiKey || process.env.SMSINDIAHUB_API_KEY)?.trim();
      if (!apiKey) throw new Error("SMSINDIAHUB_API_KEY missing.");

      const balanceUrl = `http://cloud.smsindiahub.in/vendorsms/checkbalance.aspx?APIKey=${apiKey}`;

      const response = await axios.get(balanceUrl, {
        headers: {
          "User-Agent": "Hemsely/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 10000,
      });

      const responseText = response.data.toString();
      const balanceMatch = responseText.match(/(\d+\.?\d*)/);
      const balance = balanceMatch ? parseFloat(balanceMatch[1]) : 0;

      return {
        success: true,
        balance,
        currency: "INR",
        response: responseText,
      };
    } catch (error) {
      throw new Error(`Failed to fetch balance: ${error.message}`);
    }
  }
}

const smsIndiaHubService = new SMSIndiaHubService();
export default smsIndiaHubService;
