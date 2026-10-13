(() => {
  const grid = document.querySelector('#gallery-grid');
  const filters = document.querySelector('#gallery-filters');
  const search = document.querySelector('#gallery-search');
  const count = document.querySelector('#gallery-count');
  const dialog = document.querySelector('#gallery-lightbox');
  if (!grid || !filters || !search || !count || !dialog) return;

  const categories = ['All', 'Conferences', 'Awards', 'Lab life'];
  const labels = { All: 'All events', Conferences: 'Conferences', Awards: 'Awards', 'Lab life': 'Lab life' };
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let records = [];
  let activeCategory = 'All';
  let currentRecord = 0;
  let currentPhoto = 0;

  const makeFilters = () => {
    filters.replaceChildren();
    categories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `gallery-filter${category === activeCategory ? ' is-active' : ''}`;
      button.textContent = labels[category];
      button.setAttribute('aria-pressed', String(category === activeCategory));
      button.addEventListener('click', () => {
        activeCategory = category;
        makeFilters();
        render();
      });
      filters.append(button);
    });
  };

  const cardMarkup = (item, index) => {
    const photos = item.photos || [];
    const cover = photos[0] || '';
    const photoStrip = photos.map((src, photoIndex) => `
      <button class="gallery-thumb" type="button" data-record="${index}" data-photo="${photoIndex}" aria-label="${esc(item.title)} photo ${photoIndex + 1}">
        <img src="${esc(src)}" alt="${esc(item.title)} — photo ${photoIndex + 1}" loading="lazy">
      </button>`).join('');
    return `<article class="gallery-card" data-category="${esc(item.category)}" data-search="${esc(`${item.title} ${item.description} ${item.date} ${item.year} ${item.category}`.toLowerCase())}">
      ${cover ? `<button class="gallery-cover" type="button" data-record="${index}" data-photo="0" aria-label="${esc(item.title)} 사진 크게 보기">
        <img src="${esc(cover)}" alt="${esc(item.title)}" loading="lazy">
        <span class="gallery-cover-zoom" aria-hidden="true">↗</span>
      </button>` : `<div class="gallery-cover gallery-cover-empty" aria-label="등록된 사진 없음"><span>등록된 사진이 없습니다</span></div>`}
      <div class="gallery-card-body">
        <div class="gallery-card-meta"><time>${esc(item.date)}</time><span class="gallery-category category-${esc(item.category.toLowerCase().replaceAll(' ', '-'))}">${esc(item.category)}</span></div>
        <h2>${esc(item.title)}</h2>
        <p class="gallery-description">${esc(item.description)}</p>
        <details class="gallery-details"><summary>행사 내용 보기</summary><div><p>${esc(item.description)}</p></div></details>
        ${photos.length > 1 ? `<button type="button" class="gallery-more-photos" data-toggle="${index}">사진 ${photos.length}장 모두 보기 <span aria-hidden="true">＋</span></button><div class="gallery-photo-strip" data-strip="${index}" hidden>${photoStrip}</div>` : ''}
      </div>
    </article>`;
  };

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const visible = records.map((item, index) => ({ item, index })).filter(({ item }) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesQuery = !query || `${item.title} ${item.description} ${item.date} ${item.year} ${item.category}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
    grid.innerHTML = visible.map(({ item, index }) => cardMarkup(item, index)).join('');
    count.textContent = `${visible.length} events`;
  };

  const updateLightbox = () => {
    const item = records[currentRecord];
    if (!item) return;
    const image = dialog.querySelector('.gallery-lightbox-image');
    image.src = item.photos[currentPhoto];
    image.alt = `${item.title} — photo ${currentPhoto + 1}`;
    dialog.querySelector('.gallery-lightbox-caption').textContent = `${item.title} · ${currentPhoto + 1} / ${item.photos.length}`;
    const multiple = item.photos.length > 1;
    dialog.querySelector('[data-step="prev"]').hidden = !multiple;
    dialog.querySelector('[data-step="next"]').hidden = !multiple;
  };

  grid.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-toggle]');
    if (toggle) {
      const strip = grid.querySelector(`[data-strip="${toggle.dataset.toggle}"]`);
      const expanded = strip.hidden;
      strip.hidden = !expanded;
      toggle.querySelector('span').textContent = expanded ? '−' : '＋';
      toggle.setAttribute('aria-expanded', String(expanded));
      return;
    }
    const photo = event.target.closest('[data-record][data-photo]');
    if (!photo) return;
    currentRecord = Number(photo.dataset.record);
    currentPhoto = Number(photo.dataset.photo);
    updateLightbox();
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
    const step = event.target.closest('[data-step]');
    if (!step) return;
    const length = records[currentRecord].photos.length;
    currentPhoto = (currentPhoto + (step.dataset.step === 'next' ? 1 : -1) + length) % length;
    updateLightbox();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const length = records[currentRecord].photos.length;
    if (length < 2) return;
    currentPhoto = (currentPhoto + (event.key === 'ArrowRight' ? 1 : -1) + length) % length;
    updateLightbox();
  });
  search.addEventListener('input', render);

  fetch('assets/gallery.json').then((response) => {
    if (!response.ok) throw new Error('gallery data');
    return response.json();
  }).then((data) => {
    records = data;
    document.querySelector('#gallery-total').textContent = `${records.length} moments from WDSLab`;
    makeFilters();
    render();
  }).catch(() => {
    count.textContent = '갤러리 정보를 불러오지 못했습니다.';
  });
})();
