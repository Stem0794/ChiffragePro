// Basic sanitization helper to reduce risk of script injection in user-entered text.
// Removes characters commonly used in HTML/JS payloads and trims length.
export const sanitizeText = (value: string, max = 500): string => {
  if (!value) return '';
  return value
    .replace(/[<>"'`]/g, '') // strip obvious tag/script delimiters
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
    .slice(0, max);
};

