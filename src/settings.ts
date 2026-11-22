import type { SectionPosition } from './section';

export interface EntryWordCountSettings {
	/** Section heading text as typed in settings; may be blank. */
	sectionHeading: string;
	/** Which matching section the status bar counts. */
	statusBarSection: SectionPosition;
	/** Entry heading level, 1-5. */
	entryLevel: number;
	/** Section heading level, entryLevel + 1 to 6. */
	sectionLevel: number;
	/** Add a `- date:` line to entries without one. */
	addDateLine: boolean;
	/** Write today's date into an added date line. */
	fillDate: boolean;
	/** Date format as typed (moment syntax); may be blank. */
	dateFormat: string;
}

export const DEFAULT_SETTINGS: EntryWordCountSettings = {
	sectionHeading: 'my writing',
	statusBarSection: 'first',
	entryLevel: 2,
	sectionLevel: 3,
	addDateLine: true,
	fillDate: true,
	dateFormat: 'YYYY-MM-DD',
};

/** Keeps the section level below the entry level: a level that no longer fits becomes entry level + 1. */
export function fitSectionLevel(entryLevel: number, sectionLevel: number): number {
	return sectionLevel > entryLevel ? sectionLevel : entryLevel + 1;
}

/** Turns loaded data of any shape into valid settings; each bad or missing field uses its default. */
export function normalizeSettings(raw: unknown): EntryWordCountSettings {
	const data = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	const { sectionHeading, statusBarSection, addDateLine, fillDate, dateFormat } = data;
	const entryLevel = levelOr(data.entryLevel, 1, 5, DEFAULT_SETTINGS.entryLevel);
	const sectionLevel = levelOr(data.sectionLevel, 2, 6, DEFAULT_SETTINGS.sectionLevel);
	return {
		sectionHeading: typeof sectionHeading === 'string' ? sectionHeading : DEFAULT_SETTINGS.sectionHeading,
		statusBarSection:
			statusBarSection === 'first' || statusBarSection === 'last'
				? statusBarSection
				: DEFAULT_SETTINGS.statusBarSection,
		entryLevel,
		sectionLevel: fitSectionLevel(entryLevel, sectionLevel),
		addDateLine: typeof addDateLine === 'boolean' ? addDateLine : DEFAULT_SETTINGS.addDateLine,
		fillDate: typeof fillDate === 'boolean' ? fillDate : DEFAULT_SETTINGS.fillDate,
		// A line break would split the added date line.
		dateFormat:
			typeof dateFormat === 'string' && !/[\r\n]/.test(dateFormat) ? dateFormat : DEFAULT_SETTINGS.dateFormat,
	};
}

/** The heading text to search for: the stored text, or the default when it is blank. */
export function effectiveHeading(settings: EntryWordCountSettings): string {
	return settings.sectionHeading.trim() === '' ? DEFAULT_SETTINGS.sectionHeading : settings.sectionHeading;
}

/** The date format to use: the stored format, or the default when it is blank. */
export function effectiveDateFormat(settings: EntryWordCountSettings): string {
	return settings.dateFormat.trim() === '' ? DEFAULT_SETTINGS.dateFormat : settings.dateFormat;
}

/**
 * Applies one settings-tab change. Returns a new object; an unknown key or an invalid value
 * leaves the settings unchanged (never reset to a default). Dropdown levels arrive as strings.
 */
export function applySettingChange(
	settings: EntryWordCountSettings,
	key: string,
	value: unknown,
): EntryWordCountSettings {
	const next = { ...settings };
	switch (key) {
		case 'entryLevel': {
			const level = toLevel(value);
			if (isLevel(level, 1, 5)) {
				next.entryLevel = level;
				next.sectionLevel = fitSectionLevel(level, settings.sectionLevel);
			}
			break;
		}
		case 'sectionLevel': {
			const level = toLevel(value);
			if (isLevel(level, settings.entryLevel + 1, 6)) next.sectionLevel = level;
			break;
		}
		case 'sectionHeading':
			if (typeof value === 'string') next.sectionHeading = value;
			break;
		case 'statusBarSection':
			if (value === 'first' || value === 'last') next.statusBarSection = value;
			break;
		case 'addDateLine':
		case 'fillDate':
			if (typeof value === 'boolean') next[key] = value;
			break;
		case 'dateFormat':
			if (typeof value === 'string' && !/[\r\n]/.test(value)) next.dateFormat = value;
			break;
	}
	return next;
}

/** A level from a dropdown string or a number; anything else is NaN. */
function toLevel(value: unknown): number {
	if (typeof value === 'number') return value;
	return typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
}

function isLevel(value: number, min: number, max: number): boolean {
	return Number.isInteger(value) && value >= min && value <= max;
}

function levelOr(value: unknown, min: number, max: number, fallback: number): number {
	return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}
