document.addEventListener("DOMContentLoaded", function() {
    console.log("dashboard.js: Initializing dashboard.");

    const statsMedicines = document.getElementById('stats-medicines');
    const statsSalesToday = document.getElementById('stats-sales-today');
    const statsDue = document.getElementById('stats-due');
    const statsSupplierDue = document.getElementById('stats-supplier-due');
    const statsLowStock = document.getElementById('stats-low-stock');
    const statsExpired = document.getElementById('stats-expired');
    const statsExpiringSoon = document.getElementById('stats-expiring-soon');
    const statsTotalExpiring = document.getElementById('stats-total-expiring');
    const recentSalesTable = document.getElementById('recent-sales-table-body');
    const lowStockList = document.getElementById('low-stock-list');
    const lowStockBadge = document.getElementById('low-stock-badge');
    const expiryAlertsTable = document.getElementById('expiry-alerts-table-body');

    async function loadDashboardSummary() {
        try {
            const summary = await fetchData('reports/summary/');
            
            // Basic stats
            if (statsMedicines) statsMedicines.textContent = summary.total_medicines;
            if (statsSalesToday) statsSalesToday.textContent = `${summary.total_sales_today.toFixed(2)} ৳`;
            if (statsDue) statsDue.textContent = `${summary.total_due.toFixed(2)} ৳`;
            if (statsSupplierDue) statsSupplierDue.textContent = `${(summary.total_supplier_due || 0).toFixed(2)} ৳`;
            if (statsLowStock) statsLowStock.textContent = summary.low_stock_count;

            // Expiry stats
            const expiryAlerts = summary.expiry_alerts || {};
            const expiredCount = expiryAlerts.expired_count || 0;
            const expiring30Count = (expiryAlerts.expiring_30_days || []).length;
            const expiring60Count = (expiryAlerts.expiring_60_days || []).length;
            const expiring90Count = (expiryAlerts.expiring_90_days || []).length;
            const totalExpiring = expiring30Count + expiring60Count + expiring90Count;

            if (statsExpired) statsExpired.textContent = expiredCount;
            if (statsExpiringSoon) statsExpiringSoon.textContent = expiring30Count;
            if (statsTotalExpiring) statsTotalExpiring.textContent = totalExpiring;

            // Update badges
            const expiredBadge = document.getElementById('expired-badge');
            const expiring30Badge = document.getElementById('expiring-30-badge');
            const expiring60Badge = document.getElementById('expiring-60-badge');
            if (expiredBadge) expiredBadge.textContent = `${expiredCount} Expired`;
            if (expiring30Badge) expiring30Badge.textContent = `${expiring30Count} in 30 days`;
            if (expiring60Badge) expiring60Badge.textContent = `${expiring60Count} in 60 days`;

            // Modal tab counts
            const tabExpiredCount = document.getElementById('tab-expired-count');
            const tab30Count = document.getElementById('tab-30-count');
            const tab60Count = document.getElementById('tab-60-count');
            const tab90Count = document.getElementById('tab-90-count');
            if (tabExpiredCount) tabExpiredCount.textContent = expiredCount;
            if (tab30Count) tab30Count.textContent = expiring30Count;
            if (tab60Count) tab60Count.textContent = expiring60Count;
            if (tab90Count) tab90Count.textContent = expiring90Count;

            // Recent Sales Table
            if (recentSalesTable) {
                recentSalesTable.innerHTML = '';
                if (summary.recent_sales.length === 0) {
                    recentSalesTable.innerHTML = '<tr><td colspan="5" class="text-center">No recent sales</td></tr>';
                } else {
                    summary.recent_sales.forEach((sale, index) => {
                        const row = `<tr>
                            <th scope="row">${index + 1}</th>
                            <td>${new Date(sale.date).toLocaleDateString()}</td>
                            <td>${sale.buyer}</td>
                            <td>${sale.total.toFixed(2)} ৳</td>
                            <td class="${sale.due > 0 ? 'text-danger fw-bold' : 'text-success'}">${sale.due > 0 ? 'Due' : 'Paid'}</td>
                        </tr>`;
                        recentSalesTable.innerHTML += row;
                    });
                }
            }

            // Low Stock List
            if (lowStockList) {
                const lowStockMeds = summary.low_stock_medicines || [];
                if (lowStockBadge) lowStockBadge.textContent = lowStockMeds.length;
                
                if (lowStockMeds.length === 0) {
                    lowStockList.innerHTML = '<li class="list-group-item text-center text-muted"><i class="fas fa-check-circle text-success me-2"></i>All medicines are well stocked!</li>';
                } else {
                    lowStockList.innerHTML = '';
                    lowStockMeds.forEach(med => {
                        const urgencyClass = med.stock_quantity === 0 ? 'danger' : med.stock_quantity < 5 ? 'warning' : 'info';
                        const item = `<li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold">${med.name}</span>
                                <br><small class="text-muted">Price: ${med.selling_price.toFixed(2)} ৳</small>
                            </div>
                            <span class="badge bg-${urgencyClass} rounded-pill">${med.stock_quantity} left</span>
                        </li>`;
                        lowStockList.innerHTML += item;
                    });
                }

                // Low Stock Modal
                const lowStockModalBody = document.getElementById('low-stock-modal-body');
                if (lowStockModalBody) {
                    if (lowStockMeds.length === 0) {
                        lowStockModalBody.innerHTML = '<tr><td colspan="5" class="text-center text-success"><i class="fas fa-check-circle me-2"></i>All items well stocked!</td></tr>';
                    } else {
                        lowStockModalBody.innerHTML = '';
                        lowStockMeds.forEach((med, index) => {
                            const row = `<tr>
                                <td>${index + 1}</td>
                                <td>${med.name}</td>
                                <td><span class="badge bg-${med.stock_quantity === 0 ? 'danger' : 'warning'}">${med.stock_quantity}</span></td>
                                <td>${med.selling_price.toFixed(2)} ৳</td>
                                <td><a href="inventory.html" class="btn btn-sm btn-primary"><i class="fas fa-plus"></i> Restock</a></td>
                            </tr>`;
                            lowStockModalBody.innerHTML += row;
                        });
                    }
                }
            }

            // Expiry Alerts Table
            if (expiryAlertsTable) {
                const allExpiryItems = [];
                
                // Add expired items
                (expiryAlerts.expired_items || []).forEach(item => {
                    allExpiryItems.push({...item, status: 'expired', statusClass: 'danger', statusText: `Expired ${item.days_expired}d ago`});
                });
                
                // Add expiring soon items
                (expiryAlerts.expiring_30_days || []).forEach(item => {
                    allExpiryItems.push({...item, status: 'soon', statusClass: 'warning', statusText: `${item.days_left} days left`});
                });
                
                // Add expiring in 60 days
                (expiryAlerts.expiring_60_days || []).forEach(item => {
                    allExpiryItems.push({...item, status: 'medium', statusClass: 'info', statusText: `${item.days_left} days left`});
                });

                if (allExpiryItems.length === 0) {
                    expiryAlertsTable.innerHTML = '<tr><td colspan="5" class="text-center text-success"><i class="fas fa-check-circle me-2"></i>No expiry alerts!</td></tr>';
                } else {
                    expiryAlertsTable.innerHTML = '';
                    allExpiryItems.slice(0, 10).forEach(item => { // Show max 10 items
                        const row = `<tr class="${item.status === 'expired' ? 'table-danger' : item.status === 'soon' ? 'table-warning' : ''}">
                            <td>${item.medicine_name}</td>
                            <td>${item.batch_quantity}</td>
                            <td>${new Date(item.expiry_date).toLocaleDateString()}</td>
                            <td><span class="badge bg-${item.statusClass}">${item.statusText}</span></td>
                            <td><small class="text-muted">${item.invoice_number || 'N/A'}</small></td>
                        </tr>`;
                        expiryAlertsTable.innerHTML += row;
                    });
                    if (allExpiryItems.length > 10) {
                        expiryAlertsTable.innerHTML += `<tr><td colspan="5" class="text-center"><a href="#" data-bs-toggle="modal" data-bs-target="#expiryAlertModal">View all ${allExpiryItems.length} items...</a></td></tr>`;
                    }
                }
            }

            // Expiry Modal Tables
            populateExpiryModalTable('expired-modal-body', expiryAlerts.expired_items || [], true);
            populateExpiryModalTable('expiring30-modal-body', expiryAlerts.expiring_30_days || [], false);
            populateExpiryModalTable('expiring60-modal-body', expiryAlerts.expiring_60_days || [], false);
            populateExpiryModalTable('expiring90-modal-body', expiryAlerts.expiring_90_days || [], false);

        } catch (error) {
            console.error('Error loading dashboard summary:', error);
        }
    }

    function populateExpiryModalTable(tableId, items, isExpired) {
        const tableBody = document.getElementById(tableId);
        if (!tableBody) return;

        if (items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No items</td></tr>`;
            return;
        }

        tableBody.innerHTML = '';
        items.forEach(item => {
            const daysText = isExpired ? item.days_expired : item.days_left;
            const row = `<tr>
                <td>${item.medicine_name}</td>
                <td>${item.batch_quantity}</td>
                <td>${new Date(item.expiry_date).toLocaleDateString()}</td>
                <td><span class="badge bg-${isExpired ? 'danger' : 'warning'}">${daysText} ${isExpired ? 'days ago' : 'days'}</span></td>
                <td><small>${item.invoice_number || 'N/A'}</small></td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    }

    loadDashboardSummary();
});
