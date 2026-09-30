import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sky } from './sky.js';

gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ lerp: 0.085 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo(a.getAttribute('href'), { duration: 1.8 }); }));

const narrow = () => innerWidth < 820;
const clamp = (x) => Math.max(0, Math.min(1, x));
const progressOf = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
const visible = new Map();
const io = new IntersectionObserver((es) => es.forEach((e) => visible.set(e.target, e.isIntersecting)), { rootMargin: '10% 0px' });
const watch = (el) => { visible.set(el, false); io.observe(el); return el; };

// HERO sky
const sky = new Sky(document.getElementById('cvSky'), {
  density: narrow() ? 0.5 : 1,
  place: (w, h, a) => (w < 820 ? { s: a * 1.8, x: 0.02, y: 0.5, density: 0.7 } : { s: Math.min(1.3, a * 0.95), x: a * 0.3, y: 0.1 }),
});
gsap.to(sky.u.uIntro, { value: 1, duration: 3, ease: 'power2.out', delay: 0.15 });
const $hero = watch(document.getElementById('hero'));

// FINALE — the horse again, smaller, galloping above the call to action
const fin = new Sky(document.getElementById('cvFinale'), { density: 0.5, stars: 500, place: (w, h, a) => ({ s: w < 820 ? a * 1.8 : 0.95, x: 0, y: 0.32, density: 0.7 }) });
const $finale = watch(document.getElementById('finale'));
ScrollTrigger.create({ trigger: '#finale', start: 'top 60%', once: true, onEnter: () => gsap.to(fin.u.uIntro, { value: 1, duration: 2.6, ease: 'power2.out' }) });

// SYMBOL — Silla-style double frame with corner scrolls, drawn on scroll-in
const NS = 'http://www.w3.org/2000/svg';
const border = document.querySelector('.frame__border');
const corner = (x, y, sx, sy) => `M${x},${y + sy * 90} L${x},${y} L${x + sx * 90},${y} M${x + sx * 16},${y + sy * 60} C${x + sx * 16},${y + sy * 16} ${x + sx * 16},${y + sy * 16} ${x + sx * 60},${y + sy * 16} M${x + sx * 30},${y + sy * 30} c${sx * 18},${sy * -6} ${sx * 28},${sy * 6} ${sx * 18},${sy * 18} c${sx * -8},${sy * 8} ${sx * -18},${sy * 2} ${sx * -12},${sy * -8}`;
const dRect = (i) => `M${i},${i} H${600 - i} V${760 - i} H${i} Z`;
[dRect(4), dRect(22), corner(40, 40, 1, 1), corner(560, 40, -1, 1), corner(40, 720, 1, -1), corner(560, 720, -1, -1)].forEach((d) => {
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); border.append(p);
  const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; p.style.transition = 'stroke-dashoffset 2.2s cubic-bezier(.3,.7,.2,1)';
});
ScrollTrigger.create({ trigger: '.frame', start: 'top 75%', once: true, onEnter: () => border.querySelectorAll('path').forEach((p, i) => setTimeout(() => (p.style.strokeDashoffset = 0), i * 180)) });

// MERGE — two streams flow together
const sA = document.getElementById('sA'), sB = document.getElementById('sB'), node = document.querySelector('.merge__node');
const LA = sA.getTotalLength(), LB = sB.getTotalLength();
[[sA, LA], [sB, LB]].forEach(([p, l]) => { p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
const labs = [...document.querySelectorAll('.lab')];
const $merge = document.getElementById('merge');
function placeLabels() {
  const svg = document.querySelector('.merge__svg'), box = svg.getBoundingClientRect(), host = document.querySelector('.merge__sticky').getBoundingClientRect();
  const m = svg.getScreenCTM();
  const at = (x, y) => { const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const q = pt.matrixTransform(m); return [q.x - host.left, q.y - host.top]; };
  const put = (el, [x, y], dx, dy) => { el.style.left = x + dx + 'px'; el.style.top = y + dy + 'px'; };
  put(labs[0], at(40, 70), 0, -48); put(labs[1], at(40, 350), 0, 16); put(labs[2], at(700, 210), 0, 24);
  if (box.width < 500) put(labs[2], at(560, 210), -40, 34);
}
placeLabels(); addEventListener('resize', placeLabels);

// counters
document.querySelectorAll('[data-count]').forEach((b) => ScrollTrigger.create({ trigger: b, start: 'top 88%', once: true, onEnter: () => {
  const o = { v: 0 }, to = +b.dataset.count;
  gsap.to(o, { v: to, duration: to > 99 ? 2.2 : 1.4, ease: 'power3.out', onUpdate: () => (b.textContent = Math.round(o.v)) });
} }));

gsap.ticker.add((t) => {
  if (visible.get($hero)) {
    const r = $hero.getBoundingClientRect();
    sky.u.uScatter.value = clamp(-r.top / r.height) * 0.9;
    sky.render(t);
  }
  if (visible.get($finale)) fin.render(t);
  const mp = progressOf($merge);
  const k = clamp(mp / 0.7);
  sA.style.strokeDashoffset = LA * (1 - k); sB.style.strokeDashoffset = LB * (1 - k);
  node.style.opacity = k > 0.55 ? 1 : 0;
  labs[0].classList.toggle('is-on', mp > 0.02); labs[1].classList.toggle('is-on', mp > 0.02); labs[2].classList.toggle('is-on', k > 0.85);
});
