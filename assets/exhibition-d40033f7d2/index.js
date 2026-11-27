export { createExhibitionUI } from './ExhibitionUI.js?v=exhibition-keepsake-v1';
import { CameraTourController } from './CameraTourController.js?v=exhibition-prototype-v2';
import { createExhibitionLights } from './ExhibitionLights.js?v=stage-preview-v4';
import { createReflectiveFloor } from './ReflectiveFloor.js?v=stage-preview-v2';

// Receives the Three.js classes already bundled by the repair experience.
// No second Three.js copy, renderer, canvas, or model loader is introduced.
export function createExhibitionRuntime(T, { renderer, scene, camera, pivot, canvas, onChange }) {
  let active = false;
  let controller = null;
  let lighting = null;
  let floor = null;
  let entryPosition = null;
  let entryRotation = null;
  const entryDuration = 1450;
  let floorFrame = 0;
  const lightingDuration = 950;
  let lightingElapsed = -1;
  let lightingBlend = 0;
  const glazeMaterials = new Map();
  let previousTime = 0;
  let sampleTime = 0;
  let sampleFrames = 0;
  let frameCount = 0;
  const debug = new URLSearchParams(window.location.search).has('exhibitionDebug');
  let lowQuality = new URLSearchParams(window.location.search).get('exhibitionQuality') === 'low'
    || (navigator.deviceMemory && navigator.deviceMemory <= 2)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

  const setupGalleryEffects = () => {
    pivot.updateMatrixWorld(true);
    const visibleBounds = new T.Box3();
    pivot.traverseVisible(object => { if (object.isMesh) visibleBounds.expandByObject(object); });
    const floorY = visibleBounds.min.y;
    canvas.dataset.floorY = String(floorY);
    lighting = createExhibitionLights(T, scene, renderer, lowQuality);
    pivot.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material.isMeshStandardMaterial) continue;
        if (!glazeMaterials.has(material)) {
          glazeMaterials.set(material, {
            roughness: material.roughness, metalness: material.metalness, envMapIntensity: material.envMapIntensity,
          });
        }
      }
    });
    floor = createReflectiveFloor(T, { renderer, scene, camera, pivot, floorY, lights: lighting.group, lowQuality });
    lighting.setBlend(0);
    canvas.dataset.reflection = floor.quality;
  };
  return {
    enter() {
      if (active) return;
      active = true;
      entryPosition = pivot.position.clone();
      entryRotation = pivot.rotation.clone();
      canvas.tabIndex = 0;
      canvas.style.touchAction = 'none';
      canvas.dataset.artifactId = pivot.children[0]?.uuid ?? pivot.uuid;
      controller = new CameraTourController(T, camera, canvas, onChange);
      controller.moveTo(0, 'transitioningToExhibition', entryDuration);
    },
    command(action, index) { controller?.command(action, index); },
    update(now) {
      if (!active) return;
      const rawDelta = previousTime ? Math.max(now - previousTime, 0) : 0;
      previousTime = now;
      const entering = controller.mode === 'transitioningToExhibition';
      controller.update(now);
      if (entering) {
        if (rawDelta > 0) { sampleTime += rawDelta; sampleFrames++; }
        const t = Math.min((controller.motion?.elapsed ?? entryDuration) / entryDuration, 1);
        const smooth = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
        pivot.position.copy(entryPosition).multiplyScalar(1 - smooth);
        const turn = Math.atan2(Math.sin(.29 - entryRotation.y), Math.cos(.29 - entryRotation.y));
        // A brief reveal shows the curve of the vessel when the two yaw angles are close.
        const reveal = Math.abs(turn) < .35 ? .52 * Math.sin(Math.PI * smooth) : 0;
        pivot.rotation.set(entryRotation.x * (1 - smooth), entryRotation.y + turn * smooth + reveal, entryRotation.z * (1 - smooth));
        canvas.parentElement?.style.setProperty('--gallery-progress', smooth);
        if (t === 1) {
          // A slow entry is enough to choose a cheaper reflection on this device.
          if (sampleFrames >= 3 && sampleTime / sampleFrames > 40) lowQuality = true;
          sampleTime = 0;
          sampleFrames = 0;
          // First present the final pose, then initialize the heavier reflection pass.
          floorFrame = requestAnimationFrame(() => { floorFrame = requestAnimationFrame(setupGalleryEffects); });
        }
      }
      if (lighting && lightingElapsed < lightingDuration) {
        lightingElapsed = lightingElapsed < 0 ? 0 : Math.min(lightingElapsed + Math.min(rawDelta, 160), lightingDuration);
        const progress = lightingElapsed / lightingDuration;
        lightingBlend = progress * progress * (3 - 2 * progress);
        lighting.setBlend(lightingBlend);
        floor.setBlend(lightingBlend);
        for (const [material, initial] of glazeMaterials) {
          material.roughness = initial.roughness + (.34 - initial.roughness) * lightingBlend;
          material.metalness = initial.metalness * (1 - lightingBlend);
          if (material.envMap) material.envMapIntensity = initial.envMapIntensity + (.62 - initial.envMapIntensity) * lightingBlend;
        }
      }
      floor?.render();
      frameCount++;
      // Measure wall-clock frame cost, rather than waiting for many slow frames.
      // This also catches software WebGL and thermally throttled devices promptly.
      if (floor && rawDelta > 0 && rawDelta < 1000) { sampleTime += rawDelta; sampleFrames++; }
      if (floor && sampleFrames >= 3 && sampleTime > 2000 && sampleTime / sampleFrames > 40 && floor.quality !== 'mirrored-fallback') {
        floor.downgrade(); lighting.downgrade();
        canvas.dataset.reflection = floor.quality;
      }
      if (sampleTime > 3000) { sampleTime = 0; sampleFrames = 0; }
      if (debug && frameCount % 6 === 0) canvas.dataset.exhibitionSnapshot = JSON.stringify({
        position: camera.position.toArray(), target: controller.target.toArray(), yaw: pivot.rotation.y, mode: controller.mode,
        shot: controller.shot, artifact: pivot.children[0]?.uuid, quality: floor?.quality ?? 'preparing', lightingBlend,
        frames: frameCount, elapsed: controller.motion?.elapsed ?? controller.tourElapsed,
      });
    },
    dispose() { cancelAnimationFrame(floorFrame); controller?.dispose(); floor?.dispose(); lighting?.dispose(); },
  };
}
