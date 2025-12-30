document.addEventListener("DOMContentLoaded", function() {
    const suppliersTableBody = document.getElementById('suppliers-table-body');
    const addSupplierForm = document.getElementById('add-supplier-form');
    const editSupplierForm = document.getElementById('edit-supplier-form');
    const supplierSearch = document.getElementById('supplier-search');
    const saveEditBtn = document.getElementById('save-edit-supplier-btn');
    
    const supplierInput = document.getElementById('supplier_name');
    const supplierSuggestions = document.getElementById('supplier-suggestions');

    let allSuppliers = [];
    let allManufacturers = [];
    let userTypedNames = new Set();
    let currentPage = 1;
    let pageSize = 10;
    let isSelectingSuggestion = false;

    // Page Size Change
    const pageSizeSelect = document.getElementById('suppliers-page-size');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            pageSize = parseInt(this.value);
            loadSuppliers(1);
        });
    }

    function getCombinedSuggestions(query) {
        const q = query.toLowerCase().trim();
        if (!q) return [];
        const combined = [...new Set([...allSuppliers.map(s => s.name), ...allManufacturers, ...Array.from(userTypedNames)])];
        return combined.filter(item => item && item.toLowerCase().includes(q)).sort((a, b) => a.toLowerCase().startsWith(q) ? -1 : 1).slice(0, 15);
    }

    if (supplierInput) {
        supplierInput.addEventListener('input', function() {
            const val = this.value;
            if (!val.trim()) { hideSuggestions(); return; }
            if (val.length > 2) userTypedNames.add(val.trim());
            if (isSelectingSuggestion) return;
            const matches = getCombinedSuggestions(val);
            if (matches.length > 0) renderSuggestions(matches, val);
            else hideSuggestions();
        });
    }

    function renderSuggestions(matches, query) {
        if (!supplierSuggestions) return;
        supplierSuggestions.innerHTML = "";
        matches.forEach(m => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `<span class="name" style="flex: 1; text-align: left;">${m}</span>`;
            item.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                isSelectingSuggestion = true;
                supplierInput.value = m;
                hideSuggestions();
                setTimeout(() => { isSelectingSuggestion = false; }, 100);
            });
            supplierSuggestions.appendChild(item);
        });
        supplierSuggestions.style.display = 'block';
    }

    function hideSuggestions() { if (supplierSuggestions) supplierSuggestions.style.display = 'none'; }
    document.addEventListener('click', (e) => { if (!e.target.closest('.position-relative')) hideSuggestions(); });

    async function fetchManufacturers() {
        try { const res = await fetchData("medicines/manufacturers"); allManufacturers = res || []; } catch (e) {}
    }

    async function loadSuppliers(page = 1) {
        if (!suppliersTableBody) return;
        try {
            currentPage = page;
            const skip = (page - 1) * pageSize;
            const url = `suppliers/?skip=${skip}&limit=${pageSize}`;
            const response = await fetchData(url);
            if (response.items) {
                allSuppliers = response.items;
                
                // Update Range Info
                const start = response.total === 0 ? 0 : skip + 1;
                const end = Math.min(skip + pageSize, response.total);
                const rangeEl = document.getElementById('suppliers-range-info');
                if (rangeEl) rangeEl.textContent = `Showing ${start} - ${end} of ${response.total}`;

                displaySuppliers(response.items, response.page);
                renderPagination(response.page, response.pages, "suppliers-pagination", loadSuppliers);
            } else { allSuppliers = response; displaySuppliers(response, 1); }
        } catch (error) { console.error(error); }
    }

    function displaySuppliers(suppliers, page = 1) {
        if (!suppliersTableBody) return;
        suppliersTableBody.innerHTML = suppliers.map((supplier, index) => {
            const sn = (page - 1) * pageSize + index + 1;
            return `<tr>
                <th scope="row">${sn}</th>
                <td><strong>${supplier.name}</strong></td>
                <td>${supplier.contact_person || '-'}</td>
                <td>${supplier.phone ? `<a href="tel:${supplier.phone}">${supplier.phone}</a>` : '-'}</td>
                <td>${supplier.email ? `<a href="mailto:${supplier.email}">${supplier.email}</a>` : '-'}</td>
                <td><small>${supplier.address || '-'}</small></td>
                <td>
                    <button class="btn btn-sm btn-link p-0" onclick="viewSupplier(${supplier.id})"><i class="fas fa-eye text-primary"></i></button>
                    <button class="btn btn-sm btn-link p-0 ms-2" onclick="editSupplier(${supplier.id})"><i class="fas fa-edit text-warning"></i></button>
                    <button class="btn btn-sm btn-link p-0 ms-2" onclick="deleteSupplier(${supplier.id})"><i class="fas fa-trash text-danger"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    if (addSupplierForm) {
        addSupplierForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = {
                name: document.getElementById('supplier_name').value.trim(),
                contact_person: document.getElementById('contact_person').value.trim() || null,
                phone: document.getElementById('supplier_phone').value.trim() || null,
                email: document.getElementById('supplier_email').value.trim() || null,
                address: document.getElementById('supplier_address').value.trim() || null,
                notes: document.getElementById('supplier_notes').value.trim() || null
            };
            try {
                await fetchData('suppliers/', 'POST', data);
                addSupplierForm.reset();
                bootstrap.Collapse.getInstance(document.getElementById('collapseSupplierForm'))?.hide();
                loadSuppliers(1);
                alert('Success!');
            } catch (error) { alert(error.message); }
        });
    }

    window.viewSupplier = async function(id) {
        const s = await fetchData(`suppliers/${id}`);
        document.getElementById('view_supplier_name').textContent = s.name;
        document.getElementById('view_contact_person').textContent = s.contact_person || '-';
        document.getElementById('view_supplier_phone').textContent = s.phone || '-';
        document.getElementById('view_supplier_email').textContent = s.email || '-';
        document.getElementById('view_supplier_address').textContent = s.address || '-';
        document.getElementById('view_supplier_notes').textContent = s.notes || 'No notes';
        new bootstrap.Modal(document.getElementById('viewSupplierModal')).show();
    };

    window.editSupplier = async function(id) {
        const s = await fetchData(`suppliers/${id}`);
        document.getElementById('edit_supplier_id').value = s.id;
        document.getElementById('edit_supplier_name').value = s.name;
        document.getElementById('edit_contact_person').value = s.contact_person || '';
        document.getElementById('edit_supplier_phone').value = s.phone || '';
        document.getElementById('edit_supplier_email').value = s.email || '';
        document.getElementById('edit_supplier_address').value = s.address || '';
        document.getElementById('edit_supplier_notes').value = s.notes || '';
        new bootstrap.Modal(document.getElementById('editSupplierModal')).show();
    };

    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', async function() {
            const id = document.getElementById('edit_supplier_id').value;
            const data = {
                name: document.getElementById('edit_supplier_name').value.trim(),
                contact_person: document.getElementById('edit_contact_person').value.trim() || null,
                phone: document.getElementById('edit_supplier_phone').value.trim() || null,
                email: document.getElementById('edit_supplier_email').value.trim() || null,
                address: document.getElementById('edit_supplier_address').value.trim() || null,
                notes: document.getElementById('edit_supplier_notes').value.trim() || null
            };
            await fetchData(`suppliers/${id}`, 'PUT', data);
            bootstrap.Modal.getInstance(document.getElementById('editSupplierModal')).hide();
            loadSuppliers(currentPage);
        });
    }

    window.deleteSupplier = async function(id) {
        if (confirm('Delete supplier?')) {
            await fetchData(`suppliers/${id}`, 'DELETE');
            loadSuppliers(currentPage);
        }
    };

    fetchManufacturers();
    loadSuppliers();
    setTimeout(() => document.getElementById("loader-wrapper")?.classList.remove("visible"), 500);
});