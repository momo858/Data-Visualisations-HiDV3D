# HIDV3D — Hand Integrated Data Visualisation 3D

HIDV3D is a browser-based 3D data visualisation tool that lets you upload any CSV file and explore your data as an interactive 3D scatter plot — controlled by your mouse or your hands via webcam. No installation required for end users, just open the app and go.

Built as a final year project for BSc Computer Science at Technological University Dublin.

---

## What It Does

- Upload any CSV file and instantly generate an interactive 3D scatter plot
- Automatically detects numeric and categorical columns and suggests the best axes
- Adaptive normalisation pipeline handles outliers, skewed data, and mixed column types automatically
- Colour data points by any column — categorical columns get distinct colour palettes, numeric columns get a blue to red heatmap
- Orbit, zoom, and pan with standard mouse controls
- Enable hand gesture control via webcam — open palm rotates, closed fist zooms out, fingers together zooms in
- Register and log in to save visualisation configurations including axis selections, colour mapping, and camera position
- Load and restore previous visualisations across sessions
- Toast notifications replace all browser alerts for a clean user experience

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| 3D Rendering | Three.js r128 + OrbitControls |
| CSV Parsing | PapaParse 5.5.3 |
| Gesture Recognition | Local nano YOLO model via TensorFlow.js 3.7.0 |
| Frontend | Vanilla JavaScript — no framework |
| Backend | Plain Node.js HTTP server — no Express |
| Database | PostgreSQL via pg Pool |
| Authentication | bcrypt (cost 12) + crypto.randomBytes session tokens |

---

## Project Structure
Data-Visualizations-/
├── HIDV3D/
│   ├── index.html
│   ├── style.css
│   ├── nano_handpose_model/
│   │   ├── model.json
│   │   └── group1-shard*.bin
│   └── scripts/
│       ├── app.js
│       ├── CSV3DViewer.js
│       ├── DataMapper.js
│       ├── ColumnDetector.js
│       ├── HandTrack.js
│       └── GestureRecognizer.js
└── server/
├── server.js
├── db.js
├── schema.sql
├── env.example
└── routes/
├── auth.js
├── datasets.js
└── visualisations.js
---

## Installation Guide

### Prerequisites

Make sure you have the following installed before starting:

- [Node.js](https://nodejs.org/) v18 or higher
- [PostgreSQL](https://www.postgresql.org/download/) v18 or higher
- A modern web browser (Chrome recommended for webcam gesture support)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/momo858/Data-Visualisations-
cd Data-Visualisations-
```

---

### Step 2 — Set Up the Database

Open a terminal and connect to PostgreSQL:

```bash
psql -U postgres
```

Create the database:

```sql
CREATE DATABASE hidv3d;
\q
```

---

### Step 3 — Configure Environment Variables

Navigate to the server folder:

```bash
cd server
```

Copy the example environment file:

```bash
cp env.example .env
```

Open `.env` and fill in your PostgreSQL credentials:
