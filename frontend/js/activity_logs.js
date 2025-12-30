document.addEventListener("DOMContentLoaded", function() {
    if (localStorage.getItem('userRole') !== 'superadmin') {
        window.location.href = 'index.html';
        return;
    }
    
    let pageSize = 10;
    document.getElementById('logs-page-size')?.addEventListener('change', function() {
        pageSize = parseInt(this.value);
        loadActivityLogs(1);
    });

    window.loadActivityLogs = async function(page = 1) {
        const body = document.getElementById('activity-logs-table-body');
        if (!body) return;
        try {
            const skip = (page - 1) * pageSize;
            const res = await fetchData(`activity-logs/?skip=${skip}&limit=${pageSize}`);
            body.innerHTML = '';
            if (!res.items || res.items.length === 0) { 
                body.innerHTML = '<tr><td colspan="4" class="text-center">No logs found</td></tr>';
                document.getElementById('logs-range-info').textContent = "Showing 0 - 0 of 0";
                return;
            }

            const start = res.total === 0 ? 0 : skip + 1;
            const end = Math.min(skip + pageSize, res.total);
            document.getElementById('logs-range-info').textContent = `Showing ${start} - ${end} of ${res.total}`;

            res.items.forEach(log => {
                const user = log.user ? log.user.username : `User #${log.user_id}`;
                body.innerHTML += `<tr><td class="text-muted small">${new Date(log.timestamp).toLocaleString()}</td><td><span class="badge bg-secondary">${user}</span></td><td class="fw-bold text-primary">${log.action}</td><td>${log.details || '-'}</td></tr>`;
            });
            if (res.pages) renderPagination(res.page, res.pages, "logs-pagination", loadActivityLogs);
        } catch (e) {}
    };

    loadActivityLogs();
    setTimeout(() => document.getElementById("loader-wrapper")?.classList.remove("visible"), 500);
});