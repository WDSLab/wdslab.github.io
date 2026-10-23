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
    if (status === 'ongoing') ongoing.push({ title: row.querySelector('h3')?.textContent.trim() || '', period, start, end });
  });

  // 탭 옆 숫자도 자동 분류 결과로
  document.querySelectorAll('[role="tab"][data-filter]').forEach((tab) => {
    const n = tab.querySelector('span');
    if (n && counts[tab.dataset.filter] !== undefined) n.textContent = counts[tab.dataset.filter];
  });

  // 기간 표
  const box = document.querySelector('#ongoing-timeline');
  if (!box) return;
  if (!ongoing.length) { box.hidden = true; return; }
  ongoing.sort((a, b) => a.start - b.start || a.end - b.end);
  const from = Math.floor(Math.min(...ongoing.map((i) => i.start)) / 12) * 12;   // 첫해 1월부터
  const to = Math.ceil(Math.max(...ongoing.map((i) => i.end)) / 12) * 12;        // 끝해 12월까지
  const pct = (m) => ((m - from) / (to - from)) * 100;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const years = [];
  const yearStep = Math.max(1, Math.ceil((to - from) / 12 / (window.innerWidth <= 640 ? 4 : 8)));   // 연도 글자가 겹치지 않게 (휴대폰은 4개 안팎, 넓은 화면은 8개 안팎)
  for (let y = from / 12; y <= to / 12; y += yearStep) years.push(`<span style="left:${pct(y * 12)}%">${y}</span>`);
  const rows = ongoing.map((i) => {
    const done = Math.min(1, Math.max(0, (today - i.start) / (i.end - i.start)));
    return `<li title="${esc(i.title)} · ${esc(i.period)} · ${Math.round(done * 100)}% elapsed"><span class="tl-name">${esc(i.title)}</span><span class="tl-track"><span class="tl-bar" style="left:${pct(i.start)}%;width:${pct(i.end) - pct(i.start)}%"><i style="width:${done * 100}%"></i></span></span></li>`;
  }).join('');
  box.innerHTML = `<div class="tl-axis"><span class="tl-name"></span><span class="tl-track">${years.join('')}</span></div>
    <ol class="tl-rows">${rows}</ol>
    <div class="tl-today-layer" aria-hidden="true"><span class="tl-name"></span><span class="tl-track"><span class="tl-today" style="left:${pct(today)}%"><b>Today</b></span></span></div>`;
})();
