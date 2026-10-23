// 새로 고침 때 보던 자리로 돌아가기: 브라우저에 맡기면 내용(사진·숫자 칸·그래프)이 채워지는 동안 여러 번 맞추느라 화면이 움직여 보임
// → 직접 저장했다가, 열리자마자 한 번 바로 옮기고, 다 불러온 뒤 어긋났으면 한 번 더 (그 사이 사용자가 스크롤하면 손대지 않음)
(() => {
  if (!('scrollRestoration' in history)) return;
  history.scrollRestoration = 'manual';
  const key = `scroll:${location.pathname}${location.search}`;
  const save = () => { try { sessionStorage.setItem(key, String(Math.round(window.scrollY))); } catch (e) { /* 저장 못 해도 그만 */ } };
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  let saved = 0;
  try { saved = Number(sessionStorage.getItem(key)) || 0; } catch (e) { saved = 0; }
  const reload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  if (!reload || !saved || location.hash) return;
  let touched = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((type) => window.addEventListener(type, () => { touched = true; }, { once: true, passive: true }));
  // 두 번째부터는 처음에 페이지가 짧아 끝까지 못 갔을 때만 (내용이 늘며 브라우저가 맞춘 위치는 그대로 둠)
  let short = false;
  const first = () => { window.scrollTo({ top: saved, behavior: 'instant' }); short = window.scrollY < saved - 2; };
  const again = () => { if (short && !touched) first(); };
  document.addEventListener('DOMContentLoaded', first);
  window.addEventListener('load', () => { again(); setTimeout(again, 400); }, { once: true });
})();

document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.querySelector('.hamburger');
  const navigation = document.querySelector('.nav');
  // 휴대폰 메뉴: 열면 ☰ → ✕, 뒤 화면은 어두워짐. 어두운 곳 · Esc · 메뉴 항목을 누르면 닫힘
  const setMenu = (open) => {
    if (!navigation || !menuButton) return;
    navigation.classList.toggle('open', open);
    document.documentElement.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.querySelector('span').textContent = open ? '✕' : '☰';
  };
  menuButton?.addEventListener('click', () => setMenu(!navigation?.classList.contains('open')));
  navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.querySelector('.nav-backdrop')?.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
  window.matchMedia('(max-width: 860px)').addEventListener('change', () => setMenu(false));   // 화면이 넓어지면 닫힌 상태로

  // 주소 복사 버튼 (Contact): 누르면 2초간 "Copied". 새 복사 기능이 막힌 브라우저는 옛 방식(글자 선택 후 복사)으로
  const copyOld = (text) => {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(box);
    box.select();
    const ok = document.execCommand('copy');
    box.remove();
    return ok;
  };
  document.querySelectorAll('button[data-copy]').forEach((button) => {
    const label = button.textContent;
    button.addEventListener('click', async () => {
      let ok = true;
      try { await navigator.clipboard.writeText(button.dataset.copy); } catch (e) { ok = copyOld(button.dataset.copy); }
      button.textContent = ok ? 'Copied' : button.dataset.copy;   // 복사가 아예 안 되면 주소를 보여 줌
      if (ok) setTimeout(() => { button.textContent = label; }, 2000);
    });
  });

  const search = document.querySelector('#search');
  const filter = document.querySelector('#filter');
  const list = document.querySelector('#records');
  const records = [...document.querySelectorAll('#records > article, #records > section > article')];   // News 는 연도 묶음(section) 안에 있음
  const count = document.querySelector('#count');
  const tabs = [...document.querySelectorAll('[role="tab"][data-filter]')];   // 종류를 탭으로 고르는 목록 (Research Projects)
  const years = [...document.querySelectorAll('button[data-year]')];          // 연도를 하나씩 고르는 줄 (News)
  // 목록에 data-page-size 가 있으면 그만큼씩 페이지로 나눠 보여 준다 (Publications)
  const pageSize = Number(list?.dataset.pageSize) || 0;
  let page = 1;
  let pager = null;
  if (pageSize && list) {
    // 페이지가 미리 그려 둔 단추 줄(Publications)이 있으면 그걸 쓰고, 없으면 만든다
    const ready = list.nextElementSibling?.classList.contains('pager') ? list.nextElementSibling : null;
    pager = ready || document.createElement('nav');
    pager.className = 'pager';
    pager.setAttribute('aria-label', 'Pages');
    if (!ready) list.after(pager);
    pager.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-page]');
      if (!button || button.disabled) return;
      page = Number(button.dataset.page);
      updateNews();
      list.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }

  function renderPager(pages) {
    if (!pager) return;
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
    // 페이지가 많으면 처음 · 끝 · 지금 앞뒤만 보이고 나머지는 … 로 줄임
    let gap = false;
    for (let n = 1; n <= pages; n++) {
      if (pages <= 7 || n === 1 || n === pages || Math.abs(n - page) <= 1) {
        add(String(n), n, { current: n === page });
        gap = false;
      } else if (!gap) {
        const dots = document.createElement('span');
        dots.className = 'pager-gap';
        dots.textContent = '…';
        pager.append(dots);
        gap = true;
      }
    }
    add('›', page + 1, { disabled: page === pages, label: 'Next page' });
  }

  function updateNews() {
    const query = (search?.value || '').trim().toLocaleLowerCase();
    const category = filter?.value || tabs.find((tab) => tab.getAttribute('aria-selected') === 'true')?.dataset.filter || '';
    const matched = records.filter((record) => {
      const text = `${record.dataset.search || ''} ${record.textContent || ''}`.toLocaleLowerCase();
      return (!query || text.includes(query)) && (!category || record.dataset.category === category);
    });
    // News: 검색어가 없으면 고른 연도만. 그 종류의 소식이 없는 해는 못 누르고, 고른 해가 비면 가장 최근 해로
    let visible = matched;
    if (years.length) {
      years[0].parentElement.hidden = Boolean(query);
      list?.classList.toggle('is-search', Boolean(query));
      if (!query) {
        const yearOf = (record) => record.closest('section')?.dataset.year;
        const filled = new Set(matched.map(yearOf));
        years.forEach((button) => { button.disabled = !filled.has(button.dataset.year); });
        let pick = years.find((button) => button.getAttribute('aria-pressed') === 'true');
        if (!pick || pick.disabled) pick = years.find((button) => !button.disabled);
        years.forEach((button) => button.setAttribute('aria-pressed', String(button === pick)));
        visible = matched.filter((record) => yearOf(record) === pick?.dataset.year);
      }
    }
    const pages = pageSize ? Math.max(1, Math.ceil(visible.length / pageSize)) : 1;
    page = Math.min(Math.max(1, page), pages);
    const shown = new Set(pageSize ? visible.slice((page - 1) * pageSize, page * pageSize) : visible);
    records.forEach((record) => { record.hidden = !shown.has(record); });
    renderPager(pages);
    // 연도 묶음: 남은 소식이 없으면 그 연도 제목도 숨김
    list?.querySelectorAll(':scope > section').forEach((group) => {
      group.hidden = !group.querySelector('article:not([hidden])');
    });

    if (count) count.textContent = `${visible.length} / ${records.length}`;
  }

  const restart = () => { page = 1; updateNews(); if (list) list.scrollTop = 0; };   // 검색어·종류·연도를 바꾸면 첫 페이지부터, 스크롤 상자(News)도 맨 위로
  search?.addEventListener('input', restart);
  filter?.addEventListener('change', restart);
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((other) => other.setAttribute('aria-selected', String(other === tab)));
    restart();
    if (list) { list.scrollTop = 0; list.dispatchEvent(new Event('scroll-reset')); }   // 목록 상자 안 스크롤도 처음으로 (Projects), 움직이던 것도 멈춤
  }));
  years.forEach((button) => button.addEventListener('click', () => {
    years.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    restart();
  }));
  const author = new URLSearchParams(window.location.search).get('author');
  if (author && search && records.length) search.value = author;
  // 다른 페이지에서 논문 주소(#paper-…)로 들어오면 그 논문이 있는 페이지를 연다
  const openHash = () => {
    const target = window.location.hash && records.find((record) => `#${record.id}` === window.location.hash);
    if (!target || !pageSize) return false;
    page = Math.floor(records.indexOf(target) / pageSize) + 1;
    updateNews();
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.addEventListener('load', () => target.scrollIntoView({ block: 'start', behavior: 'instant' }), { once: true });   // 그래프·사진이 다 들어온 뒤 한 번 더
    return true;
  };
  updateNews();
  // 목록을 페이지로 나누면 위쪽 높이가 줄어서, 주소의 #구간(예: /#research)으로 다시 맞춰 준다
  if (!openHash() && window.location.hash) {
    const section = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (section) {
      section.scrollIntoView({ block: 'start', behavior: 'instant' });
      window.addEventListener('load', () => section.scrollIntoView({ block: 'start', behavior: 'instant' }), { once: true });
    }
  }
  window.addEventListener('hashchange', openHash);
  if (author && records.length) document.querySelector('#records')?.scrollIntoView({ block: 'start' });

  /* 넘겨 보는 줄 (홈 플랫폼 · Systems · Research 연구 분야): 화살표로 하나씩 넘김, 손가락으로 밀어도 됨.
     끝없이 돈다: 카드 묶음을 앞뒤로 한 벌씩 복사해 두고, 복사본 구간에 멈추면 같은 모양의 진짜 자리로 소리 없이 옮긴다.
     그래서 마지막 다음엔 첫 카드가 오른쪽에서 이어서 들어오고, 첫 카드에서 왼쪽으로 가면 마지막 카드가 나온다.
     data-auto="밀리초" 가 있는 줄만 저절로 넘어간다 (사용자 요청: Systems · Research).
     마우스를 올리거나 누르는 동안, 화면 밖이거나 탭이 숨겨졌을 때, 움직임 줄이기 설정이면 멈춘다. */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.rail-wrap').forEach((wrap) => {
    const rail = wrap.querySelector('.rail');
    if (!rail) return;
    const prev = wrap.querySelector('.rail-btn.prev'), next = wrap.querySelector('.rail-btn.next');
    const originals = [...rail.children];
    const count = originals.length;
    const copy = (el) => {
      const c = el.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('a, button').forEach((x) => x.setAttribute('tabindex', '-1'));
      if (c.matches('a')) c.setAttribute('tabindex', '-1');
      return c;
    };
    rail.prepend(...originals.map(copy));
    rail.append(...originals.map(copy));
    const items = [...rail.children];
    const setWidth = () => items[count].offsetLeft - items[0].offsetLeft;            // 카드 한 벌의 폭
    const step = () => items[count + 1].offsetLeft - items[count].offsetLeft;        // 카드 하나 + 사이 간격
    const home = () => { rail.scrollLeft = items[count].offsetLeft - items[0].offsetLeft; };
    // 복사본 구간에 들어가 있으면 진짜 구간의 같은 자리로 옮긴다 (보이는 모양은 같아서 티가 안 남)
    const wrapAround = () => {
      const w = setWidth();
      if (rail.scrollLeft < w - 2) rail.scrollLeft += w;
      else if (rail.scrollLeft >= 2 * w - 2) rail.scrollLeft -= w;
    };
    let settle = 0;
    rail.addEventListener('scroll', () => { clearTimeout(settle); settle = setTimeout(wrapAround, 140); }, { passive: true });
    window.addEventListener('resize', home);
    home();
    let lastTouch = 0;   // 사람이 넘긴 직후엔 잠시 쉰다
    // 넘길 때는 브라우저 기본 스크롤 대신 직접 움직인다: 1.4초 동안 천천히 출발해 천천히 멈춤
    let anim = 0, target = null;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const go = (dir) => {
      if (anim) { cancelAnimationFrame(anim); anim = 0; } else { wrapAround(); target = null; }
      const s = step(), base = items[count].offsetLeft - items[0].offsetLeft;
      const from = rail.scrollLeft;
      const k = Math.round(((target ?? from) - base) / s) + dir;      // 연달아 누르면 이어서 한 칸 더
      target = base + k * s;
      if (reduceMotion) { rail.scrollLeft = target; wrapAround(); target = null; return; }
      rail.style.scrollSnapType = 'none';                              // 움직이는 동안은 칸 맞춤을 잠시 끔
      const start = performance.now(), D = 1400;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / D);
        rail.scrollLeft = from + (target - from) * ease(t);
        if (t < 1) { anim = requestAnimationFrame(tick); return; }
        anim = 0; target = null; rail.style.scrollSnapType = ''; wrapAround();
      };
      anim = requestAnimationFrame(tick);
    };
    prev?.addEventListener('click', () => { lastTouch = Date.now(); go(-1); });
    next?.addEventListener('click', () => { lastTouch = Date.now(); go(1); });

    const delay = Number(rail.dataset.auto) || 0;
    if (!delay || reduceMotion) return;
    let hovered = false, visible = false;
    wrap.addEventListener('pointerenter', () => { hovered = true; });
    wrap.addEventListener('pointerleave', () => { hovered = false; });
    wrap.addEventListener('pointerdown', () => { lastTouch = Date.now(); });
    wrap.addEventListener('focusin', () => { hovered = true; });
    wrap.addEventListener('focusout', () => { hovered = false; });
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0.5 }).observe(wrap);
    setInterval(() => {
      if (hovered || !visible || document.hidden || Date.now() - lastTouch < delay * 1.5) return;
      go(1);
    }, delay);
  });

  // 같은 페이지 안 링크(#…)는 부드럽게 이동 (홈 첫 화면 버튼처럼 data-scroll 이 있는 건 home.js 가 따로 처리)
  const smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]:not([data-scroll])');
    const target = link && link.hash.length > 1 && document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: smooth });
    history.pushState(null, '', link.hash);
  });

  // 상자 안 스크롤(data-scroll-chain)이 끝에 닿으면, 같은 휠 동작 그대로 페이지가 이어서 내려감 (Projects 목록)
  // 브라우저는 한 번 굴리는 동안 계속 상자만 붙잡아서, 끝에서 잠깐 멈췄다 내려가는 느낌이 났음
  // → 휠은 직접 받아서: 상자가 화면에 다 들어올 때까지는 페이지, 그다음 상자, 상자 끝을 넘는 만큼은 다시 페이지 (모두 부드럽게) (터치·스크롤 막대는 브라우저 그대로)
  document.querySelectorAll('[data-scroll-chain]').forEach((box) => {
    let boxTo = null, pageTo = null, frame = 0;
    const step = () => {
      let moving = false;
      if (boxTo !== null) {
        const d = boxTo - box.scrollTop;
        const before = box.scrollTop;
        if (Math.abs(d) < 1) { box.scrollTop = boxTo; boxTo = null; } else { box.scrollTop += Math.sign(d) * Math.max(1, Math.abs(d) * 0.25); moving = true; }
        if (moving && box.scrollTop === before) { boxTo = null; moving = false; }   // 더 못 가면(끝·목록이 바뀜) 목표를 버림
      }
      if (pageTo !== null) {
        const d = pageTo - window.scrollY;
        const before = window.scrollY;
        if (Math.abs(d) < 1) { window.scrollTo({ top: pageTo, behavior: 'instant' }); pageTo = null; } else { window.scrollTo({ top: window.scrollY + Math.sign(d) * Math.max(1, Math.abs(d) * 0.25), behavior: 'instant' }); moving = true; }
        if (pageTo !== null && window.scrollY === before) pageTo = null;   // 페이지 끝 등으로 더 못 가면 목표를 버림
      }
      frame = moving ? requestAnimationFrame(step) : 0;
    };
    box.addEventListener('scroll-reset', () => { boxTo = null; pageTo = null; });
    // 상자 밖에서 스크롤하면(휠·터치·키보드·스크롤 막대) 상자 쪽 움직임은 그 자리에서 멈추고 사용자 스크롤에 양보 — 둘이 서로 끌어당기지 않게
    const yield_ = (event) => { if (frame && !box.contains(event.target)) { cancelAnimationFrame(frame); frame = 0; boxTo = null; pageTo = null; } };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((type) => window.addEventListener(type, yield_, { passive: true, capture: true }));
    box.addEventListener('wheel', (event) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      if (box.scrollHeight - box.clientHeight < 1) return;
      event.preventDefault();
      if (!frame) { boxTo = null; pageTo = null; }   // 움직이는 중이 아니면 지난 목표는 버리고 지금 위치에서 시작
      let dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * window.innerHeight : event.deltaY;
      const movePage = (by) => {
        const pageMax = document.documentElement.scrollHeight - window.innerHeight;
        pageTo = Math.min(pageMax, Math.max(0, (pageTo ?? window.scrollY) + by));
      };
      // 1) 상자가 화면에 다 들어오기 전에는 페이지부터 (내릴 땐 상자 아래 끝, 올릴 땐 머리글 밑 상자 위 끝이 보일 때까지)
      const pending = (pageTo ?? window.scrollY) - window.scrollY;   // 아직 남은 페이지 이동
      const rect = box.getBoundingClientRect();
      const top = rect.top - pending, bottom = rect.bottom - pending;
      const take = dy > 0 ? Math.min(dy, Math.max(0, bottom - window.innerHeight)) : Math.max(dy, Math.min(0, top - 64));
      if (take) { movePage(take); dy -= take; }
      // 2) 남은 만큼 상자, 3) 상자 끝을 넘친 만큼 다시 페이지
      const boxMax = box.scrollHeight - box.clientHeight;
      const from = boxTo ?? box.scrollTop;
      const next = Math.min(boxMax, Math.max(0, from + dy));
      boxTo = next;
      const rest = dy - (next - from);
      if (rest) movePage(rest);
      if (!frame) frame = requestAnimationFrame(step);
    }, { passive: false });
  });

  // 버튼(data-dialog="창 id")으로 창 열기, × 나 바깥 어두운 곳을 누르면 닫힘 (Research 주요 논문)
  document.querySelectorAll('[data-dialog]').forEach((button) => {
    const dialog = document.getElementById(button.dataset.dialog);
    if (!dialog) return;
    button.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  });

  const professorProfile = document.querySelector('#professor-profile');
  if (professorProfile && window.location.hash === '#professor-profile') professorProfile.open = true;
});
