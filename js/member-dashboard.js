// ======================================
// MURGABANI CLUB
// Member Dashboard
// ======================================

// ==========================
// Disable Browser Back Button
// ==========================
/*history.pushState(null, null, location.href);

window.addEventListener("popstate", () => {
    history.pushState(null, null, location.href);
});*/

// NEW WEB APP URL
const API_URL =
"https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

// ==========================
// INTERNAL PAGE NAVIGATION
// ==========================
function navigateTo(page) {

    const url = new URL(
        page,
        window.location.href
    );

    // Prevent Acode/WebView from showing cached old page
    url.searchParams.set("_", Date.now());

    // Force a completely new document
    window.location.replace(url.href);
}

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

let dashboardLoaderTimer = null;
let dashboardLoaderProgress = 0;

// Welcome
welcome.textContent =
"Welcome, " + (sessionStorage.getItem("memberName") || "Member");

// Loading
function showLoading(show) {
    loading.style.display = show ? "block" : "none";
  yearSelect.disabled = show;
    pujaSelect.disabled = show;
}


// ======================================
// PREMIUM DASHBOARD LOADER
// ======================================

function showDashboardLoader(){

    if(!dashboardLoader) return;

    dashboardLoader.classList.remove("hidden");

    dashboardLoaderProgress = 0;

    updateDashboardLoader(0);

    updateDashboardLoaderStatus(
        "Member Dashboard",
        "Verifying your membership..."
    );

    clearInterval(dashboardLoaderTimer);

    dashboardLoaderTimer =
        setInterval(() => {

            dashboardLoaderProgress +=
                Math.floor(Math.random() * 6) + 2;

            // Don't automatically reach 100%
            if(dashboardLoaderProgress >= 95){

                dashboardLoaderProgress = 95;

            }

            updateDashboardLoader(
                dashboardLoaderProgress
            );

        },180);

}


function updateDashboardLoader(percent){

    if(loaderPercent){

        loaderPercent.textContent =
            percent + "%";

    }

    if(loaderProgressBar){

        loaderProgressBar.style.width =
            percent + "%";

    }

}


function updateDashboardLoaderStatus(
    title,
    status
){

    if(loaderTitle){

        loaderTitle.textContent =
            title;

    }

    if(loaderStatus){

        loaderStatus.textContent =
            status;

    }

}


function hideDashboardLoader(){

    clearInterval(
        dashboardLoaderTimer
    );

    updateDashboardLoader(100);

    updateDashboardLoaderStatus(
        "Dashboard Ready",
        "Welcome to MURGABANI MIS"
    );

    setTimeout(() => {

        if(dashboardLoader){

            dashboardLoader.classList.add(
                "hidden"
            );

        }

    },450);

}

// Load Dashboard (Fast)
async function loadDashboardInit() {

    showDashboardLoader();

    showLoading(true);

    updateDashboardLoaderStatus(
        "Member Dashboard",
        "Connecting to club database..."
    );

    try {

        const response =
            await fetch(
                API_URL +
                "?action=dashboardInit"
            );

        updateDashboardLoaderStatus(
            "Loading Club Data...",
            "Fetching dashboard information..."
        );

        const data =
            await response.json();

        if (!data.success) {

            alert(
                "Unable to load dashboard."
            );

            return;

        }

        // ==================================
        // YEARS
        // ==================================

        yearSelect.innerHTML = "";

        data.years.forEach(year => {

            yearSelect.innerHTML +=
                `<option value="${year}">
                    ${year}
                </option>`;

        });

        const savedYear =
            sessionStorage.getItem(
                "selectedYear"
            );

        yearSelect.value =
            savedYear ||
            data.selectedYear;


        // ==================================
        // PUJAS
        // ==================================

        updateDashboardLoaderStatus(
            "Preparing Filters...",
            "Loading Puja information..."
        );

        pujaSelect.innerHTML = "";

        data.pujas.forEach(puja => {

            pujaSelect.innerHTML +=
                `<option value="${puja}">
                    ${puja}
                </option>`;

        });

        const savedPuja =
            sessionStorage.getItem(
                "selectedPuja"
            );

        pujaSelect.value =
            savedPuja ||
            data.selectedPuja;


        // ==================================
        // DASHBOARD CARDS
        // ==================================

        updateDashboardLoaderStatus(
            "Preparing Dashboard...",
            "Updating financial overview..."
        );

        members.textContent =
            data.members;

        collection.textContent =
            "₹" +
            Number(
                data.collection
            ).toLocaleString("en-IN");

        expenses.textContent =
            "₹" +
            Number(
                data.expense
            ).toLocaleString("en-IN");

        balance.textContent =
            "₹" +
            Number(
                data.balance
            ).toLocaleString("en-IN");

        balance.style.color =
            Number(data.balance) >= 0
                ? "#16a34a"
                : "#dc2626";


                // ==================================
        // LOAD DATA FOR RESTORED FILTERS
        // ==================================

      //await loadDashboard();

    } catch (err) {

        console.error(err);

        alert(
            "Unable to load dashboard."
        );

    } finally {

        showLoading(false);

        hideDashboardLoader();

    }

}

// Reload Dashboard when filter changes
async function loadDashboard() {

    showLoading(true);

  // Save selected filters globally
sessionStorage.setItem("selectedYear", yearSelect.value);
sessionStorage.setItem("selectedPuja", pujaSelect.value);

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

// Save the new year and the newly selected puja
sessionStorage.setItem(
    "selectedYear",
    yearSelect.value
);

sessionStorage.setItem(
    "selectedPuja",
    pujaSelect.value
);

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

function showComingSoon(icon,title){

    document.getElementById("modalIcon").textContent=icon;

    document.getElementById("modalTitle").textContent=title;

    document.getElementById("comingSoonModal").style.display="flex";

}

function closeModal(){

    document.getElementById("comingSoonModal").style.display="none";

}



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

})/


document.getElementById("roadCollectionBtn").addEventListener("click", () => {
    navigateTo("road-collection.html");
});*/


document.getElementById("roadCollectionBtn").addEventListener("click", () => {

    sessionStorage.setItem("returnDashboard", "member-dashboard.html");

    navigateTo("road-collection.html");

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
/*document.getElementById("reportBtn").addEventListener("click", () => {

    const year = yearSelect.value;
    const puja = pujaSelect.value;

    sessionStorage.setItem("selectedYear", yearSelect.value);
sessionStorage.setItem("selectedPuja", pujaSelect.value);

window.location.href = "report.html"



});*/

/*document.getElementById("reportBtn").addEventListener("click", () => {

    sessionStorage.setItem("selectedYear", yearSelect.value);
    sessionStorage.setItem("selectedPuja", pujaSelect.value);

    navigateTo("report.html");

});*/

// ==========================
// Reports Button
// ==========================
document.getElementById("reportBtn").addEventListener("click", () => {

    const selectedYear = yearSelect.value;
    const selectedPuja = pujaSelect.value;

    // Save filters
    sessionStorage.setItem(
        "selectedYear",
        selectedYear
    );

    sessionStorage.setItem(
        "selectedPuja",
        selectedPuja
    );

sessionStorage.setItem(
    "reportSource",
    "member"
);
  
    // Create report URL
    const reportURL = new URL(
        "report.html",
        window.location.href
    );

    reportURL.searchParams.set(
        "year",
        selectedYear
    );

    reportURL.searchParams.set(
        "puja",
        selectedPuja
    );

    // Cache buster
    reportURL.searchParams.set(
        "_",
        Date.now()
    );

    // Force new page
    window.location.replace(
        reportURL.href
    );

});

// ==========================
// Logout Button
// ==========================
/*document.getElementById("logoutBtn").addEventListener("click", () => {

    sessionStorage.clear();

    window.location.href = "login.html";

}); */

// ==========================
// Logout Button
// ==========================
document.getElementById("logoutBtn").addEventListener("click", () => {

    sessionStorage.clear();

    window.location.replace("login.html");

});

// ==========================
// Change Password Button
// ==========================
/*document.getElementById("changePasswordBtn").addEventListener("click", () => {

    window.location.href = "change-password.html";

});*/

document.getElementById("changePasswordBtn").addEventListener("click", () => {
    navigateTo("change-password.html");
});

// ==========================
// Analytics Button
// ==========================
document.getElementById("analyticsBtn")
    ?.addEventListener("click", () => {
        showComingSoon("📈", "Analytics");
    });

// ==========================
// My History Button
// ==========================
const historyBtn = document.getElementById("historyBtn");

if (historyBtn) {
    historyBtn.addEventListener("click", () => {

        const year = yearSelect.value;
        const puja = pujaSelect.value;

        if (!year || !puja) {
            alert("Please select Year and Puja first.");
            return;
        }

        sessionStorage.setItem("selectedYear", year);
        sessionStorage.setItem("selectedPuja", puja);
        sessionStorage.setItem("returnDashboard", "member-dashboard.html");

        const url = new URL("my-history.html", window.location.href);

        url.searchParams.set("year", year);
        url.searchParams.set("puja", puja);
        url.searchParams.set("_", Date.now());

        window.location.href = url.href;
    });
}

// ==========================
// Settings Button
// ==========================
document.getElementById("settingsBtn").addEventListener("click", () => {

    showComingSoon("⚙️", "Settings");

});
