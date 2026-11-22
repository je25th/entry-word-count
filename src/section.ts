const HEADING = /^ {0,3}(#{1,6})(?:[ \t](.*))?$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

export type SectionPosition = 'first' | 'last';

export interface Heading {
	/** 0-based line index. */
	line: number;
	/** 1-6. */
	level: number;
	/** Heading text, trimmed. */
	text: string;
}

export interface ScannedMarkdown {
	/** Lines split on `\n`, with a trailing `\r` removed. */
	lines: string[];
	/** ATX headings outside code fences, in order. */
	headings: Heading[];
	/** Per line: a fence marker or fenced content. */
	inFence: boolean[];
}

/** Splits a note into lines and finds its headings, skipping fenced code. */
export function scanMarkdown(markdown: string): ScannedMarkdown {
	const lines = markdown.split('\n').map((line) => line.replace(/\r$/, ''));
	const headings: Heading[] = [];
	const inFence: boolean[] = [];
	let fence: { char: string; length: number } | null = null;

	for (const [index, line] of lines.entries()) {
		const fenceMatch = FENCE.exec(line);
		if (fence) {
			inFence.push(true);
			const [, marker = ''] = fenceMatch ?? [];
			if (marker.startsWith(fence.char) && marker.length >= fence.length) fence = null;
			continue;
		}
		if (fenceMatch) {
			inFence.push(true);
			const [, marker = ''] = fenceMatch;
			fence = { char: marker.charAt(0), length: marker.length };
			continue;
		}

		inFence.push(false);
		const heading = HEADING.exec(line);
		if (!heading) continue;
		const [, hashes = '', text = ''] = heading;
		headings.push({ line: index, level: hashes.length, text: text.trim() });
	}

	return { lines, headings, inFence };
}

/** True when a heading is at `level` and named `headingName` (trimmed, case-insensitive). */
export function isSectionHeading(heading: Heading, headingName: string, level: number): boolean {
	return heading.level === level && heading.text.toLowerCase() === headingName.trim().toLowerCase();
}

/**
 * The line where the section starting at `headings[index]` ends (exclusive): the next heading
 * at the section's level or higher, or the end of the note. Deeper subheadings stay inside.
 */
export function sectionEndLine({ lines, headings }: ScannedMarkdown, index: number): number {
	const level = headings[index]?.level ?? 0;
	for (let j = index + 1; j < headings.length; j++) {
		const next = headings[j];
		if (next && next.level <= level) return next.line;
	}
	return lines.length;
}

/**
 * Returns the text under the first or last heading at `level` named `headingName`,
 * up to the next heading at that level or higher, or `null` when the note has no such heading.
 */
export function getSectionText(
	markdown: string,
	headingName: string,
	level: number,
	position: SectionPosition = 'first',
): string | null {
	const scanned = scanMarkdown(markdown);
	const { lines, headings } = scanned;
	const matches = headings.flatMap((heading, i) => (isSectionHeading(heading, headingName, level) ? [i] : []));
	const index = position === 'first' ? matches[0] : matches[matches.length - 1];
	if (index === undefined) return null;

	const start = (headings[index]?.line ?? 0) + 1;
	return lines.slice(start, sectionEndLine(scanned, index)).join('\n');
}
