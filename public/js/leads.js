let leadModalInstance;
let duplicateModalInstance;
let pendingLeadData = null;

document.addEventListener('DOMContentLoaded', async () => {
    leadModalInstance = new bootstrap.Modal(document.getElementById('leadModal'));
    duplicateModalInstance = new bootstrap.Modal(document.getElementById('duplicateModal'));

    document.getElementById('filter-btn').addEventListener('click', loadLeads);
    document.getElementById('lead-form').addEventListener('submit', handleLeadSubmit);
    document.getElementById('force-create-btn').addEventListener('click', () => {
        duplicateModalInstance.hide();
        submitLeadData(pendingLeadData);
    });

    if (getUser().role === 'ADMIN') {
        loadEmployees();
    }
    
    loadLeads();
});

async function loadLeads() {
    const search = document.getElementById('search-input').value;
    const stage = document.getElementById('stage-filter').value;
    
    const loader = document.getElementById('loader');
    const tableContainer = document.getElementById('table-container');
    const tbody = document.getElementById('leads-table');
    const emptyState = document.getElementById('empty-state');

    loader.classList.add('d-block');
    tableContainer.classList.add('d-none');

    try {
        let url = '/leads?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (stage) url += `stage=${encodeURIComponent(stage)}&`;

        const data = await apiFetch(url);
        
        loader.classList.remove('d-block');
        tableContainer.classList.remove('d-none');

        if (data.leads.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('d-none');
        } else {
            emptyState.classList.add('d-none');
            tbody.innerHTML = data.leads.map(lead => `
                <tr>
                    <td><strong>${lead.lead_code}</strong></td>
                    <td>
                        <a href="lead-details.html?id=${lead.id}">${lead.customer_name}</a>
                    </td>
                    <td>${lead.phone}<br><small class="text-muted">${lead.email || ''}</small></td>
                    <td>${lead.requirement || '-'}</td>
                    <td><span class="badge ${getStageBadgeClass(lead.stage)}">${lead.stage}</span></td>
                    <td>${lead.assigned_employee_name || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary" onclick="editLead(${lead.id})">Edit</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        loader.classList.remove('d-block');
        showToast(err.message, 'danger');
    }
}

async function loadEmployees() {
    try {
        const data = await apiFetch('/auth/employees');
        const select = document.getElementById('assigned_employee_id');
        select.innerHTML = '<option value="">Select Employee</option>' + 
            data.employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('');
    } catch (err) {}
}

function openLeadModal() {
    document.getElementById('lead-form').reset();
    document.getElementById('lead-id').value = '';
    document.getElementById('leadModalLabel').textContent = 'Add Lead';
    document.getElementById('stage-container').style.display = 'none'; // Hide stage on create
}

async function editLead(id) {
    try {
        const data = await apiFetch(`/leads/${id}`);
        const lead = data.lead;
        
        document.getElementById('lead-id').value = lead.id;
        document.getElementById('customer_name').value = lead.customer_name;
        document.getElementById('phone').value = lead.phone;
        document.getElementById('email').value = lead.email || '';
        document.getElementById('requirement').value = lead.requirement || '';
        document.getElementById('budget').value = lead.budget || '';
        document.getElementById('lead_source').value = lead.lead_source || '';
        document.getElementById('stage').value = lead.stage;
        
        if (getUser().role === 'ADMIN') {
            document.getElementById('assigned_employee_id').value = lead.assigned_employee_id || '';
        }

        document.getElementById('leadModalLabel').textContent = 'Edit Lead';
        document.getElementById('stage-container').style.display = 'block'; // Show stage on edit
        
        leadModalInstance.show();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function handleLeadSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('lead-id').value;
    const leadData = {
        customer_name: document.getElementById('customer_name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        requirement: document.getElementById('requirement').value,
        budget: document.getElementById('budget').value,
        lead_source: document.getElementById('lead_source').value,
        stage: document.getElementById('stage').value,
    };

    if (getUser().role === 'ADMIN') {
        leadData.assigned_employee_id = document.getElementById('assigned_employee_id').value;
    }

    if (!id) {
        // Creating - Check for duplicates first
        try {
            const checkData = await apiFetch('/leads/check-duplicate', {
                method: 'POST',
                body: JSON.stringify({ phone: leadData.phone, email: leadData.email })
            });

            if (checkData.isDuplicate) {
                document.getElementById('dup-name').textContent = checkData.duplicate.customer_name;
                document.getElementById('dup-contact').textContent = `${checkData.duplicate.phone} | ${checkData.duplicate.email || ''}`;
                document.getElementById('dup-code').textContent = `(Code: ${checkData.duplicate.lead_code})`;
                
                pendingLeadData = leadData;
                leadModalInstance.hide();
                duplicateModalInstance.show();
                return;
            }
        } catch (err) {
            showToast('Error checking duplicate', 'danger');
            return;
        }
    }

    submitLeadData(leadData, id);
}

async function submitLeadData(data, id = null) {
    try {
        const url = id ? `/leads/${id}` : '/leads';
        const method = id ? 'PUT' : 'POST';

        const result = await apiFetch(url, {
            method,
            body: JSON.stringify(data)
        });

        if (result.success) {
            showToast(result.message);
            leadModalInstance.hide();
            loadLeads();
        }
    } catch (err) {
        showToast(err.message, 'danger');
    }
}
