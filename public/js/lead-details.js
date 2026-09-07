let leadId = new URLSearchParams(window.location.search).get('id');
let activityModalInstance;

document.addEventListener('DOMContentLoaded', async () => {
    if (!leadId) {
        window.location.href = 'leads.html';
        return;
    }

    activityModalInstance = new bootstrap.Modal(document.getElementById('activityModal'));
    document.getElementById('activity-form').addEventListener('submit', handleActivitySubmit);

    await loadLeadDetails();
    await loadActivities();
});

async function loadLeadDetails() {
    try {
        const data = await apiFetch(`/leads/${leadId}`);
        const lead = data.lead;

        document.getElementById('loader').classList.remove('d-block');
        document.getElementById('content').classList.remove('d-none');

        document.getElementById('lead-name-header').textContent = lead.customer_name;
        document.getElementById('dt-code').textContent = lead.lead_code;
        document.getElementById('dt-name').textContent = lead.customer_name;
        document.getElementById('dt-phone').textContent = lead.phone;
        document.getElementById('dt-email').textContent = lead.email || '-';
        document.getElementById('dt-source').textContent = lead.lead_source || '-';
        document.getElementById('dt-req').textContent = lead.requirement || '-';
        document.getElementById('dt-budget').textContent = lead.budget ? `$${lead.budget}` : '-';
        document.getElementById('dt-assigned').textContent = lead.assigned_employee_name || '-';
        document.getElementById('dt-created').textContent = new Date(lead.created_at).toLocaleString();

        const stageSpan = document.getElementById('dt-stage');
        stageSpan.textContent = lead.stage;
        stageSpan.className = `badge ${getStageBadgeClass(lead.stage)}`;

    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function loadActivities() {
    try {
        const data = await apiFetch(`/leads/${leadId}/activities`);
        const tbody = document.getElementById('activities-table');

        if (data.activities.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No activities found</td></tr>';
            return;
        }

        tbody.innerHTML = data.activities.map(act => {
            const dateStr = new Date(act.activity_date).toLocaleString();
            let statusBadge = 'bg-secondary';
            if (act.status === 'Completed') statusBadge = 'bg-success';
            if (act.status === 'Scheduled') statusBadge = 'bg-primary';
            if (act.status === 'Overdue') statusBadge = 'bg-danger';

            let actionBtn = '';
            if (act.status === 'Scheduled' || act.status === 'Overdue') {
                actionBtn = `
                    <button class="btn btn-sm btn-success" onclick="updateActivityStatus(${act.id}, 'Completed')">✓</button>
                    <button class="btn btn-sm btn-danger" onclick="updateActivityStatus(${act.id}, 'Cancelled')">✕</button>
                `;
            }

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td>${act.activity_type}</td>
                    <td>${act.notes || ''}</td>
                    <td><span class="badge ${statusBadge}">${act.status}</span></td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        showToast('Failed to load activities', 'danger');
    }
}

async function handleActivitySubmit(e) {
    e.preventDefault();
    const type = document.getElementById('act_type').value;
    const date = document.getElementById('act_date').value;
    const notes = document.getElementById('act_notes').value;

    try {
        const result = await apiFetch(`/leads/${leadId}/activities`, {
            method: 'POST',
            body: JSON.stringify({ activity_type: type, activity_date: date, notes })
        });
        
        if (result.success) {
            showToast('Activity scheduled');
            activityModalInstance.hide();
            document.getElementById('activity-form').reset();
            loadActivities();
        }
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function updateActivityStatus(activityId, status) {
    try {
        const result = await apiFetch(`/leads/activities/${activityId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        if (result.success) {
            showToast(`Activity marked as ${status}`);
            loadActivities();
        }
    } catch (err) {
        showToast(err.message, 'danger');
    }
}
