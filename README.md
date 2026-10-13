# WDSLab Website

Static website for the WDSLab research group. Upload the contents of this folder to the root of the `WDSLab/wdslab.github.io` repository.

## Pages

- `index.html` — homepage, Research Highlights, current News, and Selected Papers
- `research.html`, `projects.html`, `systems.html`, `publications.html`, `people.html`, `news.html`, `gallery.html`, `join.html` — site pages; the professor profile is expanded inline on `people.html` (the old `pi.html` URL redirects there)
- `404.html` — not-found page

## Shared files

- `assets/style.css`, `assets/button-fix.css` — site styles
- `assets/site.js` — mobile navigation and News archive search/filter
- `assets/impact-dashboard.js` — publication statistics and charts
- `publications.json`, `publication_metrics.json` — data loaded by the publication dashboard

Visible page content is maintained in the HTML files. Keep matching homepage and archive News entries synchronized. Each News item has at most one `News article` link. Selected Papers do not use News article buttons.

## Current records

- Homepage News: 44
- News archive: 79
- Publications: 80
- Projects: 44
- People: 12

## Local preview

From this directory, run `python3 -m http.server 8000` and open `http://localhost:8000`.
