let projectsData = [];
let buildingsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('project-select').addEventListener('change', handleProjectChange);
    document.getElementById('building-select').addEventListener('change', loadUnits);

    if (getUser().role === 'ADMIN') {
        document.getElementById('project-form').addEventListener('submit', handleAddProject);
        document.getElementById('building-form').addEventListener('submit', handleAddBuilding);
        document.getElementById('unit-form').addEventListener('submit', handleAddUnit);
    }

    await loadProjects();
});

async function loadProjects() {
    try {
        const data = await apiFetch('/properties/projects');
        projectsData = data.projects;
        
        const projSelect = document.getElementById('project-select');
        const bldProjSelect = document.getElementById('bld_proj_id'); // Admin modal

        const opts = '<option value="">-- Select Project --</option>' + 
            projectsData.map(p => `<option value="${p.id}">${p.project_name}</option>`).join('');
        
        projSelect.innerHTML = opts;
        if(bldProjSelect) bldProjSelect.innerHTML = opts;

    } catch (err) {
        showToast('Failed to load projects', 'danger');
    }
}

async function handleProjectChange() {
    const projectId = document.getElementById('project-select').value;
    const bldSelect = document.getElementById('building-select');
    
    document.getElementById('units-container').classList.add('d-none');

    if (!projectId) {
        bldSelect.innerHTML = '<option value="">-- Select Building --</option>';
        bldSelect.disabled = true;
        return;
    }

    try {
        const data = await apiFetch(`/properties/projects/${projectId}/buildings`);
        buildingsData = data.buildings;
        
        bldSelect.innerHTML = '<option value="">-- Select Building --</option>' + 
            buildingsData.map(b => `<option value="${b.id}">${b.building_name}</option>`).join('');
        bldSelect.disabled = false;
        
        // Populate Admin modal unit_bld_id if present
        const unitBldSelect = document.getElementById('unit_bld_id');
        if(unitBldSelect) {
            unitBldSelect.innerHTML = bldSelect.innerHTML;
        }

    } catch (err) {
        showToast('Failed to load buildings', 'danger');
    }
}

async function loadUnits() {
    const bldId = document.getElementById('building-select').value;
    const container = document.getElementById('units-container');
    const tbody = document.getElementById('units-table');
    const empty = document.getElementById('units-empty');

    if (!bldId) {
        container.classList.add('d-none');
        return;
    }

    try {
        document.getElementById('loader').classList.add('d-block');
        const data = await apiFetch(`/properties/buildings/${bldId}/units`);
        document.getElementById('loader').classList.remove('d-block');
        
        container.classList.remove('d-none');

        if (data.units.length === 0) {
            tbody.innerHTML = '';
            empty.classList.remove('d-none');
        } else {
            empty.classList.add('d-none');
            tbody.innerHTML = data.units.map(u => `
                <tr>
                    <td><strong>${u.unit_number}</strong></td>
                    <td>${u.floor || '-'}</td>
                    <td>${u.unit_type || '-'}</td>
                    <td>${u.area ? u.area + ' sqft' : '-'}</td>
                    <td>$${u.price}</td>
                    <td class="status-${u.status.toLowerCase()}">${u.status}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        document.getElementById('loader').classList.remove('d-block');
        showToast('Failed to load units', 'danger');
    }
}

// Admin Add Methods
async function handleAddProject(e) {
    e.preventDefault();
    try {
        const result = await apiFetch('/properties/projects', {
            method: 'POST',
            body: JSON.stringify({
                project_name: document.getElementById('proj_name').value,
                location: document.getElementById('proj_loc').value,
                description: document.getElementById('proj_desc').value
            })
        });
        showToast(result.message);
        bootstrap.Modal.getInstance(document.getElementById('projectModal')).hide();
        loadProjects();
    } catch(err) { showToast(err.message, 'danger'); }
}

async function handleAddBuilding(e) {
    e.preventDefault();
    try {
        const result = await apiFetch('/properties/buildings', {
            method: 'POST',
            body: JSON.stringify({
                project_id: document.getElementById('bld_proj_id').value,
                building_name: document.getElementById('bld_name').value,
                floors: document.getElementById('bld_floors').value
            })
        });
        showToast(result.message);
        bootstrap.Modal.getInstance(document.getElementById('buildingModal')).hide();
        if(document.getElementById('project-select').value == document.getElementById('bld_proj_id').value) {
            handleProjectChange(); // refresh
        }
    } catch(err) { showToast(err.message, 'danger'); }
}

async function handleAddUnit(e) {
    e.preventDefault();
    try {
        const result = await apiFetch('/properties/units', {
            method: 'POST',
            body: JSON.stringify({
                building_id: document.getElementById('unit_bld_id').value,
                unit_number: document.getElementById('unit_num').value,
                floor: document.getElementById('unit_floor').value,
                unit_type: document.getElementById('unit_type').value,
                area: document.getElementById('unit_area').value,
                price: document.getElementById('unit_price').value,
                status: document.getElementById('unit_status').value
            })
        });
        showToast(result.message);
        bootstrap.Modal.getInstance(document.getElementById('unitModal')).hide();
        if(document.getElementById('building-select').value == document.getElementById('unit_bld_id').value) {
            loadUnits(); // refresh
        }
    } catch(err) { showToast(err.message, 'danger'); }
}
