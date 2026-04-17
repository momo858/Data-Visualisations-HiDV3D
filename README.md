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
| Deployment | Docker + docker-compose |


## Installation

### Prerequisites

The only thing you need is [Docker Desktop](https://www.docker.com/products/docker-desktop/). No Node.js, no PostgreSQL, no database setup required.

---

### Step 1 — Install Docker Desktop

Download and install Docker Desktop from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)

Make sure Docker Desktop is running before continuing. You will see the Docker whale icon in your system tray when it is ready.

---

### Step 2 — Clone the Repository

```bash
git clone https://github.com/momo858/Data-Visualisations-
cd Data-Visualisations-
```

---

### Step 3 — Start the Application

```bash
docker-compose up
```

The first run will take a few minutes as Docker downloads the required images. You will know it is ready when you see:

Database tables ready.
HIDV3D server running at http://localhost:3000

---

### Step 4 — Open the App

Open your browser and go to:
http://localhost:3000
That is it. Docker automatically sets up Node.js, PostgreSQL, creates all the database tables, and serves the full application.

---

### Stopping the App

```bash
docker-compose down
```

---

### Running Again After First Setup

```bash
docker-compose up
```

Subsequent runs start much faster because Docker caches the images.

---

## Using the App

1. Click **Upload CSV** to load a data file
2. The system automatically detects columns and suggests the best axes
3. Adjust the X, Y, Z, and Colour dropdowns if needed
4. Click **Visualize Data** to generate the 3D scatter plot
5. Use your mouse to orbit, zoom, and pan the scene
6. Click **Hand Control** to activate webcam gesture control
7. Register or log in to save and reload your visualisations
8. Click **❓ Help** in the top nav for a quick guide

---

### Gesture Controls

| Gesture | Action |
|---------|--------|
| ✋ Open palm | Rotate the scene |
| ✊ Closed fist | Zoom out |
| 🤏 All Fingers together | Zoom in |

> For best gesture recognition results, use the app in good lighting with a plain background behind your hand.

---

## Known Limitations

- Performance may slow  with datasets above 5000 rows
- Gesture recognition accuracy varies with lighting conditions
- Sessions are stored in server memory and are lost on server restart
- The app is designed for desktop browsers 

---

## GitHub

[https://github.com/momo858/Data-Visualisations-](https://github.com/momo858/Data-Visualisations-)