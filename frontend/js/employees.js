document.addEventListener("DOMContentLoaded", function() {
    console.log("employees.js: DOMContentLoaded fired.");

    const employeesTableBody = document.getElementById('employees-table-body');
    const employeeBillsTableBody = document.getElementById('employee-bills-table-body');
    const addEmployeeForm = document.getElementById('add-employee-form');
    const updateEmployeeForm = document.getElementById('update-employee-form');
    const addEmployeeBillForm = document.getElementById('add-employee-bill-form');
    const billEmployeeSelect = document.getElementById('bill_employee_id');
    const linkUserSelect = document.getElementById('link_user_id');
    const updateLinkUserSelect = document.getElementById('update_link_user_id');

    let allUsers = [];

    async function loadUsers() {
        try {
            const users = await fetchData('users/');
            allUsers = users;
            populateUserDropdowns(users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    function populateUserDropdowns(users) {
        // Filter to only 'employee' role as per requirements
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
                    // Pre-fill name if it's empty
                    document.getElementById('employee_name').value = user.username;
                }
            }
        });
    }

    async function loadEmployees() {
        if (!employeesTableBody && !billEmployeeSelect) return;
        
        try {
            const employees = await fetchData('employees/');
            
            if (employeesTableBody) {
                employeesTableBody.innerHTML = '';
            }
            
            if (billEmployeeSelect) {
                billEmployeeSelect.innerHTML = '<option value="">Select an employee</option>';
            }

            employees.forEach((employee, index) => {
                if (employeesTableBody) {
                    const linkedUser = employee.user ? `<br><small class="text-muted">User: ${employee.user.username}</small>` : '';
                    const row = `<tr>
                        <th scope="row">${index + 1}</th>
                        <td>${employee.name}${linkedUser}</td>
                        <td>${employee.role}</td>
                        <td>${employee.base_salary.toFixed(2)} ৳ <br><small class="text-muted">OT: ${employee.overtime_rate.toFixed(2)}/hr</small></td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick="editEmployee(${employee.id}, '${employee.name}', '${employee.role}', ${employee.base_salary}, ${employee.overtime_rate}, ${employee.user_id || 'null'})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${employee.id})">Delete</button>
                        </td>
                    </tr>`;
                    employeesTableBody.innerHTML += row;
                }

                if (billEmployeeSelect) {
                    const option = `<option value="${employee.id}">${employee.name}</option>`;
                    billEmployeeSelect.innerHTML += option;
                }
            });
        } catch (error) {
            console.error('Error loading employees:', error);
            if (employeesTableBody) {
                employeesTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            }
        }
    }

    async function loadEmployeeBills() {
        if (!employeeBillsTableBody) return;
        
        try {
            const bills = await fetchData('employee-bills/');
            employeeBillsTableBody.innerHTML = '';
            bills.forEach((bill, index) => {
                const row = `<tr>
                    <th scope="row">${index + 1}</th>
                    <td>${bill.employee.name}</td>
                    <td>${new Date(bill.payment_date).toLocaleDateString()}</td>
                    <td>${bill.base_amount}</td>
                    <td>${bill.overtime_amount}</td>
                    <td>${bill.total_amount}</td>
                </tr>`;
                employeeBillsTableBody.innerHTML += row;
            });
        } catch (error) {
            console.error('Error loading employee bills:', error);
            if (employeeBillsTableBody) {
                employeeBillsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            }
        }
    }

    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const linkUserId = document.getElementById('link_user_id').value;
            const formData = {
                name: document.getElementById('employee_name').value,
                role: document.getElementById('employee_role').value,
                base_salary: parseFloat(document.getElementById('base_salary').value),
                overtime_rate: parseFloat(document.getElementById('overtime_rate').value) || 0,
                user_id: linkUserId ? parseInt(linkUserId) : null
            };

            try {
                await fetchData('employees/', 'POST', formData);
                addEmployeeForm.reset();
                // Hide the collapse form after submission
                const collapseElement = document.getElementById('collapseAddEmployeeForm');
                if (collapseElement) {
                    const bsCollapse = bootstrap.Collapse.getInstance(collapseElement);
                    if (bsCollapse) {
                        bsCollapse.hide();
                    }
                }
                await loadEmployees(); // Refresh employee list
                alert('Employee added successfully!');
            } catch (error) {
                console.error('Error adding employee:', error);
                alert(`Error adding employee: ${error.message}`);
            }
        });
    }

    window.editEmployee = function(id, name, role, baseSalary, overtimeRate, userId) {
        document.getElementById('update_employee_id').value = id;
        document.getElementById('update_employee_name').value = name;
        document.getElementById('update_employee_role').value = role;
        document.getElementById('update_base_salary').value = baseSalary;
        document.getElementById('update_overtime_rate').value = overtimeRate;
        document.getElementById('update_link_user_id').value = userId || "";
        
        const updateModal = new bootstrap.Modal(document.getElementById('updateEmployeeModal'));
        updateModal.show();
    };

    if (updateEmployeeForm) {
        updateEmployeeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const employeeId = document.getElementById('update_employee_id').value;
            const linkUserId = document.getElementById('update_link_user_id').value;
            const formData = {
                name: document.getElementById('update_employee_name').value,
                role: document.getElementById('update_employee_role').value,
                base_salary: parseFloat(document.getElementById('update_base_salary').value),
                overtime_rate: parseFloat(document.getElementById('update_overtime_rate').value) || 0,
                user_id: linkUserId ? parseInt(linkUserId) : null
            };

            try {
                await fetchData(`employees/${employeeId}`, 'PUT', formData);
                
                // Hide modal
                const updateModalElement = document.getElementById('updateEmployeeModal');
                const modalInstance = bootstrap.Modal.getInstance(updateModalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }
                
                await loadEmployees();
                alert('Employee updated successfully!');
            } catch (error) {
                console.error('Error updating employee:', error);
                alert(`Error updating employee: ${error.message}`);
            }
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
                // Hide the collapse form after submission
                const collapseElement = document.getElementById('collapsePayEmployeeSalaryForm');
                const bsCollapse = bootstrap.Collapse.getInstance(collapseElement);
                if (bsCollapse) {
                    bsCollapse.hide();
                }
                await loadEmployeeBills(); // Refresh bill list
                alert('Salary paid successfully!');
            } catch (error) {
                console.error('Error paying salary:', error);
                alert(`Error paying salary: ${error.message}`);
            }
        });
    }

    window.deleteEmployee = async function(employeeId) {
        if (!confirm('Are you sure you want to delete this employee?')) {
            return;
        }

        try {
            await fetchData(`employees/${employeeId}`, 'DELETE');
            await loadEmployees();
            alert('Employee deleted successfully!');
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert(`Error deleting employee: ${error.message}`);
        }
    };

    // Initial data load
    loadUsers();
    loadEmployees();
    loadEmployeeBills();

    // Hide loader after initial load
    const loaderWrapper = document.getElementById("loader-wrapper");
    if (loaderWrapper) {
        setTimeout(() => {
            loaderWrapper.classList.remove("visible");
        }, 500);
    }
});
