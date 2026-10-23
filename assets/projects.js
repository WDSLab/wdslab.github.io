/* Projects
   1) 진행 중 · 완료를 기간으로 자동 판단: 끝나는 달이 지나면 Completed (보는 날 기준, 데이터의 status 는 쓰지 않음)
   2) 목록 위 진행 중 과제 기간 표(간트 차트): 줄마다 과제 하나, 같은 연도 눈금, 진한 부분 = 지난 기간, 세로선 = 오늘
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

  // 기간 표: 눈금은 "지금"을 중심으로 고정 (지난해 1월 ~ 3년 뒤 12월). 끝나는 순서로 줄 세움.
  // 줄 이름은 기관(발주처), 과제 이름·기간은 마우스를 올리면. 6개월 안에 끝나는 과제는 강조색. 눈금을 넘는 과제는 막대를 자르고 오른쪽에 "→ 끝나는 해".
  const box = document.querySelector('#ongoing-timeline');
  if (!box) return;
  if (!ongoing.length) { box.hidden = true; return; }
  ongoing.sort((a, b) => a.end - b.end || a.start - b.start);
  const from = (now.getFullYear() - 1) * 12, to = (now.getFullYear() + 4) * 12;
  const pct = (m) => Math.min(100, Math.max(0, ((m - from) / (to - from)) * 100));
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const years = [];
  for (let y = from / 12; y < to / 12; y++) years.push(`<span style="left:${pct(y * 12)}%">${y}</span>`);
  const rows = ongoing.map((i) => {
    const over = i.end > to;
    const visibleEnd = Math.min(i.end, to);
    const done = Math.min(1, Math.max(0, (today - i.start) / (visibleEnd - i.start)));
    const soon = i.end - thisMonth <= 6;
    const size = over ? `left:${pct(i.start)}%;right:44px` : `left:${pct(i.start)}%;width:${pct(i.end) - pct(i.start)}%`;
    return `<li title="${esc(i.title)} · ${esc(i.period)} · ${Math.round(((today - i.start) / (i.end - i.start)) * 100)}% elapsed"><span class="tl-name">${esc(i.funder || i.title)}</span><span class="tl-track"><span class="tl-bar${soon ? ' soon' : ''}" style="${size}"><i style="width:${done * 100}%"></i></span>${over ? `<b class="tl-more">→ ${esc(i.endYear)}</b>` : ''}</span></li>`;
  }).join('');
  box.innerHTML = `<div class="tl-axis"><span class="tl-name"></span><span class="tl-track">${years.join('')}</span></div>
    <ol class="tl-rows">${rows}</ol>
    <div class="tl-today-layer" aria-hidden="true"><span class="tl-name"></span><span class="tl-track"><span class="tl-today" style="left:${pct(today)}%"><b>Today</b></span></span></div>
    <p class="tl-note">진한 부분 = 지난 기간 · 하늘색 = 6개월 안에 끝남 · → = 눈금 밖까지 · 과제 이름은 마우스를 올리면</p>`;
})();
