document.addEventListener("DOMContentLoaded", function() {
    const usersTableBody = document.getElementById("users-table-body");
    const createUserForm = document.getElementById("create-user-form");
    let pageSize = 10;

    document.getElementById('users-page-size')?.addEventListener('change', function() {
        pageSize = parseInt(this.value);
        loadUsers(1);
    });

    async function loadUsers(page = 1) {
        if (!usersTableBody) return;
        try {
            const skip = (page - 1) * pageSize;
            const response = await fetchData(`users/?skip=${skip}&limit=${pageSize}`);
            const users = response.items ? response.items : response;
            
            const start = response.total === 0 ? 0 : skip + 1;
            const end = Math.min(skip + pageSize, response.total);
            document.getElementById('users-range-info').textContent = `Showing ${start} - ${end} of ${response.total}`;

            renderUsersTable(users, response.page || 1);
            if (response.pages) renderPagination(response.page, response.pages, "users-pagination", loadUsers);
        } catch (error) {}
    }

    function renderUsersTable(users, page = 1) {
        if (!usersTableBody) return;
        if (!users || users.length === 0) { usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No records found</td></tr>'; return; }
        usersTableBody.innerHTML = users.map((user, index) => {
            const sn = (page - 1) * pageSize + index + 1;
            return `<tr><th scope="row">${sn}</th><td>${user.username}</td><td>${user.email}</td><td><span class="badge bg-info">${user.role}</span></td><td><span class="badge ${user.is_active?'bg-success':'bg-danger'}">${user.is_active?'Active':'Inactive'}</span></td><td>${new Date(user.created_at).toLocaleDateString()}</td><td><button class="btn btn-sm btn-link p-0 text-danger" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button></td></tr>`;
        }).join('');
    }

    if (createUserForm) {
        createUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = { username: document.getElementById('username').value, email: document.getElementById('email').value, password: document.getElementById('password').value, role: document.getElementById('role').value };
            try {
                await fetchData('users/', 'POST', formData);
                createUserForm.reset();
                bootstrap.Collapse.getInstance(document.getElementById('collapseUserForm'))?.hide();
                await loadUsers(1);
            } catch (error) {}
        });
    }

    window.deleteUser = async function(id) {
        if (confirm('Delete user?')) {
            await fetchData(`users/${id}`, 'DELETE');
            await loadUsers(1);
        }
    };
    loadUsers();
});