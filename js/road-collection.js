
document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    // ============================================================
    // CONFIGURATION
    // ============================================================

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const CURRENT_YEAR = "2026";
    const CURRENT_PUJA = "Saraswati puja";


    // ============================================================
    // ELEMENTS
    // ============================================================

    const vehicleNo =
        document.getElementById("vehicleNo");

    const searchBtn =
        document.getElementById("searchBtn");

    const loading =
        document.getElementById("loading");

    const alreadyCollected =
        document.getElementById("alreadyCollected");

    const collectionForm =
        document.getElementById("collectionForm");

    const message =
        document.getElementById("message");

    const aVehicle =
        document.getElementById("aVehicle");

    const aType =
        document.getElementById("aType");

    const aAmount =
        document.getElementById("aAmount");

    const aCollector =
        document.getElementById("aCollector");

    const aDate =
        document.getElementById("aDate");

    const date =
        document.getElementById("date");

    const vehicleType =
        document.getElementById("vehicleType");

    const amount =
        document.getElementById("amount");

    const saveBtn =
        document.getElementById("saveBtn");

    const searchAgainBtn =
        document.getElementById("searchAgainBtn");

    const mCollectionId =
        document.getElementById("mCollectionId");

    const mVehicle =
        document.getElementById("mVehicle");

    const mAmount =
        document.getElementById("mAmount");

    const nextBtn =
        document.getElementById("nextBtn");

    const backDashboardBtn =
        document.getElementById("backDashboardBtn");

        


    // ============================================================
    // BASIC ELEMENT CHECK
    // ============================================================

    if (!vehicleNo || !searchBtn) {

        console.error(
            "Road Collection: required elements are missing."
        );

        return;

    }


    // ============================================================
    // STATE
    // ============================================================

    let searchRunning = false;
    let saveRunning = false;

    let searchController = null;
    let saveController = null;


    // ============================================================
    // BACK TO DASHBOARD
    // ============================================================




if (backDashboardBtn) {
    backDashboardBtn.addEventListener("click", () => {

        const returnDashboard =
            sessionStorage.getItem("returnDashboard");

        if (returnDashboard) {
            window.location.replace(returnDashboard);
        } else {
            // Safe fallback
            window.location.replace("member-dashboard.html");
        }

    });
}
        

    // ============================================================
    // CUSTOM ALERT
    // ============================================================

    function showAlert(
        icon,
        title,
        alertMessage,
        type = "error"
    ) {

        const oldAlert =
            document.getElementById(
                "customAlert"
            );

        if (oldAlert) {
            oldAlert.remove();
        }


        const alertBox =
            document.createElement("div");

        alertBox.id =
            "customAlert";


        alertBox.innerHTML = `
            <div class="custom-alert-overlay">

                <div class="custom-alert-box ${type}">

                    <div class="custom-alert-icon">
                        ${icon}
                    </div>

                    <h2>${title}</h2>

                    <p>${alertMessage}</p>

                    <button
                        type="button"
                        id="customAlertOk"
                    >
                        OK
                    </button>

                </div>

            </div>
        `;


        document.body.appendChild(
            alertBox
        );


        const okButton =
            document.getElementById(
                "customAlertOk"
            );


        if (okButton) {

            okButton.addEventListener(
                "click",
                () => {

                    alertBox.remove();

                },
                {
                    once: true
                }
            );

        }

    }


    // ============================================================
    // HIDE ALL RESULT SECTIONS
    // ============================================================

    function hideAll() {

        if (alreadyCollected) {
            alreadyCollected.classList.add("hidden");
        }

        if (collectionForm) {
            collectionForm.classList.add("hidden");
        }

        if (message) {
            message.classList.add("hidden");
        }

        if (loading) {
            loading.classList.add("hidden");
        }

    }


    // ============================================================
    // SHOW LOADING
    // ============================================================

    function setLoading(isLoading) {

        if (!loading) {
            return;
        }

        loading.classList.toggle(
            "hidden",
            !isLoading
        );

    }


    // ============================================================
    // TODAY
    // ============================================================

    function today() {

        const d =
            new Date();

        return (
            d.getFullYear() +
            "-" +
            String(
                d.getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
                d.getDate()
            ).padStart(2, "0")
        );

    }


    // ============================================================
    // FORMAT VEHICLE NUMBER
    // ============================================================

    function formatVehicleNo(value) {

        return String(value || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

    }


    // ============================================================
    // VALIDATE VEHICLE NUMBER
    // ============================================================

    function isValidVehicleNo(number) {

        return /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/
            .test(number);

    }


    // ============================================================
    // RESET FORM
    // ============================================================

    function resetForm() {

        // Cancel any previous search
        if (searchController) {

            searchController.abort();
            searchController = null;

        }


        searchRunning = false;


        if (vehicleNo) {
            vehicleNo.value = "";
        }

        if (vehicleType) {
            vehicleType.value = "";
        }

        if (amount) {
            amount.value = "";
        }

        if (date) {
            date.value = today();
        }


        hideAll();


        if (searchBtn) {

            searchBtn.disabled =
                false;

            searchBtn.textContent =
                "Search";

        }


        if (saveBtn) {

            saveBtn.disabled =
                false;

            saveBtn.textContent =
                "Save Collection";

        }


        requestAnimationFrame(
            () => {

                vehicleNo.focus();

            }
        );

    }


    // ============================================================
    // BUILD SEARCH URL
    // ============================================================

    function buildSearchURL(number) {

        const params =
            new URLSearchParams({

                action:
                    "searchVehicle",

                vehicleNo:
                    number,

                year:
                    CURRENT_YEAR,

                puja:
                    CURRENT_PUJA

            });


        return (
            API_URL +
            "?" +
            params.toString()
        );

    }


    // ============================================================
    // BUILD SAVE URL
    // ============================================================

    function buildSaveURL(number) {

        const collectorId =
            sessionStorage.getItem(
                "memberId"
            ) || "M001";


        const collectorName =
            sessionStorage.getItem(
                "memberName"
            ) || "Soumyadip";


        const params =
            new URLSearchParams({

                action:
                    "saveRoadCollection",

                date:
                    date.value,

                year:
                    CURRENT_YEAR,

                vehicleNo:
                    number,

                vehicleType:
                    vehicleType.value,

                puja:
                    CURRENT_PUJA,

                amount:
                    amount.value,

                collectorId:
                    collectorId,

                collectorName:
                    collectorName

            });


        return (
            API_URL +
            "?" +
            params.toString()
        );

    }


    // ============================================================
    // SEARCH VEHICLE
    // ============================================================

    async function searchVehicle() {

        // ----------------------------------------
        // Prevent duplicate search
        // ----------------------------------------

        if (searchRunning) {

            return;

        }


        const number =
            formatVehicleNo(
                vehicleNo.value
            );


        // ----------------------------------------
        // Empty vehicle number
        // ----------------------------------------

        if (!number) {

            alert(
                "Enter Vehicle Number"
            );

            vehicleNo.focus();

            return;

        }


        // ----------------------------------------
        // Validate vehicle number
        // ----------------------------------------

        if (!isValidVehicleNo(number)) {

            showAlert(
                "🚗",
                "Invalid Vehicle Number",
                "Please enter a valid vehicle number.\n\nExample: WB68A1234",
                "error"
            );

            vehicleNo.focus();

            return;

        }


        // ----------------------------------------
        // Update input with formatted number
        // ----------------------------------------

        vehicleNo.value =
            number;


        // ----------------------------------------
        // Start search
        // ----------------------------------------

        searchRunning =
            true;


        searchBtn.disabled =
            true;


        searchBtn.textContent =
            "Searching...";


        hideAll();

        setLoading(true);


        // ----------------------------------------
        // Abort previous request
        // ----------------------------------------

        if (searchController) {

            searchController.abort();

        }


        searchController =
            new AbortController();


        try {

            const url =
                buildSearchURL(
                    number
                );


            // ----------------------------------------
            // API REQUEST
            // ----------------------------------------

            const response =
                await fetch(
                    url,
                    {
                        method: "GET",
                        cache: "no-store",
                        signal:
                            searchController.signal
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Server error (${response.status})`
                );

            }


            // ----------------------------------------
            // READ JSON
            // ----------------------------------------

            const result =
                await response.json();


            // ----------------------------------------
            // API ERROR
            // ----------------------------------------

            if (!result || !result.success) {

                alert(
                    result &&
                    result.message
                        ? result.message
                        : "Vehicle search failed."
                );

                return;

            }


            // ----------------------------------------
            // VEHICLE FOUND
            // ----------------------------------------

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
                        result.amount || "";
                }

                if (aCollector) {
                    aCollector.textContent =
                        result.collectorName || "";
                }


                // ------------------------------------
                // DATE
                // ------------------------------------

                if (aDate) {

                    const parsedDate =
                        new Date(
                            result.date
                        );


                    if (
                        !Number.isNaN(
                            parsedDate.getTime()
                        )
                    ) {

                        aDate.textContent =
                            parsedDate.toLocaleDateString(
                                "en-IN",
                                {
                                    day:
                                        "2-digit",

                                    month:
                                        "short",

                                    year:
                                        "numeric"
                                }
                            );

                    }

                    else {

                        aDate.textContent =
                            result.date || "";

                    }

                }


                if (alreadyCollected) {

                    alreadyCollected.classList.remove(
                        "hidden"
                    );

                }

                return;

            }


            // ----------------------------------------
            // VEHICLE NOT FOUND
            // ----------------------------------------

            if (vehicleType) {

                vehicleType.value =
                    result.vehicleType || "";

            }


            if (amount) {

                amount.value =
                    "";

            }


            if (date) {

                date.value =
                    today();

            }


            if (collectionForm) {

                collectionForm.classList.remove(
                    "hidden"
                );

            }

        }

        catch (err) {

            // ----------------------------------------
            // Ignore aborted request
            // ----------------------------------------

            if (
                err &&
                err.name ===
                    "AbortError"
            ) {

                return;

            }


            console.error(
                "Vehicle search error:",
                err
            );


            alert(
                err &&
                err.message
                    ? err.message
                    : "Unable to search vehicle."
            );

        }

        finally {

            setLoading(false);


            searchRunning =
                false;


            searchController =
                null;


            searchBtn.disabled =
                false;


            searchBtn.textContent =
                "Search";

        }

    }


    // ============================================================
    // SAVE ROAD COLLECTION
    // ============================================================

    async function saveCollection() {

        // ----------------------------------------
        // Prevent duplicate save
        // ----------------------------------------

        if (saveRunning) {

            return;

        }


        const number =
            formatVehicleNo(
                vehicleNo.value
            );


        // ----------------------------------------
        // VALIDATE VEHICLE NUMBER
        // ----------------------------------------

        if (!number) {

            alert(
                "Enter Vehicle Number"
            );

            vehicleNo.focus();

            return;

        }


        if (!isValidVehicleNo(number)) {

            alert(
                "Invalid Vehicle Number\n\nExample:\nWB68A1234"
            );

            vehicleNo.focus();

            return;

        }


        // ----------------------------------------
        // VEHICLE TYPE
        // ----------------------------------------

        if (
            !vehicleType ||
            vehicleType.value === ""
        ) {

            alert(
                "Select Vehicle Type"
            );

            vehicleType.focus();

            return;

        }


        // ----------------------------------------
        // AMOUNT
        // ----------------------------------------

        if (
            !amount ||
            amount.value === ""
        ) {

            alert(
                "Enter Amount"
            );

            amount.focus();

            return;

        }


        // ----------------------------------------
        // START SAVE
        // ----------------------------------------

        saveRunning =
            true;


        saveBtn.disabled =
            true;


        saveBtn.textContent =
            "Saving...";


        // ----------------------------------------
        // CANCEL PREVIOUS SAVE
        // ----------------------------------------

        if (saveController) {

            saveController.abort();

        }


        saveController =
            new AbortController();


        try {

            const url =
                buildSaveURL(
                    number
                );


            const response =
                await fetch(
                    url,
                    {
                        method: "GET",
                        cache: "no-store",
                        signal:
                            saveController.signal
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Server error (${response.status})`
                );

            }


            const result =
                await response.json();


            // ----------------------------------------
            // SUCCESS
            // ----------------------------------------

            if (result.success) {

                hideAll();


                if (mCollectionId) {

                    mCollectionId.textContent =
                        result.collectionId || "";

                }


                if (mVehicle) {

                    mVehicle.textContent =
                        number;

                }


                if (mAmount) {

                    mAmount.textContent =
                        amount.value;

                }


                if (message) {

                    message.classList.remove(
                        "hidden"
                    );

                }

            }

            else {

                alert(
                    result.message ||
                    "Collection could not be saved."
                );

            }

        }

        catch (err) {

            if (
                err &&
                err.name ===
                    "AbortError"
            ) {

                return;

            }


            console.error(
                "Save collection error:",
                err
            );


            alert(
                err &&
                err.message
                    ? err.message
                    : "Unable to save collection."
            );

        }

        finally {

            saveRunning =
                false;


            saveController =
                null;


            saveBtn.disabled =
                false;


            saveBtn.textContent =
                "Save Collection";

        }

    }


    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    searchBtn.addEventListener(
        "click",
        searchVehicle
    );


    if (searchAgainBtn) {

        searchAgainBtn.addEventListener(
            "click",
            resetForm
        );

    }


    if (saveBtn) {

        saveBtn.addEventListener(
            "click",
            saveCollection
        );

    }


    if (nextBtn) {

        nextBtn.addEventListener(
            "click",
            resetForm
        );

    }


    // ============================================================
    // ENTER KEY SEARCH
    // ============================================================

    vehicleNo.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();


                if (!searchRunning) {

                    searchVehicle();

                }

            }

        }
    );


    // ============================================================
    // AUTO FORMAT VEHICLE NUMBER
    // ============================================================

    vehicleNo.addEventListener(
        "blur",
        () => {

            const formatted =
                formatVehicleNo(
                    vehicleNo.value
                );


            if (
                vehicleNo.value !==
                formatted
            ) {

                vehicleNo.value =
                    formatted;

            }

        }
    );


    // ============================================================
    // PAGE INITIALIZATION
    // ============================================================

    hideAll();


    if (date) {

        date.value =
            today();

    }


    // Prevent browser autocomplete
    vehicleNo.setAttribute(
        "autocomplete",
        "off"
    );


    // Prevent spell checking
    vehicleNo.setAttribute(
        "spellcheck",
        "false"
    );


    // Focus vehicle number
    requestAnimationFrame(
        () => {

            vehicleNo.focus();

        }
    );

});
