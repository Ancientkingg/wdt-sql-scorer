# Contributing to WDT SQL Scorer

This guide covers the project architecture, conventions, and common tasks so new contributors can get productive quickly.

## Prerequisites

- Node.js installed (LTS recommended)
- npm installed (included with Node.js)

If you do not have Node.js and npm, install them from <https://nodejs.org>.

## Project Links

- Hosted app: <https://wdt.samuelbruin.com>
- Questions or support: <wdt@samuelbruin.com>

## Quick Start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # single-file output in dist/
npm run preview  # preview the production build
```

The build produces one self-contained `index.html` (via `vite-plugin-singlefile`). No server needed to open it.

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Svelte | 5.x | Component framework |
| Vite | 7.x | Dev server and bundler |
| vite-plugin-singlefile | 2.x | Bundles everything into one HTML file |

No backend. All state lives in `localStorage`.

## Project Structure

```
src/
  main.js                 -- Mounts the Svelte app
  app.css                 -- All global styles and CSS variables
  App.svelte              -- Root component, handles routing and JSON import
  lib/
    store.js              -- Svelte writable store + localStorage persistence
    utils.js              -- Scoring, SQL highlighting, statistics parsing
    OverviewPage.svelte   -- Assignment list (landing page)
    AssignmentPage.svelte -- Per-assignment view: header, tabs, export, modals
    RubricTab.svelte      -- Create/edit/reorder/delete rubric items
    ReviewTab.svelte      -- Grade queries, split-pane layout, keyboard shortcuts
    StatisticsTab.svelte  -- Charts and stats (histogram, cumulative distribution)
    Modal.svelte          -- Reusable modal (alert, confirm, input)
```

## Architecture

### Data Flow

1. **Import**: `App.svelte` reads a JSON file and creates an assignment object.
2. **Store**: The `appStore` (a Svelte writable) holds all assignments. Every mutation goes through `appStore.update()` followed by `appStore.saveState()` to persist.
3. **Components**: Each tab reads from the assignment prop. Mutations flow up through the store, not through events (except navigation: `dispatch('back')`, `dispatch('open')`, etc.).
4. **Export**: `AssignmentPage.svelte` rebuilds the JSON from current state, including computed scores and feedback.

### Assignment Object Shape

```js
{
  id: string,              // timestamp-based unique ID
  name: string,            // display name (editable)
  schema: string,          // database schema name from import
  originalData: object,    // raw imported JSON (preserved for re-export)
  hasStatistics: boolean,  // whether cluster counts are loaded
  taskDescription: string, // optional task text shown in review
  schemaImage: string,     // URL or data URI for schema image
  queries: [{
    query: string,
    originalPoints: number,
    originalFeedback: string,
    selectedReasons: string[],  // e.g. ["R1", "R3"]
    graded: boolean,
    clusterCount: number        // number of students with this query
  }],
  rubric: [{
    id: string,       // "R1", "R2", etc.
    description: string,
    points: number    // negative = deduction, positive = bonus
  }]
}
```

### Scoring

Score starts at 100. Each selected rubric reason's `points` value is added (deductions are negative). Result is clamped to [0, 100]. See `calculateQueryScore()` in `utils.js`.

### Statistics

Statistics come from a separate text file with `StatisticsCluster` blocks. Each cluster has a `Count` (number of students) and a `query`. The app matches these to imported queries by text comparison and assigns `clusterCount` values.

### Layout Modes

`ReviewTab` has two modes:

- **Single column** (default): Everything stacked vertically.
- **Split pane**: Left pane (queries, 2/3 width) and right pane (grading, 1/3 width). Each scrolls independently. The divider is draggable (40-80% range). Preference is saved to `localStorage`.

### Keyboard Shortcuts

Handled by a global `keydown` listener in `ReviewTab`:

- `1-9`, `0`: Toggle rubric items 1-9 and 10
- `ArrowLeft`/`ArrowRight`: Prev/next query (skips correct queries)

The listener ignores events from `<input>` and `<textarea>` elements.

## Styling

All styles are in `src/app.css`. The app uses CSS custom properties for theming (dark mode). Component-scoped styles are only used in `StatisticsTab.svelte` and `Modal.svelte`.

Key CSS variable groups:

- `--bg-*`: Background colors
- `--text-*`: Text colors
- `--primary-color`, `--success-color`, `--danger-color`: Semantic colors
- `--border-color`, `--shadow`: Borders and shadows

## Conventions

- **State mutations**: Always go through `appStore.update()` then `appStore.saveState()`. Don't mutate props directly.
- **Comments**: Keep them short. Describe *why*, not *what*. No filler lines.
- **Naming**: Components are PascalCase. Functions are camelCase. CSS classes are kebab-case.
- **No external dependencies**: The app is intentionally dependency-free (no UI library, no chart library). Charts are hand-built SVG.

## Common Tasks

### Adding a new rubric feature

1. Add the field to the rubric object shape in `App.svelte`'s `importAssignment()`.
2. Update `RubricTab.svelte` to render and edit the new field.
3. Update `AssignmentPage.svelte`'s export logic to include it.
4. Persist via the store pattern: `appStore.update()` + `appStore.saveState()`.

### Adding a new tab

1. Create `src/lib/NewTab.svelte`.
2. Import and render it in `AssignmentPage.svelte` under the `{#if activeTab === ...}` block.
3. Add a tab button in the `.tabs` div.

### Adding a keyboard shortcut

Add a case to `handleKeydown()` in `ReviewTab.svelte`. Check that `event.target` isn't a form field first.

### Modifying the export format

Edit `buildShareExportData()`, `buildWebLabExportData()`, and `buildExportQueries()` in `AssignmentPage.svelte`.

- Share export writes project metadata for re-import compatibility.
- WebLab export copies a metadata-free payload to clipboard and falls back to file download if clipboard access fails.

Keep backward compatibility in mind. The import logic in `App.svelte` supports both old and new formats.

## Deployment

The Dockerfile builds the app and serves it via nginx. For Coolify, point it at the repo and select "Dockerfile" as the build pack. For manual deploys, run `npm run build` and host `dist/index.html` anywhere.

## Troubleshooting

- **localStorage full**: The app stores everything (including base64 schema images) in localStorage. Large images can fill up the ~5MB quota. If this happens, clear site data or use URL-based schema images instead.
- **Statistics not matching**: Query matching is whitespace-sensitive. The `normalizeQuery()` function collapses whitespace, but other differences (case, trailing semicolons) will cause mismatches.
- **Build output too large**: The single-file build inlines all assets. Keep image assets external (URL-based) rather than embedded.
