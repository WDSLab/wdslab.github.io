# Current-repository cleanup report

**Source:** user-uploaded `wdslab.github.io-main.zip` (current version).

## Changes
- Removed byte-identical top-level copies of images/assets: **16** files.
- Moved unused top-level `style.css`, `site.js`, `extra.css`, `content.js`, `content.json` to `_maintenance/legacy/` (preserved for review).
- Removed empty `download` file.
- Archived unused `about.html` (navigation already does not use it).
- Moved historical change logs and source notes to `_maintenance/history/`.
- Kept all published HTML pages, active assets, data and links unchanged.

## Data retained
- `publications.json`: 80 records
- `projects.json`: 44 records
- `news_full_original.json`: 76 records
- `news_linked.json`: 76 records
- `members-detailed.json`: 11 records

## Local reference audit
**Broken local references:** 0
- None found

## Cautions
- External links were not tested for HTTP availability.
- JCR/IF, DOI and GitHub repository identity were not independently validated.
- Original photo/media migration completeness was not audited.
- Browser rendering should be checked after deployment.
