import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { firebaseConfig } from './firebase_config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Auth Guard and App Initialization
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in.
        const userDisplayName = document.getElementById('userDisplayName');
        if (userDisplayName) {
            userDisplayName.textContent = user.displayName || user.email;
        }
        // Initialize the main app logic
        initializeAppLogic();
    } else {
        // User is signed out. Redirect to login page.
        window.location.href = 'index.html';
    }
});

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            // Sign-out successful.
            localStorage.removeItem('activeTabAmarHishab'); // Clear active tab on logout
            window.location.href = 'index.html';
        }).catch((error) => {
            // An error happened.
            console.error("Logout Error:", error);
            showNotification("লগআউট করার সময় সমস্যা হয়েছে।", true);
        });
    });
}

function initializeAppLogic() {
    // All the original code from code.js will go here
    document.addEventListener('DOMContentLoaded', () => {
        loadTransactions();
        loadLoans();
        populateExpenseCategoryDropdown('expenseCategory'); // For entry form
        populateExpenseCategoryDropdown('reportCategoryFilter', true); // For report filter (true to add "All")
        loadActiveTab(); 
        renderAllTransactions();
        startClock();

        setDateTimeNow('unifiedDateTime'); 
            
        const currentMonthYear = new Date().toISOString().slice(0, 7);
        const dashboardMonthFilterEl = document.getElementById('dashboardMonthFilter');
        if(dashboardMonthFilterEl) dashboardMonthFilterEl.value = currentMonthYear;
        
        const denaPaonaMonthFilterEl = document.getElementById('denaPaonaMonthFilter');
        if (denaPaonaMonthFilterEl) {
            denaPaonaMonthFilterEl.value = currentMonthYear;
        }
        const reportMonthFilterEl = document.getElementById('reportMonthFilter');
        if (reportMonthFilterEl) { 
            reportMonthFilterEl.value = currentMonthYear;
        }
        
        const unifiedEntryFormEl = document.getElementById('unifiedEntryForm');
        if(unifiedEntryFormEl) unifiedEntryFormEl.addEventListener('submit', handleUnifiedFormSubmit);

        const unifiedEntryTypeEl = document.getElementById('unifiedEntryType');
        if(unifiedEntryTypeEl) unifiedEntryTypeEl.value = 'expense'; 
        
        toggleUnifiedEntryFields(); 

        const calculatorToggleBtnEl = document.getElementById('calculatorToggleBtn');
        if(calculatorToggleBtnEl) calculatorToggleBtnEl.addEventListener('click', toggleCalculatorFS);

        const calculatorCloseBtnFSEl = document.getElementById('calculatorCloseBtnFS');
        if(calculatorCloseBtnFSEl) calculatorCloseBtnFSEl.addEventListener('click', closeCalculatorFS);
        
        document.querySelectorAll('.calc-btn-fs').forEach(button => {
            button.addEventListener('click', handleCalculatorFSInput);
        });
        window.addEventListener('popstate', handleSystemBackButton);

        updateDashboardSummary(); 
        renderDenaPaonaTab(); 
        renderExpenseReport(); 
    });

    let transactions = []; 
    let loans = []; 

    const expenseCategoriesData = { 
        "বাসস্থান": ["বাসা ভাড়া", "বিদ্যুৎ বিল", "গ্যাস বিল", "পানি বিল", "ময়লা পরিষ্কার বিল", "খালার বিল", "ডিফেন্স বিল", "অন্যান্য"],
        "খাদ্য": ["মেসের খাবার", "নিজে রান্না", "বাইরের খাবার", "অন্যান্য"], 
        "যোগাযোগ ও ইন্টারনেট": ["ওয়াই-ফাই বিল", "মোবাইল রিচার্জ", "ডাটা প্যাক", "যাতায়াত খরচ (বাস)", "যাতায়াত খরচ (রিকশা)", "যাতায়াত খরচ (সিএনজি)", "অন্যান্য"], 
        "শিক্ষা সংক্রান্ত খরচ": ["বই", "খাতা", "কলম", "কোচিং ফি", "অন্যান্য"], 
        "পোশাক ও শরীরচর্চা": ["পোশাক", "প্রসাধনী (সাবান, শ্যাম্পু, ইত্যাদি)", "শরীরের যত্ন (ক্রিম, ফেসওয়াশ ইত্যাদি)", "অন্যান্য"],
        "স্বাস্থ্য ও চিকিৎসা": ["ওষুধ", "চিকিৎসা ব্যয়", "অন্যান্য"],
        "ব্যক্তিগত ও বিনোদন খরচ": ["বন্ধুদের সঙ্গে আড্ডা", "ছোটখাটো কেনাকাটা", "বিনোদন", "অন্যান্য"],
        "অপ্রত্যাশিত / জরুরি খরচ": ["জরুরি দরকার", "কিছু মেরামত বা হঠাৎ প্রয়োজন", "অন্যান্য"]
    };

    function populateExpenseCategoryDropdown(selectId, includeAllOption = false) {
        const categorySelect = document.getElementById(selectId);
        if (!categorySelect) return;
        
        let currentValue = (selectId === 'reportCategoryFilter') ? categorySelect.value : null;

        categorySelect.innerHTML = ''; 
        
        if (includeAllOption) {
            const allOption = document.createElement('option');
            allOption.value = "all";
            allOption.textContent = "সকল প্রধান খাত";
            categorySelect.appendChild(allOption);
        } else {
             const placeholderOption = document.createElement('option');
             placeholderOption.value = "";
             placeholderOption.textContent = "-- খাত নির্বাচন করুন --";
             categorySelect.appendChild(placeholderOption);
        }

        for (const category in expenseCategoriesData) {
            if (expenseCategoriesData.hasOwnProperty(category)) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            }
        }
        if (currentValue && categorySelect.querySelector(`option[value="${currentValue}"]`)) {
            categorySelect.value = currentValue;
        } else if (includeAllOption) {
            categorySelect.value = "all"; 
        }
        
        if (selectId === 'reportCategoryFilter') {
            updateReportSubcategoryFilter();
        }
    }


    function setDateTimeNow(elementId) {
        const unifiedDateTimeEl = document.getElementById(elementId);
        if(!unifiedDateTimeEl) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        unifiedDateTimeEl.value = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    window.openTab = function(event, tabName) { // Make it global for inline HTML onclick
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
        if (tabName === 'transactions') renderAllTransactions();
        if (tabName === 'denaPaona') renderDenaPaonaTab(); 
        if (tabName === 'expenseCategoriesView') renderExpenseCategoriesView();
        if (tabName === 'expenseReport') {
            populateExpenseCategoryDropdown('reportCategoryFilter', true); 
            renderExpenseReport();
        }
        
        if (tabName !== 'addEntry') {
          resetUnifiedEntryForm(); 
        }
    }
    function loadActiveTab() { 
        const activeTab = localStorage.getItem('activeTabAmarHishab');
        const defaultTab = 'dashboard';
        const tabToOpen = activeTab || defaultTab;
        openTab(null, tabToOpen); 
        const buttons = document.querySelectorAll('.tab-button'); let foundActive = false;
        buttons.forEach(btn => { btn.classList.remove('active'); if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tabToOpen}'`)) { btn.classList.add('active'); foundActive = true; } });
        if (!foundActive && buttons.length > 0) { const defaultButton = document.querySelector(`.tab-button[onclick*="'${defaultTab}'"]`) || buttons[0]; if (defaultButton) defaultButton.classList.add('active'); }
    }

    window.toggleUnifiedEntryFields = function() { // Make global for onchange
        const unifiedEntryTypeEl = document.getElementById('unifiedEntryType');
        if(!unifiedEntryTypeEl) return;
        const entryType = unifiedEntryTypeEl.value;

        const transactionFields = document.getElementById('transactionSpecificFields');
        const incomeFields = document.getElementById('incomeFields');
        const expenseFields = document.getElementById('expenseFields');
        const loanFields = document.getElementById('loanSpecificFields');
        const formTitle = document.getElementById('unifiedEntryFormTitle');
        const submitButton = document.getElementById('submitUnifiedEntryBtn');
        
        if(!transactionFields || !incomeFields || !expenseFields || !loanFields || !formTitle || !submitButton) return;

        transactionFields.style.display = 'none';
        incomeFields.style.display = 'none';
        expenseFields.style.display = 'none';
        loanFields.style.display = 'none';

        if (entryType === 'income') {
            transactionFields.style.display = 'block';
            incomeFields.style.display = 'block';
            formTitle.innerHTML = '<i class="fas fa-arrow-down"></i> নতুন আয় এন্ট্রি';
            submitButton.innerHTML = '<i class="fas fa-check-circle"></i> আয় যোগ করুন';
        } else if (entryType === 'expense') {
            transactionFields.style.display = 'block';
            expenseFields.style.display = 'block';
            const expenseCategoryEl = document.getElementById('expenseCategory');
            if(expenseCategoryEl) updateSubcategories(expenseCategoryEl.value, 'expenseSubcategory'); 
            formTitle.innerHTML = '<i class="fas fa-arrow-up"></i> নতুন ব্যয় এন্ট্রি';
            submitButton.innerHTML = '<i class="fas fa-check-circle"></i> ব্যয় যোগ করুন';
        } else if (entryType === 'loan') {
            loanFields.style.display = 'block';
            formTitle.innerHTML = '<i class="fas fa-hand-holding-usd"></i> নতুন দেনা/পাওনা এন্ট্রি';
            submitButton.innerHTML = '<i class="fas fa-save"></i> দেনা/পাওনা যোগ করুন';
        }
        const editingIdEl = document.getElementById('editingUnifiedEntryId');
        const editingClassEl = document.getElementById('editingUnifiedEntryClass');
        if(!editingIdEl || !editingClassEl) return;

        const editingId = editingIdEl.value;
        const editingClass = editingClassEl.value;


        if (editingId) {
            if (editingClass === 'transaction' && (entryType === 'income' || entryType === 'expense')) {
                // Allow switching
            } else if (editingClass === 'loan' && entryType === 'loan') {
                // Allow staying
            } else {
                resetUnifiedEntryForm();
            }
        }
    }


    window.updateSubcategories = function(selectedCategoryValue, subCategorySelectId) { // Make global
        const subcategorySelect = document.getElementById(subCategorySelectId);
        if (!subcategorySelect) { return; }
        
        subcategorySelect.innerHTML = ''; 
        
        const placeholderOption = document.createElement('option');
        placeholderOption.value = (subCategorySelectId === 'reportSubcategoryFilter') ? "all" : "";
        placeholderOption.textContent = (subCategorySelectId === 'reportSubcategoryFilter') ? "সকল উপখাত" : "-- উপখাত নির্বাচন করুন --";
        subcategorySelect.appendChild(placeholderOption);
        
        if (selectedCategoryValue && expenseCategoriesData[selectedCategoryValue]) { 
            expenseCategoriesData[selectedCategoryValue].forEach(subcat => { 
                const option = document.createElement('option'); 
                option.value = subcat; 
                option.textContent = subcat; 
                subcategorySelect.appendChild(option); 
            }); 
            subcategorySelect.disabled = false; 
        } else { 
            subcategorySelect.disabled = true; 
            if (subCategorySelectId === 'reportSubcategoryFilter') { 
                subcategorySelect.disabled = false;
            }
        }
    }


    function handleUnifiedFormSubmit(e) {
        e.preventDefault();
        const entryType = document.getElementById('unifiedEntryType').value;
        const editingId = document.getElementById('editingUnifiedEntryId').value;
        const editingClass = document.getElementById('editingUnifiedEntryClass').value;

        if (editingId) {
            if (editingClass === 'transaction' && (entryType === 'income' || entryType === 'expense')) {
                updateUnifiedTransaction(editingId);
            } else if (editingClass === 'loan' && entryType === 'loan') {
                updateUnifiedLoan(editingId);
            } else {
                showNotification("এন্ট্রির ধরণ পরিবর্তন করে এডিট করা যাবে না। অনুগ্রহ করে এডিট বাতিল করে নতুন এন্ট্রি করুন।", true);
            }
        } else { 
            if (entryType === 'income' || entryType === 'expense') {
                addUnifiedTransaction();
            } else if (entryType === 'loan') {
                addUnifiedLoan();
            }
        }
    }

    function addUnifiedTransaction() {
        const entryType = document.getElementById('unifiedEntryType').value; 
        const amount = parseFloat(document.getElementById('unifiedAmount').value);
        const dateTimeValue = document.getElementById('unifiedDateTime').value;
        const notes = document.getElementById('unifiedNotes').value.trim();

        if (isNaN(amount) || amount <= 0) { showNotification("সঠিক পরিমাণ লিখুন।", true); return; }
        if (!dateTimeValue) { showNotification("তারিখ ও সময় নির্বাচন করুন।", true); return; }
        
        const entryDateTime = new Date(dateTimeValue);
        let entryDetails = { amount, dateTime: entryDateTime.toISOString(), notes, id: Date.now(), type: entryType };

        if (entryType === 'income') {
            const source = document.getElementById('incomeSource').value.trim();
            if (!source) { showNotification("আয়ের উৎস লিখুন।", true); return; }
            entryDetails.source = source;
        } else { 
            const category = document.getElementById('expenseCategory').value;
            const subcategory = document.getElementById('expenseSubcategory').value;
            if (!category) { showNotification("খরচের প্রধান খাত নির্বাচন করুন।", true); return; }
            entryDetails.category = category;
            entryDetails.subcategory = subcategory; 
        }
        transactions.push(entryDetails);
        saveTransactions();
        finalizeUnifiedFormSubmission(`${entryType === 'income' ? 'আয়' : 'ব্যয়'} সফলভাবে যোগ করা হয়েছে!`, 'transactions');
    }

    function addUnifiedLoan() {
        const loanType = document.getElementById('loanType').value; 
        const personName = document.getElementById('personName').value.trim();
        const amount = parseFloat(document.getElementById('unifiedAmount').value);
        const dateTimeValue = document.getElementById('unifiedDateTime').value;
        const notes = document.getElementById('unifiedNotes').value.trim();

        if (!personName) { showNotification("ব্যক্তির নাম লিখুন।", true); return; }
        if (isNaN(amount) || amount <= 0) { showNotification("সঠিক পরিমাণ লিখুন।", true); return; }
        if (!dateTimeValue) { showNotification("তারিখ ও সময় নির্বাচন করুন।", true); return; }

        const loanDateTime = new Date(dateTimeValue);
        const loanEntry = { 
            type: loanType, 
            personName, 
            amount, 
            dateTime: loanDateTime.toISOString(), 
            notes, 
            id: Date.now(),
            entryClass: 'loan' 
        };
        loans.push(loanEntry);
        saveLoans();
        finalizeUnifiedFormSubmission(`"${loanType === 'lent' ? 'পাওনা' : 'দেনা'}" সফলভাবে যোগ করা হয়েছে!`, 'denaPaona');
    }

    function finalizeUnifiedFormSubmission(message, targetTab) {
        updateDashboardSummary();
        if (targetTab === 'transactions') renderAllTransactions();
        else if (targetTab === 'denaPaona') renderDenaPaonaTab();
        renderExpenseReport(); 
        
        showNotification(message);
        resetUnifiedEntryForm(); 
        setTimeout(() => openTab(null, targetTab), 1500);
    }

    function resetUnifiedEntryForm() {
        const unifiedEntryFormEl = document.getElementById('unifiedEntryForm');
        if(unifiedEntryFormEl) unifiedEntryFormEl.reset();
        
        setDateTimeNow('unifiedDateTime');
        
        const unifiedEntryTypeEl = document.getElementById('unifiedEntryType');
        if(unifiedEntryTypeEl) unifiedEntryTypeEl.value = 'expense'; 
        
        toggleUnifiedEntryFields(); 

        const editingIdEl = document.getElementById('editingUnifiedEntryId');
        if(editingIdEl) editingIdEl.value = '';

        const editingClassEl = document.getElementById('editingUnifiedEntryClass');
        if(editingClassEl) editingClassEl.value = '';
        
        updateSubcategories("", 'expenseSubcategory'); 
    }

    function formatDateTime(isoString, includeSeconds = true) { const date = new Date(isoString); const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' }; const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true }; if (includeSeconds) timeOptions.second = '2-digit'; const formattedDate = date.toLocaleDateString('en-GB', dateOptions); let formattedTime = date.toLocaleTimeString('en-US', timeOptions); return `${formattedDate}, ${formattedTime}`; }

    function renderAllTransactions() { 
        const listElement = document.getElementById('allTransactionsList'); 
        if(!listElement) return;

        const filterType = document.getElementById('transactionFilter').value; 
        const monthFilter = document.getElementById('monthFilter').value; 
        const textFilterEl = document.getElementById('textSearchFilter');
        const textFilter = textFilterEl ? textFilterEl.value.toLowerCase() : ""; 
        
        listElement.innerHTML = ''; 
        
        const filteredIncomeExpenses = transactions.filter(t => { 
            const transactionMonth = t.dateTime.slice(0, 7); 
            const typeMatch = (filterType === 'all' || t.type === filterType); 
            const monthMatch = (!monthFilter || transactionMonth === monthFilter); 
            let textContent = `${t.notes} ${t.amount}`; 
            if (t.type === 'income') textContent += ` ${t.source}`; 
            else textContent += ` ${t.category} ${t.subcategory}`; 
            const textSearchMatch = (!textFilter || textContent.toLowerCase().includes(textFilter)); 
            return typeMatch && monthMatch && textSearchMatch; 
        }).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)); 
        
        if (filteredIncomeExpenses.length === 0) { 
            listElement.innerHTML = '<p><i class="fas fa-info-circle"></i> এই ফিল্টারে কোনো লেনদেন নেই।</p>'; return; 
        } 
        filteredIncomeExpenses.forEach(t => { listElement.appendChild(createTransactionItemElement(t, 'transactions')); }); 
    }

    function createTransactionItemElement(t, context) {
        const item = document.createElement('div'); 
        item.classList.add('transaction-item', t.type); 
        if (context === 'dashboard') item.classList.add('compact-item');
        
        let description = t.type === 'income' ? `উৎস: ${t.source}` : `খাত: ${t.category} ${t.subcategory ? `(${t.subcategory})` : ''}`; 
        let iconClass = t.type === 'income' ? 'fas fa-arrow-down' : 'fas fa-arrow-up'; 
        
        let itemHTML = `<div class="transaction-details"><p><i class="${iconClass}" style="color:${t.type === 'income' ? '#28a745' : '#dc3545'};"></i> ${t.type === 'income' ? 'আয়' : 'ব্যয়'}</p><p class="datetime-display"><i class="far fa-clock"></i> ${formatDateTime(t.dateTime, context !== 'dashboard')}</p><p>${description}</p>${t.notes && context !== 'dashboard' ? `<p class="transaction-notes"><i class="far fa-comment-alt"></i> ${t.notes}</p>` : ''}</div><div class="item-actions"><p class="amount-display" style="color:${t.type === 'income' ? '#28a745' : '#dc3545'};">৳ ${t.amount.toFixed(2)}</p>`;
        
        if (context !== 'dashboard') {
            itemHTML += `<div class="action-buttons"><button class="edit-btn" onclick="editUnifiedEntry(${t.id}, 'transaction')" title="এডিট"><i class="fas fa-edit"></i></button><button class="delete-btn" onclick="deleteTransaction(${t.id})" title="মুছুন"><i class="fas fa-trash-alt"></i></button></div>`;
        }
        itemHTML += `</div>`;
        item.innerHTML = itemHTML;
        return item; 
    }


    window.filterTransactions = renderAllTransactions; // Make global
    window.deleteTransaction = function(id) { // Make global
        if (confirm("আপনি কি এই লেনদেনটি মুছে ফেলতে চান?")) { 
            transactions = transactions.filter(t => t.id !== id); 
            saveTransactions(); 
            renderAllTransactions(); 
            updateDashboardSummary(); 
            renderExpenseReport(); 
            showNotification("লেনদেন সফলভাবে মুছে ফেলা হয়েছে।"); 
        } 
    }

    window.renderDenaPaonaTab = function() { // Make global
        const denaPaonaMonthFilterEl = document.getElementById('denaPaonaMonthFilter');
        const denaPaonaStartDateFilterEl = document.getElementById('denaPaonaStartDateFilter');
        const denaPaonaEndDateFilterEl = document.getElementById('denaPaonaEndDateFilter');
        const denaPaonaTypeFilterEl = document.getElementById('denaPaonaTypeFilter');

        const monthFilterValue = denaPaonaMonthFilterEl ? denaPaonaMonthFilterEl.value : null;
        const startDateFilterValue = denaPaonaStartDateFilterEl ? denaPaonaStartDateFilterEl.value : null;
        const endDateFilterValue = denaPaonaEndDateFilterEl ? denaPaonaEndDateFilterEl.value : null;
        const typeFilterValue = denaPaonaTypeFilterEl ? denaPaonaTypeFilterEl.value : 'all';
        
        const listContainer = document.getElementById('denaPaonaListContainer');
        const summaryPeriodTextEl = document.getElementById('denaPaonaSummaryPeriodText');

        if (!listContainer || !summaryPeriodTextEl) return; 

        listContainer.innerHTML = '';
        let filteredLoans = [...loans]; 
        let periodText = "সকল সময়";

        if (startDateFilterValue && endDateFilterValue) {
            const start = new Date(startDateFilterValue); start.setHours(0,0,0,0);
            const end = new Date(endDateFilterValue); end.setHours(23,59,59,999);
            if (start <= end) {
                filteredLoans = filteredLoans.filter(l => { const loanDate = new Date(l.dateTime); return loanDate >= start && loanDate <= end; });
                periodText = `${formatDateForDisplay(startDateFilterValue)} থেকে ${formatDateForDisplay(endDateFilterValue)}`;
                if(denaPaonaMonthFilterEl) denaPaonaMonthFilterEl.value = ''; 
            } else {
                showNotification("শুরুর তারিখ শেষের তারিখের পরে হতে পারে না।", true);
                if(denaPaonaStartDateFilterEl) denaPaonaStartDateFilterEl.value = '';
                if(denaPaonaEndDateFilterEl) denaPaonaEndDateFilterEl.value = '';
                const currentMonthDefault = new Date().toISOString().slice(0, 7);
                if(denaPaonaMonthFilterEl) denaPaonaMonthFilterEl.value = currentMonthDefault;
                filteredLoans = loans.filter(l => l.dateTime.startsWith(currentMonthDefault));
                periodText = new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
            }
        } else if (monthFilterValue) {
            filteredLoans = filteredLoans.filter(l => l.dateTime.startsWith(monthFilterValue));
            const [year, month] = monthFilterValue.split('-');
            const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            periodText = monthDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
            if(denaPaonaStartDateFilterEl) denaPaonaStartDateFilterEl.value = ''; 
            if(denaPaonaEndDateFilterEl) denaPaonaEndDateFilterEl.value = '';
        } else {
            const currentMonthDefault = new Date().toISOString().slice(0, 7);
             if (denaPaonaMonthFilterEl && !denaPaonaMonthFilterEl.value && !startDateFilterValue && !endDateFilterValue) { 
                denaPaonaMonthFilterEl.value = currentMonthDefault;
                filteredLoans = filteredLoans.filter(l => l.dateTime.startsWith(currentMonthDefault));
                const monthDate = new Date();
                periodText = monthDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
            }
        }

        if (typeFilterValue !== 'all') {
            filteredLoans = filteredLoans.filter(l => l.type === typeFilterValue);
        }
        
        summaryPeriodTextEl.textContent = periodText;

        const totalLentFiltered = filteredLoans.filter(l => l.type === 'lent').reduce((sum, l) => sum + l.amount, 0);
        const totalBorrowedFiltered = filteredLoans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + l.amount, 0);
        const netBalanceFiltered = totalLentFiltered - totalBorrowedFiltered;
        
        const totalLentDisplayEl = document.getElementById('denaPaonaTotalLentDisplay');
        const totalBorrowedDisplayEl = document.getElementById('denaPaonaTotalBorrowedDisplay');
        const netBalanceDisplayEl = document.getElementById('denaPaonaNetBalanceDisplay');

        if(totalLentDisplayEl) totalLentDisplayEl.textContent = `৳ ${totalLentFiltered.toFixed(2)}`;
        if(totalBorrowedDisplayEl) totalBorrowedDisplayEl.textContent = `৳ ${totalBorrowedFiltered.toFixed(2)}`;
        if(netBalanceDisplayEl) {
            netBalanceDisplayEl.textContent = `৳ ${netBalanceFiltered.toFixed(2)}`;
            netBalanceDisplayEl.style.color = netBalanceFiltered >= 0 ? '#28a745' : '#dc3545';
        }


        filteredLoans.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        if (filteredLoans.length === 0) {
            listContainer.innerHTML = '<p><i class="fas fa-info-circle"></i> এই ফিল্টারে কোনো দেনা-পাওনা নেই।</p>';
        } else {
            filteredLoans.forEach(l => listContainer.appendChild(createLoanItemElement(l, 'denaPaona')));
        }
    }

    window.resetDenaPaonaFilters = function() { // Make global
        const denaPaonaMonthFilterEl = document.getElementById('denaPaonaMonthFilter');
        if(denaPaonaMonthFilterEl) denaPaonaMonthFilterEl.value = new Date().toISOString().slice(0, 7);
        
        const denaPaonaStartDateFilterEl = document.getElementById('denaPaonaStartDateFilter');
        if(denaPaonaStartDateFilterEl) denaPaonaStartDateFilterEl.value = '';
        
        const denaPaonaEndDateFilterEl = document.getElementById('denaPaonaEndDateFilter');
        if(denaPaonaEndDateFilterEl) denaPaonaEndDateFilterEl.value = '';
        
        const denaPaonaTypeFilterEl = document.getElementById('denaPaonaTypeFilter');
        if(denaPaonaTypeFilterEl) denaPaonaTypeFilterEl.value = 'all';
        
        renderDenaPaonaTab();
    }

    function createLoanItemElement(loan, context) {
        const item = document.createElement('div'); 
        item.classList.add('loan-item', loan.type); 
        if (context === 'dashboard') item.classList.add('compact-item');

        const iconClass = loan.type === 'lent' ? 'fas fa-arrow-right' : 'fas fa-arrow-left'; 
        const color = loan.type === 'lent' ? '#ffc107' : '#17a2b8'; 
        const typeText = loan.type === 'lent' ? 'পাওনা' : 'দেনা';
        
        let itemHTML = `<div class="loan-details"><p><i class="${iconClass}" style="color:${color};"></i> ${loan.personName}</p><p class="datetime-display"><i class="far fa-clock"></i> ${formatDateTime(loan.dateTime, context !== 'dashboard')}</p><p>${typeText}</p>${loan.notes && context !== 'dashboard' ? `<p class="loan-notes"><i class="far fa-comment-alt"></i> ${loan.notes}</p>` : ''}</div><div class="item-actions"><p class="amount-display" style="color:${color};">৳ ${loan.amount.toFixed(2)}</p>`;
        
        if (context !== 'dashboard') { 
            itemHTML += `<div class="action-buttons"><button class="edit-btn" onclick="editUnifiedEntry(${loan.id}, 'loan')" title="এডিট"><i class="fas fa-edit"></i></button><button class="delete-btn" onclick="deleteLoan(${loan.id})" title="মুছুন"><i class="fas fa-trash-alt"></i></button></div>`;
        }
        itemHTML += `</div>`;
        item.innerHTML = itemHTML;
        return item; 
    }

    window.deleteLoan = function(id) { // Make global
        if (confirm("আপনি কি এই দেনা/পাওনা এন্ট্রিটি মুছে ফেলতে চান?")) { 
            loans = loans.filter(l => l.id !== id); 
            saveLoans(); 
            renderDenaPaonaTab(); 
            updateDashboardSummary(); 
            showNotification("দেনা/পাওনা এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে।"); 
        } 
    }

    window.updateDashboardSummary = function() { // Make global
        const dashboardMonthFilterEl = document.getElementById('dashboardMonthFilter');
        const dashboardStartDateFilterEl = document.getElementById('dashboardStartDateFilter');
        const dashboardEndDateFilterEl = document.getElementById('dashboardEndDateFilter');
        const summaryPeriodTextEl = document.getElementById('summaryPeriodText');

        if(!dashboardMonthFilterEl || !dashboardStartDateFilterEl || !dashboardEndDateFilterEl || !summaryPeriodTextEl) return;

        const monthFilterValue = dashboardMonthFilterEl.value; 
        const startDateFilterValue = dashboardStartDateFilterEl.value; 
        const endDateFilterValue = dashboardEndDateFilterEl.value; 
        
        let filteredTransactionsForDashboard = [...transactions]; 
        let periodText = "সকল সময়";

        if (startDateFilterValue && endDateFilterValue) {
            const start = new Date(startDateFilterValue); start.setHours(0,0,0,0); 
            const end = new Date(endDateFilterValue); end.setHours(23,59,59,999); 
            if (start <= end) {
                filteredTransactionsForDashboard = transactions.filter(t => { const transactionDate = new Date(t.dateTime); return transactionDate >= start && transactionDate <= end; });
                periodText = `${formatDateForDisplay(startDateFilterValue)} থেকে ${formatDateForDisplay(endDateFilterValue)}`;
                dashboardMonthFilterEl.value = ''; 
            } else {
                showNotification("শুরুর তারিখ শেষের তারিখের পরে হতে পারে না। ফিল্টার রিসেট করা হচ্ছে।", true);
                resetDashboardFilters(); 
                return; 
            }
        } else if (monthFilterValue) {
            filteredTransactionsForDashboard = transactions.filter(t => t.dateTime.startsWith(monthFilterValue));
            const [year, month] = monthFilterValue.split('-');
            const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            periodText = monthDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
            dashboardStartDateFilterEl.value = ''; 
            dashboardEndDateFilterEl.value = '';
        } else { 
            const currentMonthDefault = new Date().toISOString().slice(0, 7);
            dashboardMonthFilterEl.value = currentMonthDefault; 
            filteredTransactionsForDashboard = transactions.filter(t => t.dateTime.startsWith(currentMonthDefault));
            const [year, month] = currentMonthDefault.split('-');
            periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
        }

        summaryPeriodTextEl.textContent = periodText;
        const totalIncome = filteredTransactionsForDashboard.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = filteredTransactionsForDashboard.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = totalIncome - totalExpense; 
        
        const totalIncomeDisplayEl = document.getElementById('totalIncomeDisplay');
        if(totalIncomeDisplayEl) totalIncomeDisplayEl.textContent = `৳ ${totalIncome.toFixed(2)}`;
        
        const totalExpenseDisplayEl = document.getElementById('totalExpenseDisplay');
        if(totalExpenseDisplayEl) totalExpenseDisplayEl.textContent = `৳ ${totalExpense.toFixed(2)}`;
        
        const currentBalanceDisplayEl = document.getElementById('currentBalanceDisplay');
        if(currentBalanceDisplayEl) currentBalanceDisplayEl.textContent = `৳ ${currentBalance.toFixed(2)}`;
        
        const totalLentAllTime = loans.filter(l => l.type === 'lent').reduce((sum, l) => sum + l.amount, 0);
        const totalBorrowedAllTime = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + l.amount, 0);
        const netLoanBalanceAllTime = totalLentAllTime - totalBorrowedAllTime;
        
        const totalLentDisplayEl = document.getElementById('totalLentDisplay');
        if(totalLentDisplayEl) totalLentDisplayEl.textContent = `৳ ${totalLentAllTime.toFixed(2)}`;
        
        const totalBorrowedDisplayEl = document.getElementById('totalBorrowedDisplay');
        if(totalBorrowedDisplayEl) totalBorrowedDisplayEl.textContent = `৳ ${totalBorrowedAllTime.toFixed(2)}`;

        const netLoanBalanceDisplayEl = document.getElementById('netLoanBalanceDisplay');
        if(netLoanBalanceDisplayEl) {
            netLoanBalanceDisplayEl.textContent = `৳ ${netLoanBalanceAllTime.toFixed(2)}`;
            netLoanBalanceDisplayEl.style.color = netLoanBalanceAllTime >= 0 ? '#28a745' : '#dc3545';
        }
        

        const finalBalanceAfterLoans = currentBalance + netLoanBalanceAllTime; 
        const finalBalanceDisplayElement = document.getElementById('finalBalanceAfterLoansDisplay');
        if(finalBalanceDisplayElement) {
            finalBalanceDisplayElement.textContent = `৳ ${finalBalanceAfterLoans.toFixed(2)}`;
            finalBalanceDisplayElement.style.color = finalBalanceAfterLoans >= 0 ? '#20c997' : '#dc3545';
        }

        updateLatestTransactionsDisplay(); 
    }
    function formatDateForDisplay(dateString) { if (!dateString) return ''; const date = new Date(dateString); return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });}
    
    window.resetDashboardFilters = function() { // Make global
        const dashboardMonthFilterEl = document.getElementById('dashboardMonthFilter');
        if(dashboardMonthFilterEl) dashboardMonthFilterEl.value = new Date().toISOString().slice(0, 7); 
        
        const dashboardStartDateFilterEl = document.getElementById('dashboardStartDateFilter');
        if(dashboardStartDateFilterEl) dashboardStartDateFilterEl.value = ''; 
        
        const dashboardEndDateFilterEl = document.getElementById('dashboardEndDateFilter');
        if(dashboardEndDateFilterEl) dashboardEndDateFilterEl.value = ''; 
        
        updateDashboardSummary(); 
    }

    function updateLatestTransactionsDisplay() { 
        const latestTransactionsList = document.getElementById('latestTwoTransactions');
        if(!latestTransactionsList) return;
        latestTransactionsList.innerHTML = '';
        const combinedEntries = [
            ...transactions.map(t => ({ ...t, entryClass: 'transaction' })),
            ...loans.map(l => ({ ...l, entryClass: 'loan' }))
        ].sort((a,b) => new Date(b.dateTime) - new Date(a.dateTime));
        
        const latestTwo = combinedEntries.slice(0, 2);

        if (latestTwo.length === 0) { 
            latestTransactionsList.innerHTML = '<p><i class="fas fa-info-circle"></i> কোনো সাম্প্রতিক লেনদেন নেই।</p>'; 
        } else { 
            latestTwo.forEach(entry => { 
                let item;
                if (entry.entryClass === 'transaction') {
                    item = createTransactionItemElement(entry, 'dashboard');
                } else { 
                    item = createLoanItemElement(entry, 'dashboard');
                }
                latestTransactionsList.appendChild(item); 
            }); 
        }
    }

    window.editUnifiedEntry = function(id, entryClass) { // Make global
        openTab(null, 'addEntry');
        const editingIdEl = document.getElementById('editingUnifiedEntryId');
        if(editingIdEl) editingIdEl.value = id;

        const editingClassEl = document.getElementById('editingUnifiedEntryClass');
        if(editingClassEl) editingClassEl.value = entryClass;
        
        const submitButton = document.getElementById('submitUnifiedEntryBtn');
        if(submitButton) submitButton.innerHTML = '<i class="fas fa-sync-alt"></i> আপডেট করুন';

        if (entryClass === 'transaction') {
            const transaction = transactions.find(t => t.id === id);
            if (!transaction) return;
            document.getElementById('unifiedEntryType').value = transaction.type;
            toggleUnifiedEntryFields(); 

            if (transaction.type === 'income') {
                document.getElementById('incomeSource').value = transaction.source;
            } else { 
                document.getElementById('expenseCategory').value = transaction.category;
                updateSubcategories(transaction.category, 'expenseSubcategory'); 
                document.getElementById('expenseSubcategory').value = transaction.subcategory || "";
            }
            document.getElementById('unifiedAmount').value = transaction.amount;
            setDateTimeForInput('unifiedDateTime', transaction.dateTime);
            document.getElementById('unifiedNotes').value = transaction.notes;

        } else if (entryClass === 'loan') {
            const loan = loans.find(l => l.id === id);
            if (!loan) return;
            document.getElementById('unifiedEntryType').value = 'loan';
            toggleUnifiedEntryFields(); 

            document.getElementById('loanType').value = loan.type;
            document.getElementById('personName').value = loan.personName;
            document.getElementById('unifiedAmount').value = loan.amount;
            setDateTimeForInput('unifiedDateTime', loan.dateTime);
            document.getElementById('unifiedNotes').value = loan.notes;
        }
    }

    function setDateTimeForInput(elementId, isoString) {
        const el = document.getElementById(elementId);
        if(!el) return;
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        el.value = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }


    function updateUnifiedTransaction(id) {
        const sId = parseInt(id);
        if (!confirm("আপনি কি সত্যিই এই লেনদেনটি এডিট করতে চান?")) { resetUnifiedEntryForm(); openTab(null, 'transactions'); return; }
        const index = transactions.findIndex(t => t.id === sId);
        if (index === -1) { showNotification("এডিট করার জন্য লেনদেন খুঁজে পাওয়া যায়নি!", true); resetUnifiedEntryForm(); return; }

        const entryType = document.getElementById('unifiedEntryType').value;
        const amount = parseFloat(document.getElementById('unifiedAmount').value);
        const dateTimeValue = document.getElementById('unifiedDateTime').value;
        const notes = document.getElementById('unifiedNotes').value.trim();

        if (isNaN(amount) || amount <= 0) { showNotification("সঠিক পরিমাণ লিখুন।", true); return; }
        
        const entryDateTime = new Date(dateTimeValue);
        transactions[index].type = entryType;
        transactions[index].amount = amount;
        transactions[index].dateTime = entryDateTime.toISOString();
        transactions[index].notes = notes;

        if (entryType === 'income') {
            transactions[index].source = document.getElementById('incomeSource').value.trim();
            if (!transactions[index].source) { showNotification("আয়ের উৎস লিখুন।", true); return; }
            delete transactions[index].category; delete transactions[index].subcategory;
        } else { 
            transactions[index].category = document.getElementById('expenseCategory').value;
            transactions[index].subcategory = document.getElementById('expenseSubcategory').value;
            if (!transactions[index].category) { showNotification("খরচের প্রধান খাত নির্বাচন করুন।", true); return; }
            delete transactions[index].source;
        }
        saveTransactions();
        finalizeUnifiedFormSubmission("লেনদেন সফলভাবে আপডেট করা হয়েছে!", 'transactions');
    }

    function updateUnifiedLoan(id) {
        const sId = parseInt(id);
        if (!confirm("আপনি কি সত্যিই এই দেনা/পাওনা এন্ট্রিটি এডিট করতে চান?")) { resetUnifiedEntryForm(); openTab(null, 'denaPaona'); return; }
        const index = loans.findIndex(l => l.id === sId);
        if (index === -1) { showNotification("এডিট করার জন্য দেনা/পাওনা খুঁজে পাওয়া যায়নি!", true); resetUnifiedEntryForm(); return; }

        loans[index].type = document.getElementById('loanType').value;
        loans[index].personName = document.getElementById('personName').value.trim();
        if (!loans[index].personName) { showNotification("ব্যক্তির নাম লিখুন।", true); return; }
        loans[index].amount = parseFloat(document.getElementById('unifiedAmount').value);
        if (isNaN(loans[index].amount) || loans[index].amount <= 0) { showNotification("সঠিক পরিমাণ লিখুন।", true); return; }
        
        const loanDateTimeValue = document.getElementById('unifiedDateTime').value;
        const loanDateTime = new Date(loanDateTimeValue);
        loans[index].dateTime = loanDateTime.toISOString();
        loans[index].notes = document.getElementById('unifiedNotes').value.trim();
        
        saveLoans();
        finalizeUnifiedFormSubmission("দেনা/পাওনা সফলভাবে আপডেট করা হয়েছে!", 'denaPaona');
    }


    window.renderExpenseReport = function() { // Make global
        const reportContainer = document.getElementById('expenseReportContainer');
        const reportMonthFilterEl = document.getElementById('reportMonthFilter');
        const reportStartDateFilterEl = document.getElementById('reportStartDateFilter');
        const reportEndDateFilterEl = document.getElementById('reportEndDateFilter');
        const reportCategoryFilterEl = document.getElementById('reportCategoryFilter');
        const reportSubcategoryFilterEl = document.getElementById('reportSubcategoryFilter');
        const summaryPeriodTextEl = document.getElementById('reportSummaryPeriodText');
        const grandTotalAmountEl = document.getElementById('reportGrandTotalAmount');

        if (!reportContainer || !summaryPeriodTextEl || !grandTotalAmountEl || !reportMonthFilterEl || !reportStartDateFilterEl || !reportEndDateFilterEl || !reportCategoryFilterEl || !reportSubcategoryFilterEl) return;
        
        const monthFilter = reportMonthFilterEl.value;
        const startDateFilter = reportStartDateFilterEl.value;
        const endDateFilter = reportEndDateFilterEl.value;
        const categoryFilter = reportCategoryFilterEl.value;
        const subcategoryFilter = reportSubcategoryFilterEl.value;


        reportContainer.innerHTML = '';
        let periodText = "সকল সময়";
        let filteredExpenses = transactions.filter(t => t.type === 'expense');

        if (startDateFilter && endDateFilter) {
            const start = new Date(startDateFilter); start.setHours(0,0,0,0);
            const end = new Date(endDateFilter); end.setHours(23,59,59,999);
            if (start <= end) {
                filteredExpenses = filteredExpenses.filter(t => { const txDate = new Date(t.dateTime); return txDate >= start && txDate <= end; });
                periodText = `${formatDateForDisplay(startDateFilter)} থেকে ${formatDateForDisplay(endDateFilter)}`;
                reportMonthFilterEl.value = '';
            } else {
                showNotification("শুরুর তারিখ শেষের তারিখের পরে হতে পারে না।", true);
                reportStartDateFilterEl.value = '';
                reportEndDateFilterEl.value = '';
                const currentMonthDefault = new Date().toISOString().slice(0, 7);
                reportMonthFilterEl.value = currentMonthDefault;
                filteredExpenses = transactions.filter(t => t.type === 'expense' && t.dateTime.startsWith(currentMonthDefault));
                periodText = new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
            }
        } else if (monthFilter) {
            filteredExpenses = filteredExpenses.filter(t => t.dateTime.startsWith(monthFilter));
            const [year, month] = monthFilter.split('-');
            periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
            reportStartDateFilterEl.value = '';
            reportEndDateFilterEl.value = '';
        } else {
             const currentMonthDefault = new Date().toISOString().slice(0, 7);
            if (!reportMonthFilterEl.value ) {
                 reportMonthFilterEl.value = currentMonthDefault;
            }
            filteredExpenses = filteredExpenses.filter(t => t.dateTime.startsWith(reportMonthFilterEl.value || currentMonthDefault));
            const [year, month] = (reportMonthFilterEl.value || currentMonthDefault).split('-');
            periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
        }
        summaryPeriodTextEl.textContent = periodText;

        if (categoryFilter !== 'all') {
            filteredExpenses = filteredExpenses.filter(expense => expense.category === categoryFilter);
            if (subcategoryFilter !== 'all') {
                filteredExpenses = filteredExpenses.filter(expense => expense.subcategory === subcategoryFilter);
            }
        }


        if (filteredExpenses.length === 0) {
            reportContainer.innerHTML = '<p><i class="fas fa-info-circle"></i> এই ফিল্টারে কোনো খরচ নেই।</p>';
            grandTotalAmountEl.textContent = '৳ ০.০০';
            return;
        }

        const expensesByMainCategory = {};
        filteredExpenses.forEach(expense => {
            if (!expensesByMainCategory[expense.category]) {
                expensesByMainCategory[expense.category] = {};
            }
            const subcat = expense.subcategory || 'অন্যান্য (খাতবিহীন)';
            if (!expensesByMainCategory[expense.category][subcat]) {
                expensesByMainCategory[expense.category][subcat] = 0;
            }
            expensesByMainCategory[expense.category][subcat] += expense.amount;
        });

        let grandTotal = 0;
        for (const mainCategory in expensesByMainCategory) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'report-category-group';
            
            let categoryTotal = 0;
            const subcategoryList = document.createElement('ul');
            subcategoryList.className = 'report-subcategory-list';

            for (const subcategory in expensesByMainCategory[mainCategory]) {
                const amount = expensesByMainCategory[mainCategory][subcategory];
                categoryTotal += amount;
                const listItem = document.createElement('li');
                listItem.className = 'report-subcategory-item';
                listItem.innerHTML = `<span class="subcategory-name">${subcategory}</span> <span class="subcategory-amount">৳ ${amount.toFixed(2)}</span>`;
                subcategoryList.appendChild(listItem);
            }
            grandTotal += categoryTotal;

            const headerDiv = document.createElement('div');
            headerDiv.className = 'report-category-header';
            headerDiv.innerHTML = `<span><i class="fas fa-folder"></i> ${mainCategory}</span> <span class="category-total">মোট: ৳ ${categoryTotal.toFixed(2)}</span>`;
            
            groupDiv.appendChild(headerDiv);
            groupDiv.appendChild(subcategoryList);
            reportContainer.appendChild(groupDiv);
        }
        grandTotalAmountEl.textContent = `৳ ${grandTotal.toFixed(2)}`;
    }

    window.updateReportSubcategoryFilter = function() { // Make global
        const categoryFilterEl = document.getElementById('reportCategoryFilter');
        if(!categoryFilterEl) return;
        const categoryFilterValue = categoryFilterEl.value;
        updateSubcategories(categoryFilterValue, 'reportSubcategoryFilter');
    }

    window.resetExpenseReportFilters = function() { // Make global
        const reportMonthFilterEl = document.getElementById('reportMonthFilter');
        if(reportMonthFilterEl) reportMonthFilterEl.value = new Date().toISOString().slice(0, 7);
        
        const reportStartDateFilterEl = document.getElementById('reportStartDateFilter');
        if(reportStartDateFilterEl) reportStartDateFilterEl.value = '';

        const reportEndDateFilterEl = document.getElementById('reportEndDateFilter');
        if(reportEndDateFilterEl) reportEndDateFilterEl.value = '';
        
        const reportCategoryFilterEl = document.getElementById('reportCategoryFilter');
        if(reportCategoryFilterEl) reportCategoryFilterEl.value = 'all';
        
        updateReportSubcategoryFilter(); 
        
        const reportSubcategoryFilterEl = document.getElementById('reportSubcategoryFilter');
        if(reportSubcategoryFilterEl) reportSubcategoryFilterEl.value = 'all';
        
        renderExpenseReport();
    }

    function saveTransactions() { 
        const user = auth.currentUser;
        if (user) {
            localStorage.setItem(`amarHishabTransactions_${user.uid}_v12`, JSON.stringify(transactions)); 
        }
    } 
    function loadTransactions() { 
        const user = auth.currentUser;
        if (user) {
            const stored = localStorage.getItem(`amarHishabTransactions_${user.uid}_v12`); 
            if (stored) transactions = JSON.parse(stored); 
            else transactions = [];
        } else {
            transactions = []; // Should not happen if auth guard is working
        }
    }
    function saveLoans() { 
        const user = auth.currentUser;
        if (user) {
            localStorage.setItem(`amarHishabLoans_${user.uid}_v12`, JSON.stringify(loans)); 
        }
    } 
    function loadLoans() { 
        const user = auth.currentUser;
        if (user) {
            const stored = localStorage.getItem(`amarHishabLoans_${user.uid}_v12`); 
            if (stored) loans = JSON.parse(stored); 
            else loans = [];
        } else {
            loans = []; // Should not happen
        }
    }

    function showNotification(message, isError = false) { const n=document.getElementById('customNotification'),m=document.getElementById('notificationMessage'); if(!n||!m)return;m.textContent=message;n.className='notification';if(isError)n.classList.add('error');n.classList.add('show');setTimeout(()=>{n.classList.remove('show')},3000); }
    function startClock() { const c=document.getElementById('clockTime');if(!c)return;function u(){const n=new Date(),o={hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true,};c.textContent=n.toLocaleTimeString('en-US',o).replace(/([\d\:]+)\s(AM|PM)/, '$1 $2');}u();setInterval(u,1000); } 

    function renderExpenseCategoriesView() { 
        const container=document.getElementById('expenseCategoriesListContainer');
        if(!container)return;
        container.innerHTML=''; 
        for(const category in expenseCategoriesData){
            if(expenseCategoriesData.hasOwnProperty(category)){
                const card=document.createElement('div');
                card.classList.add('category-card');
                const title=document.createElement('h4');
                title.innerHTML=`<i class="fas fa-folder-open"></i> ${category}`;
                card.appendChild(title);
                const ul=document.createElement('ul');
                expenseCategoriesData[category].forEach(subcat=>{
                    const li=document.createElement('li');
                    li.innerHTML=`<i class="fas fa-caret-right"></i> ${subcat}`;
                    ul.appendChild(li);
                });
                card.appendChild(ul);
                container.appendChild(card);
            }
        }
    }

    const calculatorOverlayFS = document.getElementById('calculatorOverlay');
    const calcInputExpressionDisplayFS = document.getElementById('calcInputExpressionDisplayFS');
    const calcResultDisplayFS = document.getElementById('calcResultDisplayFS');
    const calcHistoryDisplayFS = document.getElementById('calcHistoryDisplayFS');
    const calcLivePreviewDisplayFS = document.getElementById('calcLivePreviewDisplayFS');
    let currentInputStringFS = '0';
    let calculationHistoryLogFS = [];
    const MAX_CALC_HISTORY_DISPLAY_ITEMS = 5;
    let expressionBeforeEquals = '';
    function toggleCalculatorFS() { if(!calculatorOverlayFS) return; const isOpen = calculatorOverlayFS.classList.contains('show'); if (isOpen) closeCalculatorFS(); else openCalculatorFS(); }
    function openCalculatorFS() { if(!calculatorOverlayFS) return; calculatorOverlayFS.classList.add('show'); history.pushState({ calculatorOpenFS: true }, "ক্যালকুলেটর", "#calculatorFS"); resetCalculatorStateFS(); document.body.style.overflow = 'hidden'; }
    function closeCalculatorFS() { if(!calculatorOverlayFS) return; calculatorOverlayFS.classList.remove('show'); if (location.hash === "#calculatorFS") history.back(); document.body.style.overflow = ''; }
    function justCloseCalculatorFSUI() { if(!calculatorOverlayFS) return; calculatorOverlayFS.classList.remove('show'); document.body.style.overflow = ''; }
    function handleSystemBackButton(event) { if (calculatorOverlayFS && location.hash === "#calculatorFS" && calculatorOverlayFS.classList.contains('show')) {} else if (calculatorOverlayFS && event.state && event.state.calculatorOpenFS === undefined && !location.hash.includes('calculatorFS') && calculatorOverlayFS.classList.contains('show')) { justCloseCalculatorFSUI(); } }
    window.addEventListener('popstate', function(event) { if (calculatorOverlayFS && !location.hash.includes('calculatorFS') && calculatorOverlayFS.classList.contains('show')) { justCloseCalculatorFSUI(); } });
    function clearLivePreview() { if(calcLivePreviewDisplayFS) { calcLivePreviewDisplayFS.textContent = ''; calcLivePreviewDisplayFS.classList.remove('show'); } }
    function resetCalculatorStateFS(clearHistory = false) { currentInputStringFS = '0'; expressionBeforeEquals = '0'; if (clearHistory) { calculationHistoryLogFS = []; renderCalculatorHistoryFS(); } updateInputDisplayFS(); if(calcResultDisplayFS) calcResultDisplayFS.textContent = ''; clearLivePreview(); }
    function appendToInputStringFS(value) { const mainDisplayIsResult = expressionBeforeEquals === currentInputStringFS && currentInputStringFS !== '0' && currentInputStringFS !== 'Error' && !isOperator(currentInputStringFS.slice(-1)); if (mainDisplayIsResult && !isOperator(value) && value !== '.') { currentInputStringFS = '0'; } if (currentInputStringFS === '0' && !isOperator(value) && value !== '.') { currentInputStringFS = value; } else { if (isOperator(value) && currentInputStringFS.length > 0 && isOperator(currentInputStringFS.slice(-1).trim())) { if (value === '-' && currentInputStringFS.slice(-1).trim() !== '-') { currentInputStringFS += value; } else if (value !== '-') { if (currentInputStringFS.length > 1 && isOperator(currentInputStringFS.slice(-2, -1).trim()) && currentInputStringFS.endsWith('-')) { currentInputStringFS = currentInputStringFS.slice(0, -2).trim() + value; } else { currentInputStringFS = currentInputStringFS.slice(0, -1).trim() + value; } } } else if (isOperator(value) && currentInputStringFS === '0') { if (value === '-') currentInputStringFS = value; } else { currentInputStringFS += value; } } expressionBeforeEquals = currentInputStringFS; updateInputDisplayFS(); updateLivePreviewFS(); }
    function inputDecimalFS() { const mainDisplayIsResult = expressionBeforeEquals === currentInputStringFS && currentInputStringFS !== '0' && currentInputStringFS !== 'Error' && !isOperator(currentInputStringFS.slice(-1)); if (mainDisplayIsResult) { currentInputStringFS = '0.'; } else { const parts = currentInputStringFS.split(/([+\-×÷%])/g); const lastPart = parts[parts.length - 1].trim(); if (lastPart === '' && isOperator(parts[parts.length - 2])) { currentInputStringFS += '0.'; } else if (!lastPart.includes('.')) { currentInputStringFS += '.'; } } expressionBeforeEquals = currentInputStringFS; updateInputDisplayFS(); updateLivePreviewFS(); }
    function calculateEqualsFS() { if (currentInputStringFS === 'Error' || (currentInputStringFS === expressionBeforeEquals && calcInputExpressionDisplayFS && calcInputExpressionDisplayFS.textContent === currentInputStringFS && calcLivePreviewDisplayFS && !calcLivePreviewDisplayFS.classList.contains('show'))) { if (currentInputStringFS === '0' && expressionBeforeEquals === '0') {} else { return; } } let expressionToEvaluate = expressionBeforeEquals; clearLivePreview(); if(calcResultDisplayFS) calcResultDisplayFS.textContent = ''; if (isOperator(expressionToEvaluate.slice(-1).trim())) { if (expressionToEvaluate.length > 1 && isOperator(expressionToEvaluate.slice(-2,-1).trim()) && expressionToEvaluate.endsWith('-')){ currentInputStringFS = "Error"; updateInputDisplayFS(); return; } expressionToEvaluate = expressionToEvaluate.slice(0, -1).trim(); } if (!expressionToEvaluate) { currentInputStringFS = '0'; updateInputDisplayFS(); return; } const evalExpression = expressionToEvaluate.replace(/×/g, '*').replace(/÷/g, '/'); let result; try { result = (new Function( 'return (' + evalExpression + ')' ))(); if (isNaN(result) || !isFinite(result)) result = 'Error'; } catch (e) { result = 'Error'; } const displayResult = formatCalcNumber(result); currentInputStringFS = displayResult.toString(); updateInputDisplayFS(); addCalculationToHistoryFS(expressionBeforeEquals, displayResult); expressionBeforeEquals = currentInputStringFS; }
    function addCalculationToHistoryFS(expression, result) { if (result === 'Error' || expression === result.toString()) return; calculationHistoryLogFS.unshift({ expr: expression, res: result }); if (calculationHistoryLogFS.length > MAX_CALC_HISTORY_DISPLAY_ITEMS) { calculationHistoryLogFS.pop(); } renderCalculatorHistoryFS(); }
    function renderCalculatorHistoryFS() { if(!calcHistoryDisplayFS) return; calcHistoryDisplayFS.innerHTML = ''; calculationHistoryLogFS.slice().reverse().forEach(item => { const historyDiv = document.createElement('div'); historyDiv.classList.add('history-item-fs'); historyDiv.textContent = `${item.expr} = ${item.res}`; calcHistoryDisplayFS.appendChild(historyDiv); }); }
    function updateInputDisplayFS() { if(!calcInputExpressionDisplayFS) return; calcInputExpressionDisplayFS.textContent = currentInputStringFS; const len = currentInputStringFS.length; if (len > 24) calcInputExpressionDisplayFS.style.fontSize = "1.3em"; else if (len > 20) calcInputExpressionDisplayFS.style.fontSize = "1.5em"; else if (len > 16) calcInputExpressionDisplayFS.style.fontSize = "1.7em"; else calcInputExpressionDisplayFS.style.fontSize = "2.0em"; }
    function clearAllFS() { resetCalculatorStateFS(true); }
    function backspaceFS() { if (currentInputStringFS.length > 1) { currentInputStringFS = currentInputStringFS.slice(0, -1); } else if (currentInputStringFS.length === 1 && currentInputStringFS !== '0') { currentInputStringFS = '0'; } expressionBeforeEquals = currentInputStringFS; if(calcResultDisplayFS) calcResultDisplayFS.textContent = ''; updateInputDisplayFS(); updateLivePreviewFS(); }
    function formatCalcNumber(numInput) { if(numInput===null||numInput===undefined||numInput==='Error'||(typeof numInput==='string'&&isNaN(parseFloat(numInput))))return 'Error';let numStr=Number(numInput).toString();if(Math.abs(Number(numInput))>1e12||(Math.abs(Number(numInput))<1e-9&&Number(numInput)!==0)){return Number(numInput).toExponential(6);}if(numStr.includes('.')){numStr=parseFloat(Number(numInput).toFixed(7)).toString();}return numStr;}
    function isOperator(char) { return ['+', '-', '×', '÷', '%'].includes(char); }
    function handleCalculatorFSInput(event) { const { value } = event.target.dataset; const classList = event.target.classList; if (currentInputStringFS === 'Error' && value !== 'clear') return; if (classList.contains('number')) { if (value === '.') inputDecimalFS(); else appendToInputStringFS(value); } else if (classList.contains('operator')) { const displayOperator = getOperatorSymbolForDisplayFS(value); appendToInputStringFS(displayOperator); } else if (classList.contains('equals')) { calculateEqualsFS(); } else if (value === 'clear') { clearAllFS(); } else if (value === 'backspace') { backspaceFS(); } }
    function getOperatorSymbolForDisplayFS(op) { if (op === '*') return '×'; if (op === '/') return '÷'; return op; }
    function updateLivePreviewFS() { const inputExpr = expressionBeforeEquals; if (!calcLivePreviewDisplayFS || inputExpr === 'Error') { clearLivePreview(); return; } const isJustANumber = /^-?((\d+(\.\d*)?)|(\.\d+))$/.test(inputExpr); if (inputExpr === '0' || inputExpr === '-' || isJustANumber) { clearLivePreview(); return; } const lastChar = inputExpr.slice(-1).trim(); if (isOperator(lastChar) || inputExpr.endsWith('.')) { if (lastChar === '-' && inputExpr.length > 1 && isOperator(inputExpr.slice(-2, -1))) { clearLivePreview(); return; } else if(isOperator(lastChar) || inputExpr.endsWith('.')) { clearLivePreview(); return; } } let evalExpression = inputExpr.replace(/×/g, '*').replace(/÷/g, '/'); try { if (isOperator(evalExpression.charAt(0)) && evalExpression.length === 1) { clearLivePreview(); return; } const result = (new Function( 'return (' + evalExpression + ')' ))(); if (isNaN(result) || !isFinite(result) || typeof result !== 'number') { clearLivePreview(); } else { calcLivePreviewDisplayFS.textContent = `= ${formatCalcNumber(result)}`; calcLivePreviewDisplayFS.classList.add('show'); } } catch (e) { clearLivePreview(); } }
} // End of initializeAppLogic