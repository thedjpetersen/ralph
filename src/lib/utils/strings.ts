/**
 * Capitalizes the first letter of a string.
 * @param str - The input string
 * @returns The string with its first letter capitalized
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to a maximum length, adding ellipsis if truncated.
 * @param str - The input string
 * @param maxLength - The maximum length of the returned string (including ellipsis)
 * @returns The truncated string with '...' appended if it exceeds maxLength
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  if (maxLength <= 3) return '...'.slice(0, maxLength);
  return str.slice(0, maxLength - 3) + '...';
}
