/* =========================================================
   MURGABANI 1 TO 100 CLUB
   Expenses Page — Frontend Controller
   File: js/expenses.js
   ========================================================= */

(() => {
    "use strict";

    // Google Apps Script Web App URL
    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    // Dashboard destinations
    const DASHBOARDS = {
        admin: "admin-dashboard.html",
        member: "member-dashboard.html",
        default: "login.html"
    };

    const $ = id => document.getElementById(id);

    // Form elements
    const form = $("transactionForm");
    const expenseNameInput = $("expenseName");
    const categoryInput = $("category");
    const amountInput = $("amount");
    const noteInput = $("note");

    const submitButton = $("submitBtn");
    const cancelButton = $("cancelBtn");
    const backLink = $("backLink");
    const messageBox = $("formMessage");

    // Context elements
    const yearDisplay = $("contextYear");
    const pujaDisplay = $("contextPuja");
    const collectorDisplay = $("contextCollector");

    if (!form) {
        console.error("Expenses form not found.");
        return;
    }

    let isSubmitting = false;

    /* =====================================================
       1. SESSION AND DASHBOARD CONTEXT
       ===================================================== */

    function readSession(keys) {
        for (const key of keys) {
            const value = sessionStorage.getItem(key);

            if (value && value.trim()) {
                return value.trim();
            }
        }

        return "";
    }

    function readContext(keys) {
        const params = new URLSearchParams(window.location.search);

        // Prefer the dashboard's URL parameters.
        for (const key of keys) {
            const value = params.get(key);

            if (value && value.trim()) {
                return value.trim();
            }
        }

        // Otherwise use values saved by the dashboard.
        return readSession(keys);
    }

    const memberId = readSession([
        "memberId",
        "collectorId",
        "userId"
    ]);

    const memberName = readSession([
        "memberName",
        "name",
        "collectorName"
    ]);

    const memberRole = readSession([
        "memberRole",
        "role",
        "userRole"
    ]).toLowerCase();

    const year = readContext([
        "year",
        "selectedYear",
        "contextYear",
        "financialYear"
    ]);

    const puja = readContext([
        "puja",
        "selectedPuja",
        "contextPuja"
    ]);

    function getDashboardURL() {
        if (memberRole.includes("admin")) {
            return DASHBOARDS.admin;
        }

        if (memberRole.includes("member")) {
            return DASHBOARDS.member;
        }

        return DASHBOARDS.default;
    }

    function goBackToDashboard() {
        window.location.href = getDashboardURL();
    }

    /* =====================================================
       2. MESSAGE HANDLING
       ===================================================== */

    function showMessage(message, type = "error") {
        messageBox.textContent = message;
        messageBox.className = `message ${type}`;
        messageBox.hidden = false;
    }

    function clearMessage() {
        messageBox.textContent = "";
        messageBox.className = "message";
        messageBox.hidden = true;
    }

    /* =====================================================
       3. INITIALIZE PAGE
       ===================================================== */

    function initializePage() {
        yearDisplay.textContent = year || "Not selected";
        pujaDisplay.textContent = puja || "Not selected";
        collectorDisplay.textContent = memberName || "Not logged in";

        backLink.href = getDashboardURL();

        if (!memberId || !memberName || !memberRole) {
            showMessage(
                "Your login session is incomplete. Please log in again."
            );

            submitButton.disabled = true;
            return false;
        }

        if (!year || !/^\d{4}$/.test(year) || !puja) {
            showMessage(
                "Financial Year or Puja is missing. Return to your dashboard and reopen Expenses."
            );

            submitButton.disabled = true;
            return false;
        }

        // Only allow expense entry for authorized roles.
        if (
            !memberRole.includes("admin") &&
            !memberRole.includes("member")
        ) {
            showMessage("You are not authorized to record expenses.");
            submitButton.disabled = true;
            return false;
        }

        return true;
    }

    /* =====================================================
       4. VALIDATE FORM
       ===================================================== */

    function validateForm() {
        const expenseName = expenseNameInput.value.trim();
        const category = categoryInput.value;
        const amount = Number(amountInput.value);

        if (!expenseName) {
            showMessage("Please enter the expense name.");
            expenseNameInput.focus();
            return false;
        }

        if (expenseName.length > 160) {
            showMessage("The expense name is too long.");
            expenseNameInput.focus();
            return false;
        }

        if (!category) {
            showMessage("Please select an expense category.");
            categoryInput.focus();
            return false;
        }

        const allowedCategories = [
            "Puja essentials",
            "Decoration items",
            "Decorators & Light",
            "Sound",
            "Food",
            "Others"
        ];

        if (!allowedCategories.includes(category)) {
            showMessage("Please select a valid expense category.");
            categoryInput.focus();
            return false;
        }

        if (
            amountInput.value.trim() === "" ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            showMessage("Enter a valid amount greater than zero.");
            amountInput.focus();
            return false;
        }

        if (noteInput.value.length > 500) {
            showMessage("The note cannot exceed 500 characters.");
            noteInput.focus();
            return false;
        }

        return true;
    }

    /* =====================================================
       5. SAVE EXPENSE
       ===================================================== */

    async function saveExpense() {
        const payload = new URLSearchParams();

        payload.set("action", "saveExpense");
        payload.set("year", year);
        payload.set("puja", puja);

        payload.set(
            "expenseName",
            expenseNameInput.value.trim()
        );

        payload.set("category", categoryInput.value);
        payload.set("amount", amountInput.value.trim());
        payload.set("note", noteInput.value.trim());

        /*
         * These identify the collector in the request.
         * The backend must validate the identity and role
         * rather than trusting these values alone.
         */
        payload.set("collectorId", memberId);
        payload.set("collectorName", memberName);

        const response = await fetch(API_URL, {
            method: "POST",
            body: payload,
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(
                "The server returned HTTP " + response.status
            );
        }

        return response.json();
    }

    /* =====================================================
       6. FORM SUBMISSION
       ===================================================== */

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        clearMessage();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!validateForm()) {
            return;
        }

        isSubmitting = true;
        submitButton.disabled = true;
        submitButton.textContent = "Saving…";

        try {
            const result = await saveExpense();

            if (!result || result.success !== true) {
                throw new Error(
                    result && result.message
                        ? result.message
                        : "Unable to save the expense."
                );
            }

            const expenseId = result.expenseId || "";

            // Reset the form only after confirmed success.
            form.reset();

            showMessage(
                expenseId
                    ? `Expense saved successfully! Expense ID: ${expenseId}`
                    : "Expense saved successfully!",
                "success"
            );

            // Confirmation popup.
            window.alert(
                "Expense saved successfully!" +
                (expenseId ? "\nExpense ID: " + expenseId : "")
            );

        } catch (error) {
            console.error("Expense save error:", error);

            showMessage(
                error.message ||
                "Unable to save the expense. Please try again."
            );

        } finally {
            isSubmitting = false;
            submitButton.disabled = false;

            submitButton.innerHTML =
                '<span aria-hidden="true">＋</span> Save Expense';
        }
    });

    /* =====================================================
       7. CANCEL AND BACK NAVIGATION
       ===================================================== */

    cancelButton.addEventListener("click", () => {
        const hasData =
            expenseNameInput.value.trim() ||
            categoryInput.value ||
            amountInput.value ||
            noteInput.value.trim();

        if (
            hasData &&
            !window.confirm(
                "Discard the entered expense details and return to your dashboard?"
            )
        ) {
            return;
        }

        goBackToDashboard();
    });

    backLink.addEventListener("click", event => {
        event.preventDefault();
        goBackToDashboard();
    });

    /* =====================================================
       8. START
       ===================================================== */

    initializePage();

})();