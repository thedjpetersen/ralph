/**
 * Simple fuzzy search implementation
 * Returns a score (higher is better match) or -1 if no match
 */
export function fuzzyMatch(query: string, text: string): number {
  if (!query) return 0;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) return 1000;

  // Starts with gets high score
  if (textLower.startsWith(queryLower)) return 500 + (queryLower.length / textLower.length) * 100;

  // Contains gets medium score
  if (textLower.includes(queryLower)) return 300 + (queryLower.length / textLower.length) * 100;

  // Fuzzy matching
  let queryIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;
  let lastMatchIndex = -2;

  for (let textIndex = 0; textIndex < textLower.length && queryIndex < queryLower.length; textIndex++) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      // Bonus for consecutive matches
      if (lastMatchIndex === textIndex - 1) {
        consecutiveMatches++;
        score += consecutiveMatches * 10;
      } else {
        consecutiveMatches = 1;
        score += 5;
      }

      // Bonus for matching at word boundaries
      if (textIndex === 0 || text[textIndex - 1] === ' ' || text[textIndex - 1] === '-' || text[textIndex - 1] === '_') {
        score += 15;
      }

      lastMatchIndex = textIndex;
      queryIndex++;
    }
  }

  // All query characters must be found
  if (queryIndex < queryLower.length) return -1;

  // Normalize score by text length (shorter matches are better)
  return score + (queryLower.length / textLower.length) * 50;
}

export interface SearchableItem<T> {
  item: T;
  searchText: string;
  keywords?: string[];
}

export interface SearchResult<T> {
  item: T;
  score: number;
}

/**
 * Search through items using fuzzy matching
 */
export function fuzzySearch<T>(
  query: string,
  items: SearchableItem<T>[],
  minScore: number = 0
): SearchResult<T>[] {
  if (!query.trim()) {
    return items.map(({ item }) => ({ item, score: 0 }));
  }

  const results: SearchResult<T>[] = [];

  for (const { item, searchText, keywords } of items) {
    // Match against main search text
    let bestScore = fuzzyMatch(query, searchText);

    // Also match against keywords
    if (keywords) {
      for (const keyword of keywords) {
        const keywordScore = fuzzyMatch(query, keyword);
        if (keywordScore > bestScore) {
          bestScore = keywordScore;
        }
      }
    }

    if (bestScore >= minScore) {
      results.push({ item, score: bestScore });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Highlight matched characters in text
 */
export function highlightMatch(query: string, text: string): { text: string; matched: boolean }[] {
  if (!query) {
    return [{ text, matched: false }];
  }

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const result: { text: string; matched: boolean }[] = [];

  let queryIndex = 0;
  let currentSegment = '';
  let isCurrentMatched = false;

  for (let i = 0; i < text.length; i++) {
    const charMatches = queryIndex < queryLower.length && textLower[i] === queryLower[queryIndex];

    if (charMatches) {
      // Push previous non-matching segment if exists
      if (currentSegment && !isCurrentMatched) {
        result.push({ text: currentSegment, matched: false });
        currentSegment = '';
      }

      currentSegment += text[i];
      isCurrentMatched = true;
      queryIndex++;
    } else {
      // Push previous matching segment if exists
      if (currentSegment && isCurrentMatched) {
        result.push({ text: currentSegment, matched: true });
        currentSegment = '';
      }

      currentSegment += text[i];
      isCurrentMatched = false;
    }
  }

  // Push final segment
  if (currentSegment) {
    result.push({ text: currentSegment, matched: isCurrentMatched });
  }

  return result;
}
