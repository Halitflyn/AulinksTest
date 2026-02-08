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

// Тимчасове сховище варіантів для Кроку 2
let currentSubjectVariants = {};

const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const dayNamesUk = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];
let pendingDrop = null; 

/* ================= WIZARD NAV ================= */
const wizard = {
    init: () => {
        renderTimeInputs();
        updateUI();
        setupGlobalListeners();
        initButtons();
        tryLoadFromStorage();
        initDropModal();
        initSubjectFormListeners(); 
    },
    next: () => {
        if (state.step === 1) {
            saveStep1Data();
        }
        
        if (state.step === 2 && state.subjects.length === 0) {
            alert("Додайте хоча б один предмет!"); return;
        }
        wizard.goTo(state.step + 1);
    },
    prev: () => wizard.goTo(state.step - 1),
    goTo: (stepNum) => {
        if(stepNum < 1 || stepNum > 4) return;
        
        if (stepNum === 3) renderStructureGrid();
        if (stepNum === 4) { renderFillGrid(); renderDraggables(); }

        state.step = stepNum;
        updateUI();
    }
};

function initButtons() {
    const steps = [1, 2, 3, 4];
    steps.forEach(s => {
        const nav = document.getElementById(`navStep${s}`);
        if(nav) nav.onclick = () => wizard.goTo(s);
        
        const next = document.getElementById(`btnNext${s}`);
        if(next) next.onclick = () => wizard.next();
        
        const prev = document.getElementById(`btnPrev${s}`);
        if(prev) prev.onclick = () => wizard.prev();
    });
}

function saveStep1Data() {
    const groupEl = document.getElementById('groupName');
    if(groupEl) state.settings.group = groupEl.value;
    
    const pairsEl = document.getElementById('pairsPerDay');
    if(pairsEl) state.settings.pairsPerDay = parseInt(pairsEl.value);
    
    const inputs = document.querySelectorAll('.time-in');
    state.settings.times = Array.from(inputs).map(i => i.value);
}

function updateUI() {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-indicator').forEach(el => el.classList.remove('active'));
    const stepEl = document.getElementById(`step-${state.step}`);
    if(stepEl) stepEl.classList.add('active');
    const indEl = document.querySelector(`.step-indicator[data-step="${state.step}"]`);
    if(indEl) indEl.classList.add('active');
}

function setupGlobalListeners() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.radial-menu')) document.getElementById('gridRadialMenu')?.classList.add('hidden');
    });
    
    const saveBtn = document.getElementById('saveResultBtn');
    if(saveBtn) saveBtn.addEventListener('click', saveFinalResult);
    
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const exportBtn = document.getElementById('exportJsonBtn');

    if(importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', handleFileImport);
    }
    if(exportBtn) exportBtn.addEventListener('click', handleFileExport);
}

/* ================= КРОК 1 ================= */
function renderTimeInputs() {
    const container = document.getElementById('timeSettings');
    if(!container) return;
    container.innerHTML = '';
    const n = parseInt(document.getElementById('pairsPerDay').value);
    for(let i=0; i<n; i++) {
        const val = state.settings.times[i] || "00:00 – 00:00";
        container.innerHTML += `<div><label>Пара ${i+1}</label><input class="time-in" value="${val}" name="time-${i}"></div>`;
    }
}
document.getElementById('pairsPerDay').addEventListener('change', renderTimeInputs);

/* ================= КРОК 2 (ВИПРАВЛЕНА ЛОГІКА КНОПОК) ================= */
function initSubjectFormListeners() {
    // 1. Слухач чекбоксів
    const checkboxes = document.querySelectorAll('.type-check');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', renderTypeDetailInputs);
    });

    // 2. ГОЛОВНЕ ВИПРАВЛЕННЯ: Слухач контейнера для кнопок + та x
    const container = document.getElementById('typeDetailsContainer');
    
    container.addEventListener('click', (e) => {
        // Якщо клікнули на кнопку "+ варіант"
        if (e.target.classList.contains('btn-add-variant')) {
            e.preventDefault();
            const type = e.target.dataset.type;
            addVariant(type);
        }
        // Якщо клікнули на кнопку "x"
        if (e.target.classList.contains('btn-remove-variant')) {
            e.preventDefault();
            const type = e.target.dataset.type;
            const index = parseInt(e.target.dataset.index);
            removeVariant(type, index);
        }
    });

    // 3. Зберігаємо дані при введенні тексту (щоб не зникли при додаванні варіанту)
    container.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT') {
            syncInputsToMemory();
        }
    });
}

// Функція зчитування даних з екрану в пам'ять
function syncInputsToMemory() {
    const blocks = document.querySelectorAll('.type-detail-block');
    blocks.forEach(block => {
        const type = block.dataset.type;
        const rows = block.querySelectorAll('.variant-row');
        
        const newVariants = [];
        rows.forEach(row => {
            newVariants.push({
                teacher: row.querySelector('.inp-teacher').value,
                room: row.querySelector('.inp-room').value
            });
        });
        currentSubjectVariants[type] = newVariants;
    });
}

function renderTypeDetailInputs() {
    const container = document.getElementById('typeDetailsContainer');
    
    // Спочатку зберігаємо, що юзер вже ввів, щоб не стерти
    // Але тільки якщо ми не викликаємо це вперше
    if (container.children.length > 0) {
        syncInputsToMemory();
    }

    container.innerHTML = '';
    const checkboxes = document.querySelectorAll('.type-check:checked');
    if (checkboxes.length === 0) return;

    const labels = { 'lecture': 'Лекція', 'practical': 'Практика', 'lab': 'Лабораторна' };

    checkboxes.forEach(cb => {
        const type = cb.value;
        
        // Якщо даних ще немає, створюємо пустий рядок
        if (!currentSubjectVariants[type] || currentSubjectVariants[type].length === 0) {
            currentSubjectVariants[type] = [{teacher: '', room: ''}];
        }

        const variants = currentSubjectVariants[type];
        
        const rowsHtml = variants.map((v, idx) => `
            <div class="variant-row" data-index="${idx}">
                <input 
                    type="text" 
                    class="inp-teacher" 
                    placeholder="Викладач" 
                    value="${v.teacher || ''}" 
                    style="flex:1"
                    name="teacher-${type}-${idx}"
                    id="teacher-${type}-${idx}"
                    autocomplete="off"
                >
                <input 
                    type="text" 
                    class="inp-room" 
                    placeholder="Ауд." 
                    value="${v.room || ''}" 
                    style="flex:0.5"
                    name="room-${type}-${idx}"
                    id="room-${type}-${idx}"
                    autocomplete="off"
                >
                ${idx > 0 ? `<span class="btn-remove-variant" data-type="${type}" data-index="${idx}" style="cursor:pointer; color:red; font-weight:bold; font-size:1.2rem; padding:0 5px;">×</span>` : ''}
            </div>
        `).join('');

        // Увага: тут button type="button" і немає onclick, все через dataset
        const html = `
            <div class="type-detail-block" data-type="${type}">
                <div class="type-header">
                    <span>${labels[type]}</span>
                    <button type="button" class="btn-add-variant" data-type="${type}">+ варіант</button>
                </div>
                <div class="variants-list">
                    ${rowsHtml}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

function addVariant(type) {
    syncInputsToMemory(); // Сейв перед додаванням
    if(!currentSubjectVariants[type]) currentSubjectVariants[type] = [];
    currentSubjectVariants[type].push({teacher: '', room: ''});
    renderTypeDetailInputs(); // Ререндер
}

function removeVariant(type, index) {
    syncInputsToMemory();
    if(currentSubjectVariants[type]) {
        currentSubjectVariants[type].splice(index, 1);
    }
    renderTypeDetailInputs();
}

const addSubjectBtn = document.getElementById('addSubjectBtn');
if(addSubjectBtn) {
    addSubjectBtn.addEventListener('click', () => {
        syncInputsToMemory(); // Фінальний сейв
        const nameInput = document.getElementById('subjName');
        const name = nameInput.value;
        if(!name) { alert("Введіть назву предмету"); return; }
        
        const checkboxes = Array.from(document.querySelectorAll('.type-check:checked'));
        if(checkboxes.length === 0) { alert("Оберіть хоча б один тип заняття"); return; }

        const types = [];
        const details = {}; 

        checkboxes.forEach(cb => {
            const type = cb.value;
            types.push(type);
            details[type] = JSON.parse(JSON.stringify(currentSubjectVariants[type] || []));
        });
        
        state.subjects.push({ id: Date.now().toString(), name, types, details });
        renderSubjectsList();
        
        // === ОЧИСТКА ===
        nameInput.value = '';
        document.querySelectorAll('.type-check').forEach(c => c.checked = false);
        currentSubjectVariants = {}; // Скидаємо пам'ять
        renderTypeDetailInputs(); // Очищаємо поля
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
    
    list.innerHTML = state.subjects.map(s => {
        let info = s.types.map(t => {
            const vars = s.details[t] || [];
            const first = vars[0] || {teacher: '', room: ''};
            const more = vars.length > 1 ? ` (+${vars.length-1})` : '';
            return `<div style="font-size:0.8rem; color:#555; margin-top:2px;">
                <span style="font-weight:600; color:var(--primary)">${typeMap[t]}:</span> 
                ${first.teacher} ${first.room} ${more}
            </div>`;
        }).join('');

        return `
        <div style="background:white; padding:10px; border:1px solid #ddd; border-radius:6px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:start;">
            <div><b>${s.name}</b>${info}</div>
            <span style="cursor:pointer; color:red; font-weight:bold; padding:0 5px;" onclick="removeSubject('${s.id}')">×</span>
        </div>`;
    }).join('');
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
            const customTime = cellData.customTime ? `<div class="cell-time-tag">${cellData.customTime}</div>` : '';
            const cell = div('grid-cell', customTime + generateHTML(cellData.structure, false, {}, key));
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
            inner = `<div class="lesson-chip type-${typeClass}" title="${item.teacher || ''} ${item.room || ''}">
                <b>${item.subject}</b>
                <div style="font-size:10px">${item.type}</div>
            </div>`;
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

// === MENU ===
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
    const btnTime = menu.querySelector('.left'); 

    btnV.style.display = 'flex'; btnH.style.display = 'flex';
    if(btnTime) btnTime.style.display = 'flex';

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
    
    if (action === 'time') {
        const pIndex = key.split('-')[1];
        const defaultTime = state.settings.times[pIndex];
        const newTime = prompt("Введіть час (напр. 10:00 – 11:20):", state.grid[key].customTime || defaultTime);
        if (newTime) state.grid[key].customTime = newTime;
        else if (newTime === "") delete state.grid[key].customTime;
        renderStructureGrid();
        return;
    }

    let newS = struct;
    if (action === 'clear') { newS = 'single'; state.grid[key].content = {}; delete state.grid[key].customTime; }
    else if (action === 'split-vertical' && struct === 'single') newS = 'split-v';
    else if (action === 'split-horizontal') {
        if (struct === 'single') newS = 'split-h';
        else if (struct === 'split-v') { if (pos === 'top') newS = 'split-v-top-h'; else newS = 'split-v-bottom-h'; }
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
        `<div class="drag-item" data-id="${s.id}" draggable="true" ondragstart="startDrag(event)">
            <div style="font-weight:bold">${s.name}</div>
            <small style="font-size:0.75rem; color:#666">${s.types.join(', ')}</small>
        </div>`
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
            const customTime = cell.customTime ? `<div class="cell-time-tag">${cell.customTime}</div>` : '';
            c.appendChild(div('grid-cell', customTime + generateHTML(cell.structure, true, cell.content, key)));
        }
    }
}

// === DRAG & DROP & MODAL ===
let isDragging = false, dragSubjId = null;
const ghost = document.getElementById('dragGhost');

function startDrag(e) {
    // Підтримка мобільних і десктоп
    dragSubjId = e.target.closest('.drag-item').dataset.id;
    isDragging = true;
    
    // Ghost effect
    const s = state.subjects.find(x => x.id === dragSubjId);
    ghost.innerText = s.name;
    ghost.classList.remove('hidden');
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('touchmove', onDrag, {passive: false});
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

function onDrag(e) {
    if(!isDragging) return;
    e.preventDefault();
    const cx = e.clientX || e.touches[0].clientX;
    const cy = e.clientY || e.touches[0].clientY;
    
    ghost.style.left = cx + 'px'; 
    ghost.style.top = cy + 'px';
    
    ghost.style.display = 'none';
    const el = document.elementFromPoint(cx, cy);
    ghost.style.display = 'block';
    
    document.querySelectorAll('.drop-hover').forEach(x => x.classList.remove('drop-hover'));
    const cell = el?.closest('.sub-cell');
    if(cell && cell.dataset.dropKey) cell.classList.add('drop-hover');
}

function endDrag(e) {
    isDragging = false;
    ghost.classList.add('hidden');
    
    const cx = e.clientX || (e.changedTouches ? e.changedTouches[0].clientX : 0);
    const cy = e.clientY || (e.changedTouches ? e.changedTouches[0].clientY : 0);
    
    ghost.style.display = 'none';
    const el = document.elementFromPoint(cx, cy);
    ghost.style.display = 'block';

    document.querySelectorAll('.drop-hover').forEach(x => x.classList.remove('drop-hover'));
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);

    const target = el?.closest('.sub-cell');
    if(target && target.dataset.dropKey) {
        handleDrop(target.dataset.dropKey, target.dataset.dropPos);
    }
}

function handleDrop(key, pos) {
    const subj = state.subjects.find(s => s.id === dragSubjId);
    if (!subj) return;
    showDropModal(key, pos, subj);
}

// === MODAL ===
function initDropModal() {
    document.getElementById('btnCancelDrop').addEventListener('click', () => {
        document.getElementById('dropModal').classList.remove('active');
        pendingDrop = null;
    });

    document.getElementById('btnConfirmDrop').addEventListener('click', () => {
        if (!pendingDrop) return;
        const selectedTypeBtn = document.querySelector('.type-btn.selected');
        const type = selectedTypeBtn ? selectedTypeBtn.dataset.value : pendingDrop.types[0];
        
        saveToGrid(pendingDrop.key, pendingDrop.pos, {
            subject: pendingDrop.name,
            type: type,
            teacher: document.getElementById('modalDropTeacher').value,
            room: document.getElementById('modalDropRoom').value
        });

        document.getElementById('dropModal').classList.remove('active');
        pendingDrop = null;
    });
    
    document.getElementById('modalVariantSelector').addEventListener('change', (e) => {
        if(!pendingDrop) return;
        const selectedTypeBtn = document.querySelector('.type-btn.selected');
        const type = selectedTypeBtn ? selectedTypeBtn.dataset.value : pendingDrop.types[0];
        const variants = pendingDrop.details[type] || [];
        const index = parseInt(e.target.value);
        if(variants[index]) {
            document.getElementById('modalDropTeacher').value = variants[index].teacher;
            document.getElementById('modalDropRoom').value = variants[index].room;
        }
    });
}

function showDropModal(key, pos, subj) {
    pendingDrop = { key, pos, name: subj.name, types: subj.types, details: subj.details };
    document.getElementById('modalSubjectTitle').innerText = subj.name;
    const typeContainer = document.getElementById('modalTypeSelector');
    typeContainer.innerHTML = '';
    
    const labels = { 'lecture': 'Лекція', 'practical': 'Практика', 'lab': 'Лабораторна' };
    
    subj.types.forEach((t, index) => {
        const btn = document.createElement('div');
        btn.className = `type-btn ${index === 0 ? 'selected' : ''}`;
        btn.innerText = labels[t] || t;
        btn.dataset.value = t;
        btn.onclick = () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateModalVariants(t);
        };
        typeContainer.appendChild(btn);
    });

    updateModalVariants(subj.types[0]);
    document.getElementById('dropModal').classList.add('active');
}

function updateModalVariants(type) {
    const details = pendingDrop.details;
    const variants = (details && details[type]) ? details[type] : [];
    const selectorContainer = document.getElementById('variantSelectorContainer');
    const selector = document.getElementById('modalVariantSelector');
    selector.innerHTML = '';
    
    if (variants.length > 1) {
        selectorContainer.style.display = 'block';
        variants.forEach((v, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            const t = v.teacher || 'Варіант ' + (i+1);
            const r = v.room ? `(${v.room})` : '';
            opt.text = `${t} ${r}`;
            selector.appendChild(opt);
        });
    } else {
        selectorContainer.style.display = 'none';
    }
    
    const first = variants[0] || {teacher:'', room:''};
    document.getElementById('modalDropTeacher').value = first.teacher;
    document.getElementById('modalDropRoom').value = first.room;
}

function saveToGrid(key, pos, data) {
    if(!state.grid[key]) state.grid[key] = {structure: 'single', content: {}};
    if(!state.grid[key].content) state.grid[key].content = {};
    state.grid[key].content[pos] = data;
    renderFillGrid();
}

/* ================= ІМПОРТ / ЕКСПОРТ ================= */
function handleFileExport() {
    const dataStr = JSON.stringify(state, null, 2);
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
            if(data.settings) state.settings = data.settings;
            if(data.subjects) state.subjects = data.subjects;
            if(data.grid) state.grid = data.grid;
            document.getElementById('groupName').value = state.settings.group;
            document.getElementById('pairsPerDay').value = state.settings.pairsPerDay;
            renderTimeInputs();
            renderSubjectsList();
            state.step = 3; 
            updateUI();
            alert('Дані успішно завантажено!');
        } catch(err) {
            alert('Помилка читання файлу!');
        }
    };
    reader.readAsText(file);
    e.target.value = null;
}

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
function calculateStartDate() {
    const userSaysTodayIs = document.querySelector('input[name="currentWeekType"]:checked').value; 
    let startDate = new Date();
    if (userSaysTodayIs === 'den') startDate.setDate(startDate.getDate() - 7);
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

            const finalTime = cell.customTime || timeStr;
            const baseLesson = { number: p+1, time: finalTime, type: 'mixed', subgroups: [] };
            const mapType = (t) => {
                if(t === 'Lec' || t === 'lecture') return 'lecture';
                if(t === 'Prac' || t === 'practical') return 'practical';
                if(t === 'Lab' || t === 'lab') return 'lab';
                return 'lecture';
            };

            const addSub = (pos, grp, wks) => {
                if(cell.content[pos]) {
                    const c = cell.content[pos];
                    baseLesson.subgroups.push({
                        subject: c.subject,
                        type: mapType(c.type),
                        group: grp, weeks: wks, 
                        teacher: c.teacher || "", 
                        room: c.room || ""
                    });
                }
            };

            if (cell.structure === 'single' && cell.content.main) {
                const c = cell.content.main;
                lessons.push({
                    number: p + 1, time: finalTime,
                    subject: c.subject, type: mapType(c.type),
                    weeks: 'all', teacher: c.teacher || "", room: c.room || ""
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
    localStorage.setItem('editorStateBackup', JSON.stringify(state));
    alert('✅ Розклад збережено!');
    window.location.href = 'index.html';
}

wizard.init();
