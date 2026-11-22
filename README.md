# Entry Word Count

Records each entry's date and word count in the note. Keep many writing or
practice entries in one note: one command writes the date and word count under
each entry's title, and the status bar shows how many words you wrote in the
writing section.

## Requirements

- Obsidian 1.13.0 or later.
- Works on desktop and mobile. The status bar exists on desktop only, so the
  live count shows only there.

## Note layout

With the default settings, each entry starts with an H2 title of your choice,
then the date and word count lines, then its sections:

```markdown
## Mia and the umbrella
- date: 2026-11-17
- words: 11

### prompt
### my writing
### corrected
### notes
```

Entries repeat down the note. An entry is a heading at the entry level with a
counted section (by default `### my writing`) under it, before the next heading
at the entry level or higher. Other headings (for example an H2 vocabulary list)
are left alone.

Both levels can be changed in settings, for example H1 entries with H2
sections.

## Status bar

- Shows a pencil icon and `N words` for the active note. Hover to see the
  section heading it counts.
- Counts the text under the first matching section heading in the note, or the
  last one if you choose that in settings.
- A section ends at the next heading at its level or higher. Deeper subheadings
  stay inside the section, and their text is counted.
- Hidden when the note has no matching section.

## Update word counts

Run **Update word counts** from the command palette while a note is open.

- Sets each entry's `- words:` line to the word count of its first counted
  section.
- Adds a missing `- date:` or `- words:` line directly below the entry heading,
  `- date:` first. By default a new date line gets today's date in `YYYY-MM-DD`
  format.
- The date settings apply only to date lines the command adds. Existing dates,
  including empty ones, never change.
- One undo reverts the whole update.
- A notice reports the result: "Updated N entries", "Word counts are up to
  date", or "No entries found".

The `- words:` lines change only when you run the command, so after more editing
they can differ from the live status bar count until you run it again.

## Settings

In **Settings → Entry Word Count**. Each setting also shows up in Obsidian's
settings search.

- **Entry heading level**: the heading level that starts each entry. H1 to H5,
  default H2.
- **Section heading level**: the level of the counted section heading. Only
  levels below the entry level are offered, default H3. If you change the entry
  level so the section level no longer fits, it moves to one level below the
  entry level.
- **Section heading**: the heading whose text is counted. Default `my writing`;
  leave it empty to use the default.
- **Status bar section**: which matching section the status bar counts when a
  note has several: **First in the note** (default) or **Last in the note**.
- **Add date line**: add a date line to entries that don't have one. Default on.
- **Fill today's date**: write today's date in a date line the command adds.
  When off, the added line is an empty `- date:`. Default on.
- **Date format**: the format of the added date, in the same syntax as Daily
  notes. Default `YYYY-MM-DD`; leave it empty to use the default.

## Privacy

The plugin makes no network requests. It changes a note only when you run
**Update word counts**, and only the note that is open.

## Development

1. `npm install`
2. Link the repo into a test vault (never your real vault):
   `ln -s "$PWD" <test vault>/.obsidian/plugins/entry-word-count`
3. `npm run dev` to rebuild `main.js` on every change.
4. In Obsidian, enable **Entry Word Count** in **Settings → Community plugins**.

Checks: `npm test` (unit tests), `npm run build` (typecheck and production
bundle), and `npm run lint`.
