document.addEventListener("DOMContentLoaded", function() {
    const employeesTableBody = document.getElementById('employees-table-body');
    const employeeBillsTableBody = document.getElementById('employee-bills-table-body');
    const addEmployeeForm = document.getElementById('add-employee-form');
    const updateEmployeeForm = document.getElementById('update-employee-form');
    const addEmployeeBillForm = document.getElementById('add-employee-bill-form');
    const billEmployeeSelect = document.getElementById('bill_employee_id');
    const linkUserSelect = document.getElementById('link_user_id');
    const updateLinkUserSelect = document.getElementById('update_link_user_id');

    let allUsers = [];
    const pageSize = 10;

    async function loadUsers() {
        try {
            const response = await fetchData('users/?limit=1000');
            const users = response.items ? response.items : response;
            allUsers = users;
            populateUserDropdowns(users);
        } catch (error) {}
    }

    function populateUserDropdowns(users) {
        const employeeUsers = users.filter(u => u.role === 'employee');
        const options = '<option value="">Choose User...</option>' + 
            employeeUsers.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
        
        if (linkUserSelect) linkUserSelect.innerHTML = options;
        if (updateLinkUserSelect) updateLinkUserSelect.innerHTML = options;
    }

    if (linkUserSelect) {
        linkUserSelect.addEventListener('change', function() {
            const selectedUserId = this.value;
            if (selectedUserId) {
                const user = allUsers.find(u => u.id == selectedUserId);
                if (user && !document.getElementById('employee_name').value) {
                    document.getElementById('employee_name').value = user.username;
                }
            }
        });
    }

    async function loadEmployees(page = 1) {
        if (!employeesTableBody && !billEmployeeSelect) return;
        try {
            const skip = (page - 1) * pageSize;
            const response = await fetchData(`employees/?skip=${skip}&limit=${pageSize}`);
            const employees = response.items ? response.items : response;

            if (employeesTableBody) employeesTableBody.innerHTML = '';
            if (billEmployeeSelect) billEmployeeSelect.innerHTML = '<option value="">Select an employee</option>';

            employees.forEach((employee, index) => {
                if (employeesTableBody) {
                    const sn = (response.page - 1) * pageSize + index + 1;
                    const linkedUser = employee.user ? `<br><small class="text-muted">User: ${employee.user.username}</small>` : '';
                    employeesTableBody.innerHTML += `<tr>
                        <th scope="row">${sn}</th>
                        <td>${employee.name}${linkedUser}</td>
                        <td>${employee.role}</td>
                        <td>${employee.base_salary.toFixed(2)} ৳ <br><small class="text-muted">OT: ${employee.overtime_rate.toFixed(2)}/hr</small></td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick="editEmployee(${employee.id}, '${employee.name}', '${employee.role}', ${employee.base_salary}, ${employee.overtime_rate}, ${employee.user_id || 'null'})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${employee.id})">Delete</button>
                        </td>
                    </tr>`;
                }
                if (billEmployeeSelect) {
                    billEmployeeSelect.innerHTML += `<option value="${employee.id}">${employee.name}</option>`;
                }
            });

            if (response.pages) renderPagination(response.page, response.pages, "employees-pagination", loadEmployees);
        } catch (error) {
            if (employeesTableBody) employeesTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    async function loadEmployeeBills(page = 1) {
        if (!employeeBillsTableBody) return;
        try {
            const skip = (page - 1) * pageSize;
            const response = await fetchData(`employee-bills/?skip=${skip}&limit=${pageSize}`);
            const bills = response.items ? response.items : response;

            employeeBillsTableBody.innerHTML = '';
            bills.forEach((bill, index) => {
                const sn = (response.page - 1) * pageSize + index + 1;
                employeeBillsTableBody.innerHTML += `<tr>
                    <th scope="row">${sn}</th>
                    <td>${bill.employee.name}</td>
                    <td>${new Date(bill.payment_date).toLocaleDateString()}</td>
                    <td>${bill.base_amount}</td>
                    <td>${bill.overtime_amount}</td>
                    <td>${bill.total_amount}</td>
                </tr>`;
            });

            if (response.pages) renderPagination(response.page, response.pages, "payroll-pagination", loadEmployeeBills);
        } catch (error) {
            if (employeeBillsTableBody) employeeBillsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                name: document.getElementById('employee_name').value,
                role: document.getElementById('employee_role').value,
                base_salary: parseFloat(document.getElementById('base_salary').value),
                overtime_rate: parseFloat(document.getElementById('overtime_rate').value) || 0,
                user_id: document.getElementById('link_user_id').value ? parseInt(document.getElementById('link_user_id').value) : null
            };
            try {
                await fetchData('employees/', 'POST', formData);
                addEmployeeForm.reset();
                bootstrap.Collapse.getInstance(document.getElementById('collapseAddEmployeeForm'))?.hide();
                await loadEmployees(1);
                alert('Success!');
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }

    window.editEmployee = function(id, name, role, baseSalary, overtimeRate, userId) {
        document.getElementById('update_employee_id').value = id;
        document.getElementById('update_employee_name').value = name;
        document.getElementById('update_employee_role').value = role;
        document.getElementById('update_base_salary').value = baseSalary;
        document.getElementById('update_overtime_rate').value = overtimeRate;
        document.getElementById('update_link_user_id').value = userId || "";
        new bootstrap.Modal(document.getElementById('updateEmployeeModal')).show();
    };

    if (updateEmployeeForm) {
        updateEmployeeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = document.getElementById('update_employee_id').value;
            const formData = {
                name: document.getElementById('update_employee_name').value,
                role: document.getElementById('update_employee_role').value,
                base_salary: parseFloat(document.getElementById('update_base_salary').value),
                overtime_rate: parseFloat(document.getElementById('update_overtime_rate').value) || 0,
                user_id: document.getElementById('update_link_user_id').value ? parseInt(document.getElementById('update_link_user_id').value) : null
            };
            try {
                await fetchData(`employees/${id}`, 'PUT', formData);
                bootstrap.Modal.getInstance(document.getElementById('updateEmployeeModal'))?.hide();
                await loadEmployees(1);
                alert('Updated!');
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }

    if (addEmployeeBillForm) {
        addEmployeeBillForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                employee_id: parseInt(document.getElementById('bill_employee_id').value),
                payment_date: document.getElementById('payment_date').value,
                base_amount: parseFloat(document.getElementById('base_amount').value),
                overtime_amount: parseFloat(document.getElementById('overtime_amount').value)
            };
            try {
                await fetchData('employee-bills/', 'POST', formData);
                addEmployeeBillForm.reset();
                bootstrap.Collapse.getInstance(document.getElementById('collapsePaySalaryForm'))?.hide();
                await loadEmployeeBills(1);
                alert('Paid!');
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }

    window.deleteEmployee = async function(id) {
        if (confirm('Are you sure?')) {
            await fetchData(`employees/${id}`, 'DELETE');
            await loadEmployees(1);
        }
    };

    loadUsers(); loadEmployees(); loadEmployeeBills();
    setTimeout(() => document.getElementById("loader-wrapper")?.classList.remove("visible"), 500);
});