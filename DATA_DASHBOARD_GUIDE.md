# Publication statistics
- Edit `publications.json` as the canonical dataset.
- `assets/publication-stats.js` recalculates dashboard counts and bar charts when the page loads.
- Published articles = category `International Journal` AND status `Published`.
- Conference presentations = status `Presented`.
- Submitted/In revision excluded from published counts.
- Journal rankings use the raw `venue` field; normalize venue names to ensure accurate grouping.
- Charts use a static fallback generated from the current JSON, so they still show without JS.
