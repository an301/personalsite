// Pixel badges for the about section, in the spirit of 2K's badge screen.
// Each badge is a hex drawn at 26x28 and scaled 2x with crisp pixels.
(() => {
  'use strict';

  const ICONS = {
    bolt: [
      '.....####...',
      '....####....',
      '...####.....',
      '..####......',
      '.#########..',
      '....#####...',
      '....####....',
      '...####.....',
      '...###......',
      '..###.......',
      '..##........',
      '.##.........',
    ],
    dumbbell: [
      '............',
      '............',
      '##........##',
      '##........##',
      '###......###',
      '############',
      '############',
      '###......###',
      '##........##',
      '##........##',
      '............',
      '............',
    ],
    lens: [
      '..####......',
      '.##..##.....',
      '##....##....',
      '#......#....',
      '#......#....',
      '##....##....',
      '.##..##.....',
      '..#####.....',
      '......###...',
      '.......###..',
      '........###.',
      '.........##.',
    ],
    check: [
      '............',
      '..........##',
      '.........###',
      '........###.',
      '.......###..',
      '##....###...',
      '###..###....',
      '.######.....',
      '..####......',
      '...##.......',
      '............',
      '............',
    ],
    robot: [
      '.....##.....',
      '.....##.....',
      '..########..',
      '.##########.',
      '.#..####..#.',
      '.#..####..#.',
      '.##########.',
      '.###....###.',
      '..########..',
      '...##..##...',
      '..###..###..',
      '............',
    ],
    nodes: [
      '....####....',
      '....####....',
      '.....##.....',
      '....#..#....',
      '...#....#...',
      '..#......#..',
      '.#........#.',
      '###......###',
      '###......###',
      '###########.',
      '............',
      '............',
    ],
  };

  const COLORS = {
    bolt: '#f4c542', dumbbell: '#e06a2c', lens: '#4f86c9',
    check: '#3fae6a', robot: '#3aa6a0', nodes: '#d0607e',
  };

  const W = 26;
  const H = 28;
  const R = 13.5;
  const CX = W / 2;
  const CY = H / 2;

  function shade(hex, f) {
    const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const out = f < 0
      ? n.map((v) => Math.round(v * (1 + f)))
      : n.map((v) => Math.round(v + (255 - v) * f));
    return `rgb(${out.join(',')})`;
  }

  // Pointy-top hexagon test against a given radius.
  const inside = (x, y, r) => {
    const dx = Math.abs(x - CX);
    const dy = Math.abs(y - CY);
    return dx <= r * 0.866 && dy <= r - dx / 1.732;
  };

  function paint(canvas, key, shine) {
    const c = canvas.getContext('2d');
    const color = COLORS[key];
    const dark = shade(color, -0.45);
    const rim = shade(color, -0.2);
    const light = shade(color, 0.35);
    c.clearRect(0, 0, W, H);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        if (!inside(px, py, R)) continue;
        let fill = '#1d2645';
        if (inside(px, py, R - 1.3)) fill = rim;
        if (inside(px, py, R - 3)) fill = (x + y < 20) ? light : color;
        if (shine !== null && fill !== '#1d2645') {
          const d = x + y - shine;
          if (d >= 0 && d < 3) fill = '#fff8ec';
        }
        c.fillStyle = fill;
        c.fillRect(x, y, 1, 1);
      }
    }

    const icon = ICONS[key];
    const ox = 7;
    const oy = 8;
    for (const [dx, dy, col] of [[1, 1, dark], [0, 0, '#fff4e8']]) {
      c.fillStyle = col;
      icon.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] === '#') c.fillRect(ox + x + dx, oy + y + dy, 1, 1);
      });
    }
  }

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const badges = [...document.querySelectorAll('.badge')];

  function sweep(badge) {
    if (reducedMotion.matches || badge.dataset.shining) return;
    badge.dataset.shining = '1';
    const canvas = badge.querySelector('.badge-art');
    let s = -4;
    const tick = () => {
      paint(canvas, badge.dataset.badge, s);
      s += 2;
      if (s < W + H) requestAnimationFrame(tick);
      else {
        paint(canvas, badge.dataset.badge, null);
        delete badge.dataset.shining;
      }
    };
    requestAnimationFrame(tick);
  }

  for (const badge of badges) {
    paint(badge.querySelector('.badge-art'), badge.dataset.badge, null);
    badge.addEventListener('pointerenter', () => sweep(badge));
  }

  // The first time the badges scroll into view they shine one after another.
  const list = document.querySelector('.badges');
  if (list && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      badges.forEach((b, i) => setTimeout(() => sweep(b), 120 * i));
    }, { threshold: 0.4 });
    io.observe(list);
  }
})();
