// Dot-matrix icons, the nav's current-section marker, and the auto-publish
// pipeline in the Roblox entry.
(() => {
  'use strict';

  // Each icon is a 12x12 grid. Every # becomes one dot.
  const ICONS = {
    bolt: [
      '.....####...', '....####....', '...####.....', '..####......', '.#########..', '....#####...',
      '....####....', '...####.....', '...###......', '..###.......', '..##........', '.##.........',
    ],
    dumbbell: [
      '............', '............', '##........##', '##........##', '###......###', '############',
      '############', '###......###', '##........##', '##........##', '............', '............',
    ],
    lens: [
      '..####......', '.##..##.....', '##....##....', '#......#....', '#......#....', '##....##....',
      '.##..##.....', '..#####.....', '......###...', '.......###..', '........###.', '.........##.',
    ],
    check: [
      '............', '..........##', '.........###', '........###.', '.......###..', '##....###...',
      '###..###....', '.######.....', '..####......', '...##.......', '............', '............',
    ],
    robot: [
      '.....##.....', '.....##.....', '..########..', '.##########.', '.#..####..#.', '.#..####..#.',
      '.##########.', '.###....###.', '..########..', '...##..##...', '..###..###..', '............',
    ],
    nodes: [
      '....####....', '....####....', '.....##.....', '....#..#....', '...#....#...', '..#......#..',
      '.#........#.', '###......###', '###......###', '###......###', '............', '............',
    ],
    studio: [
      '############', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#',
      '############', '.....##.....', '....####....', '...######...', '............', '............',
    ],
    review: [
      '.##########.', '.#........#.', '.#......#.#.', '.#.....##.#.', '.#.#..##..#.', '.#.####...#.',
      '.#..##....#.', '..#......#..', '...#....#...', '....#..#....', '.....##.....', '............',
    ],
    workflow: [
      '...#####....', '..#.....##..', '.#........#.', '.#.......###', '.#........#.', '............',
      '.#........#.', '###.......#.', '.#........#.', '..##.....#..', '....#####...', '............',
    ],
    publish: [
      '.....##.....', '....####....', '...######...', '.....##.....', '.....##.....', '##...##...##',
      '#..........#', '#..........#', '#..........#', '#..........#', '############', '............',
    ],
    catalog: [
      '############', '#.#.#.#.#.##', '############', '.#........#.', '.#.##..##.#.', '.#.##..##.#.',
      '.#........#.', '.#..####..#.', '.#..#..#..#.', '.#..#..#..#.', '.##########.', '............',
    ],
  };

  for (const el of document.querySelectorAll('.dots[data-icon]')) {
    const rows = ICONS[el.dataset.icon];
    if (!rows) continue;
    let dots = '';
    rows.forEach((row, y) => {
      for (let x = 0; x < 12; x++) if (row[x] === '#') dots += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42"/>`;
    });
    el.innerHTML = `<svg viewBox="0 0 12 12" fill="currentColor">${dots}</svg>`;
  }

  // Nav: mark the section being read.
  const links = new Map([...document.querySelectorAll('.nav a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]));
  const seen = new Set();
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id);
    // The first section on screen, in page order, is the current one.
    let current = null;
    for (const id of links.keys()) if (seen.has(id)) { current = id; break; }
    for (const [id, a] of links) id === current ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
  }, { rootMargin: '-35% 0px -55% 0px' });
  for (const id of links.keys()) {
    const el = id !== 'top' && document.getElementById(id);
    if (el) spy.observe(el);
  }

  // Pipeline: hovering, focusing, or tapping a step shows what it does.
  for (const pipe of document.querySelectorAll('.pipe')) {
    const detail = pipe.querySelector('.pipe-detail');
    const hint = detail.textContent;
    const steps = [...pipe.querySelectorAll('button')];

    const show = (step) => {
      for (const s of steps) s.classList.toggle('is-on', s === step);
      detail.textContent = `${step.textContent.trim()}: ${step.dataset.detail}`;
    };

    for (const step of steps) {
      step.addEventListener('pointerenter', () => show(step));
      step.addEventListener('focus', () => show(step));
      step.addEventListener('click', () => show(step));
    }

    pipe.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      for (const s of steps) s.classList.remove('is-on');
      detail.textContent = hint;
    });
  }
})();
