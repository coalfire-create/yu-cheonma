import { useEffect, useRef, useState, type ReactNode } from 'react';
import VectorWordmark from './ok/vector-wordmark';
import IsoCubeTrail from './ok/iso-cube-trail';
import TypeSlabField from './ok/type-slab-field';
// @ts-ignore — star-horse renderer kept from the first version
import { Sky } from './legacy/sky.js';

const NIGHT = '#060818';
const GOLD = '#E8C36A';
const GOLD_HI = '#FFE7A8';
const narrow = () => typeof window !== 'undefined' && window.innerWidth < 820;

function Stage({ children, className = '', margin = '40% 0px' }: { children: ReactNode; className?: string; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: margin });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, [margin]);
  return <div ref={ref} className={`stage ${className}`}>{on && children}</div>;
}

// Hold a canvas text component back until its webfont has actually loaded,
// otherwise the glyph atlas is baked from the fallback font.
function FontGate({ font, sample, children }: { font: string; sample: string; children: ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { document.fonts.load(font, sample).finally(() => setOk(true)); }, [font, sample]);
  return ok ? <>{children}</> : null;
}

function StarHorse({ place, density = 1, stars = 900, intro = 0 }: { place: any; density?: number; stars?: number; intro?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const sky = new Sky(ref.current, { place, density, stars });
    let vis = false, raf = 0, started = 0;
    const t0 = performance.now();
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !started) started = performance.now(); });
    io.observe(ref.current!);
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      if (started) sky.u.uIntro.value = Math.min(1, (performance.now() - started) / 1000 / 2.8 + intro);
      const host = ref.current!.parentElement!.getBoundingClientRect();
      sky.u.uScatter.value = Math.max(0, Math.min(1, -host.top / host.height)) * 0.9;
      if (vis) sky.render(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); sky.renderer.dispose(); };
  }, []);
  return <canvas ref={ref} className="sky" />;
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.18 });
    document.querySelectorAll('.rv').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Count({ to }: { to: number }) {
  const ref = useRef<HTMLElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), dur = to > 99 ? 2200 : 1400;
      const tick = () => { const k = Math.min(1, (performance.now() - t0) / dur); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
      tick();
    }, { threshold: 0.5 });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, [to]);
  return <b ref={ref}>{v}</b>;
}

// Two streams of light — 대구대학 and 청구대학 — that flow into one as you scroll.
function Merge() {
  const sec = useRef<HTMLElement>(null);
  const a = useRef<SVGPathElement>(null), b = useRef<SVGPathElement>(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    const la = a.current!.getTotalLength(), lb = b.current!.getTotalLength();
    let raf = 0;
    const loop = () => {
      const r = sec.current!.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight) / 0.7));
      a.current!.style.strokeDasharray = `${la}`; a.current!.style.strokeDashoffset = `${la * (1 - p)}`;
      b.current!.style.strokeDasharray = `${lb}`; b.current!.style.strokeDashoffset = `${lb * (1 - p)}`;
      setK(p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <section className="merge" id="merge" ref={sec}>
      <div className="merge__sticky">
        <p className="eyebrow rv">02 — 1967</p>
        <h2 className="rv">두 개의 물줄기가<br />하나의 대학이 되다</h2>
        <div className="merge__art">
          <svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet">
            <defs><linearGradient id="gGold" x1="0" x2="1"><stop offset="0" stopColor={GOLD} stopOpacity=".15" /><stop offset="1" stopColor={GOLD_HI} /></linearGradient></defs>
            <path ref={a} className="stream" d="M40,70 C300,70 420,90 560,200 S760,210 960,210" />
            <path ref={b} className="stream" d="M40,350 C300,350 420,330 560,220 S760,210 960,210" />
            <circle cx="560" cy="210" r="7" className="node" style={{ opacity: k > 0.55 ? 1 : 0 }} />
          </svg>
          <span className="lab lab--a">대구대학</span>
          <span className="lab lab--b">청구대학</span>
          <span className={`lab lab--c ${k > 0.85 ? 'on' : ''}`}>영남대학교<small>1967 · 12</small></span>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  useReveal();
  const m = narrow();
  return (
    <>
      <header className="nav">
        <a href="#top" className="nav__logo"><span className="nav__mark">天馬</span>Yeungnam University</a>
        <nav className="nav__links"><a href="#symbol">천마</a><a href="#merge">1967</a><a href="#plain">압량벌</a><a href="#mission">사명</a><a href="#numbers">숫자</a></nav>
        <a className="nav__cta" href="https://ipsi.yu.ac.kr" target="_blank" rel="noopener">입학 안내 ↗</a>
      </header>

      {/* HERO — a celestial horse of stars */}
      <section className="hero" id="top">
        <div className="horizon"><div className="horizon__grid" /></div>
        <StarHorse density={m ? 0.5 : 1} place={(w: number, h: number, a: number) => (w < 820 ? { s: a * 1.8, x: 0.02, y: 0.5, density: 0.7 } : { s: Math.min(1.3, a * 0.95), x: a * 0.3, y: 0.1 })} />
        <div className="hero__copy">
          <p className="kicker">YEUNGNAM UNIVERSITY · SINCE 1967</p>
          <h1><span className="han">天馬</span><span className="ko">천마, 압량벌을 달리다</span></h1>
          <p className="hero__sub">약동하는 힘과 비약. 별빛으로 빚은 천마가 영남대학교의 이야기를 싣고 달립니다.</p>
        </div>
        <div className="hero__side"><span className="dot" />커서를 가까이 대면 별이 흩어져요</div>
      </section>

      {/* SYMBOL — the glyphs 天馬 open into their own bezier construction */}
      <section className="symbol" id="symbol">
        <div className="symbol__copy">
          <p className="eyebrow rv">01 — Symbol</p>
          <h2 className="rv">화랑의 기상을 품은<br /><span className="gold">하늘의 말</span></h2>
          <div className="cols">
            <p className="rv">영남대학교의 상징은 <b>천마(天馬)</b>입니다. 신라 화랑의 유서가 깃든 <b>압량벌</b>에 자리 잡은 대학과, 화랑의 기상이 담긴 천마는 서로를 닮았습니다.</p>
            <p className="rv">약동하는 힘과 비약의 의미를 지닌 천마는, 민족의 대학에서 세계의 대학으로 나아가려는 영남대학교의 정신입니다.</p>
          </div>
        </div>
        <div className="symbol__mark">
          <Stage>
            <FontGate font='900 100px "Noto Serif KR"' sample="天馬">
              <VectorWordmark
                text="天馬"
                font={{ fontFamily: 'Noto Serif KR', fontWeight: 900, fontSize: m ? '700px' : '330px', lineHeight: '1em', letterSpacing: '0.02em', textAlign: 'center' }}
                background={NIGHT}
                textColor={GOLD_HI}
                shade="#6b4a12"
                accent={GOLD}
                reach={m ? 240 : 320}
                handles={m ? { size: 70, spread: 22, labels: true } : undefined}
              />
            </FontGate>
          </Stage>
        </div>
      </section>

      <Merge />

      {/* PLAIN — an endless field of golden cubes */}
      <section className="plain" id="plain">
        <Stage className="plain__stage">
          <IsoCubeTrail background={NIGHT} baseColor="#B88A2E" density={m ? 60 : 82} gap={52} speed={40} distance={4} cursor={{ reach: 55, lift: -220, grow: 0 }} />
        </Stage>
        <div className="plain__inner">
          <p className="eyebrow rv">03 — Apryang Plain</p>
          <h2 className="rv">끝이 보이지 않는<br />평지 위의 캠퍼스</h2>
          <p className="lead rv">대부분이 평지로 이루어진 드넓은 캠퍼스. 천마가 마음껏 달릴 수 있는 들판 위에서 영남의 배움이 자랍니다.</p>
          <div className="campus">
            <article className="glass rv"><span className="tag">MAIN · GYEONGSAN</span><h3>경산캠퍼스</h3><p>경상북도 경산시. 압량벌에 펼쳐진 영남대학교의 중심.</p></article>
            <article className="glass rv"><span className="tag">DAEGU</span><h3>대구캠퍼스</h3><p>대구광역시 남구. 도심 속 또 하나의 영남.</p></article>
          </div>
        </div>
      </section>

      {/* MISSION — standing 3D type */}
      <section className="mission" id="mission">
        <Stage className="mission__stage">
          <TypeSlabField background={NIGHT} baseColor="#F3E6C4" accentColor={GOLD} keyColor="#5B7BFF" text="YEUNGNAM" font={{ fontFamily: 'Inter', fontWeight: 800 }} density={m ? 13 : 16} size={62} />
        </Stage>
        <div className="mission__inner">
          <p className="eyebrow rv">04 — Mission</p>
          <p className="mission__a rv">민족의 대학</p>
          <p className="mission__x rv">AND</p>
          <p className="mission__b rv">세계 속의 대학</p>
        </div>
      </section>

      {/* NUMBERS */}
      <section className="numbers" id="numbers">
        <p className="eyebrow rv">05 — Numbers</p>
        <div className="nums">
          {[[2, '캠퍼스'], [15, '대학'], [12, '대학원'], [1967, '개교']].map(([n, l]) => (
            <div className="glass rv" key={l as string}><Count to={n as number} /><span>{l}</span></div>
          ))}
        </div>
      </section>

      {/* FINALE */}
      <section className="finale" id="apply">
        <StarHorse density={0.5} stars={500} place={(w: number, h: number, a: number) => ({ s: w < 820 ? a * 1.8 : 0.95, x: 0, y: 0.32, density: 0.7 })} />
        <div className="finale__inner">
          <h2 className="rv">당신의 비상,<br /><span className="gold">천마와 함께.</span></h2>
          <a className="btn rv" href="https://ipsi.yu.ac.kr" target="_blank" rel="noopener">입학처 바로가기 →</a>
        </div>
        <footer className="footer">
          <span>본 페이지는 Team Semicolon이 제작한 비공식 홍보 페이지입니다.</span>
          <span>영남대학교 공식 정보 · <a href="https://www.yu.ac.kr" target="_blank" rel="noopener">yu.ac.kr</a></span>
        </footer>
      </section>
    </>
  );
}
