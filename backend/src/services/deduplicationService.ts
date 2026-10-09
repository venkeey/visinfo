/**
 * Response Deduplication Service
 *
 * PURPOSE: Detect and merge duplicate responses before processing
 * DEPENDENCIES: None (or fuzzy matching library)
 * STATUS: ❌ Not implemented - Phase 2 optimization
 *
 * ============================================================
 * AI CODING PROMPT - Copy this to Claude/ChatGPT/Copilot:
 * ============================================================
 *
 * Create a service to detect and handle duplicate responses.
 *
 * Why: Users often submit identical or very similar responses.
 * Processing duplicates wastes AI credits and distorts clustering.
 *
 * Types of Duplicates:
 * 1. Exact duplicates: "I love it" === "I love it"
 * 2. Near duplicates: "I love it" vs "I love it!"
 * 3. Fuzzy duplicates: "I love it" vs "I really love it"
 *
 * Implementation Levels:
 *
 * LEVEL 1 (Simple - Recommended for MVP):
 * - Exact string matching after normalization
 * - Normalize: trim, lowercase, remove extra whitespace
 * - Group by normalized text
 * - Merge duplicates, track count
 *
 * LEVEL 2 (Advanced - Phase 3):
 * - Use Levenshtein distance for fuzzy matching
 * - Threshold: 85% similarity
 * - Library: npm install string-similarity
 *
 * Example Implementation (Level 1):
 * ```typescript
 * export interface DeduplicationResult {
 *   uniqueTexts: string[];           // Unique response texts
 *   duplicateCounts: number[];       // How many times each appeared
 *   totalDuplicates: number;         // Total duplicates removed
 *   mapping: Map<string, number>;    // Original text -> unique index
 * }
 *
 * export function deduplicateResponses(texts: string[]): DeduplicationResult {
 *   const seen = new Map<string, number>(); // normalized -> first occurrence index
 *   const counts = new Map<string, number>(); // normalized -> count
 *   const uniqueTexts: string[] = [];
 *
 *   for (const text of texts) {
 *     const normalized = normalize(text);
 *
 *     if (!seen.has(normalized)) {
 *       // First occurrence
 *       seen.set(normalized, uniqueTexts.length);
 *       uniqueTexts.push(text);
 *       counts.set(normalized, 1);
 *     } else {
 *       // Duplicate
 *       counts.set(normalized, counts.get(normalized)! + 1);
 *     }
 *   }
 *
 *   return {
 *     uniqueTexts,
 *     duplicateCounts: uniqueTexts.map(t => counts.get(normalize(t))!),
 *     totalDuplicates: texts.length - uniqueTexts.length,
 *     mapping: seen
 *   };
 * }
 *
 * function normalize(text: string): string {
 *   return text.trim().toLowerCase().replace(/\s+/g, ' ');
 * }
 * ```
 *
 * Integration in processingOrchestrator.ts:
 * ```typescript
 * import { deduplicateResponses } from './deduplicationService';
 *
 * // Before preprocessing
 * const texts = responses.map(r => r.text);
 * const dedupResult = deduplicateResponses(texts);
 *
 * console.log(`Removed ${dedupResult.totalDuplicates} duplicates`);
 * console.log(`Processing ${dedupResult.uniqueTexts.length} unique responses`);
 *
 * // Generate embeddings for unique texts only
 * const embeddings = await embeddingService.generateBatch(dedupResult.uniqueTexts);
 *
 * // Map embeddings back to original responses
 * const fullEmbeddings = texts.map(text => {
 *   const uniqueIndex = dedupResult.mapping.get(normalize(text));
 *   return embeddings[uniqueIndex];
 * });
 * ```
 *
 * Advanced (Level 2 - Future):
 * ```typescript
 * import stringSimilarity from 'string-similarity';
 *
 * export function fuzzyDeduplicate(texts: string[], threshold: number = 0.85) {
 *   // Find similar pairs
 *   // Merge if similarity > threshold
 *   // More complex but catches "I love it" vs "I really love it"
 * }
 * ```
 *
 * Benefits:
 * - Reduce embedding costs (fewer API calls)
 * - Better clustering (no duplicate bias)
 * - Accurate statistics (count duplicates)
 *
 * ============================================================
 */

export interface DeduplicationResult {
  uniqueTexts: string[];
  duplicateCounts: number[];
  totalDuplicates: number;
  mapping: Map<string, number>;
}

/**
 * Deduplicate responses by normalizing and matching
 */
export function deduplicateResponses(texts: string[]): DeduplicationResult {
  // TODO: Create map for seen texts
  // TODO: Normalize each text
  // TODO: Track first occurrence and count
  // TODO: Build result object
  // TODO: Return DeduplicationResult

  throw new Error('deduplicateResponses not implemented - see AI prompt above');
}

/**
 * Normalize text for comparison
 */
function normalize(text: string): string {
  // TODO: Trim whitespace
  // TODO: Convert to lowercase
  // TODO: Replace multiple spaces with single space
  // TODO: Return normalized text

  throw new Error('normalize not implemented - see AI prompt above');
}

/**
 * Map embeddings back to original response order
 */
export function expandEmbeddings(
  embeddings: number[][],
  originalTexts: string[],
  dedupResult: DeduplicationResult
): number[][] {
  // TODO: For each original text
  // TODO: Find its unique index from mapping
  // TODO: Return corresponding embedding
  // TODO: Return array in original order

  throw new Error('expandEmbeddings not implemented - see AI prompt above');
}

/**
 * Advanced: Fuzzy deduplication using similarity threshold
 */
export function fuzzyDeduplicate(texts: string[], threshold: number = 0.85): DeduplicationResult {
  // TODO: Implement fuzzy matching
  // TODO: Use Levenshtein distance or similar
  // TODO: Group similar texts above threshold
  // TODO: Return DeduplicationResult

  throw new Error('fuzzyDeduplicate not implemented - Phase 3 feature');
}
