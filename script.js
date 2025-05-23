// script.js

// Global state - auth, db are now expected from firebase-init.js
// const auth = firebase.auth(); // Provided by firebase-init.js
// const db = firebase.firestore(); // Provided by firebase-init.js

let transactions = [];
let loans = [];
let currentUser = null;
// currentLocale is now managed by i18n.js
// let currentLanguage = localStorage.getItem('amarHishabLang') || 'bn';

const expenseCategoriesData = { // This remains, as it's app-specific data
    "বাসস্থান": ["বাসা ভাড়া", "বিদ্যুৎ বিল", "গ্যাস বিল", "পানি বিল", "ময়লা পরিষ্কার বিল", "খালার বিল", "ডিফেন্স বিল", "অন্যান্য"],
    "খাদ্য": ["মেসের খাবার", "নিজে রান্না", "বাইরের খাবার", "অন্যান্য"],
    "যোগাযোগ ও ইন্টারনেট": ["ওয়াই-ফাই বিল", "মোবাইল রিচার্জ", "ডাটা প্যাক", "যাতায়াত খরচ (বাস)", "যাতায়াত খরচ (রিকশা)", "যাতায়াত খরচ (সিএনজি)", "অন্যান্য"],
    "শিক্ষা সংক্রান্ত খরচ": ["বই", "খাতা", "কলম", "কোচিং ফি", "অন্যান্য"],
    "শিক্ষা": ["বই", "খাতা", "কলম", "কোচিং ফি", "অন্যান্য"], // Duplicate key, "শিক্ষা সংক্রান্ত খরচ" is likely intended. Assuming one.
    "পোশাক ও শরীরচর্চা": ["পোশাক", "প্রসাধনী (সাবান, শ্যাম্পু, ইত্যাদি)", "শরীরের যত্ন (ক্রিম, ফেসওয়াশ ইত্যাদি)", "অন্যান্য"],
    "স্বাস্থ্য ও চিকিৎসা": ["ওষুধ", "চিকিৎসা ব্যয়", "অন্যান্য"],
    "ব্যক্তিগত ও বিনোদন খরচ": ["বন্ধুদের সঙ্গে আড্ডা", "ছোটখাটো কেনাকাটা", "বিনোদন", "অন্যান্য"],
    "অপ্রত্যাশিত / জরুরি খরচ": ["জরুরি দরকার", "কিছু মেরামত বা হঠাৎ প্রয়োজন", "অন্যান্য"]
};

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator'); // Still needed for showLoading
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.querySelector('.app-container');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutButton = document.getElementById('logoutButton');
const userInfoDisplay = document.getElementById('userInfo');
const userNameDisplay = document.getElementById('userName');
const userPhotoDisplay = document.getElementById('userPhoto');
const languageToggleBtn = document.getElementById('languageToggleBtn');


document.addEventListener('DOMContentLoaded', () => {
    // Firestore persistence is now handled in firebase-init.js
    // db.enablePersistence(...)
    // Call enableFirestorePersistence from firebase-init.js
    if (typeof enableFirestorePersistence === "function") {
        enableFirestorePersistence().then(persistenceEnabled => {
            console.log("Persistence enabled status from firebase-init:", persistenceEnabled);
            initAuthListener(); // Initialize auth listener after persistence attempt
        });
    } else {
        console.warn("enableFirestorePersistence function not found. Assuming it's handled or not used.");
        initAuthListener(); // Proceed without explicit persistence call if function isn't there
    }


    // Event Listeners that don't depend on auth state
    googleLoginBtn.addEventListener('click', signInWithGoogle);
    logoutButton.addEventListener('click', signOutUser);

    // Language toggle now calls setLocale from i18n.js
    languageToggleBtn.addEventListener('click', () => {
        if (typeof setLocale === "function") {
            const newLocale = window.currentLocale === 'bn' ? 'en' : 'bn'; // window.currentLocale from i18n.js
            setLocale(newLocale);
        } else {
            console.error("setLocale function from i18n.js is not available.");
        }
    });

    document.getElementById('unifiedEntryForm').addEventListener('submit', handleUnifiedFormSubmit);
    document.getElementById('unifiedEntryType').value = 'expense'; // Default
    // toggleUnifiedEntryFields(); // Called by initializeAppUI or setLocale

    document.getElementById('calculatorToggleBtn').addEventListener('click', toggleCalculatorFS);
    document.getElementById('calculatorCloseBtnFS').addEventListener('click', closeCalculatorFS);
    document.querySelectorAll('.calc-btn-fs').forEach(button => {
        button.addEventListener('click', handleCalculatorFSInput);
    });
    window.addEventListener('popstate', handleSystemBackButton);

    // Listen for language change event from i18n.js
    document.addEventListener('languageChanged', (event) => {
        console.log('Language changed to:', event.detail.lang);
        // Re-render UI elements that depend on language and are not covered by data-translate
        // This might involve re-populating dropdowns, re-formatting dates, etc.
        // Many of these calls are already in applyTranslations in i18n.js or will be called by openTab/loadActiveTab
        initializeAppUI(); // Re-initialize parts of the UI that depend on language.
    });
});

function initAuthListener() {
    auth.onAuthStateChanged(user => {
        showLoading(true); // Use local showLoading which references loadingIndicator
        if (user) {
            currentUser = user;
            console.log("User logged in:", currentUser.uid, currentUser.displayName);
            displayUserInfo(currentUser);
            loginScreen.classList.add('hidden');
            appContainer.classList.remove('logged-out');

            Promise.all([loadUserTransactions(), loadUserLoans()])
                .then(() => {
                    initializeAppUI(); // Initialize after data is loaded
                    // Ensure active tab's content is rendered after data load and UI init
                    const activeTabId = document.querySelector('.tab-content.active')?.id || 'dashboard';
                    openTab(null, activeTabId); // This will call render for the active tab
                    showLoading(false);
                })
                .catch(error => {
                    console.error("Error loading user data:", error);
                    showNotification(getTranslatedString("dataLoadError"), true);
                    initializeAppUI(); // Still init UI, might show empty states
                    showLoading(false);
                });

        } else {
            currentUser = null;
            console.log("User logged out");
            transactions = [];
            loans = [];
            displayUserInfo(null);
            loginScreen.classList.remove('hidden');
            appContainer.classList.add('logged-out');
            resetAllFiltersAndInputs();
            // Clear dynamic content areas
            const dynamicAreas = ['allTransactionsList', 'denaPaonaListContainer', 'expenseReportContainer', 'latestTwoTransactions', 'expenseCategoriesListContainer'];
            dynamicAreas.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = `<p>${getTranslatedString('pleaseLogin')}</p>`; // Or a generic placeholder
            });
            showLoading(false);
        }
    });
}

function initializeAppUI() {
    if (!currentUser && !loginScreen.classList.contains('hidden')) {
        console.log("User not logged in, skipping main UI initialization.");
        return; // Don't initialize if login screen is active
    }
    console.log("Initializing App UI for user:", currentUser ? currentUser.uid : "None");

    // Populate dropdowns
    populateExpenseCategoryDropdown('expenseCategory');
    populateExpenseCategoryDropdown('reportCategoryFilter', true);

    // Set default date for forms
    setDateTimeNow('unifiedDateTime');
    const currentMonthYear = new Date().toISOString().slice(0, 7);
    ['dashboardMonthFilter', 'denaPaonaMonthFilter', 'reportMonthFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = currentMonthYear;
    });
    
    // Handle form elements display based on current selection
    toggleUnifiedEntryFields(); // This should be called to set correct form fields

    // Load active tab (this will also trigger rendering for that tab)
    // This should ideally be the primary way content is rendered after login or tab switch.
    // Avoid redundant render calls if possible.
    if (!document.querySelector('.tab-content.active')) { // If no tab is active, open default
        loadActiveTab();
    } else { // If a tab is already marked active (e.g. by HTML default or previous state)
        const activeTabId = document.querySelector('.tab-content.active').id;
        openTab(null, activeTabId); // Re-run openTab to ensure its logic (like rendering) executes
    }
    
    startClock(); // Ensure clock is running
    updateLanguageUIText(); // Apply static text updates from i18n
    console.log("App UI Initialized/Refreshed");
}

function updateLanguageUIText() {
    // This function is to supplement i18n.js for texts that are not easily handled by data-translate
    // or need to be updated after dynamic content changes.
    // Most of this is now handled by i18n.js's updateAllTranslatedTexts.
    // However, some dynamic parts like placeholder texts might need this.

    // Update placeholders if i18n.js doesn't cover them already
    document.querySelectorAll('[placeholder_translate_key]').forEach(el => {
        const key = el.getAttribute('placeholder_translate_key');
        el.placeholder = getTranslatedString(key);
    });

    // Update form titles and button texts if not handled by i18n.js on type change
    if (document.getElementById('addEntry')?.classList.contains('active')) {
        toggleUnifiedEntryFields(); // This also updates titles/buttons based on current lang
    }
}


function resetAllFiltersAndInputs() {
    if (document.getElementById('unifiedEntryForm')) document.getElementById('unifiedEntryForm').reset();
    setDateTimeNow('unifiedDateTime');
     if (document.getElementById('unifiedEntryType')) document.getElementById('unifiedEntryType').value = 'expense';
    // toggleUnifiedEntryFields(); // Not needed here if form is reset

    const filterInputs = document.querySelectorAll('.dashboard-filters input[type="month"], .dashboard-filters input[type="date"], .dashboard-filters select, .filter-section input, .filter-section select');
    filterInputs.forEach(input => {
        if (input.type === 'month') {
            // input.value = new Date().toISOString().slice(0,7); // Default to current month or leave blank
        } else if (input.tagName === 'SELECT') {
            if (['reportCategoryFilter', 'reportSubcategoryFilter', 'denaPaonaTypeFilter', 'transactionFilter'].includes(input.id)) {
                input.value = 'all';
            } else {
                // input.selectedIndex = 0;
            }
        } else {
            input.value = '';
        }
    });
    const currentMonthYear = new Date().toISOString().slice(0, 7);
    ['dashboardMonthFilter', 'denaPaonaMonthFilter', 'reportMonthFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = currentMonthYear;
    });


    const summaryPs = document.querySelectorAll('.summary-box p');
    summaryPs.forEach(p => p.textContent = `৳ ${Number(0).toFixed(2)}`); // Use Number(0) for locale-agnostic formatting
    if(document.getElementById('reportGrandTotalAmount')) document.getElementById('reportGrandTotalAmount').textContent = `৳ ${Number(0).toFixed(2)}`;

    console.log("Filters and inputs reset.");
}


function showLoading(show) { // Renamed from showGlobalLoading to avoid conflict if firebase-init.js has one
    if (loadingIndicator) { // Check if element exists
        if (show) {
            loadingIndicator.classList.remove('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
        }
    }
}

function displayUserInfo(user) {
    if (user) {
        userNameDisplay.textContent = user.displayName || getTranslatedString('unknownUser') || 'ব্যবহারকারী';
        userPhotoDisplay.src = user.photoURL || 'images/placeholder_user_icon.png';
        userInfoDisplay.classList.add('show');
    } else {
        userNameDisplay.textContent = '';
        userPhotoDisplay.src = 'images/placeholder_user_icon.png'; // Show placeholder when logged out too
        userInfoDisplay.classList.remove('show');
    }
}

function signInWithGoogle() {
    showLoading(true);
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            showNotification(getTranslatedString("welcomeMessage", { name: result.user.displayName || getTranslatedString('unknownUser') }));
            // onAuthStateChanged handles UI and data loading
        })
        .catch((error) => {
            console.error("Google Sign-In Error:", error);
            showNotification(getTranslatedString("loginFailed", { error: error.message }), true);
            showLoading(false); // Explicitly hide loading on error here
        });
}

function signOutUser() {
    showLoading(true);
    auth.signOut()
        .then(() => {
            showNotification(getTranslatedString("logoutSuccess"));
            // onAuthStateChanged handles UI and data loading
        })
        .catch((error) => {
            console.error("Sign Out Error:", error);
            showNotification(getTranslatedString("logoutFailed", { error: error.message }), true);
            showLoading(false); // Explicitly hide loading on error here
        });
}

// --- Language Toggle (now mostly in i18n.js) ---
// toggleLanguage, updateLanguageButtonText, applyTranslations, getTranslation are removed
// languageToggleBtn event listener calls setLocale from i18n.js

async function loadUserTransactions() {
    if (!currentUser) {
        transactions = [];
        return Promise.resolve();
    }
    // showLoading(true); // Loading shown by caller (onAuthStateChanged)
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('transactions')
            .orderBy('dateTime', 'desc')
            .get();
        transactions = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })); // Store Firestore ID as firestoreId
        console.log("Transactions loaded from Firestore:", transactions.length);
    } catch (error) {
        console.error("Error loading transactions from Firestore: ", error);
        showNotification(getTranslatedString("dataLoadError") + " (Transactions)", true);
    } finally {
        // showLoading(false); // Loading hidden by caller
    }
}

async function loadUserLoans() {
    if (!currentUser) {
        loans = [];
        return Promise.resolve();
    }
    // showLoading(true);
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('loans')
            .orderBy('dateTime', 'desc')
            .get();
        loans = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() })); // Store Firestore ID as firestoreId
        console.log("Loans loaded from Firestore:", loans.length);
    } catch (error) {
        console.error("Error loading loans from Firestore: ", error);
        showNotification(getTranslatedString("dataLoadError") + " (Loans)", true);
    } finally {
        // showLoading(false);
    }
}


function populateExpenseCategoryDropdown(selectId, includeAllOption = false) {
    const categorySelect = document.getElementById(selectId);
    if (!categorySelect) return;

    let currentValue = categorySelect.value; // Preserve current value
    const originalScrollTop = categorySelect.scrollTop;
    categorySelect.innerHTML = '';

    if (includeAllOption) {
        const allOption = document.createElement('option');
        allOption.value = "all";
        allOption.textContent = getTranslatedString("allMainCategories");
        categorySelect.appendChild(allOption);
    } else {
        const placeholderOption = document.createElement('option');
        placeholderOption.value = "";
        placeholderOption.textContent = getTranslatedString("selectCategory");
        categorySelect.appendChild(placeholderOption);
    }

    for (const categoryKey in expenseCategoriesData) { // categoryKey is Bengali
        if (expenseCategoriesData.hasOwnProperty(categoryKey)) {
            const option = document.createElement('option');
            option.value = categoryKey; // Value is always the Bengali key
            // Display text is translated if English, otherwise original Bengali key
            option.textContent = window.currentLocale === 'en' ? (getTranslatedString(`category_${categoryKey.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '')}`) || categoryKey) : categoryKey;
            categorySelect.appendChild(option);
        }
    }

    if (categorySelect.querySelector(`option[value="${currentValue}"]`)) {
        categorySelect.value = currentValue;
    } else if (includeAllOption) {
        categorySelect.value = "all";
    } else {
        categorySelect.value = ""; // Ensure placeholder is selected if current value not found
    }
    categorySelect.scrollTop = originalScrollTop;

    if (selectId === 'reportCategoryFilter') {
        updateReportSubcategoryFilter();
    } else if (selectId === 'expenseCategory') {
         updateSubcategories(categorySelect.value, 'expenseSubcategory');
    }
}

function updateSubcategories(selectedCategoryKey, subCategorySelectId) { // selectedCategoryKey is Bengali
    const subcategorySelect = document.getElementById(subCategorySelectId);
    if (!subcategorySelect) return;

    let currentValue = subcategorySelect.value;
    const originalScrollTop = subcategorySelect.scrollTop;
    subcategorySelect.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = (subCategorySelectId === 'reportSubcategoryFilter') ? "all" : "";
    placeholderOption.textContent = (subCategorySelectId === 'reportSubcategoryFilter') ? getTranslatedString("allSubcategories") : getTranslatedString("selectSubcategory");
    subcategorySelect.appendChild(placeholderOption);

    if (selectedCategoryKey && expenseCategoriesData[selectedCategoryKey]) {
        expenseCategoriesData[selectedCategoryKey].forEach(subcatKey => { // subcatKey is Bengali
            const option = document.createElement('option');
            option.value = subcatKey;
            option.textContent = window.currentLocale === 'en' ? (getTranslatedString(`subcategory_${subcatKey.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '')}`) || subcatKey) : subcatKey;
            subcategorySelect.appendChild(option);
        });
        subcategorySelect.disabled = false;
    } else {
        subcategorySelect.disabled = true;
        if (subCategorySelectId === 'reportSubcategoryFilter') {
            subcategorySelect.disabled = false; // "All Subcategories" should always be enabled
        }
    }
    
    if (subcategorySelect.querySelector(`option[value="${currentValue}"]`)) {
        subcategorySelect.value = currentValue;
    } else {
        subcategorySelect.value = placeholderOption.value; // Default to placeholder
    }
    subcategorySelect.scrollTop = originalScrollTop;
}


function setDateTimeNow(elementId) {
    const now = new Date();
    const el = document.getElementById(elementId);
    if (el) {
        // Format for datetime-local input: YYYY-MM-DDTHH:mm:ss
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0'); // Include seconds
        el.value = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }
}

function openTab(event, tabName) {
    let i, tabcontent, tabbuttons;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) { tabcontent[i].classList.remove("active"); tabcontent[i].style.display = "none"; }
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) { tabbuttons[i].classList.remove("active"); }

    const activeTabElement = document.getElementById(tabName);
    if (activeTabElement) { activeTabElement.style.display = "block"; activeTabElement.classList.add("active"); }

    let targetButton = null;
    if (event && event.currentTarget) { targetButton = event.currentTarget; }
    else { const buttons = document.querySelectorAll('.tab-button'); buttons.forEach(btn => { if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tabName}'`)) { targetButton = btn; } }); }
    if(targetButton) targetButton.classList.add("active");

    localStorage.setItem('activeTabAmarHishab', tabName);

    if (tabName === 'dashboard') updateDashboardSummary();
    else if (tabName === 'transactions') renderAllTransactions();
    else if (tabName === 'denaPaona') renderDenaPaonaTab();
    else if (tabName === 'expenseCategoriesView') renderExpenseCategoriesView();
    else if (tabName === 'expenseReport') {
        populateExpenseCategoryDropdown('reportCategoryFilter', true); // Repopulate for language
        renderExpenseReport();
    }

    if (tabName !== 'addEntry') {
      resetUnifiedEntryForm();
    } else {
        // If opening addEntry tab, ensure form title/button are correct
        toggleUnifiedEntryFields();
    }
}

function loadActiveTab() {
    if (!currentUser) return;
    const activeTab = localStorage.getItem('activeTabAmarHishab') || 'dashboard';
    const tabToOpen = document.getElementById(activeTab) ? activeTab : 'dashboard';
    openTab(null, tabToOpen);
}

function toggleUnifiedEntryFields() {
    const entryTypeEl = document.getElementById('unifiedEntryType');
    if (!entryTypeEl) return; // Guard if called before DOM ready or element missing

    const entryType = entryTypeEl.value;
    const transactionFields = document.getElementById('transactionSpecificFields');
    const incomeFields = document.getElementById('incomeFields');
    const expenseFields = document.getElementById('expenseFields');
    const loanFields = document.getElementById('loanSpecificFields');
    const formTitle = document.getElementById('unifiedEntryFormTitle');
    const submitButton = document.getElementById('submitUnifiedEntryBtn');

    if (!transactionFields || !incomeFields || !expenseFields || !loanFields || !formTitle || !submitButton) return;


    const isEditing = !!document.getElementById('editingFirestoreDocId').value;
    let titleKey = `formTitle_${entryType}Entry`;
    let buttonKey;

    if (isEditing) {
        titleKey = `formTitle_edit${entryType.charAt(0).toUpperCase() + entryType.slice(1)}`;
        buttonKey = 'updateButton';
    } else {
        if (entryType === 'income') buttonKey = 'addIncomeButton';
        else if (entryType === 'expense') buttonKey = 'addExpenseButton';
        else if (entryType === 'loan') buttonKey = 'addLoanButton';
        else buttonKey = 'addEntryButton'; // Fallback
    }

    formTitle.innerHTML = getTranslatedString(titleKey); // Assumes <i> tags are part of translation string
    submitButton.innerHTML = getTranslatedString(buttonKey);


    transactionFields.style.display = 'none';
    incomeFields.style.display = 'none';
    expenseFields.style.display = 'none';
    loanFields.style.display = 'none';

    if (entryType === 'income') {
        transactionFields.style.display = 'block';
        incomeFields.style.display = 'block';
    } else if (entryType === 'expense') {
        transactionFields.style.display = 'block';
        expenseFields.style.display = 'block';
        updateSubcategories(document.getElementById('expenseCategory').value, 'expenseSubcategory');
    } else if (entryType === 'loan') {
        loanFields.style.display = 'block';
    }

    // Update placeholders based on current language
    updateLanguageUIText();


    const editingDocId = document.getElementById('editingFirestoreDocId').value;
    const editingClass = document.getElementById('editingUnifiedEntryClass').value;
    if (editingDocId) {
      if (editingClass === 'transaction' && (entryType === 'income' || entryType === 'expense')) {}
      else if (editingClass === 'loan' && entryType === 'loan') {}
      else {
         // Reset if incompatible type change during edit.
         // This might be too aggressive. Consider allowing type change and handling it as a "delete old, add new" operation.
         // For now, this message is shown if submit is attempted with incompatible types.
      }
    }
}


function handleUnifiedFormSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
        showNotification(getTranslatedString("pleaseLogin"), true);
        return;
    }

    const entryType = document.getElementById('unifiedEntryType').value;
    const editingDocId = document.getElementById('editingFirestoreDocId').value;
    const editingClass = document.getElementById('editingUnifiedEntryClass').value;

    if (editingDocId) {
        if (editingClass === 'transaction' && (entryType === 'income' || entryType === 'expense')) {
            updateUnifiedTransaction(editingDocId);
        } else if (editingClass === 'loan' && entryType === 'loan') {
            updateUnifiedLoan(editingDocId);
        } else {
            showNotification(getTranslatedString("editTypeChangeError"), true);
        }
    } else {
        if (entryType === 'income' || entryType === 'expense') {
            addUnifiedTransaction();
        } else if (entryType === 'loan') {
            addUnifiedLoan();
        }
    }
}

async function addUnifiedTransaction() {
    showLoading(true);
    const entryType = document.getElementById('unifiedEntryType').value;
    const amount = parseFloat(document.getElementById('unifiedAmount').value);
    const dateTimeValue = document.getElementById('unifiedDateTime').value;
    const notes = document.getElementById('unifiedNotes').value.trim();

    if (isNaN(amount) || amount <= 0) { showNotification(getTranslatedString("invalidAmount"), true); showLoading(false); return; }
    if (!dateTimeValue) { showNotification(getTranslatedString("selectDateTime"), true); showLoading(false); return; }

    const entryDateTime = new Date(dateTimeValue);
    let entryDetails = {
        amount,
        dateTime: entryDateTime.toISOString(), // Store as ISO string
        notes,
        type: entryType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() // Use server timestamp
    };

    if (entryType === 'income') {
        const source = document.getElementById('incomeSource').value.trim();
        if (!source) { showNotification(getTranslatedString("incomeSourceRequired"), true); showLoading(false); return; }
        entryDetails.source = source;
    } else { // expense
        const category = document.getElementById('expenseCategory').value;
        const subcategory = document.getElementById('expenseSubcategory').value;
        if (!category) { showNotification(getTranslatedString("expenseCategoryRequired"), true); showLoading(false); return; }
        entryDetails.category = category;
        entryDetails.subcategory = subcategory || ""; // Ensure subcategory is at least an empty string
    }

    try {
        const docRef = await db.collection('users').doc(currentUser.uid).collection('transactions').add(entryDetails);
        transactions.unshift({ firestoreId: docRef.id, ...entryDetails, dateTime: entryDateTime.toISOString() }); // Add with Firestore ID
        transactions.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        finalizeUnifiedFormSubmission(getTranslatedString("entryAddedSuccess", { entryType: getTranslatedString(entryType) }), 'transactions');
    } catch (error) {
        console.error("Error adding transaction to Firestore: ", error);
        showNotification(getTranslatedString("updateError"), true); // Generic update error
    } finally {
        showLoading(false);
    }
}

async function addUnifiedLoan() {
    showLoading(true);
    const loanType = document.getElementById('loanType').value; // 'lent' or 'borrowed'
    const personName = document.getElementById('personName').value.trim();
    const amount = parseFloat(document.getElementById('unifiedAmount').value);
    const dateTimeValue = document.getElementById('unifiedDateTime').value;
    const notes = document.getElementById('unifiedNotes').value.trim();

    if (!personName) { showNotification(getTranslatedString("personNameRequired"), true); showLoading(false); return; }
    if (isNaN(amount) || amount <= 0) { showNotification(getTranslatedString("invalidAmount"), true); showLoading(false); return; }
    if (!dateTimeValue) { showNotification(getTranslatedString("selectDateTime"), true); showLoading(false); return; }

    const loanDateTime = new Date(dateTimeValue);
    const loanEntry = {
        type: loanType,
        personName,
        amount,
        dateTime: loanDateTime.toISOString(),
        notes,
        // entryClass: 'loan', // Not needed for Firestore directly, type field is primary
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const docRef = await db.collection('users').doc(currentUser.uid).collection('loans').add(loanEntry);
        loans.unshift({ firestoreId: docRef.id, ...loanEntry, dateTime: loanDateTime.toISOString() });
        loans.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        const loanTypeDisplay = loanType === 'lent' ? getTranslatedString('loanTypeLent') : getTranslatedString('loanTypeBorrowed');
        finalizeUnifiedFormSubmission(getTranslatedString("loanAddedSuccess", { loanType: loanTypeDisplay.split(' ')[0] }), 'denaPaona');
    } catch (error) {
        console.error("Error adding loan to Firestore: ", error);
        showNotification(getTranslatedString("updateError"), true);
    } finally {
        showLoading(false);
    }
}

function finalizeUnifiedFormSubmission(message, targetTab) {
    updateDashboardSummary();
    if (targetTab === 'transactions') renderAllTransactions();
    else if (targetTab === 'denaPaona') renderDenaPaonaTab();
    renderExpenseReport();

    showNotification(message);
    resetUnifiedEntryForm();
    setTimeout(() => openTab(null, targetTab), 100);
}

function resetUnifiedEntryForm() {
    const form = document.getElementById('unifiedEntryForm');
    if (form) form.reset();
    setDateTimeNow('unifiedDateTime');
    const entryTypeSelect = document.getElementById('unifiedEntryType');
    if (entryTypeSelect) entryTypeSelect.value = 'expense'; // Default to expense

    document.getElementById('editingFirestoreDocId').value = '';
    document.getElementById('editingUnifiedEntryClass').value = '';

    toggleUnifiedEntryFields(); // This will set correct titles/buttons and update subcategories
}


function formatDateTime(isoString, includeSeconds = true) {
    if (!isoString) return getTranslatedString("invalidDate") || "অবৈধ তারিখ";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return getTranslatedString("invalidDate") || "অবৈধ তারিখ";

    const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    if (includeSeconds) timeOptions.second = '2-digit';

    const localeForDate = window.currentLocale === 'en' ? 'en-GB' : 'bn-BD';
    const localeForTime = window.currentLocale === 'en' ? 'en-US' : 'bn-BD'; // AM/PM in bn-BD might be different

    try {
        const formattedDate = date.toLocaleDateString(localeForDate, dateOptions);
        let formattedTime = date.toLocaleTimeString(localeForTime, timeOptions);
        // For Bengali, ensure AM/PM is understandable if English locale was used for it
        if (window.currentLocale === 'bn' && (formattedTime.includes('AM') || formattedTime.includes('PM'))) {
            formattedTime = formattedTime.replace('AM', 'পূর্বাহ্ণ').replace('PM', 'অপরাহ্ন');
        }
        return `${formattedDate}, ${formattedTime}`;
    } catch (e) {
        console.error("Error formatting date:", e, "Input:", isoString, "Locale:", window.currentLocale);
        return date.toDateString() + ' ' + date.toLocaleTimeString(); // Fallback
    }
}


function renderAllTransactions() {
    const listElement = document.getElementById('allTransactionsList');
    if (!listElement) return;

    const filterType = document.getElementById('transactionFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    const textFilter = document.getElementById('textSearchFilter').value.toLowerCase();
    listElement.innerHTML = '';

    const filteredIncomeExpenses = transactions.filter(t => {
        const transactionDateStr = (typeof t.dateTime === 'string') ? t.dateTime : (t.dateTime?.toDate?.().toISOString() || new Date(0).toISOString());
        const transactionMonth = transactionDateStr.slice(0, 7);
        const typeMatch = (filterType === 'all' || t.type === filterType);
        const monthMatch = (!monthFilter || transactionMonth === monthFilter);
        let textContent = `${t.notes || ''} ${t.amount || ''}`;
        if (t.type === 'income') textContent += ` ${t.source || ''}`;
        else textContent += ` ${t.category || ''} ${t.subcategory || ''}`;
        const textSearchMatch = (!textFilter || textContent.toLowerCase().includes(textFilter));
        return typeMatch && monthMatch && textSearchMatch;
    });

    if (filteredIncomeExpenses.length === 0) {
        listElement.innerHTML = `<p><i class="fas fa-info-circle"></i> ${getTranslatedString('noTransactionsForFilter')}</p>`; return;
    }
    filteredIncomeExpenses.forEach(t => { listElement.appendChild(createTransactionItemElement(t, 'transactions')); });
}

function createTransactionItemElement(t, context) {
    const item = document.createElement('div');
    item.classList.add('transaction-item', t.type);
    if (context === 'dashboard') item.classList.add('compact-item');

    const isIncome = t.type === 'income';
    const typeText = getTranslatedString(isIncome ? 'income' : 'expense');
    const sourceText = getTranslatedString('incomeSourceLabel'); // "উৎস:" or "Source:"
    const categoryText = getTranslatedString('expenseCategoryLabel'); // "খাতের নাম:" or "Category:"

    let description;
    if (isIncome) {
        description = `${sourceText.slice(0,-1)}: ${t.source || getTranslatedString('unknown')}`;
    } else {
        const catDisplay = window.currentLocale === 'en' ? (getTranslatedString(`category_${t.category?.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '')}`) || t.category) : t.category;
        const subcatDisplay = t.subcategory ? (window.currentLocale === 'en' ? (getTranslatedString(`subcategory_${t.subcategory.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '')}`) || t.subcategory) : t.subcategory) : "";
        description = `${categoryText.slice(0,-1)}: ${catDisplay || getTranslatedString('unknown')} ${subcatDisplay ? `(${subcatDisplay})` : ''}`;
    }
    let iconClass = isIncome ? 'fas fa-arrow-down' : 'fas fa-arrow-up';
    const firestoreDocId = t.firestoreId; // Use the correct ID property

    let itemHTML = `
        <div class="transaction-details">
            <p><i class="${iconClass}" style="color:${isIncome ? '#28a745' : '#dc3545'};"></i> ${typeText}</p>
            <p class="datetime-display"><i class="far fa-clock"></i> ${formatDateTime(t.dateTime, context !== 'dashboard')}</p>
            <p>${description}</p>
            ${t.notes && context !== 'dashboard' ? `<p class="transaction-notes"><i class="far fa-comment-alt"></i> ${t.notes}</p>` : ''}
        </div>
        <div class="item-actions">
            <p class="amount-display" style="color:${isIncome ? '#28a745' : '#dc3545'};">৳ ${(t.amount || 0).toFixed(2)}</p>`;

    if (context !== 'dashboard') {
        itemHTML += `
            <div class="action-buttons">
                <button class="edit-btn" onclick="editUnifiedEntry('${firestoreDocId}', 'transaction')" title="${getTranslatedString('edit')}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="deleteTransaction('${firestoreDocId}')" title="${getTranslatedString('delete')}"><i class="fas fa-trash-alt"></i></button>
            </div>`;
    }
    itemHTML += `</div>`;
    item.innerHTML = itemHTML;
    return item;
}

function filterTransactions() { renderAllTransactions(); }

async function deleteTransaction(docId) { // Renamed from firestoreDocId for clarity
    if (confirm(getTranslatedString("confirmDeleteTransaction"))) {
        showLoading(true);
        try {
            await db.collection('users').doc(currentUser.uid).collection('transactions').doc(docId).delete();
            transactions = transactions.filter(t => t.firestoreId !== docId);
            renderAllTransactions();
            updateDashboardSummary();
            renderExpenseReport();
            showNotification(getTranslatedString("transactionDeletedSuccess"));
        } catch (error) {
            console.error("Error deleting transaction: ", error);
            showNotification(getTranslatedString("transactionDeleteError"), true);
        } finally {
            showLoading(false);
        }
    }
}

function renderDenaPaonaTab() {
    const monthFilterValue = document.getElementById('denaPaonaMonthFilter').value;
    const startDateFilterValue = document.getElementById('denaPaonaStartDateFilter').value;
    const endDateFilterValue = document.getElementById('denaPaonaEndDateFilter').value;
    const typeFilterValue = document.getElementById('denaPaonaTypeFilter').value;
    const listContainer = document.getElementById('denaPaonaListContainer');
    const summaryPeriodTextEl = document.getElementById('denaPaonaSummaryPeriodText');

    if (!listContainer || !summaryPeriodTextEl) return;
    listContainer.innerHTML = '';
    let filteredLoansArr = [...loans];
    let periodText = getTranslatedString("allTime");

    if (startDateFilterValue && endDateFilterValue) {
        const start = new Date(startDateFilterValue); start.setHours(0,0,0,0);
        const end = new Date(endDateFilterValue); end.setHours(23,59,59,999);
        if (start <= end) {
            filteredLoansArr = filteredLoansArr.filter(l => { const loanDate = new Date(l.dateTime); return loanDate >= start && loanDate <= end; });
            periodText = `${formatDateForDisplay(startDateFilterValue)} ${getTranslatedString('toPeriodText', { default: window.currentLocale === 'bn' ? 'থেকে' : 'to' })} ${formatDateForDisplay(endDateFilterValue)}`;
            document.getElementById('denaPaonaMonthFilter').value = '';
        } else {
            showNotification(getTranslatedString("startDateAfterEndDateError"), true);
            const currentMonthDefault = new Date().toISOString().slice(0, 7);
            document.getElementById('denaPaonaMonthFilter').value = currentMonthDefault;
            document.getElementById('denaPaonaStartDateFilter').value = '';
            document.getElementById('denaPaonaEndDateFilter').value = '';
            filteredLoansArr = loans.filter(l => (l.dateTime || '').startsWith(currentMonthDefault));
            periodText = new Date().toLocaleDateString(window.currentLocale === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
        }
    } else if (monthFilterValue) {
        filteredLoansArr = filteredLoansArr.filter(l => (l.dateTime || '').startsWith(monthFilterValue));
        const [year, month] = monthFilterValue.split('-');
        periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString(window.currentLocale === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
        document.getElementById('denaPaonaStartDateFilter').value = '';
        document.getElementById('denaPaonaEndDateFilter').value = '';
    } else {
        const currentMonthDefault = new Date().toISOString().slice(0, 7);
        if (!document.getElementById('denaPaonaMonthFilter').value && !startDateFilterValue && !endDateFilterValue) {
            document.getElementById('denaPaonaMonthFilter').value = currentMonthDefault;
            filteredLoansArr = loans.filter(l => (l.dateTime || '').startsWith(currentMonthDefault));
            periodText = new Date().toLocaleDateString(window.currentLocale === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
        }
    }

    if (typeFilterValue !== 'all') {
        filteredLoansArr = filteredLoansArr.filter(l => l.type === typeFilterValue);
    }
    summaryPeriodTextEl.textContent = periodText;

    const totalLentFiltered = filteredLoansArr.filter(l => l.type === 'lent').reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalBorrowedFiltered = filteredLoansArr.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + (l.amount || 0), 0);
    const netBalanceFiltered = totalLentFiltered - totalBorrowedFiltered;

    document.getElementById('denaPaonaTotalLentDisplay').textContent = `৳ ${totalLentFiltered.toFixed(2)}`;
    document.getElementById('denaPaonaTotalBorrowedDisplay').textContent = `৳ ${totalBorrowedFiltered.toFixed(2)}`;
    document.getElementById('denaPaonaNetBalanceDisplay').textContent = `৳ ${netBalanceFiltered.toFixed(2)}`;
    document.getElementById('denaPaonaNetBalanceDisplay').style.color = netBalanceFiltered >= 0 ? '#28a745' : '#dc3545';

    if (filteredLoansArr.length === 0) {
        listContainer.innerHTML = `<p><i class="fas fa-info-circle"></i> ${getTranslatedString('noLoansForFilter')}</p>`;
    } else {
        filteredLoansArr.forEach(l => listContainer.appendChild(createLoanItemElement(l, 'denaPaona')));
    }
}

function resetDenaPaonaFilters() {
    document.getElementById('denaPaonaMonthFilter').value = new Date().toISOString().slice(0, 7);
    document.getElementById('denaPaonaStartDateFilter').value = '';
    document.getElementById('denaPaonaEndDateFilter').value = '';
    document.getElementById('denaPaonaTypeFilter').value = 'all';
    renderDenaPaonaTab();
}

function createLoanItemElement(loan, context) {
    const item = document.createElement('div');
    item.classList.add('loan-item', loan.type);
    if (context === 'dashboard') item.classList.add('compact-item');

    const isLent = loan.type === 'lent';
    const iconClass = isLent ? 'fas fa-arrow-right' : 'fas fa-arrow-left';
    const color = isLent ? '#ffc107' : '#17a2b8';
    const typeText = getTranslatedString(isLent ? 'loanTypeLent' : 'loanTypeBorrowed').split(' ')[0]; // Get first word like "পাওনা" or "দেনা"
    const firestoreDocId = loan.firestoreId;

    let itemHTML = `
        <div class="loan-details">
            <p><i class="${iconClass}" style="color:${color};"></i> ${loan.personName || getTranslatedString('unknownPerson')}</p>
            <p class="datetime-display"><i class="far fa-clock"></i> ${formatDateTime(loan.dateTime, context !== 'dashboard')}</p>
            <p>${typeText}</p>
            ${loan.notes && context !== 'dashboard' ? `<p class="loan-notes"><i class="far fa-comment-alt"></i> ${loan.notes}</p>` : ''}
        </div>
        <div class="item-actions">
            <p class="amount-display" style="color:${color};">৳ ${(loan.amount || 0).toFixed(2)}</p>`;

    if (context !== 'dashboard') {
        itemHTML += `
            <div class="action-buttons">
                <button class="edit-btn" onclick="editUnifiedEntry('${firestoreDocId}', 'loan')" title="${getTranslatedString('edit')}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="deleteLoan('${firestoreDocId}')" title="${getTranslatedString('delete')}"><i class="fas fa-trash-alt"></i></button>
            </div>`;
    }
    itemHTML += `</div>`;
    item.innerHTML = itemHTML;
    return item;
}

async function deleteLoan(docId) {
    if (confirm(getTranslatedString("deleteEntryConfirm"))) { // Generic confirm
        showLoading(true);
        try {
            await db.collection('users').doc(currentUser.uid).collection('loans').doc(docId).delete();
            loans = loans.filter(l => l.firestoreId !== docId);
            renderDenaPaonaTab();
            updateDashboardSummary();
            showNotification(getTranslatedString("deleteSuccess"));
        } catch (error) {
            console.error("Error deleting loan: ", error);
            showNotification(getTranslatedString("deleteError"), true);
        } finally {
            showLoading(false);
        }
    }
}

function updateDashboardSummary() {
    const monthFilterValue = document.getElementById('dashboardMonthFilter').value;
    const startDateFilterValue = document.getElementById('dashboardStartDateFilter').value;
    const endDateFilterValue = document.getElementById('dashboardEndDateFilter').value;
    let filteredTransactionsForDashboard = [...transactions];
    let periodText = getTranslatedString("allTime");

    if (startDateFilterValue && endDateFilterValue) {
        const start = new Date(startDateFilterValue); start.setHours(0,0,0,0);
        const end = new Date(endDateFilterValue); end.setHours(23,59,59,999);
        if (start <= end) {
            filteredTransactionsForDashboard = transactions.filter(t => { const transactionDate = new Date(t.dateTime); return transactionDate >= start && transactionDate <= end; });
            periodText = `${formatDateForDisplay(startDateFilterValue)} ${getTranslatedString('toPeriodText', { default: window.currentLocale === 'bn' ? 'থেকে' : 'to' })} ${formatDateForDisplay(endDateFilterValue)}`;
            document.getElementById('dashboardMonthFilter').value = '';
        } else {
            showNotification(getTranslatedString("startDateAfterEndDateError") + " " + getTranslatedString("filtersReset"), true);
            resetDashboardFilters(); return;
        }
    } else if (monthFilterValue) {
        filteredTransactionsForDashboard = transactions.filter(t => (t.dateTime || '').startsWith(monthFilterValue));
        const [year, month] = monthFilterValue.split('-');
        periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString(window.currentLocale === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
        document.getElementById('dashboardStartDateFilter').value = '';
        document.getElementById('dashboardEndDateFilter').value = '';
    } else {
        const currentMonthDefault = new Date().toISOString().slice(0, 7);
        if (!document.getElementById('dashboardMonthFilter').value ) {
             document.getElementById('dashboardMonthFilter').value = currentMonthDefault;
        }
        const currentFilterMonth = document.getElementById('dashboardMonthFilter').value || currentMonthDefault;
        filteredTransactionsForDashboard = transactions.filter(t => (t.dateTime || '').startsWith(currentFilterMonth));
        const [year, month] = currentFilterMonth.split('-');
        periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString(window.currentLocale === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
    }

    document.getElementById('summaryPeriodText').textContent = periodText;
    const totalIncome = filteredTransactionsForDashboard.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpense = filteredTransactionsForDashboard.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const currentBalance = totalIncome - totalExpense;
    document.getElementById('totalIncomeDisplay').textContent = `৳ ${totalIncome.toFixed(2)}`;
    document.getElementById('totalExpenseDisplay').textContent = `৳ ${totalExpense.toFixed(2)}`;
    document.getElementById('currentBalanceDisplay').textContent = `৳ ${currentBalance.toFixed(2)}`;

    const totalLentAllTime = loans.filter(l => l.type === 'lent').reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalBorrowedAllTime = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + (l.amount || 0), 0);
    const netLoanBalanceAllTime = totalLentAllTime - totalBorrowedAllTime;
    document.getElementById('totalLentDisplay').textContent = `৳ ${totalLentAllTime.toFixed(2)}`;
    document.getElementById('totalBorrowedDisplay').textContent = `৳ ${totalBorrowedAllTime.toFixed(2)}`;
    document.getElementById('netLoanBalanceDisplay').textContent = `৳ ${netLoanBalanceAllTime.toFixed(2)}`;
    document.getElementById('netLoanBalanceDisplay').style.color = netLoanBalanceAllTime >= 0 ? '#28a745' : '#dc3545';

    const finalBalanceAfterLoans = currentBalance + netLoanBalanceAllTime;
    const finalBalanceDisplayElement = document.getElementById('finalBalanceAfterLoansDisplay');
    finalBalanceDisplayElement.textContent = `৳ ${finalBalanceAfterLoans.toFixed(2)}`;
    finalBalanceDisplayElement.style.color = finalBalanceAfterLoans >= 0 ? '#20c997' : '#dc3545';

    updateLatestTransactionsDisplay();
}


function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Use en-GB for dd/mm/yyyy type for English, bn-BD for Bengali
    const locale = window.currentLocale === 'en' ? 'en-GB' : 'bn-BD';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function resetDashboardFilters() {
    document.getElementById('dashboardMonthFilter').value = new Date().toISOString().slice(0, 7);
    document.getElementById('dashboardStartDateFilter').value = '';
    document.getElementById('dashboardEndDateFilter').value = '';
    updateDashboardSummary();
}

function updateLatestTransactionsDisplay() {
    const latestTransactionsList = document.getElementById('latestTwoTransactions');
    latestTransactionsList.innerHTML = '';
    const combinedEntries = [
        ...transactions.map(t => ({ ...t, entryClassInternal: 'transaction' })),
        ...loans.map(l => ({ ...l, entryClassInternal: 'loan' }))
    ].sort((a,b) => new Date(b.dateTime) - new Date(a.dateTime));

    const latestTwo = combinedEntries.slice(0, 2);

    if (latestTwo.length === 0) {
        latestTransactionsList.innerHTML = `<p><i class="fas fa-info-circle"></i> ${getTranslatedString('noRecentTransactions')}</p>`;
    } else {
        latestTwo.forEach(entry => {
            let item;
            if (entry.entryClassInternal === 'transaction') item = createTransactionItemElement(entry, 'dashboard');
            else item = createLoanItemElement(entry, 'dashboard');
            latestTransactionsList.appendChild(item);
        });
    }
}

function editUnifiedEntry(docId, entryClass) { // docId is firestoreId
    openTab(null, 'addEntry');
    document.getElementById('editingFirestoreDocId').value = docId;
    document.getElementById('editingUnifiedEntryClass').value = entryClass;

    let entryToEdit;
    if (entryClass === 'transaction') {
        entryToEdit = transactions.find(t => t.firestoreId === docId);
        if (!entryToEdit) { showNotification(getTranslatedString("entryFindError"), true); resetUnifiedEntryForm(); return; }
        document.getElementById('unifiedEntryType').value = entryToEdit.type;
        // toggleUnifiedEntryFields(); // Called below after type set

        if (entryToEdit.type === 'income') {
            document.getElementById('incomeSource').value = entryToEdit.source || "";
        } else {
            document.getElementById('expenseCategory').value = entryToEdit.category || "";
            updateSubcategories(entryToEdit.category || "", 'expenseSubcategory'); // Update subcategories based on main
            document.getElementById('expenseSubcategory').value = entryToEdit.subcategory || "";
        }
        document.getElementById('unifiedAmount').value = entryToEdit.amount;
        setDateTimeForInput('unifiedDateTime', entryToEdit.dateTime);
        document.getElementById('unifiedNotes').value = entryToEdit.notes || "";

    } else if (entryClass === 'loan') {
        entryToEdit = loans.find(l => l.firestoreId === docId);
        if (!entryToEdit) { showNotification(getTranslatedString("entryFindError"), true); resetUnifiedEntryForm(); return; }
        document.getElementById('unifiedEntryType').value = 'loan'; // Explicitly set type
        // toggleUnifiedEntryFields(); // Called below

        document.getElementById('loanType').value = entryToEdit.type;
        document.getElementById('personName').value = entryToEdit.personName || "";
        document.getElementById('unifiedAmount').value = entryToEdit.amount;
        setDateTimeForInput('unifiedDateTime', entryToEdit.dateTime);
        document.getElementById('unifiedNotes').value = entryToEdit.notes || "";
    }
    toggleUnifiedEntryFields(); // Call once after all values are set to update form display correctly
}


function setDateTimeForInput(elementId, isoStringOrTimestamp) {
    let date;
    if (typeof isoStringOrTimestamp === 'string') {
        date = new Date(isoStringOrTimestamp);
    } else if (isoStringOrTimestamp && typeof isoStringOrTimestamp.toDate === 'function') { // Firestore Timestamp
        date = isoStringOrTimestamp.toDate();
    } else {
        date = new Date(); // Fallback to now
    }

    if (isNaN(date.getTime())) date = new Date(); // Further fallback for invalid date

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    document.getElementById(elementId).value = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}


async function updateUnifiedTransaction(docId) {
    if (!confirm(getTranslatedString("confirmEditEntry"))) { resetUnifiedEntryForm(); openTab(null, 'transactions'); return; }
    showLoading(true);

    const entryType = document.getElementById('unifiedEntryType').value;
    const amount = parseFloat(document.getElementById('unifiedAmount').value);
    const dateTimeValue = document.getElementById('unifiedDateTime').value;
    const notes = document.getElementById('unifiedNotes').value.trim();

    if (isNaN(amount) || amount <= 0) { showNotification(getTranslatedString("invalidAmount"), true); showLoading(false); return; }
    if (!dateTimeValue) { showNotification(getTranslatedString("selectDateTime"), true); showLoading(false); return; }

    const entryDateTime = new Date(dateTimeValue);
    let updatedData = {
        type: entryType,
        amount: amount,
        dateTime: entryDateTime.toISOString(),
        notes: notes,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (entryType === 'income') {
        const source = document.getElementById('incomeSource').value.trim();
        if (!source) { showNotification(getTranslatedString("incomeSourceRequired"), true); showLoading(false); return; }
        updatedData.source = source;
        updatedData.category = firebase.firestore.FieldValue.delete();
        updatedData.subcategory = firebase.firestore.FieldValue.delete();
    } else { // expense
        const category = document.getElementById('expenseCategory').value;
        const subcategory = document.getElementById('expenseSubcategory').value;
        if (!category) { showNotification(getTranslatedString("expenseCategoryRequired"), true); showLoading(false); return; }
        updatedData.category = category;
        updatedData.subcategory = subcategory || "";
        updatedData.source = firebase.firestore.FieldValue.delete();
    }

    try {
        await db.collection('users').doc(currentUser.uid).collection('transactions').doc(docId).update(updatedData);
        const index = transactions.findIndex(t => t.firestoreId === docId);
        if (index !== -1) {
            // Create a new object for the updated transaction to ensure reactivity if using frameworks
            transactions[index] = { ...transactions[index], ...updatedData, firestoreId: docId, dateTime: entryDateTime.toISOString() };
             transactions.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        }
        finalizeUnifiedFormSubmission(getTranslatedString("entryUpdatedSuccess", {entryType: getTranslatedString(entryType) }), 'transactions');
    } catch (error) {
        console.error("Error updating transaction: ", error);
        showNotification(getTranslatedString("updateError"), true);
    } finally {
        showLoading(false);
    }
}

async function updateUnifiedLoan(docId) {
    if (!confirm(getTranslatedString("confirmEditEntry"))) { resetUnifiedEntryForm(); openTab(null, 'denaPaona'); return; }
    showLoading(true);

    const loanType = document.getElementById('loanType').value;
    const personName = document.getElementById('personName').value.trim();
    const amount = parseFloat(document.getElementById('unifiedAmount').value);
    const dateTimeValue = document.getElementById('unifiedDateTime').value;
    const notes = document.getElementById('unifiedNotes').value.trim();

    if (!personName) { showNotification(getTranslatedString("personNameRequired"), true); showLoading(false); return; }
    if (isNaN(amount) || amount <= 0) { showNotification(getTranslatedString("invalidAmount"), true); showLoading(false); return; }
    if (!dateTimeValue) { showNotification(getTranslatedString("selectDateTime"), true); showLoading(false); return; }

    const loanDateTime = new Date(dateTimeValue);
    const updatedData = {
        type: loanType,
        personName: personName,
        amount: amount,
        dateTime: loanDateTime.toISOString(),
        notes: notes,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('users').doc(currentUser.uid).collection('loans').doc(docId).update(updatedData);
        const index = loans.findIndex(l => l.firestoreId === docId);
        if (index !== -1) {
            loans[index] = { ...loans[index], ...updatedData, firestoreId: docId, dateTime: loanDateTime.toISOString() };
            loans.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        }
        finalizeUnifiedFormSubmission(getTranslatedString("loanUpdatedSuccess"), 'denaPaona');
    } catch (error) {
        console.error("Error updating loan: ", error);
        showNotification(getTranslatedString("updateError"), true);
    } finally {
        showLoading(false);
    }
}

// --- Expense Report Tab Logic ---
function renderExpenseReport() {
    const reportContainer = document.getElementById('expenseReportContainer');
    const monthFilter = document.getElementById('reportMonthFilter').value;
    const startDateFilter = document.getElementById('reportStartDateFilter').value;
    const endDateFilter = document.getElementById('reportEndDateFilter').value;
    const categoryFilter = document.getElementById('reportCategoryFilter').value; // This is Bengali key
    const subcategoryFilter = document.getElementById('reportSubcategoryFilter').value; // This is Bengali key

    const summaryPeriodTextEl = document.getElementById('reportSummaryPeriodText');
    const grandTotalAmountEl = document.getElementById('reportGrandTotalAmount');

    if (!reportContainer || !summaryPeriodTextEl || !grandTotalAmountEl) return;
    reportContainer.innerHTML = '';
    let periodText = getTranslatedString("allTime");
    let filteredExpenses = transactions.filter(t => t.type === 'expense');

    if (startDateFilter && endDateFilter) {
        const start = new Date(startDateFilter); start.setHours(0,0,0,0);
        const end = new Date(endDateFilter); end.setHours(23,59,59,999);
        if (start <= end) {
            filteredExpenses = filteredExpenses.filter(t => { const txDate = new Date(t.dateTime); return txDate >= start && txDate <= end; });
            periodText = `${formatDateForDisplay(startDateFilter)} ${getTranslatedString('toPeriodText', { default: window.currentLocale === 'bn' ? 'থেকে' : 'to' })} ${formatDateForDisplay(endDateFilter)}`;
            document.getElementById('reportMonthFilter').value = '';
        } else {
            showNotification(getTranslatedString("startDateAfterEndDateError"), true);
            const currentMonthDefault = new Date().toISOString().slice(0, 7);
            document.getElementById('reportMonthFilter').value = currentMonthDefault;
            document.getElementById('reportStartDateFilter').value = '';
            document.getElementById('reportEndDateFilter').value = '';
            filteredExpenses = transactions.filter(t => t.type === 'expense' && (t.dateTime || '').startsWith(currentMonthDefault));
            periodText = new Date().toLocaleDateString(window.currentLocale === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
        }
    } else if (monthFilter) {
        filteredExpenses = filteredExpenses.filter(t => (t.dateTime || '').startsWith(monthFilter));
        const [year, month] = monthFilter.split('-');
        periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString(window.currentLocale === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
        document.getElementById('reportStartDateFilter').value = '';
        document.getElementById('reportEndDateFilter').value = '';
    } else {
        const currentMonthDefault = new Date().toISOString().slice(0, 7);
         if (!document.getElementById('reportMonthFilter').value ) {
             document.getElementById('reportMonthFilter').value = currentMonthDefault;
        }
        const currentFilterMonthVal = document.getElementById('reportMonthFilter').value || currentMonthDefault;
        filteredExpenses = filteredExpenses.filter(t => t.type === 'expense' && (t.dateTime || '').startsWith(currentFilterMonthVal));
        const [year, month] = currentFilterMonthVal.split('-');
        periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString(window.currentLocale === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
    }
    summaryPeriodTextEl.textContent = periodText;

    if (categoryFilter !== 'all') {
        filteredExpenses = filteredExpenses.filter(expense => expense.category === categoryFilter);
        if (subcategoryFilter !== 'all' && subcategoryFilter !== "") {
            filteredExpenses = filteredExpenses.filter(expense => expense.subcategory === subcategoryFilter);
        }
    }

    if (filteredExpenses.length === 0) {
        reportContainer.innerHTML = `<p><i class="fas fa-info-circle"></i> ${getTranslatedString('noExpensesForFilterReport')}</p>`;
        grandTotalAmountEl.textContent = `৳ ${Number(0).toFixed(2)}`;
        return;
    }

    const expensesByMainCategory = {};
    filteredExpenses.forEach(expense => {
        const mainCatKey = expense.category || getTranslatedString('uncategorized'); // Bengali key
        if (!expensesByMainCategory[mainCatKey]) {
            expensesByMainCategory[mainCatKey] = {};
        }
        const subcatKey = expense.subcategory || getTranslatedString('otherNoSubcategory'); // Bengali key
        if (!expensesByMainCategory[mainCatKey][subcatKey]) {
            expensesByMainCategory[mainCatKey][subcatKey] = 0;
        }
        expensesByMainCategory[mainCatKey][subcatKey] += (expense.amount || 0);
    });

    let grandTotal = 0;
    // Sort main categories for display
    const sortedMainCategories = Object.keys(expensesByMainCategory).sort((a,b) => a.localeCompare(b, window.currentLocale === 'bn' ? 'bn' : 'en'));

    for (const mainCategoryKey of sortedMainCategories) { // mainCategoryKey is Bengali
        const groupDiv = document.createElement('div');
        groupDiv.className = 'report-category-group';
        let categoryTotal = 0;
        const subcategoryList = document.createElement('ul');
        subcategoryList.className = 'report-subcategory-list';

        const sortedSubcategories = Object.keys(expensesByMainCategory[mainCategoryKey]).sort((a,b) => a.localeCompare(b, window.currentLocale === 'bn' ? 'bn' : 'en'));

        for (const subcategoryKey of sortedSubcategories) { // subcategoryKey is Bengali
            const amount = expensesByMainCategory[mainCategoryKey][subcategoryKey];
            categoryTotal += amount;
            const listItem = document.createElement('li');
            listItem.className = 'report-subcategory-item';
            // Translate for display if English
            const subcatDisplay = window.currentLocale === 'en' ? (getTranslatedString(`subcategory_${subcategoryKey.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '')}`) || subcategoryKey) : subcategoryKey;
            listItem.innerHTML = `<span class="subcategory-name">${subcatDisplay}</span> <span class="subcategory-amount">৳ ${amount.toFixed(2)}</span>`;
            subcategoryList.appendChild(listItem);
        }
        grandTotal += categoryTotal;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'report-category-header';
        // Translate mainCategoryKey for display if English
        const mainCatDisplay = window.currentLocale === 'en' ? (getTranslatedString(`category_${mainCategoryKey.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '')}`) || mainCategoryKey) : mainCategoryKey;
        headerDiv.innerHTML = `<span><i class="fas fa-folder"></i> ${mainCatDisplay}</span> <span class="category-total">${getTranslatedString('total')}: ৳ ${categoryTotal.toFixed(2)}</span>`;

        groupDiv.appendChild(headerDiv);
        groupDiv.appendChild(subcategoryList);
        reportContainer.appendChild(groupDiv);
    }
    grandTotalAmountEl.textContent = `৳ ${grandTotal.toFixed(2)}`;
}


function updateReportSubcategoryFilter() {
    const categoryFilterValue = document.getElementById('reportCategoryFilter').value; // Bengali key
    updateSubcategories(categoryFilterValue, 'reportSubcategoryFilter');
    if (categoryFilterValue === 'all') {
        const subcatSelect = document.getElementById('reportSubcategoryFilter');
        if (subcatSelect) {
            subcatSelect.value = 'all';
            subcatSelect.disabled = false;
        }
    }
}

function resetExpenseReportFilters() {
    document.getElementById('reportMonthFilter').value = new Date().toISOString().slice(0, 7);
    document.getElementById('reportStartDateFilter').value = '';
    document.getElementById('reportEndDateFilter').value = '';
    document.getElementById('reportCategoryFilter').value = 'all';
    updateReportSubcategoryFilter(); // This will also set subcategory to 'all'
    renderExpenseReport();
}

function showNotification(message, isError = false) { const n=document.getElementById('customNotification'),m=document.getElementById('notificationMessage'); if(!n||!m)return;m.textContent=message;n.className='notification';if(isError)n.classList.add('error');n.classList.add('show');setTimeout(()=>{n.classList.remove('show')},3500); } // Slightly longer display

// Clock needs to respect language for AM/PM if not handled by toLocaleTimeString fully
let clockInterval;
function startClock() {
    if (clockInterval) clearInterval(clockInterval); // Clear existing interval if any
    const clockElement = document.getElementById('clockTime');
    if (!clockElement) return;

    function updateClock() {
        const now = new Date();
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        let timeString = now.toLocaleTimeString(window.currentLocale === 'en' ? 'en-US' : 'bn-BD', timeOptions);
        
        // Manual AM/PM translation for Bengali if needed, as bn-BD might still show AM/PM
        if (window.currentLocale === 'bn') {
            timeString = timeString.replace(/AM/i, getTranslatedString('timeAM', {default: 'পূর্বাহ্ণ'}))
                                   .replace(/PM/i, getTranslatedString('timePM', {default: 'অপরাহ্ন'}));
        }
        clockElement.textContent = timeString;
    }
    updateClock(); // Initial call
    clockInterval = setInterval(updateClock, 1000);
}


function renderExpenseCategoriesView() {
    const container=document.getElementById('expenseCategoriesListContainer');
    if(!container)return;
    container.innerHTML='';
    // Sort main categories for display
    const sortedCategories = Object.keys(expenseCategoriesData).sort((a,b) => a.localeCompare(b, window.currentLocale === 'bn' ? 'bn' : 'en'));

    for(const categoryKey of sortedCategories){ // categoryKey is Bengali
        const card=document.createElement('div');
        card.classList.add('category-card');
        const title=document.createElement('h4');
        const categoryDisplay = window.currentLocale === 'en' ? (getTranslatedString(`category_${categoryKey.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '')}`) || categoryKey) : categoryKey;
        title.innerHTML=`<i class="fas fa-folder-open"></i> ${categoryDisplay}`;
        card.appendChild(title);

        const ul=document.createElement('ul');
        // Sort subcategories
        const sortedSubcats = [...expenseCategoriesData[categoryKey]].sort((a,b) => a.localeCompare(b, window.currentLocale === 'bn' ? 'bn' : 'en'));
        sortedSubcats.forEach(subcatKey=>{ // subcatKey is Bengali
            const li=document.createElement('li');
            const subcatDisplay = window.currentLocale === 'en' ? (getTranslatedString(`subcategory_${subcatKey.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '')}`) || subcatKey) : subcatKey;
            li.innerHTML=`<i class="fas fa-caret-right"></i> ${subcatDisplay}`;
            ul.appendChild(li);
        });
        card.appendChild(ul);
        container.appendChild(card);
    }
}

// --- ক্যালকুলেটর --- (Copied from previous, ensure it's robust)
const calculatorOverlayFS = document.getElementById('calculatorOverlay');
const calcInputExpressionDisplayFS = document.getElementById('calcInputExpressionDisplayFS');
const calcResultDisplayFS = document.getElementById('calcResultDisplayFS'); // Check HTML class name for this
const calcHistoryDisplayFS = document.getElementById('calcHistoryDisplayFS');
const calcLivePreviewDisplayFS = document.getElementById('calcLivePreviewDisplayFS');
let currentInputStringFS = '0';
let calculationHistoryLogFS = [];
const MAX_CALC_HISTORY_DISPLAY_ITEMS = 5;
let expressionBeforeEquals = '';

function toggleCalculatorFS() { const isOpen = calculatorOverlayFS.classList.contains('show'); if (isOpen) closeCalculatorFS(); else openCalculatorFS(); }
function openCalculatorFS() { calculatorOverlayFS.classList.add('show'); history.pushState({ calculatorOpenFS: true }, getTranslatedString('calculator'), "#calculatorFS"); resetCalculatorStateFS(); document.body.style.overflow = 'hidden'; }
function closeCalculatorFS() { calculatorOverlayFS.classList.remove('show'); if (location.hash === "#calculatorFS") { try { history.back(); } catch(e) { history.pushState(null, "", window.location.pathname + window.location.search);}} document.body.style.overflow = ''; }
function justCloseCalculatorFSUI() { calculatorOverlayFS.classList.remove('show'); document.body.style.overflow = ''; }
function handleSystemBackButton(event) { if (location.hash === "#calculatorFS" && calculatorOverlayFS.classList.contains('show')) {} else if (event.state && event.state.calculatorOpenFS === undefined && !location.hash.includes('calculatorFS') && calculatorOverlayFS.classList.contains('show')) { justCloseCalculatorFSUI(); } }
window.addEventListener('popstate', function(event) { if (!location.hash.includes('calculatorFS') && calculatorOverlayFS.classList.contains('show')) { justCloseCalculatorFSUI(); } });
function clearLivePreview() { if(calcLivePreviewDisplayFS) { calcLivePreviewDisplayFS.textContent = ''; calcLivePreviewDisplayFS.classList.remove('show'); } }
function resetCalculatorStateFS(clearHistory = false) { currentInputStringFS = '0'; expressionBeforeEquals = '0'; if (clearHistory) { calculationHistoryLogFS = []; renderCalculatorHistoryFS(); } updateInputDisplayFS(); if(calcResultDisplayFS) calcResultDisplayFS.textContent = ''; clearLivePreview(); }
function appendToInputStringFS(value) { const mainDisplayIsResult = expressionBeforeEquals === currentInputStringFS && currentInputStringFS !== '0' && currentInputStringFS !== 'Error' && !isOperator(currentInputStringFS.slice(-1)); if (mainDisplayIsResult && !isOperator(value) && value !== '.') { currentInputStringFS = '0'; } if (currentInputStringFS === '0' && !isOperator(value) && value !== '.') { currentInputStringFS = value; } else { if (isOperator(value) && currentInputStringFS.length > 0 && isOperator(currentInputStringFS.slice(-1).trim())) { if (value === '-' && currentInputStringFS.slice(-1).trim() !== '-') { currentInputStringFS += value; } else if (value !== '-') { if (currentInputStringFS.length > 1 && isOperator(currentInputStringFS.slice(-2, -1).trim()) && currentInputStringFS.endsWith('-')) { currentInputStringFS = currentInputStringFS.slice(0, -2).trim() + value; } else { currentInputStringFS = currentInputStringFS.slice(0, -1).trim() + value; } } } else if (isOperator(value) && currentInputStringFS === '0') { if (value === '-') currentInputStringFS = value; } else { currentInputStringFS += value; } } expressionBeforeEquals = currentInputStringFS; updateInputDisplayFS(); updateLivePreviewFS(); }
function inputDecimalFS() { if (currentInputStringFS.includes('.') && !currentInputStringFS.split(/[+\-×÷%]/g).pop().includes('.')) { /* allow if previous number had no decimal */ } else if (currentInputStringFS.split(/[+\-×÷%]/g).pop().includes('.')) { return; /* already has decimal in current number */ } const mainDisplayIsResult = expressionBeforeEquals === currentInputStringFS && currentInputStringFS !== '0' && currentInputStringFS !== 'Error' && !isOperator(currentInputStringFS.slice(-1)); if (mainDisplayIsResult) { currentInputStringFS = '0.'; } else { const parts = currentInputStringFS.split(/([+\-×÷%])/g); const lastPart = parts[parts.length - 1].trim(); if (lastPart === '' && isOperator(parts[parts.length - 2])) { currentInputStringFS += '0.'; } else if (!lastPart.includes('.')) { currentInputStringFS += '.'; } } expressionBeforeEquals = currentInputStringFS; updateInputDisplayFS(); updateLivePreviewFS(); }
function calculateEqualsFS() { if (currentInputStringFS === 'Error' || (currentInputStringFS === expressionBeforeEquals && calcInputExpressionDisplayFS.textContent === currentInputStringFS && !calcLivePreviewDisplayFS.classList.contains('show'))) { if (currentInputStringFS === '0' && expressionBeforeEquals === '0') {} else { return; } } let expressionToEvaluate = expressionBeforeEquals; clearLivePreview(); if(calcResultDisplayFS) calcResultDisplayFS.textContent = ''; if (isOperator(expressionToEvaluate.slice(-1).trim())) { if (expressionToEvaluate.length > 1 && isOperator(expressionToEvaluate.slice(-2,-1).trim()) && expressionToEvaluate.endsWith('-')){ currentInputStringFS = "Error"; updateInputDisplayFS(); return; } expressionToEvaluate = expressionToEvaluate.slice(0, -1).trim(); } if (!expressionToEvaluate || expressionToEvaluate === "0") { /* Don't calculate if empty or just 0 */ if (expressionToEvaluate === "0") currentInputStringFS = '0'; updateInputDisplayFS(); return; } const evalExpression = expressionToEvaluate.replace(/×/g, '*').replace(/÷/g, '/'); let result; try { result = (new Function( 'return (' + evalExpression + ')' ))(); if (isNaN(result) || !isFinite(result)) result = 'Error'; } catch (e) { result = 'Error'; } const displayResult = formatCalcNumber(result); currentInputStringFS = displayResult.toString(); updateInputDisplayFS(); addCalculationToHistoryFS(expressionBeforeEquals, displayResult); expressionBeforeEquals = currentInputStringFS; }
function addCalculationToHistoryFS(expression, result) { if (result === 'Error' || expression === result.toString() || expression === currentInputStringFS) return; calculationHistoryLogFS.unshift({ expr: expression, res: result }); if (calculationHistoryLogFS.length > MAX_CALC_HISTORY_DISPLAY_ITEMS) { calculationHistoryLogFS.pop(); } renderCalculatorHistoryFS(); }
function renderCalculatorHistoryFS() { if(!calcHistoryDisplayFS) return; calcHistoryDisplayFS.innerHTML = ''; calculationHistoryLogFS.slice().reverse().forEach(item => { const historyDiv = document.createElement('div'); historyDiv.classList.add('history-item-fs'); historyDiv.textContent = `${item.expr} = ${item.res}`; calcHistoryDisplayFS.appendChild(historyDiv); }); }
function updateInputDisplayFS() { if(!calcInputExpressionDisplayFS) return; calcInputExpressionDisplayFS.textContent = currentInputStringFS; const len = currentInputStringFS.length; if (len > 24) calcInputExpressionDisplayFS.style.fontSize = "1.3em"; else if (len > 20) calcInputExpressionDisplayFS.style.fontSize = "1.5em"; else if (len > 16) calcInputExpressionDisplayFS.style.fontSize = "1.7em"; else calcInputExpressionDisplayFS.style.fontSize = "2.0em"; }
function clearAllFS() { resetCalculatorStateFS(true); }
function backspaceFS() { if (currentInputStringFS.length > 1 && currentInputStringFS !== 'Error') { currentInputStringFS = currentInputStringFS.slice(0, -1); } else if (currentInputStringFS.length === 1 && currentInputStringFS !== '0') { currentInputStringFS = '0'; } else if (currentInputStringFS === 'Error') { currentInputStringFS = '0';} expressionBeforeEquals = currentInputStringFS; if(calcResultDisplayFS) calcResultDisplayFS.textContent = ''; updateInputDisplayFS(); updateLivePreviewFS(); }
function formatCalcNumber(numInput) { if(numInput===null||numInput===undefined||numInput==='Error'||(typeof numInput==='string'&&isNaN(parseFloat(numInput))))return 'Error';let numStr=Number(numInput).toString();if(Math.abs(Number(numInput))>1e12||(Math.abs(Number(numInput))<1e-9&&Number(numInput)!==0)){return Number(numInput).toExponential(6);}if(numStr.includes('.')){numStr=parseFloat(Number(numInput).toFixed(7)).toString();}return numStr;}
function isOperator(char) { return ['+', '-', '×', '÷', '%'].includes(char); }
function handleCalculatorFSInput(event) { const { value } = event.target.dataset; const classList = event.target.classList; if (currentInputStringFS === 'Error' && value !== 'clear') return; if (classList.contains('number')) { if (value === '.') inputDecimalFS(); else appendToInputStringFS(value); } else if (classList.contains('operator')) { const displayOperator = getOperatorSymbolForDisplayFS(value); appendToInputStringFS(displayOperator); } else if (classList.contains('equals')) { calculateEqualsFS(); } else if (value === 'clear') { clearAllFS(); } else if (value === 'backspace') { backspaceFS(); } }
function getOperatorSymbolForDisplayFS(op) { if (op === '*') return '×'; if (op === '/') return '÷'; return op; }
function updateLivePreviewFS() { const inputExpr = expressionBeforeEquals; if (!calcLivePreviewDisplayFS || inputExpr === 'Error') { clearLivePreview(); return; } const isJustANumber = /^-?((\d+(\.\d*)?)|(\.\d+))$/.test(inputExpr); if (inputExpr === '0' || inputExpr === '-' || isJustANumber || inputExpr.endsWith('.')) { clearLivePreview(); return; } const lastChar = inputExpr.slice(-1).trim(); if (isOperator(lastChar)) { if (lastChar === '-' && inputExpr.length > 1 && isOperator(inputExpr.slice(-2, -1))) { clearLivePreview(); return; } else if(isOperator(lastChar)) { clearLivePreview(); return; } } let evalExpression = inputExpr.replace(/×/g, '*').replace(/÷/g, '/'); try { if (isOperator(evalExpression.charAt(0)) && evalExpression.length === 1 && evalExpression.charAt(0) !== '-') { clearLivePreview(); return; } const result = (new Function( 'return (' + evalExpression + ')' ))(); if (isNaN(result) || !isFinite(result) || typeof result !== 'number') { clearLivePreview(); } else { calcLivePreviewDisplayFS.textContent = `= ${formatCalcNumber(result)}`; calcLivePreviewDisplayFS.classList.add('show'); } } catch (e) { clearLivePreview(); } }

// Firestore Security Rules Reminder (set in Firebase Console):
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
*/