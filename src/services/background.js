const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let ctx;
let dpr = Math.min(window.devicePixelRatio || 1, 1.6);
let width = 0;
let height = 0;
let particles = [];
let milkyStars = [];
let milkyDust = [];
let rafId = 0;
let lastTime = 0;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function getParticleCount() {
  const area = window.innerWidth * window.innerHeight;
  if (reduceMotion) return 55;
  if (window.innerWidth < 640) return 95;
  if (window.innerWidth < 1024) return 136;
  if (area < 900000) return 150;
  if (area < 1600000) return 188;
  return 228;
}

function getMilkyStarCount() {
  if (window.innerWidth < 640) return 220;
  if (window.innerWidth < 1024) return 320;
  return 460;
}

function getMilkyDustCount() {
  if (window.innerWidth < 640) return 32;
  if (window.innerWidth < 1024) return 46;
  return 62;
}

function createParticle(initial = false) {
  const layer = Math.random();
  return {
    x: rand(0, width),
    y: initial ? rand(0, height) : height + rand(10, 80),
    r: layer > 0.8 ? rand(1.6, 2.8) : layer > 0.45 ? rand(1.1, 2.1) : rand(0.7, 1.5),
    speedY: layer > 0.8 ? rand(0.22, 0.42) : layer > 0.45 ? rand(0.145, 0.30) : rand(0.08, 0.176),
    speedX: rand(-0.11, 0.11),
    alpha: layer > 0.8 ? rand(0.82, 1.0) : layer > 0.45 ? rand(0.58, 0.82) : rand(0.32, 0.58),
    hue: rand(18, 30),
    twinkle: rand(0.005, 0.02),
    pulse: rand(0, Math.PI * 2),
    drift: rand(0.4, 1.7)
  };
}

function milkyCurveX(t) {
  return width * (0.18 + 0.6 * t + Math.sin(t * 2.4 + 0.4) * 0.05);
}

function milkyCurveY(t) {
  return height * (0.08 + 0.34 * t + Math.sin(t * 3.2) * 0.02);
}

function createMilkyStar() {
  const t = Math.random();
  const cx = milkyCurveX(t);
  const cy = milkyCurveY(t);
  const bandWidth = (0.06 + (1 - Math.abs(t - 0.5) * 2) * 0.08) * width;
  const angle = -0.95;
  const dist = (Math.random() - 0.5) * bandWidth;
  const spreadY = (Math.random() - 0.5) * 24;
  const x = cx + Math.cos(angle + Math.PI / 2) * dist + rand(-10, 10);
  const y = cy + Math.sin(angle + Math.PI / 2) * dist * 0.42 + spreadY;
  const warmCore = Math.abs(t - 0.5) < 0.16 && Math.random() < 0.7;
  const hue = warmCore ? rand(30, 42) : Math.random() < 0.72 ? rand(205, 228) : rand(260, 290);

  return {
    x,
    y,
    r: warmCore ? rand(0.5, 1.6) : rand(0.35, 1.25),
    alpha: warmCore ? rand(0.12, 0.34) : rand(0.06, 0.24),
    hue,
    pulse: rand(0, Math.PI * 2),
    twinkle: rand(0.0015, 0.0065)
  };
}

function createMilkyDust() {
  const t = Math.random();
  const cx = milkyCurveX(t);
  const cy = milkyCurveY(t);
  const angle = -0.95;
  const offset = (Math.random() - 0.5) * width * 0.18;

  return {
    x: cx + Math.cos(angle + Math.PI / 2) * offset,
    y: cy + Math.sin(angle + Math.PI / 2) * offset * 0.4,
    rx: rand(width * 0.04, width * 0.13),
    ry: rand(height * 0.025, height * 0.08),
    alpha: rand(0.03, 0.085),
    hue: Math.random() < 0.55 ? rand(28, 38) : rand(210, 235),
    rotation: rand(-0.9, 0.9)
  };
}

function buildScene() {
  particles = Array.from({ length: getParticleCount() }, () => createParticle(true));
  milkyStars = Array.from({ length: getMilkyStarCount() }, () => createMilkyStar());
  milkyDust = Array.from({ length: getMilkyDustCount() }, () => createMilkyDust());
}

function drawBackgroundGlow() {
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.08, 0, width * 0.5, height * 0.08, Math.min(width * 0.46, 620));
  glow.addColorStop(0, 'rgba(255,106,45,0.11)');
  glow.addColorStop(0.45, 'rgba(255,106,45,0.05)');
  glow.addColorStop(1, 'rgba(255,106,45,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height * 0.46);
}

function drawMilkyWay() {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < 3; i += 1) {
    const shift = i * 0.015;
    const path = new Path2D();
    let started = false;
    for (let step = 0; step <= 1.001; step += 0.04) {
      const x = milkyCurveX(step + shift);
      const y = milkyCurveY(step + shift);
      if (!started) {
        path.moveTo(x, y);
        started = true;
      } else {
        path.lineTo(x, y);
      }
    }

    ctx.strokeStyle = i === 0 ? 'rgba(160,185,255,0.06)' : i === 1 ? 'rgba(255,220,185,0.085)' : 'rgba(210,190,255,0.045)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = i === 1 ? Math.max(120, width * 0.11) : Math.max(70, width * 0.07);
    ctx.stroke(path);
  }

  ctx.restore();
}

function drawMilkyDustLayer() {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const dust of milkyDust) {
    const gradient = ctx.createRadialGradient(dust.x, dust.y, 0, dust.x, dust.y, dust.rx);
    gradient.addColorStop(0, `hsla(${dust.hue}, 70%, 78%, ${dust.alpha})`);
    gradient.addColorStop(0.45, `hsla(${dust.hue}, 70%, 70%, ${dust.alpha * 0.55})`);
    gradient.addColorStop(1, `hsla(${dust.hue}, 70%, 60%, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(dust.x, dust.y, dust.rx, dust.ry, dust.rotation, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMilkyStars() {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const star of milkyStars) {
    const alpha = star.alpha * (0.82 + Math.sin(star.pulse) * 0.18);
    if (star.r > 0.85) {
      const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.r * 8);
      glow.addColorStop(0, `hsla(${star.hue}, 80%, 84%, ${alpha * 0.34})`);
      glow.addColorStop(0.45, `hsla(${star.hue}, 80%, 78%, ${alpha * 0.14})`);
      glow.addColorStop(1, `hsla(${star.hue}, 80%, 72%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = `hsla(${star.hue}, 80%, 82%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
    star.pulse += star.twinkle;
  }
  ctx.restore();
}

function drawParticle(particle) {
  const alpha = particle.alpha * (0.74 + Math.sin(particle.pulse) * 0.26);
  if (particle.r > 1.3) {
    const glow = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.r * 5.8);
    glow.addColorStop(0, `hsla(${particle.hue}, 100%, 62%, ${alpha * 0.42})`);
    glow.addColorStop(0.35, `hsla(${particle.hue}, 100%, 55%, ${alpha * 0.22})`);
    glow.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r * 5.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = `hsla(${particle.hue}, 100%, 62%, ${alpha})`;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
  ctx.fill();
}

function updateParticles(dt) {
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    particle.y -= particle.speedY * dt;
    particle.x += particle.speedX * dt + Math.sin((particle.y + particle.pulse * 100) * 0.0132) * 0.031 * particle.drift * dt;
    particle.pulse += particle.twinkle * dt;
    if (particle.y < -30 || particle.x < -40 || particle.x > width + 40) {
      particles[index] = createParticle(false);
    }
  }
}

function render(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min((now - lastTime) / 16.666, 1.8);
  lastTime = now;

  ctx.clearRect(0, 0, width, height);
  drawBackgroundGlow();
  updateParticles(dt);
  for (const particle of particles) {
    drawParticle(particle);
  }

  rafId = requestAnimationFrame(render);
}

export function resizeCanvas(canvas) {
  if (!canvas) return;
  if (!ctx) {
    ctx = canvas.getContext('2d', { alpha: true });
  }
  dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildScene();
}

export function animateBackground() {
  if (document.hidden || rafId) return;
  lastTime = 0;
  rafId = requestAnimationFrame(render);
}

export function stopBackgroundAnimation() {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = 0;
  lastTime = 0;
}

export function bindBackgroundLifecycle(canvas) {
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => resizeCanvas(canvas), 120);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopBackgroundAnimation();
    } else {
      resizeCanvas(canvas);
      animateBackground();
    }
  });
}
