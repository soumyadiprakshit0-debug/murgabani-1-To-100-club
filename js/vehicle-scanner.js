
/* =========================================================
   MURGABANI 1 TO 100 CLUB
   VEHICLE NUMBER SCANNER — IMPROVED OCR

   - OCR crop aligned with green camera guide
   - Correct object-fit: cover coordinate mapping
   - High-resolution crop enlargement
   - Grayscale, contrast and sharpening
   - Second OCR preprocessing attempt
   - Persistent OCR worker
   - Repeated detection confirmation
   - Photo OCR support
   - Existing collection system unchanged
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const $ = id => document.getElementById(id);

    const vehicleNo = $("vehicleNo");
    const openCameraBtn = $("openCameraBtn");
    const openPhotoBtn = $("openPhotoBtn");
    const cameraPanel = $("cameraPanel");
    const vehicleCamera = $("vehicleCamera");
    const captureScanBtn = $("captureScanBtn");
    const closeCameraBtn = $("closeCameraBtn");
    const vehiclePhotoInput = $("vehiclePhotoInput");
    const scannerStatus = $("scannerStatus");

    if (
        !vehicleNo || !openCameraBtn || !openPhotoBtn ||
        !cameraPanel || !vehicleCamera || !captureScanBtn ||
        !closeCameraBtn || !vehiclePhotoInput || !scannerStatus
    ) {
        console.error("Vehicle Scanner: Required elements missing.");
        return;
    }

    const CONFIG = {
        scanDelay: 350,
        requiredMatches: 2,
        minimumConfidence: 35,

        // Output crop resolution.
        targetCropWidth: 1800,

        // Must match the green guide in CSS.
        guideWidth: 0.90,
        guideHeight: 0.42,

        // Camera video container is aspect-ratio: 4 / 3.
        previewAspectRatio: 4 / 3
    };

    let cameraStream = null;
    let worker = null;
    let workerPromise = null;

    let cameraOpening = false;
    let scanning = false;
    let scanLoopRunning = false;

    let cameraSession = 0;

    let lastDetectedNumber = "";
    let consecutiveMatches = 0;


    /* =====================================================
       STATUS
    ===================================================== */

    function showStatus(message, type = "") {
        scannerStatus.textContent = message;
        scannerStatus.className = "scanner-status";

        if (type) {
            scannerStatus.classList.add(type);
        }
    }


    function hideStatus() {
        scannerStatus.textContent = "";
        scannerStatus.className = "scanner-status hidden";
    }


    /* =====================================================
       VEHICLE NUMBER VALIDATION
    ===================================================== */

    function extractVehicleNumber(text) {

        const cleaned = String(text || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

        const matches = cleaned.match(
            /[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}/g
        );

        return matches?.[0] || "";
    }


    /* =====================================================
       OCR WORKER — LOAD ONLY ONCE
    ===================================================== */

    async function getOCRWorker() {

        if (!window.Tesseract) {
            throw new Error("Tesseract library is not loaded.");
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
                    Tesseract.PSM.SINGLE_LINE

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


    /* =====================================================
       CANVAS CREATION
    ===================================================== */

    function createCanvas(width, height) {

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));

        return canvas;
    }


    /* =====================================================
       MAP GREEN GUIDE TO ORIGINAL CAMERA FRAME

       This accounts for object-fit: cover.
       The OCR crop matches the visible green frame.
    ===================================================== */

    function getCameraCrop(source) {

        const sourceWidth = source.videoWidth;
        const sourceHeight = source.videoHeight;

        const container = vehicleCamera.parentElement;

        const displayWidth =
            container.clientWidth || 640;

        const displayHeight =
            container.clientHeight ||
            displayWidth / CONFIG.previewAspectRatio;

        const scale = Math.max(
            displayWidth / sourceWidth,
            displayHeight / sourceHeight
        );

        const renderedWidth = sourceWidth * scale;
        const renderedHeight = sourceHeight * scale;

        const offsetX =
            (displayWidth - renderedWidth) / 2;

        const offsetY =
            (displayHeight - renderedHeight) / 2;

        // Green frame dimensions.
        const guideWidth =
            displayWidth * CONFIG.guideWidth;

        const guideHeight =
            displayHeight * CONFIG.guideHeight;

        const guideX =
            (displayWidth - guideWidth) / 2;

        const guideY =
            (displayHeight - guideHeight) / 2;

        // Convert visible preview coordinates to source pixels.
        let sx = (guideX - offsetX) / scale;
        let sy = (guideY - offsetY) / scale;

        let sw = guideWidth / scale;
        let sh = guideHeight / scale;

        sx = Math.max(0, sx);
        sy = Math.max(0, sy);

        sw = Math.min(sw, sourceWidth - sx);
        sh = Math.min(sh, sourceHeight - sy);

        return {
            sx: Math.round(sx),
            sy: Math.round(sy),
            sw: Math.round(sw),
            sh: Math.round(sh)
        };
    }


    /* =====================================================
       IMAGE ENHANCEMENT

       Creates:
       1. Grayscale + contrast image
       2. High-contrast threshold image
    ===================================================== */

    function enhanceCanvas(canvas) {

        const context = canvas.getContext("2d", {
            willReadFrequently: true
        });

        const imageData = context.getImageData(
            0, 0, canvas.width, canvas.height
        );

        const pixels = imageData.data;

        // Grayscale and contrast.
        for (let i = 0; i < pixels.length; i += 4) {

            const gray =
                0.299 * pixels[i] +
                0.587 * pixels[i + 1] +
                0.114 * pixels[i + 2];

            const contrast = Math.max(
                0,
                Math.min(
                    255,
                    (gray - 128) * 1.65 + 128
                )
            );

            pixels[i] = contrast;
            pixels[i + 1] = contrast;
            pixels[i + 2] = contrast;
        }

        context.putImageData(imageData, 0, 0);

        // Create a second adaptive-like threshold variant.
        const second = createCanvas(
            canvas.width,
            canvas.height
        );

        const secondContext = second.getContext("2d", {
            willReadFrequently: true
        });

        secondContext.drawImage(canvas, 0, 0);

        const secondData = secondContext.getImageData(
            0, 0, second.width, second.height
        );

        const data = secondData.data;

        // Calculate average brightness.
        let total = 0;
        const count = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            total += data[i];
        }

        const average = total / count;
        const threshold = Math.max(
            95,
            Math.min(185, average * 0.88)
        );

        for (let i = 0; i < data.length; i += 4) {

            const value =
                data[i] > threshold ? 255 : 0;

            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
        }

        secondContext.putImageData(secondData, 0, 0);

        return {
            contrast: canvas,
            threshold: second
        };
    }


    /* =====================================================
       PREPARE CAMERA IMAGE

       Uses exact green-frame crop and enlarges it.
    ===================================================== */

    function prepareCameraImage(source) {

        const crop = getCameraCrop(source);

        if (crop.sw <= 0 || crop.sh <= 0) {
            throw new Error("Invalid camera crop.");
        }

        const scale = Math.max(
            1,
            CONFIG.targetCropWidth / crop.sw
        );

        const canvas = createCanvas(
            CONFIG.targetCropWidth,
            crop.sh * scale
        );

        const context = canvas.getContext("2d", {
            willReadFrequently: true
        });

        // Draw crop at higher resolution.
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        context.drawImage(
            source,
            crop.sx,
            crop.sy,
            crop.sw,
            crop.sh,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return enhanceCanvas(canvas);
    }


    /* =====================================================
       PREPARE PHOTO IMAGE
    ===================================================== */

    function preparePhotoImage(source) {

        const width =
            source.naturalWidth || source.width;

        const height =
            source.naturalHeight || source.height;

        const scale = Math.min(
            2,
            CONFIG.targetCropWidth / width
        );

        const canvas = createCanvas(
            width * scale,
            height * scale
        );

        const context = canvas.getContext("2d", {
            willReadFrequently: true
        });

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        context.drawImage(
            source,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return enhanceCanvas(canvas);
    }


    /* =====================================================
       OCR WITH TWO IMAGE VARIANTS
    ===================================================== */

    async function recognizePreparedImage(images) {

        const ocrWorker = await getOCRWorker();

        // First pass: grayscale and contrast.
        let result = await ocrWorker.recognize(
            images.contrast
        );

        let number = extractVehicleNumber(
            result?.data?.text
        );

        let confidence = Number(
            result?.data?.confidence || 0
        );

        if (
            number &&
            confidence >= CONFIG.minimumConfidence
        ) {
            return { number, confidence };
        }

        // Second pass: high-contrast threshold.
        result = await ocrWorker.recognize(
            images.threshold
        );

        number = extractVehicleNumber(
            result?.data?.text
        );

        confidence = Number(
            result?.data?.confidence || 0
        );

        return {
            number,
            confidence
        };
    }


    /* =====================================================
       FILL EXISTING VEHICLE INPUT
    ===================================================== */

    function fillVehicleNumber(number) {

        vehicleNo.value = number;

        vehicleNo.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        vehicleNo.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        vehicleNo.focus();
    }


    /* =====================================================
       STOP CAMERA
    ===================================================== */

    function stopCamera() {

        cameraSession++;

        scanLoopRunning = false;
        scanning = false;
        cameraOpening = false;

        lastDetectedNumber = "";
        consecutiveMatches = 0;

        if (cameraStream) {

            cameraStream.getTracks().forEach(track => {
                track.stop();
            });

            cameraStream = null;
        }

        vehicleCamera.srcObject = null;

        cameraPanel.classList.add("hidden");

        openCameraBtn.disabled = false;
        openPhotoBtn.disabled = false;
        captureScanBtn.disabled = false;
    }


    /* =====================================================
       DETECTION CONFIRMATION
    ===================================================== */

    function confirmDetection(number, confidence) {

        if (
            !number ||
            confidence < CONFIG.minimumConfidence
        ) {
            lastDetectedNumber = "";
            consecutiveMatches = 0;
            return false;
        }

        if (number === lastDetectedNumber) {
            consecutiveMatches++;
        } else {
            lastDetectedNumber = number;
            consecutiveMatches = 1;
        }

        showStatus(
            "Detected " + number +
            " — confirming " +
            consecutiveMatches + "/" +
            CONFIG.requiredMatches
        );

        if (
            consecutiveMatches <
            CONFIG.requiredMatches
        ) {
            return false;
        }

        fillVehicleNumber(number);

        showStatus(
            "✓ Vehicle number detected: " + number,
            "success"
        );

        stopCamera();

        return true;
    }


    /* =====================================================
       AUTOMATIC CAMERA SCANNING
    ===================================================== */

    async function automaticScan(session) {

        if (scanLoopRunning) return;

        scanLoopRunning = true;

        try {

            while (
                cameraStream &&
                session === cameraSession
            ) {

                if (
                    vehicleCamera.readyState >=
                    HTMLMediaElement.HAVE_CURRENT_DATA
                ) {

                    try {

                        scanning = true;

                        const images =
                            prepareCameraImage(vehicleCamera);

                        const result =
                            await recognizePreparedImage(images);

                        if (
                            !cameraStream ||
                            session !== cameraSession
                        ) {
                            break;
                        }

                        if (result.number) {

                            const accepted = confirmDetection(
                                result.number,
                                result.confidence
                            );

                            if (accepted) break;

                        } else {

                            lastDetectedNumber = "";
                            consecutiveMatches = 0;

                            showStatus(
                                "Scanning... Keep the complete plate inside the green frame."
                            );
                        }

                    } catch (error) {

                        console.error(
                            "Camera OCR error:",
                            error
                        );

                        showStatus(
                            "Recognition error. Adjust the camera and try again.",
                            "error"
                        );

                    } finally {

                        scanning = false;
                    }
                }

                await new Promise(resolve =>
                    setTimeout(resolve, CONFIG.scanDelay)
                );
            }

        } finally {

            scanLoopRunning = false;
            scanning = false;
        }
    }


    /* =====================================================
       OPEN CAMERA
    ===================================================== */

    async function openCamera() {

        if (
            cameraOpening ||
            cameraStream
        ) return;

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
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },

                    audio: false
                });

            if (session !== cameraSession) {

                stream.getTracks().forEach(track =>
                    track.stop()
                );

                return;
            }

            cameraStream = stream;

            vehicleCamera.srcObject = stream;

            await vehicleCamera.play();

            // Wait for actual video dimensions.
            if (!vehicleCamera.videoWidth) {

                await new Promise(resolve => {
                    vehicleCamera.addEventListener(
                        "loadedmetadata",
                        resolve,
                        { once: true }
                    );
                });
            }

            showStatus(
                "Preparing number recognition..."
            );

            await getOCRWorker();

            if (
                !cameraStream ||
                session !== cameraSession
            ) return;

            cameraOpening = false;

            showStatus(
                "Scanning automatically. Keep the plate inside the green frame."
            );

            automaticScan(session);

        } catch (error) {

            console.error("Camera error:", error);

            if (session === cameraSession) {

                stopCamera();

                showStatus(
                    "Unable to start camera. Check permission and internet connection.",
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


    /* =====================================================
       MANUAL CAPTURE
    ===================================================== */

    async function captureAndScan() {

        if (
            !cameraStream ||
            scanning ||
            !vehicleCamera.videoWidth
        ) return;

        scanning = true;
        captureScanBtn.disabled = true;

        try {

            showStatus("Capturing number plate...");

            const images =
                prepareCameraImage(vehicleCamera);

            const result =
                await recognizePreparedImage(images);

            if (
                result.number &&
                result.confidence >= CONFIG.minimumConfidence
            ) {

                fillVehicleNumber(result.number);

                showStatus(
                    "✓ Detected: " + result.number,
                    "success"
                );

                stopCamera();

            } else {

                showStatus(
                    "Unable to read the number. Move closer and improve lighting.",
                    "error"
                );
            }

        } catch (error) {

            console.error(error);

            showStatus(
                "Image processing failed.",
                "error"
            );

        } finally {

            scanning = false;
            captureScanBtn.disabled = false;
        }
    }


    /* =====================================================
       PHOTO SCANNING
    ===================================================== */

    async function scanPhoto(file) {

        if (scanning) return;

        if (!file || !file.type.startsWith("image/")) {

            showStatus(
                "Please select a valid photo.",
                "error"
            );

            return;
        }

        scanning = true;
        openPhotoBtn.disabled = true;
        openCameraBtn.disabled = true;

        const imageURL = URL.createObjectURL(file);

        try {

            showStatus("Opening photo...");

            const image = new Image();

            await new Promise((resolve, reject) => {

                image.onload = resolve;
                image.onerror = reject;
                image.src = imageURL;

            });

            showStatus("Enhancing vehicle number image...");

            const images = preparePhotoImage(image);

            showStatus("Recognising vehicle number...");

            const result =
                await recognizePreparedImage(images);

            console.log(
                "Photo OCR:",
                result.number,
                "Confidence:",
                result.confidence
            );

            if (
                result.number &&
                result.confidence >= CONFIG.minimumConfidence
            ) {

                fillVehicleNumber(result.number);

                showStatus(
                    "✓ Vehicle number detected: " + result.number,
                    "success"
                );

            } else {

                showStatus(
                    "Number not recognised. Try a closer, clearer photo.",
                    "error"
                );
            }

        } catch (error) {

            console.error("Photo OCR error:", error);

            showStatus(
                "Unable to process this photo.",
                "error"
            );

        } finally {

            URL.revokeObjectURL(imageURL);

            scanning = false;

            openPhotoBtn.disabled = false;
            openCameraBtn.disabled = false;

            vehiclePhotoInput.value = "";
        }
    }


    /* =====================================================
       PHOTO PICKER
    ===================================================== */

    function openPhotoPicker() {

        if (scanning) return;

        if (cameraStream || cameraOpening) {
            stopCamera();
        }

        vehiclePhotoInput.click();
    }


    /* =====================================================
       EVENT LISTENERS
    ===================================================== */

    openCameraBtn.addEventListener(
        "click",
        openCamera
    );

    openPhotoBtn.addEventListener(
        "click",
        openPhotoPicker
    );

    closeCameraBtn.addEventListener(
        "click",
        stopCamera
    );

    captureScanBtn.addEventListener(
        "click",
        captureAndScan
    );

    vehiclePhotoInput.addEventListener(
        "change",
        async event => {

            const file = event.target.files?.[0];

            if (file) {
                await scanPhoto(file);
            }
        }
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


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    hideStatus();

    console.log(
        "Murgabani improved vehicle scanner initialized."
    );

});
