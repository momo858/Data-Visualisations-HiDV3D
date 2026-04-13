class GestureRecognizer {
  constructor() {
    this.lastX = null;
    this.lastDeltaX = 0;
    this.momentumFrames = 0;
    this.handCentred = false;          // NEW: must pass through centre before rotating
    const CENTRE_ZONE = 80;            // pixels either side of centre (320 ± 80)
    const FRAME_CENTRE = 320;
    this._centreZone = CENTRE_ZONE;
    this._frameCentre = FRAME_CENTRE;
  }

  dist(a, b) {
    try {
      return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    } catch (err) {
      console.error("GestureRecognizer dist() error:", err.message);
      return 0;
    }
  }

  classify(keypoints) {
    try {
      // No hand detected — reset centred flag, apply momentum then stop
      if (!keypoints || keypoints.length < 21) {
        this.handCentred = false;        // NEW: force re-centre on next appearance
        if (this.momentumFrames > 0) {
          this.momentumFrames--;
          this.lastDeltaX *= 0.8;
          return { gesture: "palm", deltaX: this.lastDeltaX };
        }
        this.lastX = null;
        return { gesture: "none" };
      }

      const wrist = keypoints[0];
      const tips = [keypoints[4], keypoints[8], keypoints[12], keypoints[16], keypoints[20]];

      const avgDist = tips.reduce((sum, t) => sum + this.dist(t, wrist), 0) / tips.length;
      const xs = tips.map(t => t.x);
      const spread = Math.max(...xs) - Math.min(...xs);

      // Closed fist: zoom out
      if (avgDist < 80) {
        this.lastX = null;
        this.lastDeltaX = 0;
        this.momentumFrames = 0;
        return { gesture: "fist" };
      }

      // Fingers together: zoom in
      if (spread < 55 && avgDist < 130) {
        this.lastX = null;
        this.lastDeltaX = 0;
        this.momentumFrames = 0;
        return { gesture: "fingers_together" };
      }

      // Open palm: rotation
      if (avgDist > 150) {
        const palmX = keypoints[9].x;

        // NEW: check if hand is in the centre zone
        if (Math.abs(palmX - this._frameCentre) < this._centreZone) {
          this.handCentred = true;
        }

        // NEW: only rotate if hand has passed through centre first
        if (!this.handCentred) {
          this.lastX = palmX;   // track position but don't rotate
          return { gesture: "none" };
        }

        const deltaX = this.lastX !== null ? palmX - this.lastX : 0;
        this.lastX = palmX;
        this.lastDeltaX = deltaX;
        this.momentumFrames = 8;
        return { gesture: "palm", deltaX: deltaX };
      }

      // Transition zone — keep momentum going
      if (this.momentumFrames > 0) {
        this.momentumFrames--;
        this.lastDeltaX *= 0.8;
        return { gesture: "palm", deltaX: this.lastDeltaX };
      }

      this.lastX = null;
      return { gesture: "none" };

    } catch (err) {
      console.error("GestureRecognizer classify() error:", err.message);
      return { gesture: "none" };
    }
  }
}

window.GestureRecognizer = GestureRecognizer;