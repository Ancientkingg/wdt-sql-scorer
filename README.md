# SQL Query Reviewer

A Svelte-based web application for grading SQL queries with rubric support, syntax highlighting, and keyboard shortcuts.

## Features

- **JSON Import/Export**: Import assignment files with SQL queries and export graded results
- **Rubric Management**: Create and manage grading rubric reasons (R1-R6) with point deductions
- **Query Review Interface**: Grade queries with syntax highlighting and real-time score calculation
- **Keyboard Shortcuts**:
  - `1-6`: Toggle rubric reasons
  - `Arrow Left/Right`: Navigate between queries
- **Correct Query Display**: Automatically displays correct queries (100 points) at the top
- **Query Skipping**: Correct queries are skipped during navigation
- **SQL Syntax Highlighting**: Keywords, functions, strings, and numbers are color-coded
- **Progress Tracking**: Track grading progress with query counters
- **LocalStorage Persistence**: All data is automatically saved to browser storage

## Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

### Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:5173/`

## Build

```bash
# Build for production (single HTML file)
npm run build
```

This creates a standalone `dist/index.html` file with all CSS and JavaScript inlined. The file is completely self-contained and can be:

- Opened directly in any browser (no server required)
- Shared as a single file
- Used offline

Size: ~65 KB (~23 KB gzipped)

```bash
# Preview production build
npm run preview
```

## Deployment

### Coolify

This project is configured for easy deployment on Coolify:

1. **Connect your Git repository** to Coolify
2. **Select "Dockerfile" as the build pack** (auto-detected via `.coolify.json`)
3. **Deploy** - Coolify will:
   - Build the app using the Dockerfile
   - Serve static files via nginx
   - Expose on port 80

**Alternative: Static Site Deployment**

1. Run `npm run build` locally
2. Deploy just the `dist/index.html` file as a static site
3. Point Coolify to serve from a simple nginx or Apache container

### Docker

```bash
# Build Docker image
docker build -t sql-query-reviewer .

# Run container
docker run -p 3000:80 sql-query-reviewer
```

Access at `http://localhost:3000`

## Usage

### 1. Import Assignment

1. Click "Import JSON File" on the overview page
2. Select a JSON file with the following structure:

```json
{
  "schema": "database_name",
  "queries": [
    {
      "query": "SELECT * FROM table",
      "points": 0,
      "feedback": ""
    }
  ]
}
```

### 2. Create Rubric

1. Open an assignment
2. Go to the "Rubric" tab
3. Click "+ Add Reason"
4. Enter description and point deduction
5. Reasons are automatically numbered (R1, R2, etc.)

### 3. Review Queries

1. Switch to "Review Queries" tab
2. View correct query (if present) at the top
3. Grade current query by:
   - Clicking checkboxes for rubric reasons
   - Or pressing `1-6` keys to toggle reasons
4. Navigate between queries:
   - Click "Previous/Next Query" buttons
   - Or use `Arrow Left/Right` keys
5. Current score is displayed in real-time

### 4. Export Results

1. Click "Export JSON" button
2. File is downloaded with calculated scores and feedback

## Project Structure

```
src/
  app.css              # Global styles with CSS variables
  main.js              # Application entry point
  App.svelte           # Root component with routing
  lib/
    store.js           # State management with localStorage
    utils.js           # Utility functions (SQL highlighting, scoring)
    OverviewPage.svelte      # Assignment list
    AssignmentPage.svelte    # Tab container
    RubricTab.svelte         # Rubric management
    ReviewTab.svelte         # Query grading interface
```

## Technologies

- **Svelte 5**: Component framework
- **Vite 7**: Build tool and dev server
- **LocalStorage**: Client-side data persistence
- **CSS Variables**: Theming and styling

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-6` | Toggle rubric reasons R1-R6 |
| `←` | Previous query |
| `→` | Next query |

## License

MIT
