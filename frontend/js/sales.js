document.addEventListener("DOMContentLoaded", function() {
    const salesTableBody = document.getElementById('sales-table-body');
    const addSaleForm = document.getElementById('add-sale-form');
    const saleItemsContainer = document.getElementById('sale-items-container');
    const salesFilter = document.getElementById('sales-filter');
    const stockMonitor = document.getElementById('stock-monitor-content');
    const grandTotalDisplay = document.getElementById('grand-total-display');
    const subtotalDisplay = document.getElementById('subtotal-display');
    const discountAmountInput = document.getElementById('sale_discount_amount');
    const discountTypeInput = document.getElementById('sale_discount_type');

    let allSales = [];
    let pageSize = 10;
    let currentPage = 1;

    // Page Size Change Handler
    const pageSizeSelect = document.getElementById('sales-page-size');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            pageSize = parseInt(this.value);
            loadSales(1);
        });
    }

    async function loadSales(page = 1) {
        if (!salesTableBody) return;
        try {
            currentPage = page;
            const skip = (page - 1) * pageSize;
            const filterVal = salesFilter?.value || 'all';
            const res = await fetchData(`sales/?skip=${skip}&limit=${pageSize}&filter=${filterVal}`);
            if (res.items) {
                allSales = res.items;
                
                // Update Range Info
                const start = res.total === 0 ? 0 : skip + 1;
                const end = Math.min(skip + pageSize, res.total);
                const rangeEl = document.getElementById('sales-range-info');
                if (rangeEl) rangeEl.textContent = `Showing ${start} - ${end} of ${res.total}`;

                displaySales(res.items);
                renderPagination(res.page, res.pages, "sales-pagination", loadSales);
            }
        } catch (e) {}
    }

    function displaySales(sales) {
        salesTableBody.innerHTML = sales.map((s, i) => {
            const sn = (currentPage - 1) * pageSize + i + 1;
            return `<tr><td>${sn}</td><td>${new Date(s.sale_date).toLocaleDateString()}</td><td><strong>${s.buyer_name || 'Walk-in'}</strong></td><td>${s.total_amount.toFixed(2)}</td><td class="text-success">${s.amount_paid.toFixed(2)}</td><td class="${s.due_amount > 0 ? 'text-danger fw-bold' : ''}">${s.due_amount.toFixed(2)}</td><td><button class="btn btn-sm btn-link p-0 me-2" onclick="viewSaleItems(${s.id})"><i class="fas fa-eye text-primary"></i></button><button class="btn btn-sm btn-link p-0 text-success me-2" onclick="printSaleReceipt(${s.id})"><i class="fas fa-print"></i></button>${s.due_amount > 0 ? `<button class="btn btn-sm btn-link p-0 text-warning" onclick="openReceivePaymentModal(${s.id}, ${s.due_amount}, ${sn})"><i class="fas fa-money-bill-wave"></i></button>` : ''}</td></tr>`;
        }).join('');
    }

    function debounce(func, wait) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => func.apply(this, args), wait); }; }

    async function updateMonitor(medicine) {
        if (!medicine) { stockMonitor.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-hand-pointer fs-1 mb-3 opacity-25"></i><p>Focus a field to verify stock</p></div>'; return; }
        stockMonitor.innerHTML = `<div class="p-4 bg-light border-bottom"><h5 class="m-0 fw-bold text-dark">${medicine.name}</h5><p class="text-primary small mb-2 fw-bold">${medicine.generic_name || ''}</p><div class="badge bg-primary rounded-pill mb-3">${medicine.strength || '-'} | ${medicine.medicine_type}</div><div class="fs-4 fw-bold text-dark">${medicine.selling_price.toFixed(2)} <small class="fs-6 text-muted fw-normal">৳ / pc</small></div></div><div class="p-3 bg-white" id="batch-area"><div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Loading...</div></div>`;
        try {
            const res = await fetchData(`medicines/${medicine.id}/batches/?limit=20`);
            const items = res.items || [];
            const area = document.getElementById('batch-area');
            if (items.length > 0) {
                let total = 0;
                area.innerHTML = `<table class="table table-sm" style="font-size: 0.85rem;"><thead class="text-muted"><tr><th>BATCH</th><th>EXPIRY</th><th class="text-end">QTY</th></tr></thead><tbody>${items.map(b => { total += b.batch_quantity; const isExp = new Date(b.expiry_date) < new Date(); return `<tr class="${isExp ? 'batch-row-expired' : ''}"><td>${b.invoice_number}</td><td>${b.expiry_date}</td><td class="text-end fw-bold">${b.batch_quantity}</td></tr>`; }).join('')}</tbody><tfoot class="border-top"><tr><td colspan="2" class="py-2 fw-bold">TOTAL STOCK:</td><td class="py-2 text-end fw-bold fs-6 text-primary">${total}</td></tr></tfoot></table>`;
            } else { area.innerHTML = '<div class="p-4 text-center text-danger fw-bold">OUT OF STOCK</div>'; }
        } catch (e) { area.innerHTML = 'Error'; }
    }

    function setupRow(row) {
        const input = row.querySelector('.medicine-input'), sug = row.querySelector('.medicine-suggestions'), idIn = row.querySelector('.medicine-id-input'), qtyIn = row.querySelector('.quantity-input'), itemDisAmt = row.querySelector('.item-discount-amount'), itemDisTyp = row.querySelector('.item-discount-type'), subIn = row.querySelector('.subtotal-display'), warn = row.querySelector('.stock-warning-text');
        let isSel = false, maxSt = 0, p = 0;
        const search = debounce(async function(v) {
            if (isSel) return;
            v = v.trim();
            if (!v) { sug.style.display = 'none'; updateMonitor(null); return; }
            try {
                const res = await fetchData(`medicines/?limit=10&search=${encodeURIComponent(v)}`);
                const matches = res.items || [];
                sug.innerHTML = "";
                if (matches.length > 0) {
                    matches.forEach(m => {
                        const div = document.createElement('div'); div.className = 'suggestion-item d-flex justify-content-between align-items-center';
                        const display = m.strength ? `${m.name} (${m.strength})` : m.name;
                        div.innerHTML = `<span class="name">${display}</span><span class="badge ${m.stock_quantity < 10 ? 'bg-warning text-dark' : 'bg-success-subtle text-success'} border">${m.stock_quantity} Pcs</span>`;
                        div.addEventListener('mousedown', () => { isSel = true; input.value = display; idIn.value = m.id; maxSt = m.stock_quantity; p = m.selling_price; sug.style.display = 'none'; updateMonitor(m); qtyIn.max = maxSt; validate(); setTimeout(() => isSel = false, 200); });
                        sug.appendChild(div);
                    });
                    sug.style.display = 'block';
                } else { sug.style.display = 'none'; }
            } catch (e) {}
        }, 300);
        function validate() { const val = parseInt(qtyIn.value) || 0; if (val > maxSt && idIn.value) { qtyIn.classList.add('qty-error'); warn.style.display = 'block'; warn.textContent = `Max: ${maxSt}`; qtyIn.value = maxSt; } else { qtyIn.classList.remove('qty-error'); warn.style.display = 'none'; } updateSub(); }
        function updateSub() { const qty = parseInt(qtyIn.value) || 0, dAmt = parseFloat(itemDisAmt.value) || 0, dTyp = itemDisTyp.value, totalB = p * qty; let calcD = (dTyp === 'percentage') ? totalB * (dAmt / 100) : dAmt * qty; subIn.value = Math.max(0, totalB - calcD).toFixed(2); calculateGrandTotal(); }
        input.addEventListener('input', (e) => search(e.target.value));
        input.addEventListener('focus', (e) => { const id = idIn.value; if (id) fetchData(`medicines/${id}`).then(m => updateMonitor(m)); else if (e.target.value.trim()) search(e.target.value); });
        input.addEventListener('blur', () => setTimeout(() => { if(!isSel) sug.style.display = 'none'; }, 200));
        qtyIn.addEventListener('input', validate); itemDisAmt.addEventListener('input', updateSub); itemDisTyp.addEventListener('change', updateSub);
    }

    function calculateGrandTotal() {
        let sub = 0; document.querySelectorAll('.subtotal-display').forEach(el => sub += parseFloat(el.value) || 0);
        if (subtotalDisplay) subtotalDisplay.textContent = sub.toFixed(2);
        const dAmt = parseFloat(discountAmountInput?.value) || 0, dTyp = discountTypeInput?.value || 'fixed';
        let calcD = (dTyp === 'percentage') ? sub * (dAmt / 100) : dAmt;
        const final = Math.max(0, sub - calcD);
        if (grandTotalDisplay) grandTotalDisplay.textContent = final.toFixed(2);
    }

    if (discountAmountInput) discountAmountInput.addEventListener('input', calculateGrandTotal);
    if (discountTypeInput) discountTypeInput.addEventListener('change', calculateGrandTotal);

    function createRow() {
        const div = document.createElement('div'); div.className = 'row sale-item g-3 mb-2 align-items-start border-bottom pb-3';
        div.innerHTML = `<div class="col-md-4 position-relative"><label class="form-label small fw-bold text-muted">MEDICINE</label><input type="text" class="form-control medicine-input border-0 shadow-sm" placeholder="Search..." autocomplete="off" required><div class="medicine-suggestions dropdown-menu shadow-lg w-100" style="display:none; z-index:1060;"></div><input type="hidden" class="medicine-id-input" required></div><div class="col-md-2"><label class="form-label small fw-bold text-muted">QTY</label><input type="number" class="form-control quantity-input border-0 shadow-sm" required min="1" value="1"><div class="stock-warning-text"></div></div><div class="col-md-3"><label class="form-label small fw-bold text-muted">DISCOUNT</label><div class="input-group shadow-sm"><input type="number" step="0.01" class="form-control item-discount-amount border-0" value="0.00"><select class="form-select item-discount-type border-0" style="max-width: 80px;"><option value="fixed">৳</option><option value="percentage">%</option></select></div></div><div class="col-md-3 text-end"><div class="d-flex align-items-start"><div class="flex-grow-1"><label class="form-label small fw-bold text-muted">ITEM TOTAL (৳)</label><input type="text" class="form-control subtotal-display fw-bold text-end border-0 bg-white" readonly value="0.00"></div><button type="button" class="btn btn-link text-danger ms-2 remove-item-btn p-0" style="margin-top: 32px;"><i class="fas fa-times-circle fs-5"></i></button></div></div>`;
        div.querySelector('.remove-item-btn').onclick = () => { div.remove(); calculateGrandTotal(); };
        setupRow(div); return div;
    }

    if (saleItemsContainer) {
        saleItemsContainer.innerHTML = ""; const row = createRow(); row.querySelector('.remove-item-btn').style.display = 'none'; saleItemsContainer.appendChild(row);
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-outline-primary btn-sm mt-3 fw-bold border-2'; btn.innerHTML = '<i class="fas fa-plus-circle me-1"></i>ADD ITEM';
        btn.onclick = () => saleItemsContainer.insertBefore(createRow(), btn); saleItemsContainer.appendChild(btn);
    }

    if (addSaleForm) {
        addSaleForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const items = [];
            document.querySelectorAll('.sale-item').forEach(r => {
                const id = r.querySelector('.medicine-id-input').value, qty = r.querySelector('.quantity-input').value, dAmt = r.querySelector('.item-discount-amount').value, dTyp = r.querySelector('.item-discount-type').value;
                if(id && qty) items.push({ medicine_id: parseInt(id), quantity: parseInt(qty), discount_amount: parseFloat(dAmt) || 0, discount_type: dTyp });
            });
            if(items.length === 0) { alert("Select medicines!"); return; }
            const payload = { sale_date: document.getElementById('sale_date').value, buyer_name: document.getElementById('buyer_name').value || "Walk-in Customer", buyer_mobile: document.getElementById('buyer_mobile').value, buyer_address: document.getElementById('buyer_address').value, amount_paid: parseFloat(document.getElementById('amount_paid').value) || 0, discount_amount: parseFloat(discountAmountInput.value) || 0, discount_type: discountTypeInput.value, items: items };
            try { await fetchData('sales/', 'POST', payload); alert("Success!"); location.reload(); } catch(error) { alert("Error: " + error.message); }
        });
    }

    window.openReceivePaymentModal = function(id, due, sn) {
        const sale = allSales.find(s => s.id === id);
        document.getElementById('pay_sale_id').value = id;
        document.getElementById('pay_current_due').textContent = due.toFixed(2);
        document.getElementById('pay_invoice_label').textContent = `#${sn}`;
        document.getElementById('pay_date_label').textContent = sale ? new Date(sale.sale_date).toLocaleDateString() : '-';
        document.getElementById('pay_amount').value = due.toFixed(2);
        document.getElementById('pay_amount').max = due;
        new bootstrap.Modal(document.getElementById('receivePaymentModal')).show();
    };

    document.getElementById('receive-payment-form')?.addEventListener('submit', async function(e) {
        e.preventDefault(); const id = document.getElementById('pay_sale_id').value, amt = parseFloat(document.getElementById('pay_amount').value) || 0;
        try { await fetchData(`sales/${id}/payment`, 'PATCH', { amount_paid: amt }); alert("Collected!"); bootstrap.Modal.getInstance(document.getElementById('receivePaymentModal')).hide(); loadSales(currentPage); } catch(err) { alert(err.message); }
    });

    window.viewSaleItems = async function(id) {
        const saleIndex = allSales.findIndex(s => s.id === id), sn = (currentPage - 1) * pageSize + saleIndex + 1, modal = new bootstrap.Modal(document.getElementById('viewSaleItemsModal'));
        try {
            const s = await fetchData(`sales/${id}`);
            document.getElementById('sale-details-content').innerHTML = `
                <div class="bg-primary p-4 text-white"><div class="row align-items-center"><div class="col-6"><h2 class="fw-bold m-0">TAX INVOICE</h2><p class="m-0 opacity-75">Pharmacy MS</p></div><div class="col-6 text-end"><div class="invoice-header-label opacity-75">SN</div><h4 class="fw-bold m-0">#${sn}</h4></div></div></div>
                <div class="p-4"><div class="row mb-4"><div class="col-md-6"><div class="invoice-header-label mb-2">Billed To</div><h5 class="fw-bold m-0">${s.buyer_name || 'Walk-in'}</h5><p class="text-muted m-0">${s.buyer_mobile || '-'}</p></div><div class="col-md-6 text-end"><div class="invoice-header-label mb-2">Date</div><h5 class="fw-bold m-0">${new Date(s.sale_date).toLocaleDateString()}</h5></div></div><table class="table border"><thead class="table-light"><tr><th>Description</th><th>Qty</th><th class="text-end">Total</th></tr></thead><tbody>${s.items.map(i => `<tr><td><b>${i.medicine.name}</b><br><small>${i.medicine.strength}</small></td><td>${i.quantity}</td><td class="text-end">${(i.quantity*i.price_at_sale).toFixed(2)}</td></tr>`).join('')}</tbody></table><div class="row justify-content-end mt-4"><div class="col-md-5"><div class="invoice-summary-box shadow-sm"><div class="d-flex justify-content-between mb-2"><span class="text-muted">Paid:</span><span class="fw-bold text-success">${s.amount_paid.toFixed(2)} ৳</span></div><div class="d-flex justify-content-between mb-2"><span class="text-muted">Due:</span><span class="fw-bold text-danger">${s.due_amount.toFixed(2)} ৳</span></div><div class="d-flex justify-content-between pt-2 border-top border-secondary-subtle text-primary"><h5 class="fw-bold">Total</h5><h5 class="fw-bold">${s.total_amount.toFixed(2)} ৳</h5></div></div></div></div></div>`;
            modal.show();
        } catch(e) {}
    };

    window.printSaleReceipt = async function(id) {
        try {
            const s = await fetchData(`sales/${id}`);
            const win = window.open('', '_blank', 'width=400,height=600');
            win.document.write(`<html><body style="font-family:monospace;padding:20px;"><h2>PHARMACY</h2><hr><p>INV: #SALE-${s.id}<br>DATE: ${s.sale_date}</p><hr><table style="width:100%">${s.items.map(i => `<tr><td>${i.medicine.name}</td><td>x${i.quantity}</td><td style="text-align:right">${(i.quantity*i.price_at_sale).toFixed(2)}</td></tr>`).join('')}</table><hr><h3>TOTAL: ${s.total_amount.toFixed(2)}</h3></body></html>`);
            win.document.close(); win.print(); win.close();
        } catch(e) {}
    };

    loadSales();
    if(document.getElementById('sale_date')) document.getElementById('sale_date').value = new Date().toISOString().split('T')[0];
    setTimeout(() => document.getElementById("loader-wrapper")?.classList.remove("visible"), 500);
});