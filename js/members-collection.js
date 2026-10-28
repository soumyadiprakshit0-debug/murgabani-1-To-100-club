
/* =========================================================
   MURGABANI 1 TO 100 CLUB
   MEMBERS COLLECTION — FINAL FRONTEND CONTROLLER
   File: js/members-collection.js
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       1. CONFIGURATION
       ===================================================== */

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const DASHBOARDS = {
        admin: "admin-dashboard.html",
        member: "member-dashboard.html",
        default: "login.html"
    };

    const $ = id => document.getElementById(id);

    /* =====================================================
       2. DOM ELEMENTS
       ===================================================== */

    const form = $("transactionForm");
    if (!form) {
        console.error("Members Collection form was not found.");
        return;
    }

    const memberInput = $("memberName");
    const dropdownButton = $("memberDropdownBtn");
    const optionsBox = $("memberOptions");
    const amountInput = $("amount");
    const statusInput = $("status");
    const noteInput = $("note");

    const submitButton = $("submitBtn");
    const cancelButton = $("cancelBtn");
    const backLink = $("backLink");
    const messageBox = $("formMessage");

    const yearDisplay = $("contextYear");
    const pujaDisplay = $("contextPuja");
    const collectorDisplay = $("contextCollector");

    if (
        !memberInput || !dropdownButton || !optionsBox ||
        !amountInput || !statusInput || !noteInput ||
        !submitButton || !cancelButton || !backLink ||
        !messageBox || !yearDisplay || !pujaDisplay ||
        !collectorDisplay
    ) {
        console.error(
            "Members Collection HTML is missing one or more required element IDs."
        );
        return;
    }

    /* =====================================================
       3. SESSION AND CONTEXT HELPERS
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

    function readURL(keys) {
        const params = new URLSearchParams(window.location.search);

        for (const key of keys) {
            const value = params.get(key);

            if (value && value.trim()) {
                return value.trim();
            }
        }

        return "";
    }

    function readContext(keys) {
        return readURL(keys) || readSession(keys);
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

    let members = [];
    let selectedMember = null;
    let submitting = false;
    let membersLoaded = false;
    let membersLoading = false;

    /* =====================================================
       4. DASHBOARD NAVIGATION
       ===================================================== */

    function dashboardURL() {
        const savedDashboard =
            sessionStorage.getItem("returnDashboard");

        if (
            savedDashboard === DASHBOARDS.admin &&
            memberRole.includes("admin")
        ) {
            return DASHBOARDS.admin;
        }

        if (
            savedDashboard === DASHBOARDS.member &&
            memberRole.includes("member")
        ) {
            return DASHBOARDS.member;
        }

        if (memberRole.includes("admin")) {
            return DASHBOARDS.admin;
        }

        if (memberRole.includes("member")) {
            return DASHBOARDS.member;
        }

        return DASHBOARDS.default;
    }

    function goBack() {
        window.location.href = dashboardURL();
    }

    /* =====================================================
       5. MESSAGE HANDLING
       ===================================================== */

    function showMessage(message, type = "error") {
        messageBox.textContent = message;
        messageBox.className = "message " + type;
        messageBox.hidden = false;
        messageBox.setAttribute("role", "alert");
        messageBox.setAttribute("aria-live", "assertive");

        messageBox.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    function clearMessage() {
        messageBox.textContent = "";
        messageBox.className = "message";
        messageBox.hidden = true;
        messageBox.removeAttribute("role");
        messageBox.removeAttribute("aria-live");
    }

    /* =====================================================
       6. INITIALIZATION
       ===================================================== */

    function initialize() {
        yearDisplay.textContent = year || "Not selected";
        pujaDisplay.textContent = puja || "Not selected";
        collectorDisplay.textContent = memberName || "Not logged in";

        backLink.href = dashboardURL();

        if (!memberId || !memberName || !memberRole) {
            showMessage(
                "Your login session is missing information.\n\n" +
                "Please return to the login page and sign in again.",
                "error"
            );

            submitButton.disabled = true;
            return false;
        }

        if (!year || !/^\d{4}$/.test(year) || !puja) {
            showMessage(
                "Year or Puja has not been selected.\n\n" +
                "Return to your dashboard, select the correct year and Puja, " +
                "and open Members Collection again.",
                "warning"
            );

            submitButton.disabled = true;
            return false;
        }

        if (
            !memberRole.includes("admin") &&
            !memberRole.includes("member")
        ) {
            showMessage(
                "Your account is not authorized to record contributions.",
                "error"
            );

            submitButton.disabled = true;
            return false;
        }

        return true;
    }

    /* =====================================================
       7. SUBMIT BUTTON STATE
       ===================================================== */

    function setSubmitting(value) {
        submitting = value;
        submitButton.disabled = value;

        if (value) {
            submitButton.textContent = "Saving...";
            submitButton.setAttribute("aria-busy", "true");
        } else {
            submitButton.textContent = "Save Contribution";
            submitButton.removeAttribute("aria-busy");
        }
    }

    /* =====================================================
       8. API HELPER
       ===================================================== */

    async function callAPI(action, data = {}) {
        const body = new URLSearchParams({
            action,
            ...data
        });

        const response = await fetch(API_URL, {
            method: "POST",
            body
        });

        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }

        const result = await response.json();

        if (!result || result.success !== true) {
            throw new Error(
                result && result.message
                    ? result.message
                    : "The server rejected the request."
            );
        }

        return result;
    }

    /* =====================================================
       9. SEARCHABLE MEMBER DROPDOWN
       ===================================================== */

    function hideOptions() {
        optionsBox.hidden = true;
        memberInput.setAttribute("aria-expanded", "false");
    }

    function showOptions() {
        optionsBox.hidden = false;
        memberInput.setAttribute("aria-expanded", "true");
    }

    function renderMembers(query = "") {
        const q = query.trim().toLowerCase();

        const filtered = members.filter(member =>
            member.name.toLowerCase().includes(q) ||
            member.memberId.toLowerCase().includes(q)
        );

        optionsBox.replaceChildren();
        selectedMember = null;

        if (!filtered.length) {
            const empty = document.createElement("div");
            empty.className = "member-empty";
            empty.textContent = "No matching members found.";
            optionsBox.appendChild(empty);
            showOptions();
            return;
        }

        const fragment = document.createDocumentFragment();

        filtered.forEach(member => {
            const option = document.createElement("button");

            option.type = "button";
            option.className = "member-option";
            option.setAttribute("role", "option");
            option.textContent =
                `${member.name} (${member.memberId})`;

            option.addEventListener("click", () => {
                selectedMember = member;
                memberInput.value = member.name;
                hideOptions();
                clearMessage();
            });

            fragment.appendChild(option);
        });

        optionsBox.appendChild(fragment);
        showOptions();
    }

    async function loadMembers() {
        if (membersLoaded || membersLoading) return;

        membersLoading = true;
        dropdownButton.disabled = true;

        try {
            const result = await callAPI("getMemberOptions");

            members = (result.members || [])
                .map(item => ({
                    memberId: String(item.memberId || "").trim(),
                    name: String(item.name || "").trim()
                }))
                .filter(item => item.memberId && item.name);

            membersLoaded = true;

            if (!members.length) {
                showMessage(
                    "No active members are currently available for selection.",
                    "warning"
                );
            } else {
                clearMessage();
                renderMembers(memberInput.value);
            }
        } catch (error) {
            console.error("Member list error:", error);

            showMessage(
                "Unable to load the member list.\n\n" +
                "Check your internet connection and Apps Script deployment, " +
                "then refresh the page.",
                "error"
            );
        } finally {
            membersLoading = false;
            dropdownButton.disabled = false;
        }
    }

    memberInput.addEventListener("input", () => {
        selectedMember = null;

        if (membersLoaded) {
            renderMembers(memberInput.value);
        }
    });

    memberInput.addEventListener("focus", () => {
        if (membersLoaded) {
            renderMembers(memberInput.value);
        }
    });

    dropdownButton.addEventListener("click", async () => {
        if (!membersLoaded) {
            await loadMembers();
            return;
        }

        if (optionsBox.hidden) {
            renderMembers(memberInput.value);
        } else {
            hideOptions();
        }
    });

    memberInput.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideOptions();
        }
    });

    document.addEventListener("click", event => {
        if (
            event.target instanceof Element &&
            !event.target.closest(".member-select-wrapper")
        ) {
            hideOptions();
        }
    });

    /* =====================================================
       10. SUCCESS CONFIRMATION MODAL
       ===================================================== */

    function showContributionConfirmation(result, details) {
        document.querySelector(".mc-modal-backdrop")?.remove();

        const backdrop = document.createElement("div");
        backdrop.className = "mc-modal-backdrop";

        backdrop.innerHTML = `
            <section
                class="mc-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mcModalTitle"
                tabindex="-1"
            >
                <div class="mc-success-icon" aria-hidden="true">✓</div>

                <h2 id="mcModalTitle">Contribution Saved!</h2>

                <p class="mc-modal-subtitle">
                    The member contribution has been recorded successfully.
                </p>

                <div class="mc-id-card">
                    <span class="mc-id-label">Collection ID</span>
                    <span class="mc-id-value" id="mcCollectionId"></span>
                </div>

                <div class="mc-details">
                    <div class="mc-detail-row">
                        <span class="mc-detail-label">Member</span>
                        <span class="mc-detail-value" id="mcMember"></span>
                    </div>

                    <div class="mc-detail-row">
                        <span class="mc-detail-label">Amount</span>
                        <span class="mc-detail-value mc-amount" id="mcAmount"></span>
                    </div>

                    <div class="mc-detail-row">
                        <span class="mc-detail-label">Payment Status</span>
                        <span class="mc-detail-value" id="mcStatus"></span>
                    </div>

                    <div class="mc-detail-row">
                        <span class="mc-detail-label">Financial Year</span>
                        <span class="mc-detail-value" id="mcYear"></span>
                    </div>

                    <div class="mc-detail-row">
                        <span class="mc-detail-label">Puja</span>
                        <span class="mc-detail-value" id="mcPuja"></span>
                    </div>

                    <div class="mc-detail-row">
                        <span class="mc-detail-label">Recorded By</span>
                        <span class="mc-detail-value" id="mcCollector"></span>
                    </div>
                </div>

                <div class="mc-modal-note">
                    Keep the Collection ID for future reference.
                </div>

                <button type="button" class="mc-done-button">
                    Done
                </button>
            </section>
        `;

        const setText = (selector, value) => {
            backdrop.querySelector(selector).textContent =
                String(value ?? "");
        };

        setText("#mcCollectionId", result.collectionId || "Not provided");
        setText("#mcMember", details.memberName);
        setText("#mcAmount", "₹" + details.amount.toFixed(2));
        setText("#mcStatus", details.status);
        setText("#mcYear", details.year);
        setText("#mcPuja", details.puja);
        setText("#mcCollector", details.collectorName);

        document.body.appendChild(backdrop);

        const modal = backdrop.querySelector(".mc-modal");
        const doneButton = backdrop.querySelector(".mc-done-button");

        doneButton.addEventListener("click", () => {
            backdrop.remove();
            form.reset();
            selectedMember = null;
            clearMessage();
            memberInput.focus();
        });

        modal.focus();
        doneButton.focus();
    }

    /* =====================================================
       11. SAVE CONTRIBUTION
       ===================================================== */

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (submitting) return;

        clearMessage();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!selectedMember) {
            showMessage(
                "Please select a member from the dropdown list.",
                "warning"
            );

            memberInput.focus();
            return;
        }

        const amount = Number(amountInput.value);
        const status = statusInput.value;

        if (!Number.isFinite(amount) || amount <= 0) {
            showMessage(
                "Enter a valid contribution amount greater than zero.",
                "error"
            );

            amountInput.focus();
            return;
        }

        if (!["Paid", "Partially Due"].includes(status)) {
            showMessage(
                "Please select a valid payment status.",
                "error"
            );

            statusInput.focus();
            return;
        }

        setSubmitting(true);

        try {
            const result = await callAPI("saveMembersCollection", {
                year,
                puja,
                memberName: selectedMember.name,
                selectedMemberId: selectedMember.memberId,
                amount: String(amount),
                status,
                note: noteInput.value.trim(),
                collectorId: memberId
            });

            showContributionConfirmation(result, {
                memberName: selectedMember.name,
                amount,
                status,
                year,
                puja,
                collectorName: result.collectorName || memberName
            });

        } catch (error) {
            console.error("Save contribution error:", error);

            showMessage(
                "We couldn't confirm whether the contribution was saved.\n\n" +
                "Please check the Members Collection sheet before trying again " +
                "to avoid creating a duplicate record.",
                "warning"
            );
        } finally {
            setSubmitting(false);
        }
    });

    /* =====================================================
       12. BACK AND CANCEL NAVIGATION
       ===================================================== */

    function goBack() {
        window.location.href = dashboardURL();
    }

    cancelButton.addEventListener("click", event => {
        event.preventDefault();
        goBack();
    });

    backLink.addEventListener("click", event => {
        event.preventDefault();
        goBack();
    });

    /* =====================================================
       13. START
       ===================================================== */

    if (initialize()) {
        loadMembers();
    }

})();
