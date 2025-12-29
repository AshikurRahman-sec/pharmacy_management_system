let allUsers = [];

document.addEventListener("DOMContentLoaded", function() {
    console.log("users.js: Initializing user management.");
    
    const usersTableBody = document.getElementById("users-table-body");
    const createUserForm = document.getElementById("create-user-form");

    async function loadUsers() {
        if (!usersTableBody) return;
        try {
            const users = await fetchData("users/"); 
            allUsers = users;
            renderUsersTable(users);
        } catch (error) {
            console.error("loadUsers: Failed to fetch users:", error);
            usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load users.</td></tr>';
        }
    }

    function renderUsersTable(users) {
        if (!usersTableBody) return;

        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            return;
        }

        let html = '';
        users.forEach((user, index) => {
            const statusBadge = user.is_active
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-danger">Inactive</span>';

            const createdDate = new Date(user.created_at).toLocaleDateString();

            html += `<tr>
                <th scope="row">${index + 1}</th>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-info">${user.role}</span></td>
                <td>${statusBadge}</td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
        usersTableBody.innerHTML = html;
    }

    if (createUserForm) {
        createUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            const formData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                password: password,
                role: document.getElementById('role').value
            };

            try {
                await fetchData('users/', 'POST', formData);
                alert('User created successfully!');
                createUserForm.reset();
                
                const collapseElement = document.getElementById('collapseUserForm');
                const bsCollapse = bootstrap.Collapse.getInstance(collapseElement);
                if (bsCollapse) bsCollapse.hide();
                
                await loadUsers();
            } catch (error) {
                console.error('Error creating user:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    window.deleteUser = async function(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await fetchData(`users/${userId}`, 'DELETE');
            await loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(`Error: ${error.message}`);
        }
    };
    
    loadUsers();
});
