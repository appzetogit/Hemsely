import jwt from 'jsonwebtoken';

export const generateToken = (id, role = 'user') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });
};

export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

export const setCookie = (res, token, refreshToken, tokenName = 'token', refreshTokenName = 'refreshToken') => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Secure in production
    sameSite: 'strict',
    maxAge: parseInt(process.env.COOKIE_EXPIRY) * 24 * 60 * 60 * 1000, // Convert days to ms
  };

  res.cookie(tokenName, token, cookieOptions);
  res.cookie(refreshTokenName, refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export const clearCookie = (res, tokenName = 'token', refreshTokenName = 'refreshToken') => {
  res.clearCookie(tokenName);
  res.clearCookie(refreshTokenName);
};
