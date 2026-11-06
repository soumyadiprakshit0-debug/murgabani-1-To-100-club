
// ==========================================
// MURGABANI 1 TO 100 CLUB
// OPTIMIZED ROAD COLLECTION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    // ======================================
    // CONFIGURATION
    // ======================================

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const ALLOWED_PUJA = "Saraswati puja";

    const VEHICLE_REGEX =
        /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;


    // ======================================
    // DOM ELEMENTS
    // ======================================

    const vehicleNo = document.getElementById("vehicleNo");
    const searchBtn = document.getElementById("searchBtn");
    const loading = document.getElementById("loading");

    const alreadyCollected =
        document.getElementById("alreadyCollected");

    const collectionForm =
        document.getElementById("collectionForm");

    const message = document.getElementById("message");

    const aVehicle = document.getElementById("aVehicle");
    const aType = document.getElementById("aType");
    const aAmount = document.getElementById("aAmount");
    const aCollector = document.getElementById("aCollector");
    const aDate = document.getElementById("aDate");

    const date = document.getElementById("date");
    const vehicleType = document.getElementById("vehicleType");
    const amount = document.getElementById("amount");

    const saveBtn = document.getElementById("saveBtn");
    const searchAgainBtn =
        document.getElementById("searchAgainBtn");

    const mCollectionId =
        document.getElementById("mCollectionId");

    const mVehicle = document.getElementById("mVehicle");
    const mAmount = document.getElementById("mAmount");

    const nextBtn = document.getElementById("nextBtn");

    const backDashboardBtn =
        document.getElementById("backDashboardBtn");


    // ======================================
    // BASIC ELEMENT CHECK
    // ======================================

    if (!vehicleNo || !searchBtn) {

        console.error(
            "Road Collection: required elements are missing."
        );

        return;

    }


    // ======================================
    // PAGE CONTEXT
    // ======================================

    const pageParams =
        new URLSearchParams(window.location.search);

    const savedYear =
        sessionStorage.getItem("selectedYear");

    const savedPuja =
        sessionStorage.getItem("selectedPuja");

    const currentDate = getIndiaDate();

    const currentYear =
        String(currentDate.year);

    const currentDefaultPuja =
        currentDate.month <= 5
            ? "Saraswati puja"
            : "Laxmi puja";

    // URL parameters take priority over session filters.
    const selectedYear =
        pageParams.get("year") ||
        savedYear ||
        currentYear;

    const selectedPuja =
        pageParams.get("puja") ||
        savedPuja ||
        currentDefaultPuja;

    const roadCollectionAllowed =
        selectedPuja === ALLOWED_PUJA;


    // ======================================
    // STATE
    // ======================================

    let searchRunning = false;
    let saveRunning = false;

    let searchController = null;
    let searchRequestId = 0;

    let currentVehicleNumber = "";


    // ======================================
    // INDIA DATE
    // ======================================

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


    // ======================================
    // FORMAT HELPERS
    // ======================================

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

        return "₹" + number.toLocaleString("en-IN");

    }


    function formatDate(value) {

        if (!value) return "";

        // Handle Google Sheets date strings.
        const parsedDate = new Date(value);

        if (Number.isNaN(parsedDate.getTime())) {
            return String(value);
        }

        return parsedDate.toLocaleDateString(
            "en-IN",
            {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    // ======================================
    // NAVIGATION
    // ======================================

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


    // ======================================
    // CUSTOM ALERT
    // ======================================

    function showAlert(
        icon,
        title,
        alertMessage,
        type = "error"
    ) {

        const oldAlert =
            document.getElementById("customAlert");

        if (oldAlert) {
            oldAlert.remove();
        }

        const alertBox =
            document.createElement("div");

        alertBox.id = "customAlert";

        const overlay =
            document.createElement("div");

        overlay.className = "custom-alert-overlay";

        const box =
            document.createElement("div");

        box.className =
            "custom-alert-box " + type;

        const iconElement =
            document.createElement("div");

        iconElement.className = "custom-alert-icon";
        iconElement.textContent = icon;

        const heading =
            document.createElement("h2");

        heading.textContent = title;

        const paragraph =
            document.createElement("p");

        paragraph.textContent = alertMessage;

        const button =
            document.createElement("button");

        button.type = "button";
        button.textContent = "OK";

        button.addEventListener("click", () => {
            alertBox.remove();
        }, { once: true });

        box.append(
            iconElement,
            heading,
            paragraph,
            button
        );

        overlay.appendChild(box);
        alertBox.appendChild(overlay);

        document.body.appendChild(alertBox);

    }


    // ======================================
    // PUJA RESTRICTION MESSAGE
    // ======================================

    function showRestrictionMessage() {

        let restriction =
            document.getElementById("roadRestrictionMessage");

        if (!restriction) {

            restriction =
                document.createElement("div");

            restriction.id =
                "roadRestrictionMessage";

            restriction.style.cssText = `
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
            `;

            const topbar =
                document.querySelector(".topbar");

            if (topbar && topbar.parentNode) {
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
            "Selected Puja: " + selectedPuja + ".";

        restriction.classList.remove("hidden");

        hideAll();

        if (vehicleNo) vehicleNo.disabled = true;
        if (searchBtn) searchBtn.disabled = true;
        if (vehicleType) vehicleType.disabled = true;
        if (amount) amount.disabled = true;
        if (date) date.disabled = true;
        if (saveBtn) saveBtn.disabled = true;

    }


    // ======================================
    // HIDE ALL RESULT SECTIONS
    // ======================================

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


    // ======================================
    // LOADING
    // ======================================

    function setLoading(isLoading) {

        if (loading) {
            loading.classList.toggle(
                "hidden",
                !isLoading
            );
        }

    }


    // ======================================
    // API REQUEST HELPER
    // ======================================

    async function fetchAPI(params, signal) {

        const url = new URL(API_URL);

        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });

        const options = {
            method: "GET",
            cache: "no-store"
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
                "Server error (" + response.status + ")"
            );

        }

        return await response.json();

    }


    // ======================================
    // RESET FORM
    // ======================================

    function resetForm() {

        // Cancel only a search request.
        if (searchController) {
            searchController.abort();
            searchController = null;
        }

        searchRequestId++;

        searchRunning = false;

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

        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = "Search";
        }

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Collection";
        }

        if (roadCollectionAllowed) {

            requestAnimationFrame(() => {
                vehicleNo.focus();
            });

        }

    }


    // ======================================
    // BUILD SEARCH PARAMETERS
    // ======================================

    function buildSearchParams(number) {

        return {
            action: "searchVehicle",
            vehicleNo: number,
            year: selectedYear,
            puja: selectedPuja
        };

    }


    // ======================================
    // GET AUTHENTICATED COLLECTOR
    // ======================================

    function getCollectorDetails() {

        return {
            collectorId:
                String(
                    sessionStorage.getItem("memberId") || ""
                ).trim(),

            collectorName:
                String(
                    sessionStorage.getItem("memberName") || ""
                ).trim()
        };

    }


    // ======================================
    // BUILD SAVE PARAMETERS
    // ======================================

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


    // ======================================
    // SEARCH VEHICLE
    // ======================================

    async function searchVehicle() {

        if (!roadCollectionAllowed) {
            showRestrictionMessage();
            return;
        }

        if (searchRunning || saveRunning) {
            return;
        }

        const number =
            formatVehicleNo(vehicleNo.value);

        if (!number) {

            showAlert(
                "🚗",
                "Vehicle Number Required",
                "Please enter a vehicle number."
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

        currentVehicleNumber = number;

        searchRunning = true;

        const requestId = ++searchRequestId;

        searchBtn.disabled = true;
        searchBtn.textContent = "Searching...";

        hideAll();
        setLoading(true);

        if (searchController) {
            searchController.abort();
        }

        searchController = new AbortController();

        try {

            const result = await fetchAPI(
                buildSearchParams(number),
                searchController.signal
            );

            // Ignore stale responses.
            if (requestId !== searchRequestId) {
                return;
            }

            if (!result || !result.success) {

                throw new Error(
                    result?.message || "Vehicle search failed."
                );

            }

            // ----------------------------------
            // VEHICLE ALREADY COLLECTED
            // ----------------------------------

            if (result.found) {

                if (aVehicle) {
                    aVehicle.textContent =
                        result.vehicleNo || number;
                }

                if (aType) {
                    aType.textContent =
                        result.vehicleType || "";
                }

                if (aAmount) {
                    aAmount.textContent =
                        formatCurrency(result.amount);
                }

                if (aCollector) {
                    aCollector.textContent =
                        result.collectorName || "";
                }

                if (aDate) {
                    aDate.textContent =
                        formatDate(result.date);
                }

                if (alreadyCollected) {
                    alreadyCollected.classList.remove("hidden");
                }

                return;

            }

            // ----------------------------------
            // VEHICLE NOT COLLECTED
            // ----------------------------------

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

        } catch (error) {

            if (error.name === "AbortError") {
                return;
            }

            console.error(
                "Vehicle search error:",
                error
            );

            showAlert(
                "⚠️",
                "Search Failed",
                error.message || "Unable to search vehicle."
            );

        } finally {

            if (requestId === searchRequestId) {

                searchRunning = false;
                searchController = null;

                setLoading(false);

                searchBtn.disabled = false;
                searchBtn.textContent = "Search";

            }

        }

    }


    // ======================================
    // SAVE ROAD COLLECTION
    // ======================================

    async function saveCollection() {

        if (!roadCollectionAllowed) {
            showRestrictionMessage();
            return;
        }

        if (saveRunning || searchRunning) {
            return;
        }

        const number =
            formatVehicleNo(vehicleNo.value);

        if (!number || !isValidVehicleNo(number)) {

            showAlert(
                "🚗",
                "Invalid Vehicle Number",
                "Please enter a valid vehicle number."
            );

            vehicleNo.focus();
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
                "Please enter a valid amount greater than zero."
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

        if (number !== currentVehicleNumber) {

            showAlert(
                "⚠️",
                "Vehicle Not Verified",
                "Please search the vehicle again before saving."
            );

            return;

        }

        const collector = getCollectorDetails();

        if (!collector.collectorId || !collector.collectorName) {

            showAlert(
                "⚠️",
                "Login Information Missing",
                "Your collector information is missing. Please login again."
            );

            return;

        }

        saveRunning = true;

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        try {

            // IMPORTANT:
            // Do not abort a save request.
            // The server may still complete the transaction
            // even if the browser stops waiting for the response.

            const result = await fetchAPI(
                buildSaveParams(number)
            );

            if (!result || !result.success) {

                if (result?.duplicate) {

                    showAlert(
                        "ℹ️",
                        "Already Collected",
                        result.message ||
                            "This vehicle has already been collected."
                    );

                } else {

                    showAlert(
                        "⚠️",
                        "Save Failed",
                        result?.message ||
                            "Collection could not be saved."
                    );

                }

                return;

            }

            // ----------------------------------
            // SAVE SUCCESS
            // ----------------------------------

            hideAll();

            if (mCollectionId) {
                mCollectionId.textContent =
                    result.collectionId || "";
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

        } catch (error) {

            console.error(
                "Road Collection save error:",
                error
            );

            // A network failure does not prove that the
            // server failed to save the record.
            showAlert(
                "⚠️",
                "Save Status Unconfirmed",
                "The server response could not be received. " +
                "Do not submit again immediately. Search this vehicle " +
                "to check whether the collection was recorded."
            );

        } finally {

            saveRunning = false;

            saveBtn.disabled = false;
            saveBtn.textContent = "Save Collection";

        }

    }


    // ======================================
    // EVENT LISTENERS
    // ======================================

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


    // ======================================
    // ENTER KEY SEARCH
    // ======================================

    vehicleNo.addEventListener("keydown", event => {

        if (event.key === "Enter") {

            event.preventDefault();

            if (!searchRunning && !saveRunning) {
                searchVehicle();
            }

        }

    });


    // ======================================
    // AUTO FORMAT VEHICLE NUMBER
    // ======================================

    vehicleNo.addEventListener("blur", () => {

        vehicleNo.value =
            formatVehicleNo(vehicleNo.value);

    });


    // ======================================
    // PAGE INITIALIZATION
    // ======================================

    hideAll();

    if (date) {
        date.value = today();
    }

    vehicleNo.setAttribute("autocomplete", "off");
    vehicleNo.setAttribute("spellcheck", "false");

    // Preserve the dashboard-selected filters.
    sessionStorage.setItem("selectedYear", selectedYear);
    sessionStorage.setItem("selectedPuja", selectedPuja);

    // Validate the selected context before enabling the page.
    if (!/^\d{4}$/.test(selectedYear)) {

        showAlert(
            "⚠️",
            "Invalid Year",
            "Please return to the dashboard and select a valid year."
        );

        vehicleNo.disabled = true;
        searchBtn.disabled = true;

        return;

    }

    if (!roadCollectionAllowed) {

        showRestrictionMessage();

        return;

    }

    requestAnimationFrame(() => {
        vehicleNo.focus();
    });

});
