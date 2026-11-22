import { countWords } from './count';
import { isSectionHeading, scanMarkdown, sectionEndLine } from './section';

const META = /^- (date|words)[ \t]*:/i;

export interface HeadingLevels {
	/** Entry heading level, 1-5. */
	entryLevel: number;
	/** Section heading level, below the entry level. */
	sectionLevel: number;
}

export interface Entry {
	/** The entry heading's line. */
	headingLine: number;
	/** Entry heading text, trimmed. */
	title: string;
	/** Word count of the entry's first matching section. */
	words: number;
	/** First `- date:` meta line, or null. */
	dateLine: number | null;
	/** First `- words:` meta line, or null. */
	wordsLine: number | null;
}

/** Same shape as Obsidian's `EditorChange`. */
export interface LineEdit {
	from: { line: number; ch: number };
	to: { line: number; ch: number };
	text: string;
}

export interface DateLineOptions {
	/** Add a `- date:` line when an entry has none. */
	add: boolean;
	/** Value written into an added date line; '' leaves it empty. */
	value: string;
}

export interface WordCountEdits {
	/** Entries found. */
	entries: number;
	/** Entries with at least one edit. */
	changedEntries: number;
	/** Edits in document order; positions refer to the original markdown. */
	edits: LineEdit[];
}

/**
 * Reads a note into entries: a heading at the entry level with a `headingName` section at the
 * section level under it, before the next heading at the entry level or higher. Each entry has
 * its word count and its meta lines.
 */
export function findEntries(markdown: string, headingName: string, levels: HeadingLevels): Entry[] {
	const scanned = scanMarkdown(markdown);
	const { lines, headings, inFence } = scanned;
	const { entryLevel, sectionLevel } = levels;
	const entries: Entry[] = [];

	for (const [i, heading] of headings.entries()) {
		if (heading.level !== entryLevel) continue;

		let section = -1;
		for (let j = i + 1; j < headings.length; j++) {
			const next = headings[j];
			if (!next || next.level <= entryLevel) break;
			if (isSectionHeading(next, headingName, sectionLevel)) {
				section = j;
				break;
			}
		}
		const sectionHeading = headings[section];
		if (!sectionHeading) continue;

		const sectionEnd = sectionEndLine(scanned, section);
		const words = countWords(lines.slice(sectionHeading.line + 1, sectionEnd).join('\n'));

		// Meta zone: after the entry heading, before its first heading (the section heading at the latest).
		const metaEnd = headings[i + 1]?.line ?? sectionHeading.line;
		let dateLine: number | null = null;
		let wordsLine: number | null = null;
		for (let line = heading.line + 1; line < metaEnd; line++) {
			if (inFence[line]) continue;
			const key = META.exec(lines[line] ?? '')?.[1]?.toLowerCase();
			if (key === 'date' && dateLine === null) dateLine = line;
			if (key === 'words' && wordsLine === null) wordsLine = line;
		}

		entries.push({ headingLine: heading.line, title: heading.text, words, dateLine, wordsLine });
	}

	return entries;
}

/**
 * The edits that add missing `- date:` / `- words:` lines and set every entry's word count.
 * The date options apply only to added date lines; existing date lines are never edited.
 */
export function wordCountEdits(
	markdown: string,
	headingName: string,
	levels: HeadingLevels,
	date: DateLineOptions,
): WordCountEdits {
	const { lines } = scanMarkdown(markdown);
	const entries = findEntries(markdown, headingName, levels);
	const edits: LineEdit[] = [];
	let changedEntries = 0;
	const dateText = date.value === '' ? '- date:' : `- date: ${date.value}`;

	for (const entry of entries) {
		const entryEdits: LineEdit[] = [];
		const wordsText = `- words: ${entry.words}`;
		const belowHeading = entry.headingLine + 1;
		const addDate = entry.dateLine === null && date.add;

		if (addDate && entry.wordsLine === null) {
			entryEdits.push(insertAt(belowHeading, `${dateText}\n${wordsText}\n`));
		} else if (addDate) {
			entryEdits.push(insertAt(belowHeading, `${dateText}\n`));
		} else if (entry.dateLine === null && entry.wordsLine === null) {
			entryEdits.push(insertAt(belowHeading, `${wordsText}\n`));
		} else if (entry.dateLine !== null && entry.wordsLine === null) {
			entryEdits.push(insertAt(entry.dateLine + 1, `${wordsText}\n`));
		}

		if (entry.wordsLine !== null) {
			const current = lines[entry.wordsLine] ?? '';
			const prefix = META.exec(current)?.[0] ?? '- words:';
			const expected = `${prefix} ${entry.words}`;
			if (current !== expected) {
				entryEdits.push({
					from: { line: entry.wordsLine, ch: 0 },
					to: { line: entry.wordsLine, ch: current.length },
					text: expected,
				});
			}
		}

		if (entryEdits.length > 0) changedEntries++;
		edits.push(...entryEdits);
	}

	return { entries: entries.length, changedEntries, edits };
}

/** The notice shown after the update command runs. */
export function updateNoticeText(result: WordCountEdits): string {
	if (result.entries === 0) return 'No entries found';
	if (result.changedEntries === 0) return 'Word counts are up to date';
	if (result.changedEntries === 1) return 'Updated 1 entry';
	return `Updated ${result.changedEntries} entries`;
}

function insertAt(line: number, text: string): LineEdit {
	return { from: { line, ch: 0 }, to: { line, ch: 0 }, text };
}
