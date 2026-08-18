/**
 * Calculates Levenshtein distance between two strings
 */
export const getLevenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

/**
 * Strict Email Validator for Frontend
 * Returns { isValid: boolean, message?: string, email?: string }
 */
export const validateEmailStrict = (email) => {
  const invalidResult = { isValid: false, message: 'Please enter a valid email address' };

  if (!email || typeof email !== 'string') {
    return invalidResult;
  }

  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) {
    return invalidResult;
  }

  // General RFC structure: local@domain.tld
  const generalRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/;
  if (!generalRegex.test(trimmed)) {
    return invalidResult;
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return invalidResult;
  }

  const [localPart, domainPart] = parts;

  // Local part checks
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return invalidResult;
  }

  // Domain checks
  if (
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.includes('..') ||
    domainPart.startsWith('-') ||
    domainPart.endsWith('-')
  ) {
    return invalidResult;
  }

  const domainSegments = domainPart.toLowerCase().split('.');
  if (domainSegments.length < 2) {
    return invalidResult;
  }

  let tld = domainSegments[domainSegments.length - 1];
  let sld = domainSegments[domainSegments.length - 2];

  const commonCcSlds = new Set(['co', 'com', 'org', 'net', 'edu', 'gov', 'ac', 'or', 'ne', 'go']);
  if (domainSegments.length > 2 && commonCcSlds.has(sld)) {
    sld = domainSegments[domainSegments.length - 3];
  }

  // 1. TLD character repetition check (e.g., "commm", "orgg")
  if (/(.)\1{2,}/.test(tld)) {
    return invalidResult;
  }

  // Known invalid / typo TLDs
  const typoTlds = ['comm', 'commm', 'coom', 'cm', 'orgg', 'nett', 'innd', 'eddu', 'ioo', 'coo'];
  if (typoTlds.includes(tld)) {
    return invalidResult;
  }

  // Duplicate TLD suffix check (e.g., .com.com)
  if (domainPart.toLowerCase().endsWith('.com.com') || domainPart.toLowerCase().endsWith('.org.org')) {
    return invalidResult;
  }

  // Valid TLD set
  const validTlds = new Set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'io', 'co', 'in', 'me', 'info', 'biz', 'tech', 'app',
    'dev', 'ai', 'store', 'online', 'site', 'email', 'xyz', 'us', 'uk', 'ca', 'de', 'fr', 'au', 'jp', 'cn',
    'br', 'ru', 'nl', 'se', 'no', 'es', 'it', 'eu', 'ch', 'at', 'dk', 'fi', 'kr', 'tw', 'sg', 'hk', 'nz',
    'mx', 'za', 'life', 'live', 'agency', 'digital', 'global', 'media', 'world', 'space', 'club', 'design'
  ]);

  // If TLD is not in known TLD set, check if it's a close typo of 'com', 'org', 'net', 'info'
  if (!validTlds.has(tld)) {
    for (const targetTld of ['com', 'org', 'net', 'info']) {
      const dist = getLevenshteinDistance(tld, targetTld);
      if (dist === 1 && (tld.length > targetTld.length || tld.length < targetTld.length)) {
        return invalidResult;
      }
    }
  }

  // 2. SLD typo check against popular email providers
  const popularProviders = [
    'gmail', 'yahoo', 'hotmail', 'outlook', 'icloud',
    'protonmail', 'rediffmail', 'zoho', 'aol', 'mail',
    'live', 'ymail', 'msn', 'comcast', 'gmx', 'hemsely', 'fastmail'
  ];

  if (!popularProviders.includes(sld)) {
    for (const provider of popularProviders) {
      const dist = getLevenshteinDistance(sld, provider);
      if (dist > 0 && dist <= 2 && Math.abs(sld.length - provider.length) <= 2) {
        return invalidResult;
      }
    }
  }

  return { isValid: true, email: trimmed };
};

export const validateEmail = (email) => {
  return validateEmailStrict(email).isValid;
};
