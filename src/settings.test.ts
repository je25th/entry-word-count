import { describe, expect, it } from 'vitest';
import {
	applySettingChange,
	DEFAULT_SETTINGS,
	effectiveDateFormat,
	effectiveHeading,
	fitSectionLevel,
	normalizeSettings,
} from './settings';

describe('normalizeSettings', () => {
	it('returns the defaults for missing or non-object data', () => {
		for (const raw of [undefined, null, 'text', 42, {}]) {
			expect(normalizeSettings(raw)).toEqual(DEFAULT_SETTINGS);
		}
	});

	it('keeps valid values', () => {
		expect(
			normalizeSettings({ sectionHeading: 'draft', statusBarSection: 'last', entryLevel: 1, sectionLevel: 4 }),
		).toEqual({
			sectionHeading: 'draft',
			statusBarSection: 'last',
			entryLevel: 1,
			sectionLevel: 4,
			addDateLine: true,
			fillDate: true,
			dateFormat: 'YYYY-MM-DD',
		});
		expect(normalizeSettings({ addDateLine: false, fillDate: false, dateFormat: 'DD.MM.YYYY' })).toMatchObject({
			addDateLine: false,
			fillDate: false,
			dateFormat: 'DD.MM.YYYY',
		});
	});

	it('loads v2 data with the default levels and date settings', () => {
		expect(normalizeSettings({ sectionHeading: 'draft', statusBarSection: 'last' })).toEqual({
			sectionHeading: 'draft',
			statusBarSection: 'last',
			entryLevel: 2,
			sectionLevel: 3,
			addDateLine: true,
			fillDate: true,
			dateFormat: 'YYYY-MM-DD',
		});
	});

	it('loads data with levels but no date fields with the default date settings', () => {
		expect(normalizeSettings({ sectionHeading: 'draft', entryLevel: 1, sectionLevel: 2 })).toMatchObject({
			entryLevel: 1,
			sectionLevel: 2,
			addDateLine: true,
			fillDate: true,
			dateFormat: 'YYYY-MM-DD',
		});
	});

	it('uses the default for a date toggle of the wrong type', () => {
		for (const value of ['false', 0, 1, null, 'yes']) {
			expect(normalizeSettings({ addDateLine: value, fillDate: value })).toMatchObject({
				addDateLine: true,
				fillDate: true,
			});
		}
		expect(normalizeSettings({ addDateLine: false, fillDate: 'no' })).toMatchObject({
			addDateLine: false,
			fillDate: true,
		});
	});

	it('uses the default date format for a non-string or a format with a line break', () => {
		for (const dateFormat of [42, null, true, ['YYYY'], 'YYYY\nMM', 'YYYY\r\nMM', '\n']) {
			expect(normalizeSettings({ dateFormat }).dateFormat).toBe('YYYY-MM-DD');
		}
	});

	it('keeps a blank or spaced date format as typed', () => {
		expect(normalizeSettings({ dateFormat: '' }).dateFormat).toBe('');
		expect(normalizeSettings({ dateFormat: '  ' }).dateFormat).toBe('  ');
		expect(normalizeSettings({ dateFormat: ' D MMM YYYY ' }).dateFormat).toBe(' D MMM YYYY ');
	});

	it('falls back per field and keeps the other fields', () => {
		expect(normalizeSettings({ sectionHeading: 'draft', statusBarSection: 'middle' })).toMatchObject({
			sectionHeading: 'draft',
			statusBarSection: 'first',
		});
		expect(normalizeSettings({ sectionHeading: 'draft', statusBarSection: 1 })).toMatchObject({
			sectionHeading: 'draft',
			statusBarSection: 'first',
		});
		expect(normalizeSettings({ sectionHeading: 42, statusBarSection: 'last' })).toMatchObject({
			sectionHeading: 'my writing',
			statusBarSection: 'last',
		});
		expect(normalizeSettings({ entryLevel: 9, sectionLevel: 5 })).toMatchObject({ entryLevel: 2, sectionLevel: 5 });
	});

	it('uses the default entry level for a non-integer, out-of-range, or wrong-type value', () => {
		for (const entryLevel of [0, 6, 2.5, -1, '1', null, true, Number.NaN]) {
			expect(normalizeSettings({ entryLevel }).entryLevel).toBe(2);
		}
	});

	it('uses the default section level for a non-integer, out-of-range, or wrong-type value', () => {
		for (const sectionLevel of [1, 7, 3.5, '4', null, false]) {
			expect(normalizeSettings({ sectionLevel }).sectionLevel).toBe(3);
		}
	});

	it('moves a section level that does not fit to one below the entry level', () => {
		expect(normalizeSettings({ entryLevel: 3, sectionLevel: 2 })).toMatchObject({ entryLevel: 3, sectionLevel: 4 });
		expect(normalizeSettings({ entryLevel: 3, sectionLevel: 3 })).toMatchObject({ entryLevel: 3, sectionLevel: 4 });
		expect(normalizeSettings({ entryLevel: 5, sectionLevel: 'x' })).toMatchObject({ entryLevel: 5, sectionLevel: 6 });
		expect(normalizeSettings({ entryLevel: 4 })).toMatchObject({ entryLevel: 4, sectionLevel: 5 });
	});

	it('keeps an empty heading as typed', () => {
		expect(normalizeSettings({ sectionHeading: '' }).sectionHeading).toBe('');
	});

	it('drops unknown fields', () => {
		expect(normalizeSettings({ sectionHeading: 'draft', extra: true })).toEqual({
			...DEFAULT_SETTINGS,
			sectionHeading: 'draft',
		});
	});

	it('returns a new object, not the defaults object', () => {
		expect(normalizeSettings(undefined)).not.toBe(DEFAULT_SETTINGS);
	});
});

describe('fitSectionLevel', () => {
	it('keeps a section level below the entry level', () => {
		expect(fitSectionLevel(2, 3)).toBe(3);
		expect(fitSectionLevel(1, 6)).toBe(6);
	});

	it('moves an equal or higher section level to one below the entry level', () => {
		expect(fitSectionLevel(3, 3)).toBe(4);
		expect(fitSectionLevel(3, 2)).toBe(4);
		expect(fitSectionLevel(5, 1)).toBe(6);
	});
});

describe('effectiveHeading', () => {
	const withHeading = (sectionHeading: string) => ({ ...DEFAULT_SETTINGS, sectionHeading });

	it('uses the stored heading', () => {
		expect(effectiveHeading(withHeading('draft'))).toBe('draft');
		expect(effectiveHeading(withHeading('  draft  '))).toBe('  draft  ');
	});

	it('uses the default for a blank heading', () => {
		expect(effectiveHeading(withHeading(''))).toBe('my writing');
		expect(effectiveHeading(withHeading('   '))).toBe('my writing');
	});
});

describe('effectiveDateFormat', () => {
	const withFormat = (dateFormat: string) => ({ ...DEFAULT_SETTINGS, dateFormat });

	it('uses the stored format untrimmed', () => {
		expect(effectiveDateFormat(withFormat('DD.MM.YYYY'))).toBe('DD.MM.YYYY');
		expect(effectiveDateFormat(withFormat(' D MMM YYYY '))).toBe(' D MMM YYYY ');
	});

	it('uses the default for a blank format', () => {
		expect(effectiveDateFormat(withFormat(''))).toBe('YYYY-MM-DD');
		expect(effectiveDateFormat(withFormat('   '))).toBe('YYYY-MM-DD');
	});
});

describe('applySettingChange', () => {
	const base = { ...DEFAULT_SETTINGS };

	it('sets the entry level from a dropdown string and keeps a section level that fits', () => {
		expect(applySettingChange({ ...base, sectionLevel: 4 }, 'entryLevel', '1')).toMatchObject({
			entryLevel: 1,
			sectionLevel: 4,
		});
		expect(applySettingChange(base, 'entryLevel', 1)).toMatchObject({ entryLevel: 1, sectionLevel: 3 });
	});

	it('moves the section level when the new entry level no longer fits', () => {
		expect(applySettingChange(base, 'entryLevel', '3')).toMatchObject({ entryLevel: 3, sectionLevel: 4 });
		expect(applySettingChange(base, 'entryLevel', '5')).toMatchObject({ entryLevel: 5, sectionLevel: 6 });
	});

	it('ignores an invalid entry level', () => {
		for (const value of ['0', '6', '2.5', 'x', '', null, true, undefined]) {
			expect(applySettingChange(base, 'entryLevel', value)).toEqual(base);
		}
	});

	it('sets a section level below the entry level', () => {
		expect(applySettingChange(base, 'sectionLevel', '6').sectionLevel).toBe(6);
		expect(applySettingChange({ ...base, entryLevel: 1 }, 'sectionLevel', '2').sectionLevel).toBe(2);
	});

	it('ignores a section level at or above the entry level, or invalid', () => {
		for (const value of ['2', '1', '7', '3.5', 'x', '', null]) {
			expect(applySettingChange(base, 'sectionLevel', value)).toEqual(base);
		}
	});

	it('keeps the section heading and date format as typed', () => {
		expect(applySettingChange(base, 'sectionHeading', '  Draft ').sectionHeading).toBe('  Draft ');
		expect(applySettingChange(base, 'sectionHeading', '').sectionHeading).toBe('');
		expect(applySettingChange(base, 'dateFormat', ' D MMM YYYY ').dateFormat).toBe(' D MMM YYYY ');
		expect(applySettingChange(base, 'dateFormat', '').dateFormat).toBe('');
	});

	it('ignores a non-string heading or format, and a format with a line break', () => {
		for (const [key, value] of [
			['sectionHeading', 42],
			['sectionHeading', null],
			['dateFormat', 7],
			['dateFormat', 'YYYY\nMM'],
			['dateFormat', 'YYYY\rMM'],
		] as const) {
			expect(applySettingChange(base, key, value)).toEqual(base);
		}
	});

	it('sets the status bar section only to first or last', () => {
		expect(applySettingChange(base, 'statusBarSection', 'last').statusBarSection).toBe('last');
		for (const value of ['middle', 'Last', 1, null]) {
			expect(applySettingChange(base, 'statusBarSection', value)).toEqual(base);
		}
	});

	it('sets the date toggles only to booleans', () => {
		expect(applySettingChange(base, 'addDateLine', false).addDateLine).toBe(false);
		expect(applySettingChange(base, 'fillDate', false).fillDate).toBe(false);
		for (const value of ['false', 0, 1, null]) {
			expect(applySettingChange(base, 'addDateLine', value)).toEqual(base);
			expect(applySettingChange(base, 'fillDate', value)).toEqual(base);
		}
	});

	it('ignores an unknown key', () => {
		expect(applySettingChange(base, 'extra', 'x')).toEqual(base);
		expect(applySettingChange(base, 'toString', 'x')).toEqual(base);
	});

	it('returns a new object and never mutates the input', () => {
		const settings = { ...base };
		const snapshot = { ...settings };
		const next = applySettingChange(settings, 'entryLevel', '4');
		expect(next).not.toBe(settings);
		expect(settings).toEqual(snapshot);
		expect(applySettingChange(settings, 'extra', 1)).not.toBe(settings);
	});
});
