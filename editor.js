const SCHEDULE_STORAGE_KEY = 'myCustomSchedule';
const DEFAULT_TIMES = ['08:30 – 09:50', '10:05 – 11:25', '11:40 – 13:00', '13:15 – 14:35', '14:50 – 16:10', '16:25 – 17:45', '18:00 – 19:20', '19:30 – 20:50'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAYS_UA = { monday: 'Понеділок', tuesday: 'Вівторок', wednesday: 'Середа', thursday: 'Четвер', friday: 'П’ятниця' };

let appState = {
    step: 1,
    config: { weekType: 'numden', currentWeek: 'num', count: 5, times: [] },
    subjects: [], 
    gridData: {}, 
    // Drag/Menu state
    draggedSubject: null, dragStartPos: {x:0, y:0}, activeSector: null, ghost: null,
    radialMenu: null, radialLabels: null,
    activeCell: null // For Step 3 menu
};

document.addEventListener('DOMContentLoaded', () => {
    // Nav
    document.getElementById('btnClassicEdit').onclick = () => showScreen('classicEditor');
    document.getElementById('btnVisualEdit').onclick = () => { showScreen('visualWizard'); initWizard(); };
    
    // Step 2
    document.getElementById('addDetailRowBtn').onclick = () => addDetailRow();
    document.getElementById('addSmartSubjectBtn').onclick = addSmartSubject;
    
    // Final
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
        // Save Config
        appState.config.weekType = document.getElementById('wizWeekType').value;
        appState.config.currentWeek = document.getElementById('wizCurrentWeek').value;
        appState.config.count = parseInt(document.getElementById('wizLessonCount').value);
        appState.config.times = [];
        for(let i=1; i<=appState.config.count; i++) {
            appState.config.times.push(document.getElementById(`wizTime_${i}`).value);
        }
        // Init Grid
        DAYS.forEach(day => {
            if (appState.gridData[day].length === 0) {
                appState.gridData[day] = Array(appState.config.count).fill(null).map(() => ({ type: 'single', content: {} }));
            }
        });
    }
    if (step === 3) {
        renderStructureGrid(); // Show grid for splitting
    }
    if (step === 4) {
        renderFillGrid(); // Show grid for filling
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

// === КРОК 2: ПРЕДМЕТИ (З Прив'язкою) ===
function addDetailRow(data = {}) {
    const container = document.getElementById('smartDetailsList');
    const div = document.createElement('div');
    div.className = 'detail-row';
    div.innerHTML = `
        <input type="text" class="inp-teacher" placeholder="Викладач" value="${data.teacher || ''}">
        <input type="text" class="inp-room" placeholder="Аудиторія" value="${data.room || ''}">
        <div class="type-bind-checks">
            <label><input type="checkbox" class="chk-l" ${data.bind?.l ? 'checked' : ''}>L</label>
            <label><input type="checkbox" class="chk-p" ${data.bind?.p ? 'checked' : ''}>P</label>
            <label><input type="checkbox" class="chk-lb" ${data.bind?.lb ? 'checked' : ''}>Lb</label>
        </div>
    `;
    container.appendChild(div);
}

function addSmartSubject() {
    const name = document.getElementById('smartSubjectName').value.trim();
    if(!name) return alert('Введіть назву');
    
    const types = {
        lec: document.getElementById('smartHasLec').checked,
        prac: document.getElementById('smartHasPrac').checked,
        lab: document.getElementById('smartHasLab').checked
    };

    const details = [];
    document.querySelectorAll('#smartDetailsList .detail-row').forEach(row => {
        const t = row.querySelector('.inp-teacher').value.trim();
        const r = row.querySelector('.inp-room').value.trim();
        const bind = {
            l: row.querySelector('.chk-l').checked,
            p: row.querySelector('.chk-p').checked,
            lb: row.querySelector('.chk-lb').checked
        };
        if(t || r) details.push({ teacher: t, room: r, bind });
    });
    if(details.length === 0) details.push({teacher:'', room:'', bind:{l:0,p:0,lb:0}});

    const newSubj = { id: Date.now(), name, types, details };
    
    // Check if updating existing
    const existingIdx = appState.subjects.findIndex(s => s.name === name); // Simple check by name or ID if storing ID in UI
    if (appState.editingId) {
        const idx = appState.subjects.findIndex(s => s.id === appState.editingId);
        if(idx > -1) appState.subjects[idx] = newSubj;
        else appState.subjects.push(newSubj);
        appState.editingId = null;
    } else {
        appState.subjects.push(newSubj);
    }
    
    // Reset Form
    document.getElementById('smartSubjectName').value = '';
    document.getElementById('smartHasLec').checked = false;
    document.getElementById('smartHasPrac').checked = false;
    document.getElementById('smartHasLab').checked = false;
    document.getElementById('smartDetailsList').innerHTML = '';
    addDetailRow(); // Empty row
    document.getElementById('addSmartSubjectBtn').innerText = '+ Додати предмет';
    
    renderSmartList();
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
            <div style="font-size:11px; color:#666; margin-top:4px;">
                Подвійний клік для редагування
            </div>
        </div>
    `).join('');
}

function editSmartSubject(id) {
    const s = appState.subjects.find(x => x.id === id);
    if(!s) return;
    
    appState.editingId = id; // Marker
    document.getElementById('smartSubjectName').value = s.name;
    document.getElementById('smartHasLec').checked = s.types.lec;
    document.getElementById('smartHasPrac').checked = s.types.prac;
    document.getElementById('smartHasLab').checked = s.types.lab;
    
    const container = document.getElementById('smartDetailsList');
    container.innerHTML = '';
    s.details.forEach(d => addDetailRow(d));
    
    document.getElementById('addSmartSubjectBtn').innerText = '💾 Зберегти зміни';
    
    // Remove from list visually so user knows they are editing it
    // appState.subjects = appState.subjects.filter(x => x.id !== id);
    // renderSmartList();
}

function removeSmartSubject(id) {
    appState.subjects = appState.subjects.filter(s => s.id !== id);
    renderSmartList();
}

// === КРОК 3: НАЛАШТУВАННЯ СІТКИ (STRUCTURE) ===
function renderStructureGrid() {
    const container = document.getElementById('structureGrid');
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
            row.innerHTML = `<div class="row-number">${idx+1}</div>`;

            const slot = document.createElement('div');
            slot.className = 'grid-slot clickable-slot';
            
            // Logic to interact
            slot.onmousedown = (e) => startStructureMenu(e, day, idx, slot);
            slot.ontouchstart = (e) => startStructureMenu(e, day, idx, slot);

            // Display current structure
            const timeVal = lesson.customTime || appState.config.times[idx] || '';
            let contentHTML = `<div class="inner-time">${timeVal}</div>`;
            
            if (lesson.type === 'subgroups') contentHTML += `<div class="sub-row"><div class="sub-cell">Група 1</div></div><div class="sub-row"><div class="sub-cell">Група 2</div></div>`;
            else if (lesson.type === 'numden') contentHTML += `<div class="sub-row"><div class="sub-cell">Чисельник</div></div><div class="sub-row"><div class="sub-cell">Знаменник</div></div>`;
            else contentHTML += `<div class="sub-row"><div class="sub-cell">Загальна</div></div>`;

            slot.innerHTML = contentHTML;
            row.appendChild(slot);
            slotsContainer.appendChild(row);
        });
        dayBlock.appendChild(slotsContainer);
        container.appendChild(dayBlock);
    });
}

function startStructureMenu(e, day, idx, el) {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    appState.activeCell = { day, idx };
    
    // Options: Left (Time), Top (NumDen), Right (Subgroups)
    const options = [
        { label: '⏰ Час', color: '#f59e0b', angle: 270, action: 'time' },   // Left
        { label: '📅 Чис/Знам', color: '#10b981', angle: 0, action: 'numden' }, // Top
        { label: '👥 Підгрупи', color: '#3b82f6', angle: 90, action: 'subgroups' } // Right
    ];
    
    showRadialMenu(clientX, clientY, options, (action) => {
        if(action === 'time') openTimeModal(day, idx);
        else splitSlot(day, idx, action);
    });
}

// === КРОК 4: НАПОВНЕННЯ (FILL) ===
function renderFillGrid() {
    const container = document.getElementById('visualGridFill');
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
            row.innerHTML = `<div class="row-number">${idx+1}</div>`;

            const slot = document.createElement('div');
            slot.className = `grid-slot ${lesson.content.subject ? 'filled' : ''}`;
            
            const timeVal = lesson.customTime || appState.config.times[idx] || '';
            let contentHTML = `<div class="inner-time">${timeVal}</div>`;
            
            if (lesson.type === 'single') {
                contentHTML += renderFillCell(lesson.content, day, idx, 'main');
            } else if (lesson.type === 'subgroups') {
                contentHTML += `<div class="sub-row">${renderFillCell(lesson.content.sub1||{}, day, idx, 'sub1', 'Група 1')}</div>
                                <div class="sub-row">${renderFillCell(lesson.content.sub2||{}, day, idx, 'sub2', 'Група 2')}</div>`;
            } else if (lesson.type === 'numden') {
                contentHTML += `<div class="sub-row">${renderFillCell(lesson.content.num||{}, day, idx, 'num', 'Чисельник')}</div>
                                <div class="sub-row">${renderFillCell(lesson.content.den||{}, day, idx, 'den', 'Знаменник')}</div>`;
            }
            
            slot.innerHTML = contentHTML;
            row.appendChild(slot);
            slotsContainer.appendChild(row);
        });
        dayBlock.appendChild(slotsContainer);
        container.appendChild(dayBlock);
    });
}

function renderFillCell(data, day, idx, key, label) {
    let style = '';
    let typeLabel = '';
    if(data.type === 'Лекція') { style = 'background:var(--lec-bg); color:var(--lec-txt);'; typeLabel = 'Лек'; }
    if(data.type === 'Практична') { style = 'background:var(--prac-bg); color:var(--prac-txt);'; typeLabel = 'Прак'; }
    if(data.type === 'Лабораторна') { style = 'background:var(--lab-bg); color:var(--lab-txt);'; typeLabel = 'Лаб'; }

    let inner = '';
    if(data.subject) inner = `<b>${data.subject}</b><br><small>${typeLabel}</small><br><small>${data.room || ''}</small>`;
    else if(label) inner = `<span style="opacity:0.5">${label}</span>`;
    
    return `<div class="sub-cell" style="${style}" data-day="${day}" data-idx="${idx}" data-key="${key}">${inner}</div>`;
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

// === RADIAL MENU SYSTEM ===
function createRadialMenuDOM() {
    const menu = document.createElement('div'); menu.id = 'radialMenu'; menu.className = 'radial-menu';
    const labels = document.createElement('div'); labels.id = 'radialLabels'; labels.className = 'radial-labels-container';
    document.body.appendChild(menu); document.body.appendChild(labels);
    appState.radialMenu = menu; appState.radialLabels = labels;
}

// Generic Radial Menu Function
function showRadialMenu(x, y, options, callback) {
    const menu = appState.radialMenu;
    const labels = appState.radialLabels;
    
    // Build Gradient
    // Options: { label, color, angle (0=top, 90=right...) }
    // Simple 3-slice logic
    let gradient = [];
    
    // Сортуємо опції для градієнта (не ідеально, але для 3-х працює)
    // Conic gradient start from 0deg (Top) clockwise.
    // 0deg = Top. 90 = Right. 180 = Bottom. 270 = Left.
    
    // Logic for 3 items (Step 3): Top, Right, Left
    // Top (NumDen): -60 to 60 (300 to 60)
    // Right (Sub): 60 to 180
    // Left (Time): 180 to 300
    
    if(options.length === 3) {
        // Hardcoded optimal gradient for Top/Right/Left layout
        // Slice 1 (Top/Green): 300deg to 60deg
        // Slice 2 (Right/Blue): 60deg to 180deg
        // Slice 3 (Left/Orange): 180deg to 300deg
        menu.style.background = `conic-gradient(
            #10b981 300deg 360deg, 
            #10b981 0deg 60deg,
            #3b82f6 60deg 180deg,
            #f59e0b 180deg 300deg
        )`;
    } else {
        // Fallback or generic builder
        menu.style.background = 'conic-gradient(#ccc 0deg 360deg)';
    }

    labels.innerHTML = '';
    options.forEach(opt => {
        const lbl = document.createElement('div');
        lbl.className = 'r-label';
        lbl.innerText = opt.label;
        // Position based on angle
        const rad = (opt.angle - 90) * Math.PI / 180;
        const dist = 70;
        const lx = 100 + dist * Math.cos(rad);
        const ly = 100 + dist * Math.sin(rad);
        lbl.style.left = lx + 'px';
        lbl.style.top = ly + 'px';
        labels.appendChild(lbl);
    });

    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    labels.style.left = x + 'px'; labels.style.top = y + 'px';
    menu.style.display = 'block'; labels.style.display = 'block';

    // Interaction Overlay (Invisible layer to catch move/up)
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed'; overlay.style.top = 0; overlay.style.left = 0; overlay.style.width = '100%'; overlay.style.height = '100%'; overlay.style.zIndex = 9998;
    document.body.appendChild(overlay);

    const onMove = (e) => {
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = cx - x; const dy = cy - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 20) {
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            angle += 90; if(angle < 0) angle += 360; // 0 = Top, 90 = Right...
            
            // Highlight based on angle
            // Simple logic for 3 sectors
            let selected = null;
            if (angle > 300 || angle <= 60) selected = options.find(o => o.angle === 0);
            else if (angle > 60 && angle <= 180) selected = options.find(o => o.angle === 90);
            else if (angle > 180 && angle <= 300) selected = options.find(o => o.angle === 270);
            
            if(selected) {
                // Visual feedback (simple opacity change or border)
                menu.style.opacity = 1;
                appState.menuSelection = selected.action;
            }
        }
    };

    const onEnd = () => {
        menu.style.display = 'none'; labels.style.display = 'none';
        overlay.remove();
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mousemove', onMove);
        if(appState.menuSelection) callback(appState.menuSelection);
        appState.menuSelection = null;
    };

    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchend', onEnd, {once:true});
    document.addEventListener('mouseup', onEnd, {once:true});
}

// === DRAG & DROP WITH RADIAL (STEP 4) ===
function setupTouchDrag(element, subject) {
    element.addEventListener('touchstart', start, {passive:false});
    element.addEventListener('mousedown', start);

    function start(e) {
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        appState.dragStartPos = {x:cx, y:cy};
        appState.draggedSubject = subject;
        
        // Define options for this subject
        const opts = [];
        if(subject.types.lec) opts.push({ label: 'Лекція', angle: 270, action: 'Лекція' }); // Left
        if(subject.types.prac) opts.push({ label: 'Практика', angle: 90, action: 'Практична' }); // Right
        if(subject.types.lab) opts.push({ label: 'Лабораторна', angle: 180, action: 'Лабораторна' }); // Bottom
        
        // Show Menu
        showRadialMenu(cx, cy, opts, (type) => {
            // Callback receives type when dropped.
            // But we need to know WHERE it was dropped.
            // This architecture is tricky. We need to track the "drop target" during move.
        });
        
        // Custom Drag Logic integrated with Radial
        // We override the generic showRadialMenu behavior slightly for Drag
        
        const ghost = element.cloneNode(true);
        ghost.style.position = 'fixed'; ghost.style.zIndex = 10001; ghost.style.width = '150px';
        document.body.appendChild(ghost);
        appState.ghost = ghost;

        const onMove = (ev) => {
            ev.preventDefault();
            const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
            const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
            
            ghost.style.left = mx + 'px'; ghost.style.top = my + 'px';
            
            // Calculate Type Selection locally
            const dx = mx - cx; const dy = my - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            let selectedType = null;
            if(dist > 20) {
                 // Simple Angle Logic
                 // Left (< -30 x), Right (> 30 x), Down (> 30 y)
                 if (Math.abs(dx) > Math.abs(dy)) {
                     if(dx < 0 && subject.types.lec) selectedType = 'Лекція';
                     if(dx > 0 && subject.types.prac) selectedType = 'Практична';
                 } else {
                     if(dy > 0 && subject.types.lab) selectedType = 'Лабораторна';
                 }
            }
            
            if(selectedType) {
                ghost.style.background = (selectedType==='Лекція')?'white':(selectedType==='Практична'?'gray':'black');
                ghost.style.color = (selectedType==='Лекція')?'black':'white';
                ghost.innerText = `${subject.name}\n${selectedType}`;
                appState.activeSector = selectedType;
            } else {
                appState.activeSector = null; // No selection
            }
        }

        const onEnd = (ev) => {
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchend', onEnd);
            document.removeEventListener('mouseup', onEnd);
            ghost.remove();
            
            // Hide menu
            appState.radialMenu.style.display = 'none';
            appState.radialLabels.style.display = 'none';

            // Find drop target
            const mx = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
            const my = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;
            const target = document.elementFromPoint(mx, my);
            const subCell = target?.closest('.sub-cell');

            if(subCell && appState.activeSector) {
                handleDropLogic(subCell, subject, appState.activeSector);
            }
        };

        document.addEventListener('touchmove', onMove, {passive:false});
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchend', onEnd);
        document.addEventListener('mouseup', onEnd);
    }
}

function handleDropLogic(targetEl, subject, type) {
    const day = targetEl.dataset.day;
    const idx = parseInt(targetEl.dataset.idx);
    const key = targetEl.dataset.key;

    // Filter details by type binding
    let validDetails = subject.details.filter(d => {
        // If bind is empty (old data) or bind is all false -> allow
        if(!d.bind || (!d.bind.l && !d.bind.p && !d.bind.lb)) return true;
        // Check binding
        if(type === 'Лекція' && d.bind.l) return true;
        if(type === 'Практична' && d.bind.p) return true;
        if(type === 'Лабораторна' && d.bind.lb) return true;
        return false;
    });

    if(validDetails.length === 0) validDetails = subject.details; // Fallback to all if none match

    if (validDetails.length > 1) {
        showRoomChoiceModal(validDetails, (choice) => {
            applyDataToGrid(day, idx, key, subject.name, type, choice.room, choice.teacher);
        });
    } else {
        const choice = validDetails[0];
        applyDataToGrid(day, idx, key, subject.name, type, choice.room, choice.teacher);
    }
}

function showRoomChoiceModal(details, callback) {
    const modal = document.getElementById('roomChoiceModal');
    const list = document.getElementById('roomChoicesList');
    list.innerHTML = '';
    details.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'room-btn';
        let badge = '';
        if(d.bind?.l) badge+='L '; if(d.bind?.p) badge+='P '; if(d.bind?.lb) badge+='Lb';
        btn.innerHTML = `<b>${d.teacher || 'Без викладача'}</b> <br> ${d.room || 'Без ауд.'} <span style="font-size:10px; color:gray">${badge}</span>`;
        btn.onclick = () => { modal.style.display = 'none'; callback(d); };
        list.appendChild(btn);
    });
    modal.style.display = 'flex';
}

function applyDataToGrid(day, idx, key, subjName, type, room, teacher) {
    const lesson = appState.gridData[day][idx];
    let target = (lesson.type === 'single') ? lesson.content : lesson.content[key];
    if(!target) { lesson.content[key] = {}; target = lesson.content[key]; }
    target.subject = subjName; target.type = type; target.room = room; target.teacher = teacher;
    renderFillGrid();
}

// === UTILS ===
function splitSlot(day, idx, type) {
    appState.gridData[day][idx].type = type;
    appState.gridData[day][idx].content = {};
    renderStructureGrid();
}

function saveVisualSchedule() {
    const finalSchedule = {
        group: "My Group", semester: "1", startDate: new Date().toISOString(),
        schedule: {}
    };
    
    // Save week type preference logic is tricky without altering global logic, 
    // but assuming standard logic:
    // If user chose "Denominator" as current, we shift startDate back 1 week.
    if(appState.config.currentWeek === 'den') {
         const d = new Date(); d.setDate(d.getDate() - 7);
         finalSchedule.startDate = d.toISOString();
    }

    DAYS.forEach(day => {
        finalSchedule.schedule[day] = {
            name: DAYS_UA[day],
            lessons: appState.gridData[day].map((l, idx) => {
                const base = { number: idx + 1, time: l.customTime || appState.config.times[idx] || '' };
                if (l.type === 'single') {
                    if (l.content.subject) return { ...base, ...l.content, weeks: 'all', subgroups: [] };
                    return { ...base, type: 'empty' };
                } 
                const subgroups = [];
                if (l.type === 'subgroups') {
                    if (l.content.sub1?.subject) subgroups.push({ ...l.content.sub1, group: 'sub1', weeks: 'all' });
                    if (l.content.sub2?.subject) subgroups.push({ ...l.content.sub2, group: 'sub2', weeks: 'all' });
                } else if (l.type === 'numden') {
                    if (l.content.num?.subject) subgroups.push({ ...l.content.num, group: 'all', weeks: 'num' });
                    if (l.content.den?.subject) subgroups.push({ ...l.content.den, group: 'all', weeks: 'den' });
                }
                if (subgroups.length > 0) return { ...base, type: 'mixed', subgroups };
                return { ...base, type: 'empty' };
            })
        };
    });
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(finalSchedule));
    alert('Збережено!');
    window.location.href = './index.html';
}
