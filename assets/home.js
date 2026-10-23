/* 홈 첫 화면 — 제목 "What is Data Science ?" 의 물음표가 별이 되어 느낌표로 바뀐다
   스크롤 장면 (.hero-pin 220vh 동안 첫 화면 고정):
     0 ~ 0.5    제목이 물음표를 중심으로 커지며 가운데로 온다. 설명·버튼은 먼저 사라진다.
                배경의 별들이 그 물음표 자리로 모여들고, 글자 ? 는 별 ? 에 자리를 내주며 사라진다
     0.55 ~ 0.85 별 ? 의 별들이 자리를 옮겨 별 ! 가 된다
     0.78 ~ 1   큰 ! 가 가운데 큰 문장 "What is Data Science!" 끝자리로 들어가 앉는다
   별은 3겹: 가만히 있을 땐 몇 개만 느리게 깜빡이고, 마우스를 움직이면 겹마다 몇 px 반대로 움직여 깊이감.
   움직임 줄이기 설정이면 전부 정지 그림. */
document.addEventListener('DOMContentLoaded', () => {
  const pin = document.querySelector('#hero-pin');
  const hero = document.querySelector('#hero');
  const mark = hero?.querySelector('.mark');
  const copy = hero?.querySelector('.hero-copy');
  const finalText = hero?.querySelector('.hero-final');
  const bang = hero?.querySelector('.hero-bang');
  const finalMark = hero?.querySelector('.final-mark');
  const cue = hero?.querySelector('.scroll-cue:not(.cue-end)');
  const cueEnd = hero?.querySelector('.cue-end');
  let bangDX = 0, bangDY = 0, bangScale = 1;   // 큰 ! 가 문장 끝 자리로 가는 길
  const bg = hero?.querySelector('.hero-bg');
  const photo = hero?.querySelector('.hero-photo');   // 배경 지구 사진 (스크롤하면 사라짐)
  const campus = hero?.querySelector('.hero-campus'); // 학교 사진 (장면 끝에 작게 나타나 커진다)
  if (!hero || !mark || !copy || !bg) return;
  const words = hero.querySelector('.words');
  const copyRest = [...copy.children].filter((el) => el.tagName !== 'H1');
  const canHover = window.matchMedia('(hover: hover)').matches;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---------- 스크롤 진행률 0~1 ---------- */
  let progress = 0, beyond = 0;   // beyond: 고정 구간이 끝난 뒤 더 내려간 거리(px)
  function readProgress() {
    if (!pin) { progress = 0; beyond = 0; return; }
    const r = pin.getBoundingClientRect();
    const total = pin.offsetHeight - hero.offsetHeight;
    // 홈은 머리글이 첫 화면 위에 떠 있어(site.css .home .header) 첫 화면이 화면 맨 위(0)부터 시작한다
    progress = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    beyond = total > 0 ? Math.max(0, -r.top - total) : 0;
  }
  const easeInOut = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

  /* ---------- 글자 모양 점 자리 (단위 좌표, 글자 가운데 기준) ---------- */
  const SAMPLE = 420, STEP = 7;
  function sample(ch) {
    const off = document.createElement('canvas'); off.width = SAMPLE * 1.3; off.height = SAMPLE * 1.3;
    const o = off.getContext('2d');
    o.fillStyle = '#000';
    o.font = `800 ${SAMPLE}px "Pretendard Variable", Pretendard, sans-serif`;
    o.textAlign = 'center'; o.textBaseline = 'alphabetic';
    o.fillText(ch, off.width / 2, off.height / 2 + SAMPLE * 0.36);
    const px = o.getImageData(0, 0, off.width, off.height).data, pts = [];
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let y = STEP / 2; y < off.height; y += STEP) for (let x = STEP / 2; x < off.width; x += STEP) {
      if (px[((y | 0) * off.width + (x | 0)) * 4 + 3] > 128) { pts.push({ x, y }); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;           // 글자 상자의 가운데를 원점으로
    const out = pts.map((p) => ({ x: (p.x - cx) / SAMPLE, y: (p.y - cy) / SAMPLE }));
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }

  /* ---------- 자리 재기 ---------- */
  const ctx = bg.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, markX = 0, markY = 0, originX = 0, originY = 0, markSize = 0, bigSize = 0;
  let poleX = 0, poleY = 0, R = 0;   // 하늘이 도는 축(북극성 자리)과 하늘 반지름 — 축은 사진의 지평선 높이에 둔다 (별 궤적 사진처럼, 사용자 요청)
  let stars = [], unitQ = [], unitE = [];
  const par = { x: 0, y: 0, tx: 0, ty: 0 };

  // 글자의 실제 잉크(눈에 보이는 모양)의 가운데. 글자 상자의 가운데와 달라서, 이걸로 맞춰야 점 글자와 정확히 겹친다
  const inkCenter = (el, ch) => {
    const cs = getComputedStyle(el), m = document.createElement('canvas').getContext('2d');
    m.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const t = m.measureText(ch);
    const probe = document.createElement('span');                      // 글자 바닥선(baseline) 높이를 재는 빈 조각
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.appendChild(probe);
    const baseline = probe.getBoundingClientRect().top;
    probe.remove();
    return { x: el.getBoundingClientRect().left + (t.actualBoundingBoxRight - t.actualBoundingBoxLeft) / 2,
             y: baseline + (t.actualBoundingBoxDescent - t.actualBoundingBoxAscent) / 2 };
  };

  function layout() {
    const r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    bg.width = W * dpr; bg.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const saved = copy.style.transform; copy.style.transform = 'none';
    const cr = copy.getBoundingClientRect();
    const g = inkCenter(mark, '?');                                        // 글자 ? 의 잉크 가운데
    markX = g.x - r.left; markY = g.y - r.top;
    originX = g.x - cr.left; originY = g.y - cr.top;
    markSize = parseFloat(getComputedStyle(mark).fontSize);
    copy.style.transform = saved;
    bigSize = Math.min(H * 0.66, W * 0.45);                                 // 별 ?·! 의 글자 크기
    if (bang) {                                                             // 글자 ! 의 잉크 가운데를 별 ! 가운데(W/2, H*0.42)에
      bang.style.fontSize = `${bigSize}px`; bang.style.left = '0'; bang.style.top = '0';
      bang.style.transform = '';
      const b = inkCenter(bang, '!');
      const ox = b.x - r.left, oy = b.y - r.top;                           // 상자 왼쪽 위에서 잉크 가운데까지
      const left = W / 2 - ox, top = H * 0.42 - oy;
      bang.style.left = `${left}px`; bang.style.top = `${top}px`;
      if (finalMark && finalText) {                                         // 문장 끝 ! 의 잉크 가운데로 날아가 앉도록
        const savedT = finalText.style.transform; finalText.style.transform = 'none';
        const f = inkCenter(finalMark, '!');
        bangScale = parseFloat(getComputedStyle(finalMark).fontSize) / bigSize;
        finalText.style.transform = savedT;
        bangDX = (f.x - r.left) - left - bangScale * ox; bangDY = (f.y - r.top) - top - bangScale * oy;
      }
    }

    // 회전 축: 가로 가운데, 세로는 사진의 지평선(없거나 아직 안 읽혔으면 화면 72%). 반지름은 축에서 가장 먼 모서리까지
    poleX = W / 2; poleY = H * 0.72;
    if (photo && photo.naturalWidth) { const sc = Math.max(W / photo.naturalWidth, H / photo.naturalHeight), shown = photo.naturalHeight * sc; poleY = (H - shown) * 0.6 + Number(photo.dataset.horizon || 0.68) * shown; }
    R = Math.hypot(W / 2, Math.max(poleY, H - poleY));
    unitQ = sample('?'); unitE = sample('!');
    const n = Math.max(unitQ.length, unitE.length);
    const pad = (arr) => { const out = arr.slice(); while (out.length < n) out.push(arr[Math.floor(Math.random() * arr.length)]); return out; };
    unitQ = pad(unitQ); unitE = pad(unitE);

  // 하늘의 별 + 물음표가 될 별(처음엔 안 보임)
  // 네모 화면에 고르게 뿌리지 않고, 화면 가운데를 천정으로 한 둥근 하늘(타원) 안에 뿌린다 — 땅에서 올려다본 밤하늘처럼 (사용자 요청)
  // 자리는 각도·반지름으로 두고(frame 에서 x·y 로), 하늘 전체가 가운데를 축으로 아주 천천히 돈다. 가장자리로 갈수록 조금 흐리다
  const count = Math.round(W * H / 700);
  stars = [];
  for (let i = 0; i < count + n; i++) {
    const mine = i >= count;
    const layer = mine ? Math.random() : Math.pow(Math.random(), 2.2);   // 대부분 멀고 흐리게, 몇 개만 가깝고 밝게
    const rad = Math.sqrt(Math.random());                                   // 원 안에 고르게 (반지름 1 = 화면 모서리까지 — 하늘은 정원)
    stars.push({
      ang: Math.random() * Math.PI * 2, rad, layer, r: 0.35 + Math.pow(layer, 1.6) * 1.9,   // 대부분 아주 작고 몇 개만 큼
      tint: Math.random() < 0.72 ? '255,255,255' : (Math.random() < 0.55 ? '255,240,214' : '206,222,255'),   // 색 온도: 흰 · 노르스름 · 푸르스름
      a: (0.18 + layer * 0.7) * (1 - 0.45 * Math.pow(rad, 4)),             // 가장자리로 갈수록 조금 흐리게
      twinkle: !mine && Math.random() < 0.12, ph: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 0.5,
      q: mine ? unitQ[i - count] : null, e: mine ? unitE[i - count] : unitE[i % n],   // 끝엔 하늘의 별 전부가 ! 자리로 모인다
      jx: (Math.random() - .5) * 3, jy: (Math.random() - .5) * 3,
    });
  }
}

/* ---------- 매 프레임 ---------- */
  function frame() {
    const p = progress;
    // 고정 구간(300vh)을 장면별로 나눈다. 숫자는 진행률 0~1
    const t1 = easeInOut(seg(p, 0, 0.24));                 // 제목이 커지며 가운데로
    const appear = seg(p, 0.21, 0.29);                     // 글자 ? → 별 ? (바꿔치기)
    const scatter = easeInOut(seg(p, 0.31, 0.5));          // 별 ? 가 흩어져 우주로
    const gather = easeInOut(seg(p, 0.5, 0.7));            // 하늘의 별 전부가 모여 !
    const solid = seg(p, 0.7, 0.75);                       // 별 ! → 글자 !
    const land = easeInOut(seg(p, 0.78, 0.92));            // 큰 ! 가 천천히 작아지며 문장 끝자리로
    const cx = W / 2, cy = H * 0.42;
    if (bang) {
      bang.style.opacity = p >= 1 ? 0 : solid;              // 문장이 다 나타난 뒤에 문장 속 ! 와 바꿔치기
      bang.style.transform = land > 0 ? `translate(${bangDX * land}px, ${bangDY * land}px) scale(${1 + (bangScale - 1) * land})` : '';
    }
    if (finalMark) finalMark.style.opacity = p >= 1 ? 1 : 0;

    // 제목: 물음표가 별 ? 와 같은 크기·자리가 되도록 커진다
    const zoom = 1 + (bigSize / markSize - 1) * t1;
    copy.style.transformOrigin = `${originX}px ${originY}px`;
    // 맨 위에선 변형을 완전히 풀어야 글자가 또렷하게 그려진다 (scale(1) 이라도 걸려 있으면 흐릿해짐)
    copy.style.transform = t1 > 0 ? `translate(${(cx - markX) * t1}px, ${(cy - markY) * t1}px) scale(${zoom})` : '';
    const sub = 1 - seg(t1, 0, 0.2);                       // 설명·버튼·숫자는 먼저
    for (const el of copyRest) el.style.opacity = sub;
    if (words) words.style.opacity = 1 - seg(t1, 0.3, 0.85); // "What is Data Science" 는 커지면서 사라진다
    mark.style.opacity = 1 - appear;                        // 글자 ? 는 별 ? 가 나타나면 사라진다
    copy.style.pointerEvents = t1 > 0.2 ? 'none' : '';
    // 배경 사진은 장면이 시작되면 서서히 사라져 별만 남는다. 사진이 보이는 동안 별은 지평선 위에만 (지구 위엔 안 그림 — 사용자 요청)
    const photoA = photo ? 1 - seg(p, 0, 0.22) : 0;
    let horizonY = Infinity;
    if (photo) {
      photo.style.opacity = photoA;
      if (photoA > 0 && photo.naturalWidth) {   // object-fit: cover · object-position: center 60% 와 같은 계산 (site.css .hero-photo)
        const scale = Math.max(W / photo.naturalWidth, H / photo.naturalHeight), shown = photo.naturalHeight * scale;
        horizonY = (H - shown) * 0.6 + Number(photo.dataset.horizon || 0.68) * shown;
      }
    }
    cue?.classList.toggle('is-hidden', p > 0.01);           // 스크롤을 시작하면 "스크롤" 신호는 사라짐
    cueEnd?.classList.toggle('is-hidden', p < 0.97 || beyond > innerHeight * 0.45);   // "What is Data Science!" 가 다 나오면 같은 자리에 "연구 분야" 신호, 화면 절반 가까이 더 내려가면 사라짐
    if (finalText) finalText.style.opacity = easeOut(seg(p, 0.9, 1));    // ! 가 먼저 앉고, 그 앞에 큰 문장이 제자리에서 나타난다
    // 학교 사진: ! 가 내려앉는 동안(0.8~1) 별 위로 서서히 나타나며, 화면을 꽉 채운 채 1.0→1.08 로 천천히 커진다 — 우주에서 학교로 다가오는 느낌.
    // 작은 네모가 커지는 식은 테두리가 보여 인위적이라 뺌 (사용자 지적). 다 나타난 뒤엔 1.08 그대로
    if (campus) {
      const land2 = easeOut(seg(p, 0.8, 1));
      campus.style.opacity = land2;
      campus.style.transform = land2 > 0 ? `scale(${(1 + 0.08 * land2).toFixed(4)})` : '';
    }

    // 별
    const t = performance.now() / 1000;
    const fly = scatter * (1 - gather) * 0.5;              // 흩어지는 동안 하늘도 조금 바깥으로 흐른다
    par.x += (par.tx - par.x) * 0.05; par.y += (par.ty - par.y) * 0.05;
    ctx.clearRect(0, 0, W, H);
    for (const st of stars) {
      const depth = 0.3 + st.layer;
      // 둥근 하늘(정원)이 가운데(천정)를 축으로 천천히 돈다. 마우스를 따라 겹마다 조금씩 어긋나 깊이감
      const ang = st.ang + t * 0.012;   // 한 바퀴 약 9분 (느리지만 보면 도는 게 느껴지는 정도 — 사용자 요청으로 더 돌게)
      let x = poleX + Math.cos(ang) * st.rad * R + par.x * depth * 6;
      let y = poleY + Math.sin(ang) * st.rad * R + par.y * depth * 6;
      if (fly > 0) { x = W / 2 + (x - W / 2) * (1 + fly * depth * 0.6); y = H / 2 + (y - H / 2) * (1 + fly * depth * 0.6); }
      let rad = st.r, a = st.a;
      if (st.twinkle) a *= 0.55 + 0.45 * Math.sin(t * st.sp + st.ph);
      if (st.q) {
        if (appear <= 0) continue;                          // 아직 글자 ? 가 있을 땐 안 보인다
        const qx = cx + st.q.x * bigSize + st.jx, qy = cy + st.q.y * bigSize + st.jy;   // ? 자리
        const ex = cx + st.e.x * bigSize + st.jx, ey = cy + st.e.y * bigSize + st.jy;   // ! 자리
        const sx = qx + (x - qx) * scatter, sy = qy + (y - qy) * scatter;               // 흩어진 자리 (하늘의 제 자리로)
        x = sx + (ex - sx) * gather; y = sy + (ey - sy) * gather;
        const star = scatter * (1 - gather);                // 우주의 별일 때 1
        rad = 1.9 + (st.r - 1.9) * star;
        a = (0.95 + (st.a - 0.95) * star) * appear * (1 - solid);   // 글자 ! 가 나타나면 별은 사라진다
      } else if (gather > 0) {                              // 하늘의 별도 전부 ! 로 모인다
        const ex = cx + st.e.x * bigSize + st.jx, ey = cy + st.e.y * bigSize + st.jy;
        x += (ex - x) * gather; y += (ey - y) * gather;
        rad += (1.9 - rad) * gather; a = (a + (0.95 - a) * gather) * (1 - solid);
      }
      if (x < -2 || x > W + 2 || y < -2 || y > H + 2) continue;
      if (!st.q && photoA > 0 && y > horizonY - 30) {   // 지평선 아래는 사진이 보이는 만큼 가림 (60px 띠로 부드럽게)
        a *= 1 - photoA * Math.min(1, (y - horizonY + 30) / 60);
        if (a < 0.01) continue;
      }
      // 별 궤적: 땅에서 오래 찍은 밤하늘 사진처럼 별마다 가운데(천정)를 도는 짧은 호를 꼬리로 단다 — 바깥 별일수록 길게 (사용자 요청)
      // 장면이 시작되면(t1) 꼬리는 사라지고 점만 남아 ?·! 장면은 그대로. 물음표가 될 별(q)은 꼬리 없음
      if (!st.q && t1 < 1 && st.rad > 0.06) {
        const L = (0.06 + st.layer * 0.07) * (1 - t1);
        ctx.strokeStyle = `rgba(${st.tint},${a * 0.5})`; ctx.lineWidth = Math.max(0.6, rad * 0.9);
        ctx.beginPath(); ctx.arc(poleX + par.x * depth * 6, poleY + par.y * depth * 6, st.rad * R, ang - L, ang); ctx.stroke();
      }
      if (rad > 1.3 && !st.q) { ctx.fillStyle = `rgba(${st.tint},${a * 0.16})`; ctx.beginPath(); ctx.arc(x, y, rad * 3, 0, Math.PI * 2); ctx.fill(); }   // 밝은 별은 은은하게 번짐
      ctx.fillStyle = `rgba(${st.tint},${a})`;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
  }

  if (canHover) {
    hero.addEventListener('mousemove', (e) => { const r = hero.getBoundingClientRect(); par.tx = -((e.clientX - r.left) / r.width - 0.5); par.ty = -((e.clientY - r.top) / r.height - 0.5); });
    hero.addEventListener('mouseleave', () => { par.tx = 0; par.ty = 0; });
  }

  /* 첫 화면 버튼: 홈 안의 구간으로 부드럽게 내려간다 (첫 화면 장면이 그대로 재생됨) */
  document.querySelectorAll('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      // 직접 굴린다. 구간마다 빠르기를 다르게 (사용자 요청):
      //   ? 가 커지는 앞부분(진행률 0~0.29)은 빠르게 0.9초 → 별이 ! 가 되는 가운데(0.29~0.78)는 2.6초
      //   → ! 가 앉고 "What is Data Science!" 가 나오는 끝(0.78~1)은 1.4초, 다 나오면 0.15초 머묾 → 아래 구간으로 0.8초
      // 빠르기는 구간 경계에서 이어서 바뀌고(멈칫 없음), 머물기 직전과 도착 직전에는 서서히 줄어든다.
      const root = document.documentElement, savedBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';            // CSS 의 부드러운 스크롤과 겹치면 서로 상쇄되므로 잠시 끈다
      const total = pin.offsetHeight - hero.offsetHeight;
      const start = pin.getBoundingClientRect().top + window.scrollY;   // 진행률 0 인 스크롤 위치 (첫 화면은 맨 위 0 부터)
      const at = (p) => start + p * total;
      const yA = at(0.29), yB = at(0.78), yC = at(1);
      // 맨 아래 "스크롤" 신호(data-scroll="scene")는 "What is Data Science!" 가 다 나온 자리에서 멈춘다
      const to = a.dataset.scroll === 'scene' ? yC : target.getBoundingClientRect().top + window.scrollY - 64;
      const speeds = [(yA - start) / 0.9, (yB - yA) / 2.6, (yC - yB) / 1.4, to > yC ? (to - yC) / 0.8 : (yC - yB) / 1.4];   // px/초 (장면 끝에서 멈출 땐 마지막 빠르기를 앞 구간과 같게)
      const edges = [yA, yB, yC], W = 80;            // 경계 앞뒤 80px 에서 두 빠르기를 섞음
      const speedAt = (y) => {
        let i = edges.findIndex((e) => y < e); if (i < 0) i = 3;
        if (i > 0 && y - edges[i - 1] < W) return speeds[i - 1] + (speeds[i] - speeds[i - 1]) * ((y - edges[i - 1] + W) / (2 * W));
        if (i < 3 && edges[i] - y < W) return speeds[i] + (speeds[i + 1] - speeds[i]) * ((W - (edges[i] - y)) / (2 * W));
        return speeds[i];
      };
      let y = window.scrollY, held = y >= yC - 1, holdUntil = 0, rampFrom = performance.now(), last = rampFrom;
      // 내려가는 도중에 사람이 직접 스크롤하면 바로 멈춘다
      let stopped = false;
      const stop = () => { stopped = true; };
      const events = ['wheel', 'touchstart', 'keydown'];
      events.forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
      const done = () => { root.style.scrollBehavior = savedBehavior; events.forEach((ev) => window.removeEventListener(ev, stop)); };
      requestAnimationFrame(function step() {
        if (stopped) return done();
        const now = performance.now();                                     // 프레임 시각은 클릭 시각보다 앞설 수 있어 직접 잼
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
        if (now < holdUntil) return requestAnimationFrame(step);           // 연구실 이름이 다 나온 채로 잠깐 머묾
        let v = speedAt(y) * Math.min(1, Math.max(0.3, 0.3 + (now - rampFrom) / 300));   // 출발할 때는 서서히 빨라짐
        const stopAt = held ? to : yC;
        v = Math.min(v, Math.max(40, (stopAt - y) * 5));                   // 멈출 곳에 가까워지면 줄어듦 (짧게)
        y = Math.min(stopAt, y + v * dt);
        window.scrollTo(0, y);
        if (stopAt - y < 0.5) {
          if (held) return done();
          held = true; holdUntil = now + 150; rampFrom = holdUntil;
        }
        requestAnimationFrame(step);
      });
    });
  });

  const ready = document.fonts?.ready || Promise.resolve();
  if (photo && !photo.complete) photo.addEventListener('load', () => { layout(); readProgress(); }, { once: true });   // 사진 크기를 알아야 지평선(회전 축)을 맞출 수 있다
  ready.then(() => {
    layout(); readProgress();
    window.addEventListener('resize', () => { layout(); readProgress(); });
    window.addEventListener('scroll', readProgress, { passive: true });
    requestAnimationFrame(function loop() { frame(); requestAnimationFrame(loop); });
  });
});

/* 최근 소식 사진 칸: 사진 기록의 행사별 대표 사진을 5초마다 하나씩, 겹쳐 흐려지며(0.8초) 넘긴다. 끝나면 처음부터.
   마우스를 올리면 멈추고, 화면 밖이거나 탭이 숨겨졌을 때도 멈춘다. 움직임 줄이기 설정이면 첫 사진에 머문다. */
document.addEventListener('DOMContentLoaded', () => {
  const figure = document.querySelector('.news-photo');
  const data = document.getElementById('news-photos');
  if (!figure || !data) return;
  const photos = JSON.parse(data.textContent);
  if (photos.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const caption = figure.querySelector('figcaption');
  const front = figure.querySelector('img');
  const back = front.cloneNode();           // 다음 사진을 뒤에 미리 깔아 두고, 앞 사진을 흐리게 해서 넘김
  back.classList.add('is-hidden');
  figure.insertBefore(back, front);
  let index = 0, shown = front, hidden = back, hovered = false, visible = false;
  figure.addEventListener('mouseenter', () => { hovered = true; });
  figure.addEventListener('mouseleave', () => { hovered = false; });
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.3 }).observe(figure);
  setInterval(() => {
    if (hovered || !visible || document.hidden) return;
    index = (index + 1) % photos.length;
    const p = photos[index];
    const next = new Image();
    next.onload = () => {
      hidden.src = p.src; hidden.alt = p.caption;
      hidden.classList.remove('is-hidden'); shown.classList.add('is-hidden');
      [shown, hidden] = [hidden, shown];
      caption.textContent = p.caption;
    };
    next.src = p.src;
  }, 5000);
});
