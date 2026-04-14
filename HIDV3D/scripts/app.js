// ============================================
// APPLICATION CONTROLLER
// ============================================


// ── Auth state (in-memory, no localStorage) ──────────
let authToken = null;
let authUser  = null;

const API = 'http://localhost:3000';

// ── Modal helpers ─────────────────────────────────────
const authModal    = document.getElementById('authModal');
const loginBtn     = document.getElementById('loginBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');

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

// ── Update nav button after login ─────────────────────
function updateAuthUI() {
  loginBtn.textContent = authUser ? `👤 ${authUser}` : 'Login / Register';
}





document.addEventListener("DOMContentLoaded", function () {
  let parsedCsvData = null;
  let columnDetector = null;
  const viewer = new CSV3DViewer("view3d");
  window.viewer = viewer;
  window.handTracker = new HandTracker();
  window.gestureRecognizer = new GestureRecognizer();
  let gesturePanelActive = false;

  const uploadBtn = document.getElementById("uploadBtn");
  const csvInput = document.getElementById("csvInput");
  const visualizeBtn = document.getElementById("visualizeBtn");
  const resetBtn = document.getElementById("resetBtn");
  const columnSelector = document.getElementById("columnSelector");
  const dataInfo = document.getElementById("dataInfo");

  uploadBtn.addEventListener("click", () => csvInput.click());

  csvInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (results) {
        parsedCsvData = results.data.filter(
          (row) => Object.keys(row).length > 0
        );

        if (parsedCsvData.length === 0) {
          alert("CSV file is empty or invalid!");
          return;
        }

        columnDetector = new ColumnDetector(parsedCsvData, viewer.dataMapper);
        const columns = columnDetector.getAllColumns();

        // Update UI
        const numericCount = columns.filter((c) => c.isNumeric).length;
        const categoricalCount = columns.length - numericCount;

        document.getElementById("rowCount").textContent = parsedCsvData.length;
        document.getElementById("colCount").textContent = columns.length;
        document.getElementById("numericCount").textContent = numericCount;
        document.getElementById("categoricalCount").textContent = categoricalCount;
        dataInfo.style.display = "block";

        // Populate column selectors
        populateColumnSelectors(columns);

        // Auto-select best columns
        const bestCols = columnDetector.detectBestColumns();
        document.getElementById("xAxis").value = bestCols.x;
        document.getElementById("yAxis").value = bestCols.y;
        document.getElementById("zAxis").value = bestCols.z;

        columnSelector.classList.add("visible");
        visualizeBtn.disabled = false;
        resetBtn.disabled = false;

        console.log("CSV loaded:", parsedCsvData.length, "rows");

        // Save dataset metadata to the database
        fetch('http://localhost:3000/api/datasets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name.replace('.csv', ''),
            filename: file.name,
            row_count: parsedCsvData.length,
            columns: columns.map(c => c.name)
          })
        })
        .then(res => res.json())
        .then(saved => {
          console.log('Dataset saved to DB:', saved);
          window._currentDatasetId = saved.id;  // store ID for saving visualisations later
        })
        .catch(err => console.error('Failed to save dataset:', err));
      },
      error: function (err) {
        console.error("CSV parsing error:", err);
        alert("Error parsing CSV file!");
      },
    });
  });

  function populateColumnSelectors(columns) {
    const xAxis = document.getElementById("xAxis");
    const yAxis = document.getElementById("yAxis");
    const zAxis = document.getElementById("zAxis");

    [xAxis, yAxis, zAxis].forEach((select) => {
      select.innerHTML = "";
      columns.forEach((col) => {
        const option = document.createElement("option");
        option.value = col.name;
        option.textContent = `${col.name} ${col.isNumeric ? "(#)" : "(cat)"}`;
        select.appendChild(option);
      });
    });
  }

  visualizeBtn.addEventListener("click", () => {
    if (!parsedCsvData) {
      alert("Please upload a CSV file first!");
      return;
    }

    viewer.initScene();

    const xCol = document.getElementById("xAxis").value;
    const yCol = document.getElementById("yAxis").value;
    const zCol = document.getElementById("zAxis").value;

    viewer.visualizeData(parsedCsvData, xCol, yCol, zCol);

    // Save axis mapping to the database
    if (window._currentDatasetId) {
      fetch('http://localhost:3000/api/visualisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: window._currentDatasetId,
          x_col: xCol,
          y_col: yCol,
          z_col: zCol,
          camera_pos: { x: 15, y: 15, z: 15 }
        })
      })
      .then(res => res.json())
      .then(saved => console.log('Visualisation saved to DB:', saved))
      .catch(err => console.error('Failed to save visualisation:', err));
    }
  });

  const handControlBtn = document.getElementById('handControlBtn');

  handControlBtn.addEventListener('click', async function () {
    const panel = document.getElementById('handGesturePanel');
    const video = document.getElementById('webcam');

    gesturePanelActive = !gesturePanelActive;

    if (gesturePanelActive) {
      this.textContent = "Stop Hand Control";
      panel.style.display = "block";

      const modelPath = './nano_handpose_model/model.json';
      await window.handTracker.init(modelPath, 'webcam');
    } else {
      this.textContent = "Hand Control";
      panel.style.display = "none";
      window.handTracker.stop();
      document.getElementById('gestureStatus').textContent = "";
    }
  });

  console.log("HIDV3D Universal CSV Visualizer initialized!");
});