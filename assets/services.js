/* Services 세로 회전문: 무대(.svc-stage)가 고정된 채 스크롤 위치에 따라 장(.svc-slide)들의 세로 자리를 바로 정한다.
   진행도 prog = (스크롤 - 구간 시작) / (구간 길이 - 무대 높이) × 장 수 (0~N). 장 i 는 (i - prog) 를 장 수로 감아(−N/2 ~ N/2) × 무대 높이 × 0.7 만큼 위아래로 — 순환이라 마지막 장 아래에 첫 장, 첫 장 위에 마지막 장.
   prog 가 N 에 닿으면(첫 장이 다시 가운데) 스크롤을 구간 시작으로 소리 없이 되돌린다(같은 그림이라 티 안 남). 첫 장에서 ▲ 는 반대로 끝으로 옮긴 뒤 N−1 로 간다.
   멀어질수록 연해지고(1 − 거리×0.7), 다 연해지면 숨김. 전환 효과 없이 스크롤에 붙어 움직임 (사용자 요청).
   ▲▼ 단추·4초 자동 넘김 = 그 장의 스크롤 위치로 부드럽게 스크롤(site.js wdsScrollTo) — 스크롤로 넘기는 것과 같은 길. 사용자가 휠·터치·키를 쓰면 6초 쉬고, 캡처 위에 마우스가 있거나(설명 쪽은 상관없음) 탭이 안 보이면 안 돈다.
   판정은 스크롤·크기 바뀜 때 rAF 로 한 번씩. 휴대폰(무대가 sticky 가 아님)에서는 자리를 건드리지 않는다 */
(() => {
  const track = document.querySelector('#svc-track');
  const stage = document.querySelector('#svc-stage');
  const slides = [...document.querySelectorAll('.svc-slide')];
  const indexEl = document.querySelector('#svc-index');
  const footer = document.querySelector('.footer');
  if (!track || !stage || slides.length < 2) return;
  const TOP = 190;   // services.css --svc-top (머리글 65 + 제목 띠 125, 선 포함)
  let current = 0, frameId = 0, stacked = false, prog = 0, lastUser = 0, hovering = false, noSnap = false;
  const N = slides.length;
  const isStage = () => getComputedStyle(stage).position === 'sticky';
  const geo = () => { const stageH = stage.offsetHeight; return { stageH, range: Math.max(1, track.offsetHeight - stageH), start: track.getBoundingClientRect().top + window.scrollY - TOP }; };
  const pick = () => {
    frameId = 0;
    if (!isStage()) {   // 휴대폰: 세로로 쌓인 상태 — 스크립트가 넣은 값만 지운다
      if (stacked) return;
      slides.forEach((s) => { s.style.transform = ''; s.style.opacity = ''; s.style.visibility = ''; });
      stacked = true; return;
    }
    stacked = false;
    if (footer) track.style.setProperty('--svc-bottom', `${footer.offsetHeight}px`);   // 구간 아래 여백도 같이 바뀜 (CSS margin-bottom)   // 고정된 푸터의 실제 높이만큼 무대를 줄인다 (CSS 기본값 106px 은 어림값)
    const { stageH, range, start } = geo();   // start = 무대가 고정되기 시작하는 스크롤 위치
    prog = Math.min(N, Math.max(0, (window.scrollY - start) / range * N));
    if (prog >= N - 0.0005 && !noSnap) { window.scrollTo(0, start); prog = 0; }   // 끝(첫 장이 다시 가운데) = 처음과 같은 그림 → 처음으로 되돌림
    if (prog < N - 0.5) noSnap = false;
    slides.forEach((s, i) => {
      let d = i - prog; d = ((d + N / 2) % N + N) % N - N / 2;   // 장 수로 감아 −N/2 ~ N/2 (순환)
      const far = Math.abs(d);
      // 값을 빈칸으로 두면 CSS 의 첫 상태(둘째 장부터 숨김·아래로)가 되살아나므로 늘 명시적으로 쓴다
      const alpha = Math.max(0, 1 - far * 0.7);
      s.style.transform = far < 0.0005 ? 'none' : `translateY(${(d * stageH * 0.7).toFixed(1)}px)`;
      s.style.opacity = alpha.toFixed(3);
      s.style.visibility = alpha <= 0 ? 'hidden' : 'visible';
    });
    const next = Math.round(prog) % N;
    if (next !== current) { current = next; if (indexEl) indexEl.textContent = String(current + 1); }
  };
  const onScroll = () => { if (!frameId) frameId = requestAnimationFrame(pick); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  pick();

  // 단추·자동 넘김: k 번째 장이 가운데 오는 스크롤 위치로 부드럽게. k = N 은 첫 장이 아래에서 올라오는 것(도착하면 pick 이 처음으로 되돌림), k = −1 은 끝으로 소리 없이 옮긴 뒤 N−1 로
  const smooth = (y) => (window.wdsScrollTo || ((top) => window.scrollTo({ top, behavior: 'smooth' })))(y);
  const goTo = (k) => {
    const { range, start } = geo();
    if (k < 0) { noSnap = true; window.scrollTo(0, start + range); k += N; }
    smooth(start + range * Math.min(N, k) / N);
  };
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
    const r = stage.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= innerHeight) return;   // 무대가 화면에 없으면(위 제목 띠 구간 등) 안 돈다
    goTo(Math.round(prog) + 1);
  }, 4000);
})();
