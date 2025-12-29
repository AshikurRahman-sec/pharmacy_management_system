document.addEventListener("DOMContentLoaded", function() {
    console.log("suppliers.js: DOMContentLoaded fired.");

    const suppliersTableBody = document.getElementById('suppliers-table-body');
    const addSupplierForm = document.getElementById('add-supplier-form');
    const editSupplierForm = document.getElementById('edit-supplier-form');
    const supplierSearch = document.getElementById('supplier-search');
    const saveEditBtn = document.getElementById('save-edit-supplier-btn');

    let allSuppliers = [];

    // Load all suppliers
    async function loadSuppliers() {
        if (!suppliersTableBody) return;
        try {
            const suppliers = await fetchData('suppliers/');
            allSuppliers = suppliers;
            displaySuppliers(suppliers);
        } catch (error) {
            console.error('Error loading suppliers:', error);
            suppliersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    function displaySuppliers(suppliers) {
        if (!suppliersTableBody) return;
        
        suppliersTableBody.innerHTML = '';
        
        if (suppliers.length === 0) {
            suppliersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No suppliers found. Add your first supplier!</td></tr>';
            return;
        }

        suppliers.forEach((supplier, index) => {
            const row = `<tr>
                <th scope="row">${index + 1}</th>
                <td><strong>${supplier.name}</strong></td>
                <td>${supplier.contact_person || '-'}</td>
                <td>
                    ${supplier.phone ? `<a href="tel:${supplier.phone}" class="text-decoration-none"><i class="fas fa-phone me-1"></i>${supplier.phone}</a>` : '-'}
                </td>
                <td>
                    ${supplier.email ? `<a href="mailto:${supplier.email}" class="text-decoration-none"><i class="fas fa-envelope me-1"></i>${supplier.email}</a>` : '-'}
                </td>
                <td><small>${supplier.address || '-'}</small></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewSupplier(${supplier.id})" title="View Details"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-warning" onclick="editSupplier(${supplier.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${supplier.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
            suppliersTableBody.innerHTML += row;
        });
    }

    // Search functionality
    if (supplierSearch) {
        supplierSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filtered = allSuppliers.filter(s => 
                s.name.toLowerCase().includes(searchTerm) ||
                (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm)) ||
                (s.phone && s.phone.includes(searchTerm)) ||
                (s.email && s.email.toLowerCase().includes(searchTerm))
            );
            displaySuppliers(filtered);
        });
    }

    // Add new supplier
    if (addSupplierForm) {
        addSupplierForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const supplierData = {
                name: document.getElementById('supplier_name').value.trim(),
                contact_person: document.getElementById('contact_person').value.trim() || null,
                phone: document.getElementById('supplier_phone').value.trim() || null,
                email: document.getElementById('supplier_email').value.trim() || null,
                address: document.getElementById('supplier_address').value.trim() || null,
                notes: document.getElementById('supplier_notes').value.trim() || null
            };

            if (!supplierData.name) {
                alert('Supplier name is required');
                return;
            }

            try {
                await fetchData('suppliers/', 'POST', supplierData);
                addSupplierForm.reset();
                
                // Collapse the form
                const collapseEl = document.getElementById('collapseSupplierForm');
                if (collapseEl) {
                    bootstrap.Collapse.getInstance(collapseEl)?.hide();
                }
                
                await loadSuppliers();
                alert('Supplier added successfully!');
            } catch (error) {
                console.error('Error adding supplier:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // View supplier details
    window.viewSupplier = async function(supplierId) {
        try {
            const supplier = await fetchData(`suppliers/${supplierId}`);
            
            document.getElementById('view_supplier_name').textContent = supplier.name;
            document.getElementById('view_supplier_created').textContent = `Added: ${new Date(supplier.created_at).toLocaleDateString()}`;
            document.getElementById('view_contact_person').textContent = supplier.contact_person || '-';
            document.getElementById('view_supplier_phone').textContent = supplier.phone || '-';
            document.getElementById('view_supplier_email').textContent = supplier.email || '-';
            document.getElementById('view_supplier_address').textContent = supplier.address || '-';
            document.getElementById('view_supplier_notes').textContent = supplier.notes || 'No notes';

            const modal = new bootstrap.Modal(document.getElementById('viewSupplierModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading supplier:', error);
            alert('Error loading supplier details');
        }
    };

    // Edit supplier
    window.editSupplier = async function(supplierId) {
        try {
            const supplier = await fetchData(`suppliers/${supplierId}`);
            
            document.getElementById('edit_supplier_id').value = supplier.id;
            document.getElementById('edit_supplier_name').value = supplier.name;
            document.getElementById('edit_contact_person').value = supplier.contact_person || '';
            document.getElementById('edit_supplier_phone').value = supplier.phone || '';
            document.getElementById('edit_supplier_email').value = supplier.email || '';
            document.getElementById('edit_supplier_address').value = supplier.address || '';
            document.getElementById('edit_supplier_notes').value = supplier.notes || '';

            const modal = new bootstrap.Modal(document.getElementById('editSupplierModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading supplier:', error);
            alert('Error loading supplier for editing');
        }
    };

    // Save edited supplier
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', async function() {
            const supplierId = document.getElementById('edit_supplier_id').value;
            
            const supplierData = {
                name: document.getElementById('edit_supplier_name').value.trim(),
                contact_person: document.getElementById('edit_contact_person').value.trim() || null,
                phone: document.getElementById('edit_supplier_phone').value.trim() || null,
                email: document.getElementById('edit_supplier_email').value.trim() || null,
                address: document.getElementById('edit_supplier_address').value.trim() || null,
                notes: document.getElementById('edit_supplier_notes').value.trim() || null
            };

            if (!supplierData.name) {
                alert('Supplier name is required');
                return;
            }

            try {
                await fetchData(`suppliers/${supplierId}`, 'PUT', supplierData);
                bootstrap.Modal.getInstance(document.getElementById('editSupplierModal')).hide();
                await loadSuppliers();
                alert('Supplier updated successfully!');
            } catch (error) {
                console.error('Error updating supplier:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Delete supplier
    window.deleteSupplier = async function(supplierId) {
        if (!confirm('Are you sure you want to delete this supplier?')) {
            return;
        }

        try {
            await fetchData(`suppliers/${supplierId}`, 'DELETE');
            await loadSuppliers();
            alert('Supplier deleted successfully!');
        } catch (error) {
            console.error('Error deleting supplier:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Initial load
    loadSuppliers();

    // Hide loader
    const loaderWrapper = document.getElementById("loader-wrapper");
    if (loaderWrapper) {
        setTimeout(() => {
            loaderWrapper.classList.remove("visible");
        }, 500);
    }
});

