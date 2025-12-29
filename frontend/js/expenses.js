document.addEventListener("DOMContentLoaded", function() {
    console.log("expenses.js: DOMContentLoaded fired.");

    const expensesTableBody = document.getElementById('expenses-table-body');
    const addExpenseForm = document.getElementById('add-expense-form');

    async function loadExpenses() {
        if (!expensesTableBody) return;
        
        try {
            const expenses = await fetchData('expenses/');
            expensesTableBody.innerHTML = '';
            
            if (expenses.length === 0) {
                expensesTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No expenses found</td></tr>';
                return;
            }

            expenses.forEach((expense, index) => {
                const row = `<tr>
                    <th scope="row">${index + 1}</th>
                    <td>${new Date(expense.expense_date).toLocaleDateString()}</td>
                    <td>${expense.category}</td>
                    <td class="text-danger">-${expense.amount.toFixed(2)}</td>
                    <td>${expense.description || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${expense.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
                expensesTableBody.innerHTML += row;
            });
        } catch (error) {
            console.error('Error loading expenses:', error);
            expensesTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                expense_date: document.getElementById('expense_date').value,
                category: document.getElementById('expense_category').value,
                amount: parseFloat(document.getElementById('expense_amount').value),
                description: document.getElementById('expense_description').value
            };

            try {
                await fetchData('expenses/', 'POST', formData);
                addExpenseForm.reset();
                
                // Hide collapse
                const collapseElement = document.getElementById('collapseExpenseForm');
                const bsCollapse = bootstrap.Collapse.getInstance(collapseElement);
                if (bsCollapse) bsCollapse.hide();
                
                await loadExpenses();
                alert('Expense recorded successfully!');
            } catch (error) {
                console.error('Error recording expense:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    window.deleteExpense = async function(id) {
        if (!confirm('Are you sure you want to delete this expense record?')) return;
        
        try {
            await fetchData(`expenses/${id}`, 'DELETE');
            await loadExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Set default date to today
    const dateInput = document.getElementById('expense_date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    loadExpenses();
});
