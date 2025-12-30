document.addEventListener("DOMContentLoaded", function() {
    const expensesTableBody = document.getElementById('expenses-table-body');
    const addExpenseForm = document.getElementById('add-expense-form');
    const pageSize = 10;

    async function loadExpenses(page = 1) {
        if (!expensesTableBody) return;
        try {
            const skip = (page - 1) * pageSize;
            const response = await fetchData(`expenses/?skip=${skip}&limit=${pageSize}`);
            const expenses = response.items ? response.items : response;
            expensesTableBody.innerHTML = '';
            if (expenses.length === 0) { expensesTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No expenses found</td></tr>'; return; }
            expenses.forEach((expense, index) => {
                const sn = (response.page - 1) * pageSize + index + 1;
                expensesTableBody.innerHTML += `<tr><th scope="row">${sn}</th><td>${new Date(expense.expense_date).toLocaleDateString()}</td><td>${expense.category}</td><td class="text-danger">-${expense.amount.toFixed(2)}</td><td>${expense.description || '-'}</td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${expense.id})"><i class="fas fa-trash"></i></button></td></tr>`;
            });
            if (response.pages) renderPagination(response.page, response.pages, "expenses-pagination", loadExpenses);
        } catch (error) {
            expensesTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = { expense_date: document.getElementById('expense_date').value, category: document.getElementById('expense_category').value, amount: parseFloat(document.getElementById('expense_amount').value), description: document.getElementById('expense_description').value };
            try {
                await fetchData('expenses/', 'POST', formData);
                addExpenseForm.reset();
                bootstrap.Collapse.getInstance(document.getElementById('collapseExpenseForm'))?.hide();
                await loadExpenses(1);
                alert('Success!');
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }

    window.deleteExpense = async function(id) {
        if (confirm('Are you sure?')) {
            await fetchData(`expenses/${id}`, 'DELETE');
            await loadExpenses(1);
        }
    };

    const dateInput = document.getElementById('expense_date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    loadExpenses();
});