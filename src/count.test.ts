import { describe, expect, it } from 'vitest';
import { countWords, formatWordCount } from './count';
import { getSectionText } from './section';

describe('practice entry (feature 5 comparison fixture, v2 layout)', () => {
	it('counts only the my writing section, 29 words', () => {
		const note = [
			'## Mia and the umbrella',
			'- date: 2026-11-10',
			'- words: 29',
			'',
			'### prompt',
			'Two friends argue about an umbrella.',
			'',
			'### my writing',
			'"You took my umbrella," Mia said.',
			'"I didn\'t! I borrowed it -- there\'s a difference."',
			'She rolled her eyes. “Mm-hm. Sure.”',
			'',
			'It was a well-known trick — and it never worked.',
			'',
			'### corrected',
			'(left empty)',
			'',
			'### notes',
			'',
		].join('\n');
		const section = getSectionText(note, 'my writing', 3);
		expect(section).not.toBeNull();
		// Obsidian counts 30 for the same selection: it also counts the lone `--`.
		expect(countWords(section ?? '')).toBe(29);
	});
});

describe('formatWordCount', () => {
	it('uses the singular only for one word', () => {
		expect(formatWordCount(1)).toBe('1 word');
	});

	it('uses the plural for zero and many words, without separators', () => {
		expect(formatWordCount(0)).toBe('0 words');
		expect(formatWordCount(2)).toBe('2 words');
		expect(formatWordCount(1024)).toBe('1024 words');
	});
});

describe('countWords', () => {
	it('returns 0 for empty and whitespace-only text', () => {
		expect(countWords('')).toBe(0);
		expect(countWords('   \n\n\t  \n')).toBe(0);
	});

	it('ignores extra blank lines between paragraphs', () => {
		expect(countWords('She ran.\n\n\n\nHe followed.')).toBe(countWords('She ran.\nHe followed.'));
		expect(countWords('She ran.\n\n\n\nHe followed.')).toBe(4);
	});

	it('counts dialogue with straight and curly double quotes', () => {
		expect(countWords('"Wait," she said. "Stay here."')).toBe(5);
		expect(countWords('“Wait,” she said. “Stay here.”')).toBe(5);
	});

	it('counts contractions as one word', () => {
		expect(countWords("didn't")).toBe(1);
		expect(countWords('didn’t')).toBe(1);
		expect(countWords("I can't, and you won’t")).toBe(5);
	});

	it('counts hyphenated words as one word', () => {
		expect(countWords('Mm-hm')).toBe(1);
		expect(countWords('a well-known face')).toBe(3);
	});

	it('splits words at em dashes with or without spaces', () => {
		expect(countWords('ran—then')).toBe(2);
		expect(countWords('ran — then')).toBe(2);
		expect(countWords('ran–then')).toBe(2);
	});

	it('does not count punctuation-only runs', () => {
		expect(countWords('--')).toBe(0);
		expect(countWords('—')).toBe(0);
		expect(countWords("'")).toBe(0);
		expect(countWords('’')).toBe(0);
		expect(countWords('...')).toBe(0);
		expect(countWords('…')).toBe(0);
	});

	it('does not count Markdown markers', () => {
		expect(countWords('- one\n* two\n+ three\n1. four')).toBe(4);
		expect(countWords('  12) twelve\n3.5 cups')).toBe(3);
		expect(countWords('> quoted line')).toBe(2);
		expect(countWords('*one* **two** _three_ __four__')).toBe(4);
	});

	it('counts numbers with separators as one word', () => {
		expect(countWords('1,024')).toBe(1);
		expect(countWords('3.5')).toBe(1);
		expect(countWords('It ended.')).toBe(2);
	});

	describe('calibration samples (agreed counts, see feature 3 spec)', () => {
		const samples: [string, number][] = [
			['"I didn\'t," she said. "Mm-hm."', 5],
			['“I didn’t,” she said. ‘Fine.’', 5],
			['She ran—then stopped — and waited.', 6],
			['- one item', 2],
			['> quoted *bold* and _italic_ text', 5],
			['It cost 1,024 dollars or 3.5 each.', 7],
			["rock 'n' roll -- and ... done", 5],
			['well-known x-ray e-mail', 3],
		];

		it.each(samples)('%s -> %i', (text, expected) => {
			expect(countWords(text)).toBe(expected);
		});
	});
});
