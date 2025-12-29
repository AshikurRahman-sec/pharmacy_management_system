document.addEventListener("DOMContentLoaded", function() {
    console.log("inventory.js: DOMContentLoaded fired.");
    
    const medicinesTableBody = document.getElementById("medicines-table-body");
    const medicineInput = document.getElementById('medicine-input');
    
    // Invoice Management
    const addItemBtn = document.getElementById('add-item-to-list-btn');
    const clearItemBtn = document.getElementById('clear-item-btn');
    const saveInvoiceBtn = document.getElementById('save-invoice-btn');
    const invoiceItemsBody = document.getElementById('invoice-items-body');
    const invoiceSubtotalDisplay = document.getElementById('invoice-subtotal');
    const invoiceTotalDisplay = document.getElementById('invoice-total-amount');
    const invoiceDiscountInput = document.getElementById('invoice-discount-input');
    const invoiceNumberInput = document.getElementById('invoiceNumber');
    
    function generateInvoiceNumber() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `INV-${datePart}-${randomPart}`;
    }

    if (invoiceNumberInput && !invoiceNumberInput.value) {
        invoiceNumberInput.value = generateInvoiceNumber();
    }
    
    // Invoice Check Logic
    if (invoiceNumberInput) {
        const feedback = document.createElement('small');
        feedback.id = 'invoice-feedback';
        feedback.style.display = 'block';
        feedback.style.marginTop = '4px';
        feedback.style.fontWeight = 'bold';
        
        async function checkInvoice() {
            let val = invoiceNumberInput.value.trim();
            if (!val) {
                feedback.textContent = '';
                return;
            }
            try {
                let res = await fetchData(`add_purchase/check/${encodeURIComponent(val)}`);
                
                if (!res.exists && val.lastIndexOf('-') > 3) {
                    const strippedVal = val.substring(0, val.lastIndexOf('-'));
                    const resStripped = await fetchData(`add_purchase/check/${encodeURIComponent(strippedVal)}`);
                    if (resStripped.exists) {
                        res = resStripped;
                    }
                }

                if (res.exists) {
                    feedback.textContent = `Invoice exists - Items will be added to it.`;
                    feedback.className = 'text-primary';
                    
                    if (res.supplier_name) {
                        document.getElementById('batchSupplierName').value = res.supplier_name;
                    }
                    if (res.purchase_date) {
                        document.getElementById('purchaseDate').value = res.purchase_date;
                    }
                    const discInput = document.getElementById('invoice-discount-input');
                    if (discInput) {
                        discInput.value = parseFloat(res.invoice_discount || 0).toFixed(2);
                    }
                    renderInvoiceItems();
                } else {
                    feedback.textContent = 'New Invoice';
                    feedback.className = 'text-success';
                }
            } catch (error) {
                console.error("Error checking invoice:", error);
                feedback.textContent = 'Error checking invoice';
                feedback.className = 'text-danger';
            }
        }

        invoiceNumberInput.addEventListener('blur', checkInvoice);
        invoiceNumberInput.addEventListener('input', debounce(checkInvoice, 500));

        const parent = invoiceNumberInput.parentElement;
        if (parent && !parent.querySelector('#generate-invoice-btn')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'input-group';
            parent.replaceChild(wrapper, invoiceNumberInput);
            wrapper.appendChild(invoiceNumberInput);
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-outline-secondary';
            btn.id = 'generate-invoice-btn';
            btn.textContent = 'Generate';
            btn.onclick = function() {
                invoiceNumberInput.value = generateInvoiceNumber();
                checkInvoice();
            };
            wrapper.appendChild(btn);
            parent.appendChild(feedback);
        }
        
        if (invoiceNumberInput.value) checkInvoice();
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    let pieceUnitId = null;
    let invoiceItems = [];
    let allMedicines = [];
    let allSuppliers = [];

    // Search and filter elements
    const medicineSearch = document.getElementById('medicine-search');
    const stockFilter = document.getElementById('stock-filter');
    const sortBy = document.getElementById('sort-by');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const noResultsMessage = document.getElementById('no-results-message');

    // Fetch and display medicines
    async function fetchMedicines() {
        try {
            const medicines = await fetchData("medicines/");
            allMedicines = medicines;
            
            // Update stock count badge
            const stockBadge = document.getElementById('stock-count-badge');
            if (stockBadge) {
                stockBadge.textContent = `${medicines.length} item${medicines.length !== 1 ? 's' : ''}`;
            }
            
            displayMedicines(medicines);
        } catch (error) {
            console.error("fetchMedicines: Failed:", error);
            if (medicinesTableBody) {
                medicinesTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading medicines</td></tr>';
            }
        }
    }

    // Fetch suppliers for suggestions
    async function fetchSuppliers() {
        try {
            const suppliers = await fetchData("suppliers/");
            allSuppliers = suppliers;
        } catch (error) {
            console.error("fetchSuppliers: Failed:", error);
        }
    }

    function displayMedicines(medicines) {
        if (!medicinesTableBody) return;
        
        medicinesTableBody.innerHTML = "";
        
        if (medicines.length === 0) {
            medicinesTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No medicines found.</td></tr>';
            if (noResultsMessage) noResultsMessage.classList.remove('d-none');
            return;
        }
        
        if (noResultsMessage) noResultsMessage.classList.add('d-none');
        
        medicines.forEach((medicine, index) => {
            const stockClass = medicine.stock_quantity === 0 ? 'text-danger fw-bold' : 
                              medicine.stock_quantity < 10 ? 'text-warning fw-bold' : 'text-success';
            const row = `<tr class="${medicine.stock_quantity === 0 ? 'table-danger' : medicine.stock_quantity < 10 ? 'table-warning' : ''}">
                <th scope="row">${index + 1}</th>
                <td><strong>${medicine.name}</strong></td>
                <td class="${stockClass}">${medicine.stock_quantity}</td>
                <td>${medicine.purchase_price.toFixed(2)} ৳</td>
                <td>${medicine.selling_price.toFixed(2)} ৳</td>
                <td>${medicine.purchase_date || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteMedicine(${medicine.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
            medicinesTableBody.innerHTML += row;
        });
    }

    function filterAndSortMedicines() {
        let filtered = [...allMedicines];
        
        // Search filter
        const searchTerm = medicineSearch?.value?.toLowerCase() || '';
        if (searchTerm) {
            filtered = filtered.filter(m => m.name.toLowerCase().includes(searchTerm));
        }
        
        // Stock filter
        const stockFilterVal = stockFilter?.value || 'all';
        if (stockFilterVal === 'low') {
            filtered = filtered.filter(m => m.stock_quantity > 0 && m.stock_quantity < 10);
        } else if (stockFilterVal === 'out') {
            filtered = filtered.filter(m => m.stock_quantity === 0);
        } else if (stockFilterVal === 'available') {
            filtered = filtered.filter(m => m.stock_quantity > 0);
        }
        
        // Sort
        const sortVal = sortBy?.value || 'name';
        if (sortVal === 'name') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortVal === 'stock-asc') {
            filtered.sort((a, b) => a.stock_quantity - b.stock_quantity);
        } else if (sortVal === 'stock-desc') {
            filtered.sort((a, b) => b.stock_quantity - a.stock_quantity);
        } else if (sortVal === 'price-asc') {
            filtered.sort((a, b) => a.selling_price - b.selling_price);
        } else if (sortVal === 'price-desc') {
            filtered.sort((a, b) => b.selling_price - a.selling_price);
        }
        
        displayMedicines(filtered);
    }

    // Event listeners for search and filter
    if (medicineSearch) {
        medicineSearch.addEventListener('input', debounce(filterAndSortMedicines, 300));
    }
    if (stockFilter) {
        stockFilter.addEventListener('change', filterAndSortMedicines);
    }
    if (sortBy) {
        sortBy.addEventListener('change', filterAndSortMedicines);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            if (medicineSearch) medicineSearch.value = '';
            if (stockFilter) stockFilter.value = 'all';
            if (sortBy) sortBy.value = 'name';
            displayMedicines(allMedicines);
        });
    }
    
    window.deleteMedicine = async function(medicineId) {
        if (!confirm("Are you sure you want to delete this medicine?")) return;
        try {
            await fetchData(`medicines/${medicineId}`, "DELETE");
            await fetchMedicines();
        } catch (error) {
            alert(`Failed to delete medicine: ${error.message}`);
        }
    };

    // Ensure Piece unit exists
    async function ensurePieceUnit() {
        try {
            const units = await fetchData('units/');
            const pieceUnit = units.find(u => u.name.toLowerCase() === 'piece' || u.name.toLowerCase() === 'pcs');
            if (pieceUnit) {
                pieceUnitId = pieceUnit.id;
            } else {
                const newUnit = await fetchData('units/', 'POST', { name: 'Piece' });
                pieceUnitId = newUnit.id;
            }
        } catch (error) {
            console.error('Error ensuring Piece unit:', error);
        }
    }

    const medicineSuggestions = document.getElementById('medicine-suggestions');
    const medFeedback = document.getElementById('medicine-feedback');
    let highlightedIndex = -1;

    if (medicineInput) {
        medicineInput.addEventListener('input', function() {
            const val = this.value.trim();
            if (!val) {
                hideSuggestions();
                medFeedback.innerHTML = "";
                return;
            }

            const searchLower = val.toLowerCase();
            const matches = allMedicines.filter(m => 
                m.name.toLowerCase().includes(searchLower)
            ).slice(0, 8); // Limit to 8 professional suggestions

            if (matches.length > 0) {
                renderSuggestions(matches, val);
            } else {
                hideSuggestions();
                medFeedback.innerHTML = `<span class="badge bg-success-subtle text-success border border-success-subtle">New Medicine: "${val}"</span>`;
            }

            const exactMatch = allMedicines.find(m => m.name.toLowerCase() === searchLower);
            if (exactMatch) {
                medFeedback.innerHTML = `<span class="badge bg-primary-subtle text-primary border border-primary-subtle">Existing: ${exactMatch.name}</span>`;
                document.getElementById('medicinePurchasePrice').value = exactMatch.purchase_price;
                document.getElementById('medicineSellingPrice').value = exactMatch.selling_price;
            }
        });

        // Keyboard navigation
        medicineInput.addEventListener('keydown', function(e) {
            const items = medicineSuggestions.querySelectorAll('.suggestion-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
                updateHighlight(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightedIndex = Math.max(highlightedIndex - 1, -1);
                updateHighlight(items);
            } else if (e.key === 'Enter') {
                if (highlightedIndex > -1 && items[highlightedIndex]) {
                    e.preventDefault();
                    items[highlightedIndex].click();
                }
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });

        // Close suggestions on outside click
        document.addEventListener('click', function(e) {
            if (e.target !== medicineInput && e.target !== medicineSuggestions) {
                hideSuggestions();
            }
        });
    }

    function renderSuggestions(matches, query) {
        medicineSuggestions.innerHTML = "";
        highlightedIndex = -1;
        
        matches.forEach((m, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            
            // Stock status coloring
            let stockClass = 'available';
            if (m.stock_quantity === 0) stockClass = 'empty';
            else if (m.stock_quantity < 10) stockClass = 'low';

            // Highlight matching text
            const regex = new RegExp(`(${query})`, 'gi');
            const highlightedName = m.name.replace(regex, '<strong>$1</strong>');

            item.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="name">${highlightedName}</span>
                </div>
                <span class="stock ${stockClass}">${m.stock_quantity} in stock</span>
            `;

            item.onclick = function() {
                medicineInput.value = m.name;
                hideSuggestions();
                // Trigger input event to show "Existing" feedback and fill prices
                medicineInput.dispatchEvent(new Event('input'));
                document.getElementById('batchExpiryDate').focus();
            };

            medicineSuggestions.appendChild(item);
        });

        medicineSuggestions.style.display = 'block';
    }

    function updateHighlight(items) {
        items.forEach((item, index) => {
            if (index === highlightedIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    function hideSuggestions() {
        if (medicineSuggestions) {
            medicineSuggestions.style.display = 'none';
            highlightedIndex = -1;
        }
    }

    // Supplier suggestions logic
    const supplierInput = document.getElementById('batchSupplierName');
    const supplierSuggestions = document.getElementById('supplier-suggestions');
    const supplierFeedback = document.getElementById('supplier-feedback');
    let supplierHighlightedIndex = -1;

    if (supplierInput) {
        supplierInput.addEventListener('input', function() {
            const val = this.value.trim();
            if (!val) {
                hideSupplierSuggestions();
                supplierFeedback.innerHTML = "";
                return;
            }

            const searchLower = val.toLowerCase();
            const matches = allSuppliers.filter(s => 
                s.name.toLowerCase().includes(searchLower)
            ).slice(0, 5);

            if (matches.length > 0) {
                renderSupplierSuggestions(matches, val);
            } else {
                hideSupplierSuggestions();
                supplierFeedback.innerHTML = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle">No supplier found: "${val}"</span>`;
            }

            const exactMatch = allSuppliers.find(s => s.name.toLowerCase() === searchLower);
            if (exactMatch) {
                supplierFeedback.innerHTML = `<span class="badge bg-primary-subtle text-primary border border-primary-subtle">Existing Supplier: ${exactMatch.name}</span>`;
            }
        });

        supplierInput.addEventListener('keydown', function(e) {
            const items = supplierSuggestions.querySelectorAll('.suggestion-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                supplierHighlightedIndex = Math.min(supplierHighlightedIndex + 1, items.length - 1);
                updateSupplierHighlight(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                supplierHighlightedIndex = Math.max(supplierHighlightedIndex - 1, -1);
                updateSupplierHighlight(items);
            } else if (e.key === 'Enter') {
                if (supplierHighlightedIndex > -1 && items[supplierHighlightedIndex]) {
                    e.preventDefault();
                    items[supplierHighlightedIndex].click();
                }
            } else if (e.key === 'Escape') {
                hideSupplierSuggestions();
            }
        });

        document.addEventListener('click', function(e) {
            if (e.target !== supplierInput && e.target !== supplierSuggestions) {
                hideSupplierSuggestions();
            }
        });
    }

    function renderSupplierSuggestions(matches, query) {
        supplierSuggestions.innerHTML = "";
        supplierHighlightedIndex = -1;
        
        matches.forEach((s, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            
            const regex = new RegExp(`(${query})`, 'gi');
            const highlightedName = s.name.replace(regex, '<strong>$1</strong>');

            item.innerHTML = `<span class="name">${highlightedName}</span>`;

            item.onclick = function() {
                supplierInput.value = s.name;
                hideSupplierSuggestions();
                supplierInput.dispatchEvent(new Event('input'));
                document.getElementById('invoiceNumber').focus();
            };

            supplierSuggestions.appendChild(item);
        });

        supplierSuggestions.style.display = 'block';
    }

    function updateSupplierHighlight(items) {
        items.forEach((item, index) => {
            if (index === supplierHighlightedIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    function hideSupplierSuggestions() {
        if (supplierSuggestions) {
            supplierSuggestions.style.display = 'none';
            supplierHighlightedIndex = -1;
        }
    }

    // Add Item to Invoice
    if (addItemBtn) {
        addItemBtn.addEventListener('click', function() {
            const inputName = medicineInput.value.trim();
            const expiry = document.getElementById('batchExpiryDate').value;
            const qty = parseInt(document.getElementById('batchQuantity').value) || 0;
            const pPrice = parseFloat(document.getElementById('medicinePurchasePrice').value) || 0;
            const sPrice = parseFloat(document.getElementById('medicineSellingPrice').value) || 0;
            const discountVal = parseFloat(document.getElementById('discountAmount').value) || 0;

            if (!inputName) { alert("Please enter or select a medicine."); return; }
            if (!expiry) { alert("Please select an expiry date."); return; }
            if (qty <= 0) { alert("Quantity must be greater than 0."); return; }
            if (pPrice <= 0) { alert("Purchase price is required."); return; }
            if (sPrice <= 0) { alert("Selling price is required."); return; }

            const existing = allMedicines.find(m => m.name.toLowerCase() === inputName.toLowerCase());
            const totalBatchDisc = discountVal * qty;
            const totalCost = (pPrice * qty) - totalBatchDisc;

            const item = {
                medicine_id: existing ? existing.id : null,
                medicine_name: existing ? null : inputName,
                display_name: existing ? existing.name : inputName + " (New)",
                quantity: qty,
                unit_id: pieceUnitId,
                expiry_date: expiry,
                medicine_purchase_price: pPrice,
                medicine_selling_price: sPrice,
                per_product_discount: discountVal,
                total_batch_discount: totalBatchDisc,
                total_cost: totalCost
            };

            invoiceItems.push(item);
            renderInvoiceItems();
            clearItemInputs();
        });
    }

    if (clearItemBtn) {
        clearItemBtn.addEventListener('click', clearItemInputs);
    }

    function clearItemInputs() {
        if (medicineInput) medicineInput.value = "";
        const expiryEl = document.getElementById('batchExpiryDate');
        const qtyEl = document.getElementById('batchQuantity');
        const pPriceEl = document.getElementById('medicinePurchasePrice');
        const sPriceEl = document.getElementById('medicineSellingPrice');
        const discEl = document.getElementById('discountAmount');
        
        if (expiryEl) expiryEl.value = "";
        if (qtyEl) qtyEl.value = "0";
        if (pPriceEl) pPriceEl.value = "";
        if (sPriceEl) sPriceEl.value = "";
        if (discEl) discEl.value = "0.00";
    }

    function renderInvoiceItems() {
        if (!invoiceItemsBody) return;
        
        invoiceItemsBody.innerHTML = "";
        let subtotal = 0;
        
        invoiceItems.forEach((item, index) => {
            subtotal += item.total_cost;
            const row = `<tr>
                <td>${item.display_name}</td>
                <td>${item.expiry_date}</td>
                <td>${item.quantity}</td>
                <td>${item.medicine_purchase_price.toFixed(2)}</td>
                <td>${item.total_cost.toFixed(2)}</td>
                <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeInvoiceItem(${index})"><i class="bi bi-trash"></i></button></td>
            </tr>`;
            invoiceItemsBody.innerHTML += row;
        });

        if (invoiceSubtotalDisplay) invoiceSubtotalDisplay.textContent = subtotal.toFixed(2);
        
        const invDiscount = parseFloat(invoiceDiscountInput?.value) || 0;
        const grandTotal = Math.max(0, subtotal - invDiscount);
        
        if (invoiceTotalDisplay) invoiceTotalDisplay.textContent = grandTotal.toFixed(2);
        if (saveInvoiceBtn) saveInvoiceBtn.disabled = invoiceItems.length === 0;
    }

    if (invoiceDiscountInput) {
        invoiceDiscountInput.addEventListener('input', renderInvoiceItems);
    }

    window.removeInvoiceItem = function(index) {
        invoiceItems.splice(index, 1);
        renderInvoiceItems();
    };

    // Save Invoice
    if (saveInvoiceBtn) {
        saveInvoiceBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            if (invoiceItems.length === 0) {
                alert("Please add at least one item to the invoice.");
                return;
            }

            const supplier = document.getElementById('batchSupplierName').value.trim();
            const invoiceNum = document.getElementById('invoiceNumber').value.trim();
            const date = document.getElementById('purchaseDate').value;
            const invDiscount = parseFloat(invoiceDiscountInput?.value) || 0;

            if (!supplier || !invoiceNum || !date) {
                alert("Please fill in Supplier, Invoice Number and Purchase Date.");
                return;
            }

            const payload = {
                supplier_name: supplier,
                invoice_number: invoiceNum,
                purchase_date: date,
                invoice_discount: invDiscount,
                paid_amount: 0,
                items: invoiceItems
            };

            try {
                await fetchData('add_purchase/', 'POST', payload);
                alert('Stock added successfully!');
                
                document.getElementById('batchSupplierName').value = "";
                document.getElementById('invoiceNumber').value = generateInvoiceNumber();
                document.getElementById('purchaseDate').value = "";
                if (invoiceDiscountInput) invoiceDiscountInput.value = "0.00";
                
                invoiceItems = [];
                renderInvoiceItems();
                clearItemInputs();
                
                // Clear supplier feedback
                if (supplierFeedback) supplierFeedback.innerHTML = "";
                hideSupplierSuggestions();

                await fetchMedicines();
                await loadPurchases();
                
                const feedbackEl = document.getElementById('invoice-feedback');
                if (feedbackEl) {
                    feedbackEl.textContent = 'New Invoice';
                    feedbackEl.className = 'text-success';
                }

            } catch (error) {
                console.error('Error saving:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get('section');
    const filterParam = urlParams.get('filter');
    let allPurchases = [];

    // Load Purchase History
    async function loadPurchases() {
        const purchasesTableBody = document.getElementById('purchases-table-body');
        if (!purchasesTableBody) return;

        try {
            const purchases = await fetchData('purchases/');
            allPurchases = purchases;
            
            // Update purchase count badge
            const purchaseBadge = document.getElementById('purchase-count-badge');
            if (purchaseBadge) {
                purchaseBadge.textContent = `${purchases.length} invoice${purchases.length !== 1 ? 's' : ''}`;
            }

            // Apply filter if URL param is set
            let filteredPurchases = purchases;
            if (filterParam === 'unpaid') {
                filteredPurchases = purchases.filter(p => p.payment_status !== 'paid');
            }

            displayPurchases(filteredPurchases);
        } catch (error) {
            console.error('Error loading purchases:', error);
            purchasesTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading</td></tr>';
        }
    }

    function displayPurchases(purchases) {
        const purchasesTableBody = document.getElementById('purchases-table-body');
        if (!purchasesTableBody) return;

        purchasesTableBody.innerHTML = '';

        if (purchases.length === 0) {
            purchasesTableBody.innerHTML = '<tr><td colspan="9" class="text-center">No purchases found</td></tr>';
            return;
        }

        purchases.forEach((purchase, index) => {
            const netAmount = purchase.total_amount - (purchase.invoice_discount || 0);
            const dueAmount = Math.max(0, netAmount - purchase.paid_amount);
            const statusClass = purchase.payment_status === 'paid' ? 'success' : 
                               purchase.payment_status === 'partial' ? 'warning' : 'danger';
            const row = `<tr id="purchase-row-${purchase.id}" class="${dueAmount > 0 ? 'table-warning' : ''}">
                <td>${index + 1}</td>
                <td>${purchase.invoice_number}</td>
                <td>${purchase.supplier_name}</td>
                <td>${purchase.purchase_date}</td>
                <td>${netAmount.toFixed(2)} ৳</td>
                <td id="paid-${purchase.id}">${purchase.paid_amount.toFixed(2)} ৳</td>
                <td id="due-${purchase.id}" class="${dueAmount > 0 ? 'text-danger fw-bold' : 'text-success'}">${dueAmount.toFixed(2)} ৳</td>
                <td><span class="badge bg-${statusClass}" id="status-${purchase.id}">${purchase.payment_status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewInvoiceDetails(${purchase.id})" title="View Items">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="openPaymentModal(${purchase.id}, '${purchase.invoice_number}', ${netAmount}, ${purchase.paid_amount})">
                        <i class="bi bi-cash"></i> Pay
                    </button>
                </td>
            </tr>`;
            purchasesTableBody.innerHTML += row;
        });
    }

    window.viewInvoiceDetails = async function(purchaseId) {
        const modalBody = document.getElementById('invoice-items-modal-body');
        const modal = new bootstrap.Modal(document.getElementById('viewInvoiceItemsModal'));
        
        modalBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
        modal.show();

        try {
            // Purchases endpoint already returns items via joinedload in crud.py
            const allPurchases = await fetchData('purchases/');
            const purchase = allPurchases.find(p => p.id === purchaseId);
            
            if (!purchase) throw new Error("Purchase not found");

            document.getElementById('modal-invoice-num').textContent = purchase.invoice_number;
            document.getElementById('modal-supplier-name').textContent = purchase.supplier_name;
            
            modalBody.innerHTML = '';
            purchase.items.forEach(item => {
                const total = item.quantity * item.price_at_purchase;
                const row = `<tr>
                    <td>${item.medicine.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.price_at_purchase.toFixed(2)}</td>
                    <td>${total.toFixed(2)}</td>
                </tr>`;
                modalBody.innerHTML += row;
            });
        } catch (error) {
            modalBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    };

    // Purchase filter functionality
    const purchaseStatusFilter = document.getElementById('purchase-status-filter');
    const purchaseSearch = document.getElementById('purchase-search');

    function filterPurchases() {
        const statusVal = purchaseStatusFilter?.value || 'all';
        const searchVal = purchaseSearch?.value?.toLowerCase() || '';

        let filtered = [...allPurchases];

        // Status filter
        if (statusVal === 'unpaid') {
            filtered = filtered.filter(p => p.payment_status === 'unpaid');
        } else if (statusVal === 'partial') {
            filtered = filtered.filter(p => p.payment_status === 'partial');
        } else if (statusVal === 'paid') {
            filtered = filtered.filter(p => p.payment_status === 'paid');
        }

        // Search filter
        if (searchVal) {
            filtered = filtered.filter(p => 
                p.invoice_number.toLowerCase().includes(searchVal) ||
                p.supplier_name.toLowerCase().includes(searchVal)
            );
        }

        displayPurchases(filtered);
    }

    if (purchaseStatusFilter) {
        purchaseStatusFilter.addEventListener('change', filterPurchases);
        // Set filter from URL param
        if (filterParam === 'unpaid') {
            purchaseStatusFilter.value = 'unpaid';
        }
    }
    if (purchaseSearch) {
        purchaseSearch.addEventListener('input', debounce(filterPurchases, 300));
    }

    // Open Payment Modal
    window.openPaymentModal = function(purchaseId, invoiceNum, netAmount, currentPaid) {
        document.getElementById('payment-purchase-id').value = purchaseId;
        document.getElementById('payment-net-amount').value = netAmount;
        document.getElementById('payment-invoice-num').value = invoiceNum;
        document.getElementById('payment-total-amount').value = netAmount.toFixed(2);
        document.getElementById('payment-due-amount').value = Math.max(0, netAmount - currentPaid).toFixed(2);
        document.getElementById('payment-paid-amount').value = currentPaid.toFixed(2);
        
        const modal = new bootstrap.Modal(document.getElementById('updatePaymentModal'));
        modal.show();
    };

    // Update Payment Form Submit
    const updatePaymentForm = document.getElementById('update-payment-form');
    if (updatePaymentForm) {
        updatePaymentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const purchaseId = document.getElementById('payment-purchase-id').value;
            const netAmount = parseFloat(document.getElementById('payment-net-amount').value);
            const paidAmount = parseFloat(document.getElementById('payment-paid-amount').value) || 0;

            try {
                await fetchData(`purchases/${purchaseId}/paid`, 'PUT', { paid_amount: paidAmount });
                
                // Update the table row
                const paidEl = document.getElementById(`paid-${purchaseId}`);
                const dueEl = document.getElementById(`due-${purchaseId}`);
                const statusEl = document.getElementById(`status-${purchaseId}`);
                
                const dueAmount = Math.max(0, netAmount - paidAmount);
                if (paidEl) paidEl.textContent = paidAmount.toFixed(2);
                if (dueEl) {
                    dueEl.textContent = dueAmount.toFixed(2);
                    dueEl.className = dueAmount > 0 ? 'text-danger fw-bold' : '';
                }
                
                let status = 'unpaid';
                let statusClass = 'danger';
                if (paidAmount >= netAmount) {
                    status = 'paid';
                    statusClass = 'success';
                } else if (paidAmount > 0) {
                    status = 'partial';
                    statusClass = 'warning';
                }
                
                if (statusEl) {
                    statusEl.textContent = status;
                    statusEl.className = `badge bg-${statusClass}`;
                }
                
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('updatePaymentModal')).hide();
                
            } catch (error) {
                console.error('Error updating paid amount:', error);
                alert('Failed to update paid amount');
            }
        });
    }


    // Initialize
    ensurePieceUnit();
    fetchMedicines();
    fetchSuppliers();
    loadPurchases();

    // Handle URL parameters for section navigation
    if (sectionParam === 'purchases') {
        // Close stock list section and open purchase history
        const stockSection = document.getElementById('stockListSection');
        const purchaseSection = document.getElementById('purchaseHistorySection');
        const stockBtn = document.querySelector('[data-bs-target="#stockListSection"]');
        const purchaseBtn = document.querySelector('[data-bs-target="#purchaseHistorySection"]');
        
        if (stockSection && purchaseSection) {
            // Use Bootstrap collapse API
            setTimeout(() => {
                if (stockSection.classList.contains('show')) {
                    stockSection.classList.remove('show');
                    if (stockBtn) stockBtn.classList.add('collapsed');
                }
                purchaseSection.classList.add('show');
                if (purchaseBtn) purchaseBtn.classList.remove('collapsed');
                
                // Scroll to purchase section
                purchaseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }

    const loaderWrapper = document.getElementById("loader-wrapper");
    if (loaderWrapper) {
        setTimeout(() => loaderWrapper.classList.remove("visible"), 500);
    }
});

