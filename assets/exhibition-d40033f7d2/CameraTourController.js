import { TOUR_SHOTS } from './config.js?v=exhibition-prototype-v2';
import { resolveManualTheme } from './manualTheme.js';

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const AUTO_TOUR_INTERVAL = 3000;
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

// All exhibition camera writes (including manual orbit) have one owner.
export class CameraTourController {
  constructor(T, camera, canvas, onChange) {
    this.T = T;
    this.camera = camera;
    this.canvas = canvas;
    this.onChange = onChange;
    this.target = new T.Vector3(0, .1, 0);
    this.mode = 'transitioningToExhibition';
    this.shot = 0;
    this.motion = null;
    this.tourElapsed = 0;
    this.lastTime = 0;
    this.pointers = new Map();
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    canvas.addEventListener('pointerdown', event => this.pointerDown(event), options);
    canvas.addEventListener('pointermove', event => this.pointerMove(event), options);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(name, event => this.pointers.delete(event.pointerId), options);
    }
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      if (!this.interactive) return;
      this.orbit(0, 0, Math.exp(clamp(event.deltaY, -100, 100) * .0015));
    }, { ...options, passive: false });
    canvas.addEventListener('keydown', event => {
      if (!this.interactive) return;
      const actions = { ArrowLeft: [-.08, 0, 1], ArrowRight: [.08, 0, 1], ArrowUp: [0, -.06, 1], ArrowDown: [0, .06, 1], '+': [0, 0, .94], '=': [0, 0, .94], '-': [0, 0, 1.06] };
      if (!actions[event.key]) return;
      event.preventDefault();
      this.orbit(...actions[event.key]);
    }, options);
    const clear = () => {
      for (const id of this.pointers.keys()) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      this.pointers.clear();
    };
    this.clearPointers = clear;
    window.addEventListener('blur', clear, options);
    document.addEventListener('visibilitychange', () => { this.lastTime = 0; clear(); }, options);
  }

  get interactive() { return this.mode === 'freeView' || this.mode === 'exhibitionIdle'; }

  notify() {
    this.canvas.dataset.cameraMode = this.mode;
    this.canvas.dataset.tourShot = TOUR_SHOTS[this.shot].id;
    this.canvas.setAttribute('aria-label', `青瓷三维文物，${TOUR_SHOTS[this.shot].label}。方向键旋转，加减键缩放。`);
    this.onChange({ mode: this.mode, shot: this.shot });
  }

  moveTo(index, mode, duration) {
    this.clearPointers();
    this.manualPosition = null;
    this.manualStateDirty = false;
    this.shot = index;
    this.mode = mode;
    this.tourElapsed = 0;
    const shot = TOUR_SHOTS[index];
    this.motion = {
      elapsed: 0, duration: duration ?? shot.duration,
      fromPosition: this.camera.position.clone(), fromTarget: this.target.clone(),
      toPosition: new this.T.Vector3(...shot.position), toTarget: new this.T.Vector3(...shot.target),
      fromZoom: this.camera.zoom,
    };
    this.notify();
  }

  command(action, index) {
    if (this.mode === 'transitioningToExhibition') return;
    if (action === 'tour') this.moveTo(0, 'autoTour');
    if (action === 'exitTour' && this.mode === 'autoTour') {
      this.mode = this.motion ? 'focusing' : 'exhibitionIdle';
      this.notify();
    }
    if (action === 'focus' && Number.isInteger(index) && index >= 0 && index < 4) this.moveTo(index, 'focusing');
  }

  pointerDown(event) {
    if (!this.interactive || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    this.canvas.focus({ preventScroll: true });
    this.canvas.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  pointerMove(event) {
    if (!this.interactive) return;
    const old = this.pointers.get(event.pointerId);
    if (!old) return;
    event.preventDefault();
    const others = [...this.pointers.entries()].filter(([id]) => id !== event.pointerId);
    const next = { x: event.clientX, y: event.clientY };
    if (others.length) {
      const other = others[0][1];
      const before = Math.hypot(old.x - other.x, old.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      if (after > 1) this.orbit(0, 0, clamp(before / after, .85, 1.15));
    } else {
      const width = Math.max(this.canvas.getBoundingClientRect().width, 1);
      this.orbit(-(next.x - old.x) / width * 4, -(next.y - old.y) / width * 3, 1);
    }
    this.pointers.set(event.pointerId, next);
  }

  orbit(thetaDelta, phiDelta, scale) {
    const offset = (this.manualPosition || this.camera.position).clone().sub(this.target);
    const radius = clamp(offset.length() * scale, 2.8, 11);
    const theta = Math.atan2(offset.x, offset.z) + thetaDelta;
    const phi = clamp(Math.acos(clamp(offset.y / offset.length(), -1, 1)) + phiDelta, .32, 1.65);
    // Manual input is queued; update() remains the sole camera writer.
    this.manualPosition = new this.T.Vector3(
      radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta),
    ).add(this.target);
    if (this.mode !== 'freeView') { this.mode = 'freeView'; this.manualStateDirty = true; }
  }

  update(now) {
    const elapsed = this.lastTime && !document.hidden ? Math.max(now - this.lastTime, 0) : 0;
    const delta = Math.min(elapsed, 250);
    this.lastTime = now;
    if (this.mode === 'autoTour') this.tourElapsed += elapsed;
    if (this.motion) {
      const motion = this.motion;
      motion.elapsed += delta;
      const t = ease(clamp(motion.elapsed / motion.duration, 0, 1));
      this.camera.position.lerpVectors(motion.fromPosition, motion.toPosition, t);
      this.target.lerpVectors(motion.fromTarget, motion.toTarget, t);
      this.camera.zoom = motion.fromZoom + (1 - motion.fromZoom) * t;
      this.camera.updateProjectionMatrix();
      if (motion.elapsed >= motion.duration) {
        this.motion = null;
        if (this.mode !== 'autoTour' || this.shot === TOUR_SHOTS.length - 1) {
          this.mode = 'exhibitionIdle';
          this.notify();
        }
      }
    }
    if (!this.motion && this.mode === 'autoTour' && this.tourElapsed >= AUTO_TOUR_INTERVAL) {
      this.moveTo(this.shot + 1, 'autoTour');
    }
    if (this.manualPosition && this.interactive) {
      this.camera.position.copy(this.manualPosition);
      this.manualPosition = null;
      const offset = this.camera.position.clone().sub(this.target);
      const radius = offset.length();
      const shot = resolveManualTheme({ radius, targetY: this.target.y, elevation: Math.asin(clamp(offset.y / radius, -1, 1)), azimuth: Math.atan2(offset.x, offset.z) }, this.shot);
      if (shot !== this.shot || this.manualStateDirty) {
        this.shot = shot;
        this.manualStateDirty = false;
        this.notify();
      }
    }
    this.camera.lookAt(this.target);
  }

  dispose() { this.clearPointers(); this.abort.abort(); this.motion = null; }
}
