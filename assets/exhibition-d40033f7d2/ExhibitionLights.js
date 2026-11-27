export function createExhibitionLights(T, scene, renderer, lowQuality) {
  const workbench = scene.children.filter(node => node.isLight && node.visible)
    .map(light => ({ light, intensity: light.intensity }));
  const originalExposure = renderer.toneMappingExposure;
  const originalEnvironment = scene.environment;
  const originalEnvironmentIntensity = scene.environmentIntensity;
  const group = new T.Group();
  group.name = 'ExhibitionLights';
  const ambient = new T.HemisphereLight(0xfff5e3, 0x9a9484, .82);
  const key = new T.SpotLight(0xffe7ca, 136, 22, .48, 1, 2);
  key.position.set(-2.4, 7, 3.4);
  key.target.position.set(0, .5, 0);
  key.castShadow = !lowQuality;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -.00015;
  key.shadow.normalBias = .035;
  key.shadow.radius = 4;
  const fill = new T.DirectionalLight(0xedece0, 1.4);
  fill.position.set(3, 1.5, 5);
  const rim = new T.DirectionalLight(0xffead2, 2.35);
  rim.position.set(-2, 3, -4);
  group.add(ambient, key, key.target, fill, rim);
  scene.add(group);
  renderer.shadowMap.enabled = !lowQuality;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = 2; // PCFSoftShadowMap, already supported by this renderer.
  const gallery = [ambient, key, fill, rim].map(light => ({ light, intensity: light.intensity }));

  // Broad studio highlights, generated with the existing renderer, no HDR download.
  let environment = null;
  if (!lowQuality) {
    const studio = new T.Scene();
    studio.background = new T.Color('#9c9b8e');
    for (const [color, x, y, z, width, height] of [
      ['#fff6df', -4, 5, 4, 3, 7], ['#d7ded2', 5, 2, 1, 2, 5], ['#ffefd7', 0, 6, -3, 4, 3],
    ]) {
      const panel = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ color }));
      panel.position.set(x, y, z);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
    }
    const generator = new T.PMREMGenerator(renderer);
    try { environment = generator.fromScene(studio, .02, .1, 40); scene.environment = environment.texture; }
    catch (error) { console.warn('展陈环境高光已使用基础灯光', error); }
    finally {
      generator.dispose();
      studio.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
    }
  }

  // A faint shaft of light, with no physical lamp geometry.
  const beamMaterial = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: 2,
    uniforms: { blend: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform float blend; varying vec2 vUv; void main(){
      float spread=mix(.48,.10,vUv.y);
      float shaft=exp(-pow((vUv.x-.5)/spread,2.0)*3.5);
      float fade=smoothstep(0.,.22,vUv.y)*(1.-smoothstep(.85,1.,vUv.y));
      gl_FragColor=vec4(1.,.91,.73,shaft*fade*.025*blend);
    }`,
  });
  const beam = new T.Mesh(new T.PlaneGeometry(4.5, 8), beamMaterial);
  beam.position.set(-.6, 2.4, -1.2);
  scene.add(beam);
  return {
    group,
    setBlend(amount) {
      for (const { light, intensity } of workbench) {
        light.intensity = intensity * (1 - amount);
        light.visible = amount < 1;
      }
      for (const { light, intensity } of gallery) light.intensity = intensity * amount;
      renderer.toneMappingExposure = originalExposure + (1.03 - originalExposure) * amount;
      if (environment) scene.environmentIntensity = originalEnvironmentIntensity * amount;
      beamMaterial.uniforms.blend.value = amount;
    },
    downgrade() { key.castShadow = false; renderer.shadowMap.enabled = false; key.shadow.map?.dispose(); },
    dispose() {
      scene.remove(group, beam);
      key.shadow.dispose();
      beam.geometry.dispose(); beamMaterial.dispose();
      scene.environment = originalEnvironment;
      scene.environmentIntensity = originalEnvironmentIntensity;
      environment?.dispose();
    },
  };
}
