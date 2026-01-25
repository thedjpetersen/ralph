/**
 * Clamps a number within a specified range.
 * @param value - The number to clamp
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns The value clamped between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Formats a number as a USD currency string.
 * @param amount - The amount to format
 * @returns A string in '$X.XX' format
 */
export function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}
