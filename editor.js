const SCHEDULE_STORAGE_KEY = 'myCustomSchedule';
const DEFAULT_TIMES = ['08:30 – 09:50', '10:05 – 11:25', '11:40 – 13:00', '13:15 – 14:35', '14:50 – 16:10', '16:25 – 17:45', '18:00 – 19:20', '19:30 – 20:50'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAYS_UA = { monday: 'Понеділок', tuesday: 'Вівторок', wednesday: 'Середа', thursday: 'Четвер', friday: 'П’ятниця' };

let appState = {
    step: 1,
    config: { weekType: 'numden', currentWeek: 'num', count: 5, times: [] },
    subjects: [], 
    gridData: {}, 
    draggedSubject: null, dragStartPos: {x:0, y:0}, activeSector: null, ghost: null,
    radialMenu: null, radialLabels: null,
    activePath: null // Path to the clicked cell for structure editing
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnClassicEdit').onclick = () => showScreen('classicEditor');
    document.getElementById('btnVisualEdit').onclick = () => { showScreen('visualWizard'); initWizard(); };
    document.getElementById('addDetailRowBtn').onclick = () => addDetailRow();
    document.getElementById('addSmartSubjectBtn').onclick = addSmartSubject;
    ['smartHasLec', 'smartHasPrac', 'smartHasLab'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateBindCheckboxesVisibility);
    });
    document.getElementById('finishVisualBtn').onclick = saveVisualSchedule;
    document.getElementById('saveTimeBtn').onclick = applyCustomTime;
    createRadialMenuDOM();
});

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById(id).style.display = 'block';
}

function initWizard() {
    renderWizardTimeSlots();
    appState.gridData = {};
    DAYS.forEach(d => appState.gridData[d] = []);
}

function wizardNext(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    appState.step = step;

    if (step === 2) {
        appState.config.weekType = document.getElementById('wizWeekType').value;
        appState.config.currentWeek = document.getElementById('wizCurrentWeek').value;
        appState.config.count = parseInt(document.getElementById('wizLessonCount').value);
        appState.config.times = [];
        for(let i=1; i<=appState.config.count; i++) {
            appState.config.times.push(document.getElementById(`wizTime_${i}`).value);
        }
        DAYS.forEach(day => {
            if (appState.gridData[day].length === 0) {
                // Initial Structure: Array of Root Nodes
                appState.gridData[day] = Array(appState.config.count).fill(null).map(() => ({ type: 'single', content: {} }));
            }
        });
    }
    if (step === 3) renderStructureGrid();
    if (step === 4) {
        renderFillGrid();
        renderSidebarPuzzles();
    }
}

function renderWizardTimeSlots() {
    const container = document.getElementById('wizTimeSlots');
    container.innerHTML = '';
    for(let i=0; i<8; i++) {
        container.innerHTML += `<input type="text" id="wizTime_${i+1}" value="${DEFAULT_TIMES[i] || ''}" placeholder="Час ${i+1}">`;
    }
}

// === STEP 2 (Subjects) ===
function updateBindCheckboxesVisibility() {
    const l = document.getElementById('smartHasLec').checked;
    const p = document.getElementById('smartHasPrac').checked;
    const lb = document.getElementById('smartHasLab').checked;
    const showBlock = ((l?1:0) + (p?1:0) + (lb?1:0)) > 1;
    document.querySelectorAll('.type-bind-checks').forEach(block => {
        if(showBlock) {
            block.classList.remove('hidden');
            block.querySelector('.chk-wrap-l').style.display = l ? 'flex' : 'none';
            block.querySelector('.chk-wrap-p').style.display = p ? 'flex' : 'none';
            block.querySelector('.chk-wrap-lb').style.display = lb ? 'flex' : 'none';
        } else {
            block.classList.add('hidden');
        }
    });
}

function addDetailRow(data = {}) {
    const container = document.getElementById('smartDetailsList');
    const div = document.createElement('div');
    div.className = 'detail-row';
    div.innerHTML = `
        <input type="text" class="inp-teacher" placeholder="Викладач" value="${data.teacher || ''}">
        <input type="text" class="inp-room" placeholder="Аудиторія" value="${data.room || ''}">
        <div class="type-bind-checks hidden">
            <div class="chk-wrap chk-wrap-l"><label><input type="checkbox" class="chk-l" ${data.bind?.l ? 'checked' : ''}>L</label></div>
            <div class="chk-wrap chk-wrap-p"><label><input type="checkbox" class="chk-p" ${data.bind?.p ? 'checked' : ''}>P</label></div>
            <div class="chk-wrap chk-wrap-lb"><label><input type="checkbox" class="chk-lb" ${data.bind?.lb ? 'checked' : ''}>Lb</label></div>
        </div>
        <button class="remove-row-btn" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
    updateBindCheckboxesVisibility();
}

function addSmartSubject() {
    const name = document.getElementById('smartSubjectName').value.trim();
    if(!name) return alert('Введіть назву');
    const types = {
        lec: document.getElementById('smartHasLec').checked,
        prac: document.getElementById('smartHasPrac').checked,
        lab: document.getElementById('smartHasLab').checked
    };
    if(!types.lec && !types.prac && !types.lab) return alert('Оберіть хоча б один тип');

    const details = [];
    document.querySelectorAll('#smartDetailsList .detail-row').forEach(row => {
        const t = row.querySelector('.inp-teacher').value.trim();
        const r = row.querySelector('.inp-room').value.trim();
        let bind = {
            l: row.querySelector('.chk-l').checked,
            p: row.querySelector('.chk-p').checked,
            lb: row.querySelector('.chk-lb').checked
        };
        const areChecksHidden = row.querySelector('.type-bind-checks').classList.contains('hidden');
        if (areChecksHidden || (!bind.l && !bind.p && !bind.lb)) {
            if(types.lec) bind.l = true; if(types.prac) bind.p = true; if(types.lab) bind.lb = true;
        }
        if(t || r) details.push({ teacher: t, room: r, bind });
    });
    if(details.length === 0) details.push({teacher:'', room:'', bind:{l:types.lec, p:types.prac, lb:types.lab}});

    const newSubj = { id: Date.now(), name, types, details };
    
    if (appState.editingId) {
        const idx = appState.subjects.findIndex(s => s.id === appState.editingId);
        if(idx > -1) appState.subjects[idx] = newSubj;
        else appState.subjects.push(newSubj);
        appState.editingId = null;
    } else {
        appState.subjects.push(newSubj);
    }
    
    document.getElementById('smartSubjectName').value = '';
    document.getElementById('smartHasLec').checked = false;
    document.getElementById('smartHasPrac').checked = false;
    document.getElementById('smartHasLab').checked = false;
    document.getElementById('smartDetailsList').innerHTML = '';
    addDetailRow(); 
    document.getElementById('addSmartSubjectBtn').innerText = '+ Додати предмет';
    renderSmartList();
    updateBindCheckboxesVisibility();
}

function renderSmartList() {
    const list = document.getElementById('smartSubjectList');
    list.innerHTML = appState.subjects.map(s => `
        <div class="smart-item" ondblclick="editSmartSubject(${s.id})">
            <span class="del-item-btn" onclick="removeSmartSubject(${s.id}); event.stopPropagation()">×</span>
            <h5>${s.name}</h5>
            <div class="badges">
                ${s.types.lec ? '<span class="badge lec">Лек</span>' : ''}
                ${s.types.prac ? '<span class="badge prac">Прак</span>' : ''}
                ${s.types.lab ? '<span class="badge lab">Лаб</span>' : ''}
            </div>
        </div>`).join('');
}

function editSmartSubject(id) {
    const s = appState.subjects.find(x => x.id === id);
    if(!s) return;
    appState.editingId = id;
    document.getElementById('smartSubjectName').value = s.name;
    document.getElementById('smartHasLec').checked = s.types.lec;
    document.getElementById('smartHasPrac').checked = s.types.prac;
    document.getElementById('smartHasLab').checked = s.types.lab;
    const container = document.getElementById('smartDetailsList');
    container.innerHTML = '';
    s.details.forEach(d => addDetailRow(d));
    document.getElementById('addSmartSubjectBtn').innerText = '💾 Зберегти зміни';
    updateBindCheckboxesVisibility();
    // Remove from list visually
    appState.subjects = appState.subjects.filter(x => x.id !== id);
    renderSmartList();
}

function removeSmartSubject(id) {
    appState.subjects = appState.subjects.filter(s => s.id !== id);
    renderSmartList();
}

// === RECURSIVE GRID RENDERING (Structure & Fill) ===

function getNodeByPath(day, idx, path) {
    let node = appState.gridData[day][idx];
    for (let key of path) {
        if (!node.content[key]) node.content[key] = { type: 'single', content: {} };
        node = node.content[key];
    }
    return node;
}

// Generates HTML for a node (recursive)
function renderNodeHTML(node, day, idx, pathStr, mode) {
    if (node.type === 'single') {
        const pathJSON = JSON.stringify(pathStr);
        let inner = '';
        if (mode === 'structure') {
            inner = `<div class="sub-cell-wrapper"><div class="sub-cell clickable-slot" onclick='handleCellClick(event, "${day}", ${idx}, ${pathJSON})'></div></div>`;
        } else {
            // FILL MODE
            inner = `<div class="sub-cell-wrapper"><div class="sub-cell clickable-slot" data-path='${pathJSON}' data-day="${day}" data-idx="${idx}">`;
            if (node.content.subject) {
                let typeLabel = node.content.type === 'Лекція' ? 'Лек' : (node.content.type === 'Практична' ? 'Прак' : 'Лаб');
                let style = '';
                if(node.content.type==='Лекція') style='background:var(--lec-bg);color:var(--lec-txt)';
                if(node.content.type==='Практична') style='background:var(--prac-bg);color:var(--prac-txt)';
                if(node.content.type==='Лабораторна') style='background:var(--lab-bg);color:var(--lab-txt)';
                
                inner = `<div class="sub-cell" style="${style}"><b>${node.content.subject}</b><br><small>${typeLabel}</small><br><small>${node.content.room||''}</small></div>`;
            } else {
                inner = `<div class="sub-cell" style="opacity:0.5; font-size:10px">Пусто</div>`;
            }
            inner += `</div></div>`;
        }
        return inner;
    } 
    
    // Recursive container
    let containerClass = (node.type === 'numden') ? 'split-v' : 'split-h';
    let keys = (node.type === 'numden') ? ['num', 'den'] : ['sub1', 'sub2'];
    let labels = (node.type === 'numden') ? ['Чис', 'Знам'] : ['Гр. 1', 'Гр. 2'];
    
    let html = `<div class="${containerClass}">`;
    keys.forEach((k, i) => {
        // Ensure child exists
        if(!node.content[k]) node.content[k] = { type: 'single', content: {} };
        
        html += `<div style="flex:1; display:flex; position:relative; border:1px solid var(--border); margin:-1px;">`;
        // Label for container
        if (mode === 'structure') {
             html += `<div style="position:absolute; top:0; left:0; font-size:9px; color:#aaa; padding:1px;">${labels[i]}</div>`;
        }
        // Recurse
        html += renderNodeHTML(node.content[k], day, idx, [...pathStr, k], mode);
        html += `</div>`;
    });
    html += `</div>`;
    return html;
}

function renderGridGeneric(containerId, mode) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    DAYS.forEach(day => {
        const dayBlock = document.createElement('div');
        dayBlock.className = 'day-block';
        dayBlock.innerHTML = `<div class="day-header">${DAYS_UA[day]}</div>`;
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'day-slots';

        appState.gridData[day].forEach((lesson, idx) => {
            const row = document.createElement('div');
            row.className = 'grid-row';
            
            // Fixed Time & Number Columns
            const timeVal = lesson.customTime || appState.config.times[idx] || '';
            row.innerHTML = `
                <div class="row-number">${idx+1}</div>
                <div class="row-time" onclick="openTimeModal('${day}', ${idx})">${timeVal}</div>
            `;

            // Slot Tree
            const slot = document.createElement('div');
            slot.className = 'grid-slot';
            slot.innerHTML = renderNodeHTML(lesson, day, idx, [], mode);
            
            row.appendChild(slot);
            slotsContainer.appendChild(row);
        });
        dayBlock.appendChild(slotsContainer);
        container.appendChild(dayBlock);
    });
    
    if (mode === 'fill') setupFillListeners();
}

function renderStructureGrid() { renderGridGeneric('structureGrid', 'structure'); }
function renderFillGrid() { renderGridGeneric('visualGridFill', 'fill'); }

// === STRUCTURE ACTIONS ===
window.handleCellClick = function(e, day, idx, path) {
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    appState.activePath = { day, idx, path };
    
    const options = [
        { label: '🗑 Очистити', angle: 270, action: 'clear', color: '#ef4444' }, // Left
        { label: '⬆ Чис/Знам', angle: 0, action: 'numden', color: '#10b981' },   // Top
        { label: '➡ Підгрупи', angle: 90, action: 'subgroups', color: '#3b82f6' } // Right
    ];
    
    showRadialMenu(clientX, clientY, options, (action) => {
        applyStructureChange(action);
    });
}

function applyStructureChange(action) {
    const { day, idx, path } = appState.activePath;
    let node = getNodeByPath(day, idx, path);
    
    if (action === 'clear') {
        // Reset this node to single empty
        node.type = 'single';
        node.content = {};
    } else {
        // Split
        node.type = action;
        node.content = {}; // Reset content when splitting structure
        if (action === 'numden') {
            node.content.num = { type: 'single', content: {} };
            node.content.den = { type: 'single', content: {} };
        } else {
            node.content.sub1 = { type: 'single', content: {} };
            node.content.sub2 = { type: 'single', content: {} };
        }
    }
    renderStructureGrid();
}

// === FILL & DRAG ACTIONS ===
function setupFillListeners() {
    // Add touch listeners to .sub-cell elements in Fill Grid
    // Since innerHTML is re-rendered, we need to re-bind or use delegation.
    // The visual rendering puts data attributes, so setupTouchDrag handles drop target finding via elementFromPoint.
}

function renderSidebarPuzzles() {
    const container = document.getElementById('puzzleContainer');
    container.innerHTML = '';
    appState.subjects.forEach(s => {
        const el = document.createElement('div');
        el.className = 'puzzle-piece';
        el.innerText = s.name;
        setupTouchDrag(el, s);
        container.appendChild(el);
    });
}

function setupTouchDrag(element, subject) {
    element.addEventListener('touchstart', start, {passive:false});
    element.addEventListener('mousedown', start);

    function start(e) {
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        appState.draggedSubject = subject;
        
        const ghost = element.cloneNode(true);
        ghost.style.position = 'fixed'; ghost.style.zIndex = 10001; ghost.style.width = '150px';
        document.body.appendChild(ghost);
        appState.ghost = ghost;

        const menu = appState.radialMenu;
        menu.style.background = `conic-gradient(#9ca3af 0deg 120deg, #1f2937 120deg 240deg, #ffffff 240deg 360deg)`;
        menu.style.left = cx+'px'; menu.style.top = cy+'px';
        menu.style.display = 'block';

        const onMove = (ev) => {
            ev.preventDefault();
            const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
            const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
            ghost.style.left = mx + 'px'; ghost.style.top = my + 'px';
            
            const dx = mx - cx; const dy = my - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            let selectedType = null;
            if(dist > 20) {
                 if (Math.abs(dx) > Math.abs(dy)) {
                     if(dx < 0 && subject.types.lec) selectedType = 'Лекція';
                     if(dx > 0 && subject.types.prac) selectedType = 'Практична';
                 } else {
                     if(dy > 0 && subject.types.lab) selectedType = 'Лабораторна';
                 }
            }
            if (!selectedType && !subject.types.lec && subject.types.prac && !subject.types.lab) selectedType = 'Практична';
            if (!selectedType && subject.types.lec && !subject.types.prac && !subject.types.lab) selectedType = 'Лекція';

            if(selectedType) {
                ghost.style.background = (selectedType==='Лекція')?'white':(selectedType==='Практична'?'#9ca3af':'#1f2937');
                ghost.style.color = (selectedType==='Лекція')?'black':'white';
                ghost.innerText = `${subject.name}\n${selectedType}`;
                appState.activeSector = selectedType;
            } else { appState.activeSector = null; }
        }

        const onEnd = (ev) => {
            document.removeEventListener('touchmove', onMove); document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchend', onEnd); document.removeEventListener('mouseup', onEnd);
            ghost.remove();
            menu.style.display = 'none';

            const mx = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
            const my = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;
            const target = document.elementFromPoint(mx, my);
            const subCell = target?.closest('.sub-cell'); // The div inside sub-cell-wrapper

            if(subCell && appState.activeSector) {
                const day = subCell.dataset.day;
                const idx = parseInt(subCell.dataset.idx);
                const path = JSON.parse(subCell.dataset.path);
                
                handleDropLogic(day, idx, path, subject, appState.activeSector);
            }
        };

        document.addEventListener('touchmove', onMove, {passive:false});
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchend', onEnd);
        document.addEventListener('mouseup', onEnd);
    }
}

function handleDropLogic(day, idx, path, subject, type) {
    let validDetails = subject.details.filter(d => {
        if(!d.bind || (!d.bind.l && !d.bind.p && !d.bind.lb)) return true;
        if(type === 'Лекція' && d.bind.l) return true;
        if(type === 'Практична' && d.bind.p) return true;
        if(type === 'Лабораторна' && d.bind.lb) return true;
        return false;
    });
    if(validDetails.length === 0) validDetails = subject.details;

    if (validDetails.length > 1) {
        showRoomChoiceModal(validDetails, (choice) => {
            applyDataToGrid(day, idx, path, subject.name, type, choice.room, choice.teacher);
        });
    } else {
        const choice = validDetails[0] || {room:'', teacher:''};
        applyDataToGrid(day, idx, path, subject.name, type, choice.room, choice.teacher);
    }
}

function applyDataToGrid(day, idx, path, subjName, type, room, teacher) {
    let node = getNodeByPath(day, idx, path);
    node.content.subject = subjName;
    node.content.type = type;
    node.content.room = room;
    node.content.teacher = teacher;
    renderFillGrid();
}

function showRoomChoiceModal(details, callback) {
    const modal = document.getElementById('roomChoiceModal');
    const list = document.getElementById('roomChoicesList');
    list.innerHTML = '';
    details.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'room-btn';
        let badge = ''; if(d.bind?.l) badge+='L '; if(d.bind?.p) badge+='P '; if(d.bind?.lb) badge+='Lb';
        btn.innerHTML = `<b>${d.teacher || 'Без викл.'}</b> <br> ${d.room || 'Без ауд.'} <span style="font-size:9px;color:gray">${badge}</span>`;
        btn.onclick = () => { modal.style.display = 'none'; callback(d); };
        list.appendChild(btn);
    });
    modal.style.display = 'flex';
}

function createRadialMenuDOM() {
    const menu = document.createElement('div'); menu.id = 'radialMenu'; menu.className = 'radial-menu';
    const labels = document.createElement('div'); labels.id = 'radialLabels'; labels.className = 'radial-labels-container';
    document.body.appendChild(menu); document.body.appendChild(labels);
    appState.radialMenu = menu; appState.radialLabels = labels;
}

function showRadialMenu(x, y, options, callback) {
    const menu = appState.radialMenu;
    const labels = appState.radialLabels;
    // ... (Simple implementation)
    // For Step 3 (Clear/NumDen/Sub)
    menu.style.background = `conic-gradient(#10b981 300deg 360deg, #10b981 0deg 60deg, #3b82f6 60deg 180deg, #ef4444 180deg 300deg)`;
    
    labels.innerHTML = '';
    options.forEach(opt => {
        const lbl = document.createElement('div'); lbl.className = 'r-label'; lbl.innerText = opt.label;
        const rad = (opt.angle - 90) * Math.PI / 180;
        const lx = 90 + 70 * Math.cos(rad); const ly = 90 + 70 * Math.sin(rad);
        lbl.style.left = lx + 'px'; lbl.style.top = ly + 'px';
        labels.appendChild(lbl);
    });

    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    labels.style.left = x + 'px'; labels.style.top = y + 'px';
    menu.style.display = 'block'; labels.style.display = 'block';

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed'; overlay.style.inset = 0; overlay.style.zIndex = 9998;
    document.body.appendChild(overlay);

    const onEnd = () => {
        menu.style.display = 'none'; labels.style.display = 'none'; overlay.remove();
        if(appState.menuSelection) callback(appState.menuSelection);
        appState.menuSelection = null;
    };
    
    const onMove = (e) => {
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = cx - x; const dy = cy - y;
        if(Math.sqrt(dx*dx + dy*dy) > 20) {
            let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
            if(angle < 0) angle += 360;
            
            let selected = options.find(o => Math.abs(o.angle - angle) < 60 || Math.abs(o.angle - angle) > 300);
            if(selected) { menu.style.opacity = 1; appState.menuSelection = selected.action; }
        }
    }

    document.addEventListener('touchmove', onMove); document.addEventListener('mousemove', onMove);
    document.addEventListener('touchend', onEnd, {once:true}); document.addEventListener('mouseup', onEnd, {once:true});
}

function openTimeModal(day, idx) {
    appState.editTimeTarget = {day, idx};
    document.getElementById('customTimeInput').value = appState.gridData[day][idx].customTime || DEFAULT_TIMES[idx] || '';
    document.getElementById('timeModal').style.display = 'flex';
}
function applyCustomTime() {
    appState.gridData[appState.editTimeTarget.day][appState.editTimeTarget.idx].customTime = document.getElementById('customTimeInput').value;
    document.getElementById('timeModal').style.display = 'none';
    renderStructureGrid();
}

// === EXPORT (FLATTENING RECURSIVE GRID TO SCHEDULE.JSON) ===
function saveVisualSchedule() {
    const finalSchedule = {
        group: "My Group", semester: "1", startDate: new Date().toISOString(),
        schedule: {}
    };
    if(appState.config.currentWeek === 'den') { const d = new Date(); d.setDate(d.getDate() - 7); finalSchedule.startDate = d.toISOString(); }

    DAYS.forEach(day => {
        finalSchedule.schedule[day] = {
            name: DAYS_UA[day],
            lessons: appState.gridData[day].map((node, idx) => {
                const base = { number: idx + 1, time: node.customTime || appState.config.times[idx] || '' };
                return flattenNode(node, base);
            })
        };
    });
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(finalSchedule));
    alert('Збережено!'); window.location.href = './index.html';
}

function flattenNode(node, base) {
    if (node.type === 'single') {
        if (node.content.subject) return { ...base, ...node.content, weeks: 'all', subgroups: [] };
        return { ...base, type: 'empty' };
    }
    
    // Complex flattening for nested structures
    // This is a simplified flattener that handles 1 level of nesting as per current standard
    // If you need deep nesting support in the viewer, the viewer script needs updates too.
    // Here we map Level 1 nesting to standard format.
    
    let subgroups = [];
    
    // Helper to extract leaf nodes
    const extract = (n, weeks, group) => {
        if(n.type === 'single') {
            if(n.content.subject) subgroups.push({ ...n.content, weeks, group });
        } else if (n.type === 'numden') {
            extract(n.content.num, 'num', group);
            extract(n.content.den, 'den', group);
        } else if (n.type === 'subgroups') {
            extract(n.content.sub1, weeks, 'sub1');
            extract(n.content.sub2, weeks, 'sub2');
        }
    };

    if (node.type === 'numden') {
        extract(node.content.num, 'num', 'all');
        extract(node.content.den, 'den', 'all');
    } else if (node.type === 'subgroups') {
        extract(node.content.sub1, 'all', 'sub1');
        extract(node.content.sub2, 'all', 'sub2');
    }

    if(subgroups.length > 0) return { ...base, type: 'mixed', subgroups };
    return { ...base, type: 'empty' };
}
