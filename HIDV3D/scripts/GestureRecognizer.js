class GestureRecognizer {
  constructor() {
    this.lastX = null;
    this.lastY = null;
    this.lastDeltaX = 0;
    this.lastDeltaY = 0;
    this.momentumFrames = 0;

    // Horizontal centre-lock
    this.handCentred = false;
    this._centreZone = 80;
    this._frameCentreX = 320;

    // Vertical centre-lock (same concept, frame is 640px tall)
    this.handCentredY = false;
    this._centreZoneY = 80;
    this._frameCentreY = 320;

    this.stillFrames = 0;
    this._stillThreshold = 6;
    this._motionCutoff = 6;

    // Separate smoothing histories for X and Y
    this._deltaXHistory = [];
    this._deltaYHistory = [];
    this._smoothWindow = 5;
  }

  dist(a, b) {
    try {
      return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    } catch (err) {
      console.error("GestureRecognizer dist() error:", err.message);
      return 0;
    }
  }

  _smooth(history, raw) {
    history.push(raw);
    if (history.length > this._smoothWindow) history.shift();
    return history.reduce((a, b) => a + b, 0) / history.length;
  }

  classify(keypoints) {
    try {
      // No hand — reset all flags and drain momentum
      if (!keypoints || keypoints.length < 21) {
        this.handCentred = false;
        this.handCentredY = false;        // reset vertical lock too
        this.stillFrames = 0;
        this._deltaXHistory = [];
        this._deltaYHistory = [];
        this.lastX = null;
        this.lastY = null;
        if (this.momentumFrames > 0) {
          this.momentumFrames--;
          this.lastDeltaX *= 0.8;
          this.lastDeltaY *= 0.8;
          return { gesture: "palm", deltaX: this.lastDeltaX, deltaY: this.lastDeltaY };
        }
        return { gesture: "none" };
      }

      const wrist = keypoints[0];
      const tips = [keypoints[4], keypoints[8], keypoints[12], keypoints[16], keypoints[20]];
      const avgDist = tips.reduce((sum, t) => sum + this.dist(t, wrist), 0) / tips.length;
      const xs = tips.map(t => t.x);
      const spread = Math.max(...xs) - Math.min(...xs);

      const palmX = keypoints[9].x;
      const palmY = keypoints[9].y;

      // Smooth both axes independently
      const rawDeltaX = this.lastX !== null ? palmX - this.lastX : 0;
      const rawDeltaY = this.lastY !== null ? palmY - this.lastY : 0;
      const smoothDeltaX = this._smooth(this._deltaXHistory, rawDeltaX);
      const smoothDeltaY = this._smooth(this._deltaYHistory, rawDeltaY);

      // Stillness uses the larger of the two axes
      const maxDelta = Math.max(Math.abs(smoothDeltaX), Math.abs(smoothDeltaY));
      if (maxDelta < this._motionCutoff) {
        this.stillFrames = Math.min(this.stillFrames + 1, this._stillThreshold + 5);
      } else {
        this.stillFrames = 0;
      }

      const isStill = this.stillFrames >= this._stillThreshold;

      // Closed fist: zoom out — still only
      if (avgDist < 80) {
        this.lastX = null;
        this.lastY = null;
        this.lastDeltaX = 0;
        this.lastDeltaY = 0;
        this.momentumFrames = 0;
        return isStill ? { gesture: "fist" } : { gesture: "none" };
      }

      // Fingers together: zoom in — still only
      if (spread < 55 && avgDist < 130) {
        this.lastX = null;
        this.lastY = null;
        this.lastDeltaX = 0;
        this.lastDeltaY = 0;
        this.momentumFrames = 0;
        return isStill ? { gesture: "fingers_together" } : { gesture: "none" };
      }

      // Open palm: rotation — dominant axis lock
      if (avgDist > 150) {
        // Horizontal centre-lock
        if (Math.abs(palmX - this._frameCentreX) < this._centreZone) {
          this.handCentred = true;
        }

        // Vertical centre-lock — same logic, must pass through vertical middle
        if (Math.abs(palmY - this._frameCentreY) < this._centreZoneY) {
          this.handCentredY = true;
        }

        this.lastX = palmX;
        this.lastY = palmY;

        // Dominant axis lock — zero out the weaker axis
        let outDeltaX = 0;
        let outDeltaY = 0;

        if (Math.abs(smoothDeltaX) >= Math.abs(smoothDeltaY)) {
          // Horizontal wins — only allow if centred horizontally
          outDeltaX = this.handCentred ? smoothDeltaX : 0;
        } else {
          // Vertical wins — inverted so hand up = camera up
          outDeltaY = this.handCentredY ? -smoothDeltaY : 0;
        }

        this.lastDeltaX = outDeltaX;
        this.lastDeltaY = outDeltaY;
        this.momentumFrames = 8;
        return { gesture: "palm", deltaX: outDeltaX, deltaY: outDeltaY };
      }

      // Transition zone — keep momentum going
      if (this.momentumFrames > 0) {
        this.momentumFrames--;
        this.lastDeltaX *= 0.8;
        this.lastDeltaY *= 0.8;
        return { gesture: "palm", deltaX: this.lastDeltaX, deltaY: this.lastDeltaY };
      }

      this.lastX = null;
      this.lastY = null;
      return { gesture: "none" };

    } catch (err) {
      console.error("GestureRecognizer classify() error:", err.message);
      return { gesture: "none" };
    }
  }
}

window.GestureRecognizer = GestureRecognizer;