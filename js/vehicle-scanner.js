
/* =========================================
   MURGABANI 1 TO 100 CLUB
   VEHICLE NUMBER SCANNER
   Live Camera + Photo OCR
========================================= */

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
        !vehicleNo ||
        !openCameraBtn ||
        !openPhotoBtn ||
        !vehicleCamera
    ) {
        console.error("Vehicle scanner: required HTML elements missing.");
        return;
    }

    let cameraStream = null;
    let scanning = false;


    // =====================================
    // STATUS MESSAGE
    // =====================================

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


    // =====================================
    // STOP CAMERA
    // =====================================

    function stopCamera() {

        if (cameraStream) {

            cameraStream.getTracks().forEach(track => {
                track.stop();
            });

            cameraStream = null;

        }

        vehicleCamera.srcObject = null;

        cameraPanel.classList.add("hidden");

    }


    // =====================================
    // OPEN LIVE CAMERA
    // =====================================

    async function openCamera() {

        if (scanning) return;

        if (!navigator.mediaDevices?.getUserMedia) {

            showStatus(
                "Camera access is unavailable. Open the website using HTTPS in a supported browser.",
                "error"
            );

            return;

        }

        try {

            stopCamera();

            hideStatus();

            cameraStream =
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

            vehicleCamera.srcObject = cameraStream;

            cameraPanel.classList.remove("hidden");

            await vehicleCamera.play();

        } catch (error) {

            console.error("Camera error:", error);

            stopCamera();

            showStatus(
                "Unable to open camera. Please allow camera permission and try again.",
                "error"
            );

        }

    }


    // =====================================
    // EXTRACT INDIAN VEHICLE NUMBER
    // =====================================

    function extractVehicleNumber(text) {

        const cleaned = String(text || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

        const regex =
            /[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}/g;

        const matches = cleaned.match(regex);

        if (!matches || matches.length === 0) {
            return "";
        }

        // Return the first valid-looking registration number.
        return matches[0];

    }


    // =====================================
    // OCR PROCESSING
    // =====================================

    async function scanImage(source) {

        if (scanning) return;

        if (!window.Tesseract) {

            showStatus(
                "OCR library could not load. Check your internet connection and reload the page.",
                "error"
            );

            return;

        }

        scanning = true;

        openCameraBtn.disabled = true;
        openPhotoBtn.disabled = true;

        captureScanBtn.disabled = true;

        showStatus(
            "Reading vehicle number... Please wait."
        );

        try {

            const result = await Tesseract.recognize(
                source,
                "eng",
                {
                    logger: info => {

                        if (info.status === "recognizing text") {

                            const percentage =
                                Math.round((info.progress || 0) * 100);

                            showStatus(
                                "Recognising vehicle number... " +
                                percentage + "%"
                            );

                        }

                    }
                }
            );

            const detectedText =
                result?.data?.text || "";

            console.log(
                "Vehicle OCR result:",
                detectedText
            );

            const detectedNumber =
                extractVehicleNumber(detectedText);

            if (!detectedNumber) {

                showStatus(
                    "Vehicle number could not be recognised. Try a clearer, closer and well-lit photo.",
                    "error"
                );

                return;

            }

            // Fill the existing input only.
            // Existing Search button and verification remain unchanged.

            vehicleNo.value = detectedNumber;

            vehicleNo.dispatchEvent(
                new Event("input", {
                    bubbles: true
                })
            );

            vehicleNo.focus();

            showStatus(
                "Detected: " + detectedNumber +
                ". Please verify the number and press Search.",
                "success"
            );

        } catch (error) {

            console.error("OCR error:", error);

            showStatus(
                "Unable to read this image. Please try again.",
                "error"
            );

        } finally {

            scanning = false;

            openCameraBtn.disabled = false;
            openPhotoBtn.disabled = false;

            captureScanBtn.disabled = false;

        }

    }


    // =====================================
    // CAPTURE LIVE CAMERA FRAME
    // =====================================

    async function captureAndScan() {

        if (
            !cameraStream ||
            !vehicleCamera.videoWidth ||
            scanning
        ) {
            return;
        }

        const canvas = document.createElement("canvas");

        canvas.width = vehicleCamera.videoWidth;
        canvas.height = vehicleCamera.videoHeight;

        const context = canvas.getContext("2d");

        context.drawImage(
            vehicleCamera,
            0,
            0,
            canvas.width,
            canvas.height
        );

        await scanImage(canvas);

    }


    // =====================================
    // PHOTO CAPTURE / UPLOAD
    // =====================================

    function openPhotoPicker() {

        if (scanning) return;

        vehiclePhotoInput.click();

    }


    vehiclePhotoInput.addEventListener(
        "change",
        async event => {

            const file = event.target.files?.[0];

            if (!file) return;

            if (!file.type.startsWith("image/")) {

                showStatus(
                    "Please select a valid image.",
                    "error"
                );

                vehiclePhotoInput.value = "";
                return;

            }

            try {

                const imageURL =
                    URL.createObjectURL(file);

                const image = new Image();

                image.onload = async () => {

                    try {

                        await scanImage(image);

                    } finally {

                        URL.revokeObjectURL(imageURL);

                        vehiclePhotoInput.value = "";

                    }

                };

                image.onerror = () => {

                    URL.revokeObjectURL(imageURL);

                    vehiclePhotoInput.value = "";

                    showStatus(
                        "Unable to open the selected photo.",
                        "error"
                    );

                };

                image.src = imageURL;

            } catch (error) {

                console.error(error);

                showStatus(
                    "Photo processing failed.",
                    "error"
                );

            }

        }
    );


    // =====================================
    // EVENT LISTENERS
    // =====================================

    openCameraBtn.addEventListener(
        "click",
        openCamera
    );

    openPhotoBtn.addEventListener(
        "click",
        openPhotoPicker
    );

    captureScanBtn.addEventListener(
        "click",
        captureAndScan
    );

    closeCameraBtn.addEventListener(
        "click",
        stopCamera
    );


    // Release camera when leaving the page.

    window.addEventListener(
        "pagehide",
        stopCamera
    );

});
