document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await apiFetch('/dashboard/summary');
        
        // Hide loader
        document.getElementById('loader').classList.remove('d-block');
        document.getElementById('dashboard-content').classList.remove('d-none');

        // Populate KPIs
        document.getElementById('kpi-total').textContent = data.kpis.totalLeads;
        document.getElementById('kpi-new').textContent = data.kpis.newLeads;
        document.getElementById('kpi-bookings').textContent = data.kpis.bookings;
        document.getElementById('kpi-overdue').textContent = data.kpis.overdueFollowups;
        document.getElementById('kpi-available-units').textContent = data.kpis.availableUnits;
        document.getElementById('kpi-booked-units').textContent = data.kpis.bookedUnits;

        // Pipeline
        document.getElementById('pipe-new').textContent = data.kpis.newLeads;
        // Approximation from total - specific for simplicity, or we should have returned all pipeline counts
        // I actually only returned a few. Let's fix this mentally - I did return siteVisits, negotiations, bookings, lostLeads, newLeads.
        document.getElementById('pipe-sitevisit').textContent = data.kpis.siteVisits;
        document.getElementById('pipe-negotiation').textContent = data.kpis.negotiations;
        document.getElementById('pipe-booked').textContent = data.kpis.bookings;
        document.getElementById('pipe-lost').textContent = data.kpis.lostLeads;

        // Populate Overdue Table
        const overdueTbody = document.getElementById('overdue-table');
        if (data.recentOverdue.length === 0) {
            overdueTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No overdue follow-ups</td></tr>';
        } else {
            overdueTbody.innerHTML = data.recentOverdue.map(activity => `
                <tr>
                    <td><a href="lead-details.html?id=${activity.lead_id}">${activity.customer_name}</a></td>
                    <td>${activity.activity_type}</td>
                    <td><span class="text-danger">${new Date(activity.activity_date).toLocaleString()}</span></td>
                </tr>
            `).join('');
        }

        // Populate Recent Bookings Table
        const bookingsTbody = document.getElementById('bookings-table');
        if (data.recentBookings.length === 0) {
            bookingsTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No recent bookings</td></tr>';
        } else {
            bookingsTbody.innerHTML = data.recentBookings.map(b => `
                <tr>
                    <td>${b.booking_code}</td>
                    <td>${b.customer_name}</td>
                    <td>${b.unit_number}</td>
                    <td>${new Date(b.booking_date).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
        
    } catch (err) {
        showToast(err.message, 'danger');
    }
});
