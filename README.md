# SQL Query Reviewer

A Svelte-based tool for grading SQL queries. Built for TAs grading WDT SQL assignments. Import student queries, define a rubric, grade with keyboard shortcuts, and export results.

## Features

- **Import/Export**: Load assignment JSON files and export graded results. Re-importing preserves rubric and grading state.
- **Rubric Management**: Create, edit, reorder, and delete rubric reasons. Each reason has a description and point value (deductions or bonuses). Copy the rubric as a formatted table for Word.
- **Query Review**:
  - SQL syntax highlighting (keywords, functions, strings, numbers)
  - Score computed in real time from selected rubric reasons
  - Correct queries (100 points) shown at the top and skipped during navigation
  - Keyboard shortcuts for fast grading (1-9, 0 to toggle reasons, arrows to navigate)
- **Split Layout**: Toggle between single-column and two-pane (2/3 + 1/3) layout. Pane sizes are adjustable by dragging the divider. Layout preference persists across sessions.
- **Task & Schema**: Attach a task description and database schema image (upload a file or paste a URL) for reference while grading.
- **Statistics**: Upload a statistics file to see student counts per query. The Statistics tab shows average, std dev, median, histogram, and cumulative distribution. Toggle between per-query and per-student views.
- **Title Editing**: Double-click the assignment title to rename it.
- **Feedback Modes**: Toggle between exporting feedback as reason IDs (R1, R2) or full descriptions.
- **Persistence**: All data is saved to localStorage automatically.

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # single-file output in dist/
npm run preview   # preview production build
```

The production build creates a single `dist/index.html` with all assets inlined. Open it directly in a browser, no server required.

## Deployment

### Docker

```bash
docker build -t sql-query-reviewer .
docker run -p 3000:80 sql-query-reviewer
```

### Coolify

Connect the repo, select "Dockerfile" as build pack, deploy. Serves via nginx on port 80.

Alternatively, run `npm run build` and deploy `dist/index.html` as a static file.

## Usage

### 1. Import

Click "Import JSON File" and select a file:

```json
{
  "schema": "database_name",
  "queries": [
    { "query": "SELECT * FROM table", "points": 0, "feedback": "" }
  ]
}
```

Previously exported files (with rubric and `_selectedReasons`) are re-imported with grading state intact.

### 2. Rubric

Open an assignment, go to the Rubric tab, and add reasons. Each gets an ID (R1, R2, ...), a description, and a point value. Negative values are deductions, positive values are bonuses.

### 3. Review

Switch to Review Queries. The correct query (if any) is shown at the top. For each query:

- Click rubric checkboxes or press `1-9`/`0` to toggle reasons
- Press arrow keys to move between queries
- Score updates in real time
- Toggle split layout for side-by-side view

### 4. Statistics (optional)

Upload a statistics `.txt` file to load student counts. The Statistics tab becomes available with grade distribution charts.

### 5. Export

Click "Export JSON". Toggle between ID-based (R1, R2) and description-based feedback with the IDs/Full switch.

## Keyboard Shortcuts

| Key         | Action                              |
| ----------- | ----------------------------------- |
| `1-9`, `0`  | Toggle rubric reasons R1-R9 and R10 |
| `←`         | Previous query                      |
| `→`         | Next query                          |

## Project Structure

```text
src/
  main.js                     Entry point
  app.css                     Global styles (CSS variables, dark mode)
  App.svelte                  Root component, routing, JSON import
  lib/
    store.js                  Svelte store + localStorage persistence
    utils.js                  Scoring, SQL highlighting, statistics parsing
    OverviewPage.svelte       Assignment list
    AssignmentPage.svelte     Per-assignment view, tabs, export, modals
    RubricTab.svelte          Rubric CRUD
    ReviewTab.svelte          Query grading, split pane, keyboard shortcuts
    StatisticsTab.svelte      Charts and grade statistics
    Modal.svelte              Reusable modal component
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture details, conventions, and how to add features.

## License

MIT
