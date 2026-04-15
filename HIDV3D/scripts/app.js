// ============================================
// APPLICATION CONTROLLER
// ============================================

// ── Auth state (in-memory, no localStorage) ──────────
let authToken = null;
let authUser  = null;

const API = 'http://localhost:3000';

// ── Modal helpers ─────────────────────────────────────
const authModal     = document.getElementById('authModal');
const loginBtn      = document.getElementById('loginBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const logoutBtn     = document.getElementById('logoutBtn');

loginBtn.addEventListener('click', () => {
  authModal.style.display = 'flex';
});

modalCloseBtn.addEventListener('click', () => {
  authModal.style.display = 'none';
});

authModal.addEventListener('click', e => {
  if (e.target === authModal) authModal.style.display = 'none';
});

// Tab switching
document.querySelectorAll('.modal-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('loginForm').style.display    = target === 'login'    ? 'flex' : 'none';
    document.getElementById('registerForm').style.display = target === 'register' ? 'flex' : 'none';
  });
});

// ── Login ─────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  errEl.textContent = '';

  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }

    authToken = data.token;
    authUser  = data.username;
    authModal.style.display = 'none';
    updateAuthUI();
  } catch (err) {
    errEl.textContent = 'Could not connect to server.';
  }
});

// ── Register ──────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value;
  const email    = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const errEl    = document.getElementById('registerError');
  errEl.textContent = '';

  try {
    const res  = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }

    authToken = data.token;
    authUser  = data.username;
    authModal.style.display = 'none';
    updateAuthUI();
  } catch (err) {
    errEl.textContent = 'Could not connect to server.';
  }
});

// ── Update nav after login/logout ─────────────────────
function updateAuthUI() {
  loginBtn.textContent    = authUser ? `👤 ${authUser}` : 'Login / Register';
  loginBtn.style.display  = authUser ? 'none' : '';
  logoutBtn.style.display = authUser ? '' : 'none';
  const saveVisBtn = document.getElementById('saveVisBtn');
  if (saveVisBtn) saveVisBtn.disabled = !authToken;
  if (authToken) loadSavedVisualisations();
}

// ── Stub — real function assigned inside DOMContentLoaded ──
function loadSavedVisualisations() {
  if (window._loadSavedVisualisations) window._loadSavedVisualisations();
}

// ============================================
// MAIN APP
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  let parsedCsvData        = null;
  let columnDetector       = null;
  const viewer             = new CSV3DViewer("view3d");
  window.viewer            = viewer;
  window.handTracker       = new HandTracker();
  window.gestureRecognizer = new GestureRecognizer();
  let gesturePanelActive   = false;

  const uploadBtn      = document.getElementById("uploadBtn");
  const csvInput       = document.getElementById("csvInput");
  const visualizeBtn   = document.getElementById("visualizeBtn");
  const resetBtn       = document.getElementById("resetBtn");
  const columnSelector = document.getElementById("columnSelector");
  const dataInfo       = document.getElementById("dataInfo");
  const saveVisBtn     = document.getElementById("saveVisBtn");

  uploadBtn.addEventListener("click", () => csvInput.click());

  // ── Real loadSavedVisualisations (DOM is ready here) ─
  window._loadSavedVisualisations = async function () {
    if (!authToken) return;
    try {
      const res  = await fetch(`${API}/api/visualisations`, {
        headers: { 'x-auth-token': authToken }
      });
      const list = await res.json();
      const select = document.getElementById('savedVisList');
      select.innerHTML = '<option value="">📂 My Visualisations…</option>';
      list.forEach(v => {
        const opt       = document.createElement('option');
        opt.value       = v.id;
        opt.textContent = `${v.dataset_name} — ${v.x_col}/${v.y_col}/${v.z_col}`;
        opt.dataset.vis = JSON.stringify(v);
        select.appendChild(opt);
      });
      const wrap = document.getElementById('visLoadWrap');
      if (wrap) wrap.style.display = list.length ? 'flex' : 'none';
    } catch (err) {
      console.error('Failed to load visualisations:', err);
    }
  };

  // ── Logout ────────────────────────────────────────────
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        headers: { 'x-auth-token': authToken }
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    authToken = null;
    authUser  = null;

    const visLoadWrap  = document.getElementById('visLoadWrap');
    const savedVisList = document.getElementById('savedVisList');
    if (saveVisBtn)   saveVisBtn.disabled = true;
    if (visLoadWrap)  visLoadWrap.style.display = 'none';
    if (savedVisList) savedVisList.innerHTML = '<option value="">📂 My Visualisations…</option>';

    if (window.viewer) window.viewer.initScene();

    parsedCsvData = null;
    columnSelector.classList.remove('visible');
    dataInfo.style.display = 'none';
    visualizeBtn.disabled  = true;
    resetBtn.disabled      = true;

    // ── CHANGE: reset colour dropdown on logout ───────
    const colorAxis = document.getElementById('colorAxis');
    if (colorAxis) colorAxis.innerHTML = '<option value="">— None —</option>';

    if (window.handTracker) {
      window.handTracker.stop();
      const panel = document.getElementById('handGesturePanel');
      if (panel) panel.style.display = 'none';
      document.getElementById('gestureStatus').textContent = '';
      document.getElementById('handControlBtn').textContent = 'Hand Control';
      gesturePanelActive = false;
    }

    window._currentDatasetId = null;
    updateAuthUI();
  });

  // ── CSV Upload ────────────────────────────────────────
  csvInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (results) {
        parsedCsvData = results.data.filter(row => Object.keys(row).length > 0);

        if (parsedCsvData.length === 0) {
          alert("CSV file is empty or invalid!");
          return;
        }

        columnDetector = new ColumnDetector(parsedCsvData, viewer.dataMapper);
        const columns  = columnDetector.getAllColumns();

        const numericCount     = columns.filter(c => c.isNumeric).length;
        const categoricalCount = columns.length - numericCount;

        document.getElementById("rowCount").textContent         = parsedCsvData.length;
        document.getElementById("colCount").textContent         = columns.length;
        document.getElementById("numericCount").textContent     = numericCount;
        document.getElementById("categoricalCount").textContent = categoricalCount;
        dataInfo.style.display = "block";

        populateColumnSelectors(columns);

        const bestCols = columnDetector.detectBestColumns();
        document.getElementById("xAxis").value = bestCols.x;
        document.getElementById("yAxis").value = bestCols.y;
        document.getElementById("zAxis").value = bestCols.z;

        columnSelector.classList.add("visible");
        visualizeBtn.disabled = false;
        resetBtn.disabled     = false;

        console.log("CSV loaded:", parsedCsvData.length, "rows");

        fetch(`${API}/api/datasets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:      file.name.replace('.csv', ''),
            filename:  file.name,
            row_count: parsedCsvData.length,
            columns:   columns.map(c => c.name)
          })
        })
        .then(res => res.json())
        .then(saved => {
          console.log('Dataset saved to DB:', saved);
          window._currentDatasetId = saved.id;
          if (authToken && saveVisBtn) saveVisBtn.disabled = false;
        })
        .catch(err => console.error('Failed to save dataset:', err));
      },
      error: function (err) {
        console.error("CSV parsing error:", err);
        alert("Error parsing CSV file!");
      }
    });
  });

  // ── Populate axis dropdowns ───────────────────────────
  // ── CHANGE: also populates the new colorAxis dropdown ─
  function populateColumnSelectors(columns) {
    ['xAxis', 'yAxis', 'zAxis'].forEach(id => {
      const select = document.getElementById(id);
      select.innerHTML = "";
      columns.forEach(col => {
        const option       = document.createElement("option");
        option.value       = col.name;
        option.textContent = `${col.name} ${col.isNumeric ? "(#)" : "(cat)"}`;
        select.appendChild(option);
      });
    });

    // Colour By — all columns + a "None" default
    const colorSelect = document.getElementById('colorAxis');
    if (colorSelect) {
      colorSelect.innerHTML = '<option value="">— None —</option>';
      columns.forEach(col => {
        const option       = document.createElement("option");
        option.value       = col.name;
        option.textContent = `${col.name} ${col.isNumeric ? "(#)" : "(cat)"}`;
        colorSelect.appendChild(option);
      });
      // Auto-select first categorical column if present
      const firstCat = columns.find(c => !c.isNumeric);
      if (firstCat) colorSelect.value = firstCat.name;
    }
  }

  // ── Visualise ─────────────────────────────────────────
  // ── CHANGE: reads colorAxis and passes it to visualizeData
  visualizeBtn.addEventListener("click", () => {
    if (!parsedCsvData) { alert("Please upload a CSV file first!"); return; }

    viewer.initScene();

    const xCol     = document.getElementById("xAxis").value;
    const yCol     = document.getElementById("yAxis").value;
    const zCol     = document.getElementById("zAxis").value;
    const colorCol = document.getElementById("colorAxis")?.value || null;

    viewer.visualizeData(parsedCsvData, xCol, yCol, zCol, colorCol);
  });

  // ── Reset View ────────────────────────────────────────
  resetBtn.addEventListener("click", () => {
    if (viewer.controls) {
      viewer.camera.position.set(15, 15, 15);
      viewer.controls.target.set(0, 0, 0);
      viewer.controls.update();
    }
  });

  // ── Save Visualisation ────────────────────────────────
  // ── CHANGE: also saves color_col ─────────────────────
  saveVisBtn.addEventListener('click', async () => {
    if (!authToken) { alert('Please log in to save.'); return; }
    if (!window._currentDatasetId) { alert('Visualise a dataset first.'); return; }

    const xCol     = document.getElementById('xAxis').value;
    const yCol     = document.getElementById('yAxis').value;
    const zCol     = document.getElementById('zAxis').value;
    const colorCol = document.getElementById('colorAxis')?.value || null;

    const cam = viewer.camera
      ? { x: viewer.camera.position.x, y: viewer.camera.position.y, z: viewer.camera.position.z }
      : { x: 15, y: 15, z: 15 };

    try {
      const res = await fetch(`${API}/api/visualisations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': authToken },
        body: JSON.stringify({
          dataset_id: window._currentDatasetId,
          x_col: xCol, y_col: yCol, z_col: zCol,
          color_col: colorCol,
          camera_pos: cam
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('Visualisation saved!');
      loadSavedVisualisations();
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  });

  // ── Load Selected Visualisation ───────────────────────
  // ── CHANGE: also restores color_col and passes it to visualizeData
  document.getElementById('loadVisBtn').addEventListener('click', () => {
    const select = document.getElementById('savedVisList');
    const opt    = select.options[select.selectedIndex];
    if (!opt || !opt.dataset.vis) return;
    const v = JSON.parse(opt.dataset.vis);

    document.getElementById('xAxis').value = v.x_col;
    document.getElementById('yAxis').value = v.y_col;
    document.getElementById('zAxis').value = v.z_col;

    const colorSelect = document.getElementById('colorAxis');
    if (colorSelect && v.color_col) colorSelect.value = v.color_col;

    if (v.camera_pos && viewer.camera) {
      const cp = typeof v.camera_pos === 'string' ? JSON.parse(v.camera_pos) : v.camera_pos;
      viewer.camera.position.set(cp.x, cp.y, cp.z);
      if (viewer.controls) viewer.controls.update();
    }

    if (parsedCsvData) {
      viewer.initScene();
      viewer.visualizeData(parsedCsvData, v.x_col, v.y_col, v.z_col, v.color_col || null);
    } else {
      alert(`Axes restored: ${v.x_col} / ${v.y_col} / ${v.z_col}\nUpload the CSV file then click Visualize.`);
    }
  });

  // ── Delete Selected Visualisation ────────────────────
  document.getElementById('deleteVisBtn').addEventListener('click', async () => {
    const select = document.getElementById('savedVisList');
    const id     = select.value;
    if (!id) return;
    if (!confirm('Delete this saved visualisation?')) return;
    try {
      await fetch(`${API}/api/visualisations/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': authToken }
      });
      loadSavedVisualisations();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  });

  // ── Hand Control ──────────────────────────────────────
  const handControlBtn = document.getElementById('handControlBtn');

  handControlBtn.addEventListener('click', async function () {
    const panel = document.getElementById('handGesturePanel');
    gesturePanelActive = !gesturePanelActive;

    if (gesturePanelActive) {
      this.textContent    = "Stop Hand Control";
      panel.style.display = "block";
      const modelPath     = './nano_handpose_model/model.json';
      await window.handTracker.init(modelPath, 'webcam');
    } else {
      this.textContent    = "Hand Control";
      panel.style.display = "none";
      window.handTracker.stop();
      document.getElementById('gestureStatus').textContent = "";
    }
  });

  console.log("HIDV3D Universal CSV Visualizer initialized!");
});