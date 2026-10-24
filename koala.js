// Pixel court with a koala shooting around, plus a sleepy koala at the bottom
// of the page. Everything is drawn at low resolution and scaled up by a whole
// number with `image-rendering: pixelated`, so every art pixel stays square.
(() => {
  'use strict';

  const canvas = document.getElementById('court');
  if (!canvas) return;
  const hero = canvas.closest('.hero');
  const ctx = canvas.getContext('2d', { alpha: false });
  const nightCanvas = document.getElementById('night');
  const shootBtn = document.getElementById('shoot');
  const tally = document.getElementById('tally');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Palettes ---------------------------------------------------------------

  // The court, hoop and koala never change. The sky and scenery follow the
  // visitor's local time.
  const C = {
    curb: '#c3c8d4', court: '#e7e9ee', paint: '#dfe2e9', line: '#cdd2dc', shadow: '#cdd1dc',
    pole: '#283152', board: '#f6f4f8', rim: '#e0582a', rimDark: '#a63c1c', net: '#f8f6fa',
    lamp: '#f8e6a6', lampGlow: '#f3efe2',
  };

  const TIMES = {
    dawn: {
      sky: ['#3b4a7e', '#55639a', '#7d84b3', '#a99bc0', '#d3a8bd', '#eebdb6', '#f6cfb0', '#f9dfb6', '#fbecc8'],
      orb: { x: 0.24, low: 4, r: 8, core: '#fff3da', edge: '#fde6b8', halo: '#fbe7c4' },
      stars: 0.015, starTop: 0.3,
      cloud: '#dba9b9', cloudLit: '#fbdcc2',
      hillFar: '#8c88b0', hillNear: '#6f739f', tree: '#3a5866', treeLit: '#55787f', bark: '#d6ccd0', grass: '#3c5d63',
    },
    day: {
      sky: ['#4f86c9', '#5a90d0', '#669bd6', '#74a6dc', '#84b2e1', '#95bee6', '#a8cae9', '#bcd6ec', '#d2e3ef'],
      orb: { x: 0.72, y: 0.2, r: 7, core: '#fffbe8', edge: '#fff0bf', halo: '#a9cdef' },
      stars: 0, starTop: 0,
      cloud: '#f6f8fc', cloudLit: '#d3dff0',
      hillFar: '#86a3c6', hillNear: '#6a8cae', tree: '#2f5a4e', treeLit: '#4b7a64', bark: '#ddd6d2', grass: '#47775a',
    },
    dusk: {
      sky: ['#2b3a6b', '#33457a', '#41538a', '#56659b', '#7a7cab', '#a68aab', '#d29ca3', '#eeb8a2', '#f8d6b2'],
      orb: { x: 0.4, low: 7, r: 9, core: '#fff0d2', edge: '#fde2b6', halo: '#fbe0bd' },
      stars: 0.06, starTop: 0.38,
      cloud: '#c995ab', cloudLit: '#efbcae',
      hillFar: '#6d6f9f', hillNear: '#535b8b', tree: '#2f4c5a', treeLit: '#456b74', bark: '#cdc4cb', grass: '#30505a',
    },
    night: {
      sky: ['#0d1230', '#101737', '#141c40', '#182148', '#1c2650', '#212b58', '#26315f', '#2c3767', '#323e70'],
      orb: { x: 0.8, y: 0.2, r: 6, core: '#f3eedc', edge: '#d9d4c3', halo: '#26305c', moon: true },
      stars: 0.2, starTop: 0.75,
      cloud: '#232c58', cloudLit: '#323d6e',
      hillFar: '#1f2850', hillNear: '#182040', tree: '#0f1a26', treeLit: '#1c2e3b', bark: '#6e6a7a', grass: '#132530',
      lamp: true,
    },
  };
  const TIME_ORDER = ['dawn', 'day', 'dusk', 'night'];

  function timeForHour(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 17) return 'day';
    if (h >= 17 && h < 20) return 'dusk';
    return 'night';
  }

  const asked = new URLSearchParams(location.search).get('time');
  let timeKey = TIMES[asked] ? asked : timeForHour(new Date().getHours());
  let P = TIMES[timeKey];

  const KOALA = {
    k: '#363445', g: '#9b9ba9', w: '#eceaf0', p: '#e9c7cf', n: '#2a2834', m: '#5e5b6d',
    e: '#1d1b27', f: '#5f5e6e', j: '#f4c542', J: '#d6a52c', b: '#1f5fa6', s: '#1f5fa6',
    // Black Nike GT Cuts: black upper, silver swoosh, silver midsole streak.
    x: '#18181f', z: '#d7dae3', v: '#9ba1ae',
  };
  const BALL = { q: '#5c2a14', o: '#e06a2c', O: '#f39b5c', r: '#b54c1f', s: '#8a3918' };
  const GREEN = '#3ddc6a';
  const GREEN_LIGHT = '#c8ffd9';

  // Sprites ----------------------------------------------------------------

  function sprite(rows, pal) {
    const c = document.createElement('canvas');
    c.width = rows[0].length;
    c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '.') continue;
        x.fillStyle = pal[row[i]];
        x.fillRect(i, y, 1, 1);
      }
    });
    return c;
  }

  // 20px wide. Head rows 0-12, torso 13-20, legs 21-24. The eyes are drawn
  // separately so they can look around and blink.
  const HEAD = sprite([
    '.kkkk..........kkkk.',
    'kwwwwk........kwwwwk',
    'kwppwwkkkkkkkkwwppwk',
    'kwpppwggggggggwpppwk',
    'kwppwggggggggggwppwk',
    '.kwwggggggggggggwwk.',
    '..kggggggggggggggk..',
    '..kggggggnnggggggk..',
    '..kgggggnmnngggggk..',
    '..kgggggnnnngggggk..',
    '..kwggggnnnnggggwk..',
    '...kwggggnnggggwk...',
    '....kwwwwwwwwwwk....',
  ], KOALA);

  // The koala's left arm is part of the torso; the right arm is drawn as
  // jointed lines so it can dribble, shoot and wave.
  const TORSO = sprite([
    '..kggjjjwwwwjjjk....',
    '.kgggjjjjwwjjjjk....',
    '.kgggjjjjjjjjjjk....',
    '.kgggjjjjjjjjjJk....',
    '.kgggjjjjjjjjjJk....',
    '.kfffjjjjjjjjjJk....',
    '..kkkbbbbbbbbbbk....',
    '...kssssssssssssk...',
  ], KOALA);

  const LEG_ROWS = {
    split: '...kssssskksssssk...',
    leg: '...kggggk..kggggk...',
    foot: '..kxzzxxk..kxxzzxk..',
    sole: '..kvvvvvk..kvvvvvk..',
    toe: '...kxzxxk..kxxzxk...',
    toeSole: '....kvvk....kvvk....',
  };
  const LEGS = {
    stand: sprite([LEG_ROWS.split, LEG_ROWS.leg, LEG_ROWS.foot, LEG_ROWS.sole], KOALA),
    crouch: sprite([LEG_ROWS.split, LEG_ROWS.foot, LEG_ROWS.sole], KOALA),
    air: sprite([LEG_ROWS.split, LEG_ROWS.leg, LEG_ROWS.toe, LEG_ROWS.toeSole], KOALA),
  };

  // Ball: 6x6, five frames of the seam rolling across.
  const BALL_MASK = ['.xxxx.', 'xxxxxx', 'xxxxxx', 'xxxxxx', 'xxxxxx', '.xxxx.'];
  const BALL_FRAMES = [0, 1, 2, 3, 4].map((seam) => sprite(BALL_MASK.map((row, y) =>
    [...row].map((ch, x) => {
      if (ch === '.') return '.';
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dy]) => (BALL_MASK[y + dy] || '')[x + dx] !== 'x');
      if (edge) return 'q';
      if (y === 2 || x === seam) return 's';
      if (x + y <= 3) return 'O';
      if (x + y >= 7) return 'r';
      return 'o';
    }).join('')), BALL));

  const HEART = sprite([
    '.kk.kk.',
    'krrkrrk',
    'krrrrrk',
    '.krrrk.',
    '..krk..',
    '...k...',
  ], { k: '#3a1f33', r: '#ff6f91' });

  // 3x5 pixel font for the meter feedback and little callouts.
  const GLYPHS = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'],
    D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'],
    F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'],
    H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'],
    O: ['###', '#.#', '#.#', '#.#', '###'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
    P: ['##.', '#.#', '##.', '#..', '#..'],
    '!': ['.#.', '.#.', '.#.', '...', '.#.'], ' ': ['...', '...', '...', '...', '...'],
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
    6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'],
    '-': ['...', '...', '###', '...', '...'], '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  };
  const textWidth = (s) => s.length * 4 - 1;

  function pixelText(c, s, x, y, color, outline) {
    const paint = (ox, oy) => {
      let cx = x + ox;
      for (const ch of s) {
        const g = GLYPHS[ch];
        if (g) {
          for (let ry = 0; ry < 5; ry++) {
            for (let rx = 0; rx < 3; rx++) if (g[ry][rx] === '#') c.fillRect(cx + rx, y + oy + ry, 1, 1);
          }
        }
        cx += 4;
      }
    };
    if (outline) {
      c.fillStyle = outline;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) paint(ox, oy);
    }
    c.fillStyle = color;
    paint(0, 0);
  }

  // Arm poses, in koala sprite coordinates. The shoulder is fixed at (15, 14).
  const SHOULDER = [15, 14];
  const POSE = {
    hang: { e: [16, 17], p: [16, 19] },
    hold: { e: [18, 16], p: [20, 16] },
    dribble: { e: [18, 15], p: [21, 15] },
    gather: { e: [19, 13], p: [20, 9] },
    set: { e: [20, 9], p: [21, 4] },
    release: { e: [21, 7], p: [24, 2] },
    cheer: { e: [18, 8], p: [18, 2] },
    waveOut: { e: [19, 9], p: [23, 4] },
    waveIn: { e: [19, 9], p: [19, 3] },
  };
  const HOLD_BALL = [22, 20];
  const OVERHEAD = [1, -4]; // ball center relative to the paw when it's up

  // Drawing helpers ----------------------------------------------------------

  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  function seeded(seed) {
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function rgb(hex) {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }

  function disc(c, cx, cy, r, color) {
    c.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
      c.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }

  // Bresenham with a square brush. `off` shifts the brush so even sizes
  // can grow outward (outline) or sit inside (fill).
  function line(c, x0, y0, x1, y1, size, off, color) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    c.fillStyle = color;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      c.fillRect(x0 + off, y0 + off, size, size);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function drawArm(c, ox, top, pose) {
    const s = [ox + SHOULDER[0], top + SHOULDER[1]];
    const e = [ox + pose.e[0], top + pose.e[1]];
    const p = [ox + pose.p[0], top + pose.p[1]];
    line(c, s[0], s[1], e[0], e[1], 4, -1, KOALA.k);
    line(c, e[0], e[1], p[0], p[1], 4, -1, KOALA.k);
    line(c, s[0], s[1], e[0], e[1], 2, 0, KOALA.g);
    line(c, e[0], e[1], p[0], p[1], 2, 0, KOALA.g);
    c.fillStyle = KOALA.f;
    c.fillRect(Math.round(p[0]), Math.round(p[1]), 2, 2);
  }

  function drawHead(c, x, y, look, closed) {
    c.drawImage(HEAD, x, y);
    if (closed) {
      c.fillStyle = KOALA.k;
      c.fillRect(x + 5, y + 8, 2, 1);
      c.fillRect(x + 13, y + 8, 2, 1);
      return;
    }
    c.fillStyle = KOALA.e;
    c.fillRect(x + 6 + look.dx, y + 7 + look.dy, 1, 2);
    c.fillRect(x + 13 + look.dx, y + 7 + look.dy, 1, 2);
  }

  // Layout -----------------------------------------------------------------

  let L = null;
  let bg = null; // sky, sun or moon, stars
  let fg = null; // hills, trees, court, hoop
  let clouds = [];
  let twinkles = [];

  function layout() {
    const W = hero.clientWidth;
    const H = hero.clientHeight;
    const scale = Math.max(2, Math.min(Math.round(H / 190), Math.floor(W / 130)));
    const w = Math.ceil(W / scale);
    const h = Math.ceil(H / scale);
    const groundY = h - (16 + Math.ceil(56 / scale)); // leave room for the button row
    const floorY = groundY + 9;
    const boardX = w - Math.max(10, Math.round(w * 0.07));
    const rimY = floorY - 44;

    L = {
      scale, w, h, groundY, floorY,
      horizon: groundY - 1,
      ballFloor: floorY + 3,
      boardX,
      boardTop: rimY - 13,
      boardBot: rimY + 4,
      poleX: boardX + 5,
      rimY,
      rimX0: boardX - 11,
      rimX1: boardX - 1,
      kx: Math.max(10, Math.round(boardX - Math.min(110, w * 0.62))),
    };

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w * scale}px`;
    canvas.style.height = `${h * scale}px`;
    ctx.imageSmoothingEnabled = false;
    boardScale = W >= 640 ? 3 : 2;
    paintScenery();
  }

  function paintScenery() {
    bg = paintSky();
    fg = paintGround();
    clouds = makeClouds();
  }

  function skyBand(y) {
    const n = P.sky.length - 1;
    return P.sky[Math.min(n, Math.floor(Math.pow(Math.min(1, Math.max(0, y) / L.horizon), 1.35) * n))];
  }

  function paintSky() {
    const { w, h, horizon } = L;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    const cols = P.sky.map(rgb);
    const n = cols.length - 1;

    for (let y = 0; y < h; y++) {
      const t = Math.pow(Math.min(1, y / horizon), 1.35) * n;
      const band = Math.floor(t);
      const frac = t - band;
      for (let px = 0; px < w; px++) {
        // Dither only the last stretch of each band into the next one.
        let i = band;
        if (frac > 0.62 && (frac - 0.62) / 0.38 > BAYER[y & 3][px & 3] / 16) i = band + 1;
        const col = cols[Math.min(i, n)];
        const o = (y * w + px) * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);

    // Stars first, so the sun or moon sits on top of them.
    const rand = seeded(7);
    const count = Math.round(w * P.stars);
    twinkles = [];
    for (let i = 0; i < count; i++) {
      const sx = Math.floor(rand() * w);
      const sy = Math.floor(rand() * horizon * P.starTop);
      if (i % 7 === 0) { twinkles.push({ x: sx, y: sy, phase: rand() * 6.3 }); continue; }
      x.fillStyle = rand() < 0.3 ? '#dfe4f7' : '#8f9bcc';
      x.fillRect(sx, sy, 1, 1);
    }

    const o = P.orb;
    const sx = Math.round(w * o.x);
    const sy = o.low ? horizon - o.low : Math.round(horizon * o.y);
    const r = o.r;
    for (let dy = -r - 6; dy <= r + 6; dy++) {
      for (let dx = -r - 6; dx <= r + 6; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > r && d <= r + 6 && BAYER[(sy + dy) & 3][(sx + dx) & 3] / 16 < 0.55 * (1 - (d - r) / 6)) {
          x.fillStyle = o.halo;
          x.fillRect(sx + dx, sy + dy, 1, 1);
        }
      }
    }
    disc(x, sx, sy, r, o.edge);
    disc(x, sx, sy, r - 1, o.core);
    if (o.moon) {
      // Carve a crescent with the sky behind it, then add two craters.
      disc(x, sx + 3, sy - 2, r - 1, skyBand(sy - 2));
      x.fillStyle = o.edge;
      x.fillRect(sx - 3, sy + 1, 1, 1);
      x.fillRect(sx - 1, sy + 3, 2, 1);
    }
    return c;
  }

  function hillLine(px, base, amp, f1, f2, ph) {
    return Math.round(base - amp * (0.6 * Math.sin(px * f1 + ph) + 0.4 * Math.sin(px * f2 + ph * 2.3)) - amp);
  }

  function tree(c, x0, base, height, rand) {
    const top = base - height;
    const fork = base - Math.round(height * 0.55);
    // Pale eucalyptus trunk with two branches.
    for (let y = base; y >= top + 4; y--) {
      const sway = Math.round(Math.sin((base - y) * 0.13) * 1.2);
      c.fillStyle = P.bark;
      c.fillRect(x0 + sway, y, 2, 1);
    }
    line(c, x0 + 1, fork, x0 + 8, fork - 9, 1, 0, P.bark);
    line(c, x0, fork + 3, x0 - 6, fork - 5, 1, 0, P.bark);

    const clumps = [
      [x0 + 1, top + 2, 6], [x0 - 4, top + 5, 5], [x0 + 6, top + 4, 5],
      [x0 + 9, fork - 10, 4], [x0 - 7, fork - 6, 4],
    ];
    for (const [cx, cy, r] of clumps) disc(c, cx, cy, r, P.tree);
    // Light catches the upper left of each clump.
    c.fillStyle = P.treeLit;
    for (const [cx, cy, r] of clumps) {
      for (let k = 0; k < r * 3; k++) {
        const a = Math.PI * (1 + rand() * 0.6);
        const d = rand() * (r - 1);
        c.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d - 1), 1, 1);
      }
    }
  }

  function paintGround() {
    const { w, h, horizon, groundY, floorY, ballFloor, boardX, boardTop, boardBot, poleX, rimY, rimX0, rimX1, kx } = L;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');

    for (let px = 0; px < w; px++) {
      const far = hillLine(px, horizon - 9, 5, 0.045, 0.11, 1);
      const near = hillLine(px, horizon - 2, 3, 0.07, 0.19, 4);
      x.fillStyle = P.hillFar;
      x.fillRect(px, far, 1, groundY - far);
      x.fillStyle = P.hillNear;
      x.fillRect(px, near, 1, groundY - near);
    }

    const rand = seeded(11);
    const treeH = Math.min(52, Math.round(h * 0.17) + 14);
    [[0.06, 1], [0.3, 0.8], [0.52, 1.05]].forEach(([fx, hs]) => {
      const tx = Math.round(w * fx);
      if (tx < rimX0 - 26 && (tx < kx - 34 || tx > kx + 32)) tree(x, tx, groundY, Math.round(treeH * hs), rand);
    });

    // Grass verge with a few shrubs, then the curb, then the court.
    x.fillStyle = P.grass;
    x.fillRect(0, groundY - 1, w, 3);
    for (let px = 2; px < w; px += 9 + Math.floor(rand() * 9)) disc(x, px, groundY - 1, 2 + Math.floor(rand() * 2), P.grass);
    x.fillStyle = C.curb;
    x.fillRect(0, groundY + 2, w, 1);
    x.fillStyle = C.court;
    x.fillRect(0, groundY + 3, w, h - groundY - 3);

    // The paint under the hoop, with a slanted free-throw line for depth.
    const keyX = rimX0 - 18;
    for (let y = groundY + 3; y <= ballFloor + 5; y++) {
      const lean = Math.round(((y - groundY - 3) / (ballFloor + 2 - groundY)) * -3);
      x.fillStyle = C.paint;
      x.fillRect(keyX + lean, y, w - keyX - lean, 1);
      x.fillStyle = C.line;
      x.fillRect(keyX + lean, y, 1, 1);
    }
    x.fillStyle = C.line;
    x.fillRect(0, ballFloor + 6, w, 1);

    // A streetlight behind the koala at night, with a pool of light.
    if (P.lamp && kx - 22 > 6) {
      const lx = kx - 22;
      const headY = floorY - 46;
      for (let y = headY + 3; y <= floorY + 1; y++) {
        const spread = (y - headY) * 0.5;
        for (let px = Math.floor(lx + 6 - spread); px <= lx + 6 + spread; px++) {
          const fall = 1 - Math.abs(px - lx - 6) / (spread + 1);
          if (BAYER[y & 3][px & 3] / 16 < fall * 0.22 && y < groundY - 1) {
            x.fillStyle = 'rgba(248,230,166,0.16)';
            x.fillRect(px, y, 1, 1);
          }
        }
      }
      for (let y = groundY + 3; y <= ballFloor + 5; y++) {
        const rx = 22 - Math.abs(y - floorY) * 1.4;
        for (let px = Math.round(lx + 6 - rx); px <= lx + 6 + rx; px++) {
          if (BAYER[y & 3][px & 3] / 16 < 0.7 - Math.abs(px - lx - 6) / (rx + 1) * 0.7) {
            x.fillStyle = C.lampGlow;
            x.fillRect(px, y, 1, 1);
          }
        }
      }
      x.fillStyle = C.pole;
      x.fillRect(lx, headY, 2, floorY - headY);
      x.fillRect(lx - 1, floorY - 1, 4, 2);
      x.fillRect(lx, headY, 8, 1);
      x.fillRect(lx + 4, headY + 1, 5, 1);
      x.fillStyle = C.lamp;
      x.fillRect(lx + 4, headY + 2, 5, 1);
    }

    // Hoop: pole, arm, backboard, back of the rim.
    x.fillStyle = C.pole;
    x.fillRect(poleX, boardTop + 3, 3, floorY - boardTop - 3);
    x.fillRect(poleX - 1, floorY - 1, 5, 2);
    x.fillRect(boardX + 1, boardTop + 5, poleX - boardX - 1, 2);
    x.fillRect(boardX - 1, boardTop - 1, 4, boardBot - boardTop + 2);
    x.fillStyle = C.board;
    x.fillRect(boardX, boardTop, 2, boardBot - boardTop);
    x.fillStyle = C.pole;
    x.fillRect(boardX - 2, rimY, 2, 2);
    x.fillStyle = C.rimDark;
    x.fillRect(rimX0, rimY, rimX1 - rimX0, 1);
    return c;
  }

  function makeClouds() {
    const { w, horizon } = L;
    const rand = seeded(23);
    return [[0.12, 0.64, 28], [0.6, 0.56, 36], [0.86, 0.72, 20], [0.36, 0.78, 16]].map(([fx, fy, cw]) => {
      const ch = 12;
      const base = ch - 3;
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      const x = c.getContext('2d');
      // Puffs are biggest in the middle and taper toward the ends.
      for (let px = 3; px < cw - 3; px += 2 + Math.floor(rand() * 3)) {
        const r = Math.max(1, Math.round(1 + 4 * Math.sin((Math.PI * px) / cw) + rand() * 1.5));
        disc(x, px, base - Math.round(r * 0.5), r, P.cloud);
      }
      x.clearRect(0, base + 1, cw, ch);
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = P.cloudLit;
      x.fillRect(0, base - 1, cw, 2);
      return { img: c, x: fx * w, y: Math.round(fy * horizon), w: cw };
    });
  }

  function setTime(key, announce) {
    timeKey = key;
    P = TIMES[key];
    hero.dataset.time = key;
    hero.style.backgroundColor = P.sky[0];
    if (themeMeta) themeMeta.content = P.sky[0];
    if (!L) return;
    paintScenery();
    if (announce) say(key.toUpperCase(), '#f4f5fa');
    draw();
    start();
  }

  // State ------------------------------------------------------------------

  const G = 0.12;
  const FILL = 48;       // frames for the meter to fill
  const GREEN_LO = 0.87; // the green window is the top of the meter
  const AUTO_LATE = 1.14;

  const GRADES = {
    green: { label: 'EXCELLENT', color: GREEN, make: 1, miss: 0 },
    early: { label: 'SLIGHTLY EARLY', color: '#f4f5fa', make: 0.45, miss: -1 },
    late: { label: 'SLIGHTLY LATE', color: '#f4f5fa', make: 0.45, miss: 1 },
    veryEarly: { label: 'VERY EARLY', color: '#ff7a6b', make: 0, miss: -2 },
    veryLate: { label: 'VERY LATE', color: '#ff7a6b', make: 0, miss: 2 },
  };

  function gradeFor(f) {
    if (f < 0.6) return GRADES.veryEarly;
    if (f < GREEN_LO) return GRADES.early;
    if (f <= 1) return GRADES.green;
    if (f <= 1.07) return GRADES.late;
    return GRADES.veryLate;
  }

  const koala = {
    state: 'hold', t: 0, from: POSE.hold, ox: 0,
    rel: -1, liftRel: 0, poseRel: POSE.set,
    cheer: 0, shake: 0, blink: 0, nextBlink: 200,
    queuedDunk: false, dunk: null,
  };
  const ball = {
    x: 0, y: 0, vx: 0, vy: 0, held: true, spin: 0,
    scored: false, missed: false, flight: 0, green: false, dunk: false, trail: [],
  };
  const meter = { on: false, f: 0, grade: null, after: 0 };
  const net = { s: 1, v: 0 };
  const pointer = { x: 0, y: 0, idle: 0 };
  let particles = [];
  let rings = [];
  let hearts = [];
  let label = null;
  let makes = 0;
  let attempts = 0;
  let greens = 0;
  let greenRun = 0;
  let makeRun = 0;
  let onFire = false;

  // Derived each frame by stepKoala().
  let pose = POSE.hold;
  let lift = 0;    // whole koala, negative is up
  let crouch = 0;  // upper body drops 1px
  let legs = LEGS.stand;

  const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  const mix = (a, b, u) => a + (b - a) * u;
  function blend(a, b, u) {
    u = ease(u);
    return { e: [mix(a.e[0], b.e[0], u), mix(a.e[1], b.e[1], u)], p: [mix(a.p[0], b.p[0], u), mix(a.p[1], b.p[1], u)] };
  }

  const kxNow = () => L.kx + koala.ox;
  const koalaTop = () => L.floorY - 25 + lift;
  const catchX = () => L.kx + HOLD_BALL[0];
  const rimMid = () => (L.rimX0 + L.rimX1) / 2;
  const fx = () => !reducedMotion.matches;
  const hasBall = () => ball.held && (koala.state === 'hold' || koala.state === 'dribble');

  function say(text, color) {
    label = { text, color, t: 0 };
  }

  function burst(x, y, colors, n, speed) {
    if (!fx()) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, g: 0.04,
        life: 26 + Math.random() * 20, color: colors[i % colors.length], size: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }

  function updateTally() {
    let s = `Made ${makes} of ${attempts}`;
    if (greens) s += `, ${greens} green${greens === 1 ? '' : 's'}`;
    if (onFire) s += '. On fire';
    tally.textContent = `${s}.`;
    if (hint && attempts) hint.hidden = true;
  }

  // Arcade scoreboard next to the button. A cell blinks when its value changes.
  const board = document.getElementById('scoreboard');
  const bctx = board ? board.getContext('2d') : null;
  const hint = document.querySelector('.hero-hint');
  let boardScale = 3;
  const boardLast = {};
  const boardFlash = {};

  function drawBoard() {
    if (!bctx) return;
    const pct = attempts ? Math.round((100 * makes) / attempts) : 0;
    const cells = [
      { key: 'fg', label: 'FG', value: `${makes}-${attempts}`, color: '#fff4e8', min: 19 },
      { key: 'pct', label: 'PCT', value: `${pct}%`, color: '#f4c542', min: 15 },
      { key: 'streak', label: onFire ? 'FIRE' : 'STREAK', value: String(makeRun), color: onFire ? '#ffb347' : '#fff4e8', min: 7 },
    ];
    for (const c of cells) {
      if (boardLast[c.key] !== undefined && boardLast[c.key] !== c.value) boardFlash[c.key] = 24;
      boardLast[c.key] = c.value;
      c.w = Math.max(textWidth(c.label), textWidth(c.value), c.min) + 6;
    }
    const W = cells.reduce((a, c) => a + c.w, 0) + cells.length + 1;
    const H = 15;
    if (board.width !== W || board.dataset.scale !== String(boardScale)) {
      board.width = W;
      board.height = H;
      board.style.width = `${W * boardScale}px`;
      board.style.height = `${H * boardScale}px`;
      board.dataset.scale = String(boardScale);
    }
    bctx.clearRect(0, 0, W, H);
    bctx.fillStyle = '#141a33';
    bctx.fillRect(1, 0, W - 2, H);
    bctx.fillRect(0, 1, W, H - 2);
    let x = 1;
    cells.forEach((c, i) => {
      const f = boardFlash[c.key] || 0;
      if (f > 0) {
        boardFlash[c.key] = f - 1;
        if ((f >> 2) & 1) {
          bctx.fillStyle = '#222b52';
          bctx.fillRect(x, 1, c.w, H - 2);
        }
      }
      pixelText(bctx, c.label, x + Math.floor((c.w - textWidth(c.label)) / 2), 2, '#8f9bcc');
      pixelText(bctx, c.value, x + Math.floor((c.w - textWidth(c.value)) / 2), 8, f > 0 && ((f >> 2) & 1) ? '#ffffff' : c.color);
      x += c.w;
      if (i < cells.length - 1) {
        bctx.fillStyle = '#2a3150';
        bctx.fillRect(x, 2, 1, H - 4);
        x += 1;
      }
    });
  }

  function resetBall() {
    koala.state = 'hold';
    koala.t = 0;
    koala.ox = 0;
    ball.held = true;
    ball.vx = ball.vy = 0;
    ball.trail = [];
  }

  // Shooting ---------------------------------------------------------------

  function startShot() {
    if (!hasBall()) return false;
    const k = koala;
    k.from = pose;
    k.state = 'shoot';
    k.t = 0;
    k.rel = -1;
    meter.on = true;
    meter.f = 0;
    meter.grade = null;
    meter.after = 0;
    start();
    return true;
  }

  function releaseShot() {
    const k = koala;
    if (k.state !== 'shoot' || k.rel >= 0) return;
    k.rel = k.t;
    k.liftRel = lift;
    k.poseRel = pose;
    const grade = gradeFor(meter.f);
    meter.grade = grade;
    meter.after = 0;
    say(grade.label, grade.color);
    if (grade === GRADES.green) {
      greens++;
      greenRun++;
      burst(ball.x, ball.y, [GREEN, GREEN_LIGHT, '#ffffff'], 22, 1.6);
      if (fx()) rings.push({ x: kxNow() + 10, y: koalaTop() + 12, t: 0 });
      if (greenRun >= 3 && !onFire) {
        onFire = true;
        setTimeout(() => say('ON FIRE', '#ffb347'), 900);
      }
    } else {
      greenRun = 0;
      onFire = false;
    }
  }

  function launch(grade) {
    const make = Math.random() < grade.make;
    const mid = rimMid();
    let tx = mid;
    if (make) {
      if (grade !== GRADES.green) tx += (Math.random() - 0.5) * 2;
    } else {
      const dir = grade.miss || (Math.random() < 0.5 ? -1 : 1);
      // Slight misses clip the rim; very early is an air ball, very late hits the board.
      tx += Math.sign(dir) * (Math.abs(dir) === 2 ? 9 + Math.random() * 2 : 4 + Math.random() * 1.5);
    }
    const ty = L.rimY - 1;
    const apex = ty - (22 + Math.random() * 6);
    const vy = -Math.sqrt(2 * G * Math.max(4, ball.y - apex));
    const time = -vy / G + Math.sqrt((2 * (ty - apex)) / G);
    ball.held = false;
    ball.vx = (tx - ball.x) / time;
    ball.vy = vy;
    ball.scored = false;
    ball.missed = false;
    ball.flight = 0;
    ball.green = grade === GRADES.green;
    ball.noScore = !make;
    ball.dunk = false;
    ball.trail = [];
    attempts++;
    updateTally();
  }

  // Easter eggs ------------------------------------------------------------

  function startDunk() {
    if (!hasBall()) {
      koala.queuedDunk = true;
      return;
    }
    const k = koala;
    k.queuedDunk = false;
    k.state = 'dunk';
    k.t = 0;
    const hangOx = L.rimX0 + 3 - POSE.cheer.p[0] - L.kx;
    const runEnd = hangOx - 12;
    k.dunk = {
      hangOx, runEnd,
      hangLift: (L.rimY - POSE.cheer.p[1]) - (L.floorY - 25),
      runT: Math.max(16, Math.round(Math.abs(runEnd) / 2.4)),
    };
    start();
  }

  function pet() {
    if (!hasBall()) return;
    koala.state = 'pet';
    koala.t = 0;
    start();
  }

  // Simulation ---------------------------------------------------------------

  function stepKoala() {
    const k = koala;
    k.t++;
    lift = 0;
    crouch = 0;
    legs = LEGS.stand;

    if (--k.nextBlink <= 0) { k.blink = 7; k.nextBlink = 180 + Math.random() * 160; }
    if (k.blink > 0) k.blink--;
    if (pointer.idle > 0) pointer.idle--;

    if (k.state === 'hold') {
      pose = POSE.hold;
      if (k.queuedDunk) startDunk();
      else if (fx() && k.t > 40) { k.state = 'dribble'; k.t = 0; }
    } else if (k.state === 'dribble') {
      // Keeps dribbling until someone calls for a shot.
      pose = POSE.dribble;
      if (k.queuedDunk) startDunk();
    } else if (k.state === 'shoot') {
      stepShoot();
    } else if (k.state === 'watch') {
      pose = blend(POSE.release, POSE.hang, k.t / 14);
      if (k.cheer > 0) {
        const c = 30 - k.cheer;
        pose = blend(POSE.hang, POSE.cheer, c < 8 ? c / 8 : (30 - c) / 8);
        lift = -Math.round(3 * Math.sin((Math.PI * c) / 30));
        if (lift < 0) legs = LEGS.air;
        k.cheer--;
      }
      if (k.shake > 0) k.shake--;
    } else if (k.state === 'pet') {
      pose = ((k.t >> 3) & 1) ? POSE.waveIn : POSE.waveOut;
      if (k.t === 6) hearts.push({ x: kxNow() + 7, y: koalaTop() - 4, t: 0 });
      if (k.t > 56) { k.state = 'hold'; k.t = 0; }
    } else if (k.state === 'dunk') {
      stepDunk();
    }
  }

  function stepShoot() {
    const k = koala;
    const t = k.t;
    if (k.rel < 0) {
      meter.f = t / FILL;
      pose = t < 12 ? blend(k.from, POSE.gather, t / 12) : blend(POSE.gather, POSE.set, (t - 12) / 10);
      if (t >= 4 && t < 16) { crouch = 1; legs = LEGS.crouch; }
      if (t >= 16) {
        // Rise to the top of the jump, then hang there until release.
        const u = Math.min(1, (t - 16) / 14);
        lift = -Math.round(7 * Math.sin((u * Math.PI) / 2));
        legs = LEGS.air;
      }
      if (meter.f >= AUTO_LATE) releaseShot();
    }
    if (k.rel >= 0) {
      const u = t - k.rel;
      pose = blend(k.poseRel, POSE.release, u / 4);
      if (u === 2) launch(meter.grade);
      if (u < 14) {
        lift = Math.round(k.liftRel * (1 - (u / 14) ** 2));
        legs = k.liftRel < 0 ? LEGS.air : LEGS.stand;
      } else if (u < 18) {
        if (k.liftRel < 0) { crouch = 1; legs = LEGS.crouch; }
      } else {
        k.state = 'watch';
        k.t = 0;
      }
    }
  }

  function stepDunk() {
    const k = koala;
    const d = k.dunk;
    const t = k.t;
    const leapEnd = d.runT + 22;
    const hangEnd = leapEnd + 36;
    const dropEnd = hangEnd + 14;
    const landEnd = dropEnd + 6;
    const walkT = Math.max(20, Math.round(Math.abs(d.hangOx) / 1.6));

    if (t < d.runT) {
      const u = t / d.runT;
      k.ox = Math.round(d.runEnd * u);
      lift = -((t >> 2) & 1);
      legs = lift ? LEGS.air : LEGS.stand;
      pose = POSE.hold;
    } else if (t < leapEnd) {
      const u = (t - d.runT) / 22;
      k.ox = Math.round(mix(d.runEnd, d.hangOx, u));
      lift = Math.round(mix(0, d.hangLift, ease(u)) - 5 * Math.sin(Math.PI * u));
      legs = LEGS.air;
      pose = blend(POSE.hold, POSE.set, u * 2);
    } else if (t < hangEnd) {
      if (t === leapEnd) slam();
      k.ox = d.hangOx;
      lift = d.hangLift + (((t - leapEnd) >> 3) & 1);
      legs = LEGS.air;
      pose = POSE.cheer;
    } else if (t < dropEnd) {
      const u = (t - hangEnd) / 14;
      lift = Math.round(d.hangLift * (1 - u * u));
      legs = LEGS.air;
      pose = blend(POSE.cheer, POSE.hang, u);
    } else if (t < landEnd) {
      crouch = 1;
      legs = LEGS.crouch;
      pose = POSE.hang;
    } else if (t < landEnd + walkT) {
      const u = (t - landEnd) / walkT;
      k.ox = Math.round(mix(d.hangOx, 0, u));
      lift = -((t >> 2) & 1);
      legs = lift ? LEGS.air : LEGS.stand;
      pose = POSE.hang;
    } else {
      k.ox = 0;
      k.state = 'watch';
      k.t = 20;
    }
  }

  function slam() {
    ball.held = false;
    ball.x = rimMid();
    ball.y = L.rimY - 3;
    ball.vx = 0;
    ball.vy = 2.4;
    ball.scored = false;
    ball.missed = false;
    ball.flight = 0;
    ball.green = false;
    ball.dunk = true;
    ball.noScore = false;
    ball.trail = [];
    attempts++;
    say('SLAM DUNK', '#f4c542');
    burst(rimMid(), L.rimY, ['#f4c542', '#ffffff', '#e06a2c'], 26, 1.8);
  }

  function heldBallPosition() {
    const k = koala;
    const ox = kxNow();
    const top = koalaTop() + crouch;
    if (k.state === 'dribble') {
      // Bounce between the paw and the floor; the paw follows the ball top.
      const period = 26;
      const phase = (k.t % period) / period;
      const bottom = L.ballFloor - 3;
      const high = top + 19;
      ball.x = ox + 22;
      ball.y = bottom - (bottom - high) * Math.sin(Math.PI * phase);
      pose = { e: POSE.dribble.e, p: [21, Math.max(15, Math.min(18, ball.y - 4 - top))] };
      ball.spin = 0;
      return;
    }
    if (k.state === 'pet') {
      // Set the ball down to wave.
      ball.x = ox + 25;
      ball.y = L.ballFloor - 3;
      return;
    }
    const overhead = (k.state === 'shoot' && k.t >= 12) || (k.state === 'dunk' && k.t >= k.dunk.runT + 8);
    if (overhead) {
      ball.x = ox + pose.p[0] + OVERHEAD[0];
      ball.y = top + pose.p[1] + OVERHEAD[1];
      return;
    }
    if (k.state === 'shoot') {
      // Slide from the hip to overhead during the gather.
      const u = ease(k.t / 12);
      ball.x = ox + mix(HOLD_BALL[0], pose.p[0] + OVERHEAD[0], u);
      ball.y = top + mix(HOLD_BALL[1], pose.p[1] + OVERHEAD[1], u);
      return;
    }
    ball.x = ox + HOLD_BALL[0];
    ball.y = top + HOLD_BALL[1];
  }

  function bounceOffPoint(px, py) {
    const dx = ball.x - px, dy = ball.y - py;
    const d = Math.hypot(dx, dy);
    const R = 3.2;
    if (d >= R || d === 0) return;
    const nx = dx / d, ny = dy / d;
    ball.x = px + nx * R;
    ball.y = py + ny * R;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= 1.55 * vn * nx;
      ball.vy -= 1.55 * vn * ny;
    }
  }

  function stepBall() {
    if (ball.held) {
      heldBallPosition();
      return;
    }
    const prevY = ball.y;
    ball.flight++;
    ball.vy += G;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.spin += ball.vx * 0.3;

    if (ball.green || onFire) {
      ball.trail.push([ball.x, ball.y]);
      if (ball.trail.length > 12) ball.trail.shift();
    }
    if (onFire && fx() && ball.flight < 120) {
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: ball.x + (Math.random() - 0.5) * 4, y: ball.y + (Math.random() - 0.5) * 4,
          vx: -ball.vx * 0.2, vy: -0.25 - Math.random() * 0.3, g: 0,
          life: 10 + Math.random() * 10, color: ['#ffd34d', '#ff8a2a', '#ff5a1f'][i + (Math.random() < 0.5 ? 0 : 1)], size: 1,
        });
      }
    }

    if (!ball.dunk) {
      bounceOffPoint(L.rimX0, L.rimY + 0.5);
      bounceOffPoint(L.rimX1, L.rimY + 0.5);
    }

    if (ball.vx > 0 && ball.x + 3 > L.boardX && ball.x < L.boardX + 2 && ball.y > L.boardTop - 2 && ball.y < L.boardBot + 2) {
      ball.x = L.boardX - 3;
      ball.vx = -ball.vx * 0.55;
    }

    const inRim = ball.x > L.rimX0 + 1 && ball.x < L.rimX1 - 1;
    const dropping = ball.vy > 0 && prevY < L.rimY + 1 && ball.y >= L.rimY + 1 && inRim;
    if (dropping && ball.noScore && !ball.scored) {
      // A late or early release that drifts over the rim rattles out instead of falling in.
      ball.y = L.rimY - 2;
      ball.vy = -Math.abs(ball.vy) * 0.45 - 0.6;
      ball.vx = (ball.x < rimMid() ? -1 : 1) * (0.7 + Math.random() * 0.5);
    } else if (!ball.scored && dropping) {
      ball.scored = true;
      makes++;
      makeRun++;
      net.v += ball.dunk ? 0.6 : ball.green ? 0.45 : 0.32;
      if (ball.green) burst(rimMid(), L.rimY + 4, [GREEN, GREEN_LIGHT, '#ffffff'], 14, 1.2);
      if (!ball.dunk) koala.cheer = 30;
      updateTally();
    }
    if (inRim && ball.y > L.rimY && ball.y < L.rimY + 9) ball.vx *= 0.9; // the net catches it

    if (ball.x < 3) { ball.x = 3; ball.vx = Math.abs(ball.vx); }
    if (ball.x > L.w - 3) { ball.x = L.w - 3; ball.vx = -Math.abs(ball.vx); }

    const floor = L.ballFloor - 3;
    if (ball.y >= floor) {
      ball.y = floor;
      if (!ball.scored && !ball.missed) {
        ball.missed = true;
        makeRun = 0;
        updateTally();
        if (koala.state === 'watch') koala.shake = 24;
      }
      if (ball.vy > 0.8) {
        ball.vy = -ball.vy * 0.55;
        ball.vx *= 0.85;
      } else {
        // Rolling: head back to the koala.
        ball.vy = 0;
        ball.trail = [];
        const dx = catchX() - ball.x;
        if (Math.abs(dx) < 1.5) {
          ball.vx = 0;
          if (koala.state === 'watch' && koala.cheer === 0) resetBall();
        } else {
          ball.vx = Math.sign(dx) * 1.3;
        }
      }
    }
    if (ball.flight > 900) resetBall();
  }

  function stepEffects() {
    net.v += -0.08 * (net.s - 1) - 0.12 * net.v;
    net.s += net.v;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.vx *= 0.97;
      p.life--;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const r of rings) r.t++;
    rings = rings.filter((r) => r.t < 20);
    for (const h of hearts) h.t++;
    hearts = hearts.filter((h) => h.t < 60);
    if (label && ++label.t > 75) label = null;
    if (meter.on && meter.grade && ++meter.after > 55) meter.on = false;

    if (fx()) {
      for (const c of clouds) {
        c.x += 0.012;
        if (c.x > L.w + 2) c.x = -c.w - 2;
      }
    }
  }

  // Rendering --------------------------------------------------------------

  function look() {
    let tx, ty;
    if (!ball.held) { tx = ball.x; ty = ball.y; }
    else if (pointer.idle > 0) { tx = pointer.x; ty = pointer.y; }
    else return { dx: 0, dy: 0 };
    const vx = tx - (kxNow() + 10);
    const vy = ty - (koalaTop() + 8);
    return { dx: Math.abs(vx) > 8 ? Math.sign(vx) : 0, dy: Math.abs(vy) > 10 ? Math.sign(vy) : 0 };
  }

  function drawKoala() {
    const ox = kxNow();
    const top = koalaTop();
    const upper = top + crouch;
    // Shadow shrinks while airborne.
    const sw = lift < -10 ? 7 : lift < -3 ? 11 : 15;
    ctx.fillStyle = C.shadow;
    ctx.fillRect(ox + 10 - (sw >> 1), L.floorY, sw, 1);
    ctx.fillRect(ox + 12 - (sw >> 1), L.floorY + 1, sw - 4, 1);

    drawArm(ctx, ox, upper, pose);
    ctx.drawImage(legs, ox, upper + 21);
    ctx.drawImage(TORSO, ox, upper + 13);
    const shakeDx = koala.shake > 0 ? (((koala.shake >> 2) & 1) ? 1 : -1) : 0;
    drawHead(ctx, ox + shakeDx, upper, look(), koala.blink > 0);
  }

  function drawBall() {
    for (let i = 0; i < ball.trail.length; i += 1) {
      if ((i & 1) && i < ball.trail.length - 4) continue;
      const [tx, ty] = ball.trail[i];
      ctx.fillStyle = ball.green ? (i > ball.trail.length - 5 ? GREEN_LIGHT : GREEN) : '#ffb347';
      const s = i > ball.trail.length - 5 ? 2 : 1;
      ctx.fillRect(Math.round(tx) - (s >> 1), Math.round(ty) - (s >> 1), s, s);
    }
    const height = L.ballFloor - (ball.y + 3);
    const sw = height > 18 ? 2 : height > 6 ? 4 : 6;
    ctx.fillStyle = C.shadow;
    ctx.fillRect(Math.round(ball.x) - (sw >> 1), L.ballFloor, sw, 1);
    const frame = ((Math.floor(ball.spin) % 5) + 5) % 5;
    ctx.drawImage(BALL_FRAMES[frame], Math.round(ball.x - 3), Math.round(ball.y - 3));
  }

  function drawNet() {
    const { rimX0, rimX1, rimY } = L;
    const mid = rimMid();
    const stretch = Math.max(0.7, net.s);
    const bottomY = rimY + 2 + Math.round(7 * stretch);
    const tops = [0, 1, 2, 3, 4].map((i) => [rimX0 + 1 + i * 2, rimY + 1]);
    const bottoms = [0, 1, 2, 3, 4].map((i) => [Math.round(mid + ((i - 2) * 1.1) / stretch), bottomY]);
    const netColor = ball.green && ball.scored && net.v > 0.02 ? GREEN_LIGHT : C.net;
    for (let i = 0; i < 4; i++) {
      line(ctx, tops[i][0], tops[i][1], bottoms[i + 1][0], bottoms[i + 1][1], 1, 0, netColor);
      line(ctx, tops[i + 1][0], tops[i + 1][1], bottoms[i][0], bottoms[i][1], 1, 0, netColor);
    }
    line(ctx, tops[0][0], tops[0][1], bottoms[0][0], bottoms[0][1], 1, 0, netColor);
    line(ctx, tops[4][0], tops[4][1], bottoms[4][0], bottoms[4][1], 1, 0, netColor);
    ctx.fillStyle = C.rim;
    ctx.fillRect(rimX0 - 1, rimY + 1, rimX1 - rimX0 + 1, 1);
  }

  // A 7x27 meter to the koala's left, in the spirit of the 2K shot meter:
  // white fill climbs while you hold, the top three pixels are the green window.
  function drawMeter() {
    if (!meter.on) return;
    const mx = kxNow() - 9;
    const my = koalaTop() + crouch - 2;
    const CH = 23;
    const grade = meter.grade;
    const flashing = grade === GRADES.green && meter.after < 26;
    const flashOn = flashing && ((meter.after >> 2) & 1) === 0;

    // Frame: dark outline, silver bevel, notched green window.
    ctx.fillStyle = '#141a33';
    ctx.fillRect(mx + 1, my, 5, 27);
    ctx.fillRect(mx, my + 1, 7, 25);
    ctx.fillStyle = flashing ? (flashOn ? GREEN : GREEN_LIGHT) : '#d4d8e6';
    ctx.fillRect(mx + 1, my + 1, 5, 25);
    if (!flashing) {
      ctx.fillStyle = '#9aa1bb';
      ctx.fillRect(mx + 5, my + 2, 1, 23);
    }
    ctx.fillStyle = '#2a3150';
    ctx.fillRect(mx + 2, my + 2, 3, CH);
    ctx.fillStyle = '#1e5a3a';
    ctx.fillRect(mx + 2, my + 2, 3, 3);
    ctx.fillStyle = GREEN;
    ctx.fillRect(mx - 1, my + 2, 1, 3);
    ctx.fillRect(mx + 7, my + 2, 1, 3);

    const filled = Math.round(Math.min(1, meter.f) * CH);
    let fill = '#f4f5fa';
    if (grade) fill = grade === GRADES.green ? (flashOn ? GREEN_LIGHT : GREEN) : grade.color;
    ctx.fillStyle = fill;
    ctx.fillRect(mx + 2, my + 2 + CH - filled, 3, filled);
    // A brighter cap on the fill, like the leading edge of the bar.
    if (filled > 0 && !grade) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx + 2, my + 2 + CH - filled, 3, 1);
    }
  }

  function drawEffects() {
    for (const r of rings) {
      const rad = 4 + r.t * 1.2;
      ctx.fillStyle = r.t < 10 ? GREEN_LIGHT : GREEN;
      const steps = Math.round(rad * 6);
      for (let i = 0; i < steps; i++) {
        if (r.t > 12 && (i & 1)) continue;
        const a = (i / steps) * Math.PI * 2;
        ctx.fillRect(Math.round(r.x + Math.cos(a) * rad), Math.round(r.y + Math.sin(a) * rad * 0.8), 1, 1);
      }
    }
    for (const p of particles) {
      if (p.life < 8 && (p.life & 1)) continue;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    for (const h of hearts) {
      if (h.t > 45 && (h.t & 1)) continue;
      ctx.drawImage(HEART, h.x, Math.round(h.y - h.t * 0.25));
    }
  }

  function drawLabel() {
    if (!label) return;
    const t = label.t;
    if (t > 60 && (t & 1)) return;
    const tw = textWidth(label.text);
    const x = Math.max(1, Math.min(L.w - tw - 1, Math.round(kxNow() + 10 - tw / 2)));
    const y = Math.max(2, koalaTop() - 10 - Math.min(4, Math.floor(t / 3)));
    pixelText(ctx, label.text, x, y, label.color, '#141a33');
  }

  function drawTwinkles() {
    const now = performance.now() / 1000;
    for (const s of twinkles) {
      const b = Math.sin(now * 1.7 + s.phase);
      if (b < -0.3) continue;
      ctx.fillStyle = b > 0.5 ? '#ffffff' : '#9fa9d8';
      ctx.fillRect(s.x, s.y, 1, 1);
      if (b > 0.85) {
        ctx.fillStyle = '#9fa9d8';
        ctx.fillRect(s.x - 1, s.y, 1, 1);
        ctx.fillRect(s.x + 1, s.y, 1, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 1);
        ctx.fillRect(s.x, s.y + 1, 1, 1);
      }
    }
  }

  function draw() {
    ctx.drawImage(bg, 0, 0);
    drawTwinkles();
    for (const c of clouds) ctx.drawImage(c.img, Math.round(c.x), c.y);
    ctx.drawImage(fg, 0, 0);
    drawKoala();
    drawBall();
    drawNet();
    drawEffects();
    drawMeter();
    drawLabel();
    drawBoard();
  }

  // Night scene: a koala asleep on its ball under a streetlight ---------------

  const N = nightCanvas ? { c: nightCanvas.getContext('2d', { alpha: false }), w: 0, h: 44, scale: 4, t: 0, wake: 0, kx: 0, visible: false, bg: null } : null;
  const NIGHT_SKY = '#141a36';
  const NIGHT_GROUND = '#1c2347';

  function layoutNight() {
    if (!N) return;
    const W = nightCanvas.parentElement.clientWidth;
    N.scale = L ? L.scale : 4;
    N.w = Math.ceil(W / N.scale);
    nightCanvas.width = N.w;
    nightCanvas.height = N.h;
    nightCanvas.style.width = `${N.w * N.scale}px`;
    nightCanvas.style.height = `${N.h * N.scale}px`;
    N.c.imageSmoothingEnabled = false;

    const groundTop = N.h - 8;
    let lampX = Math.round(N.w * 0.66);
    if (lampX + 28 > N.w) lampX = N.w - 28;
    N.kx = lampX + 9 - 10;
    N.groundTop = groundTop;

    const c = document.createElement('canvas');
    c.width = N.w;
    c.height = N.h;
    const x = c.getContext('2d');
    x.fillStyle = NIGHT_SKY;
    x.fillRect(0, 0, N.w, N.h);
    // Light cone and the pool it leaves on the ground.
    const cx = lampX + 9;
    for (let y = 9; y < groundTop; y++) {
      const hw = (y - 9) * 0.55 + 1;
      for (let px = Math.floor(cx - hw); px <= cx + hw; px++) {
        const fall = 1 - Math.abs(px - cx) / (hw + 1);
        if (BAYER[y & 3][px & 3] / 16 < fall * 0.3) {
          x.fillStyle = '#20284f';
          x.fillRect(px, y, 1, 1);
        }
      }
    }
    x.fillStyle = NIGHT_GROUND;
    x.fillRect(0, groundTop, N.w, N.h - groundTop);
    x.fillStyle = '#262e58';
    x.fillRect(0, groundTop, N.w, 1);
    for (let y = groundTop; y < groundTop + 4; y++) {
      const rx = 16 - (y - groundTop) * 2;
      for (let px = Math.round(cx - rx); px <= cx + rx; px++) {
        if (BAYER[y & 3][px & 3] / 16 < 0.75 - (Math.abs(px - cx) / (rx + 1)) * 0.7) {
          x.fillStyle = '#39416f';
          x.fillRect(px, y, 1, 1);
        }
      }
    }
    // Lamp post.
    x.fillStyle = '#0d1129';
    x.fillRect(lampX, 6, 2, groundTop - 6);
    x.fillRect(lampX - 1, groundTop - 1, 4, 2);
    x.fillRect(lampX, 5, 10, 1);
    x.fillRect(lampX + 6, 6, 6, 1);
    x.fillStyle = C.lamp;
    x.fillRect(lampX + 6, 7, 6, 1);
    N.bg = c;
  }

  function stepNight() {
    if (!N) return;
    N.t++;
    if (N.wake > 0) N.wake--;
  }

  function drawNight() {
    if (!N || !N.bg) return;
    const c = N.c;
    const gt = N.groundTop;
    c.drawImage(N.bg, 0, 0);
    const awake = N.wake > 0;
    const breathe = !awake && Math.floor(N.t / 50) % 2 ? 1 : 0;
    const top = gt - 26;
    c.drawImage(BALL_FRAMES[0], N.kx + 7, gt - 6);
    const armPose = awake ? (((N.t >> 3) & 1) ? POSE.waveIn : POSE.waveOut) : POSE.hang;
    drawArm(c, N.kx, top, armPose);
    c.drawImage(LEGS.crouch, N.kx, gt - 5);
    c.drawImage(TORSO, N.kx, top + 13);
    drawHead(c, N.kx, top + breathe, { dx: 0, dy: 0 }, !awake || N.wake < 4);

    if (awake) {
      pixelText(c, 'HI!', N.kx + 4, Math.max(1, top - 8), '#fff4e8', NIGHT_SKY);
      return;
    }
    // Zs drift up and to the right, then fade.
    const zs = fx() ? [0, 40, 80] : [30];
    for (const off of zs) {
      const p = ((N.t + off) % 120) / 120;
      if (p > 0.8 && (N.t & 1)) continue;
      pixelText(c, 'Z', N.kx + 19 + Math.round(p * 6), top + 2 - Math.round(p * 14), '#c9d0f0');
    }
  }

  // Loop -------------------------------------------------------------------

  const STEP = 1000 / 60;
  let running = false;
  let heroVisible = true;
  let last = 0;
  let acc = 0;

  // With reduced motion the scene only moves while something you started plays out.
  const heroBusy = () => !(koala.state === 'hold' && ball.held) || Math.abs(net.v) > 0.001 ||
    particles.length || rings.length || hearts.length || label || meter.on;
  const heroWants = () => heroVisible && (fx() || heroBusy());
  const nightWants = () => N && N.visible && (fx() || N.wake > 0);
  const shouldRun = () => !document.hidden && (heroWants() || nightWants());

  function frame(now) {
    if (!last) last = now;
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) {
      stepKoala();
      stepBall();
      stepEffects();
      stepNight();
      acc -= STEP;
    }
    if (heroVisible) draw();
    if (N && N.visible) drawNight();
    if (shouldRun()) requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    if (running || !shouldRun()) return;
    running = true;
    last = 0;
    acc = 0;
    requestAnimationFrame(frame);
  }

  function rebuild() {
    layout();
    layoutNight();
    resetBall();
    stepBall();
    draw();
    drawNight();
    start();
  }

  // Input ------------------------------------------------------------------

  function toLowRes(e, el, scale) {
    const r = el.getBoundingClientRect();
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  }

  function onKoala(x, y) {
    const ox = kxNow();
    const top = koalaTop();
    return x >= ox + 1 && x <= ox + 19 && y >= top && y <= top + 25;
  }

  let holding = false;

  function beginHold() {
    if (startShot()) holding = true;
  }

  function endHold() {
    if (!holding) return;
    holding = false;
    releaseShot();
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const [x, y] = toLowRes(e, canvas, L.scale);
    if (onKoala(x, y)) { pet(); return; }
    beginHold();
  });
  window.addEventListener('pointerup', endHold);
  window.addEventListener('pointercancel', endHold);
  window.addEventListener('blur', endHold);

  shootBtn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    beginHold();
  });
  shootBtn.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      beginHold();
    }
  });
  shootBtn.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      endHold();
    }
  });
  shootBtn.addEventListener('click', (e) => e.preventDefault());

  hero.addEventListener('pointermove', (e) => {
    if (!L) return;
    [pointer.x, pointer.y] = toLowRes(e, canvas, L.scale);
    pointer.idle = 240;
    start();
  });

  if (nightCanvas) {
    nightCanvas.addEventListener('pointerdown', (e) => {
      const [x, y] = toLowRes(e, nightCanvas, N.scale);
      if (x >= N.kx - 2 && x <= N.kx + 24 && y >= N.groundTop - 30) {
        N.wake = 110;
        start();
      }
    });
  }

  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let konamiAt = 0;
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    konamiAt = key === KONAMI[konamiAt] ? konamiAt + 1 : key === KONAMI[0] ? 1 : 0;
    if (konamiAt === KONAMI.length) {
      konamiAt = 0;
      startDunk();
      return;
    }
    if (key === 't' && heroVisible && document.activeElement?.tagName !== 'INPUT') {
      setTime(TIME_ORDER[(TIME_ORDER.indexOf(timeKey) + 1) % TIME_ORDER.length], true);
    }
  });

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, L ? 120 : 0);
  }).observe(document.body);

  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    start();
  }).observe(hero);

  if (nightCanvas) {
    new IntersectionObserver(([entry]) => {
      N.visible = entry.isIntersecting;
      start();
    }).observe(nightCanvas);
  }

  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', start);
  setTime(timeKey, false);
})();
