
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




    
/* =====================================================
   PREMIUM ROAD COLLECTION RESTRICTION NOTIFICATION
   ===================================================== */

function showRoadCollectionRestrictionAlert() {

    // Prevent multiple notifications
    if (document.getElementById("roadRestrictionModal")) {
        return;
    }

    // Add notification styles once
    if (!document.getElementById("roadRestrictionModalStyles")) {

        const style = document.createElement("style");

        style.id = "roadRestrictionModalStyles";

        style.textContent = `
            .road-restriction-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(15, 23, 42, 0.62);
                backdrop-filter: blur(7px);
                -webkit-backdrop-filter: blur(7px);
                animation: roadModalFade .22s ease;
            }

            .road-restriction-modal {
                width: 100%;
                max-width: 390px;
                padding: 28px 24px 23px;
                border-radius: 22px;
                background: #ffffff;
                text-align: center;
                box-shadow: 0 22px 65px rgba(0,0,0,.25);
                animation: roadModalSlide .28s ease;
            }

            .road-restriction-icon {
                width: 76px;
                height: 76px;
                margin: 0 auto 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: #fff4d6;
                font-size: 36px;
            }

            .road-restriction-modal h2 {
                margin: 0 0 12px;
                color: #172033;
                font-size: 22px;
                font-weight: 750;
            }

            .road-restriction-modal p {
                margin: 0;
                color: #64748b;
                font-size: 15px;
                line-height: 1.7;
            }

            .road-restriction-modal button {
                width: 100%;
                margin-top: 25px;
                padding: 14px;
                border: none;
                border-radius: 12px;
                background: linear-gradient(135deg, #1d4ed8, #2563eb);
                color: #ffffff;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                transition: transform .2s, opacity .2s;
            }

            .road-restriction-modal button:active {
                transform: scale(.97);
                opacity: .9;
            }

            @keyframes roadModalFade {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes roadModalSlide {
                from {
                    opacity: 0;
                    transform: translateY(15px) scale(.96);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            @media(max-width: 480px) {
                .road-restriction-modal {
                    max-width: 100%;
                    padding: 25px 21px 21px;
                    border-radius: 20px;
                }

                .road-restriction-modal h2 {
                    font-size: 21px;
                }

                .road-restriction-modal p {
                    font-size: 14px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Create modal
    const overlay = document.createElement("div");

    overlay.id = "roadRestrictionModal";
    overlay.className = "road-restriction-overlay";

    overlay.innerHTML = `
        <div class="road-restriction-modal"
             role="dialog"
             aria-modal="true"
             aria-labelledby="roadRestrictionTitle">

            <div class="road-restriction-icon">
                ⚠️
            </div>

            <h2 id="roadRestrictionTitle">
                Road Collection Unavailable
            </h2>

            <p>
                Road Collection is available only during
                <strong>Saraswati Puja</strong>.

                <br><br>

                Please select Saraswati Puja from the
                dashboard to access this feature.
            </p>

            <button type="button" id="roadRestrictionClose">
                Got it
            </button>

        </div>
    `;

    document.body.appendChild(overlay);

    const closeButton =
        document.getElementById("roadRestrictionClose");

    closeButton.addEventListener("click", () => {
        overlay.remove();
    });

    // Close when tapping outside the modal
    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            overlay.remove();
        }
    });

    closeButton.focus();
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

               showRoadCollectionRestrictionAlert();
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
