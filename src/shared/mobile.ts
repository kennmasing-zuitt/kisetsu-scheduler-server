/**
 * Mobile numbers in one canonical form (E.164, e.g. "+639171234567") so the same client is
 * recognised however the number was typed.
 *
 * Philippine mobiles, all of which become +639XXXXXXXXX:
 *   09171234567 · 0917 123 4567 · 0917-123-4567 · (0917) 123-4567 · 9171234567
 *   639171234567 · +639171234567 · +63 917 123 4567 · +63 (917) 123-4567 · 0063 917 123 4567
 * International: "+" (or "00") then a country code and number, 8 to 15 digits in all.
 * Philippine landlines and anything else are rejected (null).
 */
export function normalizeMobile(input: string): string | null {
    // Drop spaces, dashes, dots, slashes and brackets people type for readability
    let s = input.trim().replace(/[\s\-./()]/g, '');
    if (s.startsWith('00')) s = `+${s.slice(2)}`; // 0063… is the same as +63…
    if (!/^\+?\d+$/.test(s)) return null;

    const digits = s.replace('+', '');
    const hasPlus = s.startsWith('+');

    // Philippine mobile: 9 followed by 9 digits, with 63 / 0 / nothing in front
    const ph = /^(?:63|0)?(9\d{9})$/.exec(digits);
    if (ph && (!hasPlus || digits.startsWith('63'))) return `+63${ph[1]}`;

    // +63 but not a mobile (e.g. a Manila landline): not accepted
    if (digits.startsWith('63')) return null;

    // Other countries only with an explicit + / 00 prefix
    if (hasPlus && /^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
    return null;
}

export const MOBILE_HINT =
    'Enter a mobile number like 0917 123 4567 or +63 917 123 4567 (international: +<country code>…)';

/** "+639171234567" -> "0917 123 4567" for display; other numbers are returned as they are */
export function formatMobile(mobile: string): string {
    const m = /^\+63(9\d{2})(\d{3})(\d{4})$/.exec(mobile);
    return m ? `0${m[1]} ${m[2]} ${m[3]}` : mobile;
}
