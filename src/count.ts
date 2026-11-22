const WORD_RUN = /(?:\p{N}+(?:[.,]\p{N}+)*|[\p{L}\p{M}\p{N}'’-])+/gu;
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const ORDERED_LIST_MARKER = /^[ \t]*\d+[.)][ \t]+/gm;

/**
 * Counts words: runs of letters, digits, apostrophes, and hyphens that contain
 * at least one letter or digit, so Markdown markers and lone dashes are skipped.
 * Ordered-list numbers at the start of a line (`1. `, `2) `) are markers too.
 */
export function countWords(text: string): number {
	let count = 0;
	for (const [run] of text.replace(ORDERED_LIST_MARKER, '').matchAll(WORD_RUN)) {
		if (HAS_LETTER_OR_DIGIT.test(run)) count++;
	}
	return count;
}

/** Formats a word count for the status bar: `1 word`, `0 words`, `214 words`. */
export function formatWordCount(count: number): string {
	return count === 1 ? '1 word' : `${count} words`;
}
