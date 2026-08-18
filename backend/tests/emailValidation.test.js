import { validateEmail, validateEmailStrict, getLevenshteinDistance } from '../utils/validators.js';

describe('Strict Email Validation Utility', () => {
  describe('Levenshtein Distance', () => {
    it('calculates correct edit distance', () => {
      expect(getLevenshteinDistance('gmail', 'gmail')).toBe(0);
      expect(getLevenshteinDistance('gmaill', 'gmail')).toBe(1);
      expect(getLevenshteinDistance('gmailll', 'gmail')).toBe(2);
      expect(getLevenshteinDistance('yaho', 'yahoo')).toBe(1);
    });
  });

  describe('Valid Email Addresses', () => {
    const validEmails = [
      'panchalajay717@gmail.com',
      'user@yahoo.com',
      'user@hotmail.com',
      'user@outlook.com',
      'user@icloud.com',
      'admin+ops@example.email',
      'support@hemsely.app',
      'user@company.co.in',
      'john.doe@my-company.org',
      'test.user_123@domain.io',
    ];

    validEmails.forEach((email) => {
      it(`accepts valid email: ${email}`, () => {
        const res = validateEmailStrict(email);
        expect(res.isValid).toBe(true);
        expect(res.email).toBe(email);
        expect(validateEmail(email)).toBe(true);
      });
    });
  });

  describe('Invalid Email Formats & Typo Domains', () => {
    it('rejects typo domain @gmailll.commm', () => {
      const res = validateEmailStrict('ajay@gmailll.commm');
      expect(res.isValid).toBe(false);
      expect(res.message).toBe('Please enter a valid email address');
      expect(validateEmail('ajay@gmailll.commm')).toBe(false);
    });

    it('rejects typo TLD .comm', () => {
      const res = validateEmailStrict('user@gmail.comm');
      expect(res.isValid).toBe(false);
      expect(res.message).toBe('Please enter a valid email address');
      expect(validateEmail('user@gmail.comm')).toBe(false);
    });

    it('rejects typo domain @gmaill.com', () => {
      const res = validateEmailStrict('user@gmaill.com');
      expect(res.isValid).toBe(false);
      expect(res.message).toBe('Please enter a valid email address');
      expect(validateEmail('user@gmaill.com')).toBe(false);
    });

    it('rejects typo domain @yaho.com', () => {
      const res = validateEmailStrict('user@yaho.com');
      expect(res.isValid).toBe(false);
      expect(res.message).toBe('Please enter a valid email address');
      expect(validateEmail('user@yaho.com')).toBe(false);
    });

    it('rejects typo domain @hotmial.com', () => {
      const res = validateEmailStrict('user@hotmial.com');
      expect(res.isValid).toBe(false);
      expect(res.message).toBe('Please enter a valid email address');
    });

    it('rejects typo domain @outlok.com', () => {
      const res = validateEmailStrict('user@outlok.com');
      expect(res.isValid).toBe(false);
      expect(res.message).toBe('Please enter a valid email address');
    });

    it('rejects typo domain @icloudd.com', () => {
      const res = validateEmailStrict('user@icloudd.com');
      expect(res.isValid).toBe(false);
      expect(res.message).toBe('Please enter a valid email address');
    });

    it('rejects missing username or domain', () => {
      expect(validateEmail('plainaddress')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
    });

    it('rejects invalid dot placements', () => {
      expect(validateEmail('.user@domain.com')).toBe(false);
      expect(validateEmail('user.@domain.com')).toBe(false);
      expect(validateEmail('user..name@domain.com')).toBe(false);
      expect(validateEmail('user@domain..com')).toBe(false);
    });

    it('rejects repeating character TLD typos like .commm or .orgg', () => {
      const res = validateEmailStrict('user@domain.commm');
      expect(res.isValid).toBe(false);
    });
  });
});
