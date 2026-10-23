(() => {
  const grid = document.querySelector('#gallery-grid');
  const dialog = document.querySelector('#gallery-lightbox');
  if (!grid || !dialog) return;   // 검색·종류 고르기는 없음 (2026-10-23 사용자 결정) — 9장씩 쪽으로만

  const labels = { Conferences: 'Conferences', Awards: 'Awards', 'Lab life': 'Lab life' };
  // 사진 주소는 데이터에 'assets/…' 로 적혀 있음 — 페이지가 /news/ 폴더 주소라 뿌리(/)부터로 고쳐 쓴다
  const src = (p) => (/^([/]|https?:)/.test(p) ? p : `/${p}`);
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let records = [];
  let currentRecord = 0;
  let currentPhoto = 0;
  // 9장씩 페이지 나누기 (다른 목록과 같은 모양 — site.js renderPager 와 같은 단추). 페이지가 미리 그려 둔 단추 줄이 있으면 그걸 쓴다
  const PAGE = 9;
  let page = 1;
  const pager = grid.nextElementSibling?.classList.contains('pager') ? grid.nextElementSibling : (() => { const nav = document.createElement('nav'); nav.className = 'pager'; nav.setAttribute('aria-label', 'Pages'); grid.after(nav); return nav; })();
  pager.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page]');
    if (!button || button.disabled) return;
    page = Number(button.dataset.page);
    render();
    const anchor = grid.closest('section')?.querySelector('h2') || grid;   // 쪽을 넘기면 "Photo Archive" 제목이 보이는 자리까지 천천히 (site.js 의 wdsScrollTo)
    window.wdsScrollTo(anchor.getBoundingClientRect().top + window.scrollY - 88);
  });
  const renderPager = (pages) => {
    pager.replaceChildren();
    if (pages < 2) return;
    const add = (label, target, opts = {}) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.page = target;
      if (opts.current) { button.className = 'is-current'; button.setAttribute('aria-current', 'page'); }
      if (opts.disabled) button.disabled = true;
      if (opts.label) button.setAttribute('aria-label', opts.label);
      pager.append(button);
    };
    add('‹', page - 1, { disabled: page === 1, label: 'Previous page' });
    let gap = false;
    for (let n = 1; n <= pages; n++) {
      if (pages <= 7 || n === 1 || n === pages || Math.abs(n - page) <= 1) { add(String(n), n, { current: n === page }); gap = false; }
      else if (!gap) { const dots = document.createElement('span'); dots.className = 'pager-gap'; dots.textContent = '…'; pager.append(dots); gap = true; }
    }
    add('›', page + 1, { disabled: page === pages, label: 'Next page' });
  };

  // 카드는 펼치지 않는다 (옆 카드가 밀리지 않게). 사진은 눌러서 크게 보고 좌우로 넘긴다
  const cardMarkup = (item, index) => {
    const photos = item.photos || [];
    const cover = photos[0] || '';
    return `<article class="gallery-card" data-category="${esc(item.category)}">
      ${cover ? `<button class="gallery-cover" type="button" data-record="${index}" data-photo="0" aria-label="View photos: ${esc(item.title)}">
        <img src="${esc(src(cover))}" alt="${esc(item.title)}" loading="lazy">
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
    const visible = records.map((item, index) => ({ item, index }));
    const pages = Math.max(1, Math.ceil(visible.length / PAGE));
    page = Math.min(Math.max(1, page), pages);
    grid.innerHTML = visible.slice((page - 1) * PAGE, page * PAGE).map(({ item, index }) => cardMarkup(item, index)).join('');
    renderPager(pages);
  };

  const updateLightbox = () => {
    const item = records[currentRecord];
    if (!item) return;
    const image = dialog.querySelector('.gallery-lightbox-image');
    image.src = src(item.photos[currentPhoto]);
    image.alt = `${item.title} — photo ${currentPhoto + 1}`;
    dialog.querySelector('.gallery-lightbox-caption').textContent = `${item.title} · ${currentPhoto + 1} / ${item.photos.length}`;
    const multiple = item.photos.length > 1;
    dialog.querySelector('[data-step="prev"]').hidden = !multiple;
    dialog.querySelector('[data-step="next"]').hidden = !multiple;
    // 아래 점: 사진 수만큼, 지금 사진은 남색. 사진이 하나면 점 없이 여백만
    const dots = dialog.querySelector('#gallery-lightbox-dots');
    if (dots) dots.replaceChildren(...(multiple ? item.photos.map((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.photo = i; b.setAttribute('aria-label', `Photo ${i + 1}`); if (i === currentPhoto) b.classList.add('is-on'); return b; }) : []));
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
    const dot = event.target.closest('#gallery-lightbox-dots button[data-photo]');
    if (dot) { currentPhoto = Number(dot.dataset.photo); updateLightbox(); return; }
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

  fetch('/assets/gallery.json').then((response) => {
    if (!response.ok) throw new Error('gallery data');
    return response.json();
  }).then((data) => {
    records = data;
    if (!grid.children.length) render();   // 페이지가 미리 그려 둔 카드가 있으면 그대로 두고, 고르거나 찾을 때만 다시 그림
  }).catch(() => {
    grid.insertAdjacentHTML('beforebegin', '<p class="gallery-error">갤러리 정보를 불러오지 못했습니다.</p>');
  });
})();
