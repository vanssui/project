const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let ctx;
let dpr = Math.min(window.devicePixelRatio || 1, 1.6);
let width = 0;
let height = 0;
let particles = [];
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

function createParticle(initial = false) {
  const layer = Math.random();
  return {
    x: rand(0, width),
    y: initial ? rand(0, height) : rand(0, height),
    r: layer > 0.8 ? rand(1.6, 2.8) : layer > 0.45 ? rand(1.1, 2.1) : rand(0.7, 1.5),
    speedY: layer > 0.8 ? rand(-0.26, 0.26) : layer > 0.45 ? rand(-0.18, 0.18) : rand(-0.11, 0.11),
    speedX: layer > 0.8 ? rand(-0.24, 0.24) : layer > 0.45 ? rand(-0.17, 0.17) : rand(-0.10, 0.10),
    alpha: layer > 0.8 ? rand(0.82, 1.0) : layer > 0.45 ? rand(0.58, 0.82) : rand(0.32, 0.58),
    hue: rand(18, 30),
    twinkle: rand(0.005, 0.02),
    pulse: rand(0, Math.PI * 2),
    drift: rand(0.4, 1.7),
    driftX: rand(0, Math.PI * 2),
    driftY: rand(0, Math.PI * 2)
  };
}

function buildScene() {
  particles = Array.from({ length: getParticleCount() }, () => createParticle(true));
}

function drawBackgroundGlow() {
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.08, 0, width * 0.5, height * 0.08, Math.min(width * 0.46, 620));
  glow.addColorStop(0, 'rgba(255,106,45,0.11)');
  glow.addColorStop(0.45, 'rgba(255,106,45,0.05)');
  glow.addColorStop(1, 'rgba(255,106,45,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height * 0.46);
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
    particle.x += (particle.speedX + Math.sin(particle.driftX + particle.pulse * 0.9) * 0.05 * particle.drift) * dt;
    particle.y += (particle.speedY + Math.cos(particle.driftY + particle.pulse * 0.75) * 0.05 * particle.drift) * dt;
    particle.pulse += particle.twinkle * dt;
    particle.driftX += 0.006 * dt;
    particle.driftY += 0.0045 * dt;
    if (particle.y < -40 || particle.y > height + 40 || particle.x < -40 || particle.x > width + 40) {
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
