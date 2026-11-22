import { debounce, type Editor, MarkdownView, moment, Notice, Plugin, setIcon } from 'obsidian';
import { countWords, formatWordCount } from './count';
import { updateNoticeText, wordCountEdits } from './entries';
import { getSectionText } from './section';
import { effectiveDateFormat, effectiveHeading, normalizeSettings, type EntryWordCountSettings } from './settings';
import { EntryWordCountSettingTab } from './settings-tab';

const TYPING_DELAY_MS = 300;

export default class EntryWordCountPlugin extends Plugin {
	settings!: EntryWordCountSettings;
	private statusItem!: HTMLElement;
	private countEl!: HTMLElement;
	private readonly updateAfterTyping = debounce(() => this.updateStatus(), TYPING_DELAY_MS, true);

	async onload() {
		this.settings = normalizeSettings(await this.loadData());

		this.statusItem = this.addStatusBarItem();
		this.statusItem.addClass('entry-word-count-status');
		// Tooltip: the section heading exactly as typed.
		this.statusItem.setAttribute('aria-label', effectiveHeading(this.settings));
		this.statusItem.setAttribute('data-tooltip-position', 'top');
		setIcon(this.statusItem.createSpan({ cls: 'entry-word-count-status-icon' }), 'pencil');
		this.countEl = this.statusItem.createSpan();
		this.statusItem.toggle(false);

		this.addSettingTab(new EntryWordCountSettingTab(this.app, this));
		this.addCommand({
			id: 'update-word-counts',
			name: 'Update word counts',
			editorCallback: (editor) => this.updateWordCounts(editor),
		});

		this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.updateStatus()));
		this.registerEvent(this.app.workspace.on('file-open', () => this.updateStatus()));
		this.registerEvent(this.app.workspace.on('editor-change', () => this.updateAfterTyping()));
		this.app.workspace.onLayoutReady(() => this.updateStatus());
	}

	onunload() {
		this.updateAfterTyping.cancel();
	}

	/** Saves the settings and refreshes the status bar right away. */
	async saveSettings() {
		await this.saveData(this.settings);
		this.statusItem.setAttribute('aria-label', effectiveHeading(this.settings));
		this.updateStatus();
	}

	/** Fills every entry's `- words:` line in the open note, as one undoable edit. */
	updateWordCounts(editor: Editor) {
		const { addDateLine, fillDate } = this.settings;
		// Today's date, read once per run; it only fills date lines the command adds.
		const date = { add: addDateLine, value: fillDate ? moment().format(effectiveDateFormat(this.settings)) : '' };
		const result = wordCountEdits(editor.getValue(), effectiveHeading(this.settings), this.settings, date);
		// Reverse document order, so earlier insertions never shift later positions.
		if (result.edits.length > 0) editor.transaction({ changes: [...result.edits].reverse() });
		new Notice(updateNoticeText(result));
	}

	updateStatus() {
		// The most recent main-area leaf, so focusing a sidebar keeps the note's count.
		const view = this.app.workspace.getMostRecentLeaf()?.view;
		const section =
			view instanceof MarkdownView
				? getSectionText(
						view.editor.getValue(),
						effectiveHeading(this.settings),
						this.settings.sectionLevel,
						this.settings.statusBarSection,
					)
				: null;
		if (section === null) {
			this.statusItem.toggle(false);
			return;
		}
		this.countEl.setText(formatWordCount(countWords(section)));
		this.statusItem.toggle(true);
	}
}
