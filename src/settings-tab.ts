import { App, PluginSettingTab, type SettingDefinitionItem } from 'obsidian';
import type EntryWordCountPlugin from './main';
import { applySettingChange, DEFAULT_SETTINGS } from './settings';

/** Dropdown options `{ '2': 'H2', ... }` for heading levels from..to. */
function levelOptions(from: number, to: number): Record<string, string> {
	const options: Record<string, string> = {};
	for (let level = from; level <= to; level++) options[String(level)] = `H${level}`;
	return options;
}

export class EntryWordCountSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: EntryWordCountPlugin,
	) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const { settings } = this.plugin;
		return [
			{
				name: 'Entry heading level',
				desc: 'The heading level that starts each entry.',
				control: { type: 'dropdown', key: 'entryLevel', options: levelOptions(1, 5) },
			},
			{
				name: 'Section heading level',
				desc: 'The level of the counted section heading, below the entry heading level.',
				control: { type: 'dropdown', key: 'sectionLevel', options: levelOptions(settings.entryLevel + 1, 6) },
			},
			{
				name: 'Section heading',
				desc: `The heading whose text is counted, at the section heading level. Leave empty to use "${DEFAULT_SETTINGS.sectionHeading}".`,
				control: { type: 'text', key: 'sectionHeading', placeholder: DEFAULT_SETTINGS.sectionHeading },
			},
			{
				name: 'Status bar section',
				desc: 'Which matching section the status bar counts when a note has several.',
				control: {
					type: 'dropdown',
					key: 'statusBarSection',
					options: { first: 'First in the note', last: 'Last in the note' },
				},
			},
			{
				name: 'Add date line',
				desc: "Add a date line to entries that don't have one when you update word counts.",
				control: { type: 'toggle', key: 'addDateLine' },
			},
			{
				name: "Fill today's date",
				desc: "Write today's date in a date line the command adds. Existing dates never change.",
				control: { type: 'toggle', key: 'fillDate' },
			},
			{
				name: 'Date format',
				desc: `Uses the same syntax as Daily notes. Leave empty to use "${DEFAULT_SETTINGS.dateFormat}".`,
				control: { type: 'text', key: 'dateFormat', placeholder: DEFAULT_SETTINGS.dateFormat },
			},
		];
	}

	getControlValue(key: string): unknown {
		const { settings } = this.plugin;
		// Dropdown values are strings; levels are stored as numbers.
		if (key === 'entryLevel' || key === 'sectionLevel') return String(settings[key]);
		return (settings as unknown as Record<string, unknown>)[key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		Object.assign(this.plugin.settings, applySettingChange(this.plugin.settings, key, value));
		await this.plugin.saveSettings();
		// The section level choices depend on the entry level.
		if (key === 'entryLevel') this.update();
	}
}
