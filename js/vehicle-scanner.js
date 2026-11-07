
/* =========================================================
   MURGABANI 1 TO 100 CLUB
   MANUAL VEHICLE NUMBER SCANNER

   - Live camera only
   - Manual capture and scan
   - No photo upload
   - Persistent Tesseract worker
   - Focused plate-region OCR
   - Two image enhancement attempts
   - Indian registration validation
   - Existing Search and Save preserved
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const $ = id => document.getElementById(id);

    const vehicleNo = $("vehicleNo");
    const openCameraBtn = $("openCameraBtn");
    const cameraPanel = $("cameraPanel");
    const vehicleCamera = $("vehicleCamera");
    const captureScanBtn = $("captureScanBtn");
    const closeCameraBtn = $("closeCameraBtn");
    const scannerStatus = $("scannerStatus");

    if (
        !vehicleNo ||
        !openCameraBtn ||
        !cameraPanel ||
        !vehicleCamera ||
        !captureScanBtn ||
        !closeCameraBtn ||
        !scannerStatus
    ) {
        console.error("Vehicle scanner: Required HTML elements missing.");
        return;
    }


    /* =========================================
       CONFIGURATION
    ========================================= */

    const CONFIG = {
        captureWidth: 1600,
        minimumConfidence: 25,
        maximumImageWidth: 2000
    };


    /* =========================================
       STATE
    ========================================= */

    let cameraStream = null;
    let worker = null;
    let workerPromise = null;

    let cameraOpening = false;
    let scanning = false;
    let cameraSession = 0;


    /* =========================================
       STATUS
    ========================================= */

    function showStatus(message, type = "") {

        scannerStatus.textContent = message;
        scannerStatus.className = "scanner-status";

        if (type) {
            scannerStatus.classList.add(type);
        }

    }


    /* =========================================
       VEHICLE NUMBER VALIDATION
    ========================================= */

    function extractVehicleNumber(text) {

        const cleaned = String(text || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

        const matches = cleaned.match(
            /[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}/g
        );

        return matches?.[0] || "";

    }


    /* =========================================
       LOAD OCR WORKER ONCE
    ========================================= */

    async function getOCRWorker() {

        if (!window.Tesseract) {
            throw new Error("OCR library failed to load.");
        }

        if (worker) return worker;

        if (workerPromise) return workerPromise;

        workerPromise = (async () => {

            showStatus("Preparing scanner for first use...");

            const newWorker = await Tesseract.createWorker(
                "eng",
                1,
                {
                    logger: info => {

                        if (
                            info.status === "loading tesseract core"
                        ) {
                            showStatus("Loading OCR engine...");
                        }

                        if (
                            info.status === "loading language traineddata"
                        ) {
                            showStatus("Loading recognition data...");
                        }

                    }
                }
            );

            await newWorker.setParameters({

                tessedit_char_whitelist:
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",

                tessedit_pageseg_mode:
                    Tesseract.PSM.SINGLE_LINE,

                preserve_interword_spaces: "0"

            });

            worker = newWorker;

            return worker;

        })();

        try {

            return await workerPromise;

        } catch (error) {

            workerPromise = null;
            throw error;

        }

    }


    /* =========================================
       GET CAMERA CROP
       Matches the green guide frame.
    ========================================= */

    function getCameraCrop() {

        const videoWidth = vehicleCamera.videoWidth;
        const videoHeight = vehicleCamera.videoHeight;

        const container = vehicleCamera.parentElement;

        const displayWidth = container.clientWidth;
        const displayHeight = container.clientHeight;

        if (
            !videoWidth ||
            !videoHeight ||
            !displayWidth ||
            !displayHeight
        ) {
            throw new Error("Camera image is not ready.");
        }

        // object-fit: cover mapping.
        const scale = Math.max(
            displayWidth / videoWidth,
            displayHeight / videoHeight
        );

        const renderedWidth = videoWidth * scale;
        const renderedHeight = videoHeight * scale;

        const offsetX =
            (displayWidth - renderedWidth) / 2;

        const offsetY =
            (displayHeight - renderedHeight) / 2;

        // Match CSS green frame dimensions.
        const guideWidth = displayWidth * 0.90;
        const guideHeight = displayHeight * 0.42;

        const guideX = (displayWidth - guideWidth) / 2;
        const guideY = (displayHeight - guideHeight) / 2;

        let sx = (guideX - offsetX) / scale;
        let sy = (guideY - offsetY) / scale;

        let sw = guideWidth / scale;
        let sh = guideHeight / scale;

        sx = Math.max(0, sx);
        sy = Math.max(0, sy);

        sw = Math.min(sw, videoWidth - sx);
        sh = Math.min(sh, videoHeight - sy);

        return {
            sx: Math.round(sx),
            sy: Math.round(sy),
            sw: Math.round(sw),
            sh: Math.round(sh)
        };

    }


    /* =========================================
       CAPTURE AND ENLARGE PLATE AREA
    ========================================= */

    function capturePlateCanvas() {

        const crop = getCameraCrop();

        const scale = Math.min(
            2.5,
            Math.max(
                1,
                CONFIG.captureWidth / crop.sw
            )
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(crop.sw * scale);
        canvas.height = Math.round(crop.sh * scale);

        const context = canvas.getContext("2d", {
            willReadFrequently: true
        });

        if (!context) {
            throw new Error("Unable to prepare camera image.");
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        context.drawImage(
            vehicleCamera,
            crop.sx,
            crop.sy,
            crop.sw,
            crop.sh,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return canvas;

    }


    /* =========================================
       IMAGE ENHANCEMENT
    ========================================= */

    function enhanceImage(source) {

        const canvas = document.createElement("canvas");

        canvas.width = source.width;
        canvas.height = source.height;

        const context = canvas.getContext("2d", {
            willReadFrequently: true
        });

        context.drawImage(source, 0, 0);

        const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const pixels = imageData.data;

        for (let i = 0; i < pixels.length; i += 4) {

            const gray =
                0.299 * pixels[i] +
                0.587 * pixels[i + 1] +
                0.114 * pixels[i + 2];

            const contrast = Math.max(
                0,
                Math.min(
                    255,
                    (gray - 128) * 1.7 + 128
                )
            );

            pixels[i] = contrast;
            pixels[i + 1] = contrast;
            pixels[i + 2] = contrast;

        }

        context.putImageData(imageData, 0, 0);

        return canvas;

    }


    /* =========================================
       SECOND IMAGE VARIANT
       Threshold enhancement
    ========================================= */

    function createThresholdImage(source) {

        const canvas = document.createElement("canvas");

        canvas.width = source.width;
        canvas.height = source.height;

        const context = canvas.getContext("2d", {
            willReadFrequently: true
        });

        context.drawImage(source, 0, 0);

        const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const pixels = imageData.data;

        let total = 0;
        const count = pixels.length / 4;

        for (let i = 0; i < pixels.length; i += 4) {
            total += pixels[i];
        }

        const threshold = Math.max(
            90,
            Math.min(190, (total / count) * 0.88)
        );

        for (let i = 0; i < pixels.length; i += 4) {

            const value =
                pixels[i] > threshold ? 255 : 0;

            pixels[i] = value;
            pixels[i + 1] = value;
            pixels[i + 2] = value;

        }

        context.putImageData(imageData, 0, 0);

        return canvas;

    }


    /* =========================================
       OCR PROCESSING
    ========================================= */

    async function recognizeVehicle(canvas) {

        const ocrWorker = await getOCRWorker();

        // First attempt: grayscale and contrast.
        const enhanced = enhanceImage(canvas);

        showStatus("Reading number plate...");

        let result = await ocrWorker.recognize(enhanced);

        let number = extractVehicleNumber(
            result?.data?.text
        );

        let confidence = Number(
            result?.data?.confidence || 0
        );

        console.log(
            "OCR attempt 1:",
            result?.data?.text,
            confidence
        );

        if (
            number &&
            confidence >= CONFIG.minimumConfidence
        ) {
            return {
                number,
                confidence
            };
        }

        // Second attempt only if first attempt fails.
        showStatus("Improving image and retrying...");

        const thresholdImage =
            createThresholdImage(enhanced);

        result = await ocrWorker.recognize(
            thresholdImage
        );

        number = extractVehicleNumber(
            result?.data?.text
        );

        confidence = Number(
            result?.data?.confidence || 0
        );

        console.log(
            "OCR attempt 2:",
            result?.data?.text,
            confidence
        );

        return {
            number,
            confidence
        };

    }


    /* =========================================
       FILL EXISTING INPUT
    ========================================= */

    function fillVehicleNumber(number) {

        vehicleNo.value = number;

        vehicleNo.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        vehicleNo.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );

        vehicleNo.focus();

    }


    /* =========================================
       STOP CAMERA
    ========================================= */

    function stopCamera() {

        cameraSession++;

        if (cameraStream) {

            cameraStream.getTracks().forEach(track => {
                track.stop();
            });

            cameraStream = null;

        }

        vehicleCamera.srcObject = null;

        cameraPanel.classList.add("hidden");

        cameraOpening = false;
        scanning = false;

        openCameraBtn.disabled = false;
        captureScanBtn.disabled = false;

    }


    /* =========================================
       OPEN CAMERA
    ========================================= */

    async function openCamera() {

        if (cameraOpening || cameraStream) return;

        if (!navigator.mediaDevices?.getUserMedia) {

            showStatus(
                "Camera requires HTTPS and browser permission.",
                "error"
            );

            return;

        }

        cameraOpening = true;

        openCameraBtn.disabled = true;

        cameraPanel.classList.remove("hidden");

        showStatus("Opening rear camera...");

        const session = ++cameraSession;

        try {

            const stream =
                await navigator.mediaDevices.getUserMedia({

                    video: {

                        facingMode: {
                            ideal: "environment"
                        },

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }

                    },

                    audio: false

                });

            if (session !== cameraSession) {

                stream.getTracks().forEach(track => {
                    track.stop();
                });

                return;

            }

            cameraStream = stream;

            vehicleCamera.srcObject = stream;

            await vehicleCamera.play();

            showStatus(
                "Preparing scanner..."
            );

            // Load worker before manual scanning.
            await getOCRWorker();

            if (
                !cameraStream ||
                session !== cameraSession
            ) {
                return;
            }

            showStatus(
                "Camera ready. Position the number plate and tap Scan."
            );

            cameraOpening = false;

        } catch (error) {

            console.error("Camera error:", error);

            if (session === cameraSession) {

                stopCamera();

                showStatus(
                    "Unable to open camera. Check camera permission and internet connection.",
                    "error"
                );

            }

        } finally {

            cameraOpening = false;

            if (!cameraStream) {
                openCameraBtn.disabled = false;
            }

        }

    }


    /* =========================================
       MANUAL SCAN
    ========================================= */

    async function captureAndScan() {

        if (
            !cameraStream ||
            scanning ||
            !vehicleCamera.videoWidth
        ) {
            return;
        }

        scanning = true;

        captureScanBtn.disabled = true;

        captureScanBtn.textContent = "Reading...";

        try {

            showStatus("Capturing plate...");

            const canvas = capturePlateCanvas();

            const result =
                await recognizeVehicle(canvas);

            if (
                result.number &&
                result.confidence >= CONFIG.minimumConfidence
            ) {

                fillVehicleNumber(result.number);

                showStatus(
                    "✓ Detected: " + result.number,
                    "success"
                );

                // Close camera after successful detection.
                stopCamera();

            } else {

                showStatus(
                    "Number not recognised. Adjust focus, distance or lighting and tap Scan again.",
                    "error"
                );

            }

        } catch (error) {

            console.error(
                "Manual scanner error:",
                error
            );

            showStatus(
                error.message || "Unable to process the image. Try again.",
                "error"
            );

        } finally {

            scanning = false;

            captureScanBtn.disabled = false;

            captureScanBtn.innerHTML =
                "<span>🔍</span> Scan Vehicle Number";

        }

    }


    /* =========================================
       EVENT LISTENERS
    ========================================= */

    openCameraBtn.addEventListener(
        "click",
        openCamera
    );

    captureScanBtn.addEventListener(
        "click",
        captureAndScan
    );

    closeCameraBtn.addEventListener(
        "click",
        stopCamera
    );

    cameraPanel.addEventListener(
        "click",
        event => {

            if (event.target === cameraPanel) {
                stopCamera();
            }

        }
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                !cameraPanel.classList.contains("hidden")
            ) {
                stopCamera();
            }

        }
    );

    window.addEventListener(
        "pagehide",
        () => {

            stopCamera();

            if (worker) {

                worker.terminate();
                worker = null;

            }

        }
    );


    /* =========================================
       INITIALIZATION
    ========================================= */

    showStatus("");

    console.log(
        "Murgabani manual vehicle scanner initialized."
    );

});
