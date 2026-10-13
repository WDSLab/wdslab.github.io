document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.querySelector('.hamburger');
  const navigation = document.querySelector('.nav');
  menuButton?.addEventListener('click', () => {
    if (!navigation) return;
    const isOpen = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
  navigation?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navigation.classList.remove('open');
      menuButton?.setAttribute('aria-expanded', 'false');
    });
  });

  const search = document.querySelector('#search');
  const filter = document.querySelector('#filter');
  const records = [...document.querySelectorAll('#records > article')];
  const count = document.querySelector('#count');

  function updateNews() {
    const query = (search?.value || '').trim().toLocaleLowerCase();
    const category = filter?.value || '';
    let visibleCount = 0;

    records.forEach((record) => {
      const text = `${record.dataset.search || ''} ${record.textContent || ''}`.toLocaleLowerCase();
      const matches = (!query || text.includes(query))
        && (!category || record.dataset.category === category);
      record.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (count) count.textContent = `${visibleCount} / ${records.length}`;
  }

  search?.addEventListener('input', updateNews);
  filter?.addEventListener('change', updateNews);
  const author = new URLSearchParams(window.location.search).get('author');
  if (author && search && records.length) search.value = author;
  updateNews();
  if (author && records.length) document.querySelector('#records')?.scrollIntoView({ block: 'start' });

  const professorProfile = document.querySelector('#professor-profile');
  if (professorProfile && window.location.hash === '#professor-profile') professorProfile.open = true;
});
