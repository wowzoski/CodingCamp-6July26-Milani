/**
 * Formatter module — pure functions extracted for testing.
 * These are the same implementations as in script.js.
 *
 * Exported as ES module so Vitest can import them directly.
 */

'use strict';

/**
 * Formats a number as Indonesian Rupiah currency string.
 * Uses dots as thousands separators, no decimal places.
 *
 * Examples:
 *   formatRupiah(1250000) → "Rp 1.250.000"
 *   formatRupiah(500)     → "Rp 500"
 *   formatRupiah(0)       → "Rp 0"
 *
 * @param {number} amount - A non-negative number (integer or float)
 * @returns {string}
 */
export function formatRupiah(amount) {
  const integer = Math.floor(amount);
  if (integer === 0) return 'Rp 0';
  const formatted = integer
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp ' + formatted;
}

/**
 * Returns the hex color associated with a spending category.
 * Falls back to a default earth-tone color for unknown categories.
 *
 * Mapping:
 *   "Food"      → "#A47148"
 *   "Transport" → "#8A9A5B"
 *   "Fun"       → "#C97C5D"
 *   (other)     → "#B5654A"  (fallback / terracotta-dark)
 *
 * @param {string} category - Category name
 * @returns {string} Hex color string
 */
export function getColorForCategory(category) {
  const colorMap = {
    'Food':      '#A47148',
    'Transport': '#8A9A5B',
    'Fun':       '#C97C5D',
  };
  return colorMap[category] || '#B5654A';
}

/**
 * Formats a chart label combining category name and percentage.
 *
 * Examples:
 *   formatChartLabel("Food", 45.2)    → "Food (45.2%)"
 *   formatChartLabel("Transport", 10) → "Transport (10.0%)"
 *
 * @param {string} category   - Category name
 * @param {number} percentage - Percentage value (0–100)
 * @returns {string}
 */
export function formatChartLabel(category, percentage) {
  return `${category} (${percentage.toFixed(1)}%)`;
}
