document.addEventListener("DOMContentLoaded", function() {
    const medicinesTableBody = document.getElementById("medicines-table-body");
    const medicineInput = document.getElementById('medicine-input');
    const addItemBtn = document.getElementById('add-item-to-list-btn');
    const clearItemBtn = document.getElementById('clear-item-btn');
    const saveInvoiceBtn = document.getElementById('save-invoice-btn');
    const invoiceItemsBody = document.getElementById('invoice-items-body');
    const invoiceTotalDisplay = document.getElementById('invoice-total-amount');
    const invoiceNumberInput = document.getElementById('invoiceNumber');
    const purchaseDateInput = document.getElementById('purchaseDate');
    const medicineSearch = document.getElementById('medicine-search');
    const stockFilter = document.getElementById('stock-filter');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    let isSelectingSuggestion = false;
    let selectedMedicineId = null;
    let pageSize = 10;
    let purchasePageSize = 10;
    let allSuppliers = [];
    let allManufacturers = [];
    let userTypedNames = new Set();
    let pieceUnitId = null;
    let invoiceItems = [];

    // Independent Page Size Handlers
    document.getElementById('inventory-page-size')?.addEventListener('change', function() {
        pageSize = parseInt(this.value);
        fetchMedicines(1);
    });
    document.getElementById('purchase-page-size')?.addEventListener('change', function() {
        purchasePageSize = parseInt(this.value);
        loadPurchases(1);
    });

    async function fetchMedicines(page = 1) {
        try {
            const searchTerm = medicineSearch?.value?.trim() || '';
            const status = stockFilter?.value || 'all';
            const skip = (page - 1) * pageSize;
            const res = await fetchData(`medicines/?skip=${skip}&limit=${pageSize}&search=${encodeURIComponent(searchTerm)}&stock_status=${status}`);
            if (res.items) {
                document.getElementById('stock-count-badge').textContent = `${res.total} items`;
                const start = res.total === 0 ? 0 : skip + 1;
                const end = Math.min(skip + pageSize, res.total);
                document.getElementById('medicine-range-info').textContent = `Showing ${start} - ${end} of ${res.total}`;
                displayMedicines(res.items, res.page);
                renderPagination(res.page, res.pages, "medicine-pagination", fetchMedicines);
            }
        } catch (e) {}
    }

    async function loadPurchases(page = 1) {
        try {
            const skip = (page - 1) * purchasePageSize;
            const res = await fetchData(`purchases/?skip=${skip}&limit=${purchasePageSize}`);
            if (res.items) {
                document.getElementById('purchase-count-badge').textContent = `${res.total} invoices`;
                const start = res.total === 0 ? 0 : skip + 1;
                const end = Math.min(skip + purchasePageSize, res.total);
                document.getElementById('purchase-range-info').textContent = `Showing ${start} - ${end} of ${res.total}`;
                displayPurchases(res.items, res.page);
                renderPagination(res.page, res.pages, "purchase-pagination", loadPurchases);
            }
        } catch (e) {}
    }

    function displayMedicines(medicines, page = 1) {
        if (!medicinesTableBody) return;
        medicinesTableBody.innerHTML = medicines.map((m, i) => {
            const sn = (page - 1) * pageSize + i + 1;
            const sc = m.stock_quantity === 0 ? 'text-danger fw-bold' : m.stock_quantity < 10 ? 'text-warning fw-bold' : 'text-success';
            return `<tr><td>${sn}</td><td><strong>${m.name}</strong></td><td>${m.generic_name || '-'}</td><td>${m.strength || '-'}</td><td>${m.medicine_type}</td><td>${m.manufacturer}</td><td class="${sc}">${m.stock_quantity}</td><td>${m.purchase_price.toFixed(2)}</td><td>${m.selling_price.toFixed(2)}</td><td><button class="btn btn-sm btn-link p-0 text-danger" onclick="deleteMedicine(${m.id})"><i class="fas fa-trash"></i></button></td></tr>`;
        }).join('');
    }

    function displayPurchases(purchases, page = 1) {
        document.getElementById('purchases-table-body').innerHTML = purchases.map((p, i) => {
            const sn = (page - 1) * purchasePageSize + i + 1;
            const net = p.total_amount - (p.invoice_discount || 0);
            const statusClass = p.payment_status === 'paid' ? 'success' : p.payment_status === 'partial' ? 'warning' : 'danger';
            return `<tr><td>${sn}</td><td>${p.invoice_number}</td><td>${p.supplier_name}</td><td>${p.purchase_date}</td><td>${net.toFixed(2)}</td><td>${p.paid_amount.toFixed(2)}</td><td class="${(net-p.paid_amount)>0?'text-danger fw-bold':''}">${(net-p.paid_amount).toFixed(2)}</td><td><span class="badge bg-${statusClass}">${p.payment_status}</span></td><td><button class="btn btn-sm btn-link p-0" onclick="viewInvoiceDetails(${p.id})"><i class="fas fa-eye text-primary"></i></button> <button class="btn btn-sm btn-link p-0 ms-2 text-success" onclick="openPaymentModal(${p.id})"><i class="fas fa-money-bill-wave"></i></button></td></tr>`;
        }).join('');
    }

    window.openPaymentModal = async function(id) {
        const p = await fetchData(`purchases/${id}`);
        const net = p.total_amount - (p.invoice_discount || 0);
        document.getElementById('payment-purchase-id').value = p.id;
        document.getElementById('payment-invoice-num').value = p.invoice_number;
        document.getElementById('payment-due-amount-display').textContent = (net - p.paid_amount).toFixed(2);
        document.getElementById('payment-paid-amount').value = (net - p.paid_amount).toFixed(2);
        new bootstrap.Modal(document.getElementById('updatePaymentModal')).show();
    };

    document.getElementById('update-payment-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('payment-purchase-id').value;
        const paid = parseFloat(document.getElementById('payment-paid-amount').value) || 0;
        await fetchData(`purchases/${id}/paid`, 'PUT', { paid_amount: paid });
        bootstrap.Modal.getInstance(document.getElementById('updatePaymentModal')).hide();
        loadPurchases(1);
    });

    window.viewInvoiceDetails = async function(id) {
        const modal = new bootstrap.Modal(document.getElementById('viewInvoiceItemsModal'));
        const body = document.getElementById('invoice-items-modal-body');
        const p = await fetchData(`purchases/${id}`);
        document.getElementById('modal-invoice-num').textContent = p.invoice_number;
        document.getElementById('modal-supplier-name').textContent = p.supplier_name;
        body.innerHTML = p.items.map(i => `<tr><td><b>${i.medicine.name}</b></td><td>${i.medicine.strength}</td><td>${i.expiry_date}</td><td>${i.quantity}</td><td>${i.price_at_purchase.toFixed(2)}</td><td>${(i.selling_price || 0).toFixed(2)}</td><td class="text-end">${(i.quantity*i.price_at_purchase).toFixed(2)}</td></tr>`).join('');
        modal.show();
    };

    const supplierInput = document.getElementById('batchSupplierName');
    const manufacturerInput = document.getElementById('manufacturer');
    const supplierSuggestions = document.getElementById('supplier-suggestions');

    function getCombinedSuggestions(q) {
        const query = q.toLowerCase().trim();
        const combined = [...new Set([...allSuppliers.map(s=>s.name), ...allManufacturers, ...Array.from(userTypedNames)])];
        return combined.filter(item => item && item.toLowerCase().includes(query)).sort((a,b)=>a.toLowerCase().startsWith(query)?-1:1).slice(0,10);
    }

    if(supplierInput) {
        supplierInput.addEventListener('input', function() {
            const val = this.value;
            if(!val.trim()) { supplierSuggestions.style.display='none'; return; }
            const matches = getCombinedSuggestions(val);
            if(matches.length > 0) {
                supplierSuggestions.innerHTML = matches.map(m => `<div class="suggestion-item">${m}</div>`).join('');
                supplierSuggestions.querySelectorAll('.suggestion-item').forEach((el, i) => el.onclick = () => {
                    isSelectingSuggestion=true; supplierInput.value=matches[i]; manufacturerInput.value=matches[i]; supplierSuggestions.style.display='none';
                    setTimeout(()=>isSelectingSuggestion=false, 100);
                });
                supplierSuggestions.style.display = 'block';
            } else supplierSuggestions.style.display='none';
        });
    }

    if(medicineInput) {
        medicineInput.addEventListener('input', async function() {
            const val = this.value.trim();
            const sug = document.getElementById('medicine-suggestions');
            if(!val) { sug.style.display='none'; return; }
            const res = await fetchData(`medicines/?limit=10&search=${encodeURIComponent(val)}&manufacturer=${encodeURIComponent(supplierInput.value)}`);
            if(res.items && res.items.length > 0) {
                sug.innerHTML = res.items.map(m => `<div class="suggestion-item d-flex justify-content-between"><span>${m.name} (${m.strength})</span><small class="text-muted">${m.stock_quantity} Pcs</small></div>`).join('');
                sug.querySelectorAll('.suggestion-item').forEach((el, i) => el.onclick = () => {
                    const m = res.items[i]; selectedMedicineId=m.id; medicineInput.value=`${m.name} (${m.strength})`;
                    document.getElementById('genericName').value=m.generic_name; document.getElementById('strength').value=m.strength;
                    document.getElementById('medicinePurchasePrice').value=m.purchase_price; document.getElementById('medicineSellingPrice').value=m.selling_price;
                    sug.style.display='none';
                });
                sug.style.display='block';
            } else sug.style.display='none';
        });
    }

    if (addItemBtn) {
        addItemBtn.addEventListener('click', function() {
            const raw = medicineInput.value.trim(), exp = document.getElementById('batchExpiryDate').value, qty = parseInt(document.getElementById('batchQuantity').value) || 0, pp = parseFloat(document.getElementById('medicinePurchasePrice').value) || 0, sp = parseFloat(document.getElementById('medicineSellingPrice').value) || 0;
            if (!raw || !exp || qty <= 0 || pp <= 0) { alert("Fill all details."); return; }
            if (supplierInput.value) userTypedNames.add(supplierInput.value.trim());
            invoiceItems.push({ medicine_id: selectedMedicineId, medicine_name: selectedMedicineId ? null : raw, generic_name: document.getElementById('genericName').value, manufacturer: supplierInput.value, strength: document.getElementById('strength').value, medicine_type: document.getElementById('medicineType').value, display_name: raw, quantity: qty, unit_id: pieceUnitId, expiry_date: exp, medicine_purchase_price: pp, medicine_selling_price: sp, per_product_discount: 0, discount_type: "fixed", total_batch_discount: 0, total_cost: (pp * qty) });
            renderInvoiceItems(); clearItemInputs();
        });
    }

    function renderInvoiceItems() {
        let sub = 0;
        invoiceItemsBody.innerHTML = invoiceItems.map((item, index) => {
            const cost = item.medicine_purchase_price * item.quantity; sub += cost;
            return `<tr><td><b>${item.display_name}</b></td><td>${item.expiry_date}</td><td>${item.quantity}</td><td>${item.medicine_purchase_price.toFixed(2)}</td><td>${item.medicine_selling_price.toFixed(2)}</td><td class="text-end">${cost.toFixed(2)}</td><td class="text-center"><button type="button" class="btn btn-sm btn-link text-danger p-0" onclick="removeInvoiceItem(${index})"><i class="fas fa-times-circle"></i></button></td></tr>`;
        }).join('');
        invoiceTotalDisplay.textContent = sub.toFixed(2);
        saveInvoiceBtn.disabled = invoiceItems.length === 0;
    }

    if (saveInvoiceBtn) {
        saveInvoiceBtn.addEventListener('click', async () => {
            await fetchData('add_purchase/', 'POST', { supplier_name: supplierInput.value, invoice_number: invoiceNumberInput.value, purchase_date: purchaseDateInput.value, invoice_discount: 0, items: invoiceItems });
            alert('Success!'); location.reload();
        });
    }

    function clearItemInputs() { medicineInput.value = ""; selectedMedicineId = null; document.getElementById('batchQuantity').value = "0"; }
    window.removeInvoiceItem = (i) => { invoiceItems.splice(i, 1); renderInvoiceItems(); };
    async function fetchStaticData() { const [s, m] = await Promise.all([fetchData("suppliers/?limit=1000"), fetchData("medicines/manufacturers")]); allSuppliers = s.items || s; allManufacturers = m || []; }
    async function ensurePieceUnit() { const res = await fetchData('units/?limit=100'); const unit = (res.items || res).find(u => u.name.toLowerCase().includes('piece')); if (unit) pieceUnitId = unit.id; }
    
    fetchStaticData(); ensurePieceUnit(); fetchMedicines(1); loadPurchases(1); 
    fetchData('add_purchase/next_invoice_number').then(res => { if(res && res.invoice_number) invoiceNumberInput.value = res.invoice_number; });
    
    document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
    setTimeout(() => document.getElementById("loader-wrapper")?.classList.remove("visible"), 500);
});