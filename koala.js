// Pixel court at dusk with a koala shooting around.
// Everything is drawn at low resolution and scaled up by a whole number with
// `image-rendering: pixelated`, so every art pixel stays square.
(() => {
  'use strict';

  const canvas = document.getElementById('court');
  if (!canvas) return;
  const hero = canvas.closest('.hero');
  const ctx = canvas.getContext('2d', { alpha: false });
  const shootBtn = document.getElementById('shoot');
  const tally = document.getElementById('tally');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Palette ----------------------------------------------------------------

  const SKY = ['#2b3a6b', '#33457a', '#41538a', '#56659b', '#7a7cab', '#a68aab', '#d29ca3', '#eeb8a2', '#f8d6b2'];
  const C = {
    sun: '#fff0d2', sunEdge: '#fde2b6', halo: '#fbe0bd',
    star: '#dfe4f7', starDim: '#8f9bcc',
    cloud: '#c995ab', cloudLit: '#efbcae',
    hillFar: '#6d6f9f', hillNear: '#535b8b',
    tree: '#2f4c5a', treeLit: '#456b74', bark: '#cdc4cb',
    grass: '#30505a', curb: '#c3c8d4',
    court: '#e7e9ee', paint: '#dfe2e9', line: '#cdd2dc', shadow: '#cdd1dc',
    pole: '#283152', board: '#f6f4f8', rim: '#e0582a', rimDark: '#a63c1c', net: '#f8f6fa',
  };
  const KOALA = {
    k: '#363445', g: '#9b9ba9', w: '#eceaf0', p: '#e9c7cf', n: '#2a2834', m: '#5e5b6d',
    e: '#1d1b27', f: '#5f5e6e', j: '#f4c542', J: '#d6a52c', b: '#1f5fa6', s: '#1f5fa6',
  };
  const BALL = { q: '#5c2a14', o: '#e06a2c', O: '#f39b5c', r: '#b54c1f', s: '#8a3918' };

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

  // 20px wide. Head rows 0-12, torso 13-20, legs 21-24.
  const HEAD = sprite([
    '.kkkk..........kkkk.',
    'kwwwwk........kwwwwk',
    'kwppwwkkkkkkkkwwppwk',
    'kwpppwggggggggwpppwk',
    'kwppwggggggggggwppwk',
    '.kwwggggggggggggwwk.',
    '..kggggggggggggggk..',
    '..kgggeggnnggegggk..',
    '..kgggegnmnngegggk..',
    '..kgggggnnnngggggk..',
    '..kwggggnnnnggggwk..',
    '...kwggggnnggggwk...',
    '....kwwwwwwwwwwk....',
  ], KOALA);

  // The koala's left arm is part of the torso; the right arm is drawn as
  // jointed lines so it can dribble and shoot.
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
    foot: '..kfffffk..kfffffk..',
    sole: '..kkkkkkk..kkkkkkk..',
    toe: '...kffffk..kffffk...',
    toeSole: '....kkkk....kkkk....',
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

  // Layout -----------------------------------------------------------------

  let L = null;
  let bg = null; // sky, sun, stars
  let fg = null; // hills, trees, court, hoop
  let clouds = [];

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
      kx: Math.max(4, Math.round(boardX - Math.min(110, w * 0.62))),
    };

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w * scale}px`;
    canvas.style.height = `${h * scale}px`;
    ctx.imageSmoothingEnabled = false;

    bg = paintSky();
    fg = paintGround();
    clouds = makeClouds();
  }

  function paintSky() {
    const { w, h, horizon } = L;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    const cols = SKY.map(rgb);
    const n = SKY.length - 1;

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

    // Low sun with a dithered halo, half sunk behind the hills.
    const sx = Math.round(w * 0.4);
    const sy = horizon - 7;
    const r = 9;
    for (let dy = -r - 6; dy <= r + 6; dy++) {
      for (let dx = -r - 6; dx <= r + 6; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > r && d <= r + 6 && BAYER[(sy + dy) & 3][(sx + dx) & 3] / 16 < 0.55 * (1 - (d - r) / 6)) {
          x.fillStyle = C.halo;
          x.fillRect(sx + dx, sy + dy, 1, 1);
        }
      }
    }
    disc(x, sx, sy, r, C.sunEdge);
    disc(x, sx, sy, r - 1, C.sun);

    // First stars in the upper sky.
    const rand = seeded(7);
    const count = Math.round(w * 0.06);
    for (let i = 0; i < count; i++) {
      x.fillStyle = rand() < 0.3 ? C.star : C.starDim;
      x.fillRect(Math.floor(rand() * w), Math.floor(rand() * horizon * 0.38), 1, 1);
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
      c.fillStyle = C.bark;
      c.fillRect(x0 + sway, y, 2, 1);
    }
    line(c, x0 + 1, fork, x0 + 8, fork - 9, 1, 0, C.bark);
    line(c, x0, fork + 3, x0 - 6, fork - 5, 1, 0, C.bark);

    const clumps = [
      [x0 + 1, top + 2, 6], [x0 - 4, top + 5, 5], [x0 + 6, top + 4, 5],
      [x0 + 9, fork - 10, 4], [x0 - 7, fork - 6, 4],
    ];
    for (const [cx, cy, r] of clumps) disc(c, cx, cy, r, C.tree);
    // Light catches the upper left of each clump.
    c.fillStyle = C.treeLit;
    for (const [cx, cy, r] of clumps) {
      for (let k = 0; k < r * 3; k++) {
        const a = Math.PI * (1 + rand() * 0.6);
        const d = rand() * (r - 1);
        c.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d - 1), 1, 1);
      }
    }
  }

  function paintGround() {
    const { w, h, horizon, groundY, floorY, ballFloor, boardX, boardTop, boardBot, poleX, rimY, rimX0, rimX1 } = L;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');

    for (let px = 0; px < w; px++) {
      const far = hillLine(px, horizon - 9, 5, 0.045, 0.11, 1);
      const near = hillLine(px, horizon - 2, 3, 0.07, 0.19, 4);
      x.fillStyle = C.hillFar;
      x.fillRect(px, far, 1, groundY - far);
      x.fillStyle = C.hillNear;
      x.fillRect(px, near, 1, groundY - near);
    }

    const rand = seeded(11);
    const treeH = Math.min(52, Math.round(h * 0.17) + 14);
    [[0.06, 1], [0.3, 0.8], [0.52, 1.05]].forEach(([fx, hs]) => {
      const tx = Math.round(w * fx);
      if (tx < rimX0 - 26 && (tx < L.kx - 12 || tx > L.kx + 32)) tree(x, tx, groundY, Math.round(treeH * hs), rand);
    });

    // Grass verge with a few shrubs, then the curb, then the court.
    x.fillStyle = C.grass;
    x.fillRect(0, groundY - 1, w, 3);
    for (let px = 2; px < w; px += 9 + Math.floor(rand() * 9)) disc(x, px, groundY - 1, 2 + Math.floor(rand() * 2), C.grass);
    x.fillStyle = C.curb;
    x.fillRect(0, groundY + 2, w, 1);
    x.fillStyle = C.court;
    x.fillRect(0, groundY + 3, w, h - groundY - 3);

    // The paint under the hoop, with a slanted free-throw line for depth.
    const keyX = rimX0 - 18;
    x.fillStyle = C.paint;
    for (let y = groundY + 3; y <= ballFloor + 5; y++) {
      const lean = Math.round(((y - groundY - 3) / (ballFloor + 2 - groundY)) * -3);
      x.fillRect(keyX + lean, y, w - keyX - lean, 1);
      x.fillStyle = C.line;
      x.fillRect(keyX + lean, y, 1, 1);
      x.fillStyle = C.paint;
    }
    x.fillStyle = C.line;
    x.fillRect(0, ballFloor + 6, w, 1);

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
        disc(x, px, base - Math.round(r * 0.5), r, C.cloud);
      }
      x.clearRect(0, base + 1, cw, ch);
      // Flat underside, lit from below by the sun.
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = C.cloudLit;
      x.fillRect(0, base - 1, cw, 2);
      return { img: c, x: fx * w, y: Math.round(fy * horizon), w: cw };
    });
  }

  // State ------------------------------------------------------------------

  const G = 0.12;
  const koala = { state: 'hold', t: 0, wait: 120, queued: false, cheer: 0, from: POSE.hold };
  const ball = { x: 0, y: 0, vx: 0, vy: 0, held: true, spin: 0, scored: false, bounces: 0, flight: 0 };
  const net = { s: 1, v: 0 };
  let makes = 0;
  let attempts = 0;

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

  const koalaTop = () => L.floorY - 25 + lift;
  const catchX = () => L.kx + HOLD_BALL[0];

  function resetBall() {
    koala.state = 'hold';
    koala.t = 0;
    ball.held = true;
    ball.vx = ball.vy = 0;
  }

  function shoot() {
    if (koala.state !== 'hold' && koala.state !== 'dribble') {
      koala.queued = true;
      return;
    }
    koala.from = pose;
    koala.state = 'shoot';
    koala.t = 0;
    koala.queued = false;
    start();
  }

  function launch() {
    const make = Math.random() < 0.7;
    const mid = (L.rimX0 + L.rimX1) / 2;
    const tx = make ? mid + (Math.random() - 0.5) * 2 : mid + (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 1.5);
    const ty = L.rimY - 1;
    const apex = ty - (22 + Math.random() * 6);
    const vy = -Math.sqrt(2 * G * (ball.y - apex));
    const time = -vy / G + Math.sqrt((2 * (ty - apex)) / G);
    ball.held = false;
    ball.vx = (tx - ball.x) / time;
    ball.vy = vy;
    ball.scored = false;
    ball.bounces = 0;
    ball.flight = 0;
    attempts++;
    updateTally();
  }

  function updateTally() {
    tally.textContent = `Made ${makes} of ${attempts}.`;
  }

  function stepKoala() {
    const k = koala;
    k.t++;
    lift = 0;
    crouch = 0;
    legs = LEGS.stand;

    if (k.state === 'hold') {
      pose = POSE.hold;
      if (k.queued) shoot();
      else if (autoplay() && k.t > 40) { k.state = 'dribble'; k.t = 0; k.wait = 150 + Math.random() * 90; }
    } else if (k.state === 'dribble') {
      pose = POSE.dribble;
      if (autoplay() && k.t > k.wait) shoot();
    } else if (k.state === 'shoot') {
      const t = k.t;
      if (t < 12) pose = blend(k.from, POSE.gather, t / 12);
      else if (t < 24) pose = blend(POSE.gather, POSE.set, (t - 12) / 10);
      else pose = blend(POSE.set, POSE.release, (t - 24) / 4);
      if ((t >= 4 && t < 16) || (t >= 44 && t < 48)) { crouch = 1; legs = LEGS.crouch; }
      if (t >= 16 && t < 44) { lift = -Math.round(7 * Math.sin((Math.PI * (t - 16)) / 28)); legs = LEGS.air; }
      if (t === 26) launch();
      if (t >= 48) { k.state = 'watch'; k.t = 0; }
    } else if (k.state === 'watch') {
      pose = blend(POSE.release, POSE.hang, k.t / 14);
      if (k.cheer > 0) {
        const c = 30 - k.cheer;
        pose = blend(POSE.hang, POSE.cheer, c < 8 ? c / 8 : (30 - c) / 8);
        lift = -Math.round(3 * Math.sin((Math.PI * c) / 30));
        if (lift < 0) legs = LEGS.air;
        k.cheer--;
      }
    }
  }

  function heldBallPosition() {
    const top = koalaTop() + crouch;
    const k = koala;
    if (k.state === 'dribble') {
      // Bounce between the paw and the floor; the paw follows the ball top.
      const period = 26;
      const phase = (k.t % period) / period;
      const bottom = L.ballFloor - 3;
      const high = top + 19;
      ball.x = L.kx + 22;
      ball.y = bottom - (bottom - high) * Math.sin(Math.PI * phase);
      const pawY = Math.max(15, Math.min(18, ball.y - 4 - top));
      pose = { e: POSE.dribble.e, p: [21, pawY] };
      ball.spin = 0;
      return;
    }
    if (k.state === 'shoot' && k.t >= 12) {
      ball.x = L.kx + pose.p[0] + OVERHEAD[0];
      ball.y = top + pose.p[1] + OVERHEAD[1];
      return;
    }
    if (k.state === 'shoot') {
      // Slide from the hip to overhead during the gather.
      const u = ease(k.t / 12);
      const over = [pose.p[0] + OVERHEAD[0], pose.p[1] + OVERHEAD[1]];
      ball.x = L.kx + mix(HOLD_BALL[0], over[0], u);
      ball.y = top + mix(HOLD_BALL[1], over[1], u);
      return;
    }
    ball.x = L.kx + HOLD_BALL[0];
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

    bounceOffPoint(L.rimX0, L.rimY + 0.5);
    bounceOffPoint(L.rimX1, L.rimY + 0.5);

    if (ball.vx > 0 && ball.x + 3 > L.boardX && ball.x < L.boardX + 2 && ball.y > L.boardTop - 2 && ball.y < L.boardBot + 2) {
      ball.x = L.boardX - 3;
      ball.vx = -ball.vx * 0.55;
    }

    const inRim = ball.x > L.rimX0 + 1 && ball.x < L.rimX1 - 1;
    if (!ball.scored && ball.vy > 0 && prevY < L.rimY + 1 && ball.y >= L.rimY + 1 && inRim) {
      ball.scored = true;
      makes++;
      net.v += 0.32;
      koala.cheer = 30;
      updateTally();
    }
    if (inRim && ball.y > L.rimY && ball.y < L.rimY + 9) ball.vx *= 0.9; // the net catches it

    if (ball.x < 3) { ball.x = 3; ball.vx = Math.abs(ball.vx); }
    if (ball.x > L.w - 3) { ball.x = L.w - 3; ball.vx = -Math.abs(ball.vx); }

    const floor = L.ballFloor - 3;
    if (ball.y >= floor) {
      ball.y = floor;
      if (ball.vy > 0.8) {
        ball.vy = -ball.vy * 0.55;
        ball.vx *= 0.85;
        ball.bounces++;
      } else {
        // Rolling: head back to the koala.
        ball.vy = 0;
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

  function stepNet() {
    net.v += -0.08 * (net.s - 1) - 0.12 * net.v;
    net.s += net.v;
  }

  function stepClouds() {
    if (reducedMotion.matches) return;
    for (const c of clouds) {
      c.x += 0.012;
      if (c.x > L.w + 2) c.x = -c.w - 2;
    }
  }

  // Rendering --------------------------------------------------------------

  function drawArm(top) {
    const ox = L.kx;
    const s = [ox + SHOULDER[0], top + SHOULDER[1]];
    const e = [ox + pose.e[0], top + pose.e[1]];
    const p = [ox + pose.p[0], top + pose.p[1]];
    line(ctx, s[0], s[1], e[0], e[1], 4, -1, KOALA.k);
    line(ctx, e[0], e[1], p[0], p[1], 4, -1, KOALA.k);
    line(ctx, s[0], s[1], e[0], e[1], 2, 0, KOALA.g);
    line(ctx, e[0], e[1], p[0], p[1], 2, 0, KOALA.g);
    ctx.fillStyle = KOALA.f;
    ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 2, 2);
  }

  function drawKoala() {
    const top = koalaTop();
    const upper = top + crouch;
    // Shadow shrinks while airborne.
    const sw = lift < -3 ? 11 : 15;
    ctx.fillStyle = C.shadow;
    ctx.fillRect(L.kx + 10 - (sw >> 1), L.floorY, sw, 1);
    ctx.fillRect(L.kx + 12 - (sw >> 1), L.floorY + 1, sw - 4, 1);

    drawArm(upper);
    ctx.drawImage(legs, L.kx, upper + 21 + (legs === LEGS.crouch ? 0 : -crouch));
    ctx.drawImage(TORSO, L.kx, upper + 13);
    ctx.drawImage(HEAD, L.kx, upper);
  }

  function drawBall() {
    const bx = Math.round(ball.x - 3);
    const by = Math.round(ball.y - 3);
    const height = L.ballFloor - (ball.y + 3);
    const sw = height > 18 ? 2 : height > 6 ? 4 : 6;
    ctx.fillStyle = C.shadow;
    ctx.fillRect(Math.round(ball.x) - (sw >> 1), L.ballFloor, sw, 1);
    const frame = ((Math.floor(ball.spin) % 5) + 5) % 5;
    ctx.drawImage(BALL_FRAMES[frame], bx, by);
  }

  function drawNet() {
    const { rimX0, rimX1, rimY } = L;
    const mid = (rimX0 + rimX1) / 2;
    const stretch = Math.max(0.7, net.s);
    const bottomY = rimY + 2 + Math.round(7 * stretch);
    const tops = [0, 1, 2, 3, 4].map((i) => [rimX0 + 1 + i * 2, rimY + 1]);
    const bottoms = [0, 1, 2, 3, 4].map((i) => [Math.round(mid + (i - 2) * 1.1 / stretch), bottomY]);
    for (let i = 0; i < 4; i++) {
      line(ctx, tops[i][0], tops[i][1], bottoms[i + 1][0], bottoms[i + 1][1], 1, 0, C.net);
      line(ctx, tops[i + 1][0], tops[i + 1][1], bottoms[i][0], bottoms[i][1], 1, 0, C.net);
    }
    line(ctx, tops[0][0], tops[0][1], bottoms[0][0], bottoms[0][1], 1, 0, C.net);
    line(ctx, tops[4][0], tops[4][1], bottoms[4][0], bottoms[4][1], 1, 0, C.net);
    ctx.fillStyle = C.rim;
    ctx.fillRect(rimX0 - 1, rimY + 1, rimX1 - rimX0 + 1, 1);
  }

  function draw() {
    ctx.drawImage(bg, 0, 0);
    for (const c of clouds) ctx.drawImage(c.img, Math.round(c.x), c.y);
    ctx.drawImage(fg, 0, 0);
    drawKoala();
    drawBall();
    drawNet();
  }

  // Loop -------------------------------------------------------------------

  const STEP = 1000 / 60;
  let running = false;
  let visible = true;
  let last = 0;
  let acc = 0;

  const autoplay = () => !reducedMotion.matches;
  // With reduced motion the scene only moves while a shot you asked for plays out.
  const busy = () => !(koala.state === 'hold' && ball.held) || Math.abs(net.v) > 0.001;
  const shouldRun = () => visible && !document.hidden && (autoplay() || busy());

  function frame(now) {
    if (!last) last = now;
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) {
      stepKoala();
      stepBall();
      stepNet();
      stepClouds();
      acc -= STEP;
    }
    draw();
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
    resetBall();
    stepBall();
    draw();
    start();
  }

  canvas.addEventListener('click', shoot);
  shootBtn.addEventListener('click', shoot);

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, L ? 120 : 0);
  }).observe(hero);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  }).observe(hero);

  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener('change', start);
})();
