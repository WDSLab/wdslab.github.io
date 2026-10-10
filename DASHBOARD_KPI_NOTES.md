# Research impact KPI definitions

- Total research outputs: all records in `publications.json` (80), including conferences and submitted manuscripts.
- International journal articles: published international journal records only (27).
- SCIE articles: shown as — until `indexing: SCIE` and `indexing_verified: true` are recorded per published article. JCR inclusion alone is not proof of SCIE indexing.
- Average IF: mean 2025 JCR JIF across published papers with matched verified JIF, not across all 27.
- JCR Q1: published papers with `jcr_year=2025`, `jcr_quartile=Q1`.
- JCR Top 10%: published papers with recorded best-category Top 10%, including the explicitly recorded Annals of Intensive Care exception in the existing code.
- Pipeline: 27 Published + 3 In revision + 6 Submitted = 36 international journal manuscripts.
- Conference presentations: 44, counted in total research outputs but not in journal articles.
- Status counts are calculated on page load from `publications.json`.
