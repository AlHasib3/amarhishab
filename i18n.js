// i18n.js

let translations = {}; // Will be loaded from translations.json
let currentLocale = localStorage.getItem('amarHishabLang') || 'bn';

async function loadTranslations() {
    try {
        const response = await fetch('translations.json'); // Ensure translations.json is in the same directory or provide correct path
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        translations = await response.json();
        console.log("Translations loaded successfully.");
    } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to an empty object or handle error appropriately
        translations = { bn: {}, en: {} };
    }
}

function setLocale(locale) {
    currentLocale = locale;
    localStorage.setItem('amarHishabLang', currentLocale);
    document.documentElement.lang = currentLocale; // Set lang attribute on <html>
    updateAllTranslatedTexts();
    updateLanguageButtonTextAll(); // Update the language toggle button text itself

    // Dispatch a custom event that other parts of the app can listen to
    // This is useful if components need to re-render based on language change.
    const langChangeEvent = new CustomEvent('languageChanged', { detail: { lang: currentLocale } });
    document.dispatchEvent(langChangeEvent);
}

function getTranslatedString(key, replacements = {}) {
    let string = translations[currentLocale]?.[key] || translations['en']?.[key] || key; // Fallback chain: current -> english -> key
    for (const placeholder in replacements) {
        string = string.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return string;
}

function updateAllTranslatedTexts() {
    if (Object.keys(translations).length === 0) {
        console.warn("Translations not loaded. Skipping text update.");
        return;
    }
    console.log("Applying translations for locale:", currentLocale);

    // Update elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const text = getTranslatedString(key);
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            if (element.placeholder) element.placeholder = text;
        } else {
            element.innerHTML = text; // Use innerHTML if keys might contain simple HTML like <i>
        }
    });

    // Specific updates that might need more complex logic or formatting
    // Example: Update tab button texts (if not using data-translate)
    const tabButtonKeys = {
        'dashboard': 'dashboard', 'addEntry': 'newEntry', 'transactions': 'allTransactions',
        'expenseReport': 'expenseReport', 'expenseCategoriesView': 'expenseCategories', 'denaPaona': 'debtsReceivables'
    };
    document.querySelectorAll('.service-button').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        for (const jsKey in tabButtonKeys) {
            if (onclickAttr && onclickAttr.includes(`'${jsKey}'`)) {
                const translationKey = tabButtonKeys[jsKey];
                btn.querySelector('span').textContent = getTranslatedString(translationKey);
                break;
            }
        }
    });
    
    // Update form titles and button texts in the addEntry tab
    const entryTypeSelect = document.getElementById('unifiedEntryType');
    if (entryTypeSelect) { // Ensures this runs only if the element exists
        const isEditing = !!document.getElementById('editingFirestoreDocId')?.value;
        const entryType = entryTypeSelect.value;
        const formTitleEl = document.getElementById('unifiedEntryFormTitle');
        const submitBtnEl = document.getElementById('submitUnifiedEntryBtn');

        if (formTitleEl) {
            let titleKey = `formTitle_${entryType}Entry`;
            if (isEditing) titleKey = `formTitle_edit${entryType.charAt(0).toUpperCase() + entryType.slice(1)}`;
            formTitleEl.innerHTML = getTranslatedString(titleKey); // Assuming keys have <i> tags
        }
        if (submitBtnEl) {
            let btnKey = `add${entryType.charAt(0).toUpperCase() + entryType.slice(1)}Button`;
            if (isEditing) btnKey = 'updateButton';
            submitBtnEl.innerHTML = getTranslatedString(btnKey); // Assuming keys have <i> tags
        }
    }


    // Re-populate dropdowns that have translatable text
    // Need to ensure these functions exist in the global scope or are passed to i18n.js
    if (typeof populateExpenseCategoryDropdown === "function") {
        populateExpenseCategoryDropdown('expenseCategory');
        populateExpenseCategoryDropdown('reportCategoryFilter', true);
    }
    if (typeof updateSubcategories === "function" && document.getElementById('expenseCategory')) {
         updateSubcategories(document.getElementById('expenseCategory').value, 'expenseSubcategory');
    }
    if (typeof updateReportSubcategoryFilter === "function") {
        updateReportSubcategoryFilter();
    }
    
    // Refresh currently active tab's content if it has dynamic text
    const activeTabId = document.querySelector('.tab-content.active')?.id;
    if(activeTabId) {
        if (activeTabId === 'dashboard' && typeof updateDashboardSummary === "function") updateDashboardSummary();
        else if (activeTabId === 'transactions' && typeof renderAllTransactions === "function") renderAllTransactions();
        else if (activeTabId === 'denaPaona' && typeof renderDenaPaonaTab === "function") renderDenaPaonaTab();
        else if (activeTabId === 'expenseCategoriesView' && typeof renderExpenseCategoriesView === "function") renderExpenseCategoriesView();
        else if (activeTabId === 'expenseReport' && typeof renderExpenseReport === "function") renderExpenseReport();
    }

    // Update clock (if its AM/PM needs translation, though toLocaleTimeString handles locale)
    if (typeof startClock === "function") { // Re-initialize clock to pick up new locale for time formatting
        // Potentially stop existing interval if startClock creates one, then restart
        // For simplicity, just calling it might be okay if it handles multiple calls gracefully.
        startClock();
    }
}

function updateLanguageButtonTextAll() {
    const langBtn = document.getElementById('languageToggleBtn');
    if (langBtn) {
        langBtn.textContent = (currentLocale === 'bn') ? "English" : "বাংলা";
    }
}

// Initialize translations on load
loadTranslations().then(() => {
    setLocale(currentLocale); // Apply initial locale after translations are loaded
});

// Make functions globally accessible if not using modules
window.setLocale = setLocale;
window.getTranslatedString = getTranslatedString;
window.currentLocale = currentLocale; // Expose for direct access if needed, though getTranslatedString is better