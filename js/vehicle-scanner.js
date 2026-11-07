
/* =========================================================
   MURGABANI 1 TO 100 CLUB
   VEHICLE NUMBER SCANNER — OPTIMIZED VERSION

   Features:
   1. Live camera popup
   2. Automatic continuous number detection
   3. Cropped camera-frame OCR
   4. Persistent Tesseract OCR worker
   5. Repeated detection confirmation
   6. Photo upload / camera photo OCR
   7. Automatic vehicle number input
   8. Existing Search and Save logic preserved
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    /* =====================================================
       1. DOM ELEMENTS
    ===================================================== */

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
        !vehicleNo ||
        !openCameraBtn ||
        !openPhotoBtn ||
        !cameraPanel ||
        !vehicleCamera ||
        !captureScanBtn ||
        !closeCameraBtn ||
        !vehiclePhotoInput ||
        !scannerStatus
    ) {

        console.error(
            "Vehicle Scanner: Required HTML elements are missing."
        );

        return;

    }


    /* =====================================================
       2. CONFIGURATION
    ===================================================== */

    const CONFIG = {

        // Delay after each camera OCR operation.
        scanDelay: 250,

        // Require repeated matching detections.
        requiredMatches: 2,

        // Minimum OCR confidence.
        minimumConfidence: 40,

        // Maximum camera OCR image width.
        cameraImageWidth: 1400,

        // Maximum photo OCR image width.
        photoImageWidth: 1800,

        // Camera crop dimensions.
        cropWidthRatio: 0.94,
        cropHeightRatio: 0.45,

        // Camera crop vertical position.
        cropVerticalPosition: 0.50

    };


    /* =====================================================
       3. STATE
    ===================================================== */

    let cameraStream = null;

    let worker = null;
    let workerPromise = null;

    let scanning = false;
    let cameraOpening = false;

    let cameraSession = 0;

    let scanLoopRunning = false;

    let lastDetectedNumber = "";
    let consecutiveMatches = 0;

    let currentOperation = null;


    /* =====================================================
       4. STATUS MESSAGE
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

        scannerStatus.className =
            "scanner-status hidden";

    }


    /* =====================================================
       5. VALIDATE VEHICLE NUMBER
    ===================================================== */

    function extractVehicleNumber(text) {

        const cleaned = String(text || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

        const regex =
            /[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}/g;

        const matches = cleaned.match(regex);

        if (!matches || !matches.length) {

            return "";

        }

        return matches[0];

    }


    /* =====================================================
       6. LOAD OCR WORKER ONCE
    ===================================================== */

    async function getOCRWorker() {

        if (!window.Tesseract) {

            throw new Error(
                "Tesseract OCR library is not loaded."
            );

        }

        if (worker) {

            return worker;

        }

        if (workerPromise) {

            return workerPromise;

        }

        workerPromise = (async () => {

            showStatus(
                "Preparing scanner for first use..."
            );

            const newWorker =
                await Tesseract.createWorker(
                    "eng",
                    1,
                    {
                        logger: info => {

                            if (
                                info.status === "loading tesseract core"
                            ) {

                                showStatus(
                                    "Loading OCR engine..."
                                );

                            } else if (
                                info.status === "loading language traineddata"
                            ) {

                                showStatus(
                                    "Loading English recognition data..."
                                );

                            }

                        }
                    }
                );

            // Vehicle registration character whitelist.
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
       7. PREPARE IMAGE FOR OCR
    ===================================================== */

    function prepareImage(source, maxWidth, crop = false) {

        const sourceWidth =
            source.videoWidth || source.naturalWidth || source.width;

        const sourceHeight =
            source.videoHeight || source.naturalHeight || source.height;

        if (!sourceWidth || !sourceHeight) {

            throw new Error(
                "Image dimensions are unavailable."
            );

        }

        let sx = 0;
        let sy = 0;

        let sw = sourceWidth;
        let sh = sourceHeight;

        // Crop central camera area.
        if (crop) {

            sw = Math.floor(
                sourceWidth * CONFIG.cropWidthRatio
            );

            sh = Math.floor(
                sourceHeight * CONFIG.cropHeightRatio
            );

            sx = Math.floor(
                (sourceWidth - sw) / 2
            );

            sy = Math.floor(
                sourceHeight * CONFIG.cropVerticalPosition -
                sh / 2
            );

            sy = Math.max(
                0,
                Math.min(sourceHeight - sh, sy)
            );

        }

        const scale = Math.min(
            1.5,
            maxWidth / sw
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(
            1,
            Math.round(sw * scale)
        );

        canvas.height = Math.max(
            1,
            Math.round(sh * scale)
        );

        const context = canvas.getContext("2d", {
            willReadFrequently: true
        });

        if (!context) {

            throw new Error(
                "Unable to prepare image."
            );

        }

        // Improve character contrast.
        context.filter = "grayscale(1) contrast(1.5)";

        context.drawImage(
            source,
            sx,
            sy,
            sw,
            sh,
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.filter = "none";

        return canvas;

    }


    /* =====================================================
       8. OCR IMAGE
    ===================================================== */

    async function recognizeImage(source, isCamera = false) {

        const ocrWorker = await getOCRWorker();

        const canvas = prepareImage(
            source,
            isCamera
                ? CONFIG.cameraImageWidth
                : CONFIG.photoImageWidth,
            isCamera
        );

        const result = await ocrWorker.recognize(canvas);

        return {

            text: result?.data?.text || "",

            confidence: Number(
                result?.data?.confidence || 0
            )

        };

    }


    /* =====================================================
       9. FILL VEHICLE NUMBER
    ===================================================== */

    function fillVehicleNumber(number) {

        vehicleNo.value = number;

        // Preserve existing road-collection validation.
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


    /* =====================================================
       10. STOP CAMERA
    ===================================================== */

    function stopCamera() {

        // Invalidate the previous scanning session.
        cameraSession++;

        scanLoopRunning = false;

        scanning = false;

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

        cameraOpening = false;

        openCameraBtn.disabled = false;

        captureScanBtn.disabled = false;

    }


    /* =====================================================
       11. CONFIRM CAMERA DETECTION
    ===================================================== */

    function confirmDetection(number, confidence) {

        if (
            confidence < CONFIG.minimumConfidence
        ) {

            return false;

        }

        if (number === lastDetectedNumber) {

            consecutiveMatches++;

        } else {

            lastDetectedNumber = number;

            consecutiveMatches = 1;

        }

        showStatus(
            "Possible number: " + number +
            " — confirming " +
            consecutiveMatches + "/" +
            CONFIG.requiredMatches
        );

        if (
            consecutiveMatches < CONFIG.requiredMatches
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
       12. AUTOMATIC CAMERA SCANNING
    ===================================================== */

    async function automaticScan(session) {

        if (
            scanLoopRunning ||
            !cameraStream
        ) {

            return;

        }

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

                        const result = await recognizeImage(
                            vehicleCamera,
                            true
                        );

                        // Ignore results from a closed camera.
                        if (
                            !cameraStream ||
                            session !== cameraSession
                        ) {

                            break;

                        }

                        const number =
                            extractVehicleNumber(result.text);

                        if (number) {

                            const accepted = confirmDetection(
                                number,
                                result.confidence
                            );

                            if (accepted) {

                                break;

                            }

                        } else {

                            lastDetectedNumber = "";
                            consecutiveMatches = 0;

                            showStatus(
                                "Scanning... Keep the number plate inside the frame."
                            );

                        }

                    } catch (error) {

                        console.error(
                            "Automatic OCR error:",
                            error
                        );

                        showStatus(
                            "Scanning paused. Adjust the camera and try again.",
                            "error"
                        );

                        await new Promise(resolve =>
                            setTimeout(resolve, 700)
                        );

                    }

                }

                await new Promise(resolve =>
                    setTimeout(resolve, CONFIG.scanDelay)
                );

            }

        } finally {

            scanLoopRunning = false;

        }

    }


    /* =====================================================
       13. OPEN LIVE CAMERA POPUP
    ===================================================== */

    async function openCamera() {

        if (
            cameraOpening ||
            cameraStream
        ) {

            return;

        }

        if (!navigator.mediaDevices?.getUserMedia) {

            showStatus(
                "Camera access requires HTTPS and a supported browser.",
                "error"
            );

            return;

        }

        cameraOpening = true;

        openCameraBtn.disabled = true;

        cameraPanel.classList.remove("hidden");

        showStatus(
            "Opening camera..."
        );

        const session = ++cameraSession;

        try {

            // Initialize camera.
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

            // User may have closed the popup while permission was pending.
            if (session !== cameraSession) {

                stream.getTracks().forEach(track =>
                    track.stop()
                );

                return;

            }

            cameraStream = stream;

            vehicleCamera.srcObject = stream;

            await vehicleCamera.play();

            showStatus(
                "Preparing automatic number recognition..."
            );

            // Reuse the same OCR worker for every frame.
            await getOCRWorker();

            if (
                !cameraStream ||
                session !== cameraSession
            ) {

                return;

            }

            cameraOpening = false;

            showStatus(
                "Scanning automatically. Position the plate inside the frame."
            );

            automaticScan(session);

        } catch (error) {

            console.error(
                "Camera initialization error:",
                error
            );

            if (session === cameraSession) {

                stopCamera();

                showStatus(
                    "Unable to start scanner. Check camera permission and internet connection.",
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
       14. MANUAL CAPTURE FALLBACK
    ===================================================== */

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

        try {

            showStatus(
                "Capturing vehicle number..."
            );

            const result = await recognizeImage(
                vehicleCamera,
                true
            );

            const number =
                extractVehicleNumber(result.text);

            if (
                number &&
                result.confidence >= CONFIG.minimumConfidence
            ) {

                fillVehicleNumber(number);

                showStatus(
                    "✓ Detected: " + number,
                    "success"
                );

                stopCamera();

            } else {

                showStatus(
                    "Number not recognised. Move closer and keep the plate in the frame.",
                    "error"
                );

            }

        } catch (error) {

            console.error(
                "Manual capture error:",
                error
            );

            showStatus(
                "Unable to process the camera image.",
                "error"
            );

        } finally {

            scanning = false;

            captureScanBtn.disabled = false;

        }

    }


    /* =====================================================
       15. PHOTO OCR
    ===================================================== */

    async function scanPhoto(file) {

        if (scanning) return;

        if (!file || !file.type.startsWith("image/")) {

            showStatus(
                "Please select a valid image.",
                "error"
            );

            return;

        }

        scanning = true;

        openPhotoBtn.disabled = true;

        openCameraBtn.disabled = true;

        try {

            showStatus(
                "Preparing photo..."
            );

            const imageURL =
                URL.createObjectURL(file);

            try {

                const image = new Image();

                await new Promise((resolve, reject) => {

                    image.onload = resolve;

                    image.onerror = reject;

                    image.src = imageURL;

                });

                showStatus(
                    "Reading vehicle number from photo..."
                );

                const result = await recognizeImage(
                    image,
                    false
                );

                console.log(
                    "Photo OCR:",
                    result.text,
                    "Confidence:",
                    result.confidence
                );

                const number =
                    extractVehicleNumber(result.text);

                if (
                    number &&
                    result.confidence >= CONFIG.minimumConfidence
                ) {

                    fillVehicleNumber(number);

                    showStatus(
                        "✓ Vehicle number detected: " + number,
                        "success"
                    );

                } else {

                    showStatus(
                        "Number not recognised. Select a clearer photo with the complete plate visible.",
                        "error"
                    );

                }

            } finally {

                URL.revokeObjectURL(imageURL);

            }

        } catch (error) {

            console.error(
                "Photo OCR error:",
                error
            );

            showStatus(
                "Unable to read the photo. Please try another image.",
                "error"
            );

        } finally {

            scanning = false;

            openPhotoBtn.disabled = false;

            openCameraBtn.disabled = false;

            vehiclePhotoInput.value = "";

        }

    }


    /* =====================================================
       16. OPEN PHOTO PICKER
    ===================================================== */

    function openPhotoPicker() {

        if (scanning) return;

        // Stop the live camera before opening the photo picker.
        if (cameraStream) {

            stopCamera();

        }

        vehiclePhotoInput.click();

    }


    /* =====================================================
       17. EVENT LISTENERS
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

            const file =
                event.target.files?.[0];

            if (!file) return;

            await scanPhoto(file);

        }
    );


    // Close popup when clicking outside its content.
    cameraPanel.addEventListener(
        "click",
        event => {

            if (event.target === cameraPanel) {

                stopCamera();

            }

        }
    );


    // Close popup using Escape key.
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


    // Release camera when leaving the page.
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
       18. INITIALIZATION
    ===================================================== */

    hideStatus();

    console.log(
        "Murgabani Vehicle Scanner initialized."
    );

});
