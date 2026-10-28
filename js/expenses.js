
/* =========================================================
   MURGABANI 1 TO 100 CLUB
   Expenses Page — Corrected Frontend Controller
   ========================================================= */

(() => {
    "use strict";

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const DASHBOARDS = {
        admin: "admin-dashboard.html",
        member: "member-dashboard.html",
        default: "login.html"
    };

    const $ = id => document.getElementById(id);

    const form = $("transactionForm");
    const expenseNameInput = $("expenseName");
    const categoryInput = $("category");
    const amountInput = $("amount");
    const noteInput = $("note");
    const submitButton = $("submitBtn");
    const cancelButton = $("cancelBtn");
    const backLink = $("backLink");
    const messageBox = $("formMessage");

    const yearDisplay = $("contextYear");
    const pujaDisplay = $("contextPuja");
    const collectorDisplay = $("contextCollector");

    if (
        !form || !expenseNameInput || !categoryInput ||
        !amountInput || !noteInput || !submitButton ||
        !cancelButton || !backLink || !messageBox
    ) {
        console.error("Expenses page is missing required HTML elements.");
        return;
    }

    let isSubmitting = false;
    let activeModal = null;

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

        for (const key of keys) {
            const value = params.get(key);

            if (value && value.trim()) {
                return value.trim();
            }
        }

        return readSession(keys);
    }

    const memberId = readSession([
        "memberId", "collectorId", "userId"
    ]);

    const memberName = readSession([
        "memberName", "name", "collectorName"
    ]);

    const memberRole = readSession([
        "memberRole", "role", "userRole"
    ]).toLowerCase();

    const year = readContext([
        "year", "selectedYear", "contextYear", "financialYear"
    ]);

    const puja = readContext([
        "puja", "selectedPuja", "contextPuja"
    ]);

    function getDashboardURL() {
        const saved = sessionStorage.getItem("returnDashboard");

        if (
            saved === DASHBOARDS.admin &&
            memberRole.includes("admin")
        ) {
            return saved;
        }

        if (
            saved === DASHBOARDS.member &&
            memberRole.includes("member")
        ) {
            return saved;
        }

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
       2. FORM MESSAGES
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
       3. CUSTOM MODAL HELPERS
       ===================================================== */

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    function closeModal() {
        if (!activeModal) return;

        activeModal.remove();
        activeModal = null;
        document.body.classList.remove("exp-modal-open");
    }

    function createModal({
        icon = "!",
        iconType = "warning",
        title,
        description,
        warning,
        buttons
    }) {
        closeModal();

        const backdrop = createElement(
            "div",
            "exp-modal-backdrop"
        );

        backdrop.setAttribute("role", "presentation");

        const modal = createElement("section", "exp-modal");
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "expModalTitle");

        const iconElement = createElement(
            "div",
            `exp-modal-icon ${iconType}`,
            icon
        );
        iconElement.setAttribute("aria-hidden", "true");

        const titleElement = createElement(
            "h2",
            "exp-modal-title",
            title
        );
        titleElement.id = "expModalTitle";

        const descriptionElement = createElement(
            "p",
            "exp-modal-description",
            description
        );

        modal.append(iconElement, titleElement, descriptionElement);

        if (warning) {
            const warningBox = createElement(
                "div",
                "exp-modal-warning-box"
            );

            const warningSymbol = createElement(
                "div",
                "exp-modal-warning-symbol",
                "!"
            );

            warningSymbol.setAttribute("aria-hidden", "true");

            const warningText = createElement(
                "p",
                "exp-modal-warning-text",
                warning
            );

            warningBox.append(warningSymbol, warningText);
            modal.append(warningBox);
        }

        const actions = createElement("div", "exp-modal-actions");

        buttons.forEach(item => {
            const button = createElement(
                "button",
                `exp-modal-button ${item.className}`,
                item.label
            );

            button.type = "button";

            button.addEventListener("click", item.onClick);
            actions.append(button);
        });

        modal.append(actions);
        backdrop.append(modal);
        document.body.append(backdrop);

        activeModal = backdrop;
        document.body.classList.add("exp-modal-open");

        const firstButton = actions.querySelector("button");
        firstButton?.focus();

        // Close only if the user clicks the backdrop itself.
        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) {
                closeModal();
            }
        });

        // Escape closes the modal without confirming a destructive action.
        function handleEscape(event) {
            if (
                event.key === "Escape" &&
                activeModal === backdrop
            ) {
                closeModal();
                document.removeEventListener("keydown", handleEscape);
            }
        }

        document.addEventListener("keydown", handleEscape);

        return backdrop;
    }

    /* =====================================================
       4. SUCCESS CONFIRMATION
       ===================================================== */

    function showSuccessModal(result, details) {
        const expenseId =
            result.expenseId ||
            result.id ||
            result.recordId ||
            "";

        const backdrop = createModal({
            icon: "✓",
            iconType: "success",
            title: "Expense Saved!",
            description:
                "Your expense has been recorded successfully.",

            buttons: [
                {
                    label: "Done",
                    className: "done",
                    onClick: () => {
                        closeModal();
                        form.reset();
                        clearMessage();
                    }
                }
            ]
        });

        const modal = backdrop.querySelector(".exp-modal");
        const actions = modal.querySelector(".exp-modal-actions");

        if (expenseId) {
            const detailsBox = createElement(
                "div",
                "exp-modal-details"
            );

            const row = createElement(
                "div",
                "exp-modal-detail-row"
            );

            row.append(
                createElement(
                    "span",
                    "exp-modal-detail-label",
                    "Expense ID"
                ),
                createElement(
                    "span",
                    "exp-modal-detail-value",
                    String(expenseId)
                )
            );

            detailsBox.append(row);
            modal.insertBefore(detailsBox, actions);
        }

        const detailsBox = createElement(
            "div",
            "exp-modal-details"
        );

        const rows = [
            ["Expense", details.expenseName],
            ["Category", details.category],
            ["Amount", "₹" + details.amount],
            ["Financial Year", details.year],
            ["Puja", details.puja],
            ["Recorded By", details.collector]
        ];

        rows.forEach(([label, value]) => {
            const row = createElement(
                "div",
                "exp-modal-detail-row"
            );

            row.append(
                createElement(
                    "span",
                    "exp-modal-detail-label",
                    label
                ),
                createElement(
                    "span",
                    "exp-modal-detail-value",
                    String(value || "—")
                )
            );

            detailsBox.append(row);
        });

        modal.insertBefore(detailsBox, actions);
    }

    /* =====================================================
       5. DISCARD CONFIRMATION
       ===================================================== */

    function hasEnteredData() {
        return Boolean(
            expenseNameInput.value.trim() ||
            categoryInput.value ||
            amountInput.value ||
            noteInput.value.trim()
        );
    }

    function confirmDiscard() {
        if (!hasEnteredData()) {
            goBackToDashboard();
            return;
        }

        createModal({
            icon: "!",
            iconType: "warning",
            title: "Discard Expense?",
            description:
                "You have entered expense details that have not been saved.",
            warning:
                "If you leave this page, the entered details will be lost. This action cannot be undone.",

            buttons: [
                {
                    label: "Stay on Page",
                    className: "stay",
                    onClick: closeModal
                },
                {
                    label: "Discard & Return",
                    className: "discard",
                    onClick: () => {
                        closeModal();
                        goBackToDashboard();
                    }
                }
            ]
        });
    }

    /* =====================================================
       6. INITIALIZE PAGE
       ===================================================== */

    function initializePage() {
        if (yearDisplay) {
            yearDisplay.textContent = year || "Not selected";
        }

        if (pujaDisplay) {
            pujaDisplay.textContent = puja || "Not selected";
        }

        if (collectorDisplay) {
            collectorDisplay.textContent = memberName || "Not logged in";
        }

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

        if (
            !memberRole.includes("admin") &&
            !memberRole.includes("member")
        ) {
            showMessage(
                "Your account is not authorized to record expenses."
            );
            submitButton.disabled = true;
            return false;
        }

        return true;
    }

    /* =====================================================
       7. VALIDATION
       ===================================================== */

    function validateForm() {
        const expenseName = expenseNameInput.value.trim();
        const category = categoryInput.value;
        const amount = Number(amountInput.value);
        const note = noteInput.value;

        const allowedCategories = [
            "Puja essentials",
            "Decoration items",
            "Decorators & Light",
            "Sound",
            "Food",
            "Others"
        ];

        if (!expenseName) {
            showMessage("Please enter the expense name.");
            expenseNameInput.focus();
            return false;
        }

        if (expenseName.length > 160) {
            showMessage("The expense name cannot exceed 160 characters.");
            expenseNameInput.focus();
            return false;
        }

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

        if (note.length > 500) {
            showMessage("The note cannot exceed 500 characters.");
            noteInput.focus();
            return false;
        }

        return true;
    }

    /* =====================================================
       8. BACKEND REQUEST
       ===================================================== */

    async function saveExpense() {
        const payload = new URLSearchParams();

        // Must match the doPost(e) case in Code.gs exactly.
        payload.set("action", "saveExpense");
        payload.set("year", year);
        payload.set("puja", puja);
        payload.set("expenseName", expenseNameInput.value.trim());
        payload.set("category", categoryInput.value);
        payload.set("amount", amountInput.value.trim());
        payload.set("note", noteInput.value.trim());
        payload.set("collectorId", memberId);
        payload.set("collectorName", memberName);

        const response = await fetch(API_URL, {
            method: "POST",
            body: payload,
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(
                "The server returned HTTP " + response.status +
                ". Please try again later."
            );
        }

        try {
            return await response.json();
        } catch {
            throw new Error(
                "The server returned an unreadable response. Check the Expenses sheet before retrying."
            );
        }
    }

    /* =====================================================
       9. SUBMIT EXPENSE
       ===================================================== */

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (isSubmitting) return;

        closeModal();
        clearMessage();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!validateForm()) return;

        // Capture details before the request.
        const details = {
            expenseName: expenseNameInput.value.trim(),
            category: categoryInput.value,
            amount: amountInput.value.trim(),
            year,
            puja,
            collector: memberName
        };

        isSubmitting = true;
        submitButton.disabled = true;
        cancelButton.disabled = true;
        backLink.setAttribute("aria-disabled", "true");
        submitButton.textContent = "Saving…";

        try {
            const result = await saveExpense();

            if (!result || result.success !== true) {
                throw new Error(
                    result && result.message
                        ? result.message
                        : "The expense could not be saved."
                );
            }

            showMessage(
                "Expense saved successfully.",
                "success"
            );

            showSuccessModal(result, details);

        } catch (error) {
            console.error("Expense save error:", error);

            showMessage(
                "We couldn't confirm that the expense was saved. " +
                "Check the Expenses sheet before trying again. " +
                "Details: " +
                (error.message || "Unknown server error."),
                "error"
            );

        } finally {
            isSubmitting = false;
            submitButton.disabled = false;
            cancelButton.disabled = false;
            backLink.removeAttribute("aria-disabled");

            submitButton.innerHTML =
                '<span aria-hidden="true">＋</span> Save Expense';
        }
    });

    /* =====================================================
       10. CANCEL AND BACK NAVIGATION
       ===================================================== */

    cancelButton.addEventListener("click", confirmDiscard);

    backLink.addEventListener("click", event => {
        event.preventDefault();
        confirmDiscard();
    });

    /* =====================================================
       11. START
       ===================================================== */

    initializePage();

})();
