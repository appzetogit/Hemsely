import sanitizeHtml from 'sanitize-html';

// CMS body fields (Privacy Policy / Terms / website pages) are intentionally
// rendered as raw HTML on the frontend via dangerouslySetInnerHTML - only a
// safe formatting subset is allowed through, no scripts/handlers/iframes.
export const sanitizeCmsHtml = (value) => {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
};

// Free-text fields (bio, ticket subject/message, admin responses, report notes)
// are rendered as plain text everywhere today - strip all markup rather than
// storing HTML that could become a stored-XSS vector if a render path changes.
export const stripAllHtml = (value) => {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
};
