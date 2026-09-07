let availableUnitsData = [];
let selectedUnitPrice = 0;
let cancelBookingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('bk_proj_id').addEventListener('change', handleProjectChange);
    document.getElementById('bk_bld_id').addEventListener('change', handleBuildingChange);
    document.getElementById('bk_unit_id').addEventListener('change', handleUnitChange);
    document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);
    document.getElementById('confirm-cancel-btn').addEventListener('click', processCancellation);

    await loadBookings();
});

async function loadBookings() {
    const loader = document.getElementById('loader');
    const container = document.getElementById('bookings-container');
    const tbody = document.getElementById('bookings-table');
    const empty = document.getElementById('bookings-empty');

    loader.classList.add('d-block');
    container.classList.add('d-none');

    try {
        const data = await apiFetch('/bookings');
        loader.classList.remove('d-block');
        container.classList.remove('d-none');

        if (data.bookings.length === 0) {
            tbody.innerHTML = '';
            empty.classList.remove('d-none');
        } else {
            empty.classList.add('d-none');
            tbody.innerHTML = data.bookings.map(b => `
                <tr>
                    <td><strong>${b.booking_code}</strong></td>
                    <td>${new Date(b.booking_date).toLocaleString()}</td>
                    <td><a href="lead-details.html?id=${b.lead_id}">${b.customer_name}</a></td>
                    <td>
                        Unit: ${b.unit_number}<br>
                        <small class="text-muted">${b.building_name}, ${b.project_name}</small><br>
                        <strong class="text-success">$${b.price}</strong>
                    </td>
                    <td>${b.sales_person}</td>
                    <td>
                        <span class="badge ${b.booking_status === 'Confirmed' ? 'bg-success' : 'bg-danger'}">${b.booking_status}</span>
                    </td>
                    <td class="admin-only">
                        ${b.booking_status === 'Confirmed' ? `<button class="btn btn-sm btn-outline-danger" onclick="confirmCancel(${b.id})">Cancel</button>` : '-'}
                    </td>
                </tr>
            `).join('');

            if(getUser().role !== 'ADMIN') {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            }
        }
    } catch (err) {
        loader.classList.remove('d-block');
        showToast('Failed to load bookings', 'danger');
    }
}

async function openBookingModal() {
    document.getElementById('booking-form').reset();
    document.getElementById('bk_bld_id').disabled = true;
    document.getElementById('bk_unit_id').disabled = true;
    document.getElementById('confirm-booking-btn').disabled = true;
    document.getElementById('unit-info-card').classList.add('d-none');
    document.getElementById('booking-error').style.display = 'none';

    try {
        // Load active leads
        const leadsData = await apiFetch('/leads');
        const activeLeads = leadsData.leads.filter(l => l.stage !== 'Lost');
        const leadSelect = document.getElementById('bk_lead_id');
        leadSelect.innerHTML = '<option value="">-- Select Lead --</option>' + 
            activeLeads.map(l => `<option value="${l.id}">${l.customer_name} (${l.phone}) - ${l.stage}</option>`).join('');

        // Load Projects
        const projData = await apiFetch('/properties/projects');
        document.getElementById('bk_proj_id').innerHTML = '<option value="">-- Select Project --</option>' + 
            projData.projects.map(p => `<option value="${p.id}">${p.project_name}</option>`).join('');

    } catch (err) {
        showToast('Error initializing booking form', 'danger');
    }
}

async function handleProjectChange() {
    const projectId = document.getElementById('bk_proj_id').value;
    const bldSelect = document.getElementById('bk_bld_id');
    const unitSelect = document.getElementById('bk_unit_id');
    
    bldSelect.innerHTML = '<option value="">-- Select Building --</option>';
    unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
    bldSelect.disabled = true;
    unitSelect.disabled = true;
    document.getElementById('unit-info-card').classList.add('d-none');
    document.getElementById('confirm-booking-btn').disabled = true;

    if (!projectId) return;

    try {
        const data = await apiFetch(`/properties/projects/${projectId}/buildings`);
        bldSelect.innerHTML += data.buildings.map(b => `<option value="${b.id}">${b.building_name}</option>`).join('');
        bldSelect.disabled = false;
    } catch (err) {
        showToast('Failed to load buildings', 'danger');
    }
}

async function handleBuildingChange() {
    const bldId = document.getElementById('bk_bld_id').value;
    const unitSelect = document.getElementById('bk_unit_id');
    
    unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
    unitSelect.disabled = true;
    document.getElementById('unit-info-card').classList.add('d-none');
    document.getElementById('confirm-booking-btn').disabled = true;

    if (!bldId) return;

    try {
        // Fetch only available units
        const data = await apiFetch(`/properties/buildings/${bldId}/units?status=Available`);
        availableUnitsData = data.units;
        unitSelect.innerHTML += availableUnitsData.map(u => `<option value="${u.id}">${u.unit_number} - $${u.price}</option>`).join('');
        unitSelect.disabled = false;
    } catch (err) {
        showToast('Failed to load units', 'danger');
    }
}

function handleUnitChange() {
    const unitId = document.getElementById('bk_unit_id').value;
    const infoCard = document.getElementById('unit-info-card');
    const confirmBtn = document.getElementById('confirm-booking-btn');

    if (!unitId) {
        infoCard.classList.add('d-none');
        confirmBtn.disabled = true;
        return;
    }

    const unit = availableUnitsData.find(u => u.id == unitId);
    if (unit) {
        document.getElementById('ui-num').textContent = unit.unit_number;
        document.getElementById('ui-type').textContent = unit.unit_type || 'N/A';
        document.getElementById('ui-area').textContent = unit.area ? unit.area + ' sqft' : 'N/A';
        document.getElementById('ui-price').textContent = `$${unit.price}`;
        
        selectedUnitPrice = unit.price;
        infoCard.classList.remove('d-none');
        confirmBtn.disabled = false;
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('confirm-booking-btn');
    const errorDiv = document.getElementById('booking-error');
    
    btn.disabled = true;
    btn.textContent = 'Processing...';
    errorDiv.style.display = 'none';

    const payload = {
        lead_id: document.getElementById('bk_lead_id').value,
        unit_id: document.getElementById('bk_unit_id').value,
        price: selectedUnitPrice
    };

    try {
        const result = await apiFetch('/bookings', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result.success) {
            showToast('Booking successful!');
            bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
            loadBookings();
        }
    } catch (err) {
        // Double booking conflict usually returns 409
        errorDiv.textContent = err.message || 'Error occurred while booking';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Booking';
    }
}

function confirmCancel(id) {
    cancelBookingId = id;
    new bootstrap.Modal(document.getElementById('cancelModal')).show();
}

async function processCancellation() {
    if (!cancelBookingId) return;
    try {
        const result = await apiFetch(`/bookings/${cancelBookingId}/cancel`, { method: 'PUT' });
        if (result.success) {
            showToast('Booking cancelled successfully');
            bootstrap.Modal.getInstance(document.getElementById('cancelModal')).hide();
            loadBookings();
        }
    } catch (err) {
        showToast(err.message, 'danger');
    }
}
