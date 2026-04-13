class GestureRecognizer {
  constructor() {
    this.lastX = null;
    this.lastDeltaX = 0;
    this.momentumFrames = 0;
    this.handCentred = false;
    this._centreZone = 80;
    this._frameCentre = 320;

    this.stillFrames = 0;
    this._stillThreshold = 12;
    this._motionCutoff = 6;
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
      // No hand detected — reset flags, apply momentum then stop
      if (!keypoints || keypoints.length < 21) {
        this.handCentred = false;
        this.stillFrames = 0;
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

      // Always track deltaX so the stillness counter works regardless of gesture
      const palmX = keypoints[9].x;
      const deltaX = this.lastX !== null ? palmX - this.lastX : 0;

      // Update stillness counter
      if (Math.abs(deltaX) < this._motionCutoff) {
        this.stillFrames = Math.min(this.stillFrames + 1, this._stillThreshold + 5);
      } else {
        this.stillFrames = 0;
      }

      const isStill = this.stillFrames >= this._stillThreshold;

      // Closed fist: zoom out — only when hand is still
      if (avgDist < 80) {
        this.lastX = null;
        this.lastDeltaX = 0;
        this.momentumFrames = 0;
        return isStill ? { gesture: "fist" } : { gesture: "none" };
      }

      // Fingers together: zoom in — only when hand is still
      if (spread < 55 && avgDist < 130) {
        this.lastX = null;
        this.lastDeltaX = 0;
        this.momentumFrames = 0;
        return isStill ? { gesture: "fingers_together" } : { gesture: "none" };
      }

      // Open palm: rotation — dominant, always takes priority
      if (avgDist > 150) {
        // Check if hand passes through centre zone to unlock rotation
        if (Math.abs(palmX - this._frameCentre) < this._centreZone) {
          this.handCentred = true;
        }

        this.lastX = palmX;

        // Must be centred before rotation is allowed
        if (!this.handCentred) {
          return { gesture: "none" };
        }

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
