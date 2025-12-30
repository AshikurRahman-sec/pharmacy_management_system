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
    const pageSize = 10;
    let isSelectingSuggestion = false;

    function getCombinedSuggestions(query) {
        const q = query.toLowerCase().trim();
        if (!q) return [];
        const supplierNames = allSuppliers.map(s => s.name);
        const typedNames = Array.from(userTypedNames);
        const combined = [...new Set([...supplierNames, ...allManufacturers, ...typedNames])];
        return combined.filter(item => item && item.toLowerCase().includes(q)).sort((a, b) => {
            const aStart = a.toLowerCase().startsWith(q);
            const bStart = b.toLowerCase().startsWith(q);
            if (aStart && !bStart) return -1;
            if (!aStart && bStart) return 1;
            return a.localeCompare(b);
        }).slice(0, 15);
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
        const q = query.trim();
        matches.forEach(m => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            let highlighted = m;
            if (q) {
                const escapedQ = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`(${escapedQ})`, 'gi');
                highlighted = m.replace(regex, '<strong>$1</strong>');
            }
            item.innerHTML = `<span class="name" style="flex: 1; text-align: left;">${highlighted}</span>`;
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
        try {
            const res = await fetchData("medicines/manufacturers");
            allManufacturers = res || [];
        } catch (e) {}
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
                displaySuppliers(response.items, response.page);
                renderPagination(response.page, response.pages, "suppliers-pagination", loadSuppliers);
            } else { allSuppliers = response; displaySuppliers(response, 1); }
        } catch (error) {
            suppliersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    function displaySuppliers(suppliers, page = 1) {
        if (!suppliersTableBody) return;
        suppliersTableBody.innerHTML = '';
        if (!suppliers || suppliers.length === 0) {
            suppliersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No suppliers found.</td></tr>';
            return;
        }
        suppliers.forEach((supplier, index) => {
            const sn = (page - 1) * pageSize + index + 1;
            suppliersTableBody.innerHTML += `<tr>
                <th scope="row">${sn}</th>
                <td><strong>${supplier.name}</strong></td>
                <td>${supplier.contact_person || '-'}</td>
                <td>${supplier.phone ? `<a href="tel:${supplier.phone}">${supplier.phone}</a>` : '-'}</td>
                <td>${supplier.email ? `<a href="mailto:${supplier.email}">${supplier.email}</a>` : '-'}</td>
                <td><small>${supplier.address || '-'}</small></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewSupplier(${supplier.id})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-warning" onclick="editSupplier(${supplier.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${supplier.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
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
                await loadSuppliers(1);
                alert('Supplier added successfully!');
            } catch (error) { alert(`Error: ${error.message}`); }
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
            await loadSuppliers(currentPage);
            alert('Updated!');
        });
    }

    window.deleteSupplier = async function(id) {
        if (confirm('Delete supplier?')) {
            await fetchData(`suppliers/${id}`, 'DELETE');
            await loadSuppliers(currentPage);
        }
    };

    fetchManufacturers();
    loadSuppliers();
    setTimeout(() => document.getElementById("loader-wrapper")?.classList.remove("visible"), 500);
});
