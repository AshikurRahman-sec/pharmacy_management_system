document.addEventListener("DOMContentLoaded", function() {
    console.log("sales.js: DOMContentLoaded fired.");

    const salesTableBody = document.getElementById('sales-table-body');
    const addSaleForm = document.getElementById('add-sale-form');
    const saleItemsContainer = document.getElementById('sale-items-container');
    const salesFilter = document.getElementById('sales-filter');
    const salesDateFilter = document.getElementById('sales-date-filter');

    // Store current sale data for printing
    let currentSaleData = null;
    let allSales = [];

    // Check URL parameters for initial filter
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilter = urlParams.get('filter');
    if (initialFilter && salesFilter) {
        salesFilter.value = initialFilter;
    }

    async function loadSales() {
        if (!salesTableBody) return;
        try {
            const sales = await fetchData('sales/');
            allSales = sales;
            filterAndDisplaySales();
        } catch (error) {
            console.error('Error loading sales:', error);
            if (salesTableBody) {
                salesTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            }
        }
    }

    function filterAndDisplaySales() {
        let filtered = [...allSales];
        const filterVal = salesFilter?.value || 'all';
        const dateVal = salesDateFilter?.value || '';
        const today = new Date().toISOString().split('T')[0];

        // Apply filter
        if (filterVal === 'today') {
            filtered = filtered.filter(s => s.sale_date === today);
        } else if (filterVal === 'due') {
            filtered = filtered.filter(s => s.due_amount > 0);
        } else if (filterVal === 'paid') {
            filtered = filtered.filter(s => s.due_amount === 0);
        }

        // Apply date filter
        if (dateVal) {
            filtered = filtered.filter(s => s.sale_date === dateVal);
        }

        displaySales(filtered);
    }

    function displaySales(sales) {
        salesTableBody.innerHTML = '';
        if (sales.length === 0) {
            salesTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No sales found matching filter</td></tr>';
            return;
        }
        sales.forEach((sale, index) => {
            const row = `<tr>
                <th scope="row">${index + 1}</th>
                <td>${new Date(sale.sale_date).toLocaleDateString()}</td>
                <td>${sale.buyer_name || 'Cash Sale'}</td>
                <td>${sale.buyer_mobile || '-'}</td>
                <td>${sale.total_amount.toFixed(2)} ৳</td>
                <td class="text-success">${sale.amount_paid.toFixed(2)} ৳</td>
                <td class="${sale.due_amount > 0 ? 'text-danger fw-bold' : 'text-success'}">${sale.due_amount.toFixed(2)} ৳</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewSaleItems(${sale.id})" title="View Details"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-success" onclick="printSaleReceipt(${sale.id})" title="Print Receipt"><i class="fas fa-print"></i></button>
                    ${sale.due_amount > 0 ? `<button class="btn btn-sm btn-primary" onclick="promptUpdatePayment(${sale.id}, ${sale.due_amount})" title="Pay Due"><i class="fas fa-money-bill"></i></button>` : ''}
                </td>
            </tr>`;
            salesTableBody.innerHTML += row;
        });
    }

    // Filter event listeners
    if (salesFilter) {
        salesFilter.addEventListener('change', filterAndDisplaySales);
    }
    if (salesDateFilter) {
        salesDateFilter.addEventListener('change', filterAndDisplaySales);
    }

    async function populateMedicineOptions(selectElement) {
        console.log("populateMedicineOptions: Fetching medicines...");
        try {
            const medicines = await fetchData('medicines/');
            console.log("populateMedicineOptions: Medicines fetched:", medicines);
            selectElement.innerHTML = '<option value="">Select Medicine</option>';
            if (medicines && medicines.length > 0) {
                medicines.forEach(medicine => {
                    const stockClass = medicine.stock_quantity <= 0 ? 'text-danger' : medicine.stock_quantity < 10 ? 'text-warning' : '';
                    const option = document.createElement('option');
                    option.value = medicine.id;
                    option.textContent = `${medicine.name} (Stock: ${medicine.stock_quantity}) - ${medicine.selling_price.toFixed(2)} ৳`;
                    option.dataset.stock = medicine.stock_quantity;
                    option.dataset.price = medicine.selling_price;
                    if (medicine.stock_quantity <= 0) {
                        option.disabled = true;
                    }
                    selectElement.appendChild(option);
                });
            } else {
                console.warn("populateMedicineOptions: No medicines found.");
                selectElement.innerHTML += '<option value="" disabled>No medicines available</option>';
            }
        } catch (error) {
            console.error('Error populating medicine options:', error);
            selectElement.innerHTML = '<option value="">Error loading medicines</option>';
        }
    }

    function createSaleItemRow() {
        const newItemRow = document.createElement('div');
        newItemRow.classList.add('row', 'sale-item', 'mb-3', 'align-items-end');
        newItemRow.innerHTML = `
            <div class="col-md-6">
                <label class="form-label">Medicine</label>
                <select class="form-select medicine-select" required></select>
            </div>
            <div class="col-md-3">
                <label class="form-label">Quantity</label>
                <input type="number" class="form-control quantity-input" required min="1" value="1">
            </div>
            <div class="col-md-3">
                <label class="form-label">Subtotal</label>
                <input type="text" class="form-control subtotal-display" readonly value="0.00 ৳">
            </div>
        `;
        const medicineSelect = newItemRow.querySelector('.medicine-select');
        const quantityInput = newItemRow.querySelector('.quantity-input');
        const subtotalDisplay = newItemRow.querySelector('.subtotal-display');
        
        populateMedicineOptions(medicineSelect);
        
        // Update subtotal on change
        function updateSubtotal() {
            const selectedOption = medicineSelect.options[medicineSelect.selectedIndex];
            if (selectedOption && selectedOption.dataset.price) {
                const price = parseFloat(selectedOption.dataset.price) || 0;
                const qty = parseInt(quantityInput.value) || 0;
                subtotalDisplay.value = (price * qty).toFixed(2) + ' ৳';
            } else {
                subtotalDisplay.value = '0.00 ৳';
            }
            updateGrandTotal();
        }
        
        medicineSelect.addEventListener('change', updateSubtotal);
        quantityInput.addEventListener('input', updateSubtotal);
        
        return newItemRow;
    }

    function updateGrandTotal() {
        let grandTotal = 0;
        document.querySelectorAll('.sale-item').forEach(item => {
            const subtotalText = item.querySelector('.subtotal-display')?.value || '0';
            const subtotal = parseFloat(subtotalText.replace(' ৳', '')) || 0;
            grandTotal += subtotal;
        });
        const grandTotalEl = document.getElementById('grand-total-display');
        if (grandTotalEl) {
            grandTotalEl.textContent = grandTotal.toFixed(2) + ' ৳';
        }
    }

    // Initialize: Clear and add the first row to ensure it's properly set up
    if (saleItemsContainer) {
        saleItemsContainer.innerHTML = '';
        saleItemsContainer.appendChild(createSaleItemRow());
        
        // Add "Add More Items" button
        const addMoreBtn = document.createElement('button');
        addMoreBtn.type = 'button';
        addMoreBtn.className = 'btn btn-outline-primary btn-sm mb-3';
        addMoreBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Add More Items';
        addMoreBtn.onclick = function() {
            saleItemsContainer.insertBefore(createSaleItemRow(), addMoreBtn);
        };
        saleItemsContainer.appendChild(addMoreBtn);
    }

    if (addSaleForm) {
        addSaleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const items = [];
            document.querySelectorAll('.sale-item').forEach(item => {
                const medicineId = item.querySelector('.medicine-select').value;
                const quantity = item.querySelector('.quantity-input').value;
                if (medicineId && quantity) {
                    items.push({
                        medicine_id: parseInt(medicineId),
                        quantity: parseInt(quantity)
                    });
                }
            });

            if (items.length === 0) {
                alert('Please add at least one item');
                return;
            }

            const formData = {
                sale_date: document.getElementById('sale_date').value,
                buyer_name: document.getElementById('buyer_name').value || null,
                buyer_mobile: document.getElementById('buyer_mobile').value || null,
                buyer_address: document.getElementById('buyer_address').value || null,
                amount_paid: parseFloat(document.getElementById('amount_paid').value) || 0,
                items: items
            };

            try {
                const newSale = await fetchData('sales/', 'POST', formData);
                addSaleForm.reset();
                saleItemsContainer.innerHTML = '';
                saleItemsContainer.appendChild(createSaleItemRow());
                
                // Re-add the "Add More Items" button
                const addMoreBtn = document.createElement('button');
                addMoreBtn.type = 'button';
                addMoreBtn.className = 'btn btn-outline-primary btn-sm mb-3';
                addMoreBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Add More Items';
                addMoreBtn.onclick = function() {
                    saleItemsContainer.insertBefore(createSaleItemRow(), addMoreBtn);
                };
                saleItemsContainer.appendChild(addMoreBtn);
                
                await loadSales();
                
                // Ask if user wants to print receipt
                if (confirm('Sale recorded successfully! Print receipt?')) {
                    printSaleReceipt(newSale.id);
                }
            } catch (error) {
                console.error('Error recording sale:', error);
                alert(`Error recording sale: ${error.message}`);
            }
        });
    }

    window.deleteSale = async function(saleId) {
        if (!confirm('Are you sure you want to delete this sale record?')) {
            return;
        }

        try {
            await fetchData(`sales/${saleId}`, 'DELETE');
            await loadSales();
            alert('Sale record deleted successfully!');
        } catch (error) {
            console.error('Error deleting sale:', error);
            alert(`Error deleting sale: ${error.message}`);
        }
    };

    window.promptUpdatePayment = async function(saleId, currentDue) {
        const amountStr = prompt(`Current Due: ${currentDue.toFixed(2)} ৳\nEnter amount to pay:`, currentDue.toFixed(2));
        if (amountStr === null) return;
        
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        try {
            await fetchData(`sales/${saleId}/payment`, 'PATCH', { amount_paid: amount });
            alert("Payment updated successfully!");
            await loadSales();
        } catch (error) {
            console.error('Error updating payment:', error);
            alert(`Error updating payment: ${error.message}`);
        }
    };
    
    window.viewSaleItems = async function(saleId) {
        try {
            const sale = await fetchData(`sales/${saleId}`);
            currentSaleData = sale;
            
            // Populate modal
            document.getElementById('modal-sale-id').textContent = `#${sale.id}`;
            document.getElementById('modal-sale-date').textContent = new Date(sale.sale_date).toLocaleDateString();
            document.getElementById('modal-buyer-name').textContent = sale.buyer_name || 'Cash Sale';
            document.getElementById('modal-buyer-mobile').textContent = sale.buyer_mobile || '-';
            document.getElementById('modal-buyer-address').textContent = sale.buyer_address || '-';
            
            const itemsBody = document.getElementById('sale-items-table-body');
            itemsBody.innerHTML = '';
            
            sale.items.forEach((item, index) => {
                const subtotal = item.quantity * item.price_at_sale;
                const row = `<tr>
                    <td>${index + 1}</td>
                    <td>${item.medicine.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.price_at_sale.toFixed(2)} ৳</td>
                    <td>${subtotal.toFixed(2)} ৳</td>
                </tr>`;
                itemsBody.innerHTML += row;
            });
            
            document.getElementById('modal-total-amount').textContent = `${sale.total_amount.toFixed(2)} ৳`;
            document.getElementById('modal-paid-amount').textContent = `${sale.amount_paid.toFixed(2)} ৳`;
            document.getElementById('modal-due-amount').textContent = `${sale.due_amount.toFixed(2)} ৳`;
            
            // Hide due row if no due
            const dueRow = document.getElementById('modal-due-row');
            if (dueRow) {
                dueRow.style.display = sale.due_amount > 0 ? '' : 'none';
            }
            
            const modal = new bootstrap.Modal(document.getElementById('viewSaleItemsModal'));
            modal.show();
        } catch (error) {
            console.error('Error fetching sale details:', error);
            alert('Error loading sale details: ' + error.message);
        }
    };

    window.printSaleReceipt = async function(saleId) {
        try {
            let sale = currentSaleData;
            if (!sale || sale.id !== saleId) {
                sale = await fetchData(`sales/${saleId}`);
                currentSaleData = sale;
            }
            
            // Populate print template
            document.getElementById('print-sale-id').textContent = `#${sale.id}`;
            document.getElementById('print-sale-date').textContent = new Date(sale.sale_date).toLocaleDateString();
            document.getElementById('print-buyer-name').textContent = sale.buyer_name || 'Cash Customer';
            
            const printItemsBody = document.getElementById('print-items-body');
            printItemsBody.innerHTML = '';
            
            sale.items.forEach(item => {
                const subtotal = item.quantity * item.price_at_sale;
                const row = `<tr>
                    <td style="text-align: left; padding: 3px 0;">${item.medicine.name}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">${subtotal.toFixed(2)}</td>
                </tr>`;
                printItemsBody.innerHTML += row;
            });
            
            document.getElementById('print-total').textContent = `${sale.total_amount.toFixed(2)} ৳`;
            document.getElementById('print-paid').textContent = `${sale.amount_paid.toFixed(2)} ৳`;
            document.getElementById('print-due').textContent = `${sale.due_amount.toFixed(2)} ৳`;
            
            const printDueRow = document.getElementById('print-due-row');
            if (printDueRow) {
                printDueRow.style.display = sale.due_amount > 0 ? '' : 'none';
            }
            
            // Print
            printReceipt();
        } catch (error) {
            console.error('Error printing receipt:', error);
            alert('Error printing receipt: ' + error.message);
        }
    };

    window.printReceipt = function() {
        const receiptContent = document.getElementById('receipt-content');
        if (!receiptContent) return;
        
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sales Receipt</title>
                <style>
                    body { margin: 0; padding: 20px; }
                    @media print {
                        body { margin: 0; padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${receiptContent.outerHTML}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Initial data load
    loadSales();
    
    // Set default sale date to today
    const saleDateInput = document.getElementById('sale_date');
    if (saleDateInput && !saleDateInput.value) {
        saleDateInput.value = new Date().toISOString().split('T')[0];
    }

    // Hide loader
    const loaderWrapper = document.getElementById("loader-wrapper");
    if (loaderWrapper) {
        setTimeout(() => {
            loaderWrapper.classList.remove("visible");
        }, 500);
    }
});
