class GestureRecognizer {
    constructor() {
        this.lastX = null;
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
            if (!keypoints || keypoints.length < 21) {
                console.warn("GestureRecognizer: invalid or missing keypoints", keypoints);
                return { gesture: "none" };
            }

            const wrist = keypoints[0];
            const tips = [keypoints[4], keypoints[8], keypoints[12], keypoints[16], keypoints[20]];

            const avgDist = tips.reduce((sum, t) => sum + this.dist(t, wrist), 0) / tips.length;
            const xs = tips.map(t => t.x);
            const spread = Math.max(...xs) - Math.min(...xs);

            if (avgDist < 80) {
                this.lastX = null;
                return { gesture: "fist" };
            }

            if (spread < 60) {
                this.lastX = null;
                return { gesture: "fingers_together" };
            }

            if (avgDist > 150) {
                const palmX = keypoints[9].x;
                const deltaX = this.lastX !== null ? palmX - this.lastX : 0;
                this.lastX = palmX;
                return { gesture: "palm", deltaX: deltaX };
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