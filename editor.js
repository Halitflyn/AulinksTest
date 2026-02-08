/* ================= STATE MANAGEMENT ================= */
const state = {
    step: 1,
    settings: {
        group: "",
        weekType: "dynamic",
        currentWeek: "numerator",
        pairsPerDay: 5,
        times: ["08:30-09:50", "10:05-11:25", "11:40-13:00", "13:15-14:35", "14:50-16:10", "16:25-17:45", "18:00-19:20", "19:35-21:00"]
    },
    subjects: [], // Array of {id, name, types: [], teachers: {Lec:[], Prac:[], Lab:[]}}
    // Grid structure: mapped by dayIndex-pairIndex
    grid: {} // key "0-1" (Mon, Pair 2): { structure: 'single'|'split-v'|'split-h', content: {main, top, bottom, left, right} }
};

const days = ["Пн", "Вт", "Ср", "Чт", "Пт"];
const fullDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];

/* ================= WIZARD NAVIGATION ================= */
const wizard = {
    init: () => {
        renderTimeInputs();
        loadFromStorage();
        updateUI();
    },
    next: () => {
        if (state.step === 1) saveStep1();
        if (state.step === 2 && state.subjects.length === 0) {
            alert("Додайте хоча б один предмет!");
            return;
        }
        if (state.step === 3) {
            renderFillGrid(); // Prepare Step 4
            renderDraggables();
        }
        if (state.step < 4) {
            state.step++;
            updateUI();
        }
    },
    prev: () => {
        if (state.step > 1) {
            state.step--;
            updateUI();
        }
    }
};

function updateUI() {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-indicator').forEach(el => el.classList.remove('active'));
    
    // Show current
    document.getElementById(`step-${state.step}`).classList.add('active');
    document.querySelector(`.step-indicator[data-step="${state.step}"]`).classList.add('active');

    if (state.step === 3) renderStructureGrid();
}

/* ================= STEP 1: SETTINGS ================= */
function renderTimeInputs() {
    const container = document.getElementById('timeSettings');
    container.innerHTML = '';
    const count = parseInt(document.getElementById('pairsPerDay').value) || 5;
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'input-group';
        div.innerHTML = `<label>Пара ${i+1}</label><input type="text" class="time-in" value="${state.settings.times[i] || ''}">`;
        container.appendChild(div);
    }
}

document.getElementById('pairsPerDay').addEventListener('change', renderTimeInputs);

function saveStep1() {
    state.settings.group = document.getElementById('groupName').value;
    state.settings.weekType = document.getElementById('weekTypeSelect').value;
    state.settings.currentWeek = document.querySelector('input[name="curWeek"]:checked').value;
    state.settings.pairsPerDay = parseInt(document.getElementById('pairsPerDay').value);
    
    state.settings.times = Array.from(document.querySelectorAll('.time-in')).map(i => i.value);
}

/* ================= STEP 2: SUBJECTS (Smart Logic) ================= */
const typeCheckboxes = document.querySelectorAll('.type-check');
typeCheckboxes.forEach(cb => cb.addEventListener('change', renderTeacherFields));

function renderTeacherFields() {
    const container = document.getElementById('teacherFields');
    container.innerHTML = '';
    
    const selectedTypes = Array.from(document.querySelectorAll('.type-check:checked')).map(cb => cb.value);
    
    if (selectedTypes.length === 0) return;

    // Logic: If multiple types, show checkboxes next to teacher input. If one, auto-assign.
    const div = document.createElement('div');
    div.className = 'input-group full-width';
    
    let html = `<label>Викладач(і) та Аудиторія</label>`;
    
    // Simple logic: One row per teacher entry allowed for now, user can add logic to add multiple rows if needed
    // Simplified for UX: Just one row that can handle multiple types
    html += `
    <div class="teacher-row-input">
        <input type="text" id="teachName" placeholder="ПІБ Викладача">
        <input type="text" id="teachRoom" placeholder="Ауд." style="width: 80px;">
        <div class="teacher-types">
            ${selectedTypes.map(t => `
                <label style="font-size: 0.8rem">
                    <input type="checkbox" class="t-role" value="${t}" checked> ${t}
                </label>
            `).join('')}
        </div>
    </div>
    <small style="opacity:0.6">Якщо різні викладачі для різних типів, додайте предмет двічі з різними налаштуваннями або використовуйте редагування.</small>
    `;
    
    div.innerHTML = html;
    container.appendChild(div);
}

document.getElementById('addSubjectBtn').addEventListener('click', () => {
    const name = document.getElementById('subjName').value;
    if (!name) return;

    const types = Array.from(document.querySelectorAll('.type-check:checked')).map(cb => cb.value);
    const tName = document.getElementById('teachName')?.value || "";
    const tRoom = document.getElementById('teachRoom')?.value || "";
    
    // Map teacher to types
    const teacherMap = {}; // { Lec: {name, room}, ... }
    if (tName) {
        document.querySelectorAll('.t-role:checked').forEach(cb => {
            teacherMap[cb.value] = { name: tName, room: tRoom };
        });
    }

    const id = Date.now().toString();
    state.subjects.push({ id, name, types, teachers: teacherMap });
    
    renderSubjectsList();
    // Clear inputs
    document.getElementById('subjName').value = '';
    document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    document.getElementById('teacherFields').innerHTML = '';
});

function renderSubjectsList() {
    const list = document.getElementById('subjectsList');
    list.innerHTML = state.subjects.map(s => `
        <div class="subject-card">
            <h4>${s.name}</h4>
            <div class="badges">
                ${s.types.map(t => `<span style="font-size:10px; border:1px solid #ccc; padding:2px; margin-right:2px">${t}</span>`).join('')}
            </div>
            <span class="remove-btn" onclick="removeSubject('${s.id}')">×</span>
        </div>
    `).join('');
}

window.removeSubject = (id) => {
    state.subjects = state.subjects.filter(s => s.id !== id);
    renderSubjectsList();
};

/* ================= STEP 3: GRID STRUCTURE ================= */
function renderStructureGrid() {
    const container = document.getElementById('structureGrid');
    container.innerHTML = '';
    
    // Headers
    container.style.gridTemplateColumns = `50px repeat(${days.length}, 1fr)`;
    container.appendChild(createDiv('grid-header', 'Час'));
    days.forEach(d => container.appendChild(createDiv('grid-header', d)));

    // Rows
    for (let p = 0; p < state.settings.pairsPerDay; p++) {
        // Time Cell
        const timeCell = createDiv('grid-cell time-cell', '');
        timeCell.innerHTML = `<div class="time-col">${state.settings.times[p]}</div>`;
        container.appendChild(timeCell);

        // Day Cells
        for (let d = 0; d < days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || { structure: 'single' };
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.key = key;
            cell.dataset.structure = cellData.structure;
            
            cell.innerHTML = buildCellInnerHTML(cellData.structure);
            
            // Event to open Radial Menu
            cell.addEventListener('click', (e) => openRadialMenu(e, key, cell));
            
            container.appendChild(cell);
        }
    }
}

function createDiv(cls, html) {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    return d;
}

function buildCellInnerHTML(structure) {
    if (structure === 'split-v') {
        return `<div class="cell-split-v">
            <div class="sub-cell numerator"></div>
            <div class="sub-cell denominator"></div>
        </div>`;
    }
    if (structure === 'split-h') {
        return `<div class="cell-split-h">
            <div class="sub-cell group1"></div>
            <div class="sub-cell group2"></div>
        </div>`;
    }
    return `<div class="sub-cell single"></div>`;
}

// Radial Menu Logic
const radialMenu = document.getElementById('gridRadialMenu');
let activeCellKey = null;

function openRadialMenu(e, key, cellEl) {
    if (e.target.closest('.radial-menu')) return;
    e.stopPropagation();

    activeCellKey = key;
    const rect = cellEl.getBoundingClientRect();
    
    // Position menu in center of cell
    radialMenu.style.left = `${rect.left + rect.width/2 - 50}px`;
    radialMenu.style.top = `${rect.top + rect.height/2 - 50}px`; // 50 is half menu size
    radialMenu.classList.remove('hidden');
    
    // Smart hide logic: Hide Subgroups if vertical split active etc. (Optional polish)
}

document.addEventListener('click', () => radialMenu.classList.add('hidden'));

radialMenu.querySelectorAll('.radial-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const action = e.target.closest('.radial-btn').dataset.action;
        modifyGrid(activeCellKey, action);
    });
});

function modifyGrid(key, action) {
    if (!state.grid[key]) state.grid[key] = { structure: 'single', content: {} };
    
    if (action === 'split-vertical') state.grid[key].structure = 'split-v';
    if (action === 'split-horizontal') state.grid[key].structure = 'split-h';
    if (action === 'clear') state.grid[key] = { structure: 'single', content: {} };
    // if action == time -> prompt user (simplified)
    
    renderStructureGrid(); // Re-render Step 3
}


/* ================= STEP 4: DRAG & DROP EDITOR ================= */
function renderDraggables() {
    const container = document.getElementById('draggableSubjects');
    container.innerHTML = state.subjects.map(s => `
        <div class="drag-item" data-id="${s.id}">
            <strong>${s.name}</strong>
            <div style="font-size:10px; color:#666">${s.types.join(', ')}</div>
        </div>
    `).join('');
    
    initCustomDrag();
}

function renderFillGrid() {
    const container = document.getElementById('fillGrid');
    container.innerHTML = '';
    // Same grid logic but interactive for drop
    container.style.gridTemplateColumns = `50px repeat(${days.length}, 1fr)`;
    
    // Render
    for (let p = 0; p < state.settings.pairsPerDay; p++) {
        container.appendChild(createDiv('grid-header time-col', `<span style="writing-mode:vertical-rl">${state.settings.times[p]}</span>`));
        for (let d = 0; d < days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || { structure: 'single', content: {} };
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            // Reconstruct internal structure but with data-target attributes
            if (cellData.structure === 'split-v') {
                cell.innerHTML = `
                    <div class="cell-split-v">
                        <div class="sub-cell numerator" data-drop-key="${key}" data-part="top">${renderLesson(cellData.content?.top)}</div>
                        <div class="sub-cell denominator" data-drop-key="${key}" data-part="bottom">${renderLesson(cellData.content?.bottom)}</div>
                    </div>`;
            } else if (cellData.structure === 'split-h') {
                cell.innerHTML = `
                    <div class="cell-split-h">
                        <div class="sub-cell group1" data-drop-key="${key}" data-part="left">${renderLesson(cellData.content?.left)}</div>
                        <div class="sub-cell group2" data-drop-key="${key}" data-part="right">${renderLesson(cellData.content?.right)}</div>
                    </div>`;
            } else {
                cell.innerHTML = `<div class="sub-cell single" data-drop-key="${key}" data-part="main">${renderLesson(cellData.content?.main)}</div>`;
            }
            container.appendChild(cell);
        }
    }
}

function renderLesson(lessonData) {
    if (!lessonData) return '';
    return `<div class="lesson-chip type-${lessonData.type}">
        <b>${lessonData.subject}</b>
        <span>${lessonData.type}</span>
        <small>${lessonData.room}</small>
    </div>`;
}

// === CUSTOM DRAG AND DROP IMPLEMENTATION ===
let isDragging = false;
let dragSubjectId = null;
const ghost = document.getElementById('dragGhost');
const ghostContent = ghost.querySelector('.ghost-content');

function initCustomDrag() {
    const items = document.querySelectorAll('.drag-item');
    items.forEach(item => {
        item.addEventListener('mousedown', startDrag);
    });
}

function startDrag(e) {
    if (e.button !== 0) return; // Left click only
    isDragging = true;
    dragSubjectId = e.currentTarget.dataset.id;
    
    // Setup ghost
    const subj = state.subjects.find(s => s.id === dragSubjectId);
    ghostContent.innerHTML = `${subj.name}`;
    
    // Show ghost at cursor
    updateGhostPos(e);
    ghost.classList.remove('hidden');
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
}

function onDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    updateGhostPos(e);
    
    // Highlight drop zones
    document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover'));
    const target = getElementUnderMouse(e);
    if (target && target.classList.contains('sub-cell')) {
        target.classList.add('drop-hover');
        
        // Visual Logic: Color ghost based on position relative to cell center?
        // (Optional complexity skipped to ensure robustness)
    }
}

function updateGhostPos(e) {
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
}

function getElementUnderMouse(e) {
    // Hide ghost momentarily to get element below it
    ghost.style.display = 'none';
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    ghost.style.display = 'block';
    return elem;
}

function endDrag(e) {
    isDragging = false;
    ghost.classList.add('hidden');
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover'));

    const target = getElementUnderMouse(e)?.closest('.sub-cell');
    if (target && target.dataset.dropKey) {
        handleDrop(target.dataset.dropKey, target.dataset.part);
    }
}

function handleDrop(key, part) {
    const subj = state.subjects.find(s => s.id === dragSubjectId);
    
    if (subj.types.length > 1) {
        // Show Modal
        showTypeSelectionModal(subj, (selectedType) => {
            saveLesson(key, part, subj, selectedType);
        });
    } else {
        saveLesson(key, part, subj, subj.types[0]);
    }
}

function showTypeSelectionModal(subj, callback) {
    const modal = document.getElementById('modalOverlay');
    const container = document.getElementById('modalOptions');
    container.innerHTML = '';
    
    subj.types.forEach(t => {
        const btn = document.createElement('button');
        btn.className = `btn type-${t}`;
        btn.textContent = `${t} (${subj.teachers[t]?.name || 'Auto'})`;
        btn.onclick = () => {
            modal.classList.add('hidden');
            callback(t);
        };
        container.appendChild(btn);
    });
    
    modal.classList.remove('hidden');
}

window.closeModal = () => document.getElementById('modalOverlay').classList.add('hidden');

function saveLesson(key, part, subjectObj, type) {
    if (!state.grid[key]) state.grid[key] = { structure: 'single', content: {} };
    if (!state.grid[key].content) state.grid[key].content = {};
    
    const teacherData = subjectObj.teachers[type] || {name: '', room: ''};
    
    state.grid[key].content[part] = {
        subject: subjectObj.name,
        type: type,
        teacher: teacherData.name,
        room: teacherData.room
    };
    
    renderFillGrid();
}

/* ================= EXPORT & SAVE ================= */
document.getElementById('saveResultBtn').addEventListener('click', () => {
    // Convert Grid State to standard JSON format for index.html
    const exportData = {
        group: state.settings.group,
        schedule: {}
    };
    
    // Mapping: 0 -> monday
    fullDays.forEach((dayName, dIndex) => {
        exportData.schedule[dayName] = [];
        for (let p = 0; p < state.settings.pairsPerDay; p++) {
            const key = `${dIndex}-${p}`;
            const cell = state.grid[key];
            
            // Logic to convert internal state 'single/split' to compatible JSON
            // Simplified for this demo:
            if(cell && cell.content) {
                // Add to export...
            }
        }
    });

    localStorage.setItem('mySchedule', JSON.stringify(state)); // Saving full state for Editor
    alert("Розклад збережено в LocalStorage!");
});

function loadFromStorage() {
    const data = localStorage.getItem('mySchedule');
    if (data) {
        const parsed = JSON.parse(data);
        Object.assign(state, parsed);
        // Can jump to saved step if needed
    }
}

// Init
document.getElementById('themeToggle').addEventListener('click', () => document.body.classList.toggle('dark-mode'));
wizard.init();
