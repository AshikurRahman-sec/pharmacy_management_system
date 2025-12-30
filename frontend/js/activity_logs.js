document.addEventListener("DOMContentLoaded", function() {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'superadmin') {
        window.location.href = 'index.html';
        return;
    }
    loadActivityLogs();
    setTimeout(() => document.getElementById("loader-wrapper")?.classList.remove("visible"), 500);
});

async function loadActivityLogs(page = 1) {
    const tableBody = document.getElementById('activity-logs-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading logs...</td></tr>';
    const pageSize = 10;
    const skip = (page - 1) * pageSize;
    try {
        const response = await fetchData(`activity-logs/?skip=${skip}&limit=${pageSize}`);
        const logs = response.items ? response.items : response;
        if (!logs || logs.length === 0) { tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No activity logs found.</td></tr>'; return; }
        tableBody.innerHTML = '';
        logs.forEach(log => {
            const username = log.user ? log.user.username : `User #${log.user_id}`;
            tableBody.innerHTML += `<tr><td class="text-muted small">${new Date(log.timestamp).toLocaleString()}</td><td><span class="badge bg-secondary">${username}</span></td><td class="fw-bold text-primary">${log.action}</td><td>${log.details || '-'}</td></tr>`;
        });
        if (response.pages) renderPagination(response.page, response.pages, "logs-pagination", loadActivityLogs);
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}