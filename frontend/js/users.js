document.addEventListener("DOMContentLoaded", function() {
    const usersTableBody = document.getElementById("users-table-body");
    const createUserForm = document.getElementById("create-user-form");
    
    let currentPage = 1;
    const pageSize = 10;

    async function loadUsers(page = 1) {
        if (!usersTableBody) return;
        try {
            currentPage = page;
            const skip = (page - 1) * pageSize;
            const response = await fetchData(`users/?skip=${skip}&limit=${pageSize}`);
            const users = response.items ? response.items : response;
            renderUsersTable(users, response.page || 1);
            if (response.pages) renderPagination(response.page, response.pages, "users-pagination", loadUsers);
        } catch (error) {
            if (usersTableBody) usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load users.</td></tr>';
        }
    }

    function renderUsersTable(users, page = 1) {
        if (!usersTableBody) return;
        if (!users || users.length === 0) { usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>'; return; }
        let html = '';
        users.forEach((user, index) => {
            const sn = (page - 1) * pageSize + index + 1;
            const statusBadge = user.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>';
            html += `<tr><th scope="row">${sn}</th><td>${user.username}</td><td>${user.email}</td><td><span class="badge bg-info">${user.role}</span></td><td>${statusBadge}</td><td>${new Date(user.created_at).toLocaleDateString()}</td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        usersTableBody.innerHTML = html;
    }

    if (createUserForm) {
        createUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            if (password !== document.getElementById('confirm-password').value) { alert("Passwords do not match!"); return; }
            const formData = { username: document.getElementById('username').value, email: document.getElementById('email').value, password: password, role: document.getElementById('role').value };
            try {
                await fetchData('users/', 'POST', formData);
                alert('Success!'); createUserForm.reset();
                bootstrap.Collapse.getInstance(document.getElementById('collapseUserForm'))?.hide();
                await loadUsers(1);
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }

    window.deleteUser = async function(id) {
        if (confirm('Delete this user?')) {
            await fetchData(`users/${id}`, 'DELETE');
            await loadUsers(currentPage);
        }
    };
    
    loadUsers();
});