document.addEventListener("DOMContentLoaded", function() {
    console.log("reports.js: DOMContentLoaded fired.");

    // --- Profit & Loss Logic ---
    const profitLossForm = document.getElementById('profit-loss-form');
    const reportResults = document.getElementById('report-results');
    let profitChart = null;

    if (profitLossForm) {
        profitLossForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const startDate = document.getElementById('start_date').value;
            const endDate = document.getElementById('end_date').value;

            if (!startDate || !endDate) {
                alert("Please select both a start and end date.");
                return;
            }

            try {
                const reportData = await fetchData(`reports/profit-loss/?start_date=${startDate}&end_date=${endDate}`);
                
                document.getElementById('total-revenue').textContent = `${reportData.total_revenue.toFixed(2)} ৳`;
                document.getElementById('total-sales-cash').textContent = `${reportData.total_sales_cash.toFixed(2)} ৳`;
                document.getElementById('total-sales-due').textContent = `${reportData.total_sales_due.toFixed(2)} ৳`;
                document.getElementById('total-cogs').textContent = `${reportData.total_cogs.toFixed(2)} ৳`;
                document.getElementById('total-salaries').textContent = `${reportData.total_employee_costs.toFixed(2)} ৳`;
                document.getElementById('total-other-expenses').textContent = `${reportData.total_other_expenses.toFixed(2)} ৳`;
                
                const profit = reportData.profit;
                const profitElement = document.getElementById('total-profit');
                profitElement.textContent = `${profit.toFixed(2)} ৳`;
                profitElement.className = `badge fs-5 ${profit >= 0 ? 'bg-success' : 'bg-danger'}`;

                reportResults.classList.remove('d-none');
                renderChart(reportData);

            } catch (error) {
                console.error('Error generating P&L report:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    function renderChart(data) {
        const ctx = document.getElementById('profitChart').getContext('2d');
        if (profitChart) profitChart.destroy();

        profitChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['COGS', 'Salaries', 'Expenses', 'Net Profit'],
                datasets: [{
                    data: [
                        data.total_cogs, 
                        data.total_employee_costs, 
                        data.total_other_expenses, 
                        Math.max(0, data.profit)
                    ],
                    backgroundColor: ['#ffc107', '#dc3545', '#6c757d', '#198754']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: false }
                }
            }
        });
    }

    // --- Common Logic ---
    // Populate Year Dropdowns
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
        yearOptions.push(`<option value="${i}">${i}</option>`);
    }
    const yearSelects = ['cust-year', 'supp-year'];
    yearSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML += yearOptions.join('');
            el.value = currentYear; // Default to current year
        }
    });

    // --- Customer Dues Logic ---
    const filterCustBtn = document.getElementById('filter-cust-btn');
    if (filterCustBtn) {
        filterCustBtn.addEventListener('click', loadCustomerDues);
    }

    async function loadCustomerDues() {
        const year = document.getElementById('cust-year').value;
        const month = document.getElementById('cust-month').value;
        const status = document.getElementById('cust-status').value;
        const tbody = document.getElementById('customer-due-body');
        const totalEl = document.getElementById('total-cust-due');

        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

        try {
            let query = `reports/customer-dues/?status=${status}`;
            if (year) query += `&year=${year}`;
            if (month) query += `&month=${month}`;

            const data = await fetchData(query);
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records found.</td></tr>';
                totalEl.textContent = '0.00 ৳';
                return;
            }

            let totalDue = 0;
            data.forEach(item => {
                totalDue += item.due_amount;
                const row = `<tr>
                    <td>${new Date(item.date).toLocaleDateString()}</td>
                    <td class="fw-bold">${item.customer_name}</td>
                    <td>${item.customer_mobile || '-'}</td>
                    <td>${item.total_amount.toFixed(2)}</td>
                    <td class="text-success">${item.paid_amount.toFixed(2)}</td>
                    <td class="text-danger fw-bold">${item.due_amount.toFixed(2)}</td>
                </tr>`;
                tbody.innerHTML += row;
            });
            totalEl.textContent = `${totalDue.toFixed(2)} ৳`;

        } catch (error) {
            console.error('Error loading customer dues:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    // --- Supplier Dues Logic ---
    const filterSuppBtn = document.getElementById('filter-supp-btn');
    if (filterSuppBtn) {
        filterSuppBtn.addEventListener('click', loadSupplierDues);
    }

    async function loadSupplierDues() {
        const year = document.getElementById('supp-year').value;
        const month = document.getElementById('supp-month').value;
        const status = document.getElementById('supp-status').value;
        const tbody = document.getElementById('supplier-due-body');
        const totalEl = document.getElementById('total-supp-due');

        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

        try {
            let query = `reports/supplier-dues/?status=${status}`;
            if (year) query += `&year=${year}`;
            if (month) query += `&month=${month}`;

            const data = await fetchData(query);
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No records found.</td></tr>';
                totalEl.textContent = '0.00 ৳';
                return;
            }

            let totalDue = 0;
            data.forEach(item => {
                totalDue += item.due_amount;
                const statusBadge = item.status === 'paid' ? '<span class="badge bg-success">Paid</span>' : 
                                   item.status === 'partial' ? '<span class="badge bg-warning text-dark">Partial</span>' : 
                                   '<span class="badge bg-danger">Unpaid</span>';
                
                const row = `<tr>
                    <td>${new Date(item.date).toLocaleDateString()}</td>
                    <td>${item.invoice_number}</td>
                    <td class="fw-bold">${item.supplier_name}</td>
                    <td>${item.total_amount.toFixed(2)}</td>
                    <td class="text-success">${item.paid_amount.toFixed(2)}</td>
                    <td class="text-danger fw-bold">${item.due_amount.toFixed(2)}</td>
                    <td>${statusBadge}</td>
                </tr>`;
                tbody.innerHTML += row;
            });
            totalEl.textContent = `${totalDue.toFixed(2)} ৳`;

        } catch (error) {
            console.error('Error loading supplier dues:', error);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    // Initialize Print Function
    window.printReport = function(tableId) {
        const printContent = document.getElementById(tableId).outerHTML;
        const win = window.open('', '', 'width=900,height=650');
        win.document.write(`<html><head><title>Print Report</title>`);
        win.document.write(`<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">`);
        win.document.write(`</head><body>`);
        win.document.write(`<h3 class="mt-4 mb-3 text-center">Pharmacy Management Report</h3>`);
        win.document.write(printContent);
        win.document.write(`</body></html>`);
        win.document.close();
        win.print();
    };

    // Hide loader
    const loaderWrapper = document.getElementById("loader-wrapper");
    if (loaderWrapper) {
        setTimeout(() => loaderWrapper.classList.remove("visible"), 500);
    }
    
    // Set default dates for P&L
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    if(document.getElementById('start_date')) document.getElementById('start_date').value = firstDay;
    if(document.getElementById('end_date')) document.getElementById('end_date').value = lastDay;
    
    // Auto-load initial data for active tab (optional, maybe wait for user filter)
    // loadCustomerDues();
});