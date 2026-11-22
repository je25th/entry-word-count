import { describe, expect, it } from 'vitest';
import { getSectionText, scanMarkdown } from './section';

describe('scanMarkdown', () => {
	it('finds heading levels and trimmed text with their line numbers', () => {
		const { headings } = scanMarkdown(['# Title', 'text', '## Entry  ', '### my writing', '###### six'].join('\n'));
		expect(headings).toEqual([
			{ line: 0, level: 1, text: 'Title' },
			{ line: 2, level: 2, text: 'Entry' },
			{ line: 3, level: 3, text: 'my writing' },
			{ line: 4, level: 6, text: 'six' },
		]);
	});

	it('skips headings inside code fences and marks fenced lines', () => {
		const { headings, inFence } = scanMarkdown(['## A', '```', '## not', '```', 'after'].join('\n'));
		expect(headings).toEqual([{ line: 0, level: 2, text: 'A' }]);
		expect(inFence).toEqual([false, true, true, true, false]);
	});

	it('treats CRLF like LF', () => {
		const { lines, headings } = scanMarkdown('## A\r\ntext\r\n');
		expect(lines).toEqual(['## A', 'text', '']);
		expect(headings).toEqual([{ line: 0, level: 2, text: 'A' }]);
	});
});

const NAME = 'my writing';

function note(...lines: string[]): string {
	return lines.join('\n');
}

describe('getSectionText', () => {
	it('returns the section up to the next H3', () => {
		const md = note('### prompt', 'Write a scene.', '### my writing', 'She ran.', 'He followed.', '### corrected', 'She ran away.');
		expect(getSectionText(md, NAME, 3)).toBe('She ran.\nHe followed.');
	});

	it('keeps deeper subheadings and their text inside the section', () => {
		const md = note('### my writing', 'She ran.', '#### draft 2', 'Kept.', '###### deep', 'Also kept.', '### corrected', 'Ignored.');
		expect(getSectionText(md, NAME, 3)).toBe('She ran.\n#### draft 2\nKept.\n###### deep\nAlso kept.');
	});

	it('ends the section at a heading at the same level', () => {
		const md = note('### my writing', 'She ran.', '### notes', 'Ignored.');
		expect(getSectionText(md, NAME, 3)).toBe('She ran.');
	});

	it('ends the section at a shallower heading', () => {
		const md = note('### my writing', 'She ran.', '## Next entry', 'Ignored.');
		expect(getSectionText(md, NAME, 3)).toBe('She ran.');
	});

	it('runs to the end of the note when no heading follows', () => {
		const md = note('### prompt', 'Write.', '### my writing', 'She ran.', '', 'The end.');
		expect(getSectionText(md, NAME, 3)).toBe('She ran.\n\nThe end.');
	});

	it('returns null when the note has no such section', () => {
		const md = note('### prompt', 'Write.', '### corrected', 'Fixed.');
		expect(getSectionText(md, NAME, 3)).toBeNull();
	});

	it('returns an empty string for an empty section', () => {
		const md = note('### my writing', '### corrected', 'Fixed.');
		expect(getSectionText(md, NAME, 3)).toBe('');
	});

	it('returns an empty string for a heading on the last line', () => {
		expect(getSectionText('### my writing', NAME, 3)).toBe('');
	});

	it('matches with trailing spaces, extra inner spacing, and different case', () => {
		expect(getSectionText(note('### My Writing  ', 'She ran.'), NAME, 3)).toBe('She ran.');
		expect(getSectionText(note('###   my writing', 'She ran.'), NAME, 3)).toBe('She ran.');
	});

	it('does not match other heading levels or a missing space', () => {
		expect(getSectionText(note('## my writing', 'She ran.'), NAME, 3)).toBeNull();
		expect(getSectionText(note('#### my writing', 'She ran.'), NAME, 3)).toBeNull();
		expect(getSectionText(note('###my writing', 'She ran.'), NAME, 3)).toBeNull();
	});

	it('returns null for a note that is only frontmatter', () => {
		const md = note('---', 'words: 214', 'tags: [practice]', '---');
		expect(getSectionText(md, NAME, 3)).toBeNull();
	});

	it('treats CRLF line endings like LF', () => {
		const lf = note('### my writing', 'She ran.', 'He followed.', '### corrected', 'Fixed.');
		expect(getSectionText(lf.replace(/\n/g, '\r\n'), NAME, 3)).toBe(getSectionText(lf, NAME, 3));
	});

	it('uses only the first section when the heading appears twice', () => {
		const md = note('### my writing', 'First.', '### my writing', 'Second.');
		expect(getSectionText(md, NAME, 3)).toBe('First.');
	});

	it('does not end the section at a heading-like line inside a code fence', () => {
		const md = note('### my writing', 'She ran.', '```', '# not a heading', '```', 'He followed.', '### corrected');
		expect(getSectionText(md, NAME, 3)).toBe('She ran.\n```\n# not a heading\n```\nHe followed.');
	});

	it('closes a fence only with the same character', () => {
		const md = note('### my writing', '~~~', '```', '# still code', '~~~', 'After.', '### corrected');
		expect(getSectionText(md, NAME, 3)).toBe('~~~\n```\n# still code\n~~~\nAfter.');
	});

	it('does not find the start heading inside a code fence', () => {
		const md = note('```', '### my writing', '```', 'Text.');
		expect(getSectionText(md, NAME, 3)).toBeNull();
	});

	it('runs an unclosed fence to the end of the note', () => {
		const md = note('### my writing', 'She ran.', '```', '### corrected', 'Still code.');
		expect(getSectionText(md, NAME, 3)).toBe('She ran.\n```\n### corrected\nStill code.');
	});

	describe('first or last section', () => {
		const two = note('### my writing', 'First.', '### corrected', '### my writing', 'Second.', '### corrected');

		it('returns the first section for first and the last for last', () => {
			expect(getSectionText(two, NAME, 3, 'first')).toBe('First.');
			expect(getSectionText(two, NAME, 3, 'last')).toBe('Second.');
		});

		it('defaults to the first section', () => {
			expect(getSectionText(two, NAME, 3)).toBe('First.');
		});

		it('returns the same text for both when there is one section', () => {
			const md = note('### my writing', 'Only.', '### corrected');
			expect(getSectionText(md, NAME, 3, 'first')).toBe('Only.');
			expect(getSectionText(md, NAME, 3, 'last')).toBe('Only.');
		});

		it('returns null for both when there is no section', () => {
			const md = note('### prompt', 'Write.');
			expect(getSectionText(md, NAME, 3, 'first')).toBeNull();
			expect(getSectionText(md, NAME, 3, 'last')).toBeNull();
		});

		it('returns the last section when it runs to the end of the note', () => {
			const md = note('### my writing', 'First.', '### corrected', '### my writing', 'Second.', '', 'End.');
			expect(getSectionText(md, NAME, 3, 'last')).toBe('Second.\n\nEnd.');
		});

		it('ignores a matching heading inside a code fence for last', () => {
			const md = note('### my writing', 'Real.', '```', '### my writing', 'In code.', '```', '### corrected');
			expect(getSectionText(md, NAME, 3, 'last')).toBe('Real.\n```\n### my writing\nIn code.\n```');
		});
	});

	describe('other section levels', () => {
		it('finds an H2 section and ends it at the next H2 or H1', () => {
			const md = note('# Entry', '## my writing', 'One.', '### part', 'Two.', '## corrected', 'No.');
			expect(getSectionText(md, NAME, 2)).toBe('One.\n### part\nTwo.');
			expect(getSectionText(note('## my writing', 'One.', '# Next', 'No.'), NAME, 2)).toBe('One.');
		});

		it('finds an H5 section and ends it at a shallower heading', () => {
			const md = note('#### prompt', '##### my writing', 'One two.', '###### aside', 'Three.', '#### corrected');
			expect(getSectionText(md, NAME, 5)).toBe('One two.\n###### aside\nThree.');
		});

		it('ignores the matching text at other levels', () => {
			const md = note('### my writing', 'H3 text.', '#### my writing', 'H4 text.');
			expect(getSectionText(md, NAME, 4)).toBe('H4 text.');
			expect(getSectionText(note('### my writing', 'H3 text.'), NAME, 4)).toBeNull();
			expect(getSectionText(note('### my writing', 'H3 text.'), NAME, 2)).toBeNull();
		});
	});

	it('reads a v2 note with two entries without the date and words lines', () => {
		const md = note(
			'## Mia and the umbrella',
			'- date: 2026-11-17',
			'- words: 12',
			'',
			'### prompt',
			'Two friends argue about an umbrella.',
			'### my writing',
			'"You took my umbrella," Mia said.',
			'### corrected',
			'### notes',
			'',
			'## A rainy morning',
			'- date: 2026-11-16',
			'- words: 4',
			'',
			'### prompt',
			'A rainy morning.',
			'### my writing',
			'The rain kept falling.',
			'### corrected',
			'### notes',
		);
		expect(getSectionText(md, NAME, 3, 'first')).toBe('"You took my umbrella," Mia said.');
		expect(getSectionText(md, NAME, 3, 'last')).toBe('The rain kept falling.');
	});
});
