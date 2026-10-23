(() => {
  const grid = document.querySelector('#gallery-grid');
  const filters = document.querySelector('#gallery-filters');
  const search = document.querySelector('#gallery-search');
  const count = document.querySelector('#gallery-count');
  const dialog = document.querySelector('#gallery-lightbox');
  if (!grid || !filters || !search || !count || !dialog) return;

  const categories = ['All', 'Conferences', 'Awards', 'Lab life'];
  const labels = { All: 'All', Conferences: 'Conferences', Awards: 'Awards', 'Lab life': 'Lab life' };
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

  // 카드는 펼치지 않는다 (옆 카드가 밀리지 않게). 사진은 눌러서 크게 보고 좌우로 넘긴다
  const cardMarkup = (item, index) => {
    const photos = item.photos || [];
    const cover = photos[0] || '';
    return `<article class="gallery-card" data-category="${esc(item.category)}">
      ${cover ? `<button class="gallery-cover" type="button" data-record="${index}" data-photo="0" aria-label="View photos: ${esc(item.title)}">
        <img src="${esc(cover)}" alt="${esc(item.title)}" loading="lazy">
        ${photos.length > 1 ? `<span class="gallery-cover-count">${photos.length} photos</span>` : ''}
      </button>` : `<div class="gallery-cover gallery-cover-empty"><span>No photos yet</span></div>`}
      <div class="gallery-card-body">
        <p class="gallery-card-meta"><time>${esc(item.date)}</time> · ${esc(labels[item.category] || item.category)}</p>
        <h3>${esc(item.title)}</h3>
        <p class="gallery-description">${esc(item.description)}</p>
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
    grid.scrollTop = 0;   // 종류·검색을 바꾸면 스크롤 상자 맨 위부터
    count.textContent = `${visible.length} / ${records.length}`;
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
    makeFilters();
    if (!grid.children.length) render();   // 페이지가 미리 그려 둔 카드가 있으면 그대로 두고, 고르거나 찾을 때만 다시 그림
  }).catch(() => {
    count.textContent = '갤러리 정보를 불러오지 못했습니다.';
  });
})();
