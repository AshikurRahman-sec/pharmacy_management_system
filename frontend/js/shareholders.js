document.addEventListener("DOMContentLoaded", function() {
    console.log("shareholders.js: DOMContentLoaded fired.");

    // Forms
    const addShareholderForm = document.getElementById('add-shareholder-form');
    const addInvestmentForm = document.getElementById('add-investment-form');
    const distributeProfitForm = document.getElementById('distribute-profit-form');
    
    // Selects
    const invShareholderSelect = document.getElementById('inv_shareholder_id');
    const distShareholderSelect = document.getElementById('dist_shareholder_id');
    
    // Tables
    const shareholdersBody = document.getElementById('shareholders-table-body');
    const totalSystemInvEl = document.getElementById('total-system-investment');

    let allShareholders = [];

    // --- Data Loading ---
    async function loadData() {
        try {
            const [shareholders, users] = await Promise.all([
                fetchData('shareholders/'),
                fetchData('users/')
            ]);
            
            allShareholders = shareholders;
            renderShareholdersTable();
            populateUserDropdown(users);
            populateDistributeDropdown(shareholders);
        } catch (error) {
            console.error("Error loading data:", error);
            if (shareholdersBody) shareholdersBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    function populateUserDropdown(users) {
        if (!invShareholderSelect) return;
        const options = '<option value="">Choose User...</option>' + 
            users.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('');
        invShareholderSelect.innerHTML = options;
    }

    function populateDistributeDropdown(shareholders) {
        if (!distShareholderSelect) return;
        const options = '<option value="">Choose Shareholder...</option>' + 
            shareholders.map(sh => `<option value="${sh.id}">${sh.name}</option>`).join('');
        distShareholderSelect.innerHTML = options;
    }

    // --- Form Handlers ---

    // Add Investment Handler
    if (addInvestmentForm) {
        addInvestmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                target_user_id: parseInt(document.getElementById('inv_shareholder_id').value), // Sending User ID
                amount: parseFloat(document.getElementById('inv_amount').value),
                investment_date: document.getElementById('inv_date').value
            };

            try {
                await fetchData('investments/', 'POST', data);
                alert("Investment recorded successfully! Shareholder profile created/updated.");
                addInvestmentForm.reset();
                loadData(); // Refresh everything
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Distribute Profit Handler (remains same but uses loadData)
    if (distributeProfitForm) {
        distributeProfitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                shareholder_id: parseInt(document.getElementById('dist_shareholder_id').value),
                amount: parseFloat(document.getElementById('dist_amount').value),
                distribution_date: document.getElementById('dist_date').value,
                note: document.getElementById('dist_note').value
            };

            try {
                await fetchData('profit-distributions/', 'POST', data);
                alert("Profit distributed successfully!");
                distributeProfitForm.reset();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('joined_date')) document.getElementById('joined_date').value = today;
    if(document.getElementById('inv_date')) document.getElementById('inv_date').value = today;
    if(document.getElementById('dist_date')) document.getElementById('dist_date').value = today;

    // Initial Load
    loadData();

    // Hide loader
    const loaderWrapper = document.getElementById("loader-wrapper");
    if (loaderWrapper) {
        setTimeout(() => loaderWrapper.classList.remove("visible"), 500);
    }
});
