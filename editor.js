/* ================= КОНФІГУРАЦІЯ ================= */
const state = {
    step: 1,
    settings: {
        group: "ІП-24",
        pairsPerDay: 5,
        times: ["08:30 – 09:50", "10:05 – 11:25", "11:40 – 13:00", "13:15 – 14:35", "14:50 – 16:10", "16:25 – 17:45", "18:00 – 19:20"]
    },
    subjects: [],
    grid: {} 
};

const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const dayNamesUk = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];

/* ================= WIZARD NAV ================= */
const wizard = {
    init: () => {
        renderTimeInputs();
        updateUI();
        setupGlobalListeners();
        // Автозавантаження з localStorage при вході
        tryLoadFromStorage(); 
    },
    next: () => {
        if (state.step === 1) {
            state.settings.group = document.getElementById('groupName').value;
            state.settings.pairsPerDay = parseInt(document.getElementById('pairsPerDay').value);
            state.settings.times = Array.from(document.querySelectorAll('.time-in')).map(i => i.value);
        }
        if (state.step === 2 && state.subjects.length === 0) {
            alert("Додайте хоча б один предмет!"); return;
        }
        if (state.step === 3) {
            renderFillGrid();
            renderDraggables();
        }
        if (state.step < 4) {
            state.step++;
            updateUI();
        }
    },
    prev: () => { if (state.step > 1) { state.step--; updateUI(); } }
};

function updateUI() {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-indicator').forEach(el => el.classList.remove('active'));
    
    const stepEl = document.getElementById(`step-${state.step}`);
    if(stepEl) stepEl.classList.add('active');
    const indEl = document.querySelector(`.step-indicator[data-step="${state.step}"]`);
    if(indEl) indEl.classList.add('active');
    
    if (state.step === 3) renderStructureGrid();
}

function setupGlobalListeners() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.radial-menu')) document.getElementById('gridRadialMenu')?.classList.add('hidden');
    });
    
    document.getElementById('saveResultBtn').addEventListener('click', saveFinalResult);
    
    // ІМПОРТ / ЕКСПОРТ
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const exportBtn = document.getElementById('exportJsonBtn');

    if(importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', handleFileImport);
    }
    if(exportBtn) {
        exportBtn.addEventListener('click', handleFileExport);
    }
}

/* ================= КРОК 1 ================= */
function renderTimeInputs() {
    const container = document.getElementById('timeSettings');
    if(!container) return;
    container.innerHTML = '';
    const n = parseInt(document.getElementById('pairsPerDay').value);
    for(let i=0; i<n; i++) {
        const val = state.settings.times[i] || "00:00 – 00:00";
        container.innerHTML += `<div><label>Пара ${i+1}</label><input class="time-in" value="${val}"></div>`;
    }
}
const pairsSelect = document.getElementById('pairsPerDay');
if(pairsSelect) pairsSelect.addEventListener('change', renderTimeInputs);

/* ================= КРОК 2 ================= */
const addSubjBtn = document.getElementById('addSubjectBtn');
if(addSubjBtn) {
    addSubjBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('subjName');
        const name = nameInput.value;
        if(!name) return;
        
        const types = Array.from(document.querySelectorAll('.type-check:checked')).map(cb => cb.value);
        if(types.length === 0) types.push('lecture'); 
        
        state.subjects.push({ id: Date.now().toString(), name, types });
        renderSubjectsList();
        nameInput.value = '';
    });
}

function renderSubjectsList() {
    const list = document.getElementById('subjectsList');
    if(!list) return;
    if(state.subjects.length === 0) {
        list.innerHTML = '<p style="color:#777">Список порожній</p>';
        return;
    }
    const typeMap = { 'lecture': 'Лек', 'practical': 'Прак', 'lab': 'Лаб' };
    
    list.innerHTML = state.subjects.map(s => `
        <div style="background:white; padding:10px; border:1px solid #ddd; border-radius:6px; margin-bottom:5px; display:flex; justify-content:space-between;">
            <span><b>${s.name}</b> <small>(${s.types.map(t => typeMap[t] || t).join(', ')})</small></span>
            <span style="cursor:pointer; color:red" onclick="removeSubject('${s.id}')">×</span>
        </div>
    `).join('');
}

window.removeSubject = (id) => {
    state.subjects = state.subjects.filter(s => s.id !== id);
    renderSubjectsList();
};

/* ================= КРОК 3 ================= */
function renderStructureGrid() {
    const c = document.getElementById('structureGrid');
    if(!c) return;
    c.innerHTML = '';
    c.style.gridTemplateColumns = `50px repeat(${dayKeys.length}, 1fr)`;
    
    c.appendChild(div('grid-header', '#'));
    dayNamesUk.forEach(d => c.appendChild(div('grid-header', d)));

    for(let p=0; p<state.settings.pairsPerDay; p++) {
        c.appendChild(div('grid-header', `${p+1}`)); 
        for(let d=0; d<dayKeys.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || {structure: 'single'};
            const cell = div('grid-cell', generateHTML(cellData.structure, false, {}, key));
            cell.querySelectorAll('.sub-cell').forEach(sub => {
                sub.addEventListener('click', (e) => openMenu(e, key, sub.dataset.pos, cellData.structure));
            });
            c.appendChild(cell);
        }
    }
}

function div(cls, html) {
    const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d;
}

function generateHTML(struct, isFillMode, content = {}, key = "") {
    const render = (pos, cls) => {
        let inner = isFillMode ? `<span style="color:#ddd; font-size:12px">+</span>` : "";
        if (isFillMode && content && content[pos]) {
            const item = content[pos];
            let typeClass = 'lecture';
            if(item.type === 'Prac' || item.type === 'practical') typeClass = 'practical';
            if(item.type === 'Lab' || item.type === 'lab') typeClass = 'lab';
            inner = `<div class="lesson-chip type-${typeClass}">${item.subject}</div>`;
        }
        const dropAttr = isFillMode ? `data-drop-key="${key}" data-drop-pos="${pos}"` : `data-pos="${pos}"`;
        return `<div class="sub-cell ${cls}" ${dropAttr}>${inner}</div>`;
    };

    if (struct === 'single') return render('main', '');
    if (struct === 'split-h') return `<div class="cell-split-h">${render('left','group1')}${render('right','group2')}</div>`;
    
    let top, bot;
    if (struct.includes('top-h') || struct.includes('both-h')) top = `<div class="cell-split-h numerator">${render('top-left','group1')}${render('top-right','group2')}</div>`;
    else top = render('top', 'numerator');

    if (struct.includes('bottom-h') || struct.includes('both-h')) bot = `<div class="cell-split-h denominator">${render('bottom-left','group1')}${render('bottom-right','group2')}</div>`;
    else bot = render('bottom', 'denominator');

    return `<div class="cell-split-v">${top}${bot}</div>`;
}

// === RADIAL MENU ===
const menu = document.getElementById('gridRadialMenu');
let menuCtx = null;

function openMenu(e, key, pos, struct) {
    e.stopPropagation();
    menuCtx = {key, pos, struct};
    menu.style.left = (e.clientX - 50) + 'px';
    menu.style.top = (e.clientY - 50) + 'px';
    menu.classList.remove('hidden');

    const btnV = menu.querySelector('.top');
    const btnH = menu.querySelector('.right');
    btnV.style.display = 'flex'; btnH.style.display = 'flex';

    if (struct.includes('split-v')) btnV.style.display = 'none';
    if (pos.includes('left') || pos.includes('right')) btnH.style.display = 'none';
}

if(menu) {
    menu.querySelectorAll('.radial-btn').forEach(b => b.onclick = (e) => {
        changeGrid(b.dataset.action);
        menu.classList.add('hidden');
    });
}

function changeGrid(action) {
    const {key, pos, struct} = menuCtx;
    if(!state.grid[key]) state.grid[key] = {structure: 'single', content: {}};
    let newS = struct;
    if (action === 'clear') { newS = 'single'; state.grid[key].content = {}; }
    else if (action === 'split-vertical' && struct === 'single') newS = 'split-v';
    else if (action === 'split-horizontal') {
        if (struct === 'single') newS = 'split-h';
        else if (struct === 'split-v') {
            if (pos === 'top') newS = 'split-v-top-h'; else newS = 'split-v-bottom-h';
        }
        else if (struct === 'split-v-top-h' && pos === 'bottom') newS = 'split-v-both-h';
        else if (struct === 'split-v-bottom-h' && pos === 'top') newS = 'split-v-both-h';
    }
    state.grid[key].structure = newS;
    renderStructureGrid();
}

/* ================= КРОК 4 ================= */
function renderDraggables() {
    const c = document.getElementById('draggableSubjects');
    if(!c) return;
    c.innerHTML = state.subjects.map(s => 
        `<div class="drag-item" data-id="${s.id}" onmousedown="startDrag(event)">${s.name}</div>`
    ).join('');
}

function renderFillGrid() {
    const c = document.getElementById('fillGrid');
    if(!c) return;
    c.innerHTML = '';
    c.style.gridTemplateColumns = `50px repeat(${dayKeys.length}, 1fr)`;
    c.appendChild(div('grid-header', '#'));
    dayNamesUk.forEach(d => c.appendChild(div('grid-header', d)));

    for(let p=0; p<state.settings.pairsPerDay; p++) {
        c.appendChild(div('grid-header', `${p+1}`));
        for(let d=0; d<dayKeys.length; d++) {
            const key = `${d}-${p}`;
            const cell = state.grid[key] || {structure: 'single', content: {}};
            c.appendChild(div('grid-cell', generateHTML(cell.structure, true, cell.content, key)));
        }
    }
}

// === DRAG & DROP ===
let isDragging = false, dragSubjId = null;
const ghost = document.getElementById('dragGhost');

function startDrag(e) {
    if(e.button !== 0) return;
    dragSubjId = e.currentTarget.dataset.id;
    const s = state.subjects.find(x => x.id === dragSubjId);
    isDragging = true;
    ghost.innerText = s.name;
    ghost.classList.remove('hidden');
    updateGhost(e);
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
}

function onDrag(e) {
    if(!isDragging) return;
    e.preventDefault();
    updateGhost(e);
    ghost.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    ghost.style.display = 'block';
    document.querySelectorAll('.drop-hover').forEach(x => x.classList.remove('drop-hover'));
    const cell = el?.closest('.sub-cell');
    if(cell && cell.dataset.dropKey) cell.classList.add('drop-hover');
}

function updateGhost(e) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }

function endDrag(e) {
    isDragging = false;
    ghost.classList.add('hidden');
    ghost.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest('.sub-cell');
    ghost.style.display = 'block';

    if(target && target.dataset.dropKey) {
        const key = target.dataset.dropKey;
        const pos = target.dataset.dropPos;
        if(!state.grid[key]) state.grid[key] = {structure: 'single', content: {}};
        if(!state.grid[key].content) state.grid[key].content = {};
        const s = state.subjects.find(x => x.id === dragSubjId);
        state.grid[key].content[pos] = { subject: s.name, type: s.types[0] }; 
        renderFillGrid();
    }
    
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.querySelectorAll('.drop-hover').forEach(x => x.classList.remove('drop-hover'));
}

/* ================= ІМПОРТ / ЕКСПОРТ ================= */
function handleFileExport() {
    const dataStr = JSON.stringify(state, null, 2); // Експортуємо стан РЕДАКТОРА
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `editor_backup_${state.settings.group}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function handleFileImport(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            // Відновлюємо стан
            if(data.settings) state.settings = data.settings;
            if(data.subjects) state.subjects = data.subjects;
            if(data.grid) state.grid = data.grid;
            
            // Оновлюємо UI
            document.getElementById('groupName').value = state.settings.group;
            document.getElementById('pairsPerDay').value = state.settings.pairsPerDay;
            renderTimeInputs();
            renderSubjectsList();
            
            // Якщо був імпортований готовий розклад, йдемо зразу на крок 3
            state.step = 3; 
            updateUI();
            
            alert('Дані успішно завантажено!');
        } catch(err) {
            alert('Помилка читання файлу!');
            console.error(err);
        }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset
}

// Завантаження збереженого стану редактора (не фінального розкладу)
function tryLoadFromStorage() {
    const saved = localStorage.getItem('editorStateBackup');
    if(saved) {
        try {
            const data = JSON.parse(saved);
            Object.assign(state, data);
            document.getElementById('groupName').value = state.settings.group;
            document.getElementById('pairsPerDay').value = state.settings.pairsPerDay;
            renderSubjectsList();
        } catch(e) {}
    }
}

/* ================= ЗБЕРЕЖЕННЯ (ФІНАЛ) ================= */
function getISOWeek(date) {
    const d = new Date(date.getTime()); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function calculateStartDate() {
    // Логіка: ми знаємо, що сьогодні "Чисельник" (або "Знаменник").
    // Треба підібрати таку дату початку семестру, щоб математика в script.js
    // видала правильний результат для сьогодншнього дня.
    
    const userSaysTodayIs = document.querySelector('input[name="currentWeekType"]:checked').value; // 'num' or 'den'
    const today = new Date();
    const currentWeekISO = getISOWeek(today);
    const isOddISO = currentWeekISO % 2 !== 0;
    
    // Якщо користувач каже "Чисельник", а тиждень парний -> треба зсув
    // Якщо користувач каже "Знаменник", а тиждень непарний -> треба зсув
    
    // У script.js: isNumerator = (startWeekIsOdd == currentWeekIsOdd)
    // Ми хочемо, щоб result == userSaysTodayIs
    
    // Просто ставимо startDate = today. 
    // Тоді startWeek = currentWeek.
    // startWeekIsOdd == currentWeekIsOdd -> TRUE.
    // Тобто script.js завжди покаже "Чисельник", якщо startDate = today.
    
    let startDate = new Date();
    
    if (userSaysTodayIs === 'den') {
        // Якщо сьогодні знаменник, то нам треба, щоб (startWeekIsOdd == currentWeekIsOdd) було FALSE.
        // Зсунемо startDate на тиждень назад.
        startDate.setDate(startDate.getDate() - 7);
    }
    
    return startDate.toISOString().split('T')[0];
}

function saveFinalResult() {
    const startDate = calculateStartDate();
    
    const scheduleExport = {
        group: state.settings.group,
        startDate: startDate, 
        schedule: {}
    };

    dayKeys.forEach((dayKey, dIndex) => {
        const lessons = [];
        for(let p=0; p<state.settings.pairsPerDay; p++) {
            const key = `${dIndex}-${p}`;
            const cell = state.grid[key];
            const timeStr = state.settings.times[p];

            if (!cell || !cell.content || Object.keys(cell.content).length === 0) continue;

            const baseLesson = { number: p+1, time: timeStr, type: 'mixed', subgroups: [] };
            const mapType = (t) => {
                if(t === 'Lec' || t === 'lecture') return 'lecture';
                if(t === 'Prac' || t === 'practical') return 'practical';
                if(t === 'Lab' || t === 'lab') return 'lab';
                return 'lecture';
            };

            const addSub = (pos, grp, wks) => {
                if(cell.content[pos]) {
                    baseLesson.subgroups.push({
                        subject: cell.content[pos].subject,
                        type: mapType(cell.content[pos].type),
                        group: grp, weeks: wks, teacher: "", room: ""
                    });
                }
            };

            if (cell.structure === 'single' && cell.content.main) {
                lessons.push({
                    number: p + 1, time: timeStr,
                    subject: cell.content.main.subject, type: mapType(cell.content.main.type),
                    weeks: 'all', teacher: "", room: ""
                });
                continue;
            }

            if (cell.structure === 'split-h') { addSub('left','sub1','all'); addSub('right','sub2','all'); }
            else if (cell.structure === 'split-v') { addSub('top','all','num'); addSub('bottom','all','den'); }
            else {
                if(cell.structure.includes('top-h')||cell.structure.includes('both-h')) { addSub('top-left','sub1','num'); addSub('top-right','sub2','num'); } else addSub('top','all','num');
                if(cell.structure.includes('bottom-h')||cell.structure.includes('both-h')) { addSub('bottom-left','sub1','den'); addSub('bottom-right','sub2','den'); } else addSub('bottom','all','den');
            }

            if(baseLesson.subgroups.length > 0) lessons.push(baseLesson);
        }
        scheduleExport.schedule[dayKey] = { name: dayNamesUk[dIndex], lessons: lessons };
    });

    localStorage.setItem('myCustomSchedule', JSON.stringify(scheduleExport));
    // Також зберігаємо стан редактора, щоб можна було продовжити пізніше
    localStorage.setItem('editorStateBackup', JSON.stringify(state));
    
    alert('✅ Розклад збережено!');
    window.location.href = 'index.html';
}

wizard.init();
