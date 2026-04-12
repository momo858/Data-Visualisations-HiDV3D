// ============================================
// APPLICATION CONTROLLER
// ============================================

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
        document.getElementById("categoricalCount").textContent =
          categoricalCount;
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
  });

const handControlBtn = document.getElementById('handControlBtn');

  handControlBtn.addEventListener('click', async function() {
      const panel = document.getElementById('handGesturePanel');
      const video = document.getElementById('webcam'); // ID matches your index.html
      
      gesturePanelActive = !gesturePanelActive;
      
      if (gesturePanelActive) {
          // TURN ON hand tracking
          this.textContent = "Stop Hand Control";
          panel.style.display = "block";
          
          // Use the exact model path we found
          const modelPath = './nano_handpose_model/model.json';
          
          // Pass the path and the ID of the video element
          await window.handTracker.init(modelPath, 'webcam');
          
      } else {
          // TURN OFF hand tracking
          this.textContent = "Hand Control";
          panel.style.display = "none";
          
          // Call the stop method we wrote in HandTrack.js
          window.handTracker.stop();
          
          // Clear status text
          document.getElementById('gestureStatus').textContent = "";
      }
  });

  console.log("HIDV3D Universal CSV Visualizer initialized!");
});
