
"use strict";

// ======================================================
// MURGABANI 1 TO 100 CLUB
// ADMIN DASHBOARD — OPTIMIZED VERSION
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    // ==================================================
    // 1. ADMIN ACCESS PROTECTION
    // ==================================================

    if (
        sessionStorage.getItem("loggedIn") !== "true" ||
        sessionStorage.getItem("memberRole") !== "Admin"
    ) {
        alert("Access denied. Admin login required.");
        window.location.replace("login.html");
        return;
    }

    // ==================================================
    // 2. CONFIGURATION
    // ==================================================

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const PUJAS = [
        "Saraswati puja",
        "Laxmi puja"
    ];

    const STORAGE = {
        year: "selectedYear",
        puja: "selectedPuja",
        returnPage: "returnDashboard"
    };

    // ==================================================
    // 3. ELEMENT REFERENCES
    // ==================================================

    const welcome = document.getElementById("welcome");

    const yearSelect = document.getElementById("year");
    const pujaSelect = document.getElementById("puja");

    const members = document.getElementById("members");
    const collection = document.getElementById("collection");
    const expenses = document.getElementById("expenses");
    const balance = document.getElementById("balance");

    const loading = document.getElementById("loading");

    const roadCollectionBtn =
        document.getElementById("roadCollectionBtn");

    const villageCollectionBtn =
        document.getElementById("villageCollectionBtn");

    const memberCollectionBtn =
        document.getElementById("memberCollectionBtn");

    const expenseBtn =
        document.getElementById("expenseBtn");

    const reportBtn =
        document.getElementById("reportBtn");

    const memberManageBtn =
        document.getElementById("memberManageBtn");

    const myHistoryBtn =
        document.getElementById("myHistoryBtn");

    // ==================================================
    // 4. INITIAL VALIDATION
    // ==================================================

    if (!yearSelect || !pujaSelect) {
        console.error("Admin dashboard filter elements missing.");
        return;
    }

    // ==================================================
    // 5. DASHBOARD STATE
    // ==================================================

    let dashboardRequestId = 0;
    let dashboardInitialized = false;

    let currentYear = "";
    let currentPuja = "";

    // ==================================================
    // 6. WELCOME MESSAGE
    // ==================================================

    if (welcome) {
        welcome.textContent =
            "Welcome, " +
            (sessionStorage.getItem("memberName") || "Member");
    }

    // ==================================================
    // 7. DATE-BASED DEFAULT PUJA
    // ==================================================

    function getDefaultPuja() {

        const month = Number(
            new Intl.DateTimeFormat("en-US", {
                month: "numeric",
                timeZone: "Asia/Kolkata"
            }).format(new Date())
        );

        return month <= 5
            ? "Saraswati puja"
            : "Laxmi puja";
    }

    // ==================================================
    // 8. LOADING CONTROL
    // ==================================================

    function showLoading(show) {

        if (loading) {
            loading.style.display = show ? "block" : "none";
        }

        yearSelect.disabled = show;
        pujaSelect.disabled = show;
    }

    // ==================================================
    // 9. FORMAT CURRENCY
    // ==================================================

    function formatCurrency(value) {

        return "₹" + Number(value || 0).toLocaleString("en-IN");
    }

    // ==================================================
    // 10. UPDATE DASHBOARD CARDS
    // ==================================================

    function updateDashboardCards(data) {

        if (members) {
            members.textContent = Number(data.members || 0);
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

            const balanceValue = Number(data.balance || 0);

            balance.textContent =
                formatCurrency(balanceValue);

            balance.style.color =
                balanceValue >= 0
                    ? "#16a34a"
                    : "#dc2626";
        }
    }

    // ==================================================
    // 11. UPDATE ROAD COLLECTION BUTTON
    // ==================================================

    function updateRoadCollectionButton() {

        if (!roadCollectionBtn) return;

        const restricted =
            currentPuja.toLowerCase() === "laxmi puja";

        roadCollectionBtn.disabled = restricted;

        roadCollectionBtn.setAttribute(
            "aria-disabled",
            String(restricted)
        );

        roadCollectionBtn.title = restricted
            ? "Road Collection is available only during Saraswati Puja."
            : "Enter Road Collection";
    }

    // ==================================================
    // 12. SAVE FILTER SELECTION
    // ==================================================

    function saveSelectedFilters() {

        if (!yearSelect.value || !pujaSelect.value) {
            return;
        }

        currentYear = yearSelect.value;
        currentPuja = pujaSelect.value;

        sessionStorage.setItem(
            STORAGE.year,
            currentYear
        );

        sessionStorage.setItem(
            STORAGE.puja,
            currentPuja
        );

        updateRoadCollectionButton();
    }

    // ==================================================
    // 13. POPULATE YEAR OPTIONS
    // ==================================================

    function populateYears(years) {

        const uniqueYears = [
            ...new Set(
                (years || []).map(String)
            )
        ];

        yearSelect.replaceChildren();

        uniqueYears.forEach(year => {

            const option = document.createElement("option");

            option.value = year;
            option.textContent = year;

            yearSelect.appendChild(option);
        });
    }

    // ==================================================
    // 14. POPULATE PUJA OPTIONS
    // ==================================================

    function populatePujas() {

        pujaSelect.replaceChildren();

        PUJAS.forEach(puja => {

            const option = document.createElement("option");

            option.value = puja;
            option.textContent = puja;

            pujaSelect.appendChild(option);
        });
    }

    // ==================================================
    // 15. API REQUEST
    // ==================================================

    async function fetchAPI(params) {

        const query = new URLSearchParams(params);

        const response = await fetch(
            API_URL + "?" + query.toString(),
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                "Server error: " + response.status
            );
        }

        return response.json();
    }

    // ==================================================
    // 16. LOAD DASHBOARD DATA
    // ==================================================

    async function loadDashboard() {

        if (!yearSelect.value || !pujaSelect.value) {
            return;
        }

        const year = yearSelect.value;
        const puja = pujaSelect.value;

        const requestId = ++dashboardRequestId;

        saveSelectedFilters();
        showLoading(true);

        try {

            const data = await fetchAPI({

                action: "dashboard",

                year: year,

                puja: puja

            });

            // Ignore outdated responses.
            if (requestId !== dashboardRequestId) {
                return;
            }

            if (!data || !data.success) {

                console.error(
                    "Dashboard API error:",
                    data?.message
                );

                return;
            }

            updateDashboardCards(data);

        } catch (error) {

            if (requestId === dashboardRequestId) {

                console.error(
                    "Dashboard loading error:",
                    error
                );

            }

        } finally {

            if (requestId === dashboardRequestId) {
                showLoading(false);
            }
        }
    }

    // ==================================================
    // 17. INITIALIZE DASHBOARD
    // ==================================================

    async function loadDashboardInit() {

        showLoading(true);

        try {

            const data = await fetchAPI({
                action: "dashboardInit"
            });

            if (!data || !data.success) {

                throw new Error(
                    data?.message || "Unable to load dashboard."
                );
            }

            // Populate filters.
            populateYears(data.years);
            populatePujas();

            const savedYear =
                sessionStorage.getItem(STORAGE.year);

            const savedPuja =
                sessionStorage.getItem(STORAGE.puja);

            const availableYears = Array.from(
                yearSelect.options
            ).map(option => option.value);

            // Restore saved Year if available.
            const selectedYear =
                savedYear && availableYears.includes(savedYear)
                    ? savedYear
                    : String(data.selectedYear);

            yearSelect.value = selectedYear;

            // Restore saved Puja if valid.
            const selectedPuja =
                PUJAS.includes(savedPuja)
                    ? savedPuja
                    : data.selectedPuja;

            pujaSelect.value = PUJAS.includes(selectedPuja)
                ? selectedPuja
                : getDefaultPuja();

            currentYear = yearSelect.value;
            currentPuja = pujaSelect.value;

            updateRoadCollectionButton();

            // If restored filters differ from server defaults,
            // request their corresponding financial data.
            const needsCustomData =
                currentYear !== String(data.selectedYear) ||
                currentPuja !== data.selectedPuja;

            if (needsCustomData) {

                saveSelectedFilters();

                showLoading(false);

                await loadDashboard();

            } else {

                updateDashboardCards(data);

                saveSelectedFilters();

                showLoading(false);
            }

            dashboardInitialized = true;

        } catch (error) {

            console.error(
                "Admin dashboard initialization error:",
                error
            );

            showLoading(false);

            alert("Unable to load dashboard. Please refresh the page.");
        }
    }

    // ==================================================
    // 18. YEAR CHANGE
    // ==================================================

    yearSelect.addEventListener("change", () => {

        // Both Puja options remain available.
        populatePujas();

        // Use today's date-based Puja as the new year default.
        pujaSelect.value = getDefaultPuja();

        saveSelectedFilters();

        loadDashboard();
    });

    // ==================================================
    // 19. PUJA CHANGE
    // ==================================================

    pujaSelect.addEventListener("change", () => {

        saveSelectedFilters();

        loadDashboard();
    });

    // ==================================================
    // 20. NAVIGATION HELPER
    // ==================================================

    function openCollectionPage(page) {

        const year = yearSelect.value;
        const puja = pujaSelect.value;

        if (!year || !puja) {

            alert("Please select Year and Puja first.");

            return;
        }

        saveSelectedFilters();

        sessionStorage.setItem(
            STORAGE.returnPage,
            "admin-dashboard.html"
        );

        const url = new URL(
            page,
            window.location.href
        );

        url.searchParams.set("year", year);
        url.searchParams.set("puja", puja);

        window.location.href = url.href;
    }

    // ==================================================
    // 21. ROAD COLLECTION
    // ==================================================

    if (roadCollectionBtn) {

        roadCollectionBtn.addEventListener("click", event => {

            if (
                currentPuja.toLowerCase() === "laxmi puja"
            ) {

                event.preventDefault();

                alert(
                    "Road Collection is available only during Saraswati Puja."
                );

                return;
            }

            saveSelectedFilters();

            sessionStorage.setItem(
                STORAGE.returnPage,
                "admin-dashboard.html"
            );

            const url = new URL(
                "road-collection.html",
                window.location.href
            );

            url.searchParams.set("year", currentYear);
            url.searchParams.set("puja", currentPuja);

            window.location.href = url.href;
        });
    }

    // ==================================================
    // 22. VILLAGE COLLECTION
    // ==================================================

    villageCollectionBtn?.addEventListener("click", () => {

        openCollectionPage("village-collection.html");

    });

    // ==================================================
    // 23. MEMBERS COLLECTION
    // ==================================================

    memberCollectionBtn?.addEventListener("click", () => {

        openCollectionPage("members-collection.html");

    });

    // ==================================================
    // 24. EXPENSES
    // ==================================================

    expenseBtn?.addEventListener("click", () => {

        openCollectionPage("expenses.html");

    });

    // ==================================================
    // 25. REPORTS
    // ==================================================

    reportBtn?.addEventListener("click", () => {

        saveSelectedFilters();

        const url = new URL(
            "report.html",
            window.location.href
        );

        url.searchParams.set("year", currentYear);
        url.searchParams.set("puja", currentPuja);

        window.location.href = url.href;
    });

    // ==================================================
    // 26. MANAGE MEMBERS
    // ==================================================

    memberManageBtn?.addEventListener("click", () => {

        window.location.href = "manage-members.html";

    });

    // ==================================================
    // 27. MY HISTORY
    // ==================================================

    myHistoryBtn?.addEventListener("click", () => {

        if (!yearSelect.value || !pujaSelect.value) {

            alert("Please select Year and Puja first.");

            return;
        }

        saveSelectedFilters();

        sessionStorage.setItem(
            STORAGE.returnPage,
            "admin-dashboard.html"
        );

        const url = new URL(
            "my-history.html",
            window.location.href
        );

        url.searchParams.set("year", currentYear);
        url.searchParams.set("puja", currentPuja);

        window.location.href = url.href;
    });

    // ==================================================
    // 28. LOGOUT
    // ==================================================

    const logoutBtn = document.getElementById("logoutBtn");

    logoutBtn?.addEventListener("click", () => {

        sessionStorage.clear();

        window.location.replace("login.html");
    });

    // ==================================================
    // 29. START DASHBOARD
    // ==================================================

    loadDashboardInit();

});
