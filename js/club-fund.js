"use strict";

(() => {

  // =====================================================
  // CONFIGURATION
  // =====================================================

  const API_URL =
    "https://script.google.com/macros/s/AKfycbxVNrYgPMqWGibcTQyFth5aPYwJmP4cbeW29sUZaAUjeBtD3Ap_T6ztRBqO_eYAqW1D/exec";

  const REFRESH_MS = 30000;

  const $ = id => document.getElementById(id);


  // =====================================================
  // APPLICATION STATE
  // =====================================================

  const S = {

    collectorId: "",
    token: "",
    name: "",
    role: "",

    balance: 0,

    deposits: [],
    withdrawals: [],
    notes: [],

    busy: false,
    pending: null,

    transactionType: "",
    editingNoteId: "",

    toastTimer: null,

    previewMode: false,

    previewData: {
      deposits: [],
      withdrawals: [],
      notes: []
    }

  };


  // =====================================================
  // DETECT LOCAL PREVIEW
  // =====================================================

  function isLocalPreview() {

    return [
      "localhost",
      "127.0.0.1",
      "::1"
    ].includes(location.hostname);

  }


  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  function sessionValue(keys) {

    for (const key of keys) {

      const value = sessionStorage.getItem(key);

      if (value && value.trim()) {
        return value.trim();
      }

    }

    return "";

  }


  // =====================================================
  // HTML SECURITY
  // =====================================================

  function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({

      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"

    }[char]));

  }


  // =====================================================
  // CURRENCY FORMAT
  // =====================================================

  function money(value) {

    return "₹" + new Intl.NumberFormat("en-IN", {

      maximumFractionDigits: 0

    }).format(Number(value) || 0);

  }


  // =====================================================
  // DATE FORMAT - IST
  // =====================================================

  function dateTime(value, withTime = true) {

    if (!value) return "—";

    let date;

    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {

      const [year, month, day] =
        String(value).split("-").map(Number);

      date = new Date(
        Date.UTC(year, month - 1, day, 12)
      );

    } else {

      date = new Date(value);

    }

    if (Number.isNaN(date.getTime())) {

      return escapeHTML(value);

    }

    const options = {

      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric"

    };

    if (withTime) {

      Object.assign(options, {

        hour: "2-digit",
        minute: "2-digit",
        hour12: true

      });

    }

    return new Intl.DateTimeFormat(
      "en-IN",
      options
    ).format(date);

  }


  // =====================================================
  // CURRENT DATE - IST
  // =====================================================

  function todayIST() {

    const parts = new Intl.DateTimeFormat("en-CA", {

      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"

    }).formatToParts(new Date());

    const values = {};

    parts.forEach(part => {

      values[part.type] = part.value;

    });

    return `${values.year}-${values.month}-${values.day}`;

  }


  // =====================================================
  // UNIQUE REQUEST ID
  // =====================================================

  function requestId() {

    return window.crypto?.randomUUID

      ? window.crypto.randomUUID()

      : `req-${Date.now()}-${Math.random()
          .toString(36).slice(2)}`;

  }


  // =====================================================
  // TOAST NOTIFICATION
  // =====================================================

  function toast(text, type = "success") {

    const element = $("toast");

    if (!element) return;

    element.textContent = text;

    element.classList.add("show");

    element.style.background =

      type === "error"
        ? "#a12620"

        : type === "info"
          ? "#285d8d"
          : "#17452f";

    clearTimeout(S.toastTimer);

    S.toastTimer = setTimeout(() => {

      element.classList.remove("show");

    }, 3500);

  }


  // =====================================================
  // FORM MESSAGES
  // =====================================================

  function message(id, text, type = "error") {

    const element = $(id);

    if (!element) return;

    element.textContent = text;

    element.className = "message show " + type;

  }


  function clearMessage(id) {

    const element = $(id);

    if (!element) return;

    element.textContent = "";

    element.className = "message";

  }


  // =====================================================
  // BUTTON LOADING STATE
  // =====================================================

  function busy(value) {

    S.busy = value;

    [

      "openDeposit",
      "openWithdrawal",
      "saveNoteBtn",
      "saveTransaction",
      "acceptConfirm"

    ].forEach(id => {

      if ($(id)) {

        $(id).disabled = value;

      }

    });

  }


  // =====================================================
  // API CONNECTION
  // =====================================================

  async function api(action, data = {}) {

    if (!S.token) {

      throw new Error(
        "Your Club Fund session has expired. Please log in again."
      );

    }

    const response = await fetch(API_URL, {

      method: "POST",

      headers: {

        "Content-Type": "text/plain;charset=utf-8"

      },

      body: JSON.stringify({

        action,

        token: S.token,

        ...data

      }),

      redirect: "follow"

    });


    if (!response.ok) {

      throw new Error(
        `Server returned HTTP ${response.status}.`
      );

    }


    const result = await response.json();


    if (!result || result.success !== true) {

      throw new Error(

        result?.message ||
        "The request could not be completed."

      );

    }


    return result.data || result;

  }


  // =====================================================
  // PREVIEW DATA HELPERS
  // =====================================================

  function previewSummary() {

    const totalDeposits = S.previewData.deposits.reduce(

      (sum, item) => sum + Number(item.amount || 0),

      0

    );

    const totalWithdrawals = S.previewData.withdrawals.reduce(

      (sum, item) => sum + Number(item.amount || 0),

      0

    );

    return {

      totalDeposits,

      totalWithdrawals,

      balance: totalDeposits - totalWithdrawals

    };

  }


  function previewDate() {

    return new Date().toISOString();

  }


  // =====================================================
  // SUMMARY CARDS
  // =====================================================

  function renderSummary(summary = {}) {

    S.balance = Number(

      summary.balance ??
      summary.availableBalance ??
      0

    );

    $("availableBalance").textContent =
      money(S.balance);

    $("totalDeposits").textContent =
      money(summary.totalDeposits || 0);

    $("totalWithdrawals").textContent =
      money(summary.totalWithdrawals || 0);

  }


  // =====================================================
  // DEPOSIT HISTORY
  // =====================================================

  function renderDeposits() {

    const query = $("depositSearch").value

      .trim()
      .toLowerCase();


    const rows = [...S.deposits]

      .sort((a, b) =>

        new Date(b.date) - new Date(a.date)

      )

      .filter(item => {

        const searchable = [

          item.id,
          item.person,
          item.recordedBy,
          item.recordedByMemberId,
          item.remarks

        ].join(" ").toLowerCase();

        return searchable.includes(query);

      });


    $("depositRows").innerHTML = rows.length

      ? rows.map(item => `

        <tr>

          <td>
            ${escapeHTML(dateTime(item.date))}
          </td>

          <td>
            ${escapeHTML(item.person || "—")}
          </td>

          <td class="amount deposit-color">
            ${escapeHTML(money(item.amount))}
          </td>

          <td>
            ${escapeHTML(item.remarks || "—")}
          </td>

          <td>
            ${escapeHTML(item.recordedBy || "—")}
          </td>

        </tr>

      `).join("")

      : `

        <tr>

          <td colspan="5" class="empty-row">

            ${
              query
                ? "No matching transactions found."
                : "No transactions recorded yet."
            }

          </td>

        </tr>

      `;

  }


  // =====================================================
  // WITHDRAWAL HISTORY
  // =====================================================

  function renderWithdrawals() {

    const query = $("withdrawalSearch").value

      .trim()
      .toLowerCase();


    const rows = [...S.withdrawals]

      .sort((a, b) =>

        new Date(b.date) - new Date(a.date)

      )

      .filter(item => {

        const searchable = [

          item.id,
          item.purpose,
          item.person,
          item.recordedBy,
          item.recordedByMemberId

        ].join(" ").toLowerCase();

        return searchable.includes(query);

      });


    $("withdrawalRows").innerHTML = rows.length

      ? rows.map(item => `

        <tr>

          <td>
            ${escapeHTML(dateTime(item.date))}
          </td>

          <td>
            ${escapeHTML(item.purpose || "—")}
          </td>

          <td>
            ${escapeHTML(item.person || "—")}
          </td>

          <td class="amount withdraw-color">
            ${escapeHTML(money(item.amount))}
          </td>

          <td>
            ${escapeHTML(item.recordedBy || "—")}
          </td>

        </tr>

      `).join("")

      : `

        <tr>

          <td colspan="5" class="empty-row">

            ${
              query
                ? "No matching transactions found."
                : "No transactions recorded yet."
            }

          </td>

        </tr>

      `;

  }


  // =====================================================
  // NOTEPAD FINANCIAL NOTE
  // =====================================================

  function noteText(note) {

    if (note.financialNote) {

      return note.financialNote;

    }

    const person = note.person || "Person";

    return note.direction === "club_receives"

      ? `${person} → Club`

      : `Club → ${person}`;

  }


  // =====================================================
  // RENDER NOTEPAD
  // =====================================================

  function renderNotes() {

    const rows = [...S.notes]

      .sort((a, b) =>

        String(b.date).localeCompare(String(a.date))

      );


    $("noteRows").innerHTML = rows.length

      ? rows.map(note => `

        <tr>

          <td>
            ${escapeHTML(dateTime(note.date, false))}
          </td>

          <td class="note-direction">
            ${escapeHTML(noteText(note))}
          </td>

          <td class="amount">
            ${escapeHTML(money(note.amount))}
          </td>

          <td>
            ${escapeHTML(note.remark || "—")}
          </td>

          <td>

            <div class="note-actions">

              <button
                class="small-btn"
                type="button"
                data-edit-note="${escapeHTML(note.id)}"
              >
                Edit
              </button>

              <button
                class="small-btn delete-btn"
                type="button"
                data-delete-note="${escapeHTML(note.id)}"
              >
                Delete
              </button>

            </div>

          </td>

        </tr>

      `).join("")

      : `

        <tr>

          <td colspan="5" class="empty-row">
            No financial notes added yet.
          </td>

        </tr>

      `;

  }
    // =====================================================
  // LOAD DATA
  // =====================================================

  async function load(initial = false) {

    if (S.busy) return;


    // LOCAL PREVIEW DATA

    if (S.previewMode) {

      const summary = previewSummary();

      S.deposits = [...S.previewData.deposits];

      S.withdrawals = [...S.previewData.withdrawals];

      S.notes = [...S.previewData.notes];

      renderSummary(summary);

      renderDeposits();

      renderWithdrawals();

      renderNotes();

      return;

    }


    // LIVE WEBSITE DATA

    try {

      const data = await api("clubFundGetData");

      S.deposits = Array.isArray(data.deposits)
        ? data.deposits
        : [];

      S.withdrawals = Array.isArray(data.withdrawals)
        ? data.withdrawals
        : [];

      S.notes = Array.isArray(data.notes)
        ? data.notes
        : [];


      if (data.member?.name) {

        S.name = data.member.name;

      }


      renderSummary(data.summary || {});

      renderDeposits();

      renderWithdrawals();

      renderNotes();


      $("recordedBy").value = S.name;


    } catch (error) {

      console.error(error);

      if (initial) {

        toast(error.message, "error");

      }

    }

  }


  // =====================================================
  // OPEN TRANSACTION MODAL
  // =====================================================

  function openTransaction(type) {

    if (S.busy) return;

    const isDeposit = type === "deposit";


    $("transactionForm").reset();

    clearMessage("transactionMessage");


    $("modalTitle").textContent =

      isDeposit
        ? "Add Deposit"
        : "Record Withdrawal";


    $("personLabel").textContent =

      isDeposit
        ? "Received From *"
        : "Paid To *";


    $("personName").placeholder =

      isDeposit
        ? "Enter the source or person's name"
        : "Enter recipient's name";


    // Deposit: hide Purpose, show Remarks
    // Withdrawal: show Purpose, hide Remarks

    $("purposeField").hidden = isDeposit;
    $("purposeField").style.display = isDeposit ? "none" : "flex";

    $("depositRemarksField").hidden = !isDeposit;
    $("depositRemarksField").style.display = isDeposit ? "flex" : "none";

    $("transactionPurpose").required = !isDeposit;


    $("recordedBy").value = S.previewMode
      ? "Preview Mode"
      : S.name;


    S.transactionType = type;


    $("transactionModal").classList.add("open");

    $("personName").focus();

  }


  // =====================================================
  // CLOSE TRANSACTION MODAL
  // =====================================================

  function closeTransaction() {

    if (!S.busy) {

      $("transactionModal").classList.remove("open");

    }

  }


  // =====================================================
  // CONFIRMATION MODAL
  // =====================================================

  function askConfirm(title, text, callback) {

    S.pending = callback;

    $("confirmTitle").textContent = title;

    $("confirmText").textContent = text;

    $("confirmModal").classList.add("open");

  }


  function closeConfirm() {

    if (S.busy) return;

    $("confirmModal").classList.remove("open");

    S.pending = null;

  }


  // =====================================================
  // SAVE TRANSACTION
  // =====================================================

  async function submitTransaction(data) {

    if (S.busy) return;

    busy(true);


    try {

      // -----------------------------------------------
      // PREVIEW MODE - TEMPORARY DATA
      // -----------------------------------------------

      if (S.previewMode) {

        const record = {

          id: `PREVIEW-${Date.now()}`,

          date: previewDate(),

          person: data.person,

          amount: data.amount,

          purpose: data.purpose || "",

          remarks: data.remarks || "",

          recordedBy: "Preview Mode"

        };


        if (data.type === "deposit") {

          S.previewData.deposits.push(record);

        } else {

          const currentBalance =
            previewSummary().balance;

          if (data.amount > currentBalance) {

            throw new Error(

              `Insufficient balance. Available fund: ${money(currentBalance)}.`

            );

          }

          S.previewData.withdrawals.push(record);

        }


        toast(

          data.type === "deposit"

            ? "Preview deposit added."

            : "Preview withdrawal added.",

          "info"

        );

      }


      // -----------------------------------------------
      // LIVE WEBSITE - GOOGLE SHEETS
      // -----------------------------------------------

      else {

        if (data.type === "withdrawal") {

          const latest = await api("clubFundGetData");

          const balance = Number(

            latest.summary?.balance ?? 0

          );

          if (data.amount > balance) {

            throw new Error(

              `Insufficient balance. Available fund: ${money(balance)}.`

            );

          }

        }


        if (data.type === "deposit") {

          await api("clubFundSaveDeposit", {

            receivedFrom: data.person,

            amount: data.amount,

            remarks: data.remarks,

            requestId: requestId()

          });

        } else {

          await api("clubFundSaveWithdrawal", {

            paidTo: data.person,

            purpose: data.purpose,

            amount: data.amount,

            requestId: requestId()

          });

        }


        toast(

          data.type === "deposit"

            ? "Deposit saved successfully."

            : "Withdrawal saved successfully."

        );

      }


      $("confirmModal").classList.remove("open");

      S.pending = null;

      $("transactionModal").classList.remove("open");


    } catch (error) {

      $("confirmModal").classList.remove("open");

      S.pending = null;

      message("transactionMessage", error.message);

    } finally {

      busy(false);

    }


    await load();

  }


  // =====================================================
  // NOTEPAD PREVIEW
  // =====================================================

  function notePreview() {

    const person =

      $("notePerson").value.trim() || "Person";


    $("notePreview").textContent =

      $("noteDirection").value === "club_receives"

        ? `${person} → Club`

        : `Club → ${person}`;

  }


  // =====================================================
  // RESET NOTEPAD
  // =====================================================

  function resetNote() {

    S.editingNoteId = "";

    $("noteForm").reset();

    $("noteDate").value = todayIST();

    $("saveNoteBtn").textContent = "＋ Add Note";

    notePreview();

  }


  // =====================================================
  // EDIT NOTEPAD
  // =====================================================

  function editNote(note) {

    S.editingNoteId = String(note.id);

    $("noteDate").value =

      String(note.date || "").slice(0, 10) || todayIST();


    $("noteDirection").value =

      note.direction === "club_receives"

        ? "club_receives"

        : "club_gives";


    $("notePerson").value = note.person || "";

    $("noteAmount").value = Number(note.amount || 0);

    $("noteRemark").value = note.remark || "";


    $("saveNoteBtn").textContent = "Save Changes";

    clearMessage("noteMessage");

    notePreview();

  }


  // =====================================================
  // SAVE / UPDATE NOTEPAD
  // =====================================================

  async function saveNote(event) {

    event.preventDefault();

    if (S.busy) return;


    const data = {

      date: $("noteDate").value,

      direction: $("noteDirection").value,

      person: $("notePerson").value.trim(),

      amount: Number($("noteAmount").value),

      remark: $("noteRemark").value.trim()

    };


    if (!data.date || !data.person) {

      return message(

        "noteMessage",

        "Date and Person / Organisation are required."

      );

    }


    if (

      !Number.isSafeInteger(data.amount) ||

      data.amount < 0

    ) {

      return message(

        "noteMessage",

        "Enter a valid whole amount. Zero is allowed."

      );

    }


    busy(true);


    try {

      const id = S.editingNoteId;


      // -----------------------------------------------
      // PREVIEW MODE
      // -----------------------------------------------

      if (S.previewMode) {

        if (id) {

          const index = S.previewData.notes.findIndex(

            note => String(note.id) === String(id)

          );

          if (index < 0) {

            throw new Error("Note not found.");

          }

          S.previewData.notes[index] = {

            ...S.previewData.notes[index],

            ...data

          };

        } else {

          S.previewData.notes.push({

            id: `PREVIEW-NOTE-${Date.now()}`,

            ...data

          });

        }

      }


      // -----------------------------------------------
      // LIVE WEBSITE
      // -----------------------------------------------

      else {

        await api(

          id
            ? "clubFundUpdateNote"
            : "clubFundSaveNote",

          {

            ...data,

            noteId: id || "",

            requestId: requestId()

          }

        );

      }


      resetNote();

      clearMessage("noteMessage");


      toast(

        id
          ? "Note updated successfully."
          : "Note added successfully."

      );


    } catch (error) {

      message("noteMessage", error.message);

    } finally {

      busy(false);

    }


    await load();

  }

   // =====================================================
  // DELETE NOTEPAD
  // =====================================================

  async function deleteNote(id) {

    askConfirm(

      "Delete Financial Note",

      "Delete this Notepad entry? The Club Fund balance will not change.",

      async () => {

        if (S.busy) return;

        busy(true);


        try {

          // PREVIEW MODE

          if (S.previewMode) {

            S.previewData.notes =

              S.previewData.notes.filter(

                note => String(note.id) !== String(id)

              );

          }


          // LIVE WEBSITE

          else {

            await api("clubFundDeleteNote", {

              noteId: id,

              requestId: requestId()

            });

          }


          $("confirmModal").classList.remove("open");

          S.pending = null;


          toast(

            S.previewMode

              ? "Preview note deleted."

              : "Note deleted successfully."

          );


        } catch (error) {

          $("confirmModal").classList.remove("open");

          S.pending = null;

          toast(error.message, "error");

        } finally {

          busy(false);

        }


        await load();

      }

    );

  }


  // =====================================================
  // INITIALIZE APPLICATION
  // =====================================================

  function init() {


    // DETECT MODE

    S.previewMode = isLocalPreview();


    // READ LOGIN SESSION

    S.collectorId = sessionValue([

      "memberId",
      "collectorId",
      "userId"

    ]);


    // READ CLUB FUND AUTHENTICATION TOKEN

    S.token = sessionValue([

      "clubFundToken"

    ]);


    S.name = sessionValue([

      "memberName",
      "name",
      "collectorName"

    ]);


    S.role = sessionValue([

      "memberRole",
      "role",
      "userRole"

    ]);


    // INITIAL VALUES

    $("noteDate").value = todayIST();

    $("recordedBy").value =

      S.previewMode
        ? "Preview Mode"
        : S.name;


    notePreview();


    // =================================================
    // LOCAL PREVIEW MODE
    // =================================================

    if (S.previewMode) {

      $("openDeposit").addEventListener(

        "click",

        () => openTransaction("deposit")

      );


      $("openWithdrawal").addEventListener(

        "click",

        () => openTransaction("withdrawal")

      );


      $("closeModal").addEventListener(

        "click",

        closeTransaction

      );


      $("cancelModal").addEventListener(

        "click",

        closeTransaction

      );


      $("transactionForm").addEventListener(

        "submit",

        handleTransactionSubmit

      );


      $("closeConfirm").addEventListener(

        "click",

        closeConfirm

      );


      $("cancelConfirm").addEventListener(

        "click",

        closeConfirm

      );


      $("acceptConfirm").addEventListener(

        "click",

        async () => {

          if (!S.busy && S.pending) {

            await S.pending();

          }

        }

      );


      $("depositSearch").addEventListener(

        "input",

        renderDeposits

      );


      $("withdrawalSearch").addEventListener(

        "input",

        renderWithdrawals

      );


      $("noteDirection").addEventListener(

        "change",

        notePreview

      );


      $("notePerson").addEventListener(

        "input",

        notePreview

      );


      $("noteForm").addEventListener(

        "submit",

        saveNote

      );


      $("noteRows").addEventListener(

        "click",

        handleNoteActions

      );


      setupModalEvents();


      load(true);


      toast(

        "Acode Preview Mode: demonstration data only.",

        "info"

      );


      return;

    }


    // =================================================
    // LIVE WEBSITE LOGIN PROTECTION
    // =================================================

    if (!S.collectorId || !S.token) {

      sessionStorage.removeItem("clubFundToken");

      location.replace("index.html");

      return;

    }


    // =================================================
    // LIVE EVENT LISTENERS
    // =================================================

    $("openDeposit").addEventListener(

      "click",

      () => openTransaction("deposit")

    );


    $("openWithdrawal").addEventListener(

      "click",

      () => openTransaction("withdrawal")

    );


    $("closeModal").addEventListener(

      "click",

      closeTransaction

    );


    $("cancelModal").addEventListener(

      "click",

      closeTransaction

    );


    $("transactionForm").addEventListener(

      "submit",

      handleTransactionSubmit

    );


    $("closeConfirm").addEventListener(

      "click",

      closeConfirm

    );


    $("cancelConfirm").addEventListener(

      "click",

      closeConfirm

    );


    $("acceptConfirm").addEventListener(

      "click",

      async () => {

        if (!S.busy && S.pending) {

          await S.pending();

        }

      }

    );


    $("depositSearch").addEventListener(

      "input",

      renderDeposits

    );


    $("withdrawalSearch").addEventListener(

      "input",

      renderWithdrawals

    );


    $("noteDirection").addEventListener(

      "change",

      notePreview

    );


    $("notePerson").addEventListener(

      "input",

      notePreview

    );


    $("noteForm").addEventListener(

      "submit",

      saveNote

    );


    $("noteRows").addEventListener(

      "click",

      handleNoteActions

    );


    setupModalEvents();


    // INITIAL DATA LOAD

    load(true);


    // AUTOMATIC REFRESH

    setInterval(() => {

      if (!document.hidden && !S.busy) {

        load();

      }

    }, REFRESH_MS);


  }


  // =====================================================
  // TRANSACTION FORM HANDLER
  // =====================================================

  function handleTransactionSubmit(event) {

    event.preventDefault();


    const type = S.transactionType;

    const person =

      $("personName").value.trim();


    const amount =

      Number($("transactionAmount").value);


    const purpose =

      $("transactionPurpose").value.trim();


    const remarks =

      $("transactionDetail").value.trim();


    if (!person) {

      return message(

        "transactionMessage",

        type === "deposit"

          ? "Please enter Received From."

          : "Please enter Paid To."

      );

    }


    if (type === "withdrawal" && !purpose) {

      return message(

        "transactionMessage",

        "Please enter the withdrawal purpose."

      );

    }


    if (

      !Number.isSafeInteger(amount) ||

      amount <= 0

    ) {

      return message(

        "transactionMessage",

        "Enter a positive whole amount in rupees."

      );

    }


    if (

      type === "withdrawal" &&

      amount > S.balance

    ) {

      return message(

        "transactionMessage",

        "Insufficient available Club Fund balance."

      );

    }


    askConfirm(

      type === "deposit"

        ? "Confirm Deposit"

        : "Confirm Withdrawal",


      type === "deposit"

        ? `Deposit ${money(amount)} received from ${person}?`

        : `Withdraw ${money(amount)} for ${purpose}, paid to ${person}?`,


      () => submitTransaction({

        type,

        person,

        amount,

        purpose,

        remarks

      })

    );

  }


  // =====================================================
  // NOTEPAD EDIT / DELETE HANDLER
  // =====================================================

  function handleNoteActions(event) {

    const editButton =

      event.target.closest("[data-edit-note]");


    const deleteButton =

      event.target.closest("[data-delete-note]");


    if (editButton) {

      const note = S.notes.find(

        item =>

          String(item.id) ===

          editButton.dataset.editNote

      );


      if (note) {

        editNote(note);

      }

    }


    else if (deleteButton) {

      deleteNote(

        deleteButton.dataset.deleteNote

      );

    }

  }
    // =====================================================
  // MODAL EVENT HANDLERS
  // =====================================================

  function setupModalEvents() {

    $("transactionModal").addEventListener(

      "click",

      event => {

        if (event.target === $("transactionModal")) {

          closeTransaction();

        }

      }

    );


    $("confirmModal").addEventListener(

      "click",

      event => {

        if (event.target === $("confirmModal")) {

          closeConfirm();

        }

      }

    );


    document.addEventListener(

      "keydown",

      event => {

        if (event.key === "Escape" && !S.busy) {

          closeTransaction();

          closeConfirm();

        }

      }

    );

  }


  // =====================================================
  // START APPLICATION
  // =====================================================

  document.addEventListener(

    "DOMContentLoaded",

    init

  );

})();
