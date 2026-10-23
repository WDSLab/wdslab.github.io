/* Projects
   1) 진행 중 · 완료를 기간으로 자동 판단: 끝나는 달이 지나면 Completed (보는 날 기준, 데이터의 status 는 쓰지 않음)
   2) 목록 위 진행 중 과제 달력 카드(projects.html(/projects/) 이 빌드 때 미리 그림): 진행 막대와 남은 달 수를 보는 날 기준으로 다시 맞추고, 4초마다 저절로 다음 장으로 넘긴다
   site.js 의 탭 고르기보다 먼저 분류해야 해서 DOMContentLoaded 를 기다리지 않고 바로 실행 (defer 라 목록은 이미 읽혀 있음) */
(() => {
  const list = document.querySelector('#records');
  if (!list) return;
  const now = new Date();
  const thisMonth = now.getFullYear() * 12 + now.getMonth();
  const today = thisMonth + (now.getDate() - 1) / 31;
  const month = (text) => { const [y, m] = text.split('.').map(Number); return y * 12 + (m - 1); };   // 2026.08 → 달 번호

  const counts = { ongoing: 0, completed: 0 };
  const ongoing = [];
  list.querySelectorAll('.project').forEach((row) => {
    const period = row.querySelector('time')?.textContent.trim() || '';
    const match = period.match(/(\d{4}\.\d{2})\s*[–-]\s*(\d{4}\.\d{2})/);
    if (!match) { counts[row.dataset.category] = (counts[row.dataset.category] || 0) + 1; return; }   // 기간을 못 읽으면 데이터의 상태 그대로
    const start = month(match[1]), end = month(match[2]) + 1;   // 끝 달은 그 달 끝까지
    const status = end <= thisMonth ? 'completed' : 'ongoing';
    row.dataset.category = status;
    counts[status] += 1;
    if (status === 'ongoing') ongoing.push({ title: row.querySelector('h3')?.textContent.trim() || '', funder: (row.querySelector('p')?.textContent || '').split('·')[0].trim(), endYear: match[2].slice(0, 4), period, start, end });
  });

  // 탭 옆 숫자도 자동 분류 결과로
  document.querySelectorAll('[role="tab"][data-filter]').forEach((tab) => {
    const n = tab.querySelector('span');
    if (n && counts[tab.dataset.filter] !== undefined) n.textContent = counts[tab.dataset.filter];
  });

  // 달력 카드 넘기기: ▼ 다음 장이 위에서 내려오며 나타나고 지금 장은 아래로 사라짐 (▲ 는 반대). 한 번에 하나만 움직임, 0.5초
  const stack = document.querySelector('.tl-stack');
  if (stack) {
    const cards = [...stack.querySelectorAll('.tl-card')];
    const countEl = document.querySelector('.tl-count b');
    let cur = Math.max(0, cards.findIndex((c) => c.classList.contains('is-active')));
    let timer = 0;
    const show = (k, rev) => {
      const next = (k + cards.length) % cards.length;
      if (!cards.length || next === cur) return;
      stack.classList.toggle('rev', rev);
      const old = cards[cur];
      cards.forEach((c) => c.classList.remove('is-leaving'));
      old.classList.remove('is-active'); old.classList.add('is-leaving');
      clearTimeout(timer); timer = setTimeout(() => old.classList.remove('is-leaving'), 520);
      cards[next].classList.add('is-active');
      cur = next;
      if (countEl) countEl.textContent = String(cur + 1);
    };
    let lastTouch = 0;   // 직접 넘긴 직후엔 잠시 쉰다
    document.querySelector('.tl-btn.prev')?.addEventListener('click', () => { lastTouch = Date.now(); show(cur - 1, true); });
    document.querySelector('.tl-btn.next')?.addEventListener('click', () => { lastTouch = Date.now(); show(cur + 1, false); });
    // 4초마다 저절로 다음 장 (사용자 요청). 마우스를 올리거나 누르는 동안, 화면 밖이거나 탭이 숨겨졌을 때, 움직임 줄이기 설정이면 멈춤 — 홈 넘김 줄과 같은 규칙
    const wrap = stack.closest('.tl-wrap') || stack;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let hovered = false, visible = false;
      wrap.addEventListener('pointerenter', () => { hovered = true; });
      wrap.addEventListener('pointerleave', () => { hovered = false; });
      wrap.addEventListener('focusin', () => { hovered = true; });
      wrap.addEventListener('focusout', () => { hovered = false; });
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0.5 }).observe(wrap);
      setInterval(() => {
        if (hovered || !visible || document.hidden || Date.now() - lastTouch < 6000) return;
        show(cur + 1, false);
      }, 4000);
    }
  }

// 달력 카드: 빌드 날과 보는 날이 다르면 막대·남은 달이 어긋나므로 같은 기준으로 다시 맞춘다 (대개 같아서 아무것도 안 바뀜)
document.querySelectorAll('.tl-card').forEach((card) => {
  const start = Number(card.dataset.start), end = Number(card.dataset.end), cur = thisMonth + 1;   // 데이터의 달 번호는 year*12+month(1~12)
  const pct = Math.min(100, Math.max(0, ((cur - start) / (end - start + 1)) * 100));
  const bar = card.querySelector('.tl-bar i');
  if (bar) bar.style.width = `${pct.toFixed(1)}%`;
  const left = end - cur;
  const el = card.querySelector('.tl-left');
  if (el) el.textContent = left <= 0 ? '이번 달 종료' : `${left}개월 남음`;
});
})();
