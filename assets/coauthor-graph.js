/* Publications — 공동 연구 관계 그림.
   저자 목록이 있는 논문만 쓴다. 점 = 사람(남색 = 연구실 구성원, 회색 = 외부 공동저자), 선 = 같이 쓴 논문 (굵을수록 많이).
   자리는 처음에 한 번 계산한다. 움직임은 두 가지뿐이고 둘 다 끝나면 멈춘다 (계속 떠다니는 효과 없음):
     · 그림이 화면에 처음 들어올 때 흩어진 점들이 1.5초 동안 천천히 제자리로 모인다 (한 번만)
     · 마우스로 점을 끌면 연결된 점들이 고무줄처럼 따라오고, 놓으면 제자리로 돌아와 멈춘다 (마우스 있는 화면만)
   점에 마우스를 올리면 그 사람의 연결만 진해진다. 움직임 줄이기 설정이면 처음부터 제자리. */
document.addEventListener('DOMContentLoaded', async () => {
  const box = document.getElementById('coauthor-graph');
  if (!box) return;
  let papers;
  try {
    const response = await fetch('publications.json');
    if (!response.ok) throw new Error('publications');
    papers = (await response.json()).filter((p) => (p.authors || []).length > 1);
  } catch (e) { box.textContent = '그림을 불러오지 못했습니다.'; return; }

  /* ---------- 사람과 연결 세기 ---------- */
  const people = new Map();
  const links = new Map();
  papers.forEach((p) => {
    const names = [...new Set(p.authors.map((a) => a.name))];
    p.authors.forEach((a) => {
      const node = people.get(a.name) || { name: a.name, lab: false, papers: 0 };
      node.lab = node.lab || !!a.lab;
      people.set(a.name, node);
    });
    names.forEach((n) => { people.get(n).papers += 1; });
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const key = [names[i], names[j]].sort().join('|');
      links.set(key, (links.get(key) || 0) + 1);
    }
  });
  const nodes = [...people.values()].sort((a, b) => (b.lab - a.lab) || (b.papers - a.papers) || a.name.localeCompare(b.name));
  const index = new Map(nodes.map((n, i) => [n.name, i]));
  const edges = [...links.entries()].map(([key, w]) => { const [a, b] = key.split('|'); return { a: index.get(a), b: index.get(b), w }; });
  const countEl = document.getElementById('coauthor-paper-count');
  if (countEl) countEl.textContent = papers.length;

  /* ---------- 자리 계산 (같은 데이터면 늘 같은 그림) ---------- */
  const W = 1000, H = 620;
  const labCount = nodes.filter((n) => n.lab).length;
  nodes.forEach((n, i) => {
    const ring = n.lab ? 90 : 260;
    const k = n.lab ? i : i - labCount;
    const total = n.lab ? labCount : nodes.length - labCount;
    const angle = (k / Math.max(1, total)) * Math.PI * 2 + (n.lab ? 0 : 0.37);
    n.x = W / 2 + Math.cos(angle) * ring * 1.5;
    n.y = H / 2 + Math.sin(angle) * ring;
    n.vx = 0; n.vy = 0;
    n.r = n.lab ? 7 + Math.sqrt(n.papers) * 2.2 : 3.5;
  });
  for (let step = 0; step < 500; step++) {
    const cool = 1 - step / 500;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {   // 서로 밀어냄
      const p = nodes[i], q = nodes[j];
      let dx = p.x - q.x, dy = p.y - q.y;
      const d2 = Math.max(dx * dx + dy * dy, 25);
      const f = ((p.lab && q.lab) ? 2600 : 900) / d2;
      const d = Math.sqrt(d2); dx /= d; dy /= d;
      p.vx += dx * f; p.vy += dy * f; q.vx -= dx * f; q.vy -= dy * f;
    }
    edges.forEach(({ a, b, w }) => {                                                       // 같이 쓴 사람끼리 당김
      const p = nodes[a], q = nodes[b];
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      const rest = (p.lab && q.lab) ? 110 : 60;
      const f = (d - rest) * 0.004 * Math.min(w, 4);
      p.vx += dx / d * f; p.vy += dy / d * f; q.vx -= dx / d * f; q.vy -= dy / d * f;
    });
    nodes.forEach((n) => {                                                                  // 가운데로 (구성원은 더 세게)
      const g = n.lab ? 0.012 : 0.004;
      n.vx += (W / 2 - n.x) * g; n.vy += (H / 2 - n.y) * g * 1.6;
      n.x += Math.max(-12, Math.min(12, n.vx)) * cool; n.y += Math.max(-12, Math.min(12, n.vy)) * cool;
      n.vx *= 0.6; n.vy *= 0.6;
    });
  }
  // 그림 칸에 맞게 늘이기
  const pad = 40;
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min((W - pad * 2) / Math.max(1, maxX - minX), (H - pad * 2) / Math.max(1, maxY - minY));
  nodes.forEach((n) => { n.x = pad + (n.x - minX) * s + ((W - pad * 2) - (maxX - minX) * s) / 2; n.y = pad + (n.y - minY) * s + ((H - pad * 2) - (maxY - minY) * s) / 2; });

  /* ---------- 그리기 ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  const svg = make('svg', { viewBox: `0 0 ${W} ${H}`, class: 'coauthor-svg', role: 'img', 'aria-label': `Co-author network: ${nodes.length} people, ${papers.length} papers` });
  const edgeLayer = make('g', {}), nodeLayer = make('g', {}), labelLayer = make('g', {});
  const edgeEls = edges.map((e) => {
    const p = nodes[e.a], q = nodes[e.b];
    const line = make('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'co-edge' + (p.lab && q.lab ? ' lab' : ''), 'stroke-width': Math.min(1 + e.w * 0.8, 6) });
    edgeLayer.append(line);
    return line;
  });
  const nodeEls = nodes.map((n, i) => {
    const g = make('g', { class: 'co-node' + (n.lab ? ' lab' : ''), tabindex: '0' });
    const circle = make('circle', { cx: n.x, cy: n.y, r: n.r });
    g.append(circle);
    const label = make('text', { x: n.x, y: n.y - n.r - 6, 'text-anchor': 'middle', class: 'co-label' + (n.lab ? ' lab' : '') });
    label.textContent = n.lab ? n.name : `${n.name} · ${n.papers} papers`;
    const title = make('title', {}); title.textContent = `${n.name} · ${n.papers} papers`;
    g.append(title);
    nodeLayer.append(g);
    labelLayer.append(label);
    return { g, circle, label, i };
  });
  svg.append(edgeLayer, nodeLayer, labelLayer);
  box.replaceChildren(svg);

  /* ---------- 움직임: 제자리(hx, hy) 를 기억해 두고 거기로 돌아온다 ---------- */
  nodes.forEach((n) => { n.hx = n.x; n.hy = n.y; n.vx = 0; n.vy = 0; });
  edges.forEach((e) => { e.len = Math.hypot(nodes[e.b].hx - nodes[e.a].hx, nodes[e.b].hy - nodes[e.a].hy); });
  const draw = () => {
    nodeEls.forEach(({ circle, label, i }) => {
      const n = nodes[i];
      circle.setAttribute('cx', n.x); circle.setAttribute('cy', n.y);
      label.setAttribute('x', n.x); label.setAttribute('y', n.y - n.r - 6);
    });
    edgeEls.forEach((line, k) => {
      const p = nodes[edges[k].a], q = nodes[edges[k].b];
      line.setAttribute('x1', p.x); line.setAttribute('y1', p.y); line.setAttribute('x2', q.x); line.setAttribute('y2', q.y);
    });
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 처음 한 번: 바깥으로 흩어진 자리에서 제자리로 (새로 고침 때는 생략 — 선 수백 개를 매 순간 다시 그려 화면이 버벅여 보임)
  const reloaded = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  if (!reduce && !reloaded && 'IntersectionObserver' in window) {
    const from = nodes.map((n, i) => {
      const a = i * 2.39996;                                   // 같은 데이터면 늘 같은 흩어짐
      return { x: n.hx + (n.hx - W / 2) * 0.6 + Math.cos(a) * 60, y: n.hy + (n.hy - H / 2) * 0.6 + Math.sin(a) * 40 };
    });
    nodes.forEach((n, i) => { n.x = from[i].x; n.y = from[i].y; });
    draw();
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      io.disconnect();
      const start = performance.now(), D = 1500;
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const t = ease(Math.min(1, (now - start) / D));
        nodes.forEach((n, i) => { n.x = from[i].x + (n.hx - from[i].x) * t; n.y = from[i].y + (n.hy - from[i].y) * t; });
        draw();
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    io.observe(svg);
  }

  // 끌어 보기: 끄는 점은 마우스를 따라가고, 나머지는 선(고무줄)과 제자리로 당겨진다. 다 멈추면 계산도 멈춤
  let dragged = -1, running = false;
  const degree = nodes.map(() => 0);
  edges.forEach((e) => { degree[e.a] += 1; degree[e.b] += 1; });   // 선이 많은 점(교수님)은 덜 끌려가게 나눠서 당김 — 안 그러면 튐
  const step = () => {
    let moving = 0;
    nodes.forEach((n) => { n.fx = (n.hx - n.x) * 0.03; n.fy = (n.hy - n.y) * 0.03; });
    edges.forEach((e) => {
      const p = nodes[e.a], q = nodes[e.b];
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
      const f = (d - e.len) * 0.06 * Math.min(e.w, 3) / d;
      p.fx += dx * f / degree[e.a]; p.fy += dy * f / degree[e.a]; q.fx -= dx * f / degree[e.b]; q.fy -= dy * f / degree[e.b];
    });
    nodes.forEach((n, i) => {
      if (i === dragged) { n.vx = 0; n.vy = 0; return; }
      n.vx = (n.vx + n.fx) * 0.8; n.vy = (n.vy + n.fy) * 0.8;
      n.x += n.vx; n.y += n.vy;
      moving = Math.max(moving, Math.abs(n.vx) + Math.abs(n.vy), Math.abs(n.hx - n.x) + Math.abs(n.hy - n.y));
    });
    draw();
    if (dragged >= 0 || moving > 0.05) requestAnimationFrame(step);
    else { nodes.forEach((n) => { n.x = n.hx; n.y = n.hy; }); draw(); running = false; }
  };
  const run = () => { if (!running) { running = true; requestAnimationFrame(step); } };
  const toSvg = (event) => {
    const pt = svg.createSVGPoint(); pt.x = event.clientX; pt.y = event.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    svg.classList.add('can-drag');
    nodeEls.forEach(({ g, i }) => {
      g.addEventListener('pointerdown', (event) => {
        dragged = i; g.setPointerCapture(event.pointerId); svg.classList.add('is-dragging');
        const p = toSvg(event); nodes[i].x = p.x; nodes[i].y = p.y; run();
      });
      g.addEventListener('pointermove', (event) => {
        if (dragged !== i) return;
        const p = toSvg(event); nodes[i].x = p.x; nodes[i].y = p.y;
      });
      const drop = () => { if (dragged === i) { dragged = -1; svg.classList.remove('is-dragging'); clear(); run(); } };
      g.addEventListener('pointerup', drop);
      g.addEventListener('pointercancel', drop);
    });
  }

  // 마우스를 올린 사람의 연결만 진하게
  const neighbours = nodes.map(() => new Set());
  edges.forEach((e, k) => { neighbours[e.a].add(k); neighbours[e.b].add(k); });
  const focus = (i) => {
    svg.classList.add('is-focus');
    const near = new Set([i]);
    neighbours[i].forEach((k) => { edgeEls[k].classList.add('on'); near.add(edges[k].a); near.add(edges[k].b); });
    near.forEach((j) => { nodeEls[j].g.classList.add('on'); nodeEls[j].label.classList.add('on'); });
  };
  const clear = () => {
    svg.classList.remove('is-focus');
    svg.querySelectorAll('.on').forEach((e) => e.classList.remove('on'));
  };
  nodeEls.forEach(({ g, i }) => {
    g.addEventListener('pointerenter', () => { clear(); focus(i); });
    g.addEventListener('focus', () => { clear(); focus(i); });
    g.addEventListener('pointerleave', () => { if (dragged !== i) clear(); });
    g.addEventListener('blur', clear);
  });
});
