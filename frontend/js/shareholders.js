document.addEventListener("DOMContentLoaded", function() {
    const addInvestmentForm = document.getElementById('add-investment-form');
    const distributeProfitForm = document.getElementById('distribute-profit-form');
    const invShareholderSelect = document.getElementById('inv_shareholder_id');
    const distShareholderSelect = document.getElementById('dist_shareholder_id');
    const shareholdersBody = document.getElementById('shareholders-table-body');
    const totalSystemInvEl = document.getElementById('total-system-investment');
    let pageSize = 10;

    document.getElementById('shareholders-page-size')?.addEventListener('change', function() {
        pageSize = parseInt(this.value);
        loadData(1);
    });

    async function loadData(page = 1) {
        try {
            const skip = (page - 1) * pageSize;
            const [shResponse, usersResponse] = await Promise.all([
                fetchData(`shareholders/?skip=${skip}&limit=${pageSize}`),
                fetchData('users/?limit=1000')
            ]);
            const shareholders = shResponse.items ? shResponse.items : shResponse;
            const users = usersResponse.items ? usersResponse.items : usersResponse;
            
            const start = shResponse.total === 0 ? 0 : skip + 1;
            const end = Math.min(skip + pageSize, shResponse.total);
            document.getElementById('shareholders-range-info').textContent = `Showing ${start} - ${end} of ${shResponse.total}`;

            renderShareholdersTable(shResponse);
            populateUserDropdown(users);
            populateDistributeDropdown(shareholders);
        } catch (error) {}
    }

    function renderShareholdersTable(response) {
        if (!shareholdersBody) return;
        const shareholders = response.items ? response.items : response;
        shareholdersBody.innerHTML = shareholders.map(sh => `<tr><td><strong>${sh.name}</strong></td><td><small>${sh.email || '-'}</small></td><td>${new Date(sh.joined_date).toLocaleDateString()}</td><td class="fw-bold">${sh.total_investment.toFixed(2)} ৳</td><td><span class="badge bg-primary">${sh.share_percentage.toFixed(2)}%</span></td><td><span class="badge bg-success">Active</span></td></tr>`).join('');
        if (response.pages) renderPagination(response.page, response.pages, "shareholders-pagination", loadData);
    }

    function populateUserDropdown(users) {
        if (!invShareholderSelect) return;
        invShareholderSelect.innerHTML = '<option value="">Choose User...</option>' + users.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('');
    }

    function populateDistributeDropdown(shareholders) {
        if (!distShareholderSelect) return;
        distShareholderSelect.innerHTML = '<option value="">Choose Shareholder...</option>' + shareholders.map(sh => `<option value="${sh.id}">${sh.name}</option>`).join('');
    }

    if (addInvestmentForm) {
        addInvestmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = { target_user_id: parseInt(document.getElementById('inv_shareholder_id').value), amount: parseFloat(document.getElementById('inv_amount').value), investment_date: document.getElementById('inv_date').value };
            await fetchData('investments/', 'POST', data);
            alert("Success!"); addInvestmentForm.reset(); loadData(1);
        });
    }

    if (distributeProfitForm) {
        distributeProfitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = { shareholder_id: parseInt(document.getElementById('dist_shareholder_id').value), amount: parseFloat(document.getElementById('dist_amount').value), distribution_date: document.getElementById('dist_date').value, note: document.getElementById('dist_note').value };
            await fetchData('profit-distributions/', 'POST', data);
            alert("Success!"); distributeProfitForm.reset();
        });
    }

    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('inv_date')) document.getElementById('inv_date').value = today;
    if(document.getElementById('dist_date')) document.getElementById('dist_date').value = today;
    loadData();
    setTimeout(() => document.getElementById("loader-wrapper")?.classList.remove("visible"), 500);
});