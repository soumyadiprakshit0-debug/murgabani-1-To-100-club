
// ======================================
// MURGABANI 1 TO 100 CLUB
// OPTIMIZED MEMBER DASHBOARD
// ======================================

"use strict";

// ======================================
// CONFIGURATION
// ======================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

const PUJAS = [
    "Saraswati puja",
    "Laxmi puja"
];

const STORAGE_KEYS = {
    year: "selectedYear",
    puja: "selectedPuja",
    returnDashboard: "returnDashboard"
};

// ======================================
// DOM ELEMENTS
// ======================================

const welcome = document.getElementById("welcome");

const yearSelect = document.getElementById("year");
const pujaSelect = document.getElementById("puja");

const members = document.getElementById("members");
const collection = document.getElementById("collection");
const expenses = document.getElementById("expenses");
const balance = document.getElementById("balance");

const loading = document.getElementById("loading");

const dashboardLoader =
    document.getElementById("dashboardLoader");

const loaderTitle =
    document.getElementById("loaderTitle");

const loaderStatus =
    document.getElementById("loaderStatus");

const loaderPercent =
    document.getElementById("loaderPercent");

const loaderProgressBar =
    document.getElementById("loaderProgressBar");

const roadCollectionBtn =
    document.getElementById("roadCollectionBtn");

// ======================================
// DASHBOARD STATE
// ======================================

let dashboardRequestId = 0;
let dashboardLoaderTimer = null;
let dashboardLoaderHideTimer = null;
let dashboardLoaderProgress = 0;

let currentYear = "";
let currentPuja = "";

let isDashboardReady = false;

// ======================================
// MEMBER AUTHENTICATION
// ======================================

const memberRole =
    (sessionStorage.getItem("memberRole") || "")
        .toLowerCase();

const loggedIn =
    sessionStorage.getItem("loggedIn");

if (
    loggedIn !== "true" ||
    (memberRole && memberRole !== "member")
) {
    sessionStorage.clear();
    window.location.replace("login.html");
}

// ======================================
// WELCOME MESSAGE
// ======================================

if (welcome) {
    welcome.textContent =
        "Welcome, " +
        (sessionStorage.getItem("memberName") || "Member");
}

// ======================================
// DATE AND DEFAULT PUJA
// ======================================

function getIndiaDate() {

    const parts = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).formatToParts(new Date());

    const result = {};

    parts.forEach(part => {
        result[part.type] = part.value;
    });

    return {
        year: Number(result.year),
        month: Number(result.month),
        day: Number(result.day)
    };
}


function getDefaultPuja() {

    const date = getIndiaDate();

    return (
        date.month <= 5
            ? "Saraswati puja"
            : "Laxmi puja"
    );
}


// ======================================
// NAVIGATION HELPER
// ======================================

function navigateTo(page, params = {}) {

    const url = new URL(
        page,
        window.location.href
    );

    Object.entries(params).forEach(([key, value]) => {

        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
        }

    });

    // Prevent cached old pages in browser/WebView.
    url.searchParams.set("_", Date.now());

    window.location.replace(url.href);
}


// ======================================
// LOADING CONTROL
// ======================================

function showLoading(show) {

    if (loading) {
        loading.style.display = show ? "block" : "none";
    }

    if (yearSelect) {
        yearSelect.disabled = show;
    }

    if (pujaSelect) {
        pujaSelect.disabled = show;
    }

}


// ======================================
// PREMIUM DASHBOARD LOADER
// ======================================

function updateDashboardLoader(percent) {

    const safePercent = Math.max(
        0,
        Math.min(100, Math.round(percent))
    );

    if (loaderPercent) {
        loaderPercent.textContent =
            safePercent + "%";
    }

    if (loaderProgressBar) {
        loaderProgressBar.style.width =
            safePercent + "%";
    }

}


function updateDashboardLoaderStatus(title, status) {

    if (loaderTitle) {
        loaderTitle.textContent = title;
    }

    if (loaderStatus) {
        loaderStatus.textContent = status;
    }

}


function showDashboardLoader() {

    if (!dashboardLoader) return;

    clearInterval(dashboardLoaderTimer);
    clearTimeout(dashboardLoaderHideTimer);

    dashboardLoader.classList.remove("hidden");

    dashboardLoaderProgress = 0;

    updateDashboardLoader(0);

    updateDashboardLoaderStatus(
        "Member Dashboard",
        "Connecting to club database..."
    );

    dashboardLoaderTimer = setInterval(() => {

        // Smooth progress without randomly reaching 100%.
        dashboardLoaderProgress = Math.min(
            dashboardLoaderProgress + 3,
            90
        );

        updateDashboardLoader(
            dashboardLoaderProgress
        );

    }, 120);

}


function hideDashboardLoader() {

    clearInterval(dashboardLoaderTimer);

    updateDashboardLoader(100);

    updateDashboardLoaderStatus(
        "Dashboard Ready",
        "Welcome to MURGABANI MIS"
    );

    dashboardLoaderHideTimer = setTimeout(() => {

        if (dashboardLoader) {
            dashboardLoader.classList.add("hidden");
        }

    }, 350);

}


// ======================================
// API HELPER
// ======================================

async function fetchAPI(params) {

    const url = new URL(API_URL);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            "Server response error: " + response.status
        );
    }

    return await response.json();

}


// ======================================
// FORMAT CURRENCY
// ======================================

function formatCurrency(value) {

    const amount = Number(value) || 0;

    return (
        "₹" +
        amount.toLocaleString("en-IN", {
            maximumFractionDigits: 2
        })
    );

}


// ======================================
// UPDATE DASHBOARD CARDS
// ======================================

function updateDashboardCards(data) {

    if (!data) return;

    if (members) {
        members.textContent =
            Number(data.members) || 0;
    }

    if (collection) {
        collection.textContent =
            formatCurrency(data.collection);
    }

    if (expenses) {
        expenses.textContent =
            formatCurrency(data.expense);
    }

    if (balance) {

        const amount = Number(data.balance) || 0;

        balance.textContent =
            formatCurrency(amount);

        balance.style.color =
            amount >= 0
                ? "#16a34a"
                : "#dc2626";

    }

}


// ======================================
// SAVE SELECTED FILTERS
// ======================================

function saveSelectedFilters() {

    if (!yearSelect || !pujaSelect) return;

    currentYear = yearSelect.value;
    currentPuja = pujaSelect.value;

    sessionStorage.setItem(
        STORAGE_KEYS.year,
        currentYear
    );

    sessionStorage.setItem(
        STORAGE_KEYS.puja,
        currentPuja
    );

}


// ======================================
// POPULATE YEAR DROPDOWN
// ======================================

function populateYears(years) {

    if (!yearSelect) return;

    yearSelect.innerHTML = "";

    const uniqueYears = [
        ...new Set(
            (years || [])
                .map(year => String(year))
                .filter(year => /^\d{4}$/.test(year))
        )
    ].sort((a, b) => Number(b) - Number(a));

    uniqueYears.forEach(year => {

        const option = document.createElement("option");

        option.value = year;
        option.textContent = year;

        yearSelect.appendChild(option);

    });

}


// ======================================
// POPULATE PUJA DROPDOWN
// ======================================

function populatePujas(selectedPuja) {

    if (!pujaSelect) return;

    pujaSelect.innerHTML = "";

    PUJAS.forEach(puja => {

        const option = document.createElement("option");

        option.value = puja;
        option.textContent = puja;

        pujaSelect.appendChild(option);

    });

    pujaSelect.value =
        PUJAS.includes(selectedPuja)
            ? selectedPuja
            : getDefaultPuja();

}


// ======================================
// ROAD COLLECTION AVAILABILITY
// ======================================

function updateRoadCollectionButton() {

    if (!roadCollectionBtn || !pujaSelect) return;

    const isAvailable =
        pujaSelect.value === "Saraswati puja";

    roadCollectionBtn.disabled = !isAvailable;

    roadCollectionBtn.setAttribute(
        "aria-disabled",
        String(!isAvailable)
    );

    roadCollectionBtn.title = isAvailable
        ? "Open Road Collection"
        : "Road Collection is available only during Saraswati Puja";

}


// ======================================
// LOAD DASHBOARD DATA
// ======================================

async function loadDashboard(options = {}) {

    if (!yearSelect || !pujaSelect) return;

    const year = yearSelect.value;
    const puja = pujaSelect.value;

    if (!year || !PUJAS.includes(puja)) {
        return;
    }

    saveSelectedFilters();

    updateRoadCollectionButton();

    const requestId = ++dashboardRequestId;

    if (!options.silent) {
        showLoading(true);
    }

    try {

        const data = await fetchAPI({
            action: "dashboard",
            year,
            puja
        });

        // Ignore old responses when a newer filter request exists.
        if (requestId !== dashboardRequestId) {
            return;
        }

        if (!data || !data.success) {
            throw new Error(
                data?.message || "Dashboard data unavailable."
            );
        }

        updateDashboardCards(data);

    } catch (error) {

        if (requestId === dashboardRequestId) {

            console.error(
                "Dashboard loading error:",
                error
            );

            if (!options.silent) {
                alert(
                    "Unable to load dashboard data. Please try again."
                );
            }

        }

    } finally {

        if (requestId === dashboardRequestId) {
            showLoading(false);
        }

    }

}


// ======================================
// INITIALIZE DASHBOARD
// ======================================

async function loadDashboardInit() {

    showDashboardLoader();
    showLoading(true);

    updateDashboardLoaderStatus(
        "Member Dashboard",
        "Fetching dashboard information..."
    );

    try {

        const data = await fetchAPI({
            action: "dashboardInit"
        });

        if (!data || !data.success) {
            throw new Error(
                data?.message || "Unable to initialize dashboard."
            );
        }

        // Populate year options.
        populateYears(data.years);

        const savedYear =
            sessionStorage.getItem(STORAGE_KEYS.year);

        const savedPuja =
            sessionStorage.getItem(STORAGE_KEYS.puja);

        const yearExists =
            savedYear &&
            Array.from(yearSelect.options).some(
                option => option.value === savedYear
            );

        const selectedYear =
            yearExists
                ? savedYear
                : String(data.selectedYear);

        yearSelect.value = selectedYear;

        // Restore the saved Puja only when the saved Year is valid.
        const selectedPuja =
            yearExists && PUJAS.includes(savedPuja)
                ? savedPuja
                : (
                    selectedYear === String(data.selectedYear)
                        ? data.selectedPuja
                        : getDefaultPuja()
                );

        populatePujas(selectedPuja);

        saveSelectedFilters();

        updateRoadCollectionButton();

        updateDashboardLoaderStatus(
            "Preparing Dashboard...",
            "Loading financial overview..."
        );

        const filtersMatchInit =
            String(data.selectedYear) === yearSelect.value &&
            data.selectedPuja === pujaSelect.value;

        // Use initialization response if it already matches
        // the selected filters. Otherwise fetch the exact pair.
        if (filtersMatchInit) {

            updateDashboardCards(data);

        } else {

            await loadDashboard({
                silent: true
            });

        }

        isDashboardReady = true;

    } catch (error) {

        console.error(
            "Dashboard initialization error:",
            error
        );

        alert(
            "Unable to load dashboard. Please refresh the page."
        );

    } finally {

        showLoading(false);
        hideDashboardLoader();

    }

}


// ======================================
// YEAR CHANGE
// ======================================

yearSelect?.addEventListener("change", async () => {

    const newYear = yearSelect.value;

    if (!newYear) return;

    // On changing Year, select the date-based default Puja.
    populatePujas(getDefaultPuja());

    saveSelectedFilters();

    updateRoadCollectionButton();

    await loadDashboard();

});


// ======================================
// PUJA CHANGE
// ======================================

pujaSelect?.addEventListener("change", async () => {

    saveSelectedFilters();

    updateRoadCollectionButton();

    await loadDashboard();

});


// ======================================
// COMING SOON MODAL
// ======================================

function showComingSoon(icon, title) {

    const modalIcon =
        document.getElementById("modalIcon");

    const modalTitle =
        document.getElementById("modalTitle");

    const modal =
        document.getElementById("comingSoonModal");

    if (modalIcon) {
        modalIcon.textContent = icon;
    }

    if (modalTitle) {
        modalTitle.textContent = title;
    }

    if (modal) {
        modal.style.display = "flex";
    }

}


function closeModal() {

    const modal =
        document.getElementById("comingSoonModal");

    if (modal) {
        modal.style.display = "none";
    }

}


// ======================================
// COLLECTION PAGE NAVIGATION
// ======================================

function openCollectionPage(page) {

    const year = yearSelect?.value ||
        sessionStorage.getItem(STORAGE_KEYS.year);

    const puja = pujaSelect?.value ||
        sessionStorage.getItem(STORAGE_KEYS.puja);

    if (!year || !puja) {

        alert(
            "Please select a Year and Puja first."
        );

        return;
    }

    saveSelectedFilters();

    sessionStorage.setItem(
        STORAGE_KEYS.returnDashboard,
        "member-dashboard.html"
    );

    navigateTo(page, {
        year,
        puja
    });

}


// ======================================
// ROAD COLLECTION BUTTON
// ======================================

roadCollectionBtn?.addEventListener("click", () => {

    const year = yearSelect?.value;
    const puja = pujaSelect?.value;

    if (puja !== "Saraswati puja") {

        alert(
            "Road Collection is available only during Saraswati Puja."
        );

        return;
    }

    if (!year) {

        alert("Please select a Year first.");

        return;
    }

    saveSelectedFilters();

    sessionStorage.setItem(
        STORAGE_KEYS.returnDashboard,
        "member-dashboard.html"
    );

    navigateTo("road-collection.html", {
        year,
        puja
    });

});


// ======================================
// VILLAGE COLLECTION
// ======================================

document
    .getElementById("villageCollectionBtn")
    ?.addEventListener("click", () => {

        openCollectionPage(
            "village-collection.html"
        );

    });


// ======================================
// MEMBERS COLLECTION
// ======================================

document
    .getElementById("memberCollectionBtn")
    ?.addEventListener("click", () => {

        openCollectionPage(
            "members-collection.html"
        );

    });


// ======================================
// EXPENSES
// ======================================

document
    .getElementById("expenseBtn")
    ?.addEventListener("click", () => {

        openCollectionPage(
            "expenses.html"
        );

    });


// ======================================
// REPORTS
// ======================================

document
    .getElementById("reportBtn")
    ?.addEventListener("click", () => {

        const year = yearSelect?.value;
        const puja = pujaSelect?.value;

        if (!year || !puja) {

            alert(
                "Please select a Year and Puja first."
            );

            return;
        }

        saveSelectedFilters();

        sessionStorage.setItem(
            "reportSource",
            "member"
        );

        navigateTo("report.html", {
            year,
            puja
        });

    });


// ======================================
// MY HISTORY
// ======================================

document
    .getElementById("historyBtn")
    ?.addEventListener("click", () => {

        const year = yearSelect?.value;
        const puja = pujaSelect?.value;

        if (!year || !puja) {

            alert(
                "Please select a Year and Puja first."
            );

            return;
        }

        saveSelectedFilters();

        sessionStorage.setItem(
            STORAGE_KEYS.returnDashboard,
            "member-dashboard.html"
        );

        navigateTo("my-history.html", {
            year,
            puja
        });

    });


// ======================================
// LOGOUT
// ======================================

document
    .getElementById("logoutBtn")
    ?.addEventListener("click", () => {

        clearInterval(dashboardLoaderTimer);
        clearTimeout(dashboardLoaderHideTimer);

        // Clear filters and login session.
        sessionStorage.clear();

        window.location.replace("login.html");

    });


// ======================================
// CHANGE PASSWORD
// ======================================

document
    .getElementById("changePasswordBtn")
    ?.addEventListener("click", () => {

        navigateTo("change-password.html");

    });


// ======================================
// ANALYTICS
// ======================================

document
    .getElementById("analyticsBtn")
    ?.addEventListener("click", () => {

        showComingSoon(
            "📈",
            "Analytics"
        );

    });


// ======================================
// SETTINGS
// ======================================

document
    .getElementById("settingsBtn")
    ?.addEventListener("click", () => {

        showComingSoon(
            "⚙️",
            "Settings"
        );

    });


// ======================================
// START DASHBOARD
// ======================================

loadDashboardInit();
