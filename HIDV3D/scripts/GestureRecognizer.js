class GestureRecognizer {
    constructor() {
        this.lastX = null;
        this.lastDeltaX = 0;
        this.momentumFrames = 0;
        const MOMENTUM_DECAY = 8; // frames to keep momentum after hand leaves
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
            // No hand detected — apply momentum for a few frames then stop
            if (!keypoints || keypoints.length < 21) {
                if (this.momentumFrames > 0) {
                    this.momentumFrames--;
                    this.lastDeltaX *= 0.8; // decay the momentum
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

            // Closed fist: all tips close to wrist
            if (avgDist < 80) {
                this.lastX = null;
                this.lastDeltaX = 0;
                this.momentumFrames = 0;
                return { gesture: "fist" };
            }

            // Fingers together: bunched AND not fully extended toward camera
            // avgDist < 130 prevents triggering when hand points straight at camera
            if (spread < 55 && avgDist < 130) {
                this.lastX = null;
                this.lastDeltaX = 0;
                this.momentumFrames = 0;
                return { gesture: "fingers_together" };
            }

            // Open palm: fingers spread and extended
            if (avgDist > 150) {
                const palmX = keypoints[9].x;
                const deltaX = this.lastX !== null ? palmX - this.lastX : 0;
                this.lastX = palmX;
                this.lastDeltaX = deltaX;
                this.momentumFrames = 8; // store 8 frames of momentum
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
