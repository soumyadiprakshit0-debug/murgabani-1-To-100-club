document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector("form");
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const toggle = document.getElementById("togglePassword");

    if (!form || !username || !password || !toggle) {
        console.error("Required HTML elements not found.");
        return;
    }

function showLoginModal(icon,title,message){

document.getElementById("loginModalIcon").textContent=icon;
document.getElementById("loginModalTitle").textContent=title;
document.getElementById("loginModalMessage").textContent=message;

document.getElementById("loginModal").style.display="flex";

}

function closeLoginModal(){

document.getElementById("loginModal").style.display="none";

}
window.closeLoginModal = closeLoginModal;

  
function showLoading(show){

document.getElementById("loadingOverlay").style.display=
show ? "flex" : "none";

}
  
    form.addEventListener("submit", async (e) => {

        e.preventDefault();
      
showLoading(true);

const loginBtn = form.querySelector("button");
loginBtn.disabled = true;
loginBtn.textContent = "Logging in...";
      
        try {

            const response = await fetch(
    "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec" +
    "?action=login" +
    "&memberId=" + encodeURIComponent(username.value.trim()) +
    "&password=" + encodeURIComponent(password.value)
);

   const result = await response.json();

if (result.success) {         

    // Save login session (replacement below by it)
/*    sessionStorage.setItem("loggedIn", "true");
sessionStorage.setItem("memberId", result.memberId);
sessionStorage.setItem("memberName", result.name);
sessionStorage.setItem("memberRole", result.role);  */

// =================================
// SAVE LOGIN SESSION
// =================================

sessionStorage.setItem("loggedIn", "true");

sessionStorage.setItem("memberId", result.memberId);

sessionStorage.setItem("memberName", result.name);

sessionStorage.setItem("memberRole", result.role);


// =================================
// SAVE CLUB FUND AUTHENTICATION TOKEN
// =================================

if (result.clubFundToken) {

    sessionStorage.setItem(
        "clubFundToken",
        result.clubFundToken
    );

} else {

    console.error(
        "Club Fund authentication token was not received."
    );

}
    
    showLoading(false);

  if (result.mustChangePassword) {

    location.href = "./change-password.html";

} else if (result.role === "Admin") {

    location.href = "./admin-dashboard.html";

} else {

    location.href = "./member-dashboard.html";

} 

}

            else {

                showLoading(false);

loginBtn.disabled = false;
loginBtn.textContent = "Login";

showLoginModal(
    "❌",
    "Login Failed",
    "Invalid Member ID or Password.\n\nPlease check your Member ID and Password and try again."
);

            }

        } catch (error) {

        console.error(error);

showLoading(false);

loginBtn.disabled = false;
loginBtn.textContent = "Login";

showLoginModal(
    "⚠️",
    "Network Error",
    "Unable to connect to the server.\nPlease try again."
);    
        }

    });

    toggle.addEventListener("click", () => {

        if (password.type === "password") {
            password.type = "text";
            toggle.textContent = "🙈";
        } else {
            password.type = "password";
            toggle.textContent = "👁️";
        }

    });

});
