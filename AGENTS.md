# AGENTS.md

Instructions for AI coding agents working in this project.

AI tools must not add AI attribution to commits or pull requests, including AI
`Co-Authored-By` trailers or generated-by signatures. Preserve genuine human
attribution.

## What this is

**Entry Word Count** is an Obsidian community plugin (TypeScript bundled to
`main.js` by esbuild). It records each entry's date and word count in the note
and shows the writing section's word count in the status bar; see `README.md`.

- Entry point: `src/main.ts`, compiled to `main.js` and loaded by Obsidian.
- Release artifacts: `main.js`, `manifest.json`, and optional `styles.css`.
- Package manager: npm. Bundler: esbuild (`esbuild.config.mjs`). Types: `obsidian`.

## Proportional engineering

Build for established requirements, not hypothetical scale, threats, or future
flexibility. Reuse existing code, the standard library, native platform features,
and installed dependencies before adding machinery.

- Unknown scale or extensibility defaults to the smaller reversible design. Do
  not infer enterprise, multi-tenant, hostile-user, or compliance requirements.
- Derive trust and data-integrity boundaries from actual reachability: untrusted
  input, auth/session/ownership, shared persisted data, destructive operations,
  payments, secrets, and sensitive data.
- Ask only when an unknown materially changes behavior, architecture, persisted
  data, interoperability, a real security boundary, or cost. Otherwise choose the
  simplest repository-native implementation.
- Add an abstraction, dependency, service, configuration surface, compatibility
  layer, or security mechanism only for a current requirement.
- Simplicity never removes real trust-boundary validation, data-loss prevention,
  accessibility, explicit security requirements, configured tests, or project rules.
- Stack-specific template standards apply only when the project uses that stack.

## Commands

- Install: `npm install`
- Dev (watch build): `npm run dev` - rebuilds `main.js` on change; no server
- Build: `npm run build` - typechecks with `tsc -noEmit -skipLibCheck`, then
  bundles a production `main.js`
- Lint: `npm run lint` (ESLint with `eslint-plugin-obsidianmd`)
- Test: `npm test` (Vitest, `vitest run`; test files are `src/**/*.test.ts`)
- Version bump: `npm version patch|minor|major` - after setting `minAppVersion`
  in `manifest.json`, updates `manifest.json`, `package.json`, and `versions.json`

There is no separate typecheck or Verify command. `npm run build` covers
typechecking. CI (`.github/workflows/lint.yml`) runs `npm ci`, `npm run build`,
and `npm run lint` on Node 20, 22, and 24 for every push and pull request; it
does not run `npm test` yet.

Tests are a gate for logic-bearing changes. Unit tests cover pure modules that
do not import `obsidian`; Obsidian-facing behavior is checked in a test vault.

Run the plugin manually: copy `main.js`, `manifest.json`, and `styles.css` into
`<Vault>/.obsidian/plugins/<plugin-id>/`, reload Obsidian, and enable it in
**Settings → Community plugins**.

## Obsidian plugin rules

Follow Obsidian's [Developer policies](https://docs.obsidian.md/Developer+policies)
and [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).

### Manifest (`manifest.json`)

- Must include `id`, `name`, `version` (SemVer `x.y.z`), `minAppVersion`,
  `description`, and `isDesktopOnly`. Optional: `author`, `authorUrl`, `fundingUrl`.
- Never change `id` after release. For local dev it should match the plugin folder name.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

### Security and privacy

- Default to local/offline operation. Make network requests only when essential
  to a feature, and disclose any external service, the data sent, and the risks
  in `README.md` and in settings.
- No hidden telemetry. Optional analytics or third-party calls require explicit opt-in.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code
  outside normal releases.
- Read and write only what is necessary inside the vault. Never access files outside it.
- Do not collect or transmit vault contents, filenames, or personal information
  unless essential and explicitly consented.
- No deceptive patterns, ads, or spammy notifications.

### Releases

- Bump `version` in `manifest.json` and map plugin version to minimum app
  version in `versions.json`.
- The GitHub release tag must exactly match the `manifest.json` version, with no
  leading `v`. Attach `manifest.json`, `main.js`, and `styles.css` as individual assets.
- Never commit build artifacts (`main.js`, `node_modules/`, source maps).

### UX copy

- Sentence case for headings, buttons, command names, and titles.
- Use **bold** for literal UI labels, "select" for interactions, and arrow
  notation for navigation (**Settings → Community plugins**).
- Keep in-app strings short, consistent, and free of jargon.

### References

- API documentation: https://docs.obsidian.md
- Style guide: https://help.obsidian.md/style-guide
- Sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
