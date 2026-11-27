// A blurred mirrored copy shares the restored model's geometry and textures.
// The optional low-resolution pass uses the SAME renderer/camera as the artifact.
export function createReflectiveFloor(T, { renderer, scene, camera, pivot, floorY, lights, lowQuality }) {
  let disposed = false;
  let degraded = lowQuality;
  let target = null;
  let strength = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  const reflectionScene = new T.Scene();
  const mirror = new T.Group();
  const clone = pivot.clone(true);
  mirror.scale.y = -1;
  mirror.position.y = floorY * 2;
  mirror.add(clone);
  reflectionScene.add(mirror);
  const reflectionMaterials = [];
  clone.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = false;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const copies = originals.map(source => {
      const material = source.clone();
      material.transparent = true;
      // Store straight color in the reflection target. Blending here would
      // premultiply twice when the blurred image is composited onto the gallery.
      material.blending = 0;
      material.depthWrite = true;
      material.opacity = .23;
      material.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 exhibitionWorld;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n exhibitionWorld=(modelMatrix*vec4(position,1.)).xyz;');
        shader.fragmentShader = 'varying vec3 exhibitionWorld;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
          float fade=1.-smoothstep(0.,2.8,${floorY.toFixed(5)}-exhibitionWorld.y);
          gl_FragColor.a*=fade*.78;
          gl_FragColor.rgb*=.72;`);
      };
      material.customProgramCacheKey = () => 'exhibition-reflection-v1';
      reflectionMaterials.push(material);
      return material;
    });
    object.material = Array.isArray(object.material) ? copies : copies[0];
  });
  lights.children.forEach(light => {
    if (!light.isLight) return;
    const copy = light.clone();
    copy.castShadow = false;
    reflectionScene.add(copy);
  });
  reflectionScene.environment = scene.environment;

  const screenScene = new T.Scene();
  const screenCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const screenMaterial = new T.ShaderMaterial({
    uniforms: { image: { value: null }, texel: { value: { x: 1 / 256, y: 1 / 256 } }, strength: { value: 0 } },
    transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    // Premultiplied blur prevents dark halos around the transparent silhouette.
    fragmentShader: `uniform sampler2D image;uniform vec2 texel;uniform float strength;varying vec2 vUv;
      void main(){vec3 rgb=vec3(0.);float alpha=0.;
        for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){
          float weight=exp(-float(x*x+y*y)*.34);
          vec4 s=texture2D(image,vUv+vec2(float(x),float(y))*texel*1.65);
          rgb+=s.rgb*s.a*weight;alpha+=s.a*weight;
        }}
        gl_FragColor=vec4(rgb/max(alpha,.0001),alpha*strength/8.166);
      }`,
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), screenMaterial);
  screenScene.add(quad);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(45,40,30,.5)');
  gradient.addColorStop(.35, 'rgba(55,48,35,.26)');
  gradient.addColorStop(1, 'rgba(55,48,35,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadowTexture = new T.CanvasTexture(shadowCanvas);
  const shadow = new T.Mesh(new T.PlaneGeometry(3.4, 2.5), new T.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = floorY + .012;
  scene.add(shadow);

  // Feathered polished stone receives soft key-light shadows without a hard edge.
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskCanvas.height = 128;
  const mask = maskCanvas.getContext('2d');
  const feather = mask.createRadialGradient(64, 64, 8, 64, 64, 64);
  feather.addColorStop(0, '#fff'); feather.addColorStop(1, '#000');
  mask.fillStyle = feather; mask.fillRect(0, 0, 128, 128);
  const maskTexture = new T.CanvasTexture(maskCanvas);
  const stone = new T.Mesh(new T.PlaneGeometry(7, 5), new T.MeshStandardMaterial({ color: 0xc4bba8, roughness: .68, metalness: 0, transparent: true, opacity: 0, alphaMap: maskTexture, depthWrite: false }));
  stone.rotation.x = -Math.PI / 2;
  stone.position.y = floorY;
  stone.receiveShadow = true;
  scene.add(stone);

  const fallback = () => {
    if (degraded && mirror.parent === scene) return;
    degraded = true;
    target?.dispose(); target = null;
    // Keep the silhouette soft when the extra render pass is too expensive.
    reflectionMaterials.forEach(material => { material.opacity = .14 * strength; material.roughness = .9; material.blending = 1; });
    scene.add(mirror);
    renderer.autoClear = true;
  };
  if (lowQuality) fallback();

  return {
    get quality() { return degraded ? 'mirrored-fallback' : 'blurred-reflection'; },
    downgrade: fallback,
    setBlend(amount) {
      strength = amount;
      shadow.material.opacity = .8 * amount;
      stone.material.opacity = .12 * amount;
      screenMaterial.uniforms.strength.value = amount;
      if (degraded) for (const material of reflectionMaterials) material.opacity = .14 * amount;
    },
    render() {
      if (disposed || degraded) return;
      const width = Math.max(128, Math.min(512, Math.round(renderer.domElement.width * .38)));
      const height = Math.max(128, Math.min(512, Math.round(renderer.domElement.height * .38)));
      try {
        if (!target) target = new T.WebGLRenderTarget(width, height, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: true });
        if (width !== lastWidth || height !== lastHeight) {
          target.setSize(width, height);
          lastWidth = width; lastHeight = height;
          screenMaterial.uniforms.texel.value = { x: 1 / width, y: 1 / height };
        }
        renderer.autoClear = true;
        renderer.setRenderTarget(target);
        renderer.render(reflectionScene, camera);
        renderer.setRenderTarget(null);
        renderer.clear();
        screenMaterial.uniforms.image.value = target.texture;
        renderer.render(screenScene, screenCamera);
        renderer.autoClear = false;
        renderer.clearDepth();
      } catch (error) {
        renderer.setRenderTarget(null);
        fallback();
        console.warn('展陈倒影已切换为轻量模式', error);
      }
    },
    dispose() {
      disposed = true;
      target?.dispose();
      mirror.removeFromParent();
      reflectionMaterials.forEach(material => material.dispose());
      scene.remove(shadow, stone);
      shadow.geometry.dispose(); shadow.material.dispose(); shadowTexture.dispose();
      stone.geometry.dispose(); stone.material.dispose(); maskTexture.dispose();
      quad.geometry.dispose(); screenMaterial.dispose();
      renderer.autoClear = true;
      // Shared artifact geometry and source textures belong to ColorScene.
    },
  };
}
