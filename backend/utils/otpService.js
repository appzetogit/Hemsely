// Shared OTP generation/validation rules used by both the public phone-login
// flow (authController) and any authenticated re-verification flow (e.g.
// confirming account deletion) - kept in one place after a prior bug where
// the login flow's mock-mode rules drifted out of sync between send/verify.

export const isDefaultOtpPhone = (last10Digits) => {
  const defaultPhones = (process.env.DEFAULT_OTP_NUMBERS || '9009925021')
    .split(',')
    .map((p) => p.trim().replace(/\D/g, '').slice(-10));
  return defaultPhones.includes(last10Digits);
};

export const generateOtpCode = (last10Digits) => {
  const isMockMode = process.env.OTP_USE_MOCK === 'true';
  const defaultMock = process.env.OTP_MOCK_CODE || '123456';
  const isDefaultNumber = isDefaultOtpPhone(last10Digits);
  return (isMockMode || isDefaultNumber) ? defaultMock : Math.floor(100000 + Math.random() * 900000).toString();
};

export const getOtpExpiry = () => new Date(
  Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10) * 60 * 1000)
);

export const isOtpValid = (user, enteredOtp, last10Digits) => {
  const now = new Date();
  const isMockMode = process.env.OTP_USE_MOCK === 'true';
  const defaultMock = process.env.OTP_MOCK_CODE || '123456';
  const allowMockOtp = isMockMode || isDefaultOtpPhone(last10Digits);
  const isRealOtpValid = Boolean(user?.otpCode) && user.otpCode === enteredOtp &&
    (!user.otpExpires || user.otpExpires > now);
  return isRealOtpValid || (allowMockOtp && enteredOtp === defaultMock);
};

export const lastTenDigits = (phoneNumber) => String(phoneNumber || '').replace(/\D/g, '').slice(-10);
