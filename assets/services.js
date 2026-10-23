/* Services 세로 회전문: 무대(.svc-stage)가 고정된 채 스크롤 위치에 따라 장(.svc-slide)들의 세로 자리를 바로 정한다.
   스크롤 구간은 장 수 + 1 칸: 진행도 prog = (스크롤 − 구간 시작) / (구간 길이 − 무대 높이) × (N+1) − 1 → −1 ~ N.
   장 i 는 (i − prog) 를 장 수로 감아(−N/2 ~ N/2) × 무대 높이 × 0.7 만큼 위아래로 — 순환이라 마지막 장 아래에 첫 장, 첫 장 위에 마지막 장.
   prog = −1 은 N−1 과, prog = N 은 0 과 같은 그림이라 거기 닿으면 스크롤을 반대쪽 같은 그림 자리로 소리 없이 옮긴다.
   → 첫 장에서 위로 굴려도 "맨 위" 벽에 안 부딪히고 마지막 장이 바로 내려온다 (벽에 부딪힌 뒤 옮기던 방식은 첫 틱이 먹히지 않아 버벅였음 — 사용자 지적).
   처음 열면 prog 0(첫 장) 자리로 스크롤을 맞춘다(머리글·제목 띠·무대·푸터가 다 고정이라 화면은 그대로).
   멀어질수록 연해지고(1 − 거리×0.7), 다 연해지면 숨김. 전환 효과 없이 스크롤에 붙어 움직임 (사용자 요청).
   ▲▼ 단추·4초 자동 넘김 = 그 장의 스크롤 위치로 부드럽게 스크롤(site.js wdsScrollTo). 사용자가 휠·터치·키를 쓰면 6초 쉬고, 캡처 위에 마우스가 있거나(설명 쪽은 상관없음) 탭이 안 보이면 안 돈다.
   판정은 스크롤·크기 바뀜 때 rAF 로 한 번씩. 휴대폰(무대가 sticky 가 아님)에서는 자리를 건드리지 않는다 */
(() => {
  const track = document.querySelector('#svc-track');
  const stage = document.querySelector('#svc-stage');
  const slides = [...document.querySelectorAll('.svc-slide')];
  const indexEl = document.querySelector('#svc-index');
  const footer = document.querySelector('.footer');
  if (!track || !stage || slides.length < 2) return;
  const TOP = 190;   // services.css --svc-top (머리글 65 + 제목 띠 125, 선 포함)
  const N = slides.length, STEPS = N + 1;
  let current = 0, frameId = 0, stacked = false, prog = 0, lastUser = 0, hovering = false;
  const isStage = () => getComputedStyle(stage).position === 'sticky';
  const geo = () => { const stageH = stage.offsetHeight; return { stageH, range: Math.max(1, track.offsetHeight - stageH), start: track.getBoundingClientRect().top + window.scrollY - TOP }; };
  const posOf = (k) => { const { range, start } = geo(); return start + range * (k + 1) / STEPS; };   // k 번째 장이 가운데 오는 스크롤 위치 (k = −1 ~ N)
  const pick = () => {
    frameId = 0;
    if (!isStage()) {   // 휴대폰: 세로로 쌓인 상태 — 스크립트가 넣은 값만 지운다
      if (stacked) return;
      slides.forEach((s) => { s.style.transform = ''; s.style.opacity = ''; s.style.visibility = ''; });
      stacked = true; return;
    }
    stacked = false;
    if (footer) track.style.setProperty('--svc-bottom', `${footer.offsetHeight}px`);   // 고정된 푸터의 실제 높이만큼 무대를 줄인다 (CSS 기본값 108px 은 어림값). 구간 아래 여백도 같이 바뀜
    const { stageH, range, start } = geo();
    prog = (window.scrollY - start) / range * STEPS - 1;
    if (prog >= N - 0.0005) { window.scrollTo(0, posOf(0)); prog = 0; }          // 끝(첫 장이 다시 가운데) → 첫 장 자리로
    else if (prog <= -1 + 0.0005) { window.scrollTo(0, posOf(N - 1)); prog = N - 1; }   // 맨 앞(마지막 장이 가운데) → 마지막 장 자리로
    slides.forEach((s, i) => {
      let d = i - prog; d = ((d + N / 2) % N + N) % N - N / 2;   // 장 수로 감아 −N/2 ~ N/2 (순환)
      const far = Math.abs(d), alpha = Math.max(0, 1 - far * 0.7);
      // 값을 빈칸으로 두면 CSS 의 첫 상태(둘째 장부터 숨김·아래로)가 되살아나므로 늘 명시적으로 쓴다
      s.style.transform = far < 0.0005 ? 'none' : `translateY(${(d * stageH * 0.7).toFixed(1)}px)`;
      s.style.opacity = alpha.toFixed(3);
      s.style.visibility = alpha <= 0 ? 'hidden' : 'visible';
    });
    const next = ((Math.round(prog) % N) + N) % N;
    if (next !== current) { current = next; if (indexEl) indexEl.textContent = String(current + 1); }
  };
  const onScroll = () => { if (!frameId) frameId = requestAnimationFrame(pick); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (isStage() && window.scrollY <= geo().start + 1) window.scrollTo(0, posOf(0));   // 처음 열 때: 첫 장 자리 (새로 고침으로 자리가 복원된 경우는 그대로)
  pick();

  // 단추·자동 넘김: k 번째 장 자리로 부드럽게. k = N 은 첫 장이 아래에서, k = −1 은 마지막 장이 위에서 오는 것 (도착하면 pick 이 같은 그림 자리로 옮김)
  const smooth = (y) => (window.wdsScrollTo || ((top) => window.scrollTo({ top, behavior: 'smooth' })))(y);
  const goTo = (k) => smooth(posOf(Math.max(-1, Math.min(N, k))));
  document.querySelector('.svc-nav')?.addEventListener('click', (e) => {
    const b = e.target.closest('.svc-btn'); if (!b) return;
    lastUser = performance.now(); goTo(Math.round(prog) + (b.classList.contains('next') ? 1 : -1));
  });
  const touch = () => { lastUser = performance.now(); };
  window.addEventListener('wheel', touch, { passive: true }); window.addEventListener('touchstart', touch, { passive: true }); window.addEventListener('keydown', touch);
  slides.forEach((s) => { const f = s.querySelector('.svc-frame'); f?.addEventListener('mouseenter', () => { hovering = true; }); f?.addEventListener('mouseleave', () => { hovering = false; }); });   // 캡처 위에서만 멈춤
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  setInterval(() => {
    if (reduce.matches || document.hidden || hovering || !isStage() || performance.now() - lastUser < 6000) return;
    const r = stage.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= innerHeight) return;   // 무대가 화면에 없으면 안 돈다
    goTo(Math.round(prog) + 1);
  }, 4000);
})();
