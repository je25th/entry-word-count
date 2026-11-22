import { describe, expect, it } from 'vitest';
import { countWords, formatWordCount } from './count';
import { type DateLineOptions, findEntries, type HeadingLevels, type LineEdit, updateNoticeText, wordCountEdits } from './entries';
import { getSectionText, type SectionPosition } from './section';

const NAME = 'my writing';
const LEVELS = { entryLevel: 2, sectionLevel: 3 };
/** v2 behavior: add an empty date line. */
const EMPTY_DATE = { add: true, value: '' };
const TODAY = { add: true, value: '2026-11-22' };
const NO_DATE = { add: false, value: '2026-11-22' };

function note(...lines: string[]): string {
	return lines.join('\n');
}

/**
 * Applies edits whose positions refer to the original text in reverse list order, as the
 * command does. An insert and a replace on the same line then apply replace first.
 */
function applyEdits(text: string, edits: LineEdit[]): string {
	const lines = text.split('\n');
	const offset = (pos: { line: number; ch: number }) =>
		lines.slice(0, pos.line).reduce((sum, line) => sum + line.length + 1, 0) + pos.ch;
	return [...edits].reverse().reduce((out, edit) => out.slice(0, offset(edit.from)) + edit.text + out.slice(offset(edit.to)), text);
}

const TWO_ENTRIES = note(
	'## Mia and the umbrella', //  0
	'- date: 2026-11-17', //       1
	'- words:', //                 2
	'', //                         3
	'### prompt', //               4
	'Two friends argue about an umbrella.',
	'### my writing', //           6
	'"You took my umbrella," Mia said.',
	'"I didn\'t! I borrowed it."',
	'### corrected', //            9
	'### notes',
	'',
	'## A rainy morning', //      12
	'- date: 2026-11-16', //      13
	'- words:', //                14
	'',
	'### prompt',
	'A rainy morning.',
	'### my writing',
	'The rain kept falling.',
	'### corrected',
	'### notes',
	'',
);

describe('findEntries', () => {
	it('reads a two-entry note', () => {
		expect(findEntries(TWO_ENTRIES, NAME, LEVELS)).toEqual([
			{ headingLine: 0, title: 'Mia and the umbrella', words: 11, dateLine: 1, wordsLine: 2 },
			{ headingLine: 12, title: 'A rainy morning', words: 4, dateLine: 13, wordsLine: 14 },
		]);
	});

	it('ignores H2s without a matching H3 and text around entries', () => {
		const md = note(
			'Intro text.',
			'## vocabulary',
			'- words: 99',
			'### list',
			'## Entry',
			'### my writing',
			'One two.',
			'## after',
			'Text.',
		);
		expect(findEntries(md, NAME, LEVELS)).toEqual([
			{ headingLine: 4, title: 'Entry', words: 2, dateLine: null, wordsLine: null },
		]);
	});

	it('ignores a matching H3 outside any entry', () => {
		const md = note('### my writing', 'Before any H2.', '# Part', '### my writing', 'Under H1.');
		expect(findEntries(md, NAME, LEVELS)).toEqual([]);
	});

	it('ends an entry at the next H1 or H2', () => {
		const md = note('## Entry', '### prompt', '# Part two', '### my writing', 'Not this entry.');
		expect(findEntries(md, NAME, LEVELS)).toEqual([]);
		const md2 = note('## Entry', '### prompt', '## Next', '### my writing', 'Next entry.');
		expect(findEntries(md2, NAME, LEVELS)).toEqual([
			{ headingLine: 2, title: 'Next', words: 2, dateLine: null, wordsLine: null },
		]);
	});

	it('counts the first matching H3 when an entry has two', () => {
		const md = note('## Entry', '### my writing', 'One.', '### my writing', 'Two three four.');
		expect(findEntries(md, NAME, LEVELS)[0]?.words).toBe(1);
	});

	it('counts an empty section as zero words', () => {
		const md = note('## Entry', '### my writing', '### corrected', 'Fixed text.');
		expect(findEntries(md, NAME, LEVELS)[0]?.words).toBe(0);
	});

	it('finds meta lines only between the H2 and its first heading', () => {
		const md = note(
			'## Entry',
			'- Date: 2026-11-17',
			'- WORDS : 3',
			'- words: 5',
			'### prompt',
			'- date: not meta',
			'### my writing',
			'- words: not meta either',
		);
		expect(findEntries(md, NAME, LEVELS)).toEqual([
			{ headingLine: 0, title: 'Entry', words: 4, dateLine: 1, wordsLine: 2 },
		]);
	});

	it('does not treat other bullets or keys as meta lines', () => {
		const md = note('## Entry', '* words: 3', '- wordsmith: 1', '-words: 2', '### my writing', 'Hi.');
		expect(findEntries(md, NAME, LEVELS)[0]).toMatchObject({ dateLine: null, wordsLine: null });
	});

	it('ignores headings and meta lines inside code fences', () => {
		const md = note(
			'## Entry',
			'```',
			'- words: 9',
			'## not an entry',
			'```',
			'### my writing',
			'```',
			'### my writing',
			'```',
			'Real text.',
		);
		// Fenced content is part of the section text: "my writing" (2) + "Real text" (2).
		expect(findEntries(md, NAME, LEVELS)).toEqual([
			{ headingLine: 0, title: 'Entry', words: 4, dateLine: null, wordsLine: null },
		]);
	});

	it('follows the heading name argument, trimmed and case-insensitive', () => {
		const md = note('## Entry', '### Draft', 'One two three.', '### my writing', 'One.');
		expect(findEntries(md, '  draft ', LEVELS)[0]?.words).toBe(3);
	});
});

describe('findEntries with other heading levels', () => {
	it('reads H1 entries with H2 sections', () => {
		const md = note(
			'# First', //            0
			'- date: 2026-11-20', // 1
			'## prompt',
			'Write.',
			'## my writing', //      4
			'One two three.',
			'## notes',
			'# Second', //           7
			'## my writing',
			'Four.',
		);
		expect(findEntries(md, NAME, { entryLevel: 1, sectionLevel: 2 })).toEqual([
			{ headingLine: 0, title: 'First', words: 3, dateLine: 1, wordsLine: null },
			{ headingLine: 7, title: 'Second', words: 1, dateLine: null, wordsLine: null },
		]);
	});

	it('reads H2 entries with H4 sections that skip a level', () => {
		const md = note('## Entry', '### Part one', '#### my writing', 'One two.', '### Part two', 'Not counted.');
		expect(findEntries(md, NAME, { entryLevel: 2, sectionLevel: 4 })).toEqual([
			{ headingLine: 0, title: 'Entry', words: 2, dateLine: null, wordsLine: null },
		]);
	});

	it('counts a deeper subheading and its text inside the section', () => {
		const md = note('## Entry', '### my writing', 'One two.', '#### Part two', 'Three.', '### corrected', 'Not counted.');
		// "One two" (2) + "Part two" (2) + "Three" (1).
		expect(findEntries(md, NAME, LEVELS)[0]?.words).toBe(5);
	});

	it('ends the section at the next entry even without a section-level heading', () => {
		const md = note('## A', '### my writing', 'One.', '#### aside', 'Two.', '## B', 'Not counted.');
		expect(findEntries(md, NAME, LEVELS)[0]?.words).toBe(3);
	});

	it('ignores the default levels when other levels are set', () => {
		expect(findEntries(TWO_ENTRIES, NAME, { entryLevel: 1, sectionLevel: 2 })).toEqual([]);
		expect(findEntries(TWO_ENTRIES, NAME, { entryLevel: 2, sectionLevel: 4 })).toEqual([]);
	});

	it('adds the lines below an H3 entry heading', () => {
		const md = note('### Entry', '#### my writing', 'One two.');
		expect(applyEdits(md, wordCountEdits(md, NAME, { entryLevel: 3, sectionLevel: 4 }, EMPTY_DATE).edits)).toBe(
			note('### Entry', '- date:', '- words: 2', '#### my writing', 'One two.'),
		);
	});
});

describe('wordCountEdits', () => {
	it('inserts both lines below the H2 when both are missing', () => {
		const md = note('## Entry', '### my writing', 'One two.');
		const result = wordCountEdits(md, NAME, LEVELS, EMPTY_DATE);
		expect(result).toEqual({
			entries: 1,
			changedEntries: 1,
			edits: [{ from: { line: 1, ch: 0 }, to: { line: 1, ch: 0 }, text: '- date:\n- words: 2\n' }],
		});
		expect(applyEdits(md, result.edits)).toBe(note('## Entry', '- date:', '- words: 2', '### my writing', 'One two.'));
	});

	it('inserts the words line right after the date line', () => {
		const md = note('## Entry', '', '- date: 2026-11-17', '### my writing', 'One two.');
		const { edits } = wordCountEdits(md, NAME, LEVELS, EMPTY_DATE);
		expect(applyEdits(md, edits)).toBe(
			note('## Entry', '', '- date: 2026-11-17', '- words: 2', '### my writing', 'One two.'),
		);
	});

	it('inserts the date line right below the H2', () => {
		const md = note('## Entry', '- words: 2', '### my writing', 'One two.');
		const { edits } = wordCountEdits(md, NAME, LEVELS, EMPTY_DATE);
		expect(applyEdits(md, edits)).toBe(note('## Entry', '- date:', '- words: 2', '### my writing', 'One two.'));
	});

	it('replaces a wrong value and keeps the prefix', () => {
		const md = note('## Entry', '- date:', '- Words: 3', '### my writing', 'One two.');
		const { edits } = wordCountEdits(md, NAME, LEVELS, EMPTY_DATE);
		expect(edits).toEqual([{ from: { line: 2, ch: 0 }, to: { line: 2, ch: 10 }, text: '- Words: 2' }]);
		expect(applyEdits(md, edits)).toBe(note('## Entry', '- date:', '- Words: 2', '### my writing', 'One two.'));
	});

	it('drops extra text after the value', () => {
		const md = note('## Entry', '- date:', '- words: 3 (draft)', '### my writing', 'One two.');
		expect(applyEdits(md, wordCountEdits(md, NAME, LEVELS, EMPTY_DATE).edits)).toBe(
			note('## Entry', '- date:', '- words: 2', '### my writing', 'One two.'),
		);
	});

	it('normalizes the spacing after the colon', () => {
		const md = note('## Entry', '- date:', '- words:2', '### my writing', 'One two.');
		expect(applyEdits(md, wordCountEdits(md, NAME, LEVELS, EMPTY_DATE).edits)).toBe(
			note('## Entry', '- date:', '- words: 2', '### my writing', 'One two.'),
		);
	});

	it('returns no edits when the note is up to date', () => {
		const md = note('## Entry', '- date: 2026-11-17', '- words: 2', '### my writing', 'One two.');
		expect(wordCountEdits(md, NAME, LEVELS, EMPTY_DATE)).toEqual({ entries: 1, changedEntries: 0, edits: [] });
	});

	it('edits several entries in document order with original positions', () => {
		const result = wordCountEdits(TWO_ENTRIES, NAME, LEVELS, EMPTY_DATE);
		expect(result.entries).toBe(2);
		expect(result.changedEntries).toBe(2);
		expect(result.edits.map((edit) => edit.from.line)).toEqual([2, 14]);
		const updated = applyEdits(TWO_ENTRIES, result.edits).split('\n');
		expect(updated[2]).toBe('- words: 11');
		expect(updated[14]).toBe('- words: 4');
		expect(updated).toHaveLength(TWO_ENTRIES.split('\n').length);
	});

	it('handles mixed entries: one complete, one missing everything', () => {
		const md = note('## A', '- date:', '- words: 1', '### my writing', 'One.', '## B', '### my writing', 'One two.');
		const result = wordCountEdits(md, NAME, LEVELS, EMPTY_DATE);
		expect(result).toMatchObject({ entries: 2, changedEntries: 1 });
		expect(applyEdits(md, result.edits)).toBe(
			note('## A', '- date:', '- words: 1', '### my writing', 'One.', '## B', '- date:', '- words: 2', '### my writing', 'One two.'),
		);
	});

	it('returns nothing for a note without entries', () => {
		expect(wordCountEdits(note('## Entry', '### prompt', 'Text.'), NAME, LEVELS, EMPTY_DATE)).toEqual({
			entries: 0,
			changedEntries: 0,
			edits: [],
		});
	});
});

describe('the tricky entries note', () => {
	// Same content as the test-vault fixture `4 tricky entries.md`.
	const before = note(
		'### my writing',
		'Before any entry starts.',
		'',
		'## Empty entry',
		'- date:',
		'- words: 7',
		'',
		'### my writing',
		'',
		'### corrected',
		'Fixed text here.',
		'',
		'## Two sections',
		'### my writing',
		'One two three.',
		'### notes',
		'### my writing',
		'Four five.',
		'',
		'## Fenced entry',
		'```text',
		'- words: 1',
		'### my writing',
		'```',
		'### my writing',
		'Real words here.',
		'',
	);

	it('updates every entry and leaves the section before the first H2 alone', () => {
		const result = wordCountEdits(before, NAME, LEVELS, EMPTY_DATE);
		expect(result).toMatchObject({ entries: 3, changedEntries: 3 });
		expect(applyEdits(before, result.edits)).toBe(
			note(
				'### my writing',
				'Before any entry starts.',
				'',
				'## Empty entry',
				'- date:',
				'- words: 0',
				'',
				'### my writing',
				'',
				'### corrected',
				'Fixed text here.',
				'',
				'## Two sections',
				'- date:',
				'- words: 3',
				'### my writing',
				'One two three.',
				'### notes',
				'### my writing',
				'Four five.',
				'',
				'## Fenced entry',
				'- date:',
				'- words: 3',
				'```text',
				'- words: 1',
				'### my writing',
				'```',
				'### my writing',
				'Real words here.',
				'',
			),
		);
	});
});

describe('wordCountEdits with date line options', () => {
	it('fills today into an added date line when both lines are missing', () => {
		const md = note('## Entry', '### my writing', 'One two.');
		expect(applyEdits(md, wordCountEdits(md, NAME, LEVELS, TODAY).edits)).toBe(
			note('## Entry', '- date: 2026-11-22', '- words: 2', '### my writing', 'One two.'),
		);
	});

	it('fills today into an added date line when only the date is missing', () => {
		const md = note('## Entry', '- words: 2', '### my writing', 'One two.');
		const result = wordCountEdits(md, NAME, LEVELS, TODAY);
		expect(result.edits).toEqual([{ from: { line: 1, ch: 0 }, to: { line: 1, ch: 0 }, text: '- date: 2026-11-22\n' }]);
		expect(applyEdits(md, result.edits)).toBe(
			note('## Entry', '- date: 2026-11-22', '- words: 2', '### my writing', 'One two.'),
		);
	});

	it('writes the value as given, in any format', () => {
		const md = note('## Entry', '- words: 2', '### my writing', 'One two.');
		expect(applyEdits(md, wordCountEdits(md, NAME, LEVELS, { add: true, value: '22.11.2026' }).edits)).toBe(
			note('## Entry', '- date: 22.11.2026', '- words: 2', '### my writing', 'One two.'),
		);
	});

	it('adds only the words line below the heading when date lines are off', () => {
		const md = note('## Entry', '### my writing', 'One two.');
		const result = wordCountEdits(md, NAME, LEVELS, NO_DATE);
		expect(result).toEqual({
			entries: 1,
			changedEntries: 1,
			edits: [{ from: { line: 1, ch: 0 }, to: { line: 1, ch: 0 }, text: '- words: 2\n' }],
		});
		expect(applyEdits(md, result.edits)).toBe(note('## Entry', '- words: 2', '### my writing', 'One two.'));
	});

	it('leaves an entry missing only its date alone when date lines are off', () => {
		const md = note('## Entry', '- words: 2', '### my writing', 'One two.');
		const result = wordCountEdits(md, NAME, LEVELS, NO_DATE);
		expect(result).toEqual({ entries: 1, changedEntries: 0, edits: [] });
		expect(updateNoticeText(result)).toBe('Word counts are up to date');
	});

	it('still updates the word count when date lines are off', () => {
		const md = note('## Entry', '- words: 5', '### my writing', 'One two.');
		const result = wordCountEdits(md, NAME, LEVELS, NO_DATE);
		expect(result.changedEntries).toBe(1);
		expect(applyEdits(md, result.edits)).toBe(note('## Entry', '- words: 2', '### my writing', 'One two.'));
	});

	it('still adds the words line after an existing date line when date lines are off', () => {
		const md = note('## Entry', '- date:', '### my writing', 'One two.');
		expect(applyEdits(md, wordCountEdits(md, NAME, LEVELS, NO_DATE).edits)).toBe(
			note('## Entry', '- date:', '- words: 2', '### my writing', 'One two.'),
		);
	});

	it('never edits an existing date line, empty or dated', () => {
		for (const dateLine of ['- date:', '- date: 2026-11-17', '- Date:  yesterday']) {
			const md = note('## Entry', dateLine, '- words: 2', '### my writing', 'One two.');
			expect(wordCountEdits(md, NAME, LEVELS, TODAY)).toEqual({ entries: 1, changedEntries: 0, edits: [] });
		}
	});

	it('keeps document order and original positions with a filled value', () => {
		const md = note('## A', '### my writing', 'One.', '## B', '- words: 9', '### my writing', 'One two.');
		const result = wordCountEdits(md, NAME, LEVELS, TODAY);
		expect(result).toMatchObject({ entries: 2, changedEntries: 2 });
		expect(result.edits.map((edit) => edit.from.line)).toEqual([1, 4, 4]);
		expect(applyEdits(md, result.edits)).toBe(
			note(
				'## A',
				'- date: 2026-11-22',
				'- words: 1',
				'### my writing',
				'One.',
				'## B',
				'- date: 2026-11-22',
				'- words: 2',
				'### my writing',
				'One two.',
			),
		);
	});
});

describe('updateNoticeText', () => {
	const result = (entries: number, changedEntries: number) => ({ entries, changedEntries, edits: [] });

	it('reports a note without entries', () => {
		expect(updateNoticeText(result(0, 0))).toBe('No entries found');
	});

	it('reports entries that are already up to date', () => {
		expect(updateNoticeText(result(3, 0))).toBe('Word counts are up to date');
	});

	it('uses the singular for one changed entry', () => {
		expect(updateNoticeText(result(1, 1))).toBe('Updated 1 entry');
	});

	it('uses the plural for several changed entries', () => {
		expect(updateNoticeText(result(2, 2))).toBe('Updated 2 entries');
	});

	it('counts changed entries, not all entries', () => {
		expect(updateNoticeText(result(5, 3))).toBe('Updated 3 entries');
		expect(updateNoticeText(result(5, 1))).toBe('Updated 1 entry');
	});
});

describe('the v3 fixture notes', () => {
	// Same content as the test-vault fixtures in `entry-word-count v3 checks/`.

	/** Runs the command logic and returns the updated note and its notice. */
	function run(before: string, levels: HeadingLevels, date: DateLineOptions) {
		const result = wordCountEdits(before, NAME, levels, date);
		return { result, after: applyEdits(before, result.edits), notice: updateNoticeText(result) };
	}

	/** The status bar text for the first or last counted section. */
	function statusBar(markdown: string, level: number, position: SectionPosition): string {
		return formatWordCount(countWords(getSectionText(markdown, NAME, level, position) ?? ''));
	}

	describe('15a H1 entries', () => {
		const levels = { entryLevel: 1, sectionLevel: 2 };
		const before = note(
			'Settings: Entry heading level H1, Section heading level H2, other settings default.',
			'',
			'# Morning pages',
			'## prompt',
			'Write about the rain.',
			'## my writing',
			'Rain fell all day.',
			'### aside',
			'It kept falling.',
			'## notes',
			'Not counted here.',
			'',
			'# Vocabulary',
			'## words to learn',
			'umbrella, puddle',
			'',
			'# Evening pages',
			'- date: 2026-11-20',
			'- words: 1',
			'## my writing',
			'Short one.',
			'',
		);

		it('updates both entries and leaves the H1 without a section alone', () => {
			const { result, after, notice } = run(before, levels, TODAY);
			expect(result).toMatchObject({ entries: 2, changedEntries: 2 });
			expect(notice).toBe('Updated 2 entries');
			expect(after).toBe(
				note(
					'Settings: Entry heading level H1, Section heading level H2, other settings default.',
					'',
					'# Morning pages',
					'- date: 2026-11-22',
					'- words: 8',
					'## prompt',
					'Write about the rain.',
					'## my writing',
					'Rain fell all day.',
					'### aside',
					'It kept falling.',
					'## notes',
					'Not counted here.',
					'',
					'# Vocabulary',
					'## words to learn',
					'umbrella, puddle',
					'',
					'# Evening pages',
					'- date: 2026-11-20',
					'- words: 2',
					'## my writing',
					'Short one.',
					'',
				),
			);
		});

		it('shows the first and last section in the status bar', () => {
			expect(statusBar(before, 2, 'first')).toBe('8 words');
			expect(statusBar(before, 2, 'last')).toBe('2 words');
		});
	});

	describe('15b H3 entries with H5 sections', () => {
		const levels = { entryLevel: 3, sectionLevel: 5 };
		const before = note(
			'Settings: Entry heading level H3, Section heading level H5, other settings default.',
			'',
			'## November',
			'### Day one',
			'#### Draft',
			'##### my writing',
			'One two three.',
			'###### detail',
			'Four.',
			'#### Review',
			'##### my writing',
			'Not counted, second section in this entry.',
			'',
			'### Day two',
			'- words: 5',
			'##### my writing',
			'Six seven.',
			'',
		);

		it('counts the first section of each entry across non-adjacent levels', () => {
			const { result, after, notice } = run(before, levels, TODAY);
			expect(result).toMatchObject({ entries: 2, changedEntries: 2 });
			expect(notice).toBe('Updated 2 entries');
			expect(after).toBe(
				note(
					'Settings: Entry heading level H3, Section heading level H5, other settings default.',
					'',
					'## November',
					'### Day one',
					'- date: 2026-11-22',
					'- words: 5',
					'#### Draft',
					'##### my writing',
					'One two three.',
					'###### detail',
					'Four.',
					'#### Review',
					'##### my writing',
					'Not counted, second section in this entry.',
					'',
					'### Day two',
					'- date: 2026-11-22',
					'- words: 2',
					'##### my writing',
					'Six seven.',
					'',
				),
			);
		});

		it('shows the first and last section in the status bar', () => {
			expect(statusBar(before, 5, 'first')).toBe('5 words');
			expect(statusBar(before, 5, 'last')).toBe('2 words');
		});
	});

	describe('15c date settings', () => {
		const settingsLine =
			'Settings: default levels. Run Update word counts once for each row of the table, then press Cmd+Z once before the next row.';
		const before = note(
			settingsLine,
			'',
			'## A',
			'### my writing',
			'One two.',
			'',
			'## B',
			'- words: 9',
			'### my writing',
			'One two three.',
			'',
			'## C',
			'- date: 2026-11-17',
			'- words: 1',
			'### my writing',
			'One two three four.',
			'',
			'## D',
			'- date:',
			'### my writing',
			'One two three four five.',
			'',
		);

		/** The note after one row, given the meta lines added to A and B. */
		function expected(a: string[], b: string[]): string {
			return note(
				settingsLine,
				'',
				'## A',
				...a,
				'### my writing',
				'One two.',
				'',
				'## B',
				...b,
				'### my writing',
				'One two three.',
				'',
				'## C',
				'- date: 2026-11-17',
				'- words: 4',
				'### my writing',
				'One two three four.',
				'',
				'## D',
				'- date:',
				'- words: 5',
				'### my writing',
				'One two three four five.',
				'',
			);
		}

		const rows: [string, DateLineOptions, string][] = [
			['row 1: defaults', { add: true, value: '2026-11-22' }, '- date: 2026-11-22'],
			['row 2: date format DD.MM.YYYY', { add: true, value: '22.11.2026' }, '- date: 22.11.2026'],
			["row 3: fill today's date off", { add: true, value: '' }, '- date:'],
		];

		it.each(rows)('%s', (_name, date, dateLine) => {
			const { result, after, notice } = run(before, LEVELS, date);
			expect(result).toMatchObject({ entries: 4, changedEntries: 4 });
			expect(notice).toBe('Updated 4 entries');
			expect(after).toBe(expected([dateLine, '- words: 2'], [dateLine, '- words: 3']));
		});

		it('row 4: add date line off', () => {
			const { result, after, notice } = run(before, LEVELS, { add: false, value: '2026-11-22' });
			expect(result).toMatchObject({ entries: 4, changedEntries: 4 });
			expect(notice).toBe('Updated 4 entries');
			expect(after).toBe(expected(['- words: 2'], ['- words: 3']));
		});

		it('is up to date on a second run', () => {
			const { after } = run(before, LEVELS, TODAY);
			expect(run(after, LEVELS, TODAY).notice).toBe('Word counts are up to date');
		});
	});
});
