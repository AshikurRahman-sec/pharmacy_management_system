document.addEventListener("DOMContentLoaded", function() {
    console.log("activity_logs.js: DOMContentLoaded fired.");
    
    // Redirect if not superadmin
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'superadmin') {
        window.location.href = 'index.html';
        return;
    }

    loadActivityLogs();

    // Hide loader
    const loaderWrapper = document.getElementById("loader-wrapper");
    if (loaderWrapper) {
        setTimeout(() => {
            loaderWrapper.classList.remove("visible");
        }, 500);
    }
});

async function loadActivityLogs() {
    const tableBody = document.getElementById('activity-logs-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading logs...</td></tr>';

    try {
        const logs = await fetchData('activity-logs/');
        
        if (!logs || logs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No activity logs found.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        logs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleString();
            // Try to find username from user_id if user object is not fully populated (though backend might not send user obj yet)
            // Ideally backend schema should include user name or we fetch users. 
            // For now, let's assume we might need to fetch users or just show ID if name missing.
            // Wait, I didn't update the ActivityLog schema to include User details fully or joined load.
            // Let's check the data.
            
            const row = `<tr>
                <td class="text-muted small">${date}</td>
                <td><span class="badge bg-secondary">User #${log.user_id}</span></td>
                <td class="fw-bold text-primary">${log.action}</td>
                <td>${log.details || '-'}</td>
            </tr>`;
            tableBody.innerHTML += row;
        });

    } catch (error) {
        console.error('Error loading logs:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading logs: ${error.message}</td></tr>`;
    }
}
