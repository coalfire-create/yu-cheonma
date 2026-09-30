import * as THREE from 'three';
import HORSE from './horse.json';

// A celestial horse made of stars. Legs swing, mane and tail stream, stardust trails behind,
// and the cursor scatters nearby stars like wind.
const vert = /* glsl */ `
attribute float aLum; attribute float aSeed;
uniform float uT, uIntro, uScatter, uPx, uGallop; uniform vec2 uMouse; uniform float uTrail;
varying float vA; varying float vLum;
float h(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  vec2 p = position.xy;
  float w = uT * 7.5 * uGallop;                        // stride frequency
  // legs: points below the belly line swing about their hips/shoulders; front (x<0) and hind are out of phase
  float below = max(0.0, -0.05 - p.y);
  float front = step(p.x, 0.02);
  p.x += below * 0.55 * sin(w + front * 3.14159) * uGallop;
  p.y += below * 0.18 * max(0.0, cos(w + front * 3.14159)) * uGallop;
  // mane + tail flutter
  float up = max(0.0, p.y - 0.12);
  p.x += up * 0.12 * sin(uT * 9.0 + p.y * 30.0);
  // whole-body bob and pitch
  p.y += 0.018 * sin(w * 2.0) * uGallop;
  // stardust trail: a copy of the horse that streams backwards (to the right) and fades
  float life = fract(uT * 0.45 + aSeed * 7.0);
  p += uTrail * vec2(life * (0.9 + aSeed), (h(aSeed * 91.0) - 0.5) * 0.12 * life);
  // intro: stars fall into place from a wide scatter
  vec2 from = vec2(h(aSeed * 13.1) * 3.0 - 1.2, h(aSeed * 71.7) * 2.0 - 0.6);
  float k = clamp(uIntro * 1.8 - h(aSeed * 3.3) * 0.8, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);
  p = mix(from, p, k);
  // cursor wind + scroll scatter
  vec2 d = p - uMouse; float dl = length(d);
  p += normalize(d + 1e-4) * 0.14 * exp(-dl * dl * 60.0);
  p += (vec2(h(aSeed * 5.1), h(aSeed * 9.7)) - 0.5) * uScatter * 2.4;
  vec4 mv = modelViewMatrix * vec4(p, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.6 + 0.4 * sin(uT * 3.0 + aSeed * 60.0);
  gl_PointSize = uPx * (0.6 + aLum * 0.9) * tw * mix(1.0, 0.7, uTrail);
  vA = (1.0 - uTrail * life) * (0.35 + 0.65 * k) * mix(1.0, 0.45, uTrail);
  vLum = aLum;
}`;
const frag = /* glsl */ `
varying float vA; varying float vLum;
void main(){
  vec2 c = gl_PointCoord - 0.5; float r = length(c);
  float a = smoothstep(0.5, 0.0, r); a *= a;
  vec3 gold = vec3(1.0, 0.82, 0.45), white = vec3(1.0, 0.97, 0.9);
  gl_FragColor = vec4(mix(gold, white, vLum) * a * vA * 1.9, a * vA);
}`;

export class Sky {
  constructor(canvas, { place, stars = 900, density = 1 }) {
    this.canvas = canvas; this.place = place;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    const pts = density < 1 ? HORSE.filter((_, i) => i % Math.round(1 / density) === 0) : HORSE;
    const pos = new Float32Array(pts.length * 3), lum = new Float32Array(pts.length), seed = new Float32Array(pts.length);
    pts.forEach(([x, y, l], i) => { pos[i * 3] = x; pos[i * 3 + 1] = y; lum[i] = 0.35 + 0.65 * l; seed[i] = Math.random(); });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aLum', new THREE.BufferAttribute(lum, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.u = { uT: { value: 0 }, uIntro: { value: 0 }, uScatter: { value: 0 }, uPx: { value: 3 }, uGallop: { value: 1 }, uMouse: { value: new THREE.Vector2(9, 9) }, uTrail: { value: 0 } };
    const mk = (trail) => new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { ...this.u, uTrail: { value: trail } }, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.horse = new THREE.Group();
    this.horse.add(mk(1), mk(0));
    this.scene.add(this.horse);

    // background stars drifting right, so the horse reads as flying left
    const sp = new Float32Array(stars * 3), ss = new Float32Array(stars);
    for (let i = 0; i < stars; i++) { sp[i * 3] = Math.random() * 2 - 1; sp[i * 3 + 1] = Math.random() * 2 - 1; ss[i] = Math.random(); }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
    this.su = { uT: { value: 0 }, uPx: { value: 2 } };
    this.scene.add(new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.su, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeed; uniform float uT, uPx; varying float vA;
        void main(){ vec3 p = position; p.x = fract((p.x + 1.0) * 0.5 + uT * (0.01 + aSeed * 0.03)) * 2.0 - 1.0;
          gl_Position = vec4(p.xy, 0.0, 1.0); gl_PointSize = uPx * (0.4 + aSeed * 1.2); vA = 0.25 + 0.75 * (0.5 + 0.5 * sin(uT * 2.0 + aSeed * 50.0)); }`,
      fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.85, 0.88, 1.0) * smoothstep(0.5, 0.0, r) * vA, 1.0); }`,
    })));

    addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      // convert from clip space into the horse's local space
      const s = this.horse.scale.x, o = this.horse.position;
      this.u.uMouse.value.set((x * this.aspect - o.x) / s, (y - o.y) / s);
    });
    this.resize(); addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w) return;
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    this.camera.left = -this.aspect; this.camera.right = this.aspect; this.camera.updateProjectionMatrix();
    const P = this.place(w, h, this.aspect);
    this.horse.scale.setScalar(P.s); this.horse.position.set(P.x, P.y, 0);
    const dpr = this.renderer.getPixelRatio();
    // point size tracks the on-screen spacing between sampled stars so the silhouette reads solid
    const spacing = (P.s * h) / 2 / (130 * (P.density ?? 1));
    this.u.uPx.value = Math.max(2.4, spacing * 2.1) * dpr;
    this.su.uPx.value = 2 * dpr;
  }
  render(t) {
    this.u.uT.value = t; this.su.uT.value = t;
    this.renderer.render(this.scene, this.camera);
  }
}
