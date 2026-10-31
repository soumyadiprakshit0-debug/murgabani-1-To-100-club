
/* =========================================================
   MURGABANI 1 TO 100 CLUB
   MY HISTORY — LIVE BACKEND INTEGRATION
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       1. CONFIGURATION
    ===================================================== */

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const $ = id => document.getElementById(id);

    const state = {
        records: {
            village: [],
            members: [],
            road: [],
            expenses: []
        },

        activeKind: "village",
        editing: null,
        memberOptions: [],
        context: null,
        loading: false
    };


    /* =====================================================
       2. TABLE CONFIGURATION
    ===================================================== */

    const config = {
        village: {
            body: "villageBody",
            search: "villageSearch",
            count: "villageCount",
            amount: "villageAmount",

            columns: [
                ["date", "date"],
                ["contributor"],
                ["amount", "money"],
                ["note"]
            ],

            editFields: [
                "contributor",
                "amount",
                "note"
            ],

            title: "Village Collection"
        },

        members: {
            body: "membersBody",
            search: "membersSearch",
            count: "membersCount",
            amount: "membersAmount",

            columns: [
                ["date", "date"],
                ["memberName"],
                ["amount", "money"],
                ["status", "status"],
                ["note"]
            ],

            editFields: [
                "selectedMemberId",
                "amount",
                "status",
                "note"
            ],

            title: "Members Collection"
        },

        road: {
            body: "roadBody",
            search: "roadSearch",
            count: "roadCount",
            amount: "roadAmount",

            columns: [
                ["date", "date"],
                ["vehicleNo"],
                ["amount", "money"],
                ["vehicleType"]
            ],

            editFields: [
                "vehicleNo",
                "vehicleType",
                "amount"
            ],

            title: "Road Collection"
        },

        expenses: {
            body: "expensesBody",
            search: "expensesSearch",
            count: "expensesCount",
            amount: "expensesAmount",

            columns: [
                ["date", "date"],
                ["expenseName"],
                ["amount", "money"],
                ["category"]
            ],

            editFields: [
                "expenseName",
                "category",
                "amount",
                "paidBy",
                "note"
            ],

            title: "Expenses"
        }
    };


    /* =====================================================
       3. UTILITIES
    ===================================================== */

    const escapeHTML = value =>
        String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    const money = value => {
        const amount = Number(value);

        return "₹" + (
            Number.isFinite(amount) ? amount : 0
        ).toLocaleString("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };

    function formatDate(value) {
        if (!value) return "—";

        const raw = String(value).trim();

        const match = raw.match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

        if (match) {
            const date = new Date(
                Number(match[3]),
                Number(match[2]) - 1,
                Number(match[1])
            );

            return date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        }

        return raw;
    }

    function toast(message) {
        const el = $("toast");
        if (!el) return;

        el.textContent = message;
        el.classList.add("show");

        clearTimeout(toast.timer);

        toast.timer = setTimeout(() => {
            el.classList.remove("show");
        }, 3000);
    }

    function getDashboardUrl() {
        return sessionStorage.getItem("returnDashboard") ||
            "member-dashboard.html";
    }


    /* =====================================================
       4. LOADING OVERLAY
    ===================================================== */

    function showLoading(message = "Loading your history") {
        const overlay = $("loadingOverlay");
        if (!overlay) return;

        const text = overlay.querySelector(".loading-text");

        if (text) {
            text.innerHTML =
                `${escapeHTML(message)}<span class="loading-dots"></span>`;
        }

        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
    }

    function hideLoading() {
        const overlay = $("loadingOverlay");
        if (!overlay) return;

        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
    }


    /* =====================================================
       5. DASHBOARD CONTEXT
    ===================================================== */

    function initContext() {
        const params = new URLSearchParams(location.search);

        const year =
            params.get("year") ||
            sessionStorage.getItem("selectedYear") || "";

        const puja =
            params.get("puja") ||
            sessionStorage.getItem("selectedPuja") || "";

        const memberId =
            sessionStorage.getItem("memberId") || "";

        const memberName =
            sessionStorage.getItem("memberName") || "Member";

        const loggedIn =
            sessionStorage.getItem("loggedIn") === "true";

        if ($("selectedYear")) {
            $("selectedYear").textContent = year || "Not selected";
        }

        if ($("selectedPuja")) {
            $("selectedPuja").textContent = puja || "Not selected";
        }

        if ($("memberName")) {
            $("memberName").textContent = memberName;
        }

        if (!loggedIn || !memberId) {
            toast("Please log in again.");

            setTimeout(() => {
                location.replace(getDashboardUrl());
            }, 1500);

            return false;
        }

        if (!year || !puja) {
            toast("Please select Year and Puja from your dashboard.");

            setTimeout(() => {
                location.replace(getDashboardUrl());
            }, 1500);

            return false;
        }

        state.context = {
            memberId,
            memberName,
            year,
            puja
        };

        return true;
    }


    /* =====================================================
       6. API HELPERS
    ===================================================== */

    async function parseResponse(response) {
        const text = await response.text();

        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(
                "Invalid server response. Check the Apps Script deployment."
            );
        }
    }

    async function apiGet(action, parameters = {}) {
        const query = new URLSearchParams({
            action,
            ...parameters
        });

        const response = await fetch(
            `${API_URL}?${query.toString()}`,
            {
                method: "GET",
                redirect: "follow"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to contact the server.");
        }

        return parseResponse(response);
    }

    async function apiPost(action, parameters = {}) {
        const form = new URLSearchParams();

        form.append("action", action);

        Object.entries(parameters).forEach(([key, value]) => {
            form.append(
                key,
                typeof value === "string" ? value : String(value)
            );
        });

        const response = await fetch(API_URL, {
            method: "POST",
            body: form,
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error("Unable to contact the server.");
        }

        return parseResponse(response);
    }


    /* =====================================================
       7. LOAD MY HISTORY
    ===================================================== */

    async function loadHistory() {
        if (!state.context || state.loading) return;

        state.loading = true;
        showLoading("Loading your records");

        try {
            const result = await apiGet("getMyHistory", {
                memberId: state.context.memberId,
                year: state.context.year,
                puja: state.context.puja
            });

            if (!result.success) {
                throw new Error(
                    result.message || "Unable to load history."
                );
            }

            const data = result.data || {};

            state.records.village = data.village || [];
            state.records.members = data.members || [];
            state.records.road = data.road || [];
            state.records.expenses = data.expenses || [];

            renderAll();

            toast("History loaded successfully.");

        } catch (error) {
            console.error("My History loading error:", error);

            toast(error.message || "Unable to load your history.");

        } finally {
            state.loading = false;
            hideLoading();
        }
    }


    /* =====================================================
       8. RECORD ID
    ===================================================== */

    // Backend returns the ID using the property "id".
    function getRecordId(row) {
        return row.id || "";
    }


    /* =====================================================
       9. SUMMARY
    ===================================================== */

    function updateSummary(kind) {
        const c = config[kind];
        if (!c) return;

        const records = state.records[kind];

        const total = records.reduce((sum, row) => {
            const amount = Number(row.amount);

            return sum + (
                Number.isFinite(amount) ? amount : 0
            );
        }, 0);

        if ($(c.count)) {
            $(c.count).textContent =
                records.length.toLocaleString("en-IN");
        }

        if ($(c.amount)) {
            $(c.amount).textContent = money(total);
        }
    }


    /* =====================================================
       10. TABLE CELL RENDERING
    ===================================================== */

    function renderCell(row, key, type) {
        const value = row[key];

        if (type === "money") {
            return `
                <td class="amount-cell">
                    ${money(value)}
                </td>
            `;
        }

        if (type === "date") {
            return `
                <td>${escapeHTML(formatDate(value))}</td>
            `;
        }

        if (type === "status") {
            const status = String(value || "").trim();

            let badgeClass = "";

            if (status.toLowerCase() === "paid") {
                badgeClass = "status-paid";
            } else if (
                status.toLowerCase() === "partially due"
            ) {
                badgeClass = "status-partial";
            }

            return `
                <td>
                    <span class="status-badge ${badgeClass}">
                        ${escapeHTML(status || "—")}
                    </span>
                </td>
            `;
        }

        return `
            <td>${escapeHTML(value || "—")}</td>
        `;
    }


    /* =====================================================
       11. ACTION BUTTON
       No delete button for Admin or Member.
    ===================================================== */

    function renderActions(kind, row) {
        return `
            <td>
                <div class="action-cell">
                    <button
                        type="button"
                        class="row-action edit-action"
                        data-action="edit"
                        data-kind="${kind}"
                        data-id="${escapeHTML(getRecordId(row))}">
                        ✏️ Edit
                    </button>
                </div>
            </td>
        `;
    }


    /* =====================================================
       12. TABLE RENDERING
    ===================================================== */

    function render(kind, query = "") {
        const c = config[kind];
        if (!c) return;

        const tbody = $(c.body);
        if (!tbody) return;

        const all = state.records[kind];
        const q = String(query).trim().toLowerCase();

        updateSummary(kind);

        const rows = q
            ? all.filter(row =>
                Object.values(row).some(value =>
                    String(value ?? "").toLowerCase().includes(q)
                )
            )
            : all;

        if (!rows.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${c.columns.length + 1}"
                        class="empty-cell">
                        ${q
                            ? "No matching records found."
                            : "No records found for the selected Year and Puja."
                        }
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = rows.map(row => {
            const cells = c.columns.map(([key, type]) =>
                renderCell(row, key, type)
            ).join("");

            return `
                <tr>
                    ${cells}
                    ${renderActions(kind, row)}
                </tr>
            `;
        }).join("");
    }

    function renderAll() {
        Object.keys(config).forEach(kind => {
            const input = $(config[kind].search);

            render(kind, input ? input.value : "");
        });
    }


    /* =====================================================
       13. TABS
    ===================================================== */

    function showSection(sectionId) {
        const activeButton = document.querySelector(
            `.history-tab[data-target="${sectionId}"]`
        );

        const activeSection = $(sectionId);

        if (!activeButton || !activeSection) return;

        document.querySelectorAll(".history-tab").forEach(button => {
            const active = button === activeButton;

            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
            button.tabIndex = active ? 0 : -1;
        });

        document.querySelectorAll(".history-section").forEach(section => {
            section.hidden = section !== activeSection;
        });

        const kind = Object.keys(config).find(key =>
            config[key].body.replace("Body", "Section") === sectionId
        );

        if (kind) state.activeKind = kind;
    }

    function initTabs() {
        document.querySelectorAll(".history-tab").forEach(button => {
            button.addEventListener("click", () => {
                showSection(button.dataset.target);
            });
        });
    }


    /* =====================================================
       14. EDIT FIELD LABELS
    ===================================================== */

    function getFieldLabel(key) {
        const labels = {
            contributor: "Contributor",
            selectedMemberId: "Member Name",
            vehicleNo: "Vehicle Number",
            vehicleType: "Vehicle Type",
            expenseName: "Expense Name",
            category: "Category",
            amount: "Amount (₹)",
            status: "Payment Status",
            paidBy: "Paid By",
            note: "Note"
        };

        return labels[key] || key;
    }


    /* =====================================================
       15. MEMBERS OPTIONS
       Existing backend action: getMemberOptions
    ===================================================== */

    async function loadMemberOptions() {
        if (state.memberOptions.length) {
            return state.memberOptions;
        }

        const result = await apiPost("getMemberOptions");

        if (!result.success) {
            throw new Error(
                result.message || "Unable to load member list."
            );
        }

        state.memberOptions = result.members || [];

        return state.memberOptions;
    }


    /* =====================================================
       16. EDIT FIELD GENERATOR
    ===================================================== */

    function renderEditField(key, record) {
        const label = getFieldLabel(key);

        if (key === "note") {
            return `
                <div class="edit-field">
                    <label for="edit-${key}">${label}</label>

                    <textarea
                        id="edit-${key}"
                        name="${key}"
                        rows="3"
                        maxlength="500">${escapeHTML(record[key] || "")}</textarea>
                </div>
            `;
        }

        if (key === "status") {
            const selected = String(record.status || "");

            return `
                <div class="edit-field">
                    <label for="edit-${key}">${label}</label>

                    <select id="edit-${key}" name="${key}" required>
                        <option value="Paid"
                            ${selected === "Paid" ? "selected" : ""}>
                            Paid
                        </option>

                        <option value="Partially Due"
                            ${selected === "Partially Due" ? "selected" : ""}>
                            Partially Due
                        </option>
                    </select>
                </div>
            `;
        }

        if (key === "category") {
            const categories = [
                "Puja essentials",
                "Decoration items",
                "Decorators & Light",
                "Sound",
                "Food",
                "Others"
            ];

            return `
                <div class="edit-field">
                    <label for="edit-${key}">${label}</label>

                    <select id="edit-${key}" name="${key}" required>
                        ${categories.map(category => `
                            <option value="${escapeHTML(category)}"
                                ${record.category === category ? "selected" : ""}>
                                ${escapeHTML(category)}
                            </option>
                        `).join("")}
                    </select>
                </div>
            `;
        }

        if (key === "selectedMemberId") {
            const matches = state.memberOptions.filter(member =>
                member.name === record.memberName
            );

            const currentId =
                matches.length === 1 ? matches[0].memberId : "";

            return `
                <div class="edit-field">
                    <label for="edit-${key}">${label}</label>

                    <select id="edit-${key}"
                        name="${key}"
                        required>

                        <option value="">Select Member</option>

                        ${state.memberOptions.map(member => `
                            <option value="${escapeHTML(member.memberId)}"
                                ${member.memberId === currentId ? "selected" : ""}>
                                ${escapeHTML(member.name)}
                            </option>
                        `).join("")}

                    </select>

                    ${matches.length > 1
                        ? '<small class="field-hint">Multiple members have this name. Please select the correct member.</small>'
                        : ""
                    }
                </div>
            `;
        }

        const isAmount = key === "amount";

        return `
            <div class="edit-field">
                <label for="edit-${key}">${label}</label>

                <input
                    id="edit-${key}"
                    name="${key}"
                    type="${isAmount ? "number" : "text"}"
                    value="${escapeHTML(record[key] ?? "")}"
                    ${isAmount
                        ? 'min="0.01" step="0.01" required'
                        : 'maxlength="160" required'
                    }>
            </div>
        `;
    }


    /* =====================================================
       17. OPEN EDIT MODAL
    ===================================================== */

    async function openEdit(kind, recordId) {
        const record = state.records[kind].find(row =>
            String(getRecordId(row)) === String(recordId)
        );

        if (!record) {
            toast("Record not found.");
            return;
        }

        try {
            if (kind === "members") {
                showLoading("Loading member list");
                await loadMemberOptions();
                hideLoading();
            }

            const c = config[kind];

            state.editing = {
                kind,
                recordId,
                record
            };

            $("editTitle").textContent =
                `Edit ${c.title} Record`;

            $("editSubtitle").textContent = getRecordId(record);

            $("editFields").innerHTML = c.editFields
                .map(key => renderEditField(key, record))
                .join("");

            $("editModal").hidden = false;

            const firstInput = $("editFields").querySelector(
                "input, textarea, select"
            );

            if (firstInput) firstInput.focus();

        } catch (error) {
            hideLoading();
            toast(error.message || "Unable to open edit form.");
        }
    }


    /* =====================================================
       18. CLOSE EDIT MODAL
    ===================================================== */

    function closeEdit() {
        if ($("editModal")) {
            $("editModal").hidden = true;
        }

        if ($("editFields")) {
            $("editFields").innerHTML = "";
        }

        state.editing = null;
    }


    /* =====================================================
       19. SAVE EDIT
    ===================================================== */

    async function saveEdit(fields) {
        if (!state.editing || !state.context) {
            throw new Error("No record selected.");
        }

        const { kind, recordId } = state.editing;

        const result = await apiPost("updateMyHistory", {
            memberId: state.context.memberId,
            module: kind,
            recordId: recordId,
            year: state.context.year,
            puja: state.context.puja,
            fields: JSON.stringify(fields)
        });

        if (!result.success) {
            throw new Error(
                result.message || "Unable to update record."
            );
        }

        return result;
    }


    /* =====================================================
       20. TABLE ACTION HANDLER
    ===================================================== */

    function handleTableAction(event) {
        const button = event.target.closest(
            "button[data-action='edit']"
        );

        if (!button) return;

        const kind = button.dataset.kind;
        const id = button.dataset.id;

        if (!config[kind] || !id) return;

        openEdit(kind, id);
    }


    /* =====================================================
       21. SEARCH
    ===================================================== */

    function initSearch() {
        Object.entries(config).forEach(([kind, c]) => {
            const input = $(c.search);

            if (!input) return;

            input.addEventListener("input", () => {
                render(kind, input.value);
            });
        });
    }


    /* =====================================================
       22. EVENTS
    ===================================================== */

    function initEvents() {
        Object.values(config).forEach(c => {
            const tbody = $(c.body);

            if (tbody) {
                tbody.addEventListener(
                    "click",
                    handleTableAction
                );
            }
        });

        if ($("backBtn")) {
            $("backBtn").addEventListener("click", () => {
                location.replace(getDashboardUrl());
            });
        }

        if ($("refreshBtn")) {
            $("refreshBtn").addEventListener("click", loadHistory);
        }

        if ($("closeEditBtn")) {
            $("closeEditBtn").addEventListener("click", closeEdit);
        }

        if ($("cancelEditBtn")) {
            $("cancelEditBtn").addEventListener("click", closeEdit);
        }

        if ($("editModal")) {
            $("editModal").addEventListener("click", event => {
                if (event.target === $("editModal")) {
                    closeEdit();
                }
            });
        }

        if ($("editForm")) {
            $("editForm").addEventListener("submit", async event => {
                event.preventDefault();

                if (!state.editing) {
                    toast("No record selected.");
                    return;
                }

                const formData = new FormData(event.currentTarget);
                const fields = Object.fromEntries(formData.entries());

                if (fields.amount !== undefined) {
                    const amount = Number(fields.amount);

                    if (!Number.isFinite(amount) || amount <= 0) {
                        toast("Enter a valid amount greater than zero.");
                        return;
                    }

                    fields.amount = String(amount);
                }

                if (fields.note !== undefined &&
                    fields.note.length > 500) {
                    toast("Note cannot exceed 500 characters.");
                    return;
                }

                const submitButton = event.currentTarget.querySelector(
                    'button[type="submit"]'
                );

                try {
                    if (submitButton) {
                        submitButton.disabled = true;
                        submitButton.textContent = "Saving...";
                    }

                    showLoading("Saving your changes");

                    await saveEdit(fields);

                    closeEdit();

                    await loadHistory();

                    toast("Record updated successfully.");

                } catch (error) {
                    console.error("My History edit error:", error);
                    toast(error.message || "Unable to save changes.");

                } finally {
                    hideLoading();

                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = "Save Changes";
                    }
                }
            });
        }

        document.addEventListener("keydown", event => {
            if (
                event.key === "Escape" &&
                $("editModal") &&
                !$("editModal").hidden
            ) {
                closeEdit();
            }
        });
    }


    /* =====================================================
       23. INITIALIZATION
    ===================================================== */

    async function init() {
        if (!initContext()) {
            hideLoading();
            return;
        }

        initTabs();
        initSearch();
        initEvents();

        showSection("villageSection");

        await loadHistory();
    }


    /* =====================================================
       24. START
    ===================================================== */

    showLoading("Preparing your history");

    document.addEventListener(
        "DOMContentLoaded",
        init,
        { once: true }
    );

})();
