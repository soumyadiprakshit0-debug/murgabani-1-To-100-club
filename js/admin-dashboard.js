// ======================================
// MURGABANI CLUB
// Admin Dashboard
// ======================================
// ======================================
// ADMIN ACCESS PROTECTION
// ======================================

const loggedIn = sessionStorage.getItem("loggedIn");
const memberRole = sessionStorage.getItem("memberRole");

if (loggedIn !== "true" || memberRole !== "Admin") {

    alert("Access denied. Admin login required.");

    window.location.replace("login.html");

    throw new Error("Unauthorized admin access");

}


// ==========================
// Disable Browser Back Button
// ==========================
history.pushState(null, null, location.href);

window.addEventListener("popstate", () => {
    history.pushState(null, null, location.href);
});

// NEW WEB APP URL
const API_URL =
"https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

const welcome = document.getElementById("welcome");
const yearSelect = document.getElementById("year");
const pujaSelect = document.getElementById("puja");

const members = document.getElementById("members");
const collection = document.getElementById("collection");
const expenses = document.getElementById("expenses");
const balance = document.getElementById("balance");

const loading = document.getElementById("loading");

// Welcome
welcome.textContent =
"Welcome, " + (sessionStorage.getItem("memberName") || "Member");

// Loading
function showLoading(show) {
    loading.style.display = show ? "block" : "none";
  yearSelect.disabled = show;
    pujaSelect.disabled = show;
}

// Load Dashboard (Fast)
async function loadDashboardInit() {

    showLoading(true);

    try {

        const response = await fetch(API_URL + "?action=dashboardInit");
        const data = await response.json();

        if (!data.success) {
            alert("Unable to load dashboard.");
            return;
        }

        // Years
        yearSelect.innerHTML = "";

        data.years.forEach(year => {

            yearSelect.innerHTML +=
                `<option value="${year}">${year}</option>`;

        });

        yearSelect.value = data.selectedYear;

        // Pujas
        pujaSelect.innerHTML = "";

        data.pujas.forEach(puja => {

            pujaSelect.innerHTML +=
                `<option value="${puja}">${puja}</option>`;

        });

        pujaSelect.value = data.selectedPuja;

        // Cards
        members.textContent = data.members;
        collection.textContent =
"₹" + Number(data.collection).toLocaleString("en-IN");

expenses.textContent =
"₹" + Number(data.expense).toLocaleString("en-IN");

balance.textContent =
"₹" + Number(data.balance).toLocaleString("en-IN");
      balance.style.color =
Number(data.balance) >= 0
? "#16a34a"
: "#dc2626";

    } catch (err) {

        console.error(err);
        alert("Unable to load dashboard.");

    }

    showLoading(false);
}

// Reload Dashboard when filter changes
async function loadDashboard() {

    showLoading(true);

    try {

        const response = await fetch(
            API_URL +
            "?action=dashboard" +
            "&year=" + encodeURIComponent(yearSelect.value) +
            "&puja=" + encodeURIComponent(pujaSelect.value)
        );

        const data = await response.json();

        if (data.success) {

            members.textContent = data.members;
         collection.textContent =
"₹" + Number(data.collection).toLocaleString("en-IN");

expenses.textContent =
"₹" + Number(data.expense).toLocaleString("en-IN");

balance.textContent =
"₹" + Number(data.balance).toLocaleString("en-IN"); 
          balance.style.color =
Number(data.balance) >= 0
? "#16a34a"
: "#dc2626";

        }

    } catch (err) {

        console.error(err);

    }

    showLoading(false);
}

// Change Year
yearSelect.addEventListener("change", async () => {

    showLoading(true);

    try {

        const response = await fetch(
            API_URL +
            "?action=pujas&year=" +
            encodeURIComponent(yearSelect.value)
        );

        const pujas = await response.json();

        pujaSelect.innerHTML = "";

        pujas.forEach(puja => {

            pujaSelect.innerHTML +=
                `<option value="${puja}">${puja}</option>`;

        });

        await loadDashboard();

    } catch (err) {

        console.error(err);

    }

    showLoading(false);

});

// Change Puja
pujaSelect.addEventListener("change", loadDashboard);

// Start
loadDashboardInit();



/* =====================================================
   CUSTOM COLLECTION PAGE NAVIGATION
   ===================================================== */

function openCollectionPage(page) {
    const yearSelect = document.getElementById("year");
    const pujaSelect = document.getElementById("puja");

    const year = yearSelect?.value || sessionStorage.getItem("selectedYear") || "";
    const puja = pujaSelect?.value || sessionStorage.getItem("selectedPuja") || "";

    if (!year || !puja) {
        alert("Please select a year and Puja before opening this page.");
        return;
    }

    // Preserve the dashboard filters.
    sessionStorage.setItem("selectedYear", year);
    sessionStorage.setItem("selectedPuja", puja);

    // Preserve the correct return destination.
    const isAdminDashboard =
        window.location.pathname.toLowerCase().endsWith("admin-dashboard.html");

    const dashboardPage = isAdminDashboard
        ? "admin-dashboard.html"
        : "member-dashboard.html";

    sessionStorage.setItem("returnDashboard", dashboardPage);

    // Pass the selected context to the collection page.
    const url = new URL(page, window.location.href);
    url.searchParams.set("year", year);
    url.searchParams.set("puja", puja);
    url.searchParams.set("_", Date.now());

    window.location.href = url.href;
}

// ==========================
// Road Collection Button
// ==========================
/*document.getElementById("roadCollectionBtn").addEventListener("click", () => {

    window.location.assign("road-collection.html");

});*/

document.getElementById("roadCollectionBtn").addEventListener("click", () => {

    sessionStorage.setItem("returnDashboard", "admin-dashboard.html");

    window.location.assign("road-collection.html");

});


/* Village Collection */
document.getElementById("villageCollectionBtn")
    ?.addEventListener("click", () => {
        openCollectionPage("village-collection.html");
    });

/* Members Collection */
document.getElementById("memberCollectionBtn")
    ?.addEventListener("click", () => {
        openCollectionPage("members-collection.html");
    });

/* Expenses */
document.getElementById("expenseBtn")
    ?.addEventListener("click", () => {
        openCollectionPage("expenses.html");
    });

// ==========================
// Reports Button
// ==========================
document.getElementById("reportBtn").addEventListener("click", () => {

    const year = yearSelect.value;
    const puja = pujaSelect.value;

    window.location.href =
        "report.html?year=" +
        encodeURIComponent(year) +
        "&puja=" +
        encodeURIComponent(puja);

});

// ==========================
// Manage Members Button
// ==========================

document.getElementById("memberManageBtn").addEventListener("click", () => {

    window.location.assign("manage-members.html");

});


// ==========================
// My History Button
// ==========================

document.getElementById("myHistoryBtn")
    ?.addEventListener("click", () => {

        const year = yearSelect.value;
        const puja = pujaSelect.value;

        if (!year || !puja) {
            alert("Please select Year and Puja first.");
            return;
        }

        // Preserve dashboard selection.
        sessionStorage.setItem("selectedYear", year);
        sessionStorage.setItem("selectedPuja", puja);

        // Preserve correct dashboard destination.
        sessionStorage.setItem(
            "returnDashboard",
            "admin-dashboard.html"
        );

        // Open My History with selected context.
        const url = new URL(
            "my-history.html",
            window.location.href
        );

        url.searchParams.set("year", year);
        url.searchParams.set("puja", puja);

        window.location.href = url.href;

    });
