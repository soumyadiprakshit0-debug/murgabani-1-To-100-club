
// ======================================
// REPORTS.JS
// MURGABANI 1 TO 100 CLUB
// SINGLE-BUNDLE OPTIMIZED VERSION
// ======================================

"use strict";

const API_URL = "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

function getFreshAPIUrl(action, params = {}) {
    const searchParams = new URLSearchParams({
        action,
        ...params,
        _ts: Date.now().toString()
    });
    return `${API_URL}?${searchParams.toString()}`;
}

async function apiFetch(action, params = {}) {
    const response = await fetch(getFreshAPIUrl(action, params), {
        cache: "no-store"
    });
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    return response.json();
}

// Dashboard-selected period is authoritative.
const params = new URLSearchParams(window.location.search);
const dashboardYear = params.get("year") || "";
const dashboardPuja = params.get("puja") || "";

const el = id => document.getElementById(id);
const year = el("year");
const puja = el("puja");
const loading = el("loading");
const loadingMessage = el("loadingMessage");
const generateBtn = el("generateBtn");
const refreshBtn = el("refreshBtn");

const villageTable = el("villageTableBody");
const roadTable = el("roadTableBody");
const memberTable = el("memberTableBody");
const expenseTable = el("expenseTableBody");

const villageSearch = el("villageSearch");
const memberSearch = el("memberSearch");
const expenseSearch = el("expenseSearch");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

let reportBundle = null;
window.reportOperationRunning = false;
let loadingDepth = 0;

let collectionChart = null;
let expenseCategoryChart = null;
let saraswatiChart = null;
let laxmiChart = null;

function formatMoney(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function safeText(value) {
    return String(value ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showLoading(show, message = "Preparing your report…") {
    if (!loading) return;

    if (show) {
        loadingDepth++;
        if (loadingDepth > 1) return;
        if (loadingMessage) loadingMessage.textContent = message;
        loading.classList.add("show");
        if (generateBtn) generateBtn.disabled = true;
        if (refreshBtn) refreshBtn.disabled = true;
        return;
    }

    loadingDepth = Math.max(0, loadingDepth - 1);
    if (loadingDepth > 0) return;
    loading.classList.remove("show");
    if (generateBtn) generateBtn.disabled = false;
    if (refreshBtn) refreshBtn.disabled = false;
}

function setLoadingMessage(message) {
    if (loadingMessage) loadingMessage.textContent = message;
}

function destroyChart(chart) {
    if (!chart) return null;
    try { chart.destroy(); }
    catch (error) { console.warn("Chart destroy error:", error); }
    return null;
}

function resetCharts() {
    collectionChart = destroyChart(collectionChart);
    expenseCategoryChart = destroyChart(expenseCategoryChart);
    saraswatiChart = destroyChart(saraswatiChart);
    laxmiChart = destroyChart(laxmiChart);
}

function getBundleSections(data) {
    // These names match the getReportBundle() response in Code.gs.
    return {
        summary: data.summary || {},
        village: data.village || { records: [], totalRecords: 0, totalAmount: 0 },
        members: data.membersCollection || { records: [], totalRecords: 0, totalAmount: 0 },
        road: data.road || { dailyRecords: [], totalRecords: 0, totalAmount: 0 },
        expenses: data.expenses || { records: [], totalRecords: 0, totalAmount: 0 },
        charts: data.charts || {}
    };
}

function renderVillageTable(records = []) {
    if (!villageTable) return;
    if (!records.length) {
        villageTable.innerHTML = '<tr><td colspan="5">No records found</td></tr>';
        return;
    }
    villageTable.innerHTML = records.map(item => `
        <tr>
            <td>${safeText(item.date)}</td>
            <td>${safeText(item.contributor)}</td>
            <td><strong>${formatMoney(item.amount)}</strong></td>
            <td>${safeText(item.note)}</td>
            <td>${safeText(item.collector)}</td>
        </tr>
    `).join("");
}

function renderRoadTable(records = []) {
    if (!roadTable) return;
    if (!records.length) {
        roadTable.innerHTML = '<tr><td colspan="2">No road collection records found</td></tr>';
        return;
    }
    roadTable.innerHTML = records.map(item => `
        <tr>
            <td>${safeText(item.date)}</td>
            <td><strong>${formatMoney(item.totalCollection)}</strong></td>
        </tr>
    `).join("");
}

function renderMemberTable(records = []) {
    if (!memberTable) return;
    if (!records.length) {
        memberTable.innerHTML = '<tr><td colspan="5">No records found</td></tr>';
        return;
    }
    memberTable.innerHTML = records.map(item => `
        <tr>
            <td>${safeText(item.date)}</td>
            <td>${safeText(item.member)}</td>
            <td><strong>${formatMoney(item.amount)}</strong></td>
            <td>${safeText(item.status)}</td>
            <td>${safeText(item.note)}</td>
        </tr>
    `).join("");
}

function renderExpenseTable(records = []) {
    if (!expenseTable) return;
    if (!records.length) {
        expenseTable.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">No expense records found.</td></tr>';
        return;
    }
    expenseTable.innerHTML = records.map(item => `
        <tr>
            <td>${safeText(item.expenseId ?? item.id)}</td>
            <td>${safeText(item.date)}</td>
            <td>${safeText(item.expenseName)}</td>
            <td><strong>${formatMoney(item.amount)}</strong></td>
            <td>${safeText(item.paidBy)}</td>
            <td>${safeText(item.note)}</td>
        </tr>
    `).join("");
}

function updateSummary(data) {
    const summary = data.summary;
    const values = {
        members: summary.activeMembers ?? summary.members ?? 0,
        collection: summary.totalCollection ?? 0,
        expenses: summary.totalExpense ?? 0,
        balance: summary.balance ?? 0,
        roadCollection: summary.roadCollection ?? 0,
        villageCollection: summary.villageCollection ?? 0,
        memberCollection: summary.memberCollection ?? 0
    };

    if (el("members")) el("members").textContent = values.members;
    if (el("collection")) el("collection").textContent = formatMoney(values.collection);
    if (el("expenses")) el("expenses").textContent = formatMoney(values.expenses);
    if (el("balance")) {
        el("balance").textContent = formatMoney(values.balance);
        el("balance").style.color = Number(values.balance) >= 0 ? "#16a34a" : "#dc2626";
    }

    if (el("roadCollection")) el("roadCollection").textContent = formatMoney(values.roadCollection);
    if (el("villageCollection")) el("villageCollection").textContent = formatMoney(values.villageCollection);
    if (el("memberCollection")) el("memberCollection").textContent = formatMoney(values.memberCollection);

    if (el("collection2")) el("collection2").textContent = formatMoney(values.collection);
    if (el("expenses2")) el("expenses2").textContent = formatMoney(values.expenses);
    if (el("balance2")) {
        el("balance2").textContent = formatMoney(values.balance);
        el("balance2").style.color = Number(values.balance) >= 0 ? "#16a34a" : "#dc2626";
    }

    if (el("villageRecords")) el("villageRecords").textContent = data.village.totalRecords ?? data.village.records.length;
    if (el("villageTotal")) el("villageTotal").textContent = formatMoney(data.village.totalAmount);
    if (el("memberRecords")) el("memberRecords").textContent = data.members.totalRecords ?? data.members.records.length;
    if (el("memberTotal")) el("memberTotal").textContent = formatMoney(data.members.totalAmount);
    if (el("roadRecords")) el("roadRecords").textContent = data.road.totalRecords ?? data.road.dailyRecords.length;
    if (el("roadTotal")) el("roadTotal").textContent = formatMoney(data.road.totalAmount);
    if (el("expenseTotalRecords")) el("expenseTotalRecords").textContent = data.expenses.totalRecords ?? data.expenses.records.length;
    if (el("expenseTotalAmount")) el("expenseTotalAmount").textContent = formatMoney(data.expenses.totalAmount);
}

function getMoneyFromElement(element) {
    if (!element) return 0;
    return Number(String(element.textContent || "0").replace(/[₹,]/g, "")) || 0;
}

function makeChart(canvasId, type, labels, datasets, options = {}) {
    const canvas = el(canvasId);
    if (!canvas || typeof Chart === "undefined") return null;
    const existing = Chart.getChart ? Chart.getChart(canvas) : null;
    if (existing) existing.destroy();
    return new Chart(canvas.getContext("2d"), {
        type,
        data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: type === "bar" ? false : true, ...options }
    });
}

function loadChartsFromBundle(data) {
    resetCharts();

    collectionChart = makeChart("collectionChart", "pie",
        ["Road", "Village", "Members"],
        [{ data: [
            Number(data.summary.roadCollection || 0),
            Number(data.summary.villageCollection || 0),
            Number(data.summary.memberCollection || 0)
        ] }],
        { plugins: { legend: { position: "bottom" } } }
    );

    const categories = data.charts.expenseCategory || {};
    expenseCategoryChart = makeChart("expenseCategoryChart", "doughnut",
        Object.keys(categories),
        [{ data: Object.values(categories) }],
        { plugins: { legend: { position: "bottom" } } }
    );

    const saraswati = data.charts.saraswati;
    if (saraswati) {
        saraswatiChart = makeChart("saraswatiChart", "bar", saraswati.labels || [], [
            { label: "Collection", data: saraswati.collection || [] },
            { label: "Expense", data: saraswati.expense || [] }
        ]);
    }

    const laxmi = data.charts.laxmi;
    if (laxmi) {
        laxmiChart = makeChart("laxmiChart", "bar", laxmi.labels || [], [
            { label: "Collection", data: laxmi.collection || [] },
            { label: "Expense", data: laxmi.expense || [] }
        ]);
    }
}

function renderAllReportData(rawData) {
    const data = getBundleSections(rawData);
    reportBundle = data;

    updateSummary(data);
    renderVillageTable(data.village.records || []);
    renderRoadTable(data.road.dailyRecords || []);
    renderMemberTable(data.members.records || []);
    renderExpenseTable(data.expenses.records || []);
    loadChartsFromBundle(data);

    if (villageSearch) villageSearch.value = "";
    if (memberSearch) memberSearch.value = "";
    if (expenseSearch) expenseSearch.value = "";

    const periodLabel = el("reportPeriodLabel");
    if (periodLabel) periodLabel.textContent = `${year.value} • ${puja.value}`;
}

async function loadReport(showOverlay = true) {
    if (!year || !puja || !year.value || !puja.value) {
        alert("Year or Puja is missing. Please return to the dashboard and select a report period.");
        return false;
    }

    if (showOverlay) showLoading(true, "Loading report data…");

    try {
        const response = await apiFetch("getReportBundle", {
            year: year.value,
            puja: puja.value
        });

        if (!response || response.success !== true) {
            throw new Error(response?.message || "Unable to load report data.");
        }

        renderAllReportData(response);
        console.log("Report bundle loaded successfully:", year.value, puja.value);
        return true;
    } catch (error) {
        console.error("Report loading error:", error);
        alert(error.message || "Unable to load report.");
        return false;
    } finally {
        if (showOverlay) showLoading(false);
    }
}

async function refreshReportAndActiveTab() {
    if (window.reportOperationRunning) return;

    window.reportOperationRunning = true;
    showLoading(true, "Refreshing report…");

    try {
        await loadReport(false);
    } finally {
        showLoading(false);
        window.reportOperationRunning = false;
    }
}

function activateTab(tabName) {
    tabButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tabName);
    });
    tabContents.forEach(content => {
        const active = content.id === `${tabName}Tab`;
        content.classList.toggle("active", active);
        content.hidden = !active;
    });
    if (tabName === "charts" && reportBundle) {
        // Chart canvases can be measured incorrectly while their tab is hidden.
        requestAnimationFrame(() => {
            [collectionChart, expenseCategoryChart, saraswatiChart, laxmiChart]
                .filter(Boolean).forEach(chart => chart.resize());
        });
    }
}

tabButtons.forEach(button => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
});

if (generateBtn) generateBtn.addEventListener("click", refreshReportAndActiveTab);
if (refreshBtn) refreshBtn.addEventListener("click", refreshReportAndActiveTab);

if (year) year.value = dashboardYear || year.value;
if (puja) puja.value = dashboardPuja || puja.value;

if (year) year.addEventListener("change", refreshReportAndActiveTab);
if (puja) puja.addEventListener("change", refreshReportAndActiveTab);

const backBtn = el("backBtn");
if (backBtn) {
    backBtn.addEventListener("click", () => {
        const role = sessionStorage.getItem("memberRole");
        window.location.replace(role === "Admin" ? "admin-dashboard.html" : "member-dashboard.html");
    });
}

if (villageSearch) {
    villageSearch.addEventListener("input", () => {
        const records = reportBundle?.village.records || [];
        const keyword = villageSearch.value.trim().toLowerCase();
        renderVillageTable(records.filter(item =>
            [item.contributor, item.collector, item.note, item.date]
                .some(value => String(value || "").toLowerCase().includes(keyword))
        ));
    });
}

if (memberSearch) {
    memberSearch.addEventListener("input", () => {
        const records = reportBundle?.members.records || [];
        const keyword = memberSearch.value.trim().toLowerCase();
        renderMemberTable(records.filter(item =>
            [item.member, item.status, item.note, item.date]
                .some(value => String(value || "").toLowerCase().includes(keyword))
        ));
    });
}

if (expenseSearch) {
    expenseSearch.addEventListener("input", () => {
        const records = reportBundle?.expenses.records || [];
        const keyword = expenseSearch.value.trim().toLowerCase();
        renderExpenseTable(records.filter(item =>
            [item.expenseId, item.id, item.expenseName, item.paidBy, item.note, item.date]
                .some(value => String(value || "").toLowerCase().includes(keyword))
        ));
    });
}

// Expose only the functions needed by the retained PDF/print module.
window.loadReport = loadReport;
window.preparePDFData = async () => {
    if (!reportBundle) throw new Error("Report data is not ready.");
    return true;
};

// ======================================
// INITIAL REPORT LOAD
// ======================================
window.reportOperationRunning = true;

loadReport(true).finally(() => {
    window.reportOperationRunning = false;
});



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
// ============================================================

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


        return result !== false;

    }

    catch (error) {

        console.error(
            `${name} failed:`,
            error
        );

        return false;

    }

    finally {

        clearTimeout(timeoutId);

    }

}



// ============================================================
// COLLECT TABLE ROWS
// ============================================================

function getTableRows(selector, minimumCells) {
    const rows = [];

    document.querySelectorAll(selector).forEach(tr => {
        const cells = tr.querySelectorAll("td");

        if (cells.length >= minimumCells) {
            rows.push(
                Array.from(cells).map(cell =>
                    cleanPDFText(cell.textContent)
                )
            );
        }
    });

    return rows;
}


// ============================================================
// ADD SUMMARY PAGE
// ============================================================

function buildSummaryPage(pdf, selectedYear, selectedPuja) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);

    pdf.text("Financial Statement Report", 105, 40, {
        align: "center"
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);

    pdf.text(
        `Financial Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        47,
        { align: "center" }
    );

    const now = new Date();

    pdf.setFontSize(8.5);
    pdf.setTextColor(110, 110, 110);

    pdf.text(
        `Generated on: ${now.toLocaleString("en-IN")}`,
        105,
        53,
        { align: "center" }
    );

    pdf.setDrawColor(...PDF_GOLD);
    pdf.setLineWidth(0.8);
    pdf.line(15, 59, 195, 59);

    const pdfMembers = cleanPDFText(
        getElementText(getReportElement("members"))
    );

    const pdfVillageCollection = cleanPDFValue(
        getElementText(getReportElement("villageCollection"))
    );

    const pdfMemberCollection = cleanPDFValue(
        getElementText(getReportElement("memberCollection"))
    );

    const pdfRoadCollection = cleanPDFValue(
        getElementText(getReportElement("roadCollection"))
    );

    const pdfTotalCollection = cleanPDFValue(
        getElementText(getReportElement("collection"))
    );

    const pdfTotalExpenses = cleanPDFValue(
        getElementText(getReportElement("expenses"))
    );

    const pdfBalance = cleanPDFValue(
        getElementText(getReportElement("balance"))
    );

    pdf.autoTable({
        startY: 67,
        theme: "grid",
        head: [[
            "Financial Particulars",
            "Amount / Value"
        ]],
        body: [
            ["Total Members", pdfMembers],
            ["Village Collection", pdfVillageCollection],
            ["Members Collection", pdfMemberCollection],
            ["Road Collection", pdfRoadCollection],
            ["Total Collection", pdfTotalCollection],
            ["Total Expenses", pdfTotalExpenses],
            ["Available Balance", pdfBalance]
        ],
        headStyles: {
            fillColor: PDF_PRIMARY,
            textColor: 255,
            fontStyle: "bold",
            fontSize: 10,
            halign: "center",
            cellPadding: 4
        },
        bodyStyles: {
            fontSize: 10,
            cellPadding: 4,
            textColor: PDF_DARK
        },
        alternateRowStyles: {
            fillColor: PDF_LIGHT
        },
        columnStyles: {
            0: {
                cellWidth: 105,
                halign: "left"
            },
            1: {
                cellWidth: 75,
                halign: "right",
                fontStyle: "bold"
            }
        },
        margin: {
            left: 15,
            right: 15
        },
        tableWidth: 180,
        tableLineColor: [210, 214, 220],
        tableLineWidth: 0.25
    });

    const balanceValue = getPDFNumber(
        getElementText(getReportElement("balance"))
    );

    pdf.setFillColor(
        balanceValue >= 0 ? 232 : 254,
        balanceValue >= 0 ? 247 : 242,
        balanceValue >= 0 ? 237 : 242
    );

    pdf.roundedRect(15, 150, 180, 18, 3, 3, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...PDF_DARK);
    pdf.text("Financial Status", 25, 158);

    pdf.setFontSize(12);
    pdf.setTextColor(
        balanceValue >= 0 ? 22 : 220,
        balanceValue >= 0 ? 163 : 38,
        balanceValue >= 0 ? 74 : 38
    );

    pdf.text(
        balanceValue >= 0 ? "SURPLUS" : "DEFICIT",
        25,
        165
    );

    pdf.setTextColor(...PDF_DARK);
    pdf.setFontSize(10);

    pdf.text(`Balance: ${pdfBalance}`, 190, 161, {
        align: "right"
    });

    const pageHeight = pdf.internal.pageSize.getHeight();
    const signatureY = pageHeight - 42;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...PDF_PRIMARY);

    pdf.text("AUTHORIZATION", 105, signatureY - 13, {
        align: "center"
    });

    pdf.setDrawColor(80, 80, 80);
    pdf.setLineWidth(0.4);

    pdf.line(20, signatureY, 65, signatureY);
    pdf.line(82, signatureY, 127, signatureY);
    pdf.line(145, signatureY, 190, signatureY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);

    pdf.text("President", 42.5, signatureY + 6, {
        align: "center"
    });

    pdf.text("Treasurer", 104.5, signatureY + 6, {
        align: "center"
    });

    pdf.text("Secretary", 167.5, signatureY + 6, {
        align: "center"
    });

    pdf.setFontSize(7.5);
    pdf.setTextColor(120, 120, 120);

    pdf.text("Authorized signatures", 105, signatureY + 14, {
        align: "center"
    });
}


// ============================================================
// ADD VILLAGE PAGE
// ============================================================

function buildVillagePage(pdf, selectedYear, selectedPuja) {
    pdf.addPage();

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);

    pdf.text("VILLAGE COLLECTION DETAILS", 105, 18, {
        align: "center"
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    pdf.text(
        `Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        25,
        { align: "center" }
    );

    pdf.setDrawColor(...PDF_PRIMARY);
    pdf.setLineWidth(0.6);
    pdf.line(15, 30, 195, 30);

    const villageRows = getTableRows(
        "#villageTableBody tr",
        5
    );

    pdf.autoTable({
        startY: 38,
        theme: "grid",
        head: [[
            "Date",
            "Contributor Name",
            "Amount",
            "Note",
            "Collector"
        ]],
        body: villageRows.length
            ? villageRows.map(row => [
                row[0],
                row[1],
                cleanPDFValue(row[2]),
                row[3] || "—",
                row[4]
            ])
            : [[
                "No records",
                "",
                "Rs. 0",
                "",
                ""
            ]],
        headStyles: {
            fillColor: PDF_PRIMARY,
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
            cellPadding: 3.5
        },
        bodyStyles: {
            fontSize: 8.5,
            cellPadding: 3.2,
            textColor: PDF_DARK
        },
        alternateRowStyles: {
            fillColor: PDF_LIGHT
        },
        columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 48 },
            2: {
                cellWidth: 28,
                halign: "right",
                fontStyle: "bold"
            },
            3: { cellWidth: 40 },
            4: { cellWidth: 36 }
        },
        margin: {
            top: 38,
            left: 15,
            right: 15,
            bottom: 22
        },
        tableLineColor: [210, 214, 220],
        tableLineWidth: 0.25,
        showHead: "everyPage"
    });
}


// ============================================================
// ADD MEMBERS PAGE
// ============================================================

function buildMemberPage(pdf, selectedYear, selectedPuja) {
    pdf.addPage();

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);

    pdf.text("MEMBERS COLLECTION DETAILS", 105, 18, {
        align: "center"
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    pdf.text(
        `Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        25,
        { align: "center" }
    );

    pdf.setDrawColor(...PDF_PRIMARY);
    pdf.setLineWidth(0.6);
    pdf.line(15, 30, 195, 30);

    const memberRows = getTableRows(
        "#memberTableBody tr",
        5
    );

    pdf.autoTable({
        startY: 38,
        theme: "grid",
        head: [[
            "Date",
            "Member Name",
            "Amount",
            "Status",
            "Note"
        ]],
        body: memberRows.length
            ? memberRows.map(row => [
                row[0],
                row[1],
                cleanPDFValue(row[2]),
                row[3],
                row[4]
            ])
            : [[
                "No records",
                "",
                "Rs. 0",
                "",
                ""
            ]],
        headStyles: {
            fillColor: PDF_PRIMARY,
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
            cellPadding: 3.5
        },
        bodyStyles: {
            fontSize: 8.5,
            cellPadding: 3.2,
            textColor: PDF_DARK
        },
        alternateRowStyles: {
            fillColor: PDF_LIGHT
        },
        columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 48 },
            2: {
                cellWidth: 30,
                halign: "right",
                fontStyle: "bold"
            },
            3: { cellWidth: 30 },
            4: { cellWidth: 44 }
        },
        margin: {
            top: 38,
            left: 15,
            right: 15,
            bottom: 22
        },
        tableLineColor: [210, 214, 220],
        tableLineWidth: 0.25,
        showHead: "everyPage"
    });
}




// ============================================================
// ADD EXPENSE PAGE
// ============================================================

function buildExpensePage(pdf, selectedYear, selectedPuja) {
    pdf.addPage();

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);

    pdf.text("EXPENSE DETAILS", 105, 18, {
        align: "center"
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    pdf.text(
        `Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        25,
        { align: "center" }
    );

    pdf.setDrawColor(...PDF_PRIMARY);
    pdf.setLineWidth(0.6);
    pdf.line(15, 30, 195, 30);

    const expenseRows = getTableRows(
        "#expenseTableBody tr",
        6
    );

    pdf.autoTable({
        startY: 38,
        theme: "grid",
        head: [[
            "ID",
            "Date",
            "Expense",
            "Amount",
            "Paid By",
            "Note"
        ]],
        body: expenseRows.length
            ? expenseRows.map(row => [
                row[0],
                row[1],
                row[2],
                formatPDFMoney(row[3]),
                row[4],
                row[5]
            ])
            : [[
                "No records",
                "",
                "",
                "Rs. 0",
                "",
                ""
            ]],
        headStyles: {
            fillColor: PDF_PRIMARY,
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8.5,
            halign: "center",
            cellPadding: 3
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: 3,
            textColor: PDF_DARK
        },
        alternateRowStyles: {
            fillColor: PDF_LIGHT
        },
        columnStyles: {
            0: { cellWidth: 24 },
            1: { cellWidth: 27 },
            2: { cellWidth: 38 },
            3: {
                cellWidth: 30,
                halign: "right",
                fontStyle: "bold"
            },
            4: { cellWidth: 33 },
            5: { cellWidth: 28 }
        },
        margin: {
            top: 38,
            left: 15,
            right: 15,
            bottom: 22
        },
        tableLineColor: [210, 214, 220],
        tableLineWidth: 0.25,
        showHead: "everyPage"
    });
}


// ============================================================
// ADD CHART PAGE
// ============================================================

function buildChartsPage(pdf, selectedPuja) {
    pdf.addPage();

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);

    pdf.text("FINANCIAL CHARTS", 105, 18, {
        align: "center"
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    const yearElement = getReportElement("year");
    const selectedYear = yearElement ? yearElement.value : "";

    pdf.text(
        `Year: ${selectedYear}    |    Puja: ${selectedPuja}`,
        105,
        25,
        { align: "center" }
    );

    pdf.setDrawColor(...PDF_PRIMARY);
    pdf.setLineWidth(0.6);
    pdf.line(15, 30, 195, 30);

    // Collection distribution
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...PDF_PRIMARY);
    pdf.text("Collection Distribution", 15, 40);

    const collectionChartAdded = addChartToPDF(
        pdf,
        "collectionChart",
        55,
        45,
        105,
        80
    );

    if (!collectionChartAdded) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...PDF_DARK);
        pdf.text("Collection chart unavailable.", 15, 55);
    }

    // Expense category distribution
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...PDF_PRIMARY);
    pdf.text("Expense Category Distribution", 15, 130);

    const expenseChartAdded = addChartToPDF(
        pdf,
        "expenseCategoryChart",
        55,
        135,
        105,
        80
    );

    if (!expenseChartAdded) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...PDF_DARK);
        pdf.text("Expense category chart unavailable.", 15, 145);
    }

    // Selected Puja comparison
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...PDF_PRIMARY);

    pdf.text(
        `${selectedPuja} - Collection vs Expense`,
        15,
        220
    );

    const selectedPujaLower = String(
        selectedPuja || ""
    ).toLowerCase();

    let selectedPujaCanvasId = null;

    if (selectedPujaLower.includes("saraswati")) {
        selectedPujaCanvasId = "saraswatiChart";
    } else if (
        selectedPujaLower.includes("laxmi") ||
        selectedPujaLower.includes("lakshmi")
    ) {
        selectedPujaCanvasId = "laxmiChart";
    }

    const pujaChartAdded = selectedPujaCanvasId
        ? addChartToPDF(
            pdf,
            selectedPujaCanvasId,
            55,
            225,
            100,
            55
        )
        : false;

    if (!pujaChartAdded) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...PDF_DARK);
        pdf.text("Selected Puja chart unavailable.", 15, 235);
    }
}


// ============================================================
// DOWNLOAD PDF
// ============================================================

async function generateReportPDF(pdfBtn) {
    if (window.reportOperationRunning) {
        console.log("PDF operation already running.");
        return;
    }

    window.reportOperationRunning = true;

    const originalButtonText = pdfBtn.innerHTML;
    pdfBtn.disabled = true;

    try {
        if (typeof showLoading === "function") {
            showLoading(true);
        }
    } catch (error) {
        console.warn("Loading UI error:", error);
    }

    try {
        const yearElement = getReportElement("year");
        const pujaElement = getReportElement("puja");

        const selectedYear = yearElement ? yearElement.value : "";
        const selectedPuja = pujaElement ? pujaElement.value : "";

        // Reuse the already-loaded bundle; no extra collection/expense API calls.
        await window.preparePDFData();

        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error("jsPDF library is not loaded.");
        }

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
        });

        if (typeof pdf.autoTable !== "function") {
            throw new Error("jsPDF AutoTable plugin is not loaded.");
        }

        pdf.setProperties({
            title: `Financial Statement - ${selectedYear} - ${selectedPuja}`,
            subject: "MURGABANI 1 TO 100 CLUB Financial Report",
            author: "MURGABANI 1 TO 100 CLUB",
            creator: "MURGABANI Management & Information System",
            keywords: "MURGABANI, Financial Report, Collection, Expense"
        });

        const logoData = await loadPDFLogo();

        // Page 1: Summary
        const pageTitles = {};

        buildSummaryPage(pdf, selectedYear, selectedPuja);

        pageTitles[pdf.getNumberOfPages()] =
            "FINANCIAL STATEMENT";

        // Village collection section (including continuation pages)
        let sectionStart = pdf.getNumberOfPages() + 1;

        buildVillagePage(pdf, selectedYear, selectedPuja);

        for (
            let page = sectionStart;
            page <= pdf.getNumberOfPages();
            page++
        ) {
            pageTitles[page] = "VILLAGE COLLECTION";
        }

        // Members collection section
        sectionStart = pdf.getNumberOfPages() + 1;

        buildMemberPage(pdf, selectedYear, selectedPuja);

        for (
            let page = sectionStart;
            page <= pdf.getNumberOfPages();
            page++
        ) {
            pageTitles[page] = "MEMBERS COLLECTION";
        }

        // Expenses section
        sectionStart = pdf.getNumberOfPages() + 1;

        buildExpensePage(pdf, selectedYear, selectedPuja);

        for (
            let page = sectionStart;
            page <= pdf.getNumberOfPages();
            page++
        ) {
            pageTitles[page] = "EXPENSE DETAILS";
        }

        // Charts section
        sectionStart = pdf.getNumberOfPages() + 1;

        buildChartsPage(pdf, selectedPuja);

        for (
            let page = sectionStart;
            page <= pdf.getNumberOfPages();
            page++
        ) {
            pageTitles[page] = "FINANCIAL CHARTS";
        }

        // Apply the correct header and footer to every page.
        applyPDFHeadersAndFooters(
            pdf,
            logoData,
            pageTitles
        );

        const pdfBlob = pdf.output("blob");

        if (!pdfBlob || pdfBlob.size <= 0) {
            throw new Error("PDF blob could not be created.");
        }

        const safeYearName = String(
            selectedYear || "Year"
        )
            .trim()
            .replace(/[^\w\u0980-\u09FF-]+/g, "_");

        const safePujaName = String(
            selectedPuja || "Report"
        )
            .trim()
            .replace(/[^\w\u0980-\u09FF-]+/g, "_");

        const fileName =
            "Financial_Report_" +
            safeYearName +
            "_" +
            safePujaName +
            ".pdf";

        const pdfUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");

        link.href = pdfUrl;
        link.download = fileName;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => {
            try {
                URL.revokeObjectURL(pdfUrl);
            } catch (error) {
                console.warn("PDF URL cleanup error:", error);
            }
        }, 3000);

        console.log("PDF generated successfully:", fileName);

    } catch (error) {
        console.error("PDF generation error:", error);

        alert(
            "PDF generation failed.\n\n" +
            (
                error && error.message
                    ? error.message
                    : "Unknown error"
            )
        );

    } finally {
        try {
            if (typeof showLoading === "function") {
                showLoading(false);
            }
        } catch (error) {
            console.warn("Unable to stop loading:", error);
        }

        pdfBtn.disabled = false;
        pdfBtn.innerHTML = originalButtonText;

        window.reportOperationRunning = false;
    }
}


// ============================================================
// INITIALIZE PDF BUTTON
// ============================================================

function initializePDFButton() {
    const pdfBtn = getReportElement("pdfBtn");

    if (!pdfBtn) {
        console.warn("pdfBtn not found.");
        return;
    }

    if (pdfBtn.dataset.reportPDFReady === "true") {
        return;
    }

    pdfBtn.dataset.reportPDFReady = "true";

    pdfBtn.addEventListener("click", () => {
        generateReportPDF(pdfBtn);
    });
}


// ============================================================
// INITIALIZE REPORT APPLICATION
// ============================================================

function initializeReportApplication() {
    if (reportAppInitialized) {
        return;
    }

    reportAppInitialized = true;

    // Print
    initializePrintReport();

    // PDF
    initializePDFButton();

    // Do not call the old loadInit() function here.
    // The new main script already loads the report bundle once.
}


// ============================================================
// DOM READY
// ============================================================

function startReportApplication() {
    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeReportApplication,
            { once: true }
        );
    } else {
        initializeReportApplication();
    }
}


// ============================================================
// START
// ============================================================

startReportApplication();

})();
