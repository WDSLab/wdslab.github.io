// 부드럽게 굴러가기 (쪽 넘기기 등에서 씀): 브라우저 기본 smooth 는 빠르기를 정할 수 없어 직접 굴린다.
// 거리에 따라 0.8~1.3초, 처음과 끝은 느리게. 굴러가는 동안 휠·터치·키·마우스를 쓰면 바로 멈추고 사용자에게 양보. 움직임 줄이기 설정이면 바로 이동
window.wdsScrollTo = (top) => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const to = Math.min(max, Math.max(0, top));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { window.scrollTo(0, to); return; }
  const from = window.scrollY, dist = to - from;
  if (Math.abs(dist) < 1) return;
  const D = Math.min(1300, 800 + Math.abs(dist) * 0.2);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const start = performance.now();
  const types = ['wheel', 'touchstart', 'keydown', 'mousedown'];
  let frame = 0;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; types.forEach((type) => window.removeEventListener(type, stop, true)); };
  types.forEach((type) => window.addEventListener(type, stop, { passive: true, capture: true }));
  const step = (now) => {
    const t = Math.min(1, (now - start) / D);
    window.scrollTo(0, from + dist * ease(t));
    if (t < 1) frame = requestAnimationFrame(step); else stop();
  };
  frame = requestAnimationFrame(step);
};

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
      // 쪽을 넘기면 그 구간의 제목(탭 줄 · h2)이 머리글 아래 보이는 자리까지 천천히 올라감 (wdsScrollTo — 위쪽)
      const anchor = list.closest('section')?.querySelector('.tabs, h2') || list;
      window.wdsScrollTo(anchor.getBoundingClientRect().top + window.scrollY - 88);
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

  const restart = () => { page = 1; updateNews(); };   // 검색어·종류·연도를 바꾸면 첫 페이지부터
  search?.addEventListener('input', restart);
  filter?.addEventListener('change', restart);
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((other) => other.setAttribute('aria-selected', String(other === tab)));
    restart();
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
      let jumped = false;
      if (rail.scrollLeft < w - 2) { rail.scrollLeft += w; jumped = true; }
      else if (rail.scrollLeft >= 2 * w - 2) { rail.scrollLeft -= w; jumped = true; }
      // 순간 이동 뒤에는 가운데 강조도 전환 없이 바로 옮긴다 — 안 그러면 같은 모양의 카드가 다시 밝아지며 "뚝" 끊겨 보임
      if (jumped && focusCenter) { rail.classList.add('no-transition'); focusCenter(); void rail.offsetWidth; rail.classList.remove('no-transition'); }
    };
    // data-focus-center: 보이는 카드 가운데 것만 선명(.is-center), 나머지는 CSS 가 연하게 (Research Areas)
    // 판정은 넘기기 시작할 때(목표 자리 기준) 한 번, 손으로 밀어 멈춘 뒤 한 번만 — 스크롤 중에 매번 하면 전환이 겹쳐 버벅인다
    const focusCenter = rail.hasAttribute('data-focus-center') ? (at = rail.scrollLeft) => {
      const s = step(); if (!s) return;
      const left = Math.round(at / s), visible = Math.max(1, Math.round(rail.clientWidth / s));
      const center = left + Math.floor(visible / 2);
      items.forEach((it, i) => it.classList.toggle('is-center', i === center));
    } : null;
    let settle = 0;
    rail.addEventListener('scroll', () => { clearTimeout(settle); settle = setTimeout(() => { wrapAround(); focusCenter?.(); }, 140); }, { passive: true });
    window.addEventListener('resize', () => { home(); focusCenter?.(); });
    home(); focusCenter?.();
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
      focusCenter?.(target);                                           // 가운데 강조는 목표 자리 기준으로 지금 바로 (움직임과 함께 한 번만)
      if (reduceMotion) { rail.scrollLeft = target; wrapAround(); target = null; return; }
      rail.style.scrollSnapType = 'none';                              // 움직이는 동안은 칸 맞춤을 잠시 끔
      const start = performance.now(), D = 1000;   // 한 장 넘어가는 시간 (6초·1.4초는 느리다는 지적 → 4초·1초)
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
    // 가운데 강조 줄(data-focus-center): 양옆의 연한 카드를 누르면 그 카드가 가운데로 오도록 넘어간다 (사용자 요청)
    if (focusCenter) rail.addEventListener('click', (event) => {
      const card = event.target.closest('.rail > *');
      if (!card || card.classList.contains('is-center')) return;
      const s = step(); if (!s) return;
      const center = Math.round(rail.scrollLeft / s) + Math.floor(Math.max(1, Math.round(rail.clientWidth / s)) / 2);
      const i = items.indexOf(card);
      if (i < 0 || i === center) return;
      event.preventDefault();
      lastTouch = Date.now();
      go(i - center);
    });

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

// 스크롤 떠오름 (site.css): 구간 내용이 화면 아래쪽 12% 선을 넘어오면 .is-in — 한 번만. 열 때 이미 보이는 것은 전환 없이 바로(reveal-init).
// 한 구간에 묶음이 둘이면(제목 + 넘김 줄) 두 번째는 0.12초 뒤에. 판정은 스크롤·크기 바뀜 때 직접 잰다 (IntersectionObserver 만 믿으면 그리기가 멈춘 탭에서 영영 안 보일 수 있음)
(() => {
  const root = document.documentElement;
  let pending = [...document.querySelectorAll('main .section > .shell')];
  if (!pending.length) return;
  pending.forEach((el) => { const i = [...el.parentElement.children].filter((c) => c.classList.contains('shell')).indexOf(el); if (i > 0) el.style.transitionDelay = `${i * 0.12}s`; });
  const check = () => {
    const line = window.innerHeight * 0.88;
    pending = pending.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < line && r.bottom > 0 || r.top < 0) { el.classList.add('is-in'); return false; }   // 화면에 들어왔거나 이미 지나간 것
      return true;
    });
    if (!pending.length) { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); }
  };
  let frame = 0;
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; check(); }); };
  root.classList.add('reveal-init');
  check();                                                            // 열 때 보이는 것은 바로
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('reveal-init')));
  setTimeout(() => root.classList.remove('reveal-init'), 400);         // 안전장치: 그리기가 멈춰 있어도 전환 끄기는 풀린다
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();

  // 홈: 첫 화면 위에서는 머리글이 남색 바·흰 글자, 첫 화면이 머리글 밑으로 지나가면 흰 바·남색 글자 (site.css .home:not(.hero-passed))
  const homeHero = document.body.classList.contains('home') ? document.querySelector('#hero') : null;
  if (homeHero) {
    const mark = () => document.body.classList.toggle('hero-passed', homeHero.getBoundingClientRect().bottom <= 64);
    mark();
    window.addEventListener('scroll', mark, { passive: true });
    window.addEventListener('resize', mark);
  }

  // 같은 페이지 안 링크(#…)는 쪽 넘김과 같은 느린 스크롤(wdsScrollTo)로 — 목표는 머리글 아래 88px (홈 첫 화면 버튼처럼 data-scroll 이 있는 건 home.js 가 따로 처리)
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]:not([data-scroll])');
    const target = link && link.hash.length > 1 && document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    window.wdsScrollTo(target.getBoundingClientRect().top + window.scrollY - 88);
    history.pushState(null, '', link.hash);
  });

  const professorProfile = document.querySelector('#professor-profile');
  if (professorProfile && window.location.hash === '#professor-profile') professorProfile.open = true;
});
