# Journal and venue data for future statistics

- `publications.json`: one record per paper; `venue_id` is a stable link to `journal_registry.json`.
- `journal_registry.json`: canonical venue names, type (Journal/Conference/Other), aliases.
- Journal-level statistics should filter venue `type == Journal` and optionally publication `status == Published` or `Accepted` as appropriate.
- The existing `venue` strings are preserved; aliases help future matching.
- IF/Top % are not normalized across JCR years in this update.
- If a new paper is added, update the registry and use its venue_id instead of inventing a new spelling.
