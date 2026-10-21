// ======================================
// REPORTS.JS
// MURGABANI 1 TO 100 CLUB
// OPTIMIZED VERSION
// ======================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";


// ======================================
// API HELPER
// ======================================

function getFreshAPIUrl(action, params = {}) {

    const searchParams = new URLSearchParams({
        action,
        ...params,
        _ts: Date.now().toString()
    });

    return `${API_URL}?${searchParams.toString()}`;
}


async function apiFetch(action, params = {}) {

    const response = await fetch(
        getFreshAPIUrl(action, params),
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error(
            `Server error: ${response.status}`
        );
    }

    return await response.json();
}


// ======================================
// DASHBOARD PARAMETERS
// ======================================

const params =
    new URLSearchParams(window.location.search);

const dashboardYear =
    params.get("year");

const dashboardPuja =
    params.get("puja");


// ======================================
// ELEMENTS
// ======================================

// Collections
const villageRecords =
    document.getElementById("villageRecords");

const villageTotal =
    document.getElementById("villageTotal");

const memberRecords =
    document.getElementById("memberRecords");

const memberTotal =
    document.getElementById("memberTotal");

const villageTable =
    document.getElementById("villageTableBody");

const memberTable =
    document.getElementById("memberTableBody");


// Search
const villageSearch =
    document.getElementById("villageSearch");

const memberSearch =
    document.getElementById("memberSearch");

const expenseSearch =
    document.getElementById("expenseSearch");


// Main report
const collection2 =
    document.getElementById("collection2");

const expenses2 =
    document.getElementById("expenses2");

const balance2 =
    document.getElementById("balance2");

const year =
    document.getElementById("year");

const puja =
    document.getElementById("puja");


// Overview
const members =
    document.getElementById("members");

const collection =
    document.getElementById("collection");

const expenses =
    document.getElementById("expenses");

const balance =
    document.getElementById("balance");


// Collection breakdown
const roadCollection =
    document.getElementById("roadCollection");

const villageCollection =
    document.getElementById("villageCollection");

const memberCollection =
    document.getElementById("memberCollection");


// Loading
const loading =
    document.getElementById("loading");


// Buttons
const generateBtn =
    document.getElementById("generateBtn");

const refreshBtn =
    document.getElementById("refreshBtn");


// Tabs
const tabButtons =
    document.querySelectorAll(".tab-btn");

const tabContents =
    document.querySelectorAll(".tab-content");


// ======================================
// CACHE
// ======================================

let collectionsLoaded = false;
let collectionsData = null;

let expensesLoaded = false;
let expensesData = null;

let chartsLoaded = false;


// ======================================
// CHART INSTANCES
// ======================================

let collectionChart = null;
let expenseCategoryChart = null;
let saraswatiChart = null;
let laxmiChart = null;


// ======================================
// LOADING CONTROL
// ======================================

let loadingDepth = 0;
let progressTimer = null;
let reportOperationRunning = false;


// ======================================
// FORMAT MONEY
// ======================================

function formatMoney(value) {

    return (
        "₹" +
        Number(value || 0).toLocaleString("en-IN")
    );

}


// ======================================
// LOADING / PROGRESS
// ======================================

function showLoading(show) {

    if (!loading) return;


    // ------------------------------
    // START
    // ------------------------------

    if (show) {

        loadingDepth++;

        if (loadingDepth > 1) {
            return;
        }

        loading.classList.add("show");

        if (generateBtn) {
            generateBtn.disabled = true;
        }

        if (refreshBtn) {
            refreshBtn.disabled = true;
        }

        const progress =
            document.getElementById("progressText");

        if (!progress) return;

        let value = 0;

        progress.textContent = "0%";

        clearInterval(progressTimer);

        progressTimer = setInterval(() => {

            value +=
                Math.floor(
                    Math.random() * 8
                ) + 2;

            value = Math.min(value, 95);

            progress.textContent =
                value + "%";

        }, 120);

        return;
    }


    // ------------------------------
    // STOP
    // ------------------------------

    loadingDepth =
        Math.max(
            0,
            loadingDepth - 1
        );

    if (loadingDepth > 0) {
        return;
    }

    loading.classList.remove("show");

    if (generateBtn) {
        generateBtn.disabled = false;
    }

    if (refreshBtn) {
        refreshBtn.disabled = false;
    }

    clearInterval(progressTimer);

    const progress =
        document.getElementById("progressText");

    if (progress) {
        progress.textContent = "100%";
    }

}


// ======================================
// RESET COLLECTION CACHE
// ======================================

function resetCollections() {

    collectionsLoaded = false;
    collectionsData = null;

}


// ======================================
// RESET EXPENSE CACHE
// ======================================

function resetExpenses() {

    expensesLoaded = false;
    expensesData = null;

}


// ======================================
// DESTROY CHART SAFELY
// ======================================

function destroyChart(chart) {

    if (!chart) return null;

    try {
        chart.destroy();
    }
    catch (error) {
        console.warn(
            "Chart destroy error:",
            error
        );
    }

    return null;
}


// ======================================
// RESET CHARTS
// ======================================

function resetCharts() {

    chartsLoaded = false;

    collectionChart =
        destroyChart(collectionChart);

    expenseCategoryChart =
        destroyChart(expenseCategoryChart);

    saraswatiChart =
        destroyChart(saraswatiChart);

    laxmiChart =
        destroyChart(laxmiChart);

}


// ======================================
// RENDER VILLAGE TABLE
// ======================================

function renderVillageTable(records) {

    if (!villageTable) return;

    if (!records || !records.length) {

        villageTable.innerHTML = `
            <tr>
                <td colspan="4">
                    No records found
                </td>
            </tr>
        `;

        return;
    }

    villageTable.innerHTML =
        records.map(item => `

            <tr>

                <td>${item.date}</td>

                <td>${item.contributor}</td>

                <td>${item.collector}</td>

                <td>
                    ${formatMoney(item.amount)}
                </td>

            </tr>

        `).join("");

}


// ======================================
// RENDER MEMBER TABLE
// ======================================

function renderMemberTable(records) {

    if (!memberTable) return;

    if (!records || !records.length) {

        memberTable.innerHTML = `
            <tr>
                <td colspan="5">
                    No records found
                </td>
            </tr>
        `;

        return;
    }

    memberTable.innerHTML =
        records.map(item => `

            <tr>

                <td>${item.date}</td>

                <td>${item.member}</td>

                <td>
                    <strong>
                        ${formatMoney(item.amount)}
                    </strong>
                </td>

                <td>${item.status}</td>

                <td>${item.note || "—"}</td>

            </tr>

        `).join("");

}


// ======================================
// RENDER EXPENSE TABLE
// ======================================

function renderExpenseTable(records) {

    const tbody =
        document.getElementById(
            "expenseTableBody"
        );

    if (!tbody) return;

    if (!records || !records.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:20px;
                    "
                >
                    No expense records found.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        records.map(record => `

            <tr>

                <td>${record.expenseId}</td>

                <td>${record.date}</td>

                <td>${record.expenseName}</td>

                <td>
                    <strong>
                        ${formatMoney(record.amount)}
                    </strong>
                </td>

                <td>${record.paidBy}</td>

                <td>${record.note || "-"}</td>

            </tr>

        `).join("");

}


// ======================================
// LOAD COLLECTIONS
// ======================================

async function loadCollections(
    forceReload = false,
    manageLoading = true
) {

    if (
        collectionsLoaded &&
        !forceReload &&
        collectionsData
    ) {

        renderVillageTable(
            collectionsData.village.records
        );

        renderMemberTable(
            collectionsData.members.records
        );

        return true;
    }


    if (manageLoading) {
        showLoading(true);
    }


    try {

        const data =
            await apiFetch(
                "getCollectionDetails",
                {
                    year: year.value,
                    puja: puja.value
                }
            );


        if (!data.success) {

            alert(
                data.message ||
                "Unable to load collections."
            );

            return false;
        }


        collectionsData = data;
        collectionsLoaded = true;


        if (villageRecords) {
            villageRecords.textContent =
                data.village.totalRecords;
        }

        if (villageTotal) {
            villageTotal.textContent =
                formatMoney(
                    data.village.totalAmount
                );
        }

        if (memberRecords) {
            memberRecords.textContent =
                data.members.totalRecords;
        }

        if (memberTotal) {
            memberTotal.textContent =
                formatMoney(
                    data.members.totalAmount
                );
        }


        renderVillageTable(
            data.village.records
        );

        renderMemberTable(
            data.members.records
        );


        if (villageSearch) {
            villageSearch.value = "";
        }

        if (memberSearch) {
            memberSearch.value = "";
        }


        return true;

    }
    catch (error) {

        console.error(
            "Collection loading error:",
            error
        );

        alert(
            error.message ||
            "Unable to load collections."
        );

        return false;

    }
    finally {

        if (manageLoading) {
            showLoading(false);
        }

    }

}


// ======================================
// LOAD EXPENSES
// ======================================

async function loadExpenses(
    forceReload = false,
    manageLoading = true
) {

    if (
        expensesLoaded &&
        expensesData &&
        !forceReload
    ) {

        const totalRecordsElement =
            document.getElementById(
                "expenseTotalRecords"
            );

        const totalAmountElement =
            document.getElementById(
                "expenseTotalAmount"
            );


        if (totalRecordsElement) {
            totalRecordsElement.textContent =
                expensesData.totalRecords;
        }


        const cachedTotal =
            expensesData.records.reduce(
                (sum, record) =>
                    sum +
                    Number(record.amount || 0),
                0
            );


        if (totalAmountElement) {
            totalAmountElement.textContent =
                formatMoney(cachedTotal);
        }


        renderExpenseTable(
            expensesData.records
        );

        return true;
    }


    if (manageLoading) {
        showLoading(true);
    }


    try {

        const data =
            await apiFetch(
                "getExpenseDetails",
                {
                    year: year.value,
                    puja: puja.value
                }
            );


        if (!data.success) {

            alert(
                data.message ||
                "Unable to load expenses."
            );

            return false;
        }


        expensesData = data;
        expensesLoaded = true;


        const totalRecordsElement =
            document.getElementById(
                "expenseTotalRecords"
            );

        if (totalRecordsElement) {

            totalRecordsElement.textContent =
                data.totalRecords;
        }


        const totalAmount =
            data.records.reduce(
                (sum, record) =>
                    sum +
                    Number(record.amount || 0),
                0
            );


        const totalAmountElement =
            document.getElementById(
                "expenseTotalAmount"
            );

        if (totalAmountElement) {

            totalAmountElement.textContent =
                formatMoney(totalAmount);
        }


        renderExpenseTable(
            data.records
        );


        if (expenseSearch) {
            expenseSearch.value = "";
        }


        return true;

    }
    catch (error) {

        console.error(
            "Expense loading error:",
            error
        );

        alert(
            error.message ||
            "Unable to load expense details."
        );

        return false;

    }
    finally {

        if (manageLoading) {
            showLoading(false);
        }

    }

}


// ======================================
// LOAD COLLECTION CHART
// ======================================

function getMoneyFromElement(element) {

    if (!element) return 0;

    return Number(
        String(element.textContent || "0")
            .replace(/[₹,]/g, "")
    ) || 0;

}


function loadCollectionChart() {

    const canvas =
        document.getElementById(
            "collectionChart"
        );

    if (!canvas) return;

    const ctx =
        canvas.getContext("2d");

    if (!ctx) return;


    collectionChart =
        destroyChart(collectionChart);


    const road =
        getMoneyFromElement(
            roadCollection
        );

    const village =
        getMoneyFromElement(
            villageCollection
        );

    const member =
        getMoneyFromElement(
            memberCollection
        );


    collectionChart =
        new Chart(ctx, {

            type: "pie",

            data: {

                labels: [
                    "Road",
                    "Village",
                    "Members"
                ],

                datasets: [{

                    data: [
                        road,
                        village,
                        member
                    ]

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: true,

                plugins: {

                    legend: {
                        position: "bottom"
                    }

                }

            }

        });

}


// ======================================
// EXPENSE CATEGORY CHART
// ======================================

async function loadExpenseCategoryChart() {

    try {

        const result =
            await apiFetch(
                "getExpenseCategorySummary",
                {
                    year: year.value,
                    puja: puja.value
                }
            );


        if (!result.success) {

            console.warn(
                "Expense category chart:",
                result.message
            );

            return;
        }


        const canvas =
            document.getElementById(
                "expenseCategoryChart"
            );

        if (!canvas) return;


        const ctx =
            canvas.getContext("2d");

        if (!ctx) return;


        expenseCategoryChart =
            destroyChart(
                expenseCategoryChart
            );


        const summary =
            result.summary || {};


        expenseCategoryChart =
            new Chart(ctx, {

                type: "doughnut",

                data: {

                    labels:
                        Object.keys(summary),

                    datasets: [{

                        data:
                            Object.values(summary)

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: true,

                    plugins: {

                        legend: {
                            position: "bottom"
                        }

                    }

                }

            });

    }
    catch (error) {

        console.error(
            "Expense category chart error:",
            error
        );

    }

}


// ======================================
// PUJA COMPARISON CHARTS
// ======================================

async function loadPujaComparisonCharts() {

    try {

        const result =
            await apiFetch(
                "getPujaComparison"
            );


        if (!result.success) {

            console.warn(
                "Puja comparison:",
                result.message
            );

            return;
        }


        saraswatiChart =
            destroyChart(saraswatiChart);

        laxmiChart =
            destroyChart(laxmiChart);


        // Saraswati
        const saraswatiCanvas =
            document.getElementById(
                "saraswatiChart"
            );


        if (
            saraswatiCanvas &&
            result.saraswati
        ) {

            const ctx =
                saraswatiCanvas.getContext("2d");


            if (ctx) {

                saraswatiChart =
                    new Chart(ctx, {

                        type: "bar",

                        data: {

                            labels:
                                result.saraswati.labels,

                            datasets: [

                                {
                                    label:
                                        "Collection",

                                    data:
                                        result.saraswati.collection
                                },

                                {
                                    label:
                                        "Expense",

                                    data:
                                        result.saraswati.expense
                                }

                            ]

                        },

                        options: {

                            responsive: true,

                            maintainAspectRatio: false

                        }

                    });

            }

        }


        // Laxmi
        const laxmiCanvas =
            document.getElementById(
                "laxmiChart"
            );


        if (
            laxmiCanvas &&
            result.laxmi
        ) {

            const ctx =
                laxmiCanvas.getContext("2d");


            if (ctx) {

                laxmiChart =
                    new Chart(ctx, {

                        type: "bar",

                        data: {

                            labels:
                                result.laxmi.labels,

                            datasets: [

                                {
                                    label:
                                        "Collection",

                                    data:
                                        result.laxmi.collection
                                },

                                {
                                    label:
                                        "Expense",

                                    data:
                                        result.laxmi.expense
                                }

                            ]

                        },

                        options: {

                            responsive: true,

                            maintainAspectRatio: false

                        }

                    });

            }

        }

    }
    catch (error) {

        console.error(
            "Puja comparison chart error:",
            error
        );

    }

}


// ======================================
// LOAD ALL CHARTS
// ======================================

async function loadCharts(
    forceReload = false
) {

    if (
        chartsLoaded &&
        !forceReload
    ) {
        return;
    }


    console.log(
        "Loading charts:",
        year.value,
        puja.value
    );


    loadCollectionChart();


    // IMPORTANT:
    // These two APIs run simultaneously.
    await Promise.all([
        loadExpenseCategoryChart(),
        loadPujaComparisonCharts()
    ]);


    chartsLoaded = true;

}


// ======================================
// REPORT INIT
// ======================================

async function loadInit() {

    showLoading(true);

    try {

        const data =
            await apiFetch(
                "reportInit"
            );


        if (!data.success) {

            alert(
                data.message ||
                "Unable to load report."
            );

            return;
        }


        // ------------------------------
        // YEAR DROPDOWN
        // ------------------------------

        year.innerHTML =
            data.years.map(y => `
                <option value="${y}">
                    ${y}
                </option>
            `).join("");


        // ------------------------------
        // PUJA DROPDOWN
        // ------------------------------

        puja.innerHTML =
            data.pujas.map(p => `
                <option value="${p}">
                    ${p}
                </option>
            `).join("");


        // ------------------------------
        // SELECT YEAR
        // ------------------------------

        year.value =
            dashboardYear &&
            data.years.includes(dashboardYear)
                ? dashboardYear
                : data.selectedYear;


        // ------------------------------
        // SELECT PUJA
        // ------------------------------

        puja.value =
            dashboardPuja &&
            data.pujas.includes(dashboardPuja)
                ? dashboardPuja
                : data.selectedPuja;


        // ------------------------------
        // FIRST REPORT
        // ------------------------------

        await loadReport(false);

    }
    catch (error) {

        console.error(
            "Report initialization error:",
            error
        );

        alert(
            error.message ||
            "Unable to load report."
        );

    }
    finally {

        showLoading(false);

    }

}


// ======================================
// LOAD REPORT
// ======================================

async function loadReport(
    manageLoading = true
) {

    if (manageLoading) {
        showLoading(true);
    }


    try {

        const data =
            await apiFetch(
                "generateReport",
                {
                    year: year.value,
                    puja: puja.value
                }
            );


        if (!data.success) {

            alert(
                data.message ||
                "Report not found."
            );

            return false;
        }


        // ------------------------------
        // OVERVIEW
        // ------------------------------

        members.textContent =
            data.members;

        collection.textContent =
            formatMoney(
                data.totalCollection
            );

        expenses.textContent =
            formatMoney(
                data.totalExpense
            );

        balance.textContent =
            formatMoney(
                data.balance
            );


        const balanceColor =
            Number(data.balance) >= 0
                ? "#16a34a"
                : "#dc2626";


        balance.style.color =
            balanceColor;


        // ------------------------------
        // COLLECTION BREAKDOWN
        // ------------------------------

        roadCollection.textContent =
            formatMoney(
                data.roadCollection
            );

        villageCollection.textContent =
            formatMoney(
                data.villageCollection
            );

        memberCollection.textContent =
            formatMoney(
                data.memberCollection
            );


        // ------------------------------
        // SECONDARY CARDS
        // ------------------------------

        collection2.textContent =
            formatMoney(
                data.totalCollection
            );

        expenses2.textContent =
            formatMoney(
                data.totalExpense
            );

        balance2.textContent =
            formatMoney(
                data.balance
            );

        balance2.style.color =
            balanceColor;


        // ------------------------------
        // RESET CACHES
        // ------------------------------

        resetCollections();
        resetExpenses();
        resetCharts();


        console.log(
            "Report updated:",
            year.value,
            puja.value
        );


        return true;

    }
    catch (error) {

        console.error(
            "Report loading error:",
            error
        );

        alert(
            error.message ||
            "Unable to load report."
        );

        return false;

    }
    finally {

        if (manageLoading) {
            showLoading(false);
        }

    }

}


// ======================================
// GET ACTIVE TAB
// ======================================

function getActiveTab() {

    const activeButton =
        document.querySelector(
            ".tab-btn.active"
        );

    return activeButton
        ? activeButton.dataset.tab
        : null;

}


// ======================================
// RELOAD ACTIVE TAB
// ======================================

async function reloadActiveTab(
    manageLoading = true
) {

    if (manageLoading) {
        showLoading(true);
    }


    try {

        const activeTab =
            getActiveTab();


        if (activeTab === "collections") {

            await loadCollections(
                true,
                false
            );

        }

        else if (activeTab === "expenses") {

            await loadExpenses(
                true,
                false
            );

        }

        else if (activeTab === "charts") {

            await loadCharts(true);

        }


        return true;

    }
    catch (error) {

        console.error(
            "Active tab reload error:",
            error
        );

        return false;

    }
    finally {

        if (manageLoading) {
            showLoading(false);
        }

    }

}


// ======================================
// REFRESH REPORT + ACTIVE TAB
// ======================================

async function refreshReportAndActiveTab() {

    if (reportOperationRunning) {

        console.log(
            "Report operation already running."
        );

        return;
    }


    reportOperationRunning = true;

    showLoading(true);


    try {

        const success =
            await loadReport(false);


        if (!success) {
            return;
        }


        await reloadActiveTab(false);

    }
    catch (error) {

        console.error(
            "Report refresh operation error:",
            error
        );

    }
    finally {

        showLoading(false);

        reportOperationRunning = false;

    }

}


// ======================================
// TAB NAVIGATION
// ======================================

tabButtons.forEach(button => {

    button.addEventListener(
        "click",
        async () => {

            const tabName =
                button.dataset.tab;


            tabButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");


            tabContents.forEach(content => {

                content.classList.remove("active");
                content.hidden = true;

            });


            const selectedTab =
                document.getElementById(
                    tabName + "Tab"
                );


            if (!selectedTab) {

                console.error(
                    "Tab not found:",
                    tabName + "Tab"
                );

                return;
            }


            selectedTab.hidden = false;
            selectedTab.classList.add("active");


            try {

                if (
                    tabName === "collections"
                ) {

                    await loadCollections();

                }

                else if (
                    tabName === "expenses"
                ) {

                    await loadExpenses();

                }

                else if (
                    tabName === "charts"
                ) {

                    if (!chartsLoaded) {

                        showLoading(true);

                        try {
                            await loadCharts(true);
                        }
                        finally {
                            showLoading(false);
                        }

                    }

                }

            }
            catch (error) {

                console.error(
                    "Tab loading error:",
                    error
                );

            }

        }
    );

});


// ======================================
// GENERATE REPORT
// ======================================

if (generateBtn) {

    generateBtn.addEventListener(
        "click",
        refreshReportAndActiveTab
    );

}


// ======================================
// REFRESH REPORT
// ======================================

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        refreshReportAndActiveTab
    );

}


// ======================================
// YEAR CHANGE
// ======================================

if (year) {

    year.addEventListener(
        "change",
        refreshReportAndActiveTab
    );

}


// ======================================
// PUJA CHANGE
// ======================================

if (puja) {

    puja.addEventListener(
        "change",
        refreshReportAndActiveTab
    );

}


// ======================================
// BACK TO DASHBOARD
// ======================================

const backBtn =
    document.getElementById("backBtn");


if (backBtn) {

    backBtn.addEventListener(
        "click",
        () => {

            const role =
                sessionStorage.getItem(
                    "memberRole"
                );


            window.location.replace(
                role === "Admin"
                    ? "admin-dashboard.html"
                    : "member-dashboard.html"
            );

        }
    );

}


// ======================================
// VILLAGE SEARCH
// ======================================

if (villageSearch) {

    villageSearch.addEventListener(
        "input",
        () => {

            if (!collectionsData) return;


            const keyword =
                villageSearch.value
                    .trim()
                    .toLowerCase();


            const filtered =
                collectionsData.village.records
                    .filter(item => {

                        const contributor =
                            String(
                                item.contributor || ""
                            ).toLowerCase();

                        const collector =
                            String(
                                item.collector || ""
                            ).toLowerCase();


                        return (
                            contributor.includes(keyword) ||
                            collector.includes(keyword)
                        );

                    });


            renderVillageTable(filtered);

        }
    );

}


// ======================================
// MEMBER SEARCH
// ======================================

if (memberSearch) {

    memberSearch.addEventListener(
        "input",
        () => {

            if (!collectionsData) return;


            const keyword =
                memberSearch.value
                    .trim()
                    .toLowerCase();


            const filtered =
                collectionsData.members.records
                    .filter(item => {

                        const member =
                            String(
                                item.member || ""
                            ).toLowerCase();

                        const status =
                            String(
                                item.status || ""
                            ).toLowerCase();

                        const note =
                            String(
                                item.note || ""
                            ).toLowerCase();


                        return (
                            member.includes(keyword) ||
                            status.includes(keyword) ||
                            note.includes(keyword)
                        );

                    });


            renderMemberTable(filtered);

        }
    );

}


// ======================================
// EXPENSE SEARCH
// ======================================

if (expenseSearch) {

    expenseSearch.addEventListener(
        "input",
        () => {

            if (
                !expensesData ||
                !expensesData.records
            ) {
                return;
            }


            const keyword =
                expenseSearch.value
                    .trim()
                    .toLowerCase();


            const filtered =
                expensesData.records
                    .filter(item => {

                        const expenseId =
                            String(
                                item.expenseId || ""
                            ).toLowerCase();

                        const expenseName =
                            String(
                                item.expenseName || ""
                            ).toLowerCase();

                        const paidBy =
                            String(
                                item.paidBy || ""
                            ).toLowerCase();

                        const note =
                            String(
                                item.note || ""
                            ).toLowerCase();


                        return (
                            expenseId.includes(keyword) ||
                            expenseName.includes(keyword) ||
                            paidBy.includes(keyword) ||
                            note.includes(keyword)
                        );

                    });


            renderExpenseTable(filtered);

        }
    );

}


// ======================================
// START
// ======================================

loadInit();



// ============================================================
// MURGABANI 1 TO 100 CLUB
// REPORT SYSTEM
// PRINT + PDF
// OPTIMIZED / MOBILE SAFE / CHART.JS SAFE
// ============================================================

(() => {

"use strict";


// ============================================================
// GLOBAL REPORT OPERATION LOCK
// ============================================================

window.reportOperationRunning =
    window.reportOperationRunning || false;


// ============================================================
// INITIALIZATION LOCKS
// ============================================================

let reportEventsInitialized = false;
let reportAppInitialized = false;


// ============================================================
// SAFE ELEMENT GETTER
// ============================================================

function getReportElement(id) {
    return document.getElementById(id);
}


// ============================================================
// REPORT ELEMENTS
//
// IMPORTANT:
// Elements are retrieved dynamically instead of being captured
// before DOM is ready.
// ============================================================

function getReportElements() {

    return {

        year:
            getReportElement("year"),

        puja:
            getReportElement("puja"),

        members:
            getReportElement("members"),

        villageCollection:
            getReportElement("villageCollection"),

        memberCollection:
            getReportElement("memberCollection"),

        roadCollection:
            getReportElement("roadCollection"),

        collection:
            getReportElement("collection"),

        expenses:
            getReportElement("expenses"),

        balance:
            getReportElement("balance"),

        printBtn:
            getReportElement("printBtn"),

        pdfBtn:
            getReportElement("pdfBtn")

    };

}


// ============================================================
// SAFE TEXT VALUE
// ============================================================

function getElementText(element) {

    if (!element) {
        return "";
    }

    return String(
        element.textContent || ""
    ).trim();

}


// ============================================================
// PDF COLORS
// ============================================================

const PDF_PRIMARY = [22, 50, 102];
const PDF_GOLD = [212, 175, 55];
const PDF_DARK = [30, 41, 59];
const PDF_LIGHT = [245, 247, 250];


// ============================================================
// CLUB LOGO
// ============================================================

const PDF_LOGO_URL = "images/logo.png";


// ============================================================
// PRINT REPORT
// ============================================================

function initializePrintReport() {

    const elements =
        getReportElements();

    const printBtn =
        elements.printBtn;


    if (!printBtn) {

        console.warn(
            "printBtn not found."
        );

        return;

    }


    // Prevent duplicate listener
    if (
        printBtn.dataset.reportPrintReady === "true"
    ) {
        return;
    }


    printBtn.dataset.reportPrintReady =
        "true";


    printBtn.addEventListener(
        "click",
        () => {

            try {

                const year =
                    getReportElement("year");

                const puja =
                    getReportElement("puja");


                const reportData = {

                    year:
                        year ? year.value : "",

                    puja:
                        puja ? puja.value : "",

                    members:
                        getElementText(
                            getReportElement("members")
                        ),

                    villageCollection:
                        getElementText(
                            getReportElement(
                                "villageCollection"
                            )
                        ),

                    memberCollection:
                        getElementText(
                            getReportElement(
                                "memberCollection"
                            )
                        ),

                    roadCollection:
                        getElementText(
                            getReportElement(
                                "roadCollection"
                            )
                        ),

                    totalCollection:
                        getElementText(
                            getReportElement(
                                "collection"
                            )
                        ),

                    totalExpense:
                        getElementText(
                            getReportElement(
                                "expenses"
                            )
                        ),

                    balance:
                        getElementText(
                            getReportElement(
                                "balance"
                            )
                        )

                };


                // ------------------------------------------
                // SAVE REPORT DATA
                // ------------------------------------------

                try {

                    sessionStorage.setItem(
                        "clubReport",
                        JSON.stringify(
                            reportData
                        )
                    );

                }

                catch (storageError) {

                    console.warn(
                        "Session storage unavailable:",
                        storageError
                    );

                }


                // ------------------------------------------
                // BUILD URL
                // ------------------------------------------

                const selectedYear =
                    year ? year.value : "";

                const selectedPuja =
                    puja ? puja.value : "";


                const printURL =
                    "print-report.html" +
                    "?year=" +
                    encodeURIComponent(
                        selectedYear
                    ) +
                    "&puja=" +
                    encodeURIComponent(
                        selectedPuja
                    );


                // ------------------------------------------
                // OPEN PRINT REPORT
                // ------------------------------------------

                const printWindow =
                    window.open(
                        printURL,
                        "_blank"
                    );


                if (!printWindow) {

                    alert(
                        "Print report could not be opened.\n\n" +
                        "Please allow pop-ups for this website."
                    );

                }

            }

            catch (error) {

                console.error(
                    "Print report error:",
                    error
                );

                alert(
                    "Unable to prepare the print report."
                );

            }

        }
    );

}


// ============================================================
// GET CHART.JS INSTANCE
// ============================================================

function getChartInstance(canvas) {

    if (!canvas) {
        return null;
    }


    try {

        if (
            typeof Chart !== "undefined" &&
            typeof Chart.getChart === "function"
        ) {

            return Chart.getChart(canvas);

        }

    }

    catch (error) {

        console.warn(
            "Unable to get Chart.js instance:",
            error
        );

    }


    return null;

}




// ============================================================
// CHART → PDF IMAGE
// MOBILE SAFE / CHART.JS 3/4 SAFE
// USES EXISTING RENDERED CHART
// ============================================================

function addChartToPDF(
    pdf,
    canvasId,
    x,
    y,
    width,
    height
) {

    try {

        const canvas =
            document.getElementById(canvasId);


        if (!canvas) {

            console.warn(
                "PDF chart canvas not found:",
                canvasId
            );

            return false;

        }


        // ------------------------------------------
        // FIND EXISTING CHART
        // ------------------------------------------

        let chart = null;


        try {

            if (
                typeof Chart !== "undefined" &&
                typeof Chart.getChart === "function"
            ) {

                chart =
                    Chart.getChart(canvas);

            }

        }

        catch (error) {

            console.warn(
                "Chart.js instance lookup failed:",
                canvasId,
                error
            );

        }


        // ------------------------------------------
        // VALIDATE CANVAS
        // ------------------------------------------

        if (
            !canvas.width ||
            !canvas.height
        ) {

            console.warn(
                "Chart canvas has invalid dimensions:",
                canvasId,
                canvas.width,
                canvas.height
            );

            return false;

        }


        // ------------------------------------------
        // GIVE CHART.JS A MOMENT TO FINISH RENDERING
        // ------------------------------------------

        if (chart) {

            try {

                chart.stop();

            }

            catch (error) {

                console.warn(
                    "Unable to stop chart animation:",
                    error
                );

            }

        }


        // ------------------------------------------
        // FORCE CURRENT CHART RENDER
        // ------------------------------------------

        if (chart) {

            try {

                chart.update(
                    "none"
                );

            }

            catch (error) {

                console.warn(
                    "Chart update warning:",
                    canvasId,
                    error
                );

            }

        }


        // ------------------------------------------
        // EXPORT IMAGE
        // ------------------------------------------

        let imageData = null;


        // First try Chart.js native export
        if (
            chart &&
            typeof chart.toBase64Image ===
            "function"
        ) {

            try {

                imageData =
                    chart.toBase64Image(
                        "image/png",
                        1
                    );

            }

            catch (error) {

                console.warn(
                    "Chart.js export failed:",
                    canvasId,
                    error
                );

            }

        }


        // ------------------------------------------
        // FALLBACK: CANVAS
        // ------------------------------------------

        if (
            !imageData
        ) {

            try {

                imageData =
                    canvas.toDataURL(
                        "image/png",
                        1
                    );

            }

            catch (error) {

                console.warn(
                    "Canvas export failed:",
                    canvasId,
                    error
                );

            }

        }


        // ------------------------------------------
        // VALIDATE IMAGE
        // ------------------------------------------

        if (
            typeof imageData !== "string" ||
            !imageData.startsWith(
                "data:image/"
            )
        ) {

            console.warn(
                "Chart image unavailable:",
                canvasId
            );

            return false;

        }


        // ------------------------------------------
        // ADD IMAGE TO PDF
        // ------------------------------------------

        pdf.addImage(
            imageData,
            "PNG",
            x,
            y,
            width,
            height,
            canvasId,
            "FAST"
        );


        console.log(
            "Chart successfully added to PDF:",
            canvasId
        );


        return true;

    }

    catch (error) {

        console.error(
            "PDF chart error:",
            canvasId,
            error
        );

        return false;

    }

}
  




// ============================================================
// LOAD LOGO
// ============================================================

function loadPDFLogo() {

    return new Promise(
        (resolve) => {

            const img =
                new Image();


            img.onload = () => {

                try {

                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    const maxWidth = 500;
                    const maxHeight = 500;


                    let width =
                        img.naturalWidth;

                    let height =
                        img.naturalHeight;


                    if (
                        !width ||
                        !height
                    ) {

                        resolve(null);

                        return;

                    }


                    if (
                        width > maxWidth
                    ) {

                        const ratio =
                            maxWidth /
                            width;

                        width =
                            maxWidth;

                        height =
                            height *
                            ratio;

                    }


                    if (
                        height > maxHeight
                    ) {

                        const ratio =
                            maxHeight /
                            height;

                        height =
                            maxHeight;

                        width =
                            width *
                            ratio;

                    }


                    canvas.width =
                        Math.round(
                            width
                        );

                    canvas.height =
                        Math.round(
                            height
                        );


                    const ctx =
                        canvas.getContext(
                            "2d"
                        );


                    if (!ctx) {

                        resolve(null);

                        return;

                    }


                    ctx.drawImage(
                        img,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                    resolve(
                        canvas.toDataURL(
                            "image/png"
                        )
                    );

                }

                catch (error) {

                    console.warn(
                        "Logo conversion failed:",
                        error
                    );

                    resolve(null);

                }

            };


            img.onerror = () => {

                console.warn(
                    "PDF logo could not be loaded:",
                    PDF_LOGO_URL
                );

                resolve(null);

            };


            img.src =
                PDF_LOGO_URL;

        }
    );

}


// ============================================================
// DRAW PDF HEADER
// ============================================================

function drawPDFHeader(
    pdf,
    logoData,
    title,
    subtitle = ""
) {

    const pageWidth =
        pdf.internal.pageSize.getWidth();


    // ------------------------------------------
    // HEADER BACKGROUND
    // ------------------------------------------

    pdf.setFillColor(
        ...PDF_PRIMARY
    );

    pdf.rect(
        0,
        0,
        pageWidth,
        28,
        "F"
    );


    // ------------------------------------------
    // GOLD LINE
    // ------------------------------------------

    pdf.setFillColor(
        ...PDF_GOLD
    );

    pdf.rect(
        0,
        27,
        pageWidth,
        1,
        "F"
    );


    // ------------------------------------------
    // LOGO
    // ------------------------------------------

    if (logoData) {

        try {

            pdf.addImage(
                logoData,
                "PNG",
                12,
                4,
                20,
                20,
                undefined,
                "FAST"
            );

        }

        catch (error) {

            console.warn(
                "Unable to add logo:",
                error
            );

        }

    }


    // ------------------------------------------
    // CLUB NAME
    // ------------------------------------------

    pdf.setTextColor(
        255,
        255,
        255
    );

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        17
    );


    pdf.text(
        "MURGABANI 1 TO 100 CLUB",
        36,
        12
    );


    // ------------------------------------------
    // SUBTITLE
    // ------------------------------------------

    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        11
    );


    pdf.text(
        "Management & Information System",
        36,
        19
    );


    // ------------------------------------------
    // PAGE TITLE
    // ------------------------------------------

    if (title) {

        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.setFontSize(
            14
        );


        pdf.text(
            title,
            pageWidth - 15,
            12,
            {
                align: "right"
            }
        );

    }


    // ------------------------------------------
    // PAGE SUBTITLE
    // ------------------------------------------

    if (subtitle) {

        pdf.setFont(
            "helvetica",
            "normal"
        );

        pdf.setFontSize(
            10
        );


        pdf.text(
            subtitle,
            pageWidth - 15,
            19,
            {
                align: "right"
            }
        );

    }

}


// ============================================================
// DRAW PDF FOOTER
// ============================================================

function drawPDFFooter(
    pdf,
    pageNumber,
    totalPages
) {

    const pageWidth =
        pdf.internal.pageSize.getWidth();

    const pageHeight =
        pdf.internal.pageSize.getHeight();


    pdf.setDrawColor(
        ...PDF_PRIMARY
    );

    pdf.setLineWidth(
        0.4
    );


    pdf.line(
        15,
        pageHeight - 15,
        pageWidth - 15,
        pageHeight - 15
    );


    pdf.setTextColor(
        100,
        100,
        100
    );

    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        7.5
    );


    pdf.text(
        "MURGABANI 1 TO 100 CLUB",
        15,
        pageHeight - 9
    );


    pdf.text(
        "Financial Statement",
        pageWidth / 2,
        pageHeight - 9,
        {
            align: "center"
        }
    );


    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        8
    );

    pdf.setTextColor(
        ...PDF_PRIMARY
    );


    pdf.text(
        `${pageNumber}/${totalPages}`,
        pageWidth - 15,
        pageHeight - 9,
        {
            align: "right"
        }
    );

}


// ============================================================
// APPLY HEADER + FOOTER
//
// NOTE:
// Header/footer are applied after all pages are created.
// This prevents accidental page-count problems.
// ============================================================

/* function applyPDFHeadersAndFooters(
    pdf,
    logoData
) {

    const totalPages =
        pdf.getNumberOfPages();


    const yearElement =
        getReportElement("year");

    const pujaElement =
        getReportElement("puja");


    const selectedYear =
        yearElement
            ? yearElement.value
            : "";

    const selectedPuja =
        pujaElement
            ? pujaElement.value
            : "";


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        pdf.setPage(
            page
        );


        let title =
            "FINANCIAL REPORT";


        if (page === 1) {

            title =
                "FINANCIAL STATEMENT";

        }

        else if (page === 2) {

            title =
                "VILLAGE COLLECTION";

        }

        else if (page === 3) {

            title =
                "MEMBERS COLLECTION";

        }

        else if (page === 4) {

            title =
                "EXPENSE DETAILS";

        }

        else if (page >= 5) {

            title =
                "FINANCIAL CHARTS";

        }


        const subtitle =
            `${selectedYear} • ${selectedPuja}`;


        drawPDFHeader(
            pdf,
            logoData,
            title,
            subtitle
        );


        drawPDFFooter(
            pdf,
            page,
            totalPages
        );

    }

}*/


    
function applyPDFHeadersAndFooters(pdf, logoData, pageTitles = {}) {
    const totalPages = pdf.getNumberOfPages();

    const yearElement = getReportElement("year");
    const pujaElement = getReportElement("puja");

    const selectedYear = yearElement ? yearElement.value : "";
    const selectedPuja = pujaElement ? pujaElement.value : "";

    for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);

        // Use the section assigned to this actual PDF page.
        // This also handles automatically added continuation pages.
        const title = pageTitles[page] || "FINANCIAL REPORT";

        const subtitle = `${selectedYear} • ${selectedPuja}`;

        drawPDFHeader(pdf, logoData, title, subtitle);
        drawPDFFooter(pdf, page, totalPages);
    }
}


// ============================================================
// SAFE NUMBER
// ============================================================

function getPDFNumber(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return 0;

    }


    let text =
        String(value)
            .replace(/₹/g, "")
            .replace(/Rs\.?/gi, "")
            .replace(/,/g, "")
            .replace(/\s+/g, "")
            .trim();


    text =
        text.replace(
            /[^0-9.-]/g,
            ""
        );


    const number =
        Number(text);


    return Number.isFinite(number)
        ? number
        : 0;

}


// ============================================================
// CLEAN PDF VALUE
// ============================================================

function cleanPDFValue(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        return "Rs. 0";

    }


    const raw =
        String(value)
            .replace(/₹/g, "")
            .replace(/Rs\.?/gi, "")
            .replace(/,/g, "")
            .trim();


    const numericValue =
        Number(raw);


    if (
        raw !== "" &&
        Number.isFinite(
            numericValue
        )
    ) {

        return (
            "Rs. " +
            numericValue.toLocaleString(
                "en-IN"
            )
        );

    }


    return String(value).trim();

}


// ============================================================
// CLEAN PDF TEXT
// ============================================================

function cleanPDFText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /\u00A0/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


// ============================================================
// FORMAT PDF MONEY
// ============================================================

function formatPDFMoney(value) {

    return (
        "Rs. " +
        getPDFNumber(value)
            .toLocaleString(
                "en-IN"
            )
    );

}


// ============================================================
// SAFE ASYNC LOADER
//
// Prevents infinite waiting.
// ============================================================

async function safeReportLoader(
    loaderFunction,
    name,
    timeout = 5000
) {

    if (
        typeof loaderFunction !==
        "function"
    ) {

        return false;

    }


    let timeoutId;


    try {

        const loaderPromise =
            Promise.resolve(
                loaderFunction()
            );


        const timeoutPromise =
            new Promise(
                resolve => {

                    timeoutId =
                        setTimeout(
                            () => {

                                console.warn(
                                    `${name} timed out. Continuing.`
                                );

                                resolve(
                                    false
                                );

                            },
                            timeout
                        );

                }
            );


        const result =
            await Promise.race([

                loaderPromise,

                timeoutPromise

            ]);


        clearTimeout(
            timeoutId
        );


        return result !== false;

    }

    catch (error) {

        clearTimeout(
            timeoutId
        );


        console.warn(
            `${name} failed. Continuing PDF generation:`,
            error
        );


        return false;

    }

}


// ============================================================
// LOAD OPTIONAL REPORT DATA
//
// Faster than the old sequential approach.
// ============================================================

async function preparePDFData() {

    const loaders = [];


    // ------------------------------------------
    // Collections
    // ------------------------------------------

    if (
        typeof loadCollections ===
        "function"
    ) {

        loaders.push(
            safeReportLoader(
                () =>
                    loadCollections(
                        true,
                        false
                    ),
                "Collection loader",
                5000
            )
        );

    }


    // ------------------------------------------
    // Expenses
    // ------------------------------------------

    if (
        typeof loadExpenses ===
        "function"
    ) {

        loaders.push(
            safeReportLoader(
                () =>
                    loadExpenses(
                        true,
                        false
                    ),
                "Expense loader",
                5000
            )
        );

    }


    // ------------------------------------------
    // IMPORTANT:
    //
    // Do NOT automatically call loadCharts().
    //
    // Existing charts on the page are preferred.
    // ------------------------------------------


    if (
        loaders.length
    ) {

        await Promise.all(
            loaders
        );

    }

}


// ============================================================
// COLLECT TABLE ROWS
// ============================================================

function getTableRows(
    selector,
    minimumCells
) {

    const rows = [];


    document
        .querySelectorAll(selector)
        .forEach(
            tr => {

                const cells =
                    tr.querySelectorAll(
                        "td"
                    );


                if (
                    cells.length >=
                    minimumCells
                ) {

                    rows.push(
                        Array.from(
                            cells
                        ).map(
                            cell =>
                                cleanPDFText(
                                    cell.textContent
                                )
                        )
                    );

                }

            }
        );


    return rows;

}


// ============================================================
// ADD SUMMARY PAGE
// ============================================================

function buildSummaryPage(
    pdf,
    selectedYear,
    selectedPuja
) {

    pdf.setTextColor(
        0,
        0,
        0
    );


    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        20
    );


    pdf.text(
        "Financial Statement Report",
        105,
        40,
        {
            align: "center"
        }
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        10
    );

    pdf.setTextColor(
        80,
        80,
        80
    );


    pdf.text(
        `Financial Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        47,
        {
            align: "center"
        }
    );


    const now =
        new Date();


    pdf.setFontSize(
        8.5
    );

    pdf.setTextColor(
        110,
        110,
        110
    );


    pdf.text(
        `Generated on: ${now.toLocaleString("en-IN")}`,
        105,
        53,
        {
            align: "center"
        }
    );


    pdf.setDrawColor(
        ...PDF_GOLD
    );

    pdf.setLineWidth(
        0.8
    );


    pdf.line(
        15,
        59,
        195,
        59
    );


    const pdfMembers =
    cleanPDFText(
        getElementText(
            getReportElement("members")
        )
    );


    const pdfVillageCollection =
        cleanPDFValue(
            getElementText(
                getReportElement(
                    "villageCollection"
                )
            )
        );


    const pdfMemberCollection =
        cleanPDFValue(
            getElementText(
                getReportElement(
                    "memberCollection"
                )
            )
        );


    const pdfRoadCollection =
        cleanPDFValue(
            getElementText(
                getReportElement(
                    "roadCollection"
                )
            )
        );


    const pdfTotalCollection =
        cleanPDFValue(
            getElementText(
                getReportElement(
                    "collection"
                )
            )
        );


    const pdfTotalExpenses =
        cleanPDFValue(
            getElementText(
                getReportElement(
                    "expenses"
                )
            )
        );


    const pdfBalance =
        cleanPDFValue(
            getElementText(
                getReportElement(
                    "balance"
                )
            )
        );


    // ------------------------------------------
    // SUMMARY TABLE
    // ------------------------------------------

    pdf.autoTable({

        startY: 67,

        theme: "grid",

        head: [[
            "Financial Particulars",
            "Amount / Value"
        ]],

        body: [

            [
                "Total Members",
                pdfMembers
            ],

            [
                "Village Collection",
                pdfVillageCollection
            ],

            [
                "Members Collection",
                pdfMemberCollection
            ],

            [
                "Road Collection",
                pdfRoadCollection
            ],

            [
                "Total Collection",
                pdfTotalCollection
            ],

            [
                "Total Expenses",
                pdfTotalExpenses
            ],

            [
                "Available Balance",
                pdfBalance
            ]

        ],

        headStyles: {

            fillColor:
                PDF_PRIMARY,

            textColor:
                255,

            fontStyle:
                "bold",

            fontSize:
                10,

            halign:
                "center",

            cellPadding:
                4

        },

        bodyStyles: {

            fontSize:
                10,

            cellPadding:
                4,

            textColor:
                PDF_DARK

        },

        alternateRowStyles: {

            fillColor:
                PDF_LIGHT

        },

        columnStyles: {

            0: {

                cellWidth:
                    105,

                halign:
                    "left"

            },

            1: {

                cellWidth:
                    75,

                halign:
                    "right",

                fontStyle:
                    "bold"

            }

        },

        margin: {

            left:
                15,

            right:
                15

        },

        tableWidth:
            180,

        tableLineColor:
            [210, 214, 220],

        tableLineWidth:
            0.25

    });


    // ------------------------------------------
    // BALANCE STATUS
    // ------------------------------------------

    const balanceValue =
        getPDFNumber(
            getElementText(
                getReportElement(
                    "balance"
                )
            )
        );


    pdf.setFillColor(

        balanceValue >= 0
            ? 232
            : 254,

        balanceValue >= 0
            ? 247
            : 242,

        balanceValue >= 0
            ? 237
            : 242

    );


    pdf.roundedRect(
        15,
        150,
        180,
        18,
        3,
        3,
        "F"
    );


    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        10
    );

    pdf.setTextColor(
        ...PDF_DARK
    );


    pdf.text(
        "Financial Status",
        25,
        158
    );


    pdf.setFontSize(
        12
    );


    pdf.setTextColor(

        balanceValue >= 0
            ? 22
            : 220,

        balanceValue >= 0
            ? 163
            : 38,

        balanceValue >= 0
            ? 74
            : 38

    );


    pdf.text(
        balanceValue >= 0
            ? "SURPLUS"
            : "DEFICIT",
        25,
        165
    );


    pdf.setTextColor(
        ...PDF_DARK
    );

    pdf.setFontSize(
        10
    );


    pdf.text(
        `Balance: ${pdfBalance}`,
        190,
        161,
        {
            align: "right"
        }
    );


    // ------------------------------------------
    // AUTHORIZATION
    // ------------------------------------------

    const pageHeight =
        pdf.internal.pageSize.getHeight();


    const signatureY =
        pageHeight - 42;


    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        10
    );

    pdf.setTextColor(
        ...PDF_PRIMARY
    );


    pdf.text(
        "AUTHORIZATION",
        105,
        signatureY - 13,
        {
            align: "center"
        }
    );


    pdf.setDrawColor(
        80,
        80,
        80
    );

    pdf.setLineWidth(
        0.4
    );


    pdf.line(
        20,
        signatureY,
        65,
        signatureY
    );

    pdf.line(
        82,
        signatureY,
        127,
        signatureY
    );

    pdf.line(
        145,
        signatureY,
        190,
        signatureY
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        9
    );

    pdf.setTextColor(
        60,
        60,
        60
    );


    pdf.text(
        "President",
        42.5,
        signatureY + 6,
        {
            align: "center"
        }
    );


    pdf.text(
        "Treasurer",
        104.5,
        signatureY + 6,
        {
            align: "center"
        }
    );


    pdf.text(
        "Secretary",
        167.5,
        signatureY + 6,
        {
            align: "center"
        }
    );


    pdf.setFontSize(
        7.5
    );

    pdf.setTextColor(
        120,
        120,
        120
    );


    pdf.text(
        "Authorized signatures",
        105,
        signatureY + 14,
        {
            align: "center"
        }
    );

}


// ============================================================
// ADD VILLAGE PAGE
// ============================================================

function buildVillagePage(
    pdf,
    selectedYear,
    selectedPuja
) {

    pdf.addPage();


    pdf.setTextColor(
        0,
        0,
        0
    );

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        18
    );


    pdf.text(
        "VILLAGE COLLECTION DETAILS",
        105,
        18,
        {
            align: "center"
        }
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        10
    );


    pdf.text(
        `Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        25,
        {
            align: "center"
        }
    );


    pdf.setDrawColor(
        ...PDF_PRIMARY
    );

    pdf.setLineWidth(
        0.6
    );


    pdf.line(
        15,
        30,
        195,
        30
    );


    const villageRows =
        getTableRows(
            "#villageTableBody tr",
            4
        );


    pdf.autoTable({

        startY:
            38,

        theme:
            "grid",

        head: [[
            "Date",
            "Contributor Name",
            "Collector",
            "Amount"
        ]],

        body:

            villageRows.length

                ? villageRows.map(
                    row => [

                        row[0],
                        row[1],
                        row[2],
                        cleanPDFValue(
                            row[3]
                        )

                    ]
                )

                : [[
                    "No records",
                    "",
                    "",
                    "Rs. 0"
                ]],

        headStyles: {

            fillColor:
                PDF_PRIMARY,

            textColor:
                255,

            fontStyle:
                "bold",

            fontSize:
                9,

            halign:
                "center",

            cellPadding:
                3.5

        },

        bodyStyles: {

            fontSize:
                8.5,

            cellPadding:
                3.2,

            textColor:
                PDF_DARK

        },

        alternateRowStyles: {

            fillColor:
                PDF_LIGHT

        },

        columnStyles: {

            0: {
                cellWidth: 32
            },

            1: {
                cellWidth: 55
            },

            2: {
                cellWidth: 55
            },

            3: {

                cellWidth: 38,

                halign:
                    "right",

                fontStyle:
                    "bold"

            }

        },

        margin: {

            top:
                38,

            left:
                15,

            right:
                15,

            bottom:
                22

        },

        tableLineColor:
            [210, 214, 220],

        tableLineWidth:
            0.25,

        showHead:
            "everyPage"

    });

}


// ============================================================
// ADD MEMBERS PAGE
// ============================================================

function buildMemberPage(
    pdf,
    selectedYear,
    selectedPuja
) {

    pdf.addPage();


    pdf.setTextColor(
        0,
        0,
        0
    );

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        18
    );


    pdf.text(
        "MEMBERS COLLECTION DETAILS",
        105,
        18,
        {
            align: "center"
        }
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        10
    );


    pdf.text(
        `Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        25,
        {
            align: "center"
        }
    );


    pdf.setDrawColor(
        ...PDF_PRIMARY
    );

    pdf.setLineWidth(
        0.6
    );


    pdf.line(
        15,
        30,
        195,
        30
    );


    const memberRows =
        getTableRows(
            "#memberTableBody tr",
            5
        );


    pdf.autoTable({

        startY:
            38,

        theme:
            "grid",

        head: [[
            "Date",
            "Member Name",
            "Amount",
            "Status",
            "Note"
        ]],

        body:

            memberRows.length

                ? memberRows.map(
                    row => [

                        row[0],
                        row[1],
                        cleanPDFValue(
                            row[2]
                        ),
                        row[3],
                        row[4]

                    ]
                )

                : [[
                    "No records",
                    "",
                    "Rs. 0",
                    "",
                    ""
                ]],

        headStyles: {

            fillColor:
                PDF_PRIMARY,

            textColor:
                255,

            fontStyle:
                "bold",

            fontSize:
                9,

            halign:
                "center",

            cellPadding:
                3.5

        },

        bodyStyles: {

            fontSize:
                8.5,

            cellPadding:
                3.2,

            textColor:
                PDF_DARK

        },

        alternateRowStyles: {

            fillColor:
                PDF_LIGHT

        },

        columnStyles: {

            0: {
                cellWidth: 28
            },

            1: {
                cellWidth: 48
            },

            2: {

                cellWidth: 30,

                halign:
                    "right",

                fontStyle:
                    "bold"

            },

            3: {
                cellWidth: 30
            },

            4: {
                cellWidth: 44
            }

        },

        margin: {

            top:
                38,

            left:
                15,

            right:
                15,

            bottom:
                22

        },

        tableLineColor:
            [210, 214, 220],

        tableLineWidth:
            0.25,

        showHead:
            "everyPage"

    });

}


// ============================================================
// ADD EXPENSE PAGE
// ============================================================

function buildExpensePage(
    pdf,
    selectedYear,
    selectedPuja
) {

    pdf.addPage();


    pdf.setTextColor(
        0,
        0,
        0
    );

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        18
    );


    pdf.text(
        "EXPENSE DETAILS",
        105,
        18,
        {
            align: "center"
        }
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        10
    );


    pdf.text(
        `Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        25,
        {
            align: "center"
        }
    );


    pdf.setDrawColor(
        ...PDF_PRIMARY
    );

    pdf.setLineWidth(
        0.6
    );


    pdf.line(
        15,
        30,
        195,
        30
    );


    const expenseRows =
        getTableRows(
            "#expenseTableBody tr",
            6
        );


    pdf.autoTable({

        startY:
            38,

        theme:
            "grid",

        head: [[
            "ID",
            "Date",
            "Expense",
            "Amount",
            "Paid By",
            "Note"
        ]],

        body:

            expenseRows.length

                ? expenseRows.map(
                    row => [

                        row[0],
                        row[1],
                        row[2],
                        formatPDFMoney(
                            row[3]
                        ),
                        row[4],
                        row[5]

                    ]
                )

                : [[
                    "No records",
                    "",
                    "",
                    "Rs. 0",
                    "",
                    ""
                ]],

        headStyles: {

            fillColor:
                PDF_PRIMARY,

            textColor:
                255,

            fontStyle:
                "bold",

            fontSize:
                8.5,

            halign:
                "center",

            cellPadding:
                3

        },

        bodyStyles: {

            fontSize:
                8,

            cellPadding:
                3,

            textColor:
                PDF_DARK

        },

        alternateRowStyles: {

            fillColor:
                PDF_LIGHT

        },

        columnStyles: {

            0: {
                cellWidth: 24
            },

            1: {
                cellWidth: 27
            },

            2: {
                cellWidth: 38
            },

            3: {

                cellWidth: 30,

                halign:
                    "right",

                fontStyle:
                    "bold"

            },

            4: {
                cellWidth: 33
            },

            5: {
                cellWidth: 28
            }

        },

        margin: {

            top:
                38,

            left:
                15,

            right:
                15,

            bottom:
                22

        },

        tableLineColor:
            [210, 214, 220],

        tableLineWidth:
            0.25,

        showHead:
            "everyPage"

    });

}


// ============================================================
// ADD CHART PAGE
// ============================================================

function buildChartsPage(
    pdf,
    selectedPuja
) {

    pdf.addPage();


    pdf.setTextColor(
        0,
        0,
        0
    );

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        18
    );


    pdf.text(
        "FINANCIAL CHARTS",
        105,
        18,
        {
            align: "center"
        }
    );


    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        10
    );


    const yearElement =
        getReportElement(
            "year"
        );


    const selectedYear =
        yearElement
            ? yearElement.value
            : "";


    pdf.text(
        `Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        25,
        {
            align: "center"
        }
    );


    pdf.setDrawColor(
        ...PDF_PRIMARY
    );

    pdf.setLineWidth(
        0.6
    );


    pdf.line(
        15,
        30,
        195,
        30
    );


    // ==================================================
    // COLLECTION DISTRIBUTION
    // ==================================================

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        13
    );

    pdf.setTextColor(
        ...PDF_PRIMARY
    );


    pdf.text(
        "Collection Distribution",
        15,
        40
    );


    const collectionChartAdded =
        addChartToPDF(
            pdf,
            "collectionChart",
            55,
            45,
            105,
            80
        );


    if (
        !collectionChartAdded
    ) {

        pdf.setFont(
            "helvetica",
            "normal"
        );

        pdf.setFontSize(
            10
        );

        pdf.setTextColor(
            ...PDF_DARK
        );


        pdf.text(
            "Collection chart unavailable.",
            15,
            55
        );

    }


    // ==================================================
    // EXPENSE CATEGORY
    // ==================================================

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        13
    );

    pdf.setTextColor(
        ...PDF_PRIMARY
    );


    pdf.text(
        "Expense Category Distribution",
        15,
        130
    );


    const expenseChartAdded =
        addChartToPDF(
            pdf,
            "expenseCategoryChart",
            55,
            135,
            105,
            80
        );


    if (
        !expenseChartAdded
    ) {

        pdf.setFont(
            "helvetica",
            "normal"
        );

        pdf.setFontSize(
            10
        );

        pdf.setTextColor(
            ...PDF_DARK
        );


        pdf.text(
            "Expense category chart unavailable.",
            15,
            145
        );

    }


    // ==================================================
    // SELECTED PUJA CHART
    // ==================================================

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        13
    );

    pdf.setTextColor(
        ...PDF_PRIMARY
    );


    pdf.text(
        `${selectedPuja} - Collection vs Expense`,
        15,
        220
    );


    const selectedPujaLower =
        String(
            selectedPuja || ""
        )
        .toLowerCase();


    let selectedPujaCanvasId =
        null;


    if (
        selectedPujaLower.includes(
            "saraswati"
        )
    ) {

        selectedPujaCanvasId =
            "saraswatiChart";

    }

    else if (
        selectedPujaLower.includes(
            "laxmi"
        ) ||
        selectedPujaLower.includes(
            "lakshmi"
        )
    ) {

        selectedPujaCanvasId =
            "laxmiChart";

    }


    const pujaChartAdded =
        selectedPujaCanvasId

            ? addChartToPDF(
                pdf,
                selectedPujaCanvasId,
                55,
                225,
                100,
                55
            )

            : false;


    if (
        !pujaChartAdded
    ) {

        pdf.setFont(
            "helvetica",
            "normal"
        );

        pdf.setFontSize(
            10
        );

        pdf.setTextColor(
            ...PDF_DARK
        );


        pdf.text(
            "Selected Puja chart unavailable.",
            15,
            235
        );

    }

}


// ============================================================
// DOWNLOAD PDF
// ============================================================

async function generateReportPDF(
    pdfBtn
) {

    // ==================================================
    // PREVENT DOUBLE CLICK
    // ==================================================

    if (
        window.reportOperationRunning
    ) {

        console.log(
            "PDF operation already running."
        );

        return;

    }


    window.reportOperationRunning =
        true;


    const originalButtonText =
        pdfBtn.innerHTML;


    pdfBtn.disabled =
        true;


    // ==================================================
    // LOADING ON
    // ==================================================

    try {

        if (
            typeof showLoading ===
            "function"
        ) {

            showLoading(
                true
            );

        }

    }

    catch (error) {

        console.warn(
            "Loading UI error:",
            error
        );

    }


    try {

        // ==================================================
        // SELECTED YEAR / PUJA
        // ==================================================

        const yearElement =
            getReportElement(
                "year"
            );

        const pujaElement =
            getReportElement(
                "puja"
            );


        const selectedYear =
            yearElement
                ? yearElement.value
                : "";


        const selectedPuja =
            pujaElement
                ? pujaElement.value
                : "";


        // ==================================================
        // PREPARE DATA
        //
        // Collection + expense loaders run in parallel.
        // ==================================================

        await preparePDFData();


        // ==================================================
        // CHECK jsPDF
        // ==================================================

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            throw new Error(
                "jsPDF library is not loaded."
            );

        }


        const {
            jsPDF
        } =
            window.jspdf;


        // ==================================================
        // CREATE PDF
        // ==================================================

        const pdf =
            new jsPDF({

                orientation:
                    "portrait",

                unit:
                    "mm",

                format:
                    "a4",

                compress:
                    true

            });


        // ==================================================
        // CHECK AUTOTABLE
        // ==================================================

        if (
            typeof pdf.autoTable !==
            "function"
        ) {

            throw new Error(
                "jsPDF AutoTable plugin is not loaded."
            );

        }


        // ==================================================
        // PDF PROPERTIES
        // ==================================================

        pdf.setProperties({

            title:
                `Financial Statement - ${selectedYear} - ${selectedPuja}`,

            subject:
                "MURGABANI 1 TO 100 CLUB Financial Report",

            author:
                "MURGABANI 1 TO 100 CLUB",

            creator:
                "MURGABANI Management & Information System",

            keywords:
                "MURGABANI, Financial Report, Collection, Expense"

        });


        // ==================================================
        // LOAD LOGO
        // ==================================================

        const logoData =
            await loadPDFLogo();

/*
        // ==================================================
        // PAGE 1
        // ==================================================

        buildSummaryPage(
            pdf,
            selectedYear,
            selectedPuja
        );


        // ==================================================
        // PAGE 2
        // ==================================================

        buildVillagePage(
            pdf,
            selectedYear,
            selectedPuja
        );


        // ==================================================
        // PAGE 3
        // ==================================================

        buildMemberPage(
            pdf,
            selectedYear,
            selectedPuja
        );


        // ==================================================
        // PAGE 4
        // ==================================================

        buildExpensePage(
            pdf,
            selectedYear,
            selectedPuja
        );


        // ==================================================
        // PAGE 5
        // ==================================================

        buildChartsPage(
            pdf,
            selectedPuja
        );


        // ==================================================
        // APPLY HEADER + FOOTER
        // ==================================================

        applyPDFHeadersAndFooters(
            pdf,
            logoData
        );
*/

        
        // ==================================================
        // BUILD SECTIONS AND TRACK ACTUAL PAGE NUMBERS
        // ==================================================

        const pageTitles = {};

        // PAGE 1: Financial Statement
        buildSummaryPage(
            pdf,
            selectedYear,
            selectedPuja
        );

        pageTitles[pdf.getNumberOfPages()] =
            "FINANCIAL STATEMENT";


        // VILLAGE COLLECTION: may span multiple pages
        let sectionStart = pdf.getNumberOfPages() + 1;

        buildVillagePage(
            pdf,
            selectedYear,
            selectedPuja
        );

        for (
            let page = sectionStart;
            page <= pdf.getNumberOfPages();
            page++
        ) {
            pageTitles[page] = "VILLAGE COLLECTION";
        }


        // MEMBERS COLLECTION
        sectionStart = pdf.getNumberOfPages() + 1;

        buildMemberPage(
            pdf,
            selectedYear,
            selectedPuja
        );

        for (
            let page = sectionStart;
            page <= pdf.getNumberOfPages();
            page++
        ) {
            pageTitles[page] = "MEMBERS COLLECTION";
        }


        // EXPENSE DETAILS
        sectionStart = pdf.getNumberOfPages() + 1;

        buildExpensePage(
            pdf,
            selectedYear,
            selectedPuja
        );

        for (
            let page = sectionStart;
            page <= pdf.getNumberOfPages();
            page++
        ) {
            pageTitles[page] = "EXPENSE DETAILS";
        }


        // FINANCIAL CHARTS
        sectionStart = pdf.getNumberOfPages() + 1;

        buildChartsPage(
            pdf,
            selectedPuja
        );

        for (
            let page = sectionStart;
            page <= pdf.getNumberOfPages();
            page++
        ) {
            pageTitles[page] = "FINANCIAL CHARTS";
        }


        // APPLY CORRECT HEADER AND FOOTER TO EVERY PAGE
        applyPDFHeadersAndFooters(
            pdf,
            logoData,
            pageTitles
        );


        // ==================================================
        // CREATE PDF BLOB
        // ==================================================

        const pdfBlob =
            pdf.output(
                "blob"
            );


        if (
            !pdfBlob ||
            pdfBlob.size <= 0
        ) {

            throw new Error(
                "PDF blob could not be created."
            );

        }


        // ==================================================
        // FILE NAME
        // ==================================================

        const safeYearName =
            String(
                selectedYear ||
                "Year"
            )
            .trim()
            .replace(
                /[^\w\u0980-\u09FF-]+/g,
                "_"
            );


        const safePujaName =
            String(
                selectedPuja ||
                "Report"
            )
            .trim()
            .replace(
                /[^\w\u0980-\u09FF-]+/g,
                "_"
            );


        const fileName =
            "Financial_Report_" +
            safeYearName +
            "_" +
            safePujaName +
            ".pdf";


        // ==================================================
        // DOWNLOAD
        // ==================================================

        const pdfUrl =
            URL.createObjectURL(
                pdfBlob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            pdfUrl;

        link.download =
            fileName;

        link.style.display =
            "none";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        // ==================================================
        // RELEASE MEMORY
        // ==================================================

        setTimeout(
            () => {

                try {

                    URL.revokeObjectURL(
                        pdfUrl
                    );

                }

                catch (error) {

                    console.warn(
                        "PDF URL cleanup error:",
                        error
                    );

                }

            },
            3000
        );


        console.log(
            "PDF generated successfully:",
            fileName
        );

    }

    catch (error) {

        console.error(
            "PDF generation error:",
            error
        );


        alert(
            "PDF generation failed.\n\n" +
            (
                error &&
                error.message
                    ? error.message
                    : "Unknown error"
            )
        );

    }

    finally {

        // ==================================================
        // STOP LOADING
        // ==================================================

        try {

            if (
                typeof showLoading ===
                "function"
            ) {

                showLoading(
                    false
                );

            }

        }

        catch (error) {

            console.warn(
                "Unable to stop loading:",
                error
            );

        }


        // ==================================================
        // RESTORE BUTTON
        // ==================================================

        pdfBtn.disabled =
            false;

        pdfBtn.innerHTML =
            originalButtonText;


        // ==================================================
        // RELEASE LOCK
        // ==================================================

        window.reportOperationRunning =
            false;

    }

}


// ============================================================
// INITIALIZE PDF BUTTON
// ============================================================

function initializePDFButton() {

    const pdfBtn =
        getReportElement(
            "pdfBtn"
        );


    if (!pdfBtn) {

        console.warn(
            "pdfBtn not found."
        );

        return;

    }


    // Prevent duplicate event listener
    if (
        pdfBtn.dataset.reportPDFReady ===
        "true"
    ) {

        return;

    }


    pdfBtn.dataset.reportPDFReady =
        "true";


    pdfBtn.addEventListener(
        "click",
        () => {

            generateReportPDF(
                pdfBtn
            );

        }
    );

}


// ============================================================
// INITIALIZE REPORT APPLICATION
// ============================================================

function initializeReportApplication() {

    if (
        reportAppInitialized
    ) {

        return;

    }


    reportAppInitialized =
        true;


    // ------------------------------------------
    // Print
    // ------------------------------------------

    initializePrintReport();


    // ------------------------------------------
    // PDF
    // ------------------------------------------

    initializePDFButton();


    // ------------------------------------------
    // Existing report initialization
    // ------------------------------------------

    try {

        if (
            typeof loadInit ===
            "function"
        ) {

            loadInit();

        }

        else {

            console.warn(
                "loadInit() function not found."
            );

        }

    }

    catch (error) {

        console.error(
            "Report initialization error:",
            error
        );

    }

}


// ============================================================
// DOM READY
// ============================================================

function startReportApplication() {

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeReportApplication,
            {
                once: true
            }
        );

    }

    else {

        initializeReportApplication();

    }

}


// ============================================================
// START
// ============================================================

startReportApplication();


})();
