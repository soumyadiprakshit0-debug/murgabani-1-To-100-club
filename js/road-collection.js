
/* =========================================================
   MURGABANI 1 TO 100 CLUB
   ROAD COLLECTION — OPTIMIZED VERSION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =====================================================
       1. CONFIGURATION
       ===================================================== */

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const ALLOWED_PUJA = "Saraswati puja";

    const VEHICLE_REGEX =
        /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;


    /* =====================================================
       2. DOM ELEMENTS
       ===================================================== */

    const $ = id => document.getElementById(id);

    const vehicleNo = $("vehicleNo");
    const searchBtn = $("searchBtn");
    const loading = $("loading");

    const alreadyCollected = $("alreadyCollected");
    const collectionForm = $("collectionForm");
    const message = $("message");

    const aVehicle = $("aVehicle");
    const aType = $("aType");
    const aAmount = $("aAmount");
    const aCollector = $("aCollector");
    const aDate = $("aDate");

    const date = $("date");
    const vehicleType = $("vehicleType");
    const amount = $("amount");

    const saveBtn = $("saveBtn");
    const searchAgainBtn = $("searchAgainBtn");

    const mCollectionId = $("mCollectionId");
    const mVehicle = $("mVehicle");
    const mAmount = $("mAmount");

    const nextBtn = $("nextBtn");
    const backDashboardBtn = $("backDashboardBtn");


    /* =====================================================
       3. REQUIRED ELEMENT CHECK
       ===================================================== */

    if (!vehicleNo || !searchBtn) {
        console.error(
            "Road Collection: vehicleNo or searchBtn is missing."
        );

        document.body.insertAdjacentHTML(
            "afterbegin",
            '<p style="padding:15px;color:#b91c1c;text-align:center">' +
            'Road Collection could not initialize. Required HTML elements are missing.' +
            '</p>'
        );

        return;
    }


    /* =====================================================
       4. DASHBOARD CONTEXT
       ===================================================== */

    const pageParams =
        new URLSearchParams(window.location.search);

    const selectedYear =
        pageParams.get("year") ||
        sessionStorage.getItem("selectedYear") ||
        "";

    const selectedPuja =
        pageParams.get("puja") ||
        sessionStorage.getItem("selectedPuja") ||
        "";

    const roadCollectionAllowed =
        selectedPuja.trim().toLowerCase() ===
        ALLOWED_PUJA.toLowerCase();


    /* =====================================================
       5. STATE
       ===================================================== */

    let searchRunning = false;
    let saveRunning = false;

    let searchController = null;
    let searchRequestId = 0;

    let currentVehicleNumber = "";
    let vehicleVerified = false;


    /* =====================================================
       6. INDIA DATE
       ===================================================== */

    function getIndiaDate() {

        const parts = new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).formatToParts(new Date());

        const result = {};

        parts.forEach(part => {
            result[part.type] = part.value;
        });

        return {
            year: Number(result.year),
            month: Number(result.month),
            day: Number(result.day)
        };
    }


    function today() {

        const d = getIndiaDate();

        return (
            d.year + "-" +
            String(d.month).padStart(2, "0") + "-" +
            String(d.day).padStart(2, "0")
        );
    }


    /* =====================================================
       7. FORMAT HELPERS
       ===================================================== */

    function formatVehicleNo(value) {

        return String(value || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
    }


    function isValidVehicleNo(number) {

        return VEHICLE_REGEX.test(number);
    }


    function formatCurrency(value) {

        const number = Number(value) || 0;

        return "₹" + number.toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });
    }


    function formatDate(value) {

        if (!value) return "—";

        // Google Sheets may return a date string or ISO string.
        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) {
            return String(value);
        }

        return parsed.toLocaleDateString(
            "en-IN",
            {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }


    /* =====================================================
       8. PREMIUM ALERT SYSTEM
       ===================================================== */

    function addAlertStyles() {

        if ($("roadPremiumAlertStyles")) return;

        const style = document.createElement("style");

        style.id = "roadPremiumAlertStyles";

        style.textContent = `
            .road-alert-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 18px;
                background: rgba(10, 18, 35, .65);
                backdrop-filter: blur(5px);
                animation: roadFadeIn .2s ease;
            }

            .road-alert-box {
                width: 100%;
                max-width: 390px;
                padding: 27px 23px;
                border-radius: 20px;
                background: #fff;
                text-align: center;
                box-shadow: 0 18px 55px rgba(0,0,0,.22);
                animation: roadAlertIn .25s ease;
                font-family: inherit;
            }

            .road-alert-icon {
                width: 68px;
                height: 68px;
                margin: 0 auto 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: 32px;
                background: #eff6ff;
            }

            .road-alert-box.error .road-alert-icon {
                background: #fee2e2;
            }

            .road-alert-box.success .road-alert-icon {
                background: #dcfce7;
            }

            .road-alert-box.warning .road-alert-icon {
                background: #fef3c7;
            }

            .road-alert-box.info .road-alert-icon {
                background: #dbeafe;
            }

            .road-alert-box h2 {
                margin: 0 0 10px;
                color: #172033;
                font-size: 21px;
                font-weight: 750;
            }

            .road-alert-box p {
                margin: 0;
                color: #64748b;
                font-size: 14px;
                line-height: 1.65;
                white-space: pre-line;
                overflow-wrap: anywhere;
            }

            .road-alert-box button {
                width: 100%;
                margin-top: 23px;
                padding: 13px 18px;
                border: 0;
                border-radius: 11px;
                background: #1d4ed8;
                color: #fff;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
            }

            .road-alert-box button:active {
                transform: scale(.98);
            }

            @keyframes roadFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes roadAlertIn {
                from {
                    opacity: 0;
                    transform: translateY(12px) scale(.96);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            #roadRestrictionMessage {
                margin: 20px auto;
                padding: 18px;
                max-width: 700px;
                border-radius: 12px;
                background: #fff1f0;
                border: 1px solid #f5b7b1;
                color: #a93226;
                text-align: center;
                font-size: 16px;
                font-weight: 600;
                line-height: 1.6;
            }
        `;

        document.head.appendChild(style);
    }


    function showAlert(
        icon,
        title,
        alertMessage,
        type = "error"
    ) {

        addAlertStyles();

        const oldAlert = $("roadPremiumAlert");

        if (oldAlert) oldAlert.remove();

        const overlay = document.createElement("div");

        overlay.id = "roadPremiumAlert";
        overlay.className = "road-alert-overlay";

        const box = document.createElement("div");

        box.className = "road-alert-box " + type;

        const iconElement = document.createElement("div");

        iconElement.className = "road-alert-icon";
        iconElement.textContent = icon;

        const heading = document.createElement("h2");

        heading.textContent = title;

        const paragraph = document.createElement("p");

        paragraph.textContent = alertMessage;

        const button = document.createElement("button");

        button.type = "button";
        button.textContent = "OK";

        button.addEventListener("click", () => {
            overlay.remove();
        });

        box.append(
            iconElement,
            heading,
            paragraph,
            button
        );

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        button.focus();
    }


    /* =====================================================
       9. LOADING AND RESULT SECTIONS
       ===================================================== */

    function hideAll() {

        [
            alreadyCollected,
            collectionForm,
            message,
            loading
        ].forEach(element => {

            if (element) {
                element.classList.add("hidden");
            }
        });
    }


    function setLoading(show) {

        if (loading) {
            loading.classList.toggle("hidden", !show);
        }
    }


    function setSearchButtonState(isLoading) {

        searchBtn.disabled = isLoading;

        searchBtn.textContent =
            isLoading ? "Searching..." : "Search";
    }


    /* =====================================================
       10. API REQUEST HELPER
       ===================================================== */

    async function fetchAPI(params, signal) {

        const url = new URL(API_URL);

        Object.entries(params).forEach(([key, value]) => {

            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        });

        // Avoid browser/proxy caching of an old search response.
        url.searchParams.set("_request", String(Date.now()));

        const options = {
            method: "GET",
            mode: "cors",
            cache: "no-store",
            redirect: "follow"
        };

        if (signal) {
            options.signal = signal;
        }

        const response = await fetch(
            url.toString(),
            options
        );

        if (!response.ok) {
            throw new Error(
                "The Apps Script server returned HTTP " +
                response.status + "."
            );
        }

        const responseText = await response.text();

        let result;

        try {
            result = JSON.parse(responseText);
        } catch (error) {

            console.error(
                "Unexpected Apps Script response:",
                responseText.slice(0, 500)
            );

            throw new Error(
                "The server did not return valid JSON. " +
                "Check your Apps Script deployment and API response."
            );
        }

        if (!result || typeof result !== "object") {
            throw new Error("Invalid response received from server.");
        }

        return result;
    }


    /* =====================================================
       11. SESSION DETAILS
       ===================================================== */

    function getCollectorDetails() {

        return {
            collectorId: String(
                sessionStorage.getItem("memberId") || ""
            ).trim(),

            collectorName: String(
                sessionStorage.getItem("memberName") || ""
            ).trim()
        };
    }


    /* =====================================================
       12. NAVIGATION
       ===================================================== */

    function navigateTo(page) {

        const url = new URL(
            page,
            window.location.href
        );

        url.searchParams.set("_", Date.now());

        window.location.replace(url.href);
    }


    if (backDashboardBtn) {

        backDashboardBtn.addEventListener("click", () => {

            const returnDashboard =
                sessionStorage.getItem("returnDashboard");

            const allowedPages = [
                "admin-dashboard.html",
                "member-dashboard.html"
            ];

            const destination =
                allowedPages.includes(returnDashboard)
                    ? returnDashboard
                    : "member-dashboard.html";

            navigateTo(destination);
        });
    }


    /* =====================================================
       13. PUJA RESTRICTION
       ===================================================== */

    function showRestrictionMessage() {

        addAlertStyles();

        let restriction = $("roadRestrictionMessage");

        if (!restriction) {

            restriction = document.createElement("div");

            restriction.id = "roadRestrictionMessage";

            const topbar = document.querySelector(".topbar");

            if (topbar) {
                topbar.insertAdjacentElement(
                    "afterend",
                    restriction
                );
            } else {
                document.body.prepend(restriction);
            }
        }

        restriction.textContent =
            "Road Collection is available only during Saraswati Puja. " +
            "Selected Puja: " + (selectedPuja || "Not selected") + ".";

        restriction.classList.remove("hidden");

        hideAll();

        [
            vehicleNo,
            searchBtn,
            vehicleType,
            amount,
            date,
            saveBtn
        ].forEach(element => {

            if (element) element.disabled = true;
        });
    }


    /* =====================================================
       14. SEARCH PARAMETERS
       ===================================================== */

    function buildSearchParams(number) {

        return {
            action: "searchVehicle",
            vehicleNo: number,
            year: selectedYear,
            puja: selectedPuja
        };
    }


    /* =====================================================
       15. SAVE PARAMETERS
       ===================================================== */

    function buildSaveParams(number) {

        const collector = getCollectorDetails();

        return {
            action: "saveRoadCollection",
            date: date.value,
            year: selectedYear,
            vehicleNo: number,
            vehicleType: vehicleType.value,
            puja: selectedPuja,
            amount: amount.value,
            collectorId: collector.collectorId,
            collectorName: collector.collectorName
        };
    }


    /* =====================================================
       16. DISPLAY ALREADY COLLECTED VEHICLE
       ===================================================== */

    function showAlreadyCollected(result, number) {

        if (aVehicle) {
            aVehicle.textContent =
                result.vehicleNo || number;
        }

        if (aType) {
            aType.textContent =
                result.vehicleType || "—";
        }

        if (aAmount) {
            aAmount.textContent =
                formatCurrency(result.amount);
        }

        if (aCollector) {
            aCollector.textContent =
                result.collectorName || "—";
        }

        if (aDate) {
            aDate.textContent =
                formatDate(result.date);
        }

        if (alreadyCollected) {
            alreadyCollected.classList.remove("hidden");
        }

        showAlert(
            "ℹ️",
            "Already Collected",
            "This vehicle has already been recorded for " +
            selectedYear + " — " + selectedPuja + ".",
            "info"
        );
    }


    /* =====================================================
       17. SEARCH VEHICLE
       ===================================================== */

    async function searchVehicle() {

        if (!roadCollectionAllowed) {
            showRestrictionMessage();
            return;
        }

        if (searchRunning || saveRunning) return;

        const number = formatVehicleNo(vehicleNo.value);

        if (!number) {

            showAlert(
                "🚗",
                "Vehicle Number Required",
                "Please enter a vehicle registration number."
            );

            vehicleNo.focus();
            return;
        }

        if (!isValidVehicleNo(number)) {

            showAlert(
                "🚗",
                "Invalid Vehicle Number",
                "Please enter a valid vehicle number.\n\nExample: WB68A1234"
            );

            vehicleNo.focus();
            return;
        }

        vehicleNo.value = number;

        searchRunning = true;

        vehicleVerified = false;
        currentVehicleNumber = "";

        const requestId = ++searchRequestId;

        if (searchController) {
            searchController.abort();
        }

        searchController = new AbortController();

        setSearchButtonState(true);

        hideAll();
        setLoading(true);

        try {

            const result = await fetchAPI(
                buildSearchParams(number),
                searchController.signal
            );

            // Ignore responses belonging to an older search.
            if (requestId !== searchRequestId) return;

            if (result.success !== true) {

                throw new Error(
                    result.message ||
                    "The server could not complete the vehicle search."
                );
            }

            // VEHICLE ALREADY COLLECTED
            if (result.found === true) {

                showAlreadyCollected(result, number);

                return;
            }

            // VEHICLE NOT YET COLLECTED
            vehicleVerified = true;
            currentVehicleNumber = number;

            if (vehicleType) {
                vehicleType.value =
                    result.vehicleType || "";
            }

            if (amount) {
                amount.value = "";
            }

            if (date) {
                date.value = today();
            }

            if (collectionForm) {
                collectionForm.classList.remove("hidden");
            }

            if (result.vehicleType) {

                showAlert(
                    "✅",
                    "Vehicle Found",
                    "Vehicle details found. You can now enter the collection amount.",
                    "success"
                );

            } else {

                showAlert(
                    "🚗",
                    "New Vehicle",
                    "This vehicle is not in the vehicle master. Select its type and enter the collection amount.",
                    "info"
                );
            }

        } catch (error) {

            if (error.name === "AbortError") return;

            console.error(
                "Road Collection search error:",
                error
            );

            showAlert(
                "⚠️",
                "Vehicle Search Failed",
                error.message ||
                "Unable to connect to the club database. Please try again."
            );

        } finally {

            if (requestId === searchRequestId) {

                searchRunning = false;
                searchController = null;

                setLoading(false);
                setSearchButtonState(false);
            }
        }
    }


    /* =====================================================
       18. SAVE ROAD COLLECTION
       ===================================================== */

    async function saveCollection() {

        if (!roadCollectionAllowed) {
            showRestrictionMessage();
            return;
        }

        if (saveRunning || searchRunning) return;

        const number = formatVehicleNo(vehicleNo.value);

        if (!number || !isValidVehicleNo(number)) {

            showAlert(
                "🚗",
                "Invalid Vehicle Number",
                "Please enter a valid vehicle registration number."
            );

            vehicleNo.focus();
            return;
        }

        if (!vehicleVerified || number !== currentVehicleNumber) {

            showAlert(
                "⚠️",
                "Vehicle Not Verified",
                "Please search this vehicle again before saving."
            );

            return;
        }

        if (!vehicleType || !vehicleType.value.trim()) {

            showAlert(
                "⚠️",
                "Vehicle Type Required",
                "Please select a vehicle type."
            );

            vehicleType?.focus();
            return;
        }

        const enteredAmount = Number(amount?.value);

        if (
            !amount ||
            amount.value.trim() === "" ||
            !Number.isFinite(enteredAmount) ||
            enteredAmount <= 0
        ) {

            showAlert(
                "⚠️",
                "Invalid Amount",
                "Enter a valid collection amount greater than zero."
            );

            amount?.focus();
            return;
        }

        if (!date || !date.value) {

            showAlert(
                "⚠️",
                "Date Required",
                "Please select the collection date."
            );

            date?.focus();
            return;
        }

        const collector = getCollectorDetails();

        if (!collector.collectorId || !collector.collectorName) {

            showAlert(
                "⚠️",
                "Login Information Missing",
                "Your collector details are unavailable. Please log in again."
            );

            return;
        }

        saveRunning = true;

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        try {

            /*
             * Do not abort a save request.
             * The server might complete the transaction
             * even if the browser stops waiting.
             */

            const result = await fetchAPI(
                buildSaveParams(number)
            );

            if (result.success !== true) {

                if (result.duplicate) {

                    showAlert(
                        "ℹ️",
                        "Already Collected",
                        result.message ||
                        "This vehicle has already been recorded.",
                        "info"
                    );

                } else {

                    showAlert(
                        "⚠️",
                        "Collection Not Saved",
                        result.message ||
                        "The server could not save this collection."
                    );
                }

                return;
            }

            vehicleVerified = false;

            hideAll();

            if (mCollectionId) {
                mCollectionId.textContent =
                    result.collectionId || "Saved";
            }

            if (mVehicle) {
                mVehicle.textContent = number;
            }

            if (mAmount) {
                mAmount.textContent =
                    formatCurrency(enteredAmount);
            }

            if (message) {
                message.classList.remove("hidden");
            }

            showAlert(
                "✅",
                "Collection Saved Successfully",
                "Vehicle: " + number +
                "\nAmount: " + formatCurrency(enteredAmount) +
                "\nCollection ID: " +
                (result.collectionId || "Generated") +
                "\n\nThe collection has been recorded.",
                "success"
            );

        } catch (error) {

            console.error(
                "Road Collection save error:",
                error
            );

            showAlert(
                "⚠️",
                "Save Status Unconfirmed",
                "The server response could not be received.\n\n" +
                "Do not submit again immediately. Search this vehicle " +
                "to check whether the collection was recorded."
            );

        } finally {

            saveRunning = false;

            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = "Save Collection";
            }
        }
    }


    /* =====================================================
       19. RESET FORM
       ===================================================== */

    function resetForm() {

        if (searchController) {
            searchController.abort();
            searchController = null;
        }

        searchRequestId++;

        searchRunning = false;
        vehicleVerified = false;
        currentVehicleNumber = "";

        if (vehicleNo) {
            vehicleNo.value = "";
            vehicleNo.disabled = false;
        }

        if (vehicleType) {
            vehicleType.value = "";
            vehicleType.disabled = false;
        }

        if (amount) {
            amount.value = "";
            amount.disabled = false;
        }

        if (date) {
            date.value = today();
            date.disabled = false;
        }

        hideAll();

        setSearchButtonState(false);

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Collection";
        }

        if (roadCollectionAllowed) {
            requestAnimationFrame(() => vehicleNo.focus());
        }
    }


    /* =====================================================
       20. EVENT LISTENERS
       ===================================================== */

    searchBtn.addEventListener(
        "click",
        searchVehicle
    );

    searchAgainBtn?.addEventListener(
        "click",
        resetForm
    );

    saveBtn?.addEventListener(
        "click",
        saveCollection
    );

    nextBtn?.addEventListener(
        "click",
        resetForm
    );

    vehicleNo.addEventListener("keydown", event => {

        if (event.key === "Enter") {

            event.preventDefault();

            if (!searchRunning && !saveRunning) {
                searchVehicle();
            }
        }
    });

    vehicleNo.addEventListener("blur", () => {

        vehicleNo.value =
            formatVehicleNo(vehicleNo.value);
    });

    // Editing the vehicle number invalidates the previous search.
    vehicleNo.addEventListener("input", () => {

        vehicleVerified = false;
        currentVehicleNumber = "";
    });


    /* =====================================================
       21. PAGE INITIALIZATION
       ===================================================== */

    addAlertStyles();

    hideAll();

    if (date) {
        date.value = today();
    }

    vehicleNo.setAttribute("autocomplete", "off");
    vehicleNo.setAttribute("spellcheck", "false");

    // Preserve the dashboard filters.
    if (selectedYear) {
        sessionStorage.setItem("selectedYear", selectedYear);
    }

    if (selectedPuja) {
        sessionStorage.setItem("selectedPuja", selectedPuja);
    }

    // Validate year.
    if (!/^\d{4}$/.test(selectedYear)) {

        showAlert(
            "⚠️",
            "Year Not Selected",
            "Please return to your dashboard and select a valid year."
        );

        vehicleNo.disabled = true;
        searchBtn.disabled = true;

        return;
    }

    // Validate Puja.
    if (!selectedPuja) {

        showAlert(
            "⚠️",
            "Puja Not Selected",
            "Please return to your dashboard and select a Puja."
        );

        vehicleNo.disabled = true;
        searchBtn.disabled = true;

        return;
    }

    // Restrict Road Collection during Laxmi Puja.
    if (!roadCollectionAllowed) {

        showRestrictionMessage();

        return;
    }

    vehicleNo.disabled = false;
    searchBtn.disabled = false;

    requestAnimationFrame(() => {
        vehicleNo.focus();
    });

    console.log(
        "Road Collection initialized:",
        selectedYear,
        selectedPuja
    );

});
