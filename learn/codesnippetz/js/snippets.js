const snippets = [

  // ── BUTTONS ─────────────────────────────────────────

  {
    id: 'btn-pulse', category: 'Buttons', name: 'Pulse Effect',
    html: `<button class="btn">Hover Me</button>`,
    css: `.btn {
  background: #5af0c4;
  color: #0d0f14;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-family: sans-serif;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 0 10px rgba(90, 240, 196, 0.15);
}`, js: '',
    experiments: [
      'Change <code>scale(1.05)</code> to <code>scale(1.12)</code> — how does the hover feel?',
      'Change the spread <code>10px</code> in <code>box-shadow</code> to <code>24px</code> — wider pulse ring.',
      'Replace <code>rgba(90, 240, 196, 0.15)</code> with <code>rgba(123, 140, 255, 0.3)</code> — purple glow.',
      'Remove the <code>transition</code> line — notice the instant jump vs. smooth change.',
      'Try <code>border-radius: 50px</code> for a pill-shaped button.'
    ]
  },

  {
    id: 'btn-shine', category: 'Buttons', name: 'Slide Shine',
    html: `<button class="btn">Slide Shine</button>`,
    css: `.btn {
  position: relative;
  overflow: hidden;
  background: #1c2030;
  color: #e4e8f0;
  border: 1px solid #2a2f42;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-family: sans-serif;
  font-size: 1rem;
  cursor: pointer;
}
.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent 30%,
    rgba(255, 255, 255, 0.15) 50%,
    transparent 70%
  );
  transition: left 0.45s ease;
}
.btn:hover::before {
  left: 150%;
}`, js: '',
    experiments: [
      'Change <code>left: -100%</code> to <code>top: -100%</code> (and update the hover to <code>top: 150%</code>) — vertical shine.',
      'Change <code>0.45s</code> to <code>0.2s</code> — a snappier swipe.',
      'Increase the shine width from <code>60%</code> to <code>100%</code>.',
      'Change <code>rgba(255,255,255,0.15)</code> to <code>rgba(90,240,196,0.35)</code> — teal shine.'
    ]
  },

  {
    id: 'btn-gradient-wave', category: 'Buttons', name: 'Gradient Wave',
    html: `<button class="btn">Gradient Wave</button>`,
    css: `.btn {
  background: linear-gradient(
    270deg, #5af0c4, #7b8cff, #5af0c4
  );
  background-size: 200% 200%;
  color: #0d0f14;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-family: sans-serif;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  animation: wave 3s ease infinite;
}
@keyframes wave {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`, js: '',
    experiments: [
      'Change <code>3s</code> to <code>0.8s</code> — fast, intense wave.',
      'Add a third color: <code>#5af0c4, #7b8cff, #ffcf6b, #5af0c4</code>.',
      'Change the gradient direction from <code>270deg</code> to <code>45deg</code>.',
      'Try <code>background-size: 400% 400%</code> for a more dramatic color shift.'
    ]
  },

  {
    id: 'btn-glass', category: 'Buttons', name: 'Glass Morph',
    html: `<div class="bg">
  <button class="btn">Glass Button</button>
</div>`,
    css: `.bg {
  background: linear-gradient(135deg, #5af0c4, #7b8cff);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  border-radius: 12px;
}
.btn {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-family: sans-serif;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.btn:hover {
  background: rgba(255, 255, 255, 0.22);
}`, js: '',
    experiments: [
      'Change <code>blur(12px)</code> to <code>blur(2px)</code> — how clear is the bg behind it?',
      'Change <code>rgba(255,255,255,0.1)</code> to <code>rgba(0,0,0,0.35)</code> — dark glass.',
      'Remove <code>backdrop-filter</code> entirely — what does the button look like without it?',
      'Change the background gradient colors to <code>#ff8c5a, #ffcf6b</code> — warm version.'
    ]
  },

  {
    id: 'btn-3d-press', category: 'Buttons', name: '3D Press',
    html: `<button class="btn">Press Me</button>`,
    css: `.btn {
  background: #5af0c4;
  color: #0d0f14;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-family: sans-serif;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 6px 0 #2a9b78;
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #2a9b78;
}`, js: '',
    experiments: [
      'Change <code>0 6px 0 #2a9b78</code> to <code>0 10px 0 #2a9b78</code> — a taller button.',
      'Change the shadow color <code>#2a9b78</code> to <code>#4a5b9a</code> — blue version.',
      'Add <code>.btn:hover { transform: translateY(-2px); box-shadow: 0 8px 0 #2a9b78; }</code> for a lift.',
      'Click and hold — increase <code>translateY(4px)</code> to match the shadow depth.'
    ]
  },

  {
    id: 'btn-neon', category: 'Buttons', name: 'Neon Glow',
    html: `<button class="btn">Neon Glow</button>`,
    css: `.btn {
  background: transparent;
  color: #5af0c4;
  border: 1px solid #5af0c4;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-family: sans-serif;
  font-size: 1rem;
  cursor: pointer;
  transition: box-shadow 0.25s, background 0.25s;
}
.btn:hover {
  background: rgba(90, 240, 196, 0.06);
  box-shadow:
    0 0 8px rgba(90, 240, 196, 0.5),
    0 0 24px rgba(90, 240, 196, 0.25),
    0 0 48px rgba(90, 240, 196, 0.1);
}`, js: '',
    experiments: [
      'Change all <code>#5af0c4</code> / <code>90, 240, 196</code> to <code>#7b8cff</code> / <code>123, 140, 255</code> — purple neon.',
      'Add a 4th shadow: <code>0 0 80px rgba(90, 240, 196, 0.05)</code> for a wider halo.',
      'Add <code>text-shadow: 0 0 8px #5af0c4;</code> inside <code>:hover</code> — glowing text too.',
      'Increase the first shadow from <code>8px</code> to <code>20px</code> — how intense?'
    ]
  },

  {
    id: 'btn-rotating-border', category: 'Buttons', name: 'Rotating Border',
    html: `<button class="btn">Rotating Border</button>`,
    css: `@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.btn {
  position: relative;
  background: #151820;
  color: #e4e8f0;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-family: sans-serif;
  font-size: 1rem;
  cursor: pointer;
  z-index: 0;
}
.btn::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 10px;
  background: conic-gradient(
    from var(--angle),
    #5af0c4, #7b8cff, #ffcf6b, #5af0c4
  );
  z-index: -1;
  animation: spin 3s linear infinite;
}
.btn::after {
  content: '';
  position: absolute;
  inset: 1px;
  background: #151820;
  border-radius: 7px;
  z-index: -1;
}
@keyframes spin {
  to { --angle: 360deg; }
}`, js: '',
    experiments: [
      'Change <code>3s</code> to <code>1s</code> — how fast does the border spin?',
      'Remove <code>#ffcf6b</code> from the conic-gradient — two-color border.',
      'Change <code>inset: -2px</code> to <code>inset: -4px</code> — thicker border.',
      'Try <code>border-radius: 50px</code> on <code>.btn</code>, <code>52px</code> on <code>::before</code>, <code>49px</code> on <code>::after</code>.'
    ]
  },

  {
    id: 'btn-liquid', category: 'Buttons', name: 'Liquid Slide',
    html: `<button class="btn">
  <span class="fill"></span>
  <span class="label">Liquid Slide</span>
</button>`,
    css: `.btn {
  position: relative;
  overflow: hidden;
  background: transparent;
  color: #e4e8f0;
  border: 1px solid #5af0c4;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-family: sans-serif;
  font-size: 1rem;
  cursor: pointer;
}
.label {
  position: relative;
  z-index: 1;
  transition: color 0.3s;
}
.fill {
  position: absolute;
  bottom: -100%;
  left: 0;
  width: 100%;
  height: 100%;
  background: #5af0c4;
  transition: bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn:hover .fill { bottom: 0; }
.btn:hover .label { color: #0d0f14; }`, js: '',
    experiments: [
      'Change <code>bottom: -100%</code> to <code>left: -100%</code> (and <code>bottom: 0</code> → <code>left: 0</code>) — fill from left.',
      'Change the easing to <code>ease</code> — smoother, less snappy.',
      'Change the fill color to <code>linear-gradient(135deg, #5af0c4, #7b8cff)</code>.',
      'Change <code>0.35s</code> to <code>0.6s</code> — a slow, dramatic fill.'
    ]
  },

  // ── NAVBARS ──────────────────────────────────────────

  {
    id: 'nav-blur', category: 'Navbars', name: 'Sticky Blur',
    html: `<nav class="navbar">
  <a class="logo" href="#">Brand</a>
  <ul>
    <li><a href="#">Home</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Work</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
</nav>
<div class="scroll-area">// scroll area — try scrolling in the preview</div>`,
    css: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0d0f14; }
.navbar {
  position: sticky;
  top: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
  background: rgba(13, 15, 20, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(42, 47, 66, 0.6);
  z-index: 100;
}
.logo {
  font-family: sans-serif;
  font-weight: 800;
  color: #5af0c4;
  text-decoration: none;
}
ul { list-style: none; display: flex; gap: 2rem; }
ul a {
  font-family: sans-serif;
  font-size: 0.88rem;
  color: #9aa0b8;
  text-decoration: none;
  transition: color 0.18s;
}
ul a:hover { color: #e4e8f0; }
.scroll-area {
  height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: monospace;
  font-size: 0.8rem;
  color: #2a2f42;
  background: linear-gradient(to bottom, #151820, #0d0f14);
}`, js: '',
    experiments: [
      'Change <code>blur(16px)</code> to <code>blur(2px)</code> — less frosted.',
      'Change <code>rgba(13, 15, 20, 0.75)</code> to <code>0.98</code> — nearly solid.',
      'Remove <code>backdrop-filter</code> entirely — no glass effect.',
      'Change <code>height: 60px</code> to <code>80px</code> — a taller, more spacious nav.'
    ]
  },

  {
    id: 'nav-underline', category: 'Navbars', name: 'Underline Hover',
    html: `<nav class="navbar">
  <a class="logo" href="#">Brand</a>
  <ul>
    <li><a href="#">Home</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Work</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
</nav>`,
    css: `* { margin: 0; padding: 0; box-sizing: border-box; }
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
  background: #151820;
  border-bottom: 1px solid #2a2f42;
}
.logo {
  font-family: sans-serif;
  font-weight: 800;
  color: #e4e8f0;
  text-decoration: none;
}
ul { list-style: none; display: flex; gap: 2rem; }
ul a {
  position: relative;
  font-family: sans-serif;
  font-size: 0.88rem;
  color: #9aa0b8;
  text-decoration: none;
  padding-bottom: 4px;
}
ul a::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: #5af0c4;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.25s ease;
}
ul a:hover { color: #e4e8f0; }
ul a:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}`, js: '',
    experiments: [
      'Change <code>height: 2px</code> to <code>4px</code> — a thicker underline.',
      'Change <code>transform-origin: right</code> to <code>center</code> — expands from the middle.',
      'Change <code>background: #5af0c4</code> to <code>linear-gradient(to right, #5af0c4, #7b8cff)</code> — gradient underline.',
      'Change <code>0.25s ease</code> to <code>0.5s cubic-bezier(0.68,-0.55,0.27,1.55)</code> — springy feel.'
    ]
  },

  {
    id: 'nav-hamburger', category: 'Navbars', name: 'Hamburger Menu',
    html: `<nav class="navbar">
  <a class="logo" href="#">Brand</a>
  <button class="hamburger" id="ham" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
</nav>
<ul class="mobile-menu" id="menu">
  <li><a href="#">Home</a></li>
  <li><a href="#">About</a></li>
  <li><a href="#">Work</a></li>
  <li><a href="#">Contact</a></li>
</ul>`,
    css: `* { margin: 0; padding: 0; box-sizing: border-box; }
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 60px;
  background: #151820;
  border-bottom: 1px solid #2a2f42;
}
.logo {
  font-family: sans-serif;
  font-weight: 800;
  color: #5af0c4;
  text-decoration: none;
}
.hamburger {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 4px;
}
.hamburger span {
  display: block;
  width: 22px;
  height: 2px;
  background: #e4e8f0;
  border-radius: 2px;
  transition: transform 0.3s, opacity 0.3s;
}
.hamburger.open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}
.mobile-menu {
  list-style: none;
  background: #1c2030;
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.35s ease;
}
.mobile-menu.open { max-height: 300px; }
.mobile-menu li a {
  display: block;
  padding: 0.9rem 1.5rem;
  font-family: sans-serif;
  color: #9aa0b8;
  text-decoration: none;
  border-bottom: 1px solid #2a2f42;
  transition: color 0.18s;
}
.mobile-menu li a:hover { color: #5af0c4; }`,
    js: `document.getElementById('ham').addEventListener('click', function() {
  this.classList.toggle('open');
  document.getElementById('menu').classList.toggle('open');
});`,
    experiments: [
      'Change the bar <code>gap: 5px</code> to <code>8px</code> — wider spacing between bars.',
      'Change <code>0.3s</code> to <code>0.6s</code> — a slower morph into X.',
      'Change <code>ease</code> on the menu to <code>cubic-bezier(0.68,-0.55,0.27,1.55)</code> — springy open.',
      'Change <code>width: 22px</code> to <code>28px</code> — longer bars.'
    ]
  },

  // ── CARDS ────────────────────────────────────────────

  {
    id: 'card-floating', category: 'Cards', name: 'Floating Card',
    html: `<div class="card">
  <div class="card-icon">✦</div>
  <h3>Floating Card</h3>
  <p>Hover to see the lift effect with a soft drop shadow.</p>
  <a href="#" class="card-link">Learn more →</a>
</div>`,
    css: `.card {
  background: #1c2030;
  border: 1px solid #2a2f42;
  border-radius: 16px;
  padding: 1.75rem;
  width: 240px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  cursor: default;
}
.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  border-color: rgba(90, 240, 196, 0.3);
}
.card-icon {
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
  color: #5af0c4;
}
h3 {
  font-family: sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #e4e8f0;
  margin-bottom: 0.4rem;
}
p {
  font-family: monospace;
  font-size: 0.78rem;
  color: #6b7390;
  line-height: 1.6;
  margin-bottom: 1rem;
}
.card-link {
  font-family: monospace;
  font-size: 0.75rem;
  color: #5af0c4;
  text-decoration: none;
}`, js: '',
    experiments: [
      'Change <code>translateY(-8px)</code> to <code>translateY(-18px)</code> — dramatic float.',
      'Change the box-shadow color from <code>rgba(0,0,0,0.35)</code> to <code>rgba(90,240,196,0.12)</code> — teal shadow.',
      'Change <code>0.25s ease</code> to <code>0.4s cubic-bezier(0.34,1.56,0.64,1)</code> — bouncy lift.',
      'Remove the <code>border-color</code> from hover — how does the card feel without it?'
    ]
  },

  {
    id: 'card-flip', category: 'Cards', name: 'Flip Card',
    html: `<div class="flip-scene">
  <div class="flip-card">
    <div class="flip-front">
      <div class="icon">✦</div>
      <h3>Front Side</h3>
      <p>Hover to flip</p>
    </div>
    <div class="flip-back">
      <div class="icon">★</div>
      <h3>Back Side</h3>
      <p>Hidden content revealed!</p>
    </div>
  </div>
</div>`,
    css: `.flip-scene {
  width: 220px;
  height: 200px;
  perspective: 800px;
  cursor: pointer;
}
.flip-card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.flip-scene:hover .flip-card {
  transform: rotateY(180deg);
}
.flip-front, .flip-back {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.flip-front {
  background: #1c2030;
  border: 1px solid #2a2f42;
}
.flip-back {
  background: linear-gradient(135deg, #1c2030, #151820);
  border: 1px solid rgba(90, 240, 196, 0.3);
  transform: rotateY(180deg);
}
.icon { font-size: 1.5rem; margin-bottom: 0.5rem; color: #5af0c4; }
h3 { font-family: sans-serif; font-size: 1rem; color: #e4e8f0; margin-bottom: 0.3rem; }
p  { font-family: monospace; font-size: 0.75rem; color: #6b7390; }`, js: '',
    experiments: [
      'Change <code>perspective: 800px</code> to <code>300px</code> — more extreme 3D distortion.',
      'Change <code>rotateY(180deg)</code> to <code>rotateX(180deg)</code> — flip vertically.',
      'Change <code>0.6s</code> to <code>1.4s</code> — slow, cinematic flip.',
      'Try <code>rotateY(-180deg)</code> — the card flips in the opposite direction.'
    ]
  },

  {
    id: 'card-glass', category: 'Cards', name: 'Glassmorphism',
    html: `<div class="glass-bg">
  <div class="card">
    <div class="icon">✦</div>
    <h3>Glass Card</h3>
    <p>Frosted glass using backdrop-filter blur.</p>
    <button class="action">Get Started</button>
  </div>
</div>`,
    css: `.glass-bg {
  background: linear-gradient(135deg, #5af0c4 0%, #7b8cff 100%);
  padding: 3rem 2rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  padding: 1.75rem;
  width: 220px;
  text-align: center;
}
.icon { font-size: 1.5rem; margin-bottom: 0.75rem; }
h3 {
  font-family: sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.4rem;
}
p {
  font-family: monospace;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.7);
  line-height: 1.6;
  margin-bottom: 1rem;
}
.action {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  color: #fff;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  font-family: sans-serif;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.18s;
}
.action:hover { background: rgba(255,255,255,0.3); }`, js: '',
    experiments: [
      'Change <code>blur(16px)</code> to <code>blur(3px)</code> — less frosted.',
      'Change <code>rgba(255,255,255,0.08)</code> to <code>rgba(0,0,0,0.35)</code> — dark glass on same bg.',
      'Remove <code>backdrop-filter</code> — what does the card look like without it?',
      'Change the background gradient to <code>#ff8c5a, #ffcf6b</code> — warm amber version.'
    ]
  },

  {
    id: 'card-tilt', category: 'Cards', name: '3D Tilt',
    html: `<div class="tilt-scene" id="tiltCard">
  <div class="tilt-body">
    <span class="icon">✦</span>
    <h3>3D Tilt Card</h3>
    <p>Move your cursor over this card.</p>
  </div>
</div>`,
    css: `.tilt-scene {
  width: 240px;
  perspective: 900px;
  cursor: crosshair;
}
.tilt-body {
  background: #1c2030;
  border: 1px solid #2a2f42;
  border-radius: 16px;
  padding: 2rem 1.5rem;
  transform-style: preserve-3d;
  transition: transform 0.1s linear;
  text-align: center;
}
.icon {
  display: block;
  font-size: 1.75rem;
  color: #5af0c4;
  margin-bottom: 0.6rem;
  transform: translateZ(20px);
}
h3 {
  font-family: sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #e4e8f0;
  margin-bottom: 0.3rem;
  transform: translateZ(15px);
}
p {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7390;
  line-height: 1.6;
  transform: translateZ(10px);
}`,
    js: `const card = document.getElementById('tiltCard');
const body = card.querySelector('.tilt-body');
card.addEventListener('mousemove', e => {
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width  - 0.5;
  const y = (e.clientY - r.top)  / r.height - 0.5;
  body.style.transform =
    \`rotateY(\${x * 22}deg) rotateX(\${-y * 22}deg)\`;
});
card.addEventListener('mouseleave', () => {
  body.style.transform = 'rotateY(0deg) rotateX(0deg)';
});`,
    experiments: [
      'Change <code>22</code> (degrees) to <code>10</code> — a more subtle, realistic tilt.',
      'Change <code>perspective: 900px</code> to <code>400px</code> — more extreme 3D distortion.',
      'Change <code>translateZ(20px)</code> on the icon to <code>50px</code> — pops out further.',
      'Change <code>0.1s linear</code> to <code>0.4s ease</code> — smoother, but laggier.'
    ]
  },

  {
    id: 'card-spotlight', category: 'Cards', name: 'Spotlight',
    html: `<div class="card" id="spotCard">
  <span class="icon">✦</span>
  <h3>Spotlight Card</h3>
  <p>Move your cursor over this card to see the spotlight follow.</p>
</div>`,
    css: `.card {
  position: relative;
  overflow: hidden;
  background: #1c2030;
  border: 1px solid #2a2f42;
  border-radius: 16px;
  padding: 2rem 1.5rem;
  width: 240px;
  cursor: crosshair;
  transition: border-color 0.25s;
}
.card::before {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(90, 240, 196, 0.12) 0%,
    transparent 70%
  );
  left: calc(var(--sx, -200px) - 150px);
  top:  calc(var(--sy, -200px) - 150px);
  pointer-events: none;
}
.card:hover { border-color: rgba(90, 240, 196, 0.3); }
.icon {
  display: block;
  font-size: 1.75rem;
  color: #5af0c4;
  margin-bottom: 0.75rem;
}
h3 {
  font-family: sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #e4e8f0;
  margin-bottom: 0.3rem;
}
p {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7390;
  line-height: 1.6;
}`,
    js: `const card = document.getElementById('spotCard');
card.addEventListener('mousemove', e => {
  const r = card.getBoundingClientRect();
  card.style.setProperty('--sx', (e.clientX - r.left) + 'px');
  card.style.setProperty('--sy', (e.clientY - r.top)  + 'px');
});
card.addEventListener('mouseleave', () => {
  card.style.setProperty('--sx', '-200px');
  card.style.setProperty('--sy', '-200px');
});`,
    experiments: [
      'Change the spotlight size from <code>300px</code> to <code>500px</code> — a wider beam.',
      'Change <code>rgba(90,240,196,0.12)</code> to <code>rgba(255,207,107,0.2)</code> — amber spotlight.',
      'Change <code>transparent 70%</code> to <code>transparent 40%</code> — harder spotlight edge.',
      'Change <code>0.25s</code> on the border transition to <code>0s</code> — instant border reveal.'
    ]
  },

  // ── SLIDERS ──────────────────────────────────────────

  {
    id: 'slider-range', category: 'Sliders', name: 'Styled Range Input',
    html: `<div class="wrap">
  <label>Volume</label>
  <input type="range" class="slider" min="0" max="100" value="60" id="slider" />
  <span class="val" id="val">60</span>
</div>`,
    css: `.wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}
label {
  font-family: monospace;
  font-size: 0.72rem;
  color: #6b7390;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.val {
  font-family: monospace;
  font-size: 1rem;
  font-weight: 700;
  color: #5af0c4;
}
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 260px;
  height: 4px;
  background: #2a2f42;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #5af0c4;
  box-shadow: 0 0 8px rgba(90, 240, 196, 0.4);
  transition: transform 0.15s;
}
.slider::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}`,
    js: `const s = document.getElementById('slider');
const v = document.getElementById('val');
s.addEventListener('input', () => v.textContent = s.value);`,
    experiments: [
      'Change the thumb size from <code>18px</code> to <code>28px</code> — a bigger handle.',
      'Change the track <code>height: 4px</code> to <code>8px</code>.',
      'Change the thumb color to <code>#7b8cff</code> — purple thumb.',
      'Change <code>scale(1.3)</code> on hover to <code>scale(1.6)</code>.'
    ]
  },

  // ── SECTIONS ─────────────────────────────────────────

  {
    id: 'sec-hero', category: 'Sections', name: 'Hero Section',
    html: `<section class="hero">
  <p class="eyebrow">// introducing v2.0</p>
  <h1>Build faster with<br><em>beautiful components</em></h1>
  <p class="sub">Drop-in snippets, no dependencies, no build step.</p>
  <div class="btn-row">
    <button class="btn-primary">Get Started →</button>
    <button class="btn-ghost">View Docs</button>
  </div>
</section>`,
    css: `.hero {
  text-align: center;
  padding: 4rem 2rem;
  background: #0d0f14;
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  top: -150px; left: 50%;
  transform: translateX(-50%);
  width: 600px; height: 600px;
  background: radial-gradient(ellipse,
    rgba(90, 240, 196, 0.07) 0%, transparent 70%);
  pointer-events: none;
}
.eyebrow {
  font-family: monospace;
  font-size: 0.65rem;
  color: #5af0c4;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}
h1 {
  font-family: sans-serif;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 800;
  color: #e4e8f0;
  margin-bottom: 1rem;
  letter-spacing: -0.03em;
  line-height: 1.15;
}
h1 em {
  font-style: normal;
  background: linear-gradient(135deg, #5af0c4, #7b8cff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.sub {
  font-family: monospace;
  font-size: 0.82rem;
  color: #6b7390;
  max-width: 400px;
  margin: 0 auto 1.75rem;
  line-height: 1.8;
}
.btn-row { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
.btn-primary {
  background: #5af0c4; color: #0d0f14;
  border: none; padding: 0.7rem 1.6rem;
  border-radius: 8px; font-weight: 700;
  font-size: 0.85rem; cursor: pointer;
  font-family: sans-serif;
  transition: opacity 0.18s;
}
.btn-primary:hover { opacity: 0.85; }
.btn-ghost {
  background: transparent; color: #e4e8f0;
  border: 1px solid #2a2f42;
  padding: 0.7rem 1.6rem;
  border-radius: 8px; font-size: 0.85rem;
  font-family: sans-serif;
  cursor: pointer; transition: border-color 0.18s, color 0.18s;
}
.btn-ghost:hover { border-color: #5af0c4; color: #5af0c4; }`, js: '',
    experiments: [
      'Change the gradient in <code>h1 em</code> to <code>#ffcf6b, #ff8c5a</code> — warm amber headline.',
      'Change the glow opacity from <code>0.07</code> to <code>0.18</code> — much brighter radial glow.',
      'Change <code>padding: 4rem 2rem</code> to <code>8rem 2rem</code> — a taller hero section.',
      'Change <code>letter-spacing: -0.03em</code> to <code>0.05em</code> — open vs. tight headline feel.'
    ]
  },

  {
    id: 'sec-features', category: 'Sections', name: 'Feature Grid',
    html: `<section class="features">
  <p class="eyebrow">// what's included</p>
  <h2>Everything you need</h2>
  <div class="grid">
    <div class="item"><div class="icon">⚡</div><h3>Fast</h3><p>Zero runtime overhead.</p></div>
    <div class="item"><div class="icon">🎨</div><h3>Styled</h3><p>Dark-mode first.</p></div>
    <div class="item"><div class="icon">📦</div><h3>Modular</h3><p>Copy only what you need.</p></div>
    <div class="item"><div class="icon">🔒</div><h3>Secure</h3><p>No third-party scripts.</p></div>
  </div>
</section>`,
    css: `.features {
  background: #151820;
  padding: 2.5rem 2rem;
}
.eyebrow {
  font-family: monospace;
  font-size: 0.62rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #5af0c4;
  text-align: center;
  margin-bottom: 0.5rem;
}
h2 {
  font-family: sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  text-align: center;
  color: #e4e8f0;
  margin-bottom: 2rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}
.item {
  background: #1c2030;
  border: 1px solid #2a2f42;
  border-radius: 12px;
  padding: 1.25rem;
  transition: border-color 0.2s, transform 0.2s;
}
.item:hover {
  border-color: rgba(90, 240, 196, 0.3);
  transform: translateY(-2px);
}
.icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
h3 { font-family: sans-serif; font-size: 0.85rem; font-weight: 700; color: #e4e8f0; margin-bottom: 0.3rem; }
p  { font-family: monospace; font-size: 0.68rem; color: #6b7390; line-height: 1.6; }`, js: '',
    experiments: [
      'Change <code>minmax(160px, 1fr)</code> to <code>minmax(100px, 1fr)</code> — more columns.',
      'Change <code>translateY(-2px)</code> to <code>translateY(-8px)</code> — more obvious hover lift.',
      'Change the hover <code>border-color</code> to <code>rgba(123,140,255,0.5)</code> — purple hover.',
      'Change <code>gap: 1rem</code> to <code>gap: 1.5rem</code> — more breathing room between cards.'
    ]
  },

  {
    id: 'sec-stats', category: 'Sections', name: 'Stats Counter',
    html: `<section class="stats">
  <p class="eyebrow">// by the numbers</p>
  <h2>Trusted worldwide</h2>
  <div class="grid">
    <div class="card"><div class="num" data-count="12400">0</div><div class="lbl">Developers</div></div>
    <div class="card"><div class="num" data-count="340">0</div><div class="lbl">Components</div></div>
    <div class="card"><div class="num" data-count="98">0</div><div class="lbl">% Satisfaction</div></div>
  </div>
</section>`,
    css: `.stats {
  background: #0d0f14;
  padding: 3rem 2rem;
  text-align: center;
}
.eyebrow {
  font-family: monospace;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5af0c4;
  margin-bottom: 0.4rem;
}
h2 {
  font-family: sans-serif;
  font-size: 1.4rem;
  font-weight: 800;
  color: #e4e8f0;
  margin-bottom: 2rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.card {
  background: #151820;
  border: 1px solid #2a2f42;
  border-radius: 14px;
  padding: 1.5rem 1rem;
  transition: border-color 0.25s, transform 0.25s;
}
.card:hover {
  border-color: rgba(90, 240, 196, 0.4);
  transform: translateY(-3px);
}
.num {
  font-family: sans-serif;
  font-size: 2.2rem;
  font-weight: 800;
  color: #5af0c4;
  line-height: 1;
  margin-bottom: 0.3rem;
}
.lbl {
  font-family: monospace;
  font-size: 0.65rem;
  color: #6b7390;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}`,
    js: `const ease = t => t < .5 ? 2*t*t : -1+(4-2*t)*t;
document.querySelectorAll('.num[data-count]').forEach(el => {
  const target = +el.dataset.count;
  const duration = 1800;
  let start = null;
  const step = ts => {
    if (!start) start = ts;
    const p = ease(Math.min((ts - start) / duration, 1));
    el.textContent = Math.floor(p * target);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});`,
    experiments: [
      'Change <code>1800</code> (ms) to <code>400</code> — numbers count up much faster.',
      'Change <code>font-size: 2.2rem</code> to <code>3.5rem</code> on <code>.num</code> — big hero numbers.',
      'Replace the easing function body with just <code>t</code> — linear counting (no ease-out).',
      'Change the number color from <code>#5af0c4</code> to <code>#ffcf6b</code> — amber stats.'
    ]
  },

  {
    id: 'sec-marquee', category: 'Sections', name: 'Marquee Ticker',
    html: `<div class="marquee-section">
  <p class="lbl">// trusted by teams at</p>
  <div class="wrap">
    <div class="track">
      <span class="item">Vercel</span>
      <span class="item">Stripe</span>
      <span class="item">Linear</span>
      <span class="item">Notion</span>
      <span class="item">Figma</span>
      <span class="item">GitHub</span>
      <span class="item">Tailwind</span>
      <span class="item">Vercel</span>
      <span class="item">Stripe</span>
      <span class="item">Linear</span>
      <span class="item">Notion</span>
      <span class="item">Figma</span>
      <span class="item">GitHub</span>
      <span class="item">Tailwind</span>
    </div>
  </div>
</div>`,
    css: `.marquee-section {
  background: #0d0f14;
  padding: 2rem 0;
  overflow: hidden;
}
.lbl {
  font-family: monospace;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5af0c4;
  text-align: center;
  margin-bottom: 1.25rem;
}
.wrap {
  overflow: hidden;
  mask-image: linear-gradient(
    to right, transparent 0%, black 10%, black 90%, transparent 100%);
  -webkit-mask-image: linear-gradient(
    to right, transparent 0%, black 10%, black 90%, transparent 100%);
}
.track {
  display: flex;
  gap: 0.75rem;
  width: max-content;
  animation: ticker 8s linear infinite;
}
.track:hover { animation-play-state: paused; }
@keyframes ticker {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.item {
  display: inline-flex;
  align-items: center;
  background: #151820;
  border: 1px solid #2a2f42;
  border-radius: 100px;
  padding: 0.45rem 1rem;
  font-family: monospace;
  font-size: 0.78rem;
  color: #9aa0b8;
  white-space: nowrap;
  transition: border-color 0.2s, color 0.2s;
  cursor: default;
}
.item:hover { border-color: #5af0c4; color: #5af0c4; }`, js: '',
    experiments: [
      'Change <code>8s</code> to <code>3s</code> — double the speed.',
      'Change <code>8s</code> to <code>25s</code> — a slow, subtle drift.',
      'Remove the <code>.track:hover</code> rule — no more pause on hover.',
      'Change the mask stops from <code>10%</code> / <code>90%</code> to <code>25%</code> / <code>75%</code> — wider fade edges.'
    ]
  },

  {
    id: 'sec-timeline', category: 'Sections', name: 'Vertical Timeline',
    html: `<section class="tl-wrap">
  <p class="eyebrow">// changelog</p>
  <h2>What's new</h2>
  <div class="timeline">
    <div class="item">
      <div class="card"><div class="date">May 2026</div><h3>v3.0 Released</h3><p>Bento grid, timeline, animated stats.</p></div>
    </div>
    <div class="item">
      <div class="card"><div class="date">Feb 2026</div><h3>v2.5 Card Effects</h3><p>3D tilt, neon pulse, spotlight cards.</p></div>
    </div>
    <div class="item">
      <div class="card"><div class="date">Nov 2025</div><h3>v2.0 Dark Redesign</h3><p>Full visual overhaul with new palette.</p></div>
    </div>
  </div>
</section>`,
    css: `.tl-wrap {
  background: #0d0f14;
  padding: 2.5rem 2rem;
}
.eyebrow {
  font-family: monospace;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #ffcf6b;
  text-align: center;
  margin-bottom: 0.4rem;
}
h2 {
  font-family: sans-serif;
  font-size: 1.3rem;
  font-weight: 800;
  color: #e4e8f0;
  text-align: center;
  margin-bottom: 1.75rem;
}
.timeline {
  position: relative;
  max-width: 480px;
  margin: 0 auto;
  padding-left: 2rem;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #5af0c4, #7b8cff, transparent);
}
.item {
  position: relative;
  padding: 0 0 1.75rem 1.5rem;
}
.item::before {
  content: '';
  position: absolute;
  left: -0.6rem; top: 0.35rem;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #5af0c4;
  box-shadow: 0 0 0 3px rgba(90, 240, 196, 0.15);
  transition: box-shadow 0.2s;
}
.item:hover::before {
  box-shadow: 0 0 0 6px rgba(90, 240, 196, 0.2);
}
.card {
  background: #151820;
  border: 1px solid #2a2f42;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  transition: border-color 0.2s, transform 0.2s;
}
.item:hover .card {
  border-color: rgba(90, 240, 196, 0.3);
  transform: translateX(4px);
}
.date { font-family: monospace; font-size: 0.6rem; color: #5af0c4; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.3rem; }
h3 { font-family: sans-serif; font-size: 0.88rem; font-weight: 700; color: #e4e8f0; margin-bottom: 0.2rem; }
p  { font-family: monospace; font-size: 0.65rem; color: #6b7390; line-height: 1.6; }`, js: '',
    experiments: [
      'Change <code>translateX(4px)</code> to <code>translateX(14px)</code> — more dramatic slide on hover.',
      'Change the dot size from <code>10px</code> to <code>16px</code> — larger timeline markers.',
      'Change the connector line gradient to end in <code>#ffcf6b</code> instead of <code>transparent</code>.',
      'Change <code>width: 2px</code> on the vertical line to <code>4px</code>.'
    ]
  },

  // ── FORMS ────────────────────────────────────────────

  {
    id: 'form-float-label', category: 'Forms', name: 'Floating Label Input',
    html: `<form>
  <div class="field">
    <input type="text" id="f1" placeholder=" " />
    <label for="f1">Your Name</label>
  </div>
  <div class="field">
    <input type="email" id="f2" placeholder=" " />
    <label for="f2">Email Address</label>
  </div>
</form>`,
    css: `form { display: flex; flex-direction: column; gap: 0.5rem; width: 280px; }
.field {
  position: relative;
  margin-bottom: 1rem;
}
input {
  width: 100%;
  background: #151820;
  border: 1px solid #2a2f42;
  border-radius: 8px;
  color: #e4e8f0;
  font-family: monospace;
  font-size: 0.9rem;
  padding: 1.1rem 1rem 0.4rem;
  outline: none;
  transition: border-color 0.18s;
  box-sizing: border-box;
}
input:focus { border-color: #5af0c4; }
label {
  position: absolute;
  left: 1rem;
  top: 0.75rem;
  font-family: monospace;
  font-size: 0.82rem;
  color: #6b7390;
  pointer-events: none;
  transition: top 0.2s, font-size 0.2s, color 0.2s;
}
input:focus + label,
input:not(:placeholder-shown) + label {
  top: 0.3rem;
  font-size: 0.6rem;
  color: #5af0c4;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}`, js: '',
    experiments: [
      'Change the floated label color from <code>#5af0c4</code> to <code>#7b8cff</code> — purple label.',
      'Change label transition from <code>0.2s</code> to <code>0.5s</code> — slower float.',
      'Change <code>border-color: #5af0c4</code> on focus to <code>#ffcf6b</code> — amber focus ring.',
      'Change <code>border-radius: 8px</code> to <code>0</code> and remove all border sides except bottom — flat underline style.'
    ]
  },

  {
    id: 'form-checkbox', category: 'Forms', name: 'Styled Checkbox',
    html: `<label class="wrap">
  <input type="checkbox" />
  <span class="box"></span>
  Accept terms &amp; conditions
</label>
<label class="wrap">
  <input type="checkbox" checked />
  <span class="box"></span>
  Subscribe to newsletter
</label>`,
    css: `.wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: monospace;
  font-size: 0.85rem;
  color: #9aa0b8;
  cursor: pointer;
  margin-bottom: 1rem;
  user-select: none;
}
.wrap input {
  position: absolute;
  opacity: 0;
  width: 0; height: 0;
}
.box {
  width: 18px; height: 18px;
  border: 2px solid #2a2f42;
  border-radius: 4px;
  background: #151820;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.18s, background 0.18s;
}
.box::after {
  content: '';
  width: 10px; height: 6px;
  border-left: 2px solid #0d0f14;
  border-bottom: 2px solid #0d0f14;
  transform: rotate(-45deg) scaleX(0);
  transition: transform 0.15s ease;
}
.wrap input:checked + .box {
  background: #5af0c4;
  border-color: #5af0c4;
}
.wrap input:checked + .box::after {
  transform: rotate(-45deg) scaleX(1);
}`, js: '',
    experiments: [
      'Change <code>border-radius: 4px</code> on <code>.box</code> to <code>50%</code> — round radio-button style.',
      'Change the checked background from <code>#5af0c4</code> to <code>#7b8cff</code>.',
      'Change the checkmark transition to <code>0.3s cubic-bezier(0.68,-0.55,0.27,1.55)</code> — bouncy check.',
      'Change <code>18px</code> / <code>18px</code> on <code>.box</code> to <code>24px</code> / <code>24px</code> — larger checkbox.'
    ]
  },

  {
    id: 'form-login', category: 'Forms', name: 'Glassmorphism Login',
    html: `<div class="bg">
  <form class="form" onsubmit="return false">
    <h2>Sign In</h2>
    <div class="f"><input type="email" placeholder="Email address" /></div>
    <div class="f"><input type="password" placeholder="Password" /></div>
    <button type="submit">Sign In →</button>
  </form>
</div>`,
    css: `.bg {
  background: linear-gradient(135deg, #1c2030 0%, #0d0f14 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}
.bg::before {
  content: '';
  position: absolute;
  top: -80px; left: -80px;
  width: 350px; height: 350px;
  background: radial-gradient(circle,
    rgba(90, 240, 196, 0.08) 0%, transparent 70%);
  pointer-events: none;
}
.form {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem;
  width: 280px;
  position: relative;
}
h2 {
  font-family: sans-serif;
  font-size: 1.2rem;
  font-weight: 800;
  color: #e4e8f0;
  margin-bottom: 1.5rem;
  letter-spacing: -0.02em;
}
.f { margin-bottom: 1rem; }
input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #e4e8f0;
  font-family: monospace;
  font-size: 0.82rem;
  padding: 0.7rem 1rem;
  outline: none;
  transition: border-color 0.18s;
  box-sizing: border-box;
}
input::placeholder { color: #6b7390; }
input:focus { border-color: rgba(90, 240, 196, 0.5); }
button {
  width: 100%;
  background: linear-gradient(135deg, #5af0c4, #7b8cff);
  color: #0d0f14;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  font-family: sans-serif;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: opacity 0.18s;
}
button:hover { opacity: 0.85; }`, js: '',
    experiments: [
      'Change <code>blur(16px)</code> to <code>blur(3px)</code> — less frosted form background.',
      'Change the button gradient to <code>#ffcf6b, #ff8c5a</code> — amber sign-in button.',
      'Change the form opacity from <code>0.04</code> to <code>0.15</code> — more visible glass.',
      'Change <code>border-radius: 16px</code> on <code>.form</code> to <code>0</code> — sharp corners.'
    ]
  },

  // ── NAVBARS (new) ────────────────────────────────────

  {
    id: 'nav-fixed-vs-sticky', category: 'Navbars', name: 'Fixed vs Sticky',
    html: `<div class="comparison">
  <div class="col">
    <div class="label">fixed</div>
    <nav class="demo-nav fixed-nav">fixed header</nav>
    <div class="scroll-body">
      <p>Scroll me — a fixed header always stays at the top of the <em>viewport</em>, even when scrolling a parent container. It is removed from the document flow, so content can slide underneath it.</p>
    </div>
  </div>
  <div class="col">
    <div class="label">sticky</div>
    <div class="scroll-body">
      <nav class="demo-nav sticky-nav">sticky header</nav>
      <p>Scroll me — a sticky header stays put only while its <em>parent container</em> is in view. It stays in the document flow, so content starts below it.</p>
    </div>
  </div>
</div>`,
    css: `.comparison {
  display: flex;
  gap: 1rem;
  height: 220px;
}
.col {
  flex: 1;
  position: relative;
  overflow: hidden;
  border: 1px solid #2a2f42;
  border-radius: 10px;
}
.label {
  position: absolute;
  top: 0.4rem; left: 0.6rem;
  font-size: 0.6rem;
  font-family: monospace;
  color: #6b7390;
  z-index: 2;
}
.demo-nav {
  background: #5af0c4;
  color: #0d0f14;
  font-family: sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.55rem 1rem;
  text-align: center;
  width: 100%;
}
.fixed-nav {
  position: fixed;
  top: 0; left: 0;
  width: 100%;
  z-index: 10;
}
.sticky-nav {
  position: sticky;
  top: 0;
}
.scroll-body {
  height: 100%;
  overflow-y: auto;
  padding: 2.5rem 1rem 1rem;
  font-family: monospace;
  font-size: 0.7rem;
  color: #9aa0b8;
  line-height: 1.7;
}
.scroll-body em { color: #5af0c4; font-style: normal; }`, js: '',
    experiments: [
      'On <code>.fixed-nav</code>, change <code>top: 0</code> to <code>top: 10px</code> — floating gap from viewport edge.',
      'On <code>.sticky-nav</code>, change <code>top: 0</code> to <code>top: 20px</code> — sticks with an offset.',
      'Change <code>.fixed-nav</code> background to <code>rgba(90,240,196,0.15)</code> and add <code>backdrop-filter: blur(8px)</code> — frosted glass bar.',
      'Add <code>box-shadow: 0 2px 12px rgba(0,0,0,0.4)</code> to <code>.demo-nav</code> — drop shadow on both headers.',
      'Change the <code>.fixed-nav</code> to <code>position: absolute</code> — see how it now scrolls away with the content.'
    ]
  },

  // ── SECTIONS (new) ───────────────────────────────────

  {
    id: 'sec-expand-columns', category: 'Sections', name: 'Expanding Column Gallery',
    html: `<div class="gallery">
  <div class="col" style="background:#e07070;">
    <span class="col-num">01</span>
    <div class="col-body">
      <h3>Design</h3>
      <p>Crafting beautiful, intuitive digital experiences.</p>
    </div>
  </div>
  <div class="col" style="background:#5ab8b8;">
    <span class="col-num">02</span>
    <div class="col-body">
      <h3>Develop</h3>
      <p>Building fast, responsive, and scalable code.</p>
    </div>
  </div>
  <div class="col" style="background:#5a8ec8;">
    <span class="col-num">03</span>
    <div class="col-body">
      <h3>Deploy</h3>
      <p>Launching projects smoothly to the cloud.</p>
    </div>
  </div>
  <div class="col" style="background:#6ab89a;">
    <span class="col-num">04</span>
    <div class="col-body">
      <h3>Deliver</h3>
      <p>Ensuring top-tier quality and client satisfaction.</p>
    </div>
  </div>
</div>`,
    css: `.gallery {
  display: flex;
  height: 280px;
  border-radius: 12px;
  overflow: hidden;
  gap: 3px;
}
.col {
  flex: 1;
  flex-basis: 0;
  position: relative;
  overflow: hidden;
  transition: flex 0.45s ease;
  cursor: pointer;
}
.gallery:hover .col:not(:hover) {
  flex: 0.5;
  filter: brightness(0.6);
}
.gallery:hover .col:hover {
  flex: 2.5;
}
.col-num {
  position: absolute;
  top: 1rem; left: 1rem;
  font-family: monospace;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.6);
}
.col-body {
  position: absolute;
  bottom: 1rem; left: 1rem; right: 1rem;
}
.col-body h3 {
  font-family: sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.2rem;
}
.col-body p {
  font-family: monospace;
  font-size: 0.62rem;
  color: rgba(255,255,255,0.75);
  line-height: 1.5;
}`, js: '',
    experiments: [
      'Change <code>flex: 2.5</code> on hover to <code>flex: 4</code> — much wider expansion.',
      'Change the transition from <code>0.45s ease</code> to <code>0.2s ease</code> — snappier.',
      'Change <code>flex: 0.5</code> on non-hovered columns to <code>flex: 0.1</code> — they nearly collapse.',
      'Remove <code>filter: brightness(0.6)</code> — columns no longer dim when a sibling is hovered.',
      'Change <code>gap: 3px</code> to <code>gap: 0</code> — seamless layout with no dividers.',
      'Change the <code>height</code> from <code>280px</code> to <code>400px</code> — taller panel.'
    ]
  },

  {
    id: 'sec-css-columns', category: 'Sections', name: 'CSS Multi-Column Text',
    html: `<article class="mc-wrap">
  <h2 class="mc-title">The Column Story</h2>
  <div class="mc-body">
    <p>A stray cat wandered into my life one rainy evening. With each passing day, its quiet presence brought warmth and unexpected joy to every corner of the room.</p>
    <p>Through playful antics and long silent afternoons, the cat taught me something about stillness — and about the beauty of connections that ask for nothing in return.</p>
    <p>In its half-closed gaze I found comfort, and in its slow blink, the unmistakable promise of a shared journey neither of us had planned.</p>
  </div>
</article>`,
    css: `.mc-wrap {
  background: #151820;
  border: 1px solid #2a2f42;
  border-radius: 12px;
  padding: 2rem;
  max-width: 640px;
  margin: 0 auto;
}
.mc-title {
  font-family: sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #e4e8f0;
  margin-bottom: 1rem;
  column-span: all;
}
.mc-body {
  columns: 200px 2;
  column-gap: 2rem;
  column-rule: 1px solid #2a2f42;
}
.mc-body p {
  font-family: monospace;
  font-size: 0.72rem;
  color: #9aa0b8;
  line-height: 1.75;
  margin-bottom: 0.75rem;
  break-inside: avoid;
}`, js: '',
    experiments: [
      'Change <code>columns: 200px 2</code> to <code>columns: 200px 3</code> — three columns instead of two.',
      'Change <code>column-gap: 2rem</code> to <code>column-gap: 4rem</code> — more breathing room between columns.',
      'Change <code>column-rule: 1px solid #2a2f42</code> to <code>2px dashed #5af0c4</code> — accent divider line.',
      'Remove <code>break-inside: avoid</code> from <code>.mc-body p</code> — paragraphs can split mid-column.',
      'Change the <code>200px</code> in <code>columns</code> to <code>120px</code> — narrower columns, browser fits more in.'
    ]
  }

];
