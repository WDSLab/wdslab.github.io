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

  const addMetricCards = (info, values) => {
    const grid = el('div', 'member-metrics');
    grid.setAttribute('aria-label', 'Publication, conference, and award counts');
    [['SCIE', values.scie], ['Scopus', values.scopus], ['KCI', values.kci], ['Conference', values.conference], ['Awards', values.awards]].forEach(([label, value]) => {
      const cell = el('div', 'member-metric');
      cell.append(el('span', '', label), el('strong', '', String(value)));
      grid.append(cell);
    });
    info.append(grid);
  };

  const addLink = (item, url, label) => {
    if (!url) return;
    const link = el('a', 'member-record-link', label);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    item.append(link);
  };

  const addAchievementDetails = (info, papers, conferences, awards) => {
    const details = el('details', 'member-achievements');
    details.append(el('summary', '', `View achievements · ${papers.length + conferences.length + awards.length} records`));
    const panel = el('div', 'member-achievement-panel');

    if (papers.length) {
      panel.append(el('h4', 'member-list-heading', 'Journal publications'));
      const list = el('ul', 'member-achievement-list');
      papers.forEach((paper) => {
        const item = el('li', 'member-achievement-item');
        item.append(el('strong', 'member-record-title', paper.title));
        item.append(el('p', 'member-record-meta', [paper.year, paper.venue, paper.status].filter(Boolean).join(' · ')));
        const member = paper.authors.find((author) => author.name === memberName(info.closest('.member-detail')));
        if (member?.roles?.length) item.append(el('p', 'member-record-role', member.roles.join(' · ')));
        const doi = paper.doi ? (String(paper.doi).startsWith('http') ? paper.doi : `https://doi.org/${paper.doi}`) : '';
        addLink(item, paper.publisher_url || doi || paper.links?.paper, 'Paper / DOI ↗');
        list.append(item);
      });
      panel.append(list);
    }

    if (conferences.length) {
      panel.append(el('h4', 'member-list-heading', 'Conference achievements'));
      const list = el('ul', 'member-achievement-list');
      conferences.forEach((entry) => {
        const item = el('li', 'member-achievement-item');
        item.append(el('strong', 'member-record-title', entry.text));
        addLink(item, 'news.html', 'News archive ↗');
        list.append(item);
      });
      panel.append(list);
    }

    if (awards.length) {
      panel.append(el('h4', 'member-list-heading', 'Awards'));
      const list = el('ul', 'member-achievement-list');
      awards.forEach((entry) => {
        const item = el('li', 'member-achievement-item');
        item.append(el('strong', 'member-record-title', entry.text));
        addLink(item, 'news.html', 'News archive ↗');
        list.append(item);
      });
      panel.append(list);
    }

    details.append(panel);
    info.append(details);
  };

  Promise.all([
    fetch('publications.json').then((response) => { if (!response.ok) throw new Error('publications'); return response.json(); }),
    fetch('news.html').then((response) => { if (!response.ok) throw new Error('news'); return response.text(); })
  ]).then(([publications, newsHtml]) => {
    const newsDocument = new DOMParser().parseFromString(newsHtml, 'text/html');
    const newsItems = [...newsDocument.querySelectorAll('.news-original-item')].map((node) => ({
      text: node.textContent.replace(/\s+/g, ' ').trim(),
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

      const achievementLink = info.querySelector('.member-achievement-link');
      achievementLink?.remove();
      if (!info.querySelector('.member-metrics')) addMetricCards(info, { scie, scopus, kci, conference: conferenceEvents.size, awards: awards.length });
      addAchievementDetails(info, papers, conferences, awards);
    });
  }).catch(() => {
    cards.forEach((card) => {
      const info = card.querySelector('.member-info');
      if (!info) return;
      if (!info.querySelector('.member-metrics')) addMetricCards(info, { scie: '—', scopus: '—', kci: '—', conference: '—', awards: '—' });
    });
  });
})();
