class HandTracker {
    constructor() {
        this.model = null;
        this.videoElement = null;
        this.isTracking = false;
        this.animationId = null;
        this.keypoints = null;
        this._shapeLogged = false;
    }

    async init(modelPath, videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        const spinner = document.getElementById('handLoading');
        if (spinner) spinner.style.display = 'block';

        try {
            console.log("Loading YOLO model from:", modelPath);
            this.model = await tf.loadGraphModel(modelPath);
            console.log("Model input shape:", this.model.inputs[0].shape);
            console.log("Model loaded successfully!");
            if (spinner) spinner.style.display = 'none';

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 640 }
            });
            this.videoElement.srcObject = stream;

            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    this.isTracking = true;
                    console.log("Webcam started. Ready for inference.");
                    this.detectFrame();
                    resolve(true);
                };
            });

        } catch (error) {
            console.error("Error initializing HandTracker:", error);
            if (spinner) spinner.style.display = 'none';
            return false;
        }
    }

    detectFrame() {
        if (!this.isTracking) return;

        let inputTensor = null;
        let rawOutput = null;

        try {
            // Build [1, 640, 640, 3] input
            const img = tf.browser.fromPixels(this.videoElement);
            const resized = tf.image.resizeBilinear(img, [640, 640]);
            const casted = tf.cast(resized, 'float32');
            const normalized = tf.div(casted, tf.scalar(255.0));
            inputTensor = tf.expandDims(normalized, 0);
            img.dispose(); resized.dispose(); casted.dispose(); normalized.dispose();

            // Execute model
            rawOutput = this.model.execute({ 'x': inputTensor });

            // Resolve output to a single tensor regardless of return type
            let outputTensor;
            if (rawOutput instanceof tf.Tensor) {
                outputTensor = rawOutput;
            } else if (Array.isArray(rawOutput)) {
                outputTensor = rawOutput.find(t => t.shape.length === 3) || rawOutput[0];
            } else {
                // NamedTensorMap - take first value
                outputTensor = Object.values(rawOutput)[0];
            }

            if (!this._shapeLogged) {
                console.log("Output tensor shape:", outputTensor.shape);
                this._shapeLogged = true;
            }

            // outputTensor shape is [1, 68, 8400]
            // We need to work on it using tf functions (not .slice on a non-Tensor)
            // Squeeze batch dim -> [68, 8400]
            const data = outputTensor.dataSync();
            const rows = outputTensor.shape[1];   // 68
            const cols = outputTensor.shape[2];   // 8400

            // Find best anchor by scanning row 4 (class scores)
            let bestScore = 0;
            let bestIndex = 0;
            for (let c = 0; c < cols; c++) {
                const score = data[4 * cols + c];
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = c;
                }
            }

            if (bestScore > 0.5) {
                const pts = [];
                for (let i = 0; i < 21; i++) {
                    pts.push({
                        x: data[(5 + i * 3) * cols + bestIndex],
                        y: data[(5 + i * 3 + 1) * cols + bestIndex],
                        conf: data[(5 + i * 3 + 2) * cols + bestIndex]
                    });
                }
                this.keypoints = pts;
                console.log("Hand detected! Point 9 X:", Math.round(pts[9].x), "Y:", Math.round(pts[9].y));
            } else {
                this.keypoints = null;
            }
            if (window.gestureRecognizer && window.viewer) {
                const result = window.gestureRecognizer.classify(this.keypoints);
                window.viewer.applyGesture(result);
            }

        } catch (error) {
            console.error("Inference Error:", error.message);
        } finally {
            if (inputTensor) inputTensor.dispose();
            if (rawOutput) {
                if (rawOutput instanceof tf.Tensor) rawOutput.dispose();
                else if (Array.isArray(rawOutput)) rawOutput.forEach(t => t.dispose());
                else Object.values(rawOutput).forEach(t => t.dispose());
            }
        }

        this.animationId = requestAnimationFrame(() => this.detectFrame());
    }

    stop() {
        this.isTracking = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
        console.log("Hand tracking stopped.");
    }
}

window.HandTracker = HandTracker;