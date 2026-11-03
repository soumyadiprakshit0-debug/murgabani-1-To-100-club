
/* =========================================================
   MURGABANI 1 TO 100 CLUB
   DOCUMENT CENTRE - FRONTEND
   File: js/documents.js
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       1. CONFIGURATION
    ===================================================== */

    const API_URL =
        "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    const CATEGORIES = [
        "Notices",
        "Financial Reports",
        "Committee Records",
        "Puja Documents",
        "Other"
    ];

    const $ = id => document.getElementById(id);


    /* =====================================================
       2. STATE
    ===================================================== */

    const state = {
        token: "",
        memberId: "",
        memberName: "",
        role: "",

        isLoggedIn: false,

        publishedDocuments: [],
        myDocuments: [],
        adminDocuments: [],

        adminTab: "published",

        pendingAction: null,
        loading: false
    };


    /* =====================================================
       3. SESSION
    ===================================================== */

    function readSession() {

        state.token =
            sessionStorage.getItem("clubFundToken") || "";

        state.memberId =
            sessionStorage.getItem("memberId") || "";

        state.memberName =
            sessionStorage.getItem("memberName") || "";

        state.role =
            sessionStorage.getItem("memberRole") || "";

        state.isLoggedIn =
            Boolean(state.token && state.memberId);

        if (!state.isLoggedIn) {
            state.role = "";
        }
    }


    function isAdmin() {

        return (
            state.isLoggedIn &&
            state.role.trim().toLowerCase() === "admin"
        );
    }


   
/* =====================================================
   BACK BUTTON REDIRECTION
===================================================== */

function configureBackButton() {

    const backButton = document.querySelector(".back-link");

    if (!backButton) return;

    if (state.isLoggedIn) {

        if (isAdmin()) {

            backButton.href = "admin-dashboard.html";

        } else {

            backButton.href = "member-dashboard.html";

        }

        backButton.textContent = "❮ Back to Dashboard";

    } else {

        backButton.href = "index.html";

        backButton.textContent = "❮ Back to Home";

    }
}



    /* =====================================================
       4. DOM HELPERS
    ===================================================== */

    function show(element, visible = true) {

        if (!element) return;

        element.hidden = !visible;
    }


    function setText(id, value) {

        const element = $(id);

        if (element) {
            element.textContent = value || "";
        }
    }


    function escapeHTML(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]
        );
    }


    function formatDate(value) {

        if (!value) return "Date unavailable";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
    }


    function formatFileSize(bytes) {

        const size = Number(bytes) || 0;

        if (size < 1024) {
            return size + " B";
        }

        if (size < 1024 * 1024) {
            return (size / 1024).toFixed(1) + " KB";
        }

        return (size / (1024 * 1024)).toFixed(2) + " MB";
    }


    function showStatus(message) {

        const element = $("documentStatus");

        if (!element) return;

        element.textContent = message;
        show(element, true);
    }


    function hideStatus() {

        show($("documentStatus"), false);
    }


   
/* =====================================================
   PREMIUM GLOBAL LOADER
===================================================== */

let activeLoaders = 0;

function startGlobalLoader(message = "Please wait...") {

    const loader = $("globalLoader");

    if (!loader) return () => {};

    activeLoaders++;

    setText("loaderMessage", message);

    loader.hidden = false;

    let stopped = false;

    return function stopGlobalLoader() {

        if (stopped) return;

        stopped = true;

        activeLoaders = Math.max(0, activeLoaders - 1);

        if (activeLoaders === 0) {
            loader.hidden = true;
        }
    };
}


    function showError(message) {

        show($("documentGrid"), false);
        show($("emptyState"), false);
        show($("errorState"), true);

        setText("errorMessage", message);
    }


    /* =====================================================
       5. API REQUESTS
    ===================================================== */

    async function api(action, data = {}, authenticated = true) {

        const payload = {
            action,
            ...data
        };

        if (authenticated) {

            if (!state.token) {
                throw new Error(
                    "Your login session has expired. Please log in again."
                );
            }

            payload.token = state.token;
        }

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify(payload),

            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(
                "Server returned HTTP " + response.status
            );
        }

        const result = await response.json();

        if (!result || result.success !== true) {

            throw new Error(
                result?.message ||
                "The request could not be completed."
            );
        }

        return result;
    }


    async function getPublicDocuments() {

        const url =
            API_URL +
            "?action=getPublishedDocuments";

        const response = await fetch(url, {
            method: "GET",
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(
                "Unable to connect to the document server."
            );
        }

        const result = await response.json();

        if (!result || result.success !== true) {

            throw new Error(
                result?.message ||
                "Unable to load published documents."
            );
        }

        return result.data?.documents || [];
    }


    /* =====================================================
       6. DOCUMENT COUNT
    ===================================================== */

    function updateDocumentCount(count) {

        setText(
            "documentCount",
            count + (count === 1 ? " Document" : " Documents")
        );
    }


    /* =====================================================
       7. SEARCH AND FILTER
    ===================================================== */

   
function getFilteredDocuments() {

    const search =
        ($("documentSearch")?.value || "")
            .trim()
            .toLowerCase();

    // Search only. No category or sorting filters.
    // The backend already returns newest documents first.

    return [...state.publishedDocuments]
        .filter(doc => {

            return [
                doc.title,
                doc.description,
                doc.category,
                doc.fileName,
                doc.uploadedByName
            ].some(value =>
                String(value || "")
                    .toLowerCase()
                    .includes(search)
            );

        })
        .sort((a, b) => {

            const dateA =
                new Date(a.publishedAt || 0).getTime();

            const dateB =
                new Date(b.publishedAt || 0).getTime();

            return dateB - dateA;

        });
}



    /* =====================================================
       8. PUBLIC DOCUMENT CARDS
    ===================================================== */

    function renderPublishedDocuments() {

        const grid = $("documentGrid");

        if (!grid) return;

        const documents = getFilteredDocuments();

        updateDocumentCount(documents.length);

        grid.innerHTML = "";

        hideStatus();
        show($("errorState"), false);

        if (!documents.length) {

            show(grid, false);
            show($("emptyState"), true);

            return;
        }

        show(grid, true);
        show($("emptyState"), false);

        grid.innerHTML = documents.map(doc => {

            const id = escapeHTML(doc.documentId);

            return `
                <article class="document-card">

                    <div class="document-card-top">

                        <div class="document-file-icon">
                            📄
                        </div>

                        <div class="document-card-info">

                            <h3 class="document-card-title">
                                ${escapeHTML(doc.title)}
                            </h3>

                            <span class="document-category">
                                ${escapeHTML(doc.category)}
                            </span>

                        </div>

                    </div>

                    <p class="document-description">
                        ${escapeHTML(
                            doc.description || "No description available."
                        )}
                    </p>

                    <div class="document-meta">

                        <span>
                            📅 ${escapeHTML(formatDate(doc.publishedAt))}
                        </span>

                        <span>
                            📦 ${escapeHTML(formatFileSize(doc.fileSize))}
                        </span>

                        <span>
                            👤 ${escapeHTML(doc.uploadedByName || "Club")}
                        </span>

                    </div>

                    <div class="document-actions">

                        <button
                            type="button"
                            class="btn btn-secondary"
                            data-preview="${id}"
                        >
                            👁 Preview
                        </button>

                        <a
                            class="btn btn-primary"
                            href="${escapeHTML(doc.downloadUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            📥 Download
                        </a>

                    </div>

                </article>
            `;

        }).join("");
    }


    /* =====================================================
       9. LOAD PUBLIC DOCUMENTS
    ===================================================== */

    
async function loadPublishedDocuments() {

    const stopLoader = startGlobalLoader(
        "Loading published documents..."
    );

    show($("errorState"), false);
    show($("emptyState"), false);
    show($("documentGrid"), false);

    showStatus("Loading published documents...");

    try {

        state.publishedDocuments =
            await getPublicDocuments();

        renderPublishedDocuments();

    } catch (error) {

        console.error(
            "Public document loading failed:",
            error
        );

        showError(error.message);

    } finally {

        stopLoader();
    }
}

    /* =====================================================
       10. PDF PREVIEW
    ===================================================== */

    function openPreview(documentId) {

        const doc = state.publishedDocuments.find(
            item => item.documentId === documentId
        );

        if (!doc || !doc.previewUrl) return;

        const modal = $("previewModal");
        const frame = $("documentPreviewFrame");

        if (!modal || !frame) return;

        setText("previewTitle", doc.title);

        frame.src = doc.previewUrl;

        show(modal, true);

        document.body.style.overflow = "hidden";
    }


    function closePreview() {

        const frame = $("documentPreviewFrame");

        if (frame) {
            frame.src = "about:blank";
        }

        show($("previewModal"), false);

        document.body.style.overflow = "";
    }


    /* =====================================================
       11. USER SECTION VISIBILITY
    ===================================================== */

    function configureUserSections() {

        show(
            $("uploadPanel"),
            state.isLoggedIn
        );

        show(
            $("myDocumentsPanel"),
            state.isLoggedIn
        );

        show(
            $("adminDocumentsPanel"),
            isAdmin()
        );
    }


    /* =====================================================
       12. FILE READER
    ===================================================== */

    function readFileAsBase64(file) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => {

                const result = String(reader.result || "");

                const commaIndex = result.indexOf(",");

                if (commaIndex < 0) {
                    reject(
                        new Error("Unable to read the selected PDF.")
                    );
                    return;
                }

                resolve(
                    result.substring(commaIndex + 1)
                );
            };

            reader.onerror = () => {

                reject(
                    new Error("Unable to read the selected file.")
                );
            };

            reader.readAsDataURL(file);
        });
    }


    /* =====================================================
       13. UPLOAD MESSAGE
    ===================================================== */

    function showUploadMessage(message, type) {

        const element = $("uploadMessage");

        if (!element) return;

        element.textContent = message;

        element.className =
            "upload-message " + type;

        show(element, true);
    }


    function resetUploadProgress() {

        show($("uploadProgress"), false);

        const bar = $("progressBar");

        if (bar) {
            bar.style.width = "0%";
        }

        setText("uploadProgressText", "");
    }


    /* =====================================================
       14. UPLOAD DOCUMENT
    ===================================================== */

    async function uploadDocument(event) {

        event.preventDefault();

        if (state.loading) return;

        if (!state.isLoggedIn) {

            showUploadMessage(
                "Please log in before uploading documents.",
                "error"
            );

            return;
        }

        const title =
            $("documentTitle").value.trim();

        const category =
            $("documentCategory").value;

        const description =
            $("documentDescription").value.trim();

        const file =
            $("documentFile").files[0];

        if (!title || !category || !file) {

            showUploadMessage(
                "Please complete all required fields.",
                "error"
            );

            return;
        }

        if (!CATEGORIES.includes(category)) {

            showUploadMessage(
                "Please select a valid category.",
                "error"
            );

            return;
        }

        if (!/\.pdf$/i.test(file.name)) {

            showUploadMessage(
                "Only PDF files are allowed.",
                "error"
            );

            return;
        }

        if (file.type !== "application/pdf") {

            showUploadMessage(
                "The selected file must be a PDF.",
                "error"
            );

            return;
        }

        if (file.size === 0 || file.size > MAX_FILE_SIZE) {

            showUploadMessage(
                "PDF size must be greater than 0 and must not exceed 10 MB.",
                "error"
            );

            return;
        }

        const button = $("uploadDocumentBtn");

        state.loading = true;

        if (button) {
            button.disabled = true;
            button.textContent = "Preparing PDF...";
        }

        show($("uploadMessage"), false);
        show($("uploadProgress"), true);

        setText(
            "uploadProgressText",
            "Reading and validating PDF..."
        );

        try {

            const fileBase64 =
                await readFileAsBase64(file);

            setText(
                "uploadProgressText",
                "Uploading and publishing document..."
            );

            const result = await api(
                "uploadDocument",
                {
                    title,
                    category,
                    description,
                    fileName: file.name,
                    mimeType: file.type,
                    fileBase64
                }
            );

            setText(
                "uploadProgressText",
                "Publication completed."
            );

            if ($("progressBar")) {
                $("progressBar").style.width = "100%";
            }

            showUploadMessage(
                result.message ||
                "Document published successfully.",
                "success"
            );

            $("documentUploadForm").reset();

            await loadPublishedDocuments();

            await loadMyDocuments();

            if (isAdmin()) {
                await loadAdminDocuments();
            }

        } catch (error) {

            console.error(
                "Document upload failed:",
                error
            );

            showUploadMessage(
                error.message ||
                "Unable to publish the document.",
                "error"
            );

        } finally {

            state.loading = false;

            if (button) {
                button.disabled = false;
                button.textContent = "📤 Publish Document";
            }

            resetUploadProgress();
        }
    }


    /* =====================================================
       15. MY UPLOADED DOCUMENTS
    ===================================================== */

    
async function loadMyDocuments() {

    if (!state.isLoggedIn) return;

    const container = $("myDocumentsList");

    if (!container) return;

    const stopLoader = startGlobalLoader(
        "Loading your documents..."
    );

    container.textContent = "Loading your documents...";

    try {

        const result = await api("getMyDocuments");

        state.myDocuments =
            result.data?.documents || [];

        renderMyDocuments();

    } catch (error) {

        console.error(
            "My documents loading failed:",
            error
        );

        container.textContent = error.message;

    } finally {

        stopLoader();
    }
}

   

    function renderMyDocuments() {

        const container = $("myDocumentsList");

        if (!container) return;

        if (!state.myDocuments.length) {

            container.textContent =
                "You have not uploaded any documents yet.";

            return;
        }

        container.innerHTML =
            state.myDocuments.map(doc => `

                <article class="my-document-item">

                    <div class="my-document-info">

                        <h3>
                            ${escapeHTML(doc.title)}
                        </h3>

                        <p>
                            ${escapeHTML(doc.category)}
                            · ${escapeHTML(formatDate(doc.uploadedAt))}
                            · ${escapeHTML(doc.status)}
                        </p>

                    </div>

                    <div class="my-document-actions">

                        <span class="document-category">
                            ${escapeHTML(doc.status)}
                        </span>

                    </div>

                </article>

            `).join("");
    }


    /* =====================================================
       16. ADMIN DOCUMENT MANAGEMENT
    ===================================================== */

    
async function loadAdminDocuments() {

    if (!isAdmin()) return;

    const container = $("adminDocumentsList");

    if (!container) return;

    const stopLoader = startGlobalLoader(
        "Loading club documents..."
    );

    container.textContent = "Loading documents...";

    try {

        const result = await api("getAllDocuments");

        state.adminDocuments =
            result.data?.documents || [];

        renderAdminDocuments();

    } catch (error) {

        console.error(
            "Admin document loading failed:",
            error
        );

        container.textContent = error.message;

    } finally {

        stopLoader();
    }
}


    function renderAdminDocuments() {

        const container = $("adminDocumentsList");

        if (!container) return;

        const documents = state.adminDocuments.filter(doc => {

            return state.adminTab === "published"
                ? doc.status === "Published"
                : doc.status === "Archived";
        });

        if (!documents.length) {

            container.textContent =
                "No " + state.adminTab + " documents found.";

            return;
        }

        container.innerHTML =
            documents.map(doc => {

                const id = escapeHTML(doc.documentId);

                let actions = "";

                if (doc.status === "Published") {

                    actions = `
                        <button
                            type="button"
                            class="btn btn-secondary btn-small"
                            data-admin-action="archive"
                            data-id="${id}"
                        >
                            Archive
                        </button>
                    `;

                } else {

                    actions = `
                        <button
                            type="button"
                            class="btn btn-primary btn-small"
                            data-admin-action="restore"
                            data-id="${id}"
                        >
                            Restore
                        </button>
                    `;
                }

                actions += `
                    <button
                        type="button"
                        class="btn btn-danger btn-small"
                        data-admin-action="delete"
                        data-id="${id}"
                    >
                        Delete
                    </button>
                `;

                return `

                    <article class="admin-document-item">

                        <div class="admin-document-info">

                            <h3>
                                ${escapeHTML(doc.title)}
                            </h3>

                            <p>
                                ${escapeHTML(doc.category)}
                                · ${escapeHTML(doc.fileName)}
                            </p>

                            <p>
                                Uploaded by:
                                ${escapeHTML(doc.uploadedByName)}
                                · ${escapeHTML(formatDate(doc.uploadedAt))}
                            </p>

                        </div>

                        <div class="admin-document-actions">

                            ${actions}

                        </div>

                    </article>

                `;

            }).join("");
    }


    /* =====================================================
       17. ADMIN CONFIRMATION
    ===================================================== */

    function openConfirmation(action, documentId) {

        const messages = {

            archive:
                "Are you sure you want to archive this document? It will no longer be publicly accessible.",

            restore:
                "Restore this document and make it publicly accessible again?",

            delete:
                "Permanently remove this document? This action cannot be undone."
        };

        state.pendingAction = {
            action,
            documentId
        };

        setText(
            "confirmationTitle",
            action.charAt(0).toUpperCase() + action.slice(1) + " Document"
        );

        setText(
            "confirmationMessage",
            messages[action]
        );

        show($("confirmationModal"), true);

        document.body.style.overflow = "hidden";
    }


    function closeConfirmation() {

        state.pendingAction = null;

        show($("confirmationModal"), false);

        document.body.style.overflow = "";
    }


    
async function confirmAdminAction() {

    if (!state.pendingAction) return;

    const {
        action,
        documentId
    } = state.pendingAction;

    const actionMap = {

        archive: "archiveDocument",
        restore: "restoreDocument",
        delete: "deleteDocument"
    };

    const button = $("confirmActionBtn");

    const stopLoader = startGlobalLoader(
        action === "archive"
            ? "Archiving document..."
            : action === "restore"
                ? "Restoring document..."
                : "Deleting document..."
    );

    if (button) {
        button.disabled = true;
        button.textContent = "Processing...";
    }

    try {

        const result = await api(
            actionMap[action],
            { documentId }
        );

        closeConfirmation();

        await loadAdminDocuments();

        await loadPublishedDocuments();

        await loadMyDocuments();

        alert(
            result.message ||
            "Document action completed."
        );

    } catch (error) {

        alert(
            error.message ||
            "Unable to complete this action."
        );

    } finally {

        stopLoader();

        if (button) {
            button.disabled = false;
            button.textContent = "Confirm";
        }
    }
}



    /* =====================================================
       18. ADMIN TAB SWITCHING
    ===================================================== */

    function setAdminTab(tab) {

        if (
            tab !== "published" &&
            tab !== "archived"
        ) {
            return;
        }

        state.adminTab = tab;

        document.querySelectorAll("[data-admin-tab]")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.adminTab === tab
                );
            });

        renderAdminDocuments();
    }


    /* =====================================================
       19. EVENT LISTENERS
    ===================================================== */

    function bindEvents() {

        $("documentSearch")?.addEventListener(
            "input",
            renderPublishedDocuments
        );

        $("categoryFilter")?.addEventListener(
            "change",
            renderPublishedDocuments
        );

        $("sortDocuments")?.addEventListener(
            "change",
            renderPublishedDocuments
        );

        $("retryLoadBtn")?.addEventListener(
            "click",
            loadPublishedDocuments
        );

        $("documentUploadForm")?.addEventListener(
            "submit",
            uploadDocument
        );

        $("refreshMyDocumentsBtn")?.addEventListener(
            "click",
            loadMyDocuments
        );

        $("refreshAdminDocumentsBtn")?.addEventListener(
            "click",
            loadAdminDocuments
        );

        $("closePreviewBtn")?.addEventListener(
            "click",
            closePreview
        );

        $("cancelConfirmationBtn")?.addEventListener(
            "click",
            closeConfirmation
        );

        $("confirmActionBtn")?.addEventListener(
            "click",
            confirmAdminAction
        );

        document.querySelectorAll("[data-admin-tab]")
            .forEach(button => {

                button.addEventListener("click", () => {

                    setAdminTab(
                        button.dataset.adminTab
                    );
                });
            });


        // Delegated document preview events.
        $("documentGrid")?.addEventListener(
            "click",
            event => {

                const button = event.target.closest(
                    "[data-preview]"
                );

                if (!button) return;

                openPreview(button.dataset.preview);
            }
        );


        // Delegated admin actions.
        $("adminDocumentsList")?.addEventListener(
            "click",
            event => {

                const button = event.target.closest(
                    "[data-admin-action]"
                );

                if (!button) return;

                openConfirmation(
                    button.dataset.adminAction,
                    button.dataset.id
                );
            }
        );


        // Close modals with Escape.
        document.addEventListener(
            "keydown",
            event => {

                if (event.key === "Escape") {

                    if (!$("previewModal").hidden) {
                        closePreview();
                    }

                    if (!$("confirmationModal").hidden) {
                        closeConfirmation();
                    }
                }
            }
        );
    }


    /* =====================================================
       20. INITIALIZATION
    ===================================================== */

    async function init() {

        readSession(); 
       
       configureBackButton();

        configureUserSections();

        bindEvents();

        await loadPublishedDocuments();

        if (state.isLoggedIn) {

            await loadMyDocuments();

            if (isAdmin()) {
                await loadAdminDocuments();
            }
        }
    }


    // Initialize after HTML is ready.
    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

})();
