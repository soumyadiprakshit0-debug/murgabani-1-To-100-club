/* =========================================================
   MURGABANI 1 TO 100 CLUB
   Village Collection — Frontend Controller
   File: js/village-collection.js
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const DASHBOARDS = {
        admin: "admin-dashboard.html",
        member: "member-dashboard.html",
        default: "login.html"
    };

    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    const form = document.getElementById("transactionForm");
    const contributorInput = document.getElementById("contributorName");
    const amountInput = document.getElementById("amount");
    const noteInput = document.getElementById("note");

    const submitBtn = document.getElementById("submitBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const backLink = document.getElementById("backLink");
    const messageBox = document.getElementById("formMessage");

    const yearDisplay = document.getElementById("contextYear");
    const pujaDisplay = document.getElementById("contextPuja");
    const collectorDisplay = document.getElementById("contextCollector");

    if (!form) return;

    /* =====================================================
       STORAGE HELPERS
       ===================================================== */

    function getSessionValue(keys) {
        for (const key of keys) {
            const value = sessionStorage.getItem(key);

            if (value && value.trim()) {
                return value.trim();
            }
        }

        return "";
    }

    function getURLValue(keys) {
        const params = new URLSearchParams(window.location.search);

        for (const key of keys) {
            const value = params.get(key);

            if (value && value.trim()) {
                return value.trim();
            }
        }

        return "";
    }

    function getContextValue(keys) {
        return getURLValue(keys) || getSessionValue(keys);
    }

    /* =====================================================
       LOGGED-IN USER
       ===================================================== */

    const memberId = getSessionValue([
        "memberId",
        "collectorId",
        "userId"
    ]);

    const memberName = getSessionValue([
        "memberName",
        "name",
        "collectorName"
    ]);

    const memberRole = getSessionValue([
        "memberRole",
        "role",
        "userRole"
    ]).toLowerCase();

    function getDashboardURL() {
    const savedDashboard = sessionStorage.getItem("returnDashboard");

    if (
        savedDashboard === "admin-dashboard.html" &&
        memberRole.includes("admin")
    ) {
        return savedDashboard;
    }

    if (
        savedDashboard === "member-dashboard.html" &&
        memberRole.includes("member")
    ) {
        return savedDashboard;
    }

    if (memberRole.includes("admin")) {
        return DASHBOARDS.admin;
    }

    if (memberRole.includes("member")) {
        return DASHBOARDS.member;
    }

    return DASHBOARDS.default;
}

    function returnToDashboard() {
        window.location.href = getDashboardURL();
    }

    /* =====================================================
       YEAR AND PUJA CONTEXT
       ===================================================== */

    const year = getContextValue([
        "year",
        "selectedYear",
        "contextYear",
        "financialYear"
    ]);

    const puja = getContextValue([
        "puja",
        "selectedPuja",
        "contextPuja"
    ]);

    /* =====================================================
       MESSAGE HANDLING
       ===================================================== */

    function showMessage(message, type = "error") {
        messageBox.textContent = message;
        messageBox.className = "message " + type;
        messageBox.style.display = "block";
    }

    function clearMessage() {
        messageBox.textContent = "";
        messageBox.className = "message";
        messageBox.style.display = "none";
    }

    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function initializePage() {
        yearDisplay.textContent = year || "Not selected";
        pujaDisplay.textContent = puja || "Not selected";
        collectorDisplay.textContent = memberName || "Not logged in";

        backLink.href = getDashboardURL();

        if (!memberId || !memberName || !memberRole) {
            showMessage(
                "Your login information is incomplete. Please log in again."
            );

            submitBtn.disabled = true;
            return;
        }

        if (!year || !/^\d{4}$/.test(year) || !puja) {
            showMessage(
                "Year or Puja is missing. Return to your dashboard and open Village Collection again."
            );

            submitBtn.disabled = true;
        }
    }

    /* =====================================================
       SUBMIT BUTTON STATE
       ===================================================== */

    function setSubmitting(isSubmitting) {
        submitBtn.disabled = isSubmitting;

        if (isSubmitting) {
            submitBtn.textContent = "Saving...";
            submitBtn.setAttribute("aria-busy", "true");
        } else {
            submitBtn.textContent = "Save Collection";
            submitBtn.removeAttribute("aria-busy");
        }
    }

    /* =====================================================
       SUCCESS CONFIRMATION
       ===================================================== */

    function showConfirmation(result) {
        const savedAmount = Number(result.amount);

        const details = [
            "Village collection saved successfully!",
            "",
            "Collection ID: " + result.collectionId,
            "Contributor: " + contributorInput.value.trim(),
            "Amount: ₹" + (
                Number.isFinite(savedAmount)
                    ? savedAmount.toFixed(2)
                    : amountInput.value
            ),
            "Year: " + year,
            "Puja: " + puja,
            "Recorded by: " + (result.collectorName || memberName)
        ].join("\n");

        window.alert(details);

        form.reset();
        clearMessage();
    }

    /* =====================================================
       SAVE COLLECTION
       ===================================================== */

    async function saveCollection(event) {
        event.preventDefault();

        if (submitBtn.disabled) return;

        clearMessage();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!memberId || !memberName || !memberRole) {
            showMessage("Please log in again before saving.");
            return;
        }

        if (!year || !/^\d{4}$/.test(year) || !puja) {
            showMessage("The year or Puja is missing.");
            return;
        }

        const contributorName = contributorInput.value.trim();
        const amount = Number(amountInput.value);
        const note = noteInput.value.trim();

        if (!contributorName) {
            showMessage("Please enter the contributor's name.");
            contributorInput.focus();
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            showMessage("Please enter an amount greater than zero.");
            amountInput.focus();
            return;
        }

        const payload = new URLSearchParams({
            action: "saveVillageCollection",
            year: year,
            puja: puja,
            contributorName: contributorName,
            amount: String(amount),
            note: note,
            memberId: memberId
        });

        setSubmitting(true);

        try {
            /*
             * Google Apps Script may redirect POST requests.
             * We need a readable response to confirm the save.
             */
            const response = await fetch(API_URL, {
                method: "POST",
                body: payload
            });

            if (!response.ok) {
                throw new Error("HTTP error: " + response.status);
            }

            const result = await response.json();

            if (!result || result.success !== true) {
                throw new Error(
                    result && result.message
                        ? result.message
                        : "The collection could not be saved."
                );
            }

            showConfirmation(result);

        } catch (error) {
            console.error(
                "Village Collection submission failed:",
                error
            );

            showMessage(
                "We couldn't confirm the save. Check the spreadsheet before retrying to avoid creating a duplicate record."
            );

        } finally {
            setSubmitting(false);
        }
    }

    /* =====================================================
       NAVIGATION
       ===================================================== */

    form.addEventListener("submit", saveCollection);

    cancelBtn.addEventListener("click", returnToDashboard);

    backLink.addEventListener("click", function (event) {
        event.preventDefault();
        returnToDashboard();
    });

    /* =====================================================
       START
       ===================================================== */

    initializePage();

})();
