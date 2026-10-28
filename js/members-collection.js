/* =========================================================
   MURGABANI 1 TO 100 CLUB
   MEMBERS COLLECTION — FRONTEND
   ========================================================= */

(() => {
    "use strict";

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const $ = id => document.getElementById(id);

    const form = $("transactionForm");
    if (!form) return;

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

    const DASHBOARDS = {
        admin: "admin-dashboard.html",
        member: "member-dashboard.html",
        default: "login.html"
    };

    let members = [];
    let selectedMember = null;
    let submitting = false;
    let membersLoaded = false;

    /* ---------------- Session helpers ---------------- */

    function readSession(keys) {
        for (const key of keys) {
            const value = sessionStorage.getItem(key);
            if (value && value.trim()) return value.trim();
        }
        return "";
    }

    function readContext(keys) {
        const params = new URLSearchParams(location.search);

        for (const key of keys) {
            const value = params.get(key);
            if (value && value.trim()) return value.trim();
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

   /* function dashboardURL() {
        if (memberRole.includes("admin")) {
            return DASHBOARDS.admin;
        }

        if (memberRole.includes("member")) {
            return DASHBOARDS.member;
        }

        return DASHBOARDS.default;
    }

    function goBack() {
        location.href = dashboardURL();
    }*/

   function dashboardURL() {
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

    /* ---------------- Messages ---------------- */

    function showMessage(message, type = "error") {
        messageBox.textContent = message;
        messageBox.className = "message " + type;
        messageBox.hidden = false;
    }

    function clearMessage() {
        messageBox.textContent = "";
        messageBox.className = "message";
        messageBox.hidden = true;
    }

    /* ---------------- Initialization ---------------- */

    function initialize() {
        yearDisplay.textContent = year || "Not selected";
        pujaDisplay.textContent = puja || "Not selected";
        collectorDisplay.textContent = memberName || "Not logged in";

        backLink.href = dashboardURL();

        if (!memberId || !memberName || !memberRole) {
            showMessage(
                "Login details are missing. Please open this page from your logged-in dashboard."
            );
            submitButton.disabled = true;
            return false;
        }

        if (!year || !/^\d{4}$/.test(year) || !puja) {
            showMessage(
                "Year or Puja is missing. Return to your dashboard and reopen Members Collection."
            );
            submitButton.disabled = true;
            return false;
        }

        return true;
    }

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

    /* ---------------- API helper ---------------- */

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

    /* ---------------- Member dropdown ---------------- */

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
            option.textContent = `${member.name} (${member.memberId})`;

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
                showMessage("No members are available for selection.");
            } else {
                clearMessage();
            }
        } catch (error) {
            console.error("Member list error:", error);

            showMessage(
                "Unable to load members. Check the Apps Script deployment and try again."
            );
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

    dropdownButton.addEventListener("click", () => {
        if (!membersLoaded) {
            loadMembers();
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
        if (!event.target.closest(".member-select-wrapper")) {
            hideOptions();
        }
    });

    /* ---------------- Save contribution ---------------- */

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (submitting) return;

        clearMessage();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!selectedMember) {
            showMessage("Select a member from the dropdown.");
            memberInput.focus();
            return;
        }

        const amount = Number(amountInput.value);
        const status = statusInput.value;

        if (!Number.isFinite(amount) || amount <= 0) {
            showMessage("Enter an amount greater than zero.");
            amountInput.focus();
            return;
        }

        if (!["Paid", "Partially Due"].includes(status)) {
            showMessage("Select a valid payment status.");
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

            const details = [
                "Contribution saved successfully!",
                "",
                "Collection ID: " + result.collectionId,
                "Member: " + selectedMember.name,
                "Amount: ₹" + amount.toFixed(2),
                "Status: " + status,
                "Year: " + year,
                "Puja: " + puja,
                "Recorded by: " + (result.collectorName || memberName)
            ].join("\n");

            window.alert(details);

            form.reset();
            selectedMember = null;
            clearMessage();

        } catch (error) {
            console.error("Save contribution error:", error);

            showMessage(
                "The save could not be confirmed. Check Google Sheets before retrying to avoid duplicate records."
            );
        } finally {
            setSubmitting(false);
        }
    });

    /* ---------------- Navigation ---------------- */

    cancelButton.addEventListener("click", goBack);

    backLink.addEventListener("click", event => {
        event.preventDefault();
        goBack();
    });

    /* ---------------- Start ---------------- */

    if (initialize()) {
        loadMembers();
    }

})();
