
// ============================================
// CSV3D VIEWER CLASS - Main visualization engine
// ============================================
class CSV3DViewer {
  constructor(containerId) {
    this.container      = document.getElementById(containerId);
    this.scene          = null;
    this.camera         = null;
    this.renderer       = null;
    this.controls       = null;
    this.objects        = [];
    this.animationId    = null;
    this.dataMapper     = new DataMapper();
    this.currentMapping = { x: null, y: null, z: null };
    this._axisLabels    = [];
  }

  initScene() {
    this.container.innerHTML = '';
    this._axisLabels = [];
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
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    const light1 = new THREE.DirectionalLight(0xffffff, 0.6);
    light1.position.set(10, 10, 5);
    this.scene.add(light1);
    const light2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    light2.position.set(-10, -10, -5);
    this.scene.add(light2);

    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping    = true;
    this.controls.dampingFactor    = 0.05;
    this.controls.maxDistance      = 50;
    this.controls.minDistance      = 5;
    this.controls.minPolarAngle    = 0.2;
    this.controls.maxPolarAngle    = Math.PI - 0.2;

    window.addEventListener('resize', this.onWindowResize.bind(this));
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
    this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
  }

  clearScene() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    this.objects = [];
    // Remove old axis label sprites
    this._axisLabels.forEach(s => this.scene.remove(s));
    this._axisLabels = [];
  }

  // ── Axis label sprites ────────────────────────────────
  _makeAxisLabel(text, position) {
    const canvas  = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    const ctx     = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font      = 'bold 28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(text.length > 18 ? text.slice(0, 17) + '…' : text, 128, 42);

    const texture  = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite   = new THREE.Sprite(material);
    sprite.position.set(...position);
    sprite.scale.set(3, 0.75, 1);
    this.scene.add(sprite);
    this._axisLabels.push(sprite);
  }

  // ── Colour helpers ────────────────────────────────────
  _getPointColor(index, total, colorValues, colorIsCateg) {
    if (colorValues) {
      if (colorIsCateg) {
        // distinct hue per category
        const hue = (colorValues[index] / 10);
        return new THREE.Color().setHSL(hue, 0.85, 0.60);
      } else {
        // heatmap: blue → green → red
        const t = colorValues[index] / 10;
        return new THREE.Color().setHSL((1 - t) * 0.66, 0.85, 0.55);
      }
    }
    // default: rainbow by row index
    return new THREE.Color().setHSL(index / total, 0.8, 0.6);
  }

  // ── Main visualisation ────────────────────────────────
  visualizeData(data, xCol, yCol, zCol, colorCol = null) {
    this.clearScene();
    if (!data || data.length === 0) { console.warn('No data to visualize'); return; }

    this.currentMapping = { x: xCol, y: yCol, z: zCol, color: colorCol };

    // Normalised values already in 0–10 range from DataMapper
    const xNorm = this.dataMapper.mapToNumeric(data, xCol);
    const yNorm = this.dataMapper.mapToNumeric(data, yCol);
    const zNorm = this.dataMapper.mapToNumeric(data, zCol);

    let colorValues   = null;
    let colorIsCateg  = false;
    if (colorCol) {
      const analysis  = this.dataMapper.analyzeColumn(data, colorCol);
      colorIsCateg    = !analysis.isNumeric;
      colorValues     = this.dataMapper.mapToNumeric(data, colorCol);
    }

    // Centre the cloud: shift 0–10 range to -5…+5
    const centre = 5;
    const scale  = 1; // 0-10 maps directly, centred at 5

    data.forEach((row, i) => {
      const x = xNorm[i] - centre;
      const y = yNorm[i] - centre;
      const z = zNorm[i] - centre;

      const size     = Math.max(0.05, 0.2 / Math.sqrt(data.length));
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const color    = this._getPointColor(i, data.length, colorValues, colorIsCateg);
      const material = new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        emissive: color,
        emissiveIntensity: 0.2,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, z);
      sphere.userData = { rowData: row, index: i };
      this.scene.add(sphere);
      this.objects.push(sphere);
    });

    // Axis labels at the end of each axis line (offset from centre)
    this._makeAxisLabel(xCol, [6.5, -5.5, -5]);
    this._makeAxisLabel(yCol, [-5.5, 6.5, -5]);
    this._makeAxisLabel(zCol, [-5.5, -5.5, 6.5]);

    this.camera.position.set(18, 18, 18);
    this.camera.lookAt(0, 0, 0);
    console.log(`Visualized ${data.length} points — x:${xCol} y:${yCol} z:${zCol} color:${colorCol||'none'}`);
    this.updateLegend(xCol, yCol, zCol, colorCol);
  }

  applyGesture(result) {
    try {
      if (!result || result.gesture === 'none') return;
      if (!this.camera || !this.controls) return;

      if (result.gesture === 'palm') {
        const sensitivity = 0.005;
        if (result.deltaX !== 0) {
          const az = this.controls.getAzimuthalAngle() + result.deltaX * sensitivity;
          this.controls.minAzimuthAngle = az;
          this.controls.maxAzimuthAngle = az;
          this.controls.update();
          this.controls.minAzimuthAngle = -Infinity;
          this.controls.maxAzimuthAngle =  Infinity;
        }
        if (result.deltaY !== 0) {
          const newPolar = Math.max(
            this.controls.minPolarAngle,
            Math.min(this.controls.maxPolarAngle,
              this.controls.getPolarAngle() + result.deltaY * sensitivity)
          );
          this.controls.minPolarAngle = newPolar;
          this.controls.maxPolarAngle = newPolar;
          this.controls.update();
          this.controls.minPolarAngle = 0.2;
          this.controls.maxPolarAngle = Math.PI - 0.2;
        }
      } else if (result.gesture === 'fingers_together') {
        const dir  = this.camera.position.clone().normalize();
        const dist = this.camera.position.length();
        if (dist > this.controls.minDistance) {
          this.camera.position.addScaledVector(dir, -0.15);
          this.controls.target.set(0, 0, 0);
          this.controls.update();
        }
      } else if (result.gesture === 'fist') {
        const dir  = this.camera.position.clone().normalize();
        const dist = this.camera.position.length();
        if (dist < this.controls.maxDistance) {
          this.camera.position.addScaledVector(dir, 0.15);
          this.controls.target.set(0, 0, 0);
          this.controls.update();
        }
      }
    } catch (err) {
      console.error('CSV3DViewer applyGesture() error:', err.message);
    }
  }

  updateLegend(xCol, yCol, zCol, colorCol = null) {
    const legend  = document.getElementById('legend');
    const content = document.getElementById('legendContent');
    legend.style.display = 'block';

    const xStats = this.dataMapper.getNormStats(xCol);
    const yStats = this.dataMapper.getNormStats(yCol);
    const zStats = this.dataMapper.getNormStats(zCol);

    const statBadge = (stats) => {
      if (!stats) return '';
      return `<span class="norm-badge">${stats.method}</span>`;
    };

    let html = '';
    html += `<div class="legend-item"><strong>X:</strong> ${xCol} ${statBadge(xStats)}</div>`;
    html += `<div class="legend-item"><strong>Y:</strong> ${yCol} ${statBadge(yStats)}</div>`;
    html += `<div class="legend-item"><strong>Z:</strong> ${zCol} ${statBadge(zStats)}</div>`;
    if (colorCol) {
      const cm = this.dataMapper.getCategoryMapping(colorCol);
      html += `<div class="legend-item"><strong>Colour:</strong> ${colorCol}</div>`;
      if (cm) {
        // show colour swatches for categories
        [...cm.entries()].slice(0, 8).forEach(([label, idx]) => {
          const hue = (idx / (cm.size - 1 || 1));
          const c   = new THREE.Color().setHSL(hue, 0.85, 0.60);
          html += `<div class="legend-item">
            <span class="legend-swatch" style="background:rgb(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)})"></span>
            ${label}
          </div>`;
        });
        if (cm.size > 8) html += `<div class="legend-item legend-muted">…+${cm.size - 8} more</div>`;
      }
    }
    html += `<div class="legend-item"><strong>Points:</strong> ${this.objects.length}</div>`;
    content.innerHTML = html;
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.clearScene();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container.contains(this.renderer.domElement))
        this.container.removeChild(this.renderer.domElement);
    }
    if (this.controls) this.controls.dispose();
    window.removeEventListener('resize', this.onWindowResize);
  }
}
