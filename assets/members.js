(() => {
  // 교수님 이력 세 묶음: HTML 은 늘 펼쳐 둔(open) 채로 두고, 좁은 화면(860px 이하)에서는 CSS 가 내용을 숨긴다 (members.css `.pi-cv-part:not([data-user-open])`).
  // 스크립트가 open 을 바꾸지 않으니 열 때·새로 고침 때 화면이 밀리지 않는다. 제목을 누르면 data-user-open 만 켜고 끈다 (넓은 화면은 제목을 못 누름 — CSS pointer-events)
  document.querySelectorAll('.pi-cv-part > summary').forEach((summary) => summary.addEventListener('click', (event) => {
    event.preventDefault();
    summary.parentElement.toggleAttribute('data-user-open');
  }));
})();

(() => {
  // Apply metrics and achievement details only to student member cards.
  const studentRoles = new Set(['Ph.D.', 'Integrated M.S.–Ph.D.', 'M.S.']);
  const cards = [...document.querySelectorAll('.member-detail')].filter((card) =>
    studentRoles.has(card.querySelector('.member-info small')?.textContent.trim())
  );
  if (!cards.length) return;

  const scopusVenues = new Set([
    'Annals of Intensive Care',
    'Applied Sciences',
    'ICIC Express Letters',
    'ICIC Express Letters Part B',
    'IEEE Access',
    'IEEE Transactions on Pattern Analysis and Machine Intelligence',
    'IEEE Transactions on Services Computing',
    'Information Processing & Management',
    'International Journal of Cooperative Information Systems',
    'International Journal of Industrial Ergonomics',
    'Journal of Forecasting',
    'Korean Circulation Journal',
    'Maritime Transport Research',
    'Ocean Engineering',
    'Transportation Research Part D: Transport and Environment'
  ]);
  const kciVenues = new Set(['Korean Circulation Journal']);
  const conferencePattern = /학회|학술대회|conference|assembly|oral presentation|대학생경진대회/i;
  const presentationPattern = /발표|oral presentation|발표상|우수논문|수상|best paper/i;
  const awardPattern = /수상|award|prize|best paper|excellence award|우수상|우수논문상|우수발표상|대상|최우수|장관상|시장상|회장상|금상|은상|동상|포스터상/i;
  const eventNamePattern = /Arctic Circle Assembly|ICECET\s*20\d{2}|ICECT\s*20\d{2}|ICICIC\s*20\d{2}|XRM\s*20\d{2}|LOGMS\s*20\d{2}|ICAIIC\s*20\d{2}|CogMI\s*20\d{2}|한국산업경영시스템학회\s*춘계학술대회|춘계대한산업공학회|추계대한산업공학회|하계한국자료분석학회|동계CDE학회|대한산업공학회\s*대학생경진대회/i;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const memberName = (card) => card.querySelector('.member-info h3 span')?.textContent.trim() || '';
  const koreanName = (card) => {
    const heading = card.querySelector('.member-info h3');
    return heading ? [...heading.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('').trim() : '';
  };

  // 숫자 줄: 페이지에 미리 그려 둔 칸(people.html)이 있으면 숫자만 채움, 없으면 새로 만듦
  const addMetricCards = (info, values) => {
    const cells = [['SCIE', values.scie], ['Scopus', values.scopus], ['KCI', values.kci], ['Conference', values.conference], ['Awards', values.awards]];
    const ready = info.querySelector('.member-metrics');
    if (ready) { ready.querySelectorAll('strong').forEach((strong, i) => { strong.textContent = String(cells[i]?.[1] ?? '—'); }); return; }
    const grid = el('div', 'member-metrics');
    grid.setAttribute('aria-label', 'Publication, conference, and award counts');
    cells.forEach(([label, value]) => {
      const cell = el('div', 'member-metric');
      cell.append(el('span', '', label), el('strong', '', String(value)));
      grid.append(cell);
    });
    info.append(grid);
  };

  // 저자 역할은 데이터엔 한글로 두고 화면엔 영어로 (Publications 와 같은 이름)
  const roleNames = { '제1저자': 'First author', '교신저자': 'Corresponding author' };

  // 링크 한 줄: 사이트의 다른 곳(_includes/paper-links.html)과 같은 모양 · 같은 이름 · 같은 순서
  const addLinks = (item, links) => {
    const shown = links.filter(([url]) => url);
    if (!shown.length) return;
    const row = el('span', 'paper-links');
    shown.forEach(([url, label, external = true]) => {
      const link = el('a', '', label);
      link.href = url;
      if (external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      row.append(link);
    });
    item.append(row);
  };
  // 논문 주소 고르는 순서도 Publications 와 같음: DOI → 논문 주소 → (옛 칸) doi → 출판사
  const paperLinks = (paper) => {
    const l = paper.links || {};
    const doi = paper.doi ? (String(paper.doi).startsWith('http') ? paper.doi : `https://doi.org/${paper.doi}`) : '';
    return [[l.doi || l.paper || doi || paper.publisher_url, 'Paper ↗'], [l.github, 'Code ↗'], [l.arxiv, 'arXiv ↗'], [l.ssrn, 'SSRN ↗']];
  };

  // 실적 목록은 카드 안에서 펼치지 않고 화면 위 창으로 띄운다 (주변 카드가 밀리지 않게)
  const dialog = el('dialog', 'member-dialog');
  const dialogTitle = el('h3', 'member-dialog-title');
  const closeButton = el('button', 'member-dialog-close', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close');
  const dialogBody = el('div', 'member-dialog-body');
  const dialogHead = el('div', 'member-dialog-head');
  dialogHead.append(dialogTitle, closeButton);
  dialog.append(dialogHead, dialogBody);
  document.body.append(dialog);
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });   // 바깥 어두운 곳을 누르면 닫힘

  const addAchievementDetails = (info, papers, conferences, awards) => {
    const total = papers.length + conferences.length + awards.length;
    const ready = info.querySelector('.member-achievements');   // 미리 그려 둔 버튼이 있으면 그걸 씀
    const button = ready || el('button', 'member-achievements');
    button.textContent = `View achievements · ${total} records`;
    button.type = 'button';
    const panel = el('div', 'member-achievement-panel');

    if (papers.length) {
      panel.append(el('h4', 'member-list-heading', 'Journal publications'));
      const list = el('ul', 'member-achievement-list');
      papers.forEach((paper) => {
        const item = el('li', 'member-achievement-item');
        item.append(el('strong', 'member-record-title', paper.title));
        item.append(el('p', 'member-record-meta', [paper.year, paper.venue, paper.status].filter(Boolean).join(' · ')));
        const member = paper.authors.find((author) => author.name === memberName(info.closest('.member-detail')));
        if (member?.roles?.length) item.append(el('p', 'member-record-role', member.roles.map((r) => roleNames[r] || r).join(' · ')));
        addLinks(item, paperLinks(paper));
        list.append(item);
      });
      panel.append(list);
    }

    if (conferences.length) {
      panel.append(el('h4', 'member-list-heading', 'Conference achievements'));
      const list = el('ul', 'member-achievement-list');
      conferences.forEach((entry) => {
        const item = el('li', 'member-achievement-item');
        item.append(el('strong', 'member-record-title', entry.body));
        if (entry.date) item.append(el('p', 'member-record-meta', entry.date));
        addLinks(item, [['news.html', 'News ↗', false]]);
        list.append(item);
      });
      panel.append(list);
    }

    if (awards.length) {
      panel.append(el('h4', 'member-list-heading', 'Awards'));
      const list = el('ul', 'member-achievement-list');
      awards.forEach((entry) => {
        const item = el('li', 'member-achievement-item');
        item.append(el('strong', 'member-record-title', entry.body));
        if (entry.date) item.append(el('p', 'member-record-meta', entry.date));
        addLinks(item, [['news.html', 'News ↗', false]]);
        list.append(item);
      });
      panel.append(list);
    }

    if (!total) panel.append(el('p', 'member-no-records', 'No records yet.'));
    const card = info.closest('.member-detail');
    button.addEventListener('click', () => {
      dialogTitle.textContent = `${koreanName(card)} ${memberName(card)}`;
      dialogBody.replaceChildren(panel);
      dialog.showModal();
      dialogBody.scrollTop = 0;
    });
    if (!ready) info.append(button);
  };

  Promise.all([
    fetch('publications.json').then((response) => { if (!response.ok) throw new Error('publications'); return response.json(); }),
    fetch('news.html').then((response) => { if (!response.ok) throw new Error('news'); return response.text(); })
  ]).then(([publications, newsHtml]) => {
    const newsDocument = new DOMParser().parseFromString(newsHtml, 'text/html');
    const newsItems = [...newsDocument.querySelectorAll('.news-original-item')].map((node) => ({
      text: node.textContent.replace(/\s+/g, ' ').trim(),   // 고르는 기준(학회·수상 찾기)은 그대로 전체 글자
      body: (() => {   // 창에 보이는 글: 소식 본문만 (날짜·링크 글자가 붙지 않게, 줄바꿈은 띄어쓰기로)
        const p = node.querySelector('.news-body p')?.cloneNode(true);
        if (!p) return node.textContent.replace(/\s+/g, ' ').trim();
        p.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
        return p.textContent.replace(/\s+/g, ' ').trim();
      })(),
      date: node.querySelector('time')?.textContent.trim() || '',
      category: node.getAttribute('data-category') || ''
    }));

    cards.forEach((card) => {
      const name = memberName(card);
      const korean = koreanName(card);
      const info = card.querySelector('.member-info');
      if (!name || !info) return;

      const papers = publications.filter((paper) => paper.category === 'International Journal' && (paper.authors || []).some((author) => author.name === name))
        .sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
      const publishedJournals = papers.filter((paper) => paper.status === 'Published' && paper.category === 'International Journal');
      const hasImpactFactor = (paper) => paper.if_as_listed_on_original !== null && paper.if_as_listed_on_original !== undefined && paper.if_as_listed_on_original !== '';
      const scie = publishedJournals.filter(hasImpactFactor).length;
      const scopus = publishedJournals.filter((paper) => !hasImpactFactor(paper) && scopusVenues.has(paper.venue)).length;
      const kci = publishedJournals.filter((paper) => kciVenues.has(paper.venue)).length;
      const conferences = newsItems.filter((item) => item.text.includes(korean) && conferencePattern.test(item.text) && presentationPattern.test(item.text));
      const awards = newsItems.filter((item) => item.text.includes(korean) && (item.category.toUpperCase() === 'AWARDS' || awardPattern.test(item.text)));
      const conferenceEvents = new Set(conferences.map((item) => {
        const year = item.date.match(/20\d{2}/)?.[0] || '';
        const event = item.text.match(eventNamePattern)?.[0]?.replace(/\s+/g, ' ').trim().toLowerCase() || item.text;
        return `${year}|${event}`;
      }));

      addMetricCards(info, { scie, scopus, kci, conference: conferenceEvents.size, awards: awards.length });
      addAchievementDetails(info, papers, conferences, awards);
    });
  }).catch(() => {
    cards.forEach((card) => {
      const info = card.querySelector('.member-info');
      if (!info) return;
      addMetricCards(info, { scie: '—', scopus: '—', kci: '—', conference: '—', awards: '—' });
    });
  });
})();
