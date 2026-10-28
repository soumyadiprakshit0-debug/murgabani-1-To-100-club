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

/* =====================================================
   CONTRIBUTOR NAME FORMATTING
   Capitalize the first letter of each word
   ===================================================== */

contributorInput.addEventListener("input", function () {
    const start = this.selectionStart;
    const end = this.selectionEnd;

    this.value = this.value.replace(
        /(^|\s)(\p{L})/gu,
        (match, separator, letter) =>
            separator + letter.toLocaleUpperCase("en-IN")
    );

    this.setSelectionRange(start, end);
});
   
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

/* =====================================================
   PROFESSIONAL MESSAGE HANDLING
   ===================================================== */

function showMessage(message, type = "error") {
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = "message " + type;
    messageBox.style.display = "block";
    messageBox.setAttribute("role", "alert");
    messageBox.setAttribute("aria-live", "assertive");

    messageBox.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function clearMessage() {
    if (!messageBox) return;

    messageBox.textContent = "";
    messageBox.className = "message";
    messageBox.style.display = "none";
    messageBox.removeAttribute("role");
    messageBox.removeAttribute("aria-live");
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
   PREMIUM SUCCESS CONFIRMATION MODAL
   ===================================================== */

function showConfirmation(result) {
    // Prevent multiple confirmation dialogs.
    document.querySelector(".vc-modal-backdrop")?.remove();

    const savedAmount = Number(result.amount ?? amountInput.value);

    const backdrop = document.createElement("div");
    backdrop.className = "vc-modal-backdrop";

    backdrop.innerHTML = `
        <section
            class="vc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vcModalTitle"
            aria-describedby="vcModalSubtitle"
            tabindex="-1"
        >
            <div class="vc-modal-icon" aria-hidden="true">✓</div>

            <h2 class="vc-modal-title" id="vcModalTitle">
                Collection Saved!
            </h2>

            <p class="vc-modal-subtitle" id="vcModalSubtitle">
                Your village collection has been recorded successfully.
            </p>

            <div class="vc-collection-id">
                <span class="vc-collection-id-label">
                    Collection ID
                </span>
                <span class="vc-collection-id-value" id="vcCollectionId"></span>
            </div>

            <div class="vc-details">
                <div class="vc-detail-row">
                    <span class="vc-detail-label">Contributor</span>
                    <span class="vc-detail-value" id="vcContributor"></span>
                </div>

                <div class="vc-detail-row">
                    <span class="vc-detail-label">Amount</span>
                    <span class="vc-detail-value amount" id="vcAmount"></span>
                </div>

                <div class="vc-detail-row">
                    <span class="vc-detail-label">Financial Year</span>
                    <span class="vc-detail-value" id="vcYear"></span>
                </div>

                <div class="vc-detail-row">
                    <span class="vc-detail-label">Puja</span>
                    <span class="vc-detail-value" id="vcPuja"></span>
                </div>

                <div class="vc-detail-row">
                    <span class="vc-detail-label">Recorded By</span>
                    <span class="vc-detail-value" id="vcCollector"></span>
                </div>
            </div>

            <div class="vc-modal-note">
                Please keep the Collection ID for future reference.
            </div>

            <button type="button" class="vc-modal-button" id="vcDoneButton">
                Done
            </button>
        </section>
    `;

    // Use textContent for user-provided values.
    // This prevents entered names from being interpreted as HTML.
    backdrop.querySelector("#vcCollectionId").textContent =
        result.collectionId || "Not provided";

    backdrop.querySelector("#vcContributor").textContent =
        contributorInput.value.trim();

    backdrop.querySelector("#vcAmount").textContent =
        Number.isFinite(savedAmount)
            ? "₹" + savedAmount.toFixed(2)
            : "₹" + amountInput.value;

    backdrop.querySelector("#vcYear").textContent = year;
    backdrop.querySelector("#vcPuja").textContent = puja;

    backdrop.querySelector("#vcCollector").textContent =
        result.collectorName || memberName;

    document.body.appendChild(backdrop);

    const modal = backdrop.querySelector(".vc-modal");
    const doneButton = backdrop.querySelector("#vcDoneButton");

    doneButton.addEventListener("click", () => {
        backdrop.remove();
        form.reset();
        clearMessage();
        contributorInput.focus();
    });

    modal.focus();

    // Move keyboard focus into the modal.
    doneButton.focus();
}

    
    /* =====================================================
       SAVE COLLECTION
       ===================================================== */

    async function saveCollection(event) {
        event.preventDefault();

        if (submitBtn.disabled) return;

        clearMessage();

       if (!form.checkValidity()) {
    if (amountInput.validity.rangeUnderflow) {
        showMessage(
            "⚠️ Invalid collection amount.\n\n" +
            "Please enter an amount greater than zero.",
            "error"
        );

        amountInput.focus();
        return;
    }

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
