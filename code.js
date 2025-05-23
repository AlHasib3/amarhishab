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
    document.getElementById('dashboardMonthFilter').value = currentMonthYear;
    if (document.getElementById('denaPaonaMonthFilter')) {
        document.getElementById('denaPaonaMonthFilter').value = currentMonthYear;
    }
    if (document.getElementById('reportMonthFilter')) { 
        document.getElementById('reportMonthFilter').value = currentMonthYear;
    }
    
    document.getElementById('unifiedEntryForm').addEventListener('submit', handleUnifiedFormSubmit);

    document.getElementById('unifiedEntryType').value = 'expense'; 
    toggleUnifiedEntryFields(); 

    document.getElementById('calculatorToggleBtn').addEventListener('click', toggleCalculatorFS);
    document.getElementById('calculatorCloseBtnFS').addEventListener('click', closeCalculatorFS);
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
    
    // Store current value if selectId is reportCategoryFilter to reselect if possible
    let currentValue = (selectId === 'reportCategoryFilter') ? categorySelect.value : null;

    categorySelect.innerHTML = ''; // Clear existing options
    
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
     // Reselect previous value if it exists
    if (currentValue && categorySelect.querySelector(`option[value="${currentValue}"]`)) {
        categorySelect.value = currentValue;
    } else if (includeAllOption) {
        categorySelect.value = "all"; // Default to "all" for report filter if previous not found
    }
    
    // If it's the report category filter, update its subcategory filter
    if (selectId === 'reportCategoryFilter') {
        updateReportSubcategoryFilter();
    }
}


function setDateTimeNow(elementId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    document.getElementById(elementId).value = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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
    if (tabName === 'transactions') renderAllTransactions();
    if (tabName === 'denaPaona') renderDenaPaonaTab(); 
    if (tabName === 'expenseCategoriesView') renderExpenseCategoriesView();
    if (tabName === 'expenseReport') {
        populateExpenseCategoryDropdown('reportCategoryFilter', true); // Repopulate on tab open
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

function toggleUnifiedEntryFields() {
    const entryType = document.getElementById('unifiedEntryType').value;
    const transactionFields = document.getElementById('transactionSpecificFields');
    const incomeFields = document.getElementById('incomeFields');
    const expenseFields = document.getElementById('expenseFields');
    const loanFields = document.getElementById('loanSpecificFields');
    const formTitle = document.getElementById('unifiedEntryFormTitle');
    const submitButton = document.getElementById('submitUnifiedEntryBtn');
    
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
        updateSubcategories(document.getElementById('expenseCategory').value, 'expenseSubcategory'); 
        formTitle.innerHTML = '<i class="fas fa-arrow-up"></i> নতুন ব্যয় এন্ট্রি';
        submitButton.innerHTML = '<i class="fas fa-check-circle"></i> ব্যয় যোগ করুন';
    } else if (entryType === 'loan') {
        loanFields.style.display = 'block';
        formTitle.innerHTML = '<i class="fas fa-hand-holding-usd"></i> নতুন দেনা/পাওনা এন্ট্রি';
        submitButton.innerHTML = '<i class="fas fa-save"></i> দেনা/পাওনা যোগ করুন';
    }
    const editingId = document.getElementById('editingUnifiedEntryId').value;
    const editingClass = document.getElementById('editingUnifiedEntryClass').value;

    if (editingId) {
        if (editingClass === 'transaction' && (entryType === 'income' || entryType === 'expense')) {
            // Allow switching between income and expense during edit
        } else if (editingClass === 'loan' && entryType === 'loan') {
            // Allow staying in loan type during edit
        } else {
            // If type is changed to an incompatible one during edit, reset
            resetUnifiedEntryForm();
        }
    }
}


function updateSubcategories(selectedCategoryValue, subCategorySelectId) { 
    const subcategorySelect = document.getElementById(subCategorySelectId);
    if (!subcategorySelect) { return; }
    
    subcategorySelect.innerHTML = ''; // Clear existing options
    
    // Add a placeholder/default option
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
        if (subCategorySelectId === 'reportSubcategoryFilter') { // Ensure "All Subcategories" is selectable if no main category
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
    document.getElementById('unifiedEntryForm').reset();
    setDateTimeNow('unifiedDateTime');
    document.getElementById('unifiedEntryType').value = 'expense'; 
    toggleUnifiedEntryFields(); 
    document.getElementById('editingUnifiedEntryId').value = '';
    document.getElementById('editingUnifiedEntryClass').value = '';
    // Ensure subcategory dropdown is reset for expense type
    updateSubcategories("", 'expenseSubcategory'); 
}

function formatDateTime(isoString, includeSeconds = true) { const date = new Date(isoString); const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' }; const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true }; if (includeSeconds) timeOptions.second = '2-digit'; const formattedDate = date.toLocaleDateString('en-GB', dateOptions); let formattedTime = date.toLocaleTimeString('en-US', timeOptions); return `${formattedDate}, ${formattedTime}`; }

function renderAllTransactions() { 
    const listElement = document.getElementById('allTransactionsList'); 
    const filterType = document.getElementById('transactionFilter').value; 
    const monthFilter = document.getElementById('monthFilter').value; 
    const textFilter = document.getElementById('textSearchFilter').value.toLowerCase(); 
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


function filterTransactions() { renderAllTransactions(); }
function deleteTransaction(id) { if (confirm("আপনি কি এই লেনদেনটি মুছে ফেলতে চান?")) { transactions = transactions.filter(t => t.id !== id); saveTransactions(); renderAllTransactions(); updateDashboardSummary(); renderExpenseReport(); showNotification("লেনদেন সফলভাবে মুছে ফেলা হয়েছে।"); } }

function renderDenaPaonaTab() {
    const monthFilterValue = document.getElementById('denaPaonaMonthFilter').value;
    const startDateFilterValue = document.getElementById('denaPaonaStartDateFilter').value;
    const endDateFilterValue = document.getElementById('denaPaonaEndDateFilter').value;
    const typeFilterValue = document.getElementById('denaPaonaTypeFilter').value;
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
            document.getElementById('denaPaonaMonthFilter').value = ''; 
        } else {
            showNotification("শুরুর তারিখ শেষের তারিখের পরে হতে পারে না।", true);
            document.getElementById('denaPaonaStartDateFilter').value = '';
            document.getElementById('denaPaonaEndDateFilter').value = '';
             // Fallback to default month for this tab
            const currentMonthDefault = new Date().toISOString().slice(0, 7);
            document.getElementById('denaPaonaMonthFilter').value = currentMonthDefault;
            filteredLoans = loans.filter(l => l.dateTime.startsWith(currentMonthDefault));
            periodText = new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
        }
    } else if (monthFilterValue) {
        filteredLoans = filteredLoans.filter(l => l.dateTime.startsWith(monthFilterValue));
        const [year, month] = monthFilterValue.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        periodText = monthDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
        document.getElementById('denaPaonaStartDateFilter').value = ''; 
        document.getElementById('denaPaonaEndDateFilter').value = '';
    } else {
        const currentMonthDefault = new Date().toISOString().slice(0, 7);
        if (!document.getElementById('denaPaonaMonthFilter').value && !startDateFilterValue && !endDateFilterValue) { 
            document.getElementById('denaPaonaMonthFilter').value = currentMonthDefault;
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

    document.getElementById('denaPaonaTotalLentDisplay').textContent = `৳ ${totalLentFiltered.toFixed(2)}`;
    document.getElementById('denaPaonaTotalBorrowedDisplay').textContent = `৳ ${totalBorrowedFiltered.toFixed(2)}`;
    document.getElementById('denaPaonaNetBalanceDisplay').textContent = `৳ ${netBalanceFiltered.toFixed(2)}`;
    document.getElementById('denaPaonaNetBalanceDisplay').style.color = netBalanceFiltered >= 0 ? '#28a745' : '#dc3545';

    filteredLoans.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    if (filteredLoans.length === 0) {
        listContainer.innerHTML = '<p><i class="fas fa-info-circle"></i> এই ফিল্টারে কোনো দেনা-পাওনা নেই।</p>';
    } else {
        filteredLoans.forEach(l => listContainer.appendChild(createLoanItemElement(l, 'denaPaona')));
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

function deleteLoan(id) { 
    if (confirm("আপনি কি এই দেনা/পাওনা এন্ট্রিটি মুছে ফেলতে চান?")) { 
        loans = loans.filter(l => l.id !== id); 
        saveLoans(); 
        renderDenaPaonaTab(); 
        updateDashboardSummary(); 
        showNotification("দেনা/পাওনা এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে।"); 
    } 
}

function updateDashboardSummary() {
    const monthFilterValue = document.getElementById('dashboardMonthFilter').value; 
    const startDateFilterValue = document.getElementById('dashboardStartDateFilter').value; 
    const endDateFilterValue = document.getElementById('dashboardEndDateFilter').value; 
    let filteredTransactionsForDashboard = [...transactions]; 
    let periodText = "সকল সময়";

    if (startDateFilterValue && endDateFilterValue) {
        const start = new Date(startDateFilterValue); start.setHours(0,0,0,0); 
        const end = new Date(endDateFilterValue); end.setHours(23,59,59,999); 
        if (start <= end) {
            filteredTransactionsForDashboard = transactions.filter(t => { const transactionDate = new Date(t.dateTime); return transactionDate >= start && transactionDate <= end; });
            periodText = `${formatDateForDisplay(startDateFilterValue)} থেকে ${formatDateForDisplay(endDateFilterValue)}`;
            document.getElementById('dashboardMonthFilter').value = ''; 
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
        document.getElementById('dashboardStartDateFilter').value = ''; 
        document.getElementById('dashboardEndDateFilter').value = '';
    } else { 
        const currentMonthDefault = new Date().toISOString().slice(0, 7);
        document.getElementById('dashboardMonthFilter').value = currentMonthDefault; 
        filteredTransactionsForDashboard = transactions.filter(t => t.dateTime.startsWith(currentMonthDefault));
        const [year, month] = currentMonthDefault.split('-');
        periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
    }

    document.getElementById('summaryPeriodText').textContent = periodText;
    const totalIncome = filteredTransactionsForDashboard.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTransactionsForDashboard.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = totalIncome - totalExpense; 
    document.getElementById('totalIncomeDisplay').textContent = `৳ ${totalIncome.toFixed(2)}`;
    document.getElementById('totalExpenseDisplay').textContent = `৳ ${totalExpense.toFixed(2)}`;
    document.getElementById('currentBalanceDisplay').textContent = `৳ ${currentBalance.toFixed(2)}`;
    
    const totalLentAllTime = loans.filter(l => l.type === 'lent').reduce((sum, l) => sum + l.amount, 0);
    const totalBorrowedAllTime = loans.filter(l => l.type === 'borrowed').reduce((sum, l) => sum + l.amount, 0);
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
function formatDateForDisplay(dateString) { if (!dateString) return ''; const date = new Date(dateString); return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });}
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

function editUnifiedEntry(id, entryClass) {
    openTab(null, 'addEntry');
    document.getElementById('editingUnifiedEntryId').value = id;
    document.getElementById('editingUnifiedEntryClass').value = entryClass;
    const submitButton = document.getElementById('submitUnifiedEntryBtn');
    submitButton.innerHTML = '<i class="fas fa-sync-alt"></i> আপডেট করুন';

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
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    document.getElementById(elementId).value = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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


// --- Expense Report Tab Logic ---
function renderExpenseReport() {
    const reportContainer = document.getElementById('expenseReportContainer');
    const monthFilter = document.getElementById('reportMonthFilter').value;
    const startDateFilter = document.getElementById('reportStartDateFilter').value;
    const endDateFilter = document.getElementById('reportEndDateFilter').value;
    const categoryFilter = document.getElementById('reportCategoryFilter').value;
    const subcategoryFilter = document.getElementById('reportSubcategoryFilter').value;

    const summaryPeriodTextEl = document.getElementById('reportSummaryPeriodText');
    const grandTotalAmountEl = document.getElementById('reportGrandTotalAmount');

    if (!reportContainer || !summaryPeriodTextEl || !grandTotalAmountEl) return;

    reportContainer.innerHTML = '';
    let periodText = "সকল সময়";
    let filteredExpenses = transactions.filter(t => t.type === 'expense');

    // Date Filtering
    if (startDateFilter && endDateFilter) {
        const start = new Date(startDateFilter); start.setHours(0,0,0,0);
        const end = new Date(endDateFilter); end.setHours(23,59,59,999);
        if (start <= end) {
            filteredExpenses = filteredExpenses.filter(t => { const txDate = new Date(t.dateTime); return txDate >= start && txDate <= end; });
            periodText = `${formatDateForDisplay(startDateFilter)} থেকে ${formatDateForDisplay(endDateFilter)}`;
            document.getElementById('reportMonthFilter').value = '';
        } else {
            showNotification("শুরুর তারিখ শেষের তারিখের পরে হতে পারে না।", true);
            document.getElementById('reportStartDateFilter').value = '';
            document.getElementById('reportEndDateFilter').value = '';
            // Fallback to default month
            const currentMonthDefault = new Date().toISOString().slice(0, 7);
            document.getElementById('reportMonthFilter').value = currentMonthDefault;
            filteredExpenses = transactions.filter(t => t.type === 'expense' && t.dateTime.startsWith(currentMonthDefault));
            periodText = new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
        }
    } else if (monthFilter) {
        filteredExpenses = filteredExpenses.filter(t => t.dateTime.startsWith(monthFilter));
        const [year, month] = monthFilter.split('-');
        periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
        document.getElementById('reportStartDateFilter').value = '';
        document.getElementById('reportEndDateFilter').value = '';
    } else {
         const currentMonthDefault = new Date().toISOString().slice(0, 7);
        if (!document.getElementById('reportMonthFilter').value ) {
             document.getElementById('reportMonthFilter').value = currentMonthDefault;
        }
        filteredExpenses = filteredExpenses.filter(t => t.dateTime.startsWith(document.getElementById('reportMonthFilter').value || currentMonthDefault));
        const [year, month] = (document.getElementById('reportMonthFilter').value || currentMonthDefault).split('-');
        periodText = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
    }
    summaryPeriodTextEl.textContent = periodText;

    // Category Filtering
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

function updateReportSubcategoryFilter() {
    const categoryFilterValue = document.getElementById('reportCategoryFilter').value;
    updateSubcategories(categoryFilterValue, 'reportSubcategoryFilter');
}

function resetExpenseReportFilters() {
    document.getElementById('reportMonthFilter').value = new Date().toISOString().slice(0, 7);
    document.getElementById('reportStartDateFilter').value = '';
    document.getElementById('reportEndDateFilter').value = '';
    document.getElementById('reportCategoryFilter').value = 'all';
    updateReportSubcategoryFilter(); // Reset subcategories based on "all" main categories
    document.getElementById('reportSubcategoryFilter').value = 'all';
    renderExpenseReport();
}


// Save/Load data
function saveTransactions() { localStorage.setItem('amarHishabTransactions_v12', JSON.stringify(transactions)); } 
function loadTransactions() { const stored = localStorage.getItem('amarHishabTransactions_v12'); if (stored) transactions = JSON.parse(stored); }
function saveLoans() { localStorage.setItem('amarHishabLoans_v12', JSON.stringify(loans)); } 
function loadLoans() { const stored = localStorage.getItem('amarHishabLoans_v12'); if (stored) loans = JSON.parse(stored); }

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

// --- ক্যালকুলেটর --- (Unchanged)
const calculatorOverlayFS = document.getElementById('calculatorOverlay');
const calcInputExpressionDisplayFS = document.getElementById('calcInputExpressionDisplayFS');
const calcResultDisplayFS = document.getElementById('calcResultDisplayFS');
const calcHistoryDisplayFS = document.getElementById('calcHistoryDisplayFS');
const calcLivePreviewDisplayFS = document.getElementById('calcLivePreviewDisplayFS');
let currentInputStringFS = '0';
let calculationHistoryLogFS = [];
const MAX_CALC_HISTORY_DISPLAY_ITEMS = 5;
let expressionBeforeEquals = '';
function toggleCalculatorFS() { const isOpen = calculatorOverlayFS.classList.contains('show'); if (isOpen) closeCalculatorFS(); else openCalculatorFS(); }
function openCalculatorFS() { calculatorOverlayFS.classList.add('show'); history.pushState({ calculatorOpenFS: true }, "ক্যালকুলেটর", "#calculatorFS"); resetCalculatorStateFS(); document.body.style.overflow = 'hidden'; }
function closeCalculatorFS() { calculatorOverlayFS.classList.remove('show'); if (location.hash === "#calculatorFS") history.back(); document.body.style.overflow = ''; }
function justCloseCalculatorFSUI() { calculatorOverlayFS.classList.remove('show'); document.body.style.overflow = ''; }
function handleSystemBackButton(event) { if (location.hash === "#calculatorFS" && calculatorOverlayFS.classList.contains('show')) {} else if (event.state && event.state.calculatorOpenFS === undefined && !location.hash.includes('calculatorFS') && calculatorOverlayFS.classList.contains('show')) { justCloseCalculatorFSUI(); } }
window.addEventListener('popstate', function(event) { if (!location.hash.includes('calculatorFS') && calculatorOverlayFS.classList.contains('show')) { justCloseCalculatorFSUI(); } });
function clearLivePreview() { if(calcLivePreviewDisplayFS) { calcLivePreviewDisplayFS.textContent = ''; calcLivePreviewDisplayFS.classList.remove('show'); } }
function resetCalculatorStateFS(clearHistory = false) { currentInputStringFS = '0'; expressionBeforeEquals = '0'; if (clearHistory) { calculationHistoryLogFS = []; renderCalculatorHistoryFS(); } updateInputDisplayFS(); calcResultDisplayFS.textContent = ''; clearLivePreview(); }
function appendToInputStringFS(value) { const mainDisplayIsResult = expressionBeforeEquals === currentInputStringFS && currentInputStringFS !== '0' && currentInputStringFS !== 'Error' && !isOperator(currentInputStringFS.slice(-1)); if (mainDisplayIsResult && !isOperator(value) && value !== '.') { currentInputStringFS = '0'; } if (currentInputStringFS === '0' && !isOperator(value) && value !== '.') { currentInputStringFS = value; } else { if (isOperator(value) && currentInputStringFS.length > 0 && isOperator(currentInputStringFS.slice(-1).trim())) { if (value === '-' && currentInputStringFS.slice(-1).trim() !== '-') { currentInputStringFS += value; } else if (value !== '-') { if (currentInputStringFS.length > 1 && isOperator(currentInputStringFS.slice(-2, -1).trim()) && currentInputStringFS.endsWith('-')) { currentInputStringFS = currentInputStringFS.slice(0, -2).trim() + value; } else { currentInputStringFS = currentInputStringFS.slice(0, -1).trim() + value; } } } else if (isOperator(value) && currentInputStringFS === '0') { if (value === '-') currentInputStringFS = value; } else { currentInputStringFS += value; } } expressionBeforeEquals = currentInputStringFS; updateInputDisplayFS(); updateLivePreviewFS(); }
function inputDecimalFS() { const mainDisplayIsResult = expressionBeforeEquals === currentInputStringFS && currentInputStringFS !== '0' && currentInputStringFS !== 'Error' && !isOperator(currentInputStringFS.slice(-1)); if (mainDisplayIsResult) { currentInputStringFS = '0.'; } else { const parts = currentInputStringFS.split(/([+\-×÷%])/g); const lastPart = parts[parts.length - 1].trim(); if (lastPart === '' && isOperator(parts[parts.length - 2])) { currentInputStringFS += '0.'; } else if (!lastPart.includes('.')) { currentInputStringFS += '.'; } } expressionBeforeEquals = currentInputStringFS; updateInputDisplayFS(); updateLivePreviewFS(); }
function calculateEqualsFS() { if (currentInputStringFS === 'Error' || (currentInputStringFS === expressionBeforeEquals && calcInputExpressionDisplayFS.textContent === currentInputStringFS && !calcLivePreviewDisplayFS.classList.contains('show'))) { if (currentInputStringFS === '0' && expressionBeforeEquals === '0') {} else { return; } } let expressionToEvaluate = expressionBeforeEquals; clearLivePreview(); calcResultDisplayFS.textContent = ''; if (isOperator(expressionToEvaluate.slice(-1).trim())) { if (expressionToEvaluate.length > 1 && isOperator(expressionToEvaluate.slice(-2,-1).trim()) && expressionToEvaluate.endsWith('-')){ currentInputStringFS = "Error"; updateInputDisplayFS(); return; } expressionToEvaluate = expressionToEvaluate.slice(0, -1).trim(); } if (!expressionToEvaluate) { currentInputStringFS = '0'; updateInputDisplayFS(); return; } const evalExpression = expressionToEvaluate.replace(/×/g, '*').replace(/÷/g, '/'); let result; try { result = (new Function( 'return (' + evalExpression + ')' ))(); if (isNaN(result) || !isFinite(result)) result = 'Error'; } catch (e) { result = 'Error'; } const displayResult = formatCalcNumber(result); currentInputStringFS = displayResult.toString(); updateInputDisplayFS(); addCalculationToHistoryFS(expressionBeforeEquals, displayResult); expressionBeforeEquals = currentInputStringFS; }
function addCalculationToHistoryFS(expression, result) { if (result === 'Error' || expression === result.toString()) return; calculationHistoryLogFS.unshift({ expr: expression, res: result }); if (calculationHistoryLogFS.length > MAX_CALC_HISTORY_DISPLAY_ITEMS) { calculationHistoryLogFS.pop(); } renderCalculatorHistoryFS(); }
function renderCalculatorHistoryFS() { calcHistoryDisplayFS.innerHTML = ''; calculationHistoryLogFS.slice().reverse().forEach(item => { const historyDiv = document.createElement('div'); historyDiv.classList.add('history-item-fs'); historyDiv.textContent = `${item.expr} = ${item.res}`; calcHistoryDisplayFS.appendChild(historyDiv); }); }
function updateInputDisplayFS() { calcInputExpressionDisplayFS.textContent = currentInputStringFS; const len = currentInputStringFS.length; if (len > 24) calcInputExpressionDisplayFS.style.fontSize = "1.3em"; else if (len > 20) calcInputExpressionDisplayFS.style.fontSize = "1.5em"; else if (len > 16) calcInputExpressionDisplayFS.style.fontSize = "1.7em"; else calcInputExpressionDisplayFS.style.fontSize = "2.0em"; }
function clearAllFS() { resetCalculatorStateFS(true); }
function backspaceFS() { if (currentInputStringFS.length > 1) { currentInputStringFS = currentInputStringFS.slice(0, -1); } else if (currentInputStringFS.length === 1 && currentInputStringFS !== '0') { currentInputStringFS = '0'; } expressionBeforeEquals = currentInputStringFS; calcResultDisplayFS.textContent = ''; updateInputDisplayFS(); updateLivePreviewFS(); }
function formatCalcNumber(numInput) { if(numInput===null||numInput===undefined||numInput==='Error'||(typeof numInput==='string'&&isNaN(parseFloat(numInput))))return 'Error';let numStr=Number(numInput).toString();if(Math.abs(Number(numInput))>1e12||(Math.abs(Number(numInput))<1e-9&&Number(numInput)!==0)){return Number(numInput).toExponential(6);}if(numStr.includes('.')){numStr=parseFloat(Number(numInput).toFixed(7)).toString();}return numStr;}
function isOperator(char) { return ['+', '-', '×', '÷', '%'].includes(char); }
function handleCalculatorFSInput(event) { const { value } = event.target.dataset; const classList = event.target.classList; if (currentInputStringFS === 'Error' && value !== 'clear') return; if (classList.contains('number')) { if (value === '.') inputDecimalFS(); else appendToInputStringFS(value); } else if (classList.contains('operator')) { const displayOperator = getOperatorSymbolForDisplayFS(value); appendToInputStringFS(displayOperator); } else if (classList.contains('equals')) { calculateEqualsFS(); } else if (value === 'clear') { clearAllFS(); } else if (value === 'backspace') { backspaceFS(); } }
function getOperatorSymbolForDisplayFS(op) { if (op === '*') return '×'; if (op === '/') return '÷'; return op; }
function updateLivePreviewFS() { const inputExpr = expressionBeforeEquals; if (!calcLivePreviewDisplayFS || inputExpr === 'Error') { clearLivePreview(); return; } const isJustANumber = /^-?((\d+(\.\d*)?)|(\.\d+))$/.test(inputExpr); if (inputExpr === '0' || inputExpr === '-' || isJustANumber) { clearLivePreview(); return; } const lastChar = inputExpr.slice(-1).trim(); if (isOperator(lastChar) || inputExpr.endsWith('.')) { if (lastChar === '-' && inputExpr.length > 1 && isOperator(inputExpr.slice(-2, -1))) { clearLivePreview(); return; } else if(isOperator(lastChar) || inputExpr.endsWith('.')) { clearLivePreview(); return; } } let evalExpression = inputExpr.replace(/×/g, '*').replace(/÷/g, '/'); try { if (isOperator(evalExpression.charAt(0)) && evalExpression.length === 1) { clearLivePreview(); return; } const result = (new Function( 'return (' + evalExpression + ')' ))(); if (isNaN(result) || !isFinite(result) || typeof result !== 'number') { clearLivePreview(); } else { calcLivePreviewDisplayFS.textContent = `= ${formatCalcNumber(result)}`; calcLivePreviewDisplayFS.classList.add('show'); } } catch (e) { clearLivePreview(); } }