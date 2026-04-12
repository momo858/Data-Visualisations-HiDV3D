// ============================================
// CSV3D VIEWER CLASS - Main visualization engine
// ============================================
class CSV3DViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.objects = [];
    this.animationId = null;
    this.dataMapper = new DataMapper();
    this.currentMapping = { x: null, y: null, z: null };
  }

  initScene() {
    this.container.innerHTML = "";

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.offsetWidth / this.container.offsetHeight,
      0.1,
      1000
    );
    this.camera.position.set(12, 12, 12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    );
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const light1 = new THREE.DirectionalLight(0xffffff, 0.6);
    light1.position.set(10, 10, 5);
    this.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    light2.position.set(-10, -10, -5);
    this.scene.add(light2);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);

    // Add grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 50;
    this.controls.minDistance = 5;

    window.addEventListener("resize", this.onWindowResize.bind(this));
    this.animate();
  }

  animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect =
      this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    );
  }

  clearScene() {
    this.objects.forEach((obj) => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.objects = [];
  }

  visualizeData(data, xCol, yCol, zCol) {
    this.clearScene();

    if (!data || data.length === 0) {
      console.warn("No data to visualize");
      return;
    }

    this.currentMapping = { x: xCol, y: yCol, z: zCol };

    // Map columns to numeric values
    const xValues = this.dataMapper.mapToNumeric(data, xCol);
    const yValues = this.dataMapper.mapToNumeric(data, yCol);
    const zValues = this.dataMapper.mapToNumeric(data, zCol);

    // Normalize values
    const xMin = Math.min(...xValues),
      xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues),
      yMax = Math.max(...yValues);
    const zMin = Math.min(...zValues),
      zMax = Math.max(...zValues);

    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const zRange = zMax - zMin || 1;

    const scale = 10;

    // Create point cloud
    data.forEach((row, index) => {
      const x = ((xValues[index] - xMin) / xRange - 0.5) * scale;
      const y = ((yValues[index] - yMin) / yRange - 0.5) * scale;
      const z = ((zValues[index] - zMin) / zRange - 0.5) * scale;

      const size = Math.max(0.05, 0.2 / Math.sqrt(data.length));
      const geometry = new THREE.SphereGeometry(size, 8, 8);

      const hue = index / data.length;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      const material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
        emissive: color,
        emissiveIntensity: 0.2,
      });

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, z);
      sphere.userData = { rowData: row, index: index };

      this.scene.add(sphere);
      this.objects.push(sphere);
    });

    this.camera.position.set(scale * 1.5, scale * 1.5, scale * 1.5);
    this.camera.lookAt(0, 0, 0);

    console.log(
      `Visualized ${data.length} points across ${xCol}, ${yCol}, ${zCol}`
    );
    this.updateLegend(xCol, yCol, zCol);
  }

    applyGesture(result) {
      try {
          if (!result || result.gesture === "none") return;
          if (!this.camera || !this.controls) {
              console.warn("CSV3DViewer applyGesture: camera or controls not ready");
              return;
          }

          if (result.gesture === "palm") {
              // Rotate the scene left/right based on hand deltaX
              const sensitivity = 0.005;
              const angle = result.deltaX * sensitivity;
              // Rotate camera position around the Y axis (orbit around origin)
              const camPos = this.camera.position;
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);
              const newX = camPos.x * cos + camPos.z * sin;
              const newZ = -camPos.x * sin + camPos.z * cos;
              this.camera.position.set(newX, camPos.y, newZ);
              this.camera.lookAt(0, 0, 0);
              this.controls.update();
              console.log("Gesture: rotate deltaX", Math.round(result.deltaX));
          }

          else if (result.gesture === "fingers_together") {
              // Zoom in — move camera closer to origin
              const zoomSpeed = 0.05;
              const direction = this.camera.position.clone().normalize();
              const currentDist = this.camera.position.length();
              if (currentDist > this.controls.minDistance) {
                  this.camera.position.addScaledVector(direction, -zoomSpeed);
                  this.controls.update();
                  console.log("Gesture: zoom in, dist", currentDist.toFixed(2));
              }
          }

          else if (result.gesture === "fist") {
              // Zoom out — move camera further from origin
              const zoomSpeed = 0.05;
              const direction = this.camera.position.clone().normalize();
              const currentDist = this.camera.position.length();
              if (currentDist < this.controls.maxDistance) {
                  this.camera.position.addScaledVector(direction, zoomSpeed);
                  this.controls.update();
                  console.log("Gesture: zoom out, dist", currentDist.toFixed(2));
              }
          }

      } catch (err) {
          console.error("CSV3DViewer applyGesture() error:", err.message);
      }
  }


  updateLegend(xCol, yCol, zCol) {
    const legend = document.getElementById("legend");
    const content = document.getElementById("legendContent");
    legend.style.display = "block";

    const xMap = this.dataMapper.getCategoryMapping(xCol);
    const yMap = this.dataMapper.getCategoryMapping(yCol);
    const zMap = this.dataMapper.getCategoryMapping(zCol);

    let html = "";
    html += `<div class="legend-item"><strong>X Axis:</strong> ${xCol} ${
      xMap ? "(Categorical)" : "(Numeric)"
    }</div>`;
    html += `<div class="legend-item"><strong>Y Axis:</strong> ${yCol} ${
      yMap ? "(Categorical)" : "(Numeric)"
    }</div>`;
    html += `<div class="legend-item"><strong>Z Axis:</strong> ${zCol} ${
      zMap ? "(Categorical)" : "(Numeric)"
    }</div>`;
    html += `<div class="legend-item"><strong>Points:</strong> ${this.objects.length}</div>`;

    content.innerHTML = html;
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.clearScene();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
    if (this.controls) this.controls.dispose();
    window.removeEventListener("resize", this.onWindowResize);
  }
}
