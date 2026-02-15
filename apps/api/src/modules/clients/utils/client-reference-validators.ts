// Lightweight helpers for validating and formatting client references.

export const CLIENT_REF_PATTERN = /^(?<portfolio>\d+)(?<initial>[A-Z])(?<counter>\d{3})(?<suffix>[A-Z])?$/;

export function isValidClientRef(ref: string): boolean {
  if (typeof ref !== 'string') return false;
  return CLIENT_REF_PATTERN.test(ref.trim().toUpperCase());
}

export function parseClientRef(ref: string): {
  portfolio: number;
  initial: string;
  counter: string;
  suffix: string | null;
  base: string;
} | null {
  if (typeof ref !== 'string') return null;
  const m = CLIENT_REF_PATTERN.exec(ref.trim().toUpperCase());
  if (!m || !m.groups) return null;
  const portfolio = Number(m.groups.portfolio);
  const initial = m.groups.initial;
  const counter = m.groups.counter;
  const suffix = m.groups.suffix || null;
  return { portfolio, initial, counter, suffix, base: `${portfolio}${initial}${counter}` };
}

export function normalizeCompanyInitial(name: string): string {
  if (typeof name !== 'string') return 'X';
  return (
    name
      .replace(/^\s*the\s+/i, '')
      .replace(/[^A-Za-z\s]/g, ' ')
      .trim()
      .charAt(0)
      ?.toUpperCase() || 'X'
  );
}

export function surnameInitial(fullName: string): string {
  if (typeof fullName !== 'string') return 'X';
  const cleaned = fullName.replace(/[^A-Za-z\s]/g, ' ').trim();
  if (!cleaned) return 'X';
  const parts = cleaned.split(/\s+/);
  const surname = parts[parts.length - 1];
  return surname.charAt(0).toUpperCase() || 'X';
}

export function ordinalToSuffix(n: number): string {
  return String.fromCharCode(64 + n);
}

export function suffixToOrdinal(s: string): number {
  return s.charCodeAt(0) - 64;
}
