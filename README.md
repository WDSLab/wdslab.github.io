# WDSLab Static-First Rebuild

Deploy the CONTENTS of this folder to the root of the wdslab.github.io repository.

- HTML includes all primary content; JS only adds search and mobile navigation.
- All records are local and static.
- `publications.json` includes verified original links for selected papers. Additional source links require checking.
- 80 paper/conference records, 44 projects, 37 news, 12 people.
- Original commercial HGGGOTHICSSI fonts are NOT included.
- Hero image is illustrative, not a photo of an actual WDSLab factory.
- Some titles, author lists, and publication statuses need final reconciliation with Google Sites.
- Bilingual full-content translation is not yet implemented; this stable build prioritizes visible content.

To test locally: `python -m http.server 8000` then open `http://localhost:8000`.


Enhanced archive: detailed member profiles in `members-detailed.json`; gallery metadata in `photos.json`. Original member photos and PHOTO images are NOT copied and must be supplied or exported. Existing news records remain; the News page links to Gallery.


## Journal metrics / JCR
- Original-site IF and Top-percentile annotations are preserved for selected *published* journals. They are not verified current-year JCR values.
- JCR quartile fields are intentionally null until exact JCR year and subject category can be checked from an authorized source. Do not infer Q1 solely from an original-site Top% label.
- To populate: set `jcr_quartile`, `jcr_year`, `jcr_category` for each record after verification and rebuild the static publication page.
- Hero asset `assets/hero-industrial.png` is original generated art with **no embedded text**, representing humanoid dark factory, port logistics, Arctic routes and energy. All copy is HTML.


## Research taxonomy update
- Removed About page and navigation entry.
- Replaced industry-led Research Areas with five paper-grounded methodological pillars.
- Kept industry work in Projects and Systems.
- Related-paper links point to Publications archive; existing DOI/code links on that archive remain intact.
