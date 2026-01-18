/**
 * Portfolio configuration constants
 */
export const PORTFOLIO_CONFIG = {
  MIN_CODE: 1,
  MAX_CODE: 10,
  DEFAULT_CODE: 1,
} as const;

/**
 * Get all valid portfolio codes as an array
 */
export function getValidPortfolioCodes(): number[] {
  return Array.from(
    { length: PORTFOLIO_CONFIG.MAX_CODE - PORTFOLIO_CONFIG.MIN_CODE + 1 },
    (_, i) => PORTFOLIO_CONFIG.MIN_CODE + i
  );
}

/**
 * Validate if a portfolio code is within valid range
 */
export function isValidPortfolioCode(code: number): boolean {
  return code >= PORTFOLIO_CONFIG.MIN_CODE && code <= PORTFOLIO_CONFIG.MAX_CODE;
}

/**
 * Get error message for invalid portfolio code
 */
export function getPortfolioValidationError(): string {
  return `Portfolio code must be between ${PORTFOLIO_CONFIG.MIN_CODE} and ${PORTFOLIO_CONFIG.MAX_CODE}`;
}
