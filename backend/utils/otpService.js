// Hardcoded default test phone numbers configured directly in code
const HARDCODED_DEFAULT_OTP_NUMBERS = ['7610416911', '9009925021'];
const DEFAULT_HARDCODED_OTP = '123456';

export const isDefaultOtpPhone = (last10Digits) => {
  const normalized = String(last10Digits || '').replace(/\D/g, '').slice(-10);
  if (!normalized) return false;

  const envPhones = (process.env.DEFAULT_OTP_NUMBERS || '')
    .split(',')
    .map((p) => p.trim().replace(/\D/g, '').slice(-10))
    .filter(Boolean);

  const defaultPhones = [...HARDCODED_DEFAULT_OTP_NUMBERS, ...envPhones];
  return defaultPhones.includes(normalized);
};

export const generateOtpCode = (last10Digits) => {
  const normalized = String(last10Digits || '').replace(/\D/g, '').slice(-10);
  const isDefaultNumber = isDefaultOtpPhone(normalized);
  if (isDefaultNumber) {
    return DEFAULT_HARDCODED_OTP;
  }
  const isMockMode = process.env.OTP_USE_MOCK === 'true';
  const defaultMock = process.env.OTP_MOCK_CODE || DEFAULT_HARDCODED_OTP;
  return isMockMode ? defaultMock : Math.floor(100000 + Math.random() * 900000).toString();
};

export const getOtpExpiry = () => new Date(
  Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10) * 60 * 1000)
);

export const isOtpValid = (user, enteredOtp, last10Digits) => {
  const cleanEnteredOtp = String(enteredOtp || '').trim();
  if (!cleanEnteredOtp) return false;

  const normalized = String(last10Digits || '').replace(/\D/g, '').slice(-10);
  const isDefaultNumber = isDefaultOtpPhone(normalized);
  if (isDefaultNumber && cleanEnteredOtp === DEFAULT_HARDCODED_OTP) {
    return true;
  }

  const now = new Date();
  const isMockMode = process.env.OTP_USE_MOCK === 'true';
  const defaultMock = process.env.OTP_MOCK_CODE || DEFAULT_HARDCODED_OTP;
  const allowMockOtp = isMockMode || isDefaultNumber;
  const isRealOtpValid = Boolean(user?.otpCode) && user.otpCode === cleanEnteredOtp &&
    (!user.otpExpires || user.otpExpires > now);
  return isRealOtpValid || (allowMockOtp && cleanEnteredOtp === defaultMock);
};

export const lastTenDigits = (phoneNumber) => String(phoneNumber || '').replace(/\D/g, '').slice(-10);

