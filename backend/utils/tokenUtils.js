import jwt from 'jsonwebtoken';

export const generateToken = (id, role = 'user') => {
  const secret = process.env.JWT_SECRET || 'secret';
  const expiresIn = process.env.JWT_EXPIRY || '30d';
  return jwt.sign({ id, role }, secret, { expiresIn });
};

export const generateRefreshToken = (id) => {
  const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'secret';
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRY || '30d';
  return jwt.sign({ id }, secret, { expiresIn });
};

export const setCookie = (res, token, refreshToken, tokenName = 'token', refreshTokenName = 'refreshToken') => {
  const parsedExpiry = parseInt(process.env.COOKIE_EXPIRY, 10);
  const expiryDays = !isNaN(parsedExpiry) && parsedExpiry > 0 ? parsedExpiry : 30;

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: expiryDays * 24 * 60 * 60 * 1000, // Convert days to ms
  };

  res.cookie(tokenName, token, cookieOptions);
  res.cookie(refreshTokenName, refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export const clearCookie = (res, tokenName = 'token', refreshTokenName = 'refreshToken') => {
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };
  res.clearCookie(tokenName, clearOptions);
  res.clearCookie(refreshTokenName, clearOptions);
};
