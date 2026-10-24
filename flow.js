// The auto-publish flow in the Roblox entry: six pixel icons, and a line of
// detail for whichever step is hovered, focused, or tapped.
(() => {
  'use strict';

  const ICONS = {
    studio: [
      '############', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#',
      '############', '.....##.....', '....####....', '...######...', '............', '............',
    ],
    review: [
      '.##########.', '.#........#.', '.#......#.#.', '.#.....##.#.', '.#.#..##..#.', '.#.####...#.',
      '.#..##....#.', '..#......#..', '...#....#...', '....#..#....', '.....##.....', '............',
    ],
    event: [
      '.....####...', '....####....', '...####.....', '..####......', '.#########..', '....#####...',
      '....####....', '...####.....', '...###......', '..###.......', '..##........', '.##.........',
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

  for (const flow of document.querySelectorAll('.flow')) {
    const detail = flow.querySelector('.flow-detail');
    const hint = detail.textContent;
    const steps = [...flow.querySelectorAll('.flow-step')];

    for (const step of steps) {
      const c = step.querySelector('canvas').getContext('2d');
      c.fillStyle = '#fff4e8';
      ICONS[step.dataset.step].forEach((row, y) => {
        for (let x = 0; x < 12; x++) if (row[x] === '#') c.fillRect(x, y, 1, 1);
      });

      const show = () => {
        for (const s of steps) s.classList.toggle('is-on', s === step);
        detail.textContent = `${step.textContent.trim()}: ${step.dataset.detail}`;
      };
      step.addEventListener('pointerenter', show);
      step.addEventListener('focus', show);
      step.addEventListener('click', show);
    }

    flow.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      for (const s of steps) s.classList.remove('is-on');
      detail.textContent = hint;
    });
  }
})();
