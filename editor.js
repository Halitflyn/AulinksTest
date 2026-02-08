/* ================= STATE MANAGEMENT ================= */
const state = {
    step: 1,
    settings: {
        group: "",
        weekType: "dynamic",
        pairsPerDay: 5,
        times: ["08:30-09:50", "10:05-11:25", "11:40-13:00", "13:15-14:35", "14:50-16:10", "16:25-17:45", "18:00-19:20"]
    },
    subjects: [],
    // Grid keys: "0-0" (Mon-Pair1). 
    // Structure values: 'single', 'split-v' (Num/Den), 'split-h' (Subgroups),
    // 'split-v-top-h' (Num->Subgroups, Den->Single), 'split-v-bottom-h', 'split-v-both-h'
    grid: {} 
};

const days = ["Пн", "Вт", "Ср", "Чт", "Пт"];

/* ================= WIZARD NAVIGATION ================= */
const wizard = {
    init: () => {
        renderTimeInputs();
        updateUI();
        // Глобальний клік для закриття меню
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.radial-menu') && !e.target.closest('.grid-cell')) {
                document.getElementById('gridRadialMenu').classList.add('hidden');
            }
        });
    },
    next: () => {
        try {
            if (state.step === 1) saveStep1();
            if (state.step === 2 && state.subjects.length === 0) {
                alert("Додайте хоча б один предмет!");
                return;
            }
            if (state.step === 3) {
                // Важливо: спочатку рендеримо, потім переходимо
                renderFillGrid(); 
                renderDraggables();
            }
            
            if (state.step < 4) {
                state.step++;
                updateUI();
            }
        } catch (e) {
            console.error("Error going next:", e);
            alert("Сталася помилка. Перевірте консоль.");
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
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-indicator').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`step-${state.step}`).classList.add('active');
    document.querySelector(`.step-indicator[data-step="${state.step}"]`).classList.add('active');

    if (state.step === 3) renderStructureGrid();
}

/* ================= STEP 1 & 2 (Standard) ================= */
function renderTimeInputs() {
    const container = document.getElementById('timeSettings');
    container.innerHTML = '';
    const count = parseInt(document.getElementById('pairsPerDay').value) || 5;
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.innerHTML = `<label>Пара ${i+1}</label><input type="text" class="time-in" value="${state.settings.times[i] || '00:00-00:00'}">`;
        container.appendChild(div);
    }
}
document.getElementById('pairsPerDay').addEventListener('change', renderTimeInputs);

function saveStep1() {
    state.settings.group = document.getElementById('groupName').value;
    state.settings.pairsPerDay = parseInt(document.getElementById('pairsPerDay').value);
    state.settings.times = Array.from(document.querySelectorAll('.time-in')).map(i => i.value);
}

// Предмети
document.getElementById('addSubjectBtn').addEventListener('click', () => {
    const name = document.getElementById('subjName').value;
    if (!name) return;
    const types = Array.from(document.querySelectorAll('.type-check:checked')).map(cb => cb.value);
    const teachers = {};
    types.forEach(t => teachers[t] = { name: "", room: "" }); // Спрощено

    state.subjects.push({ id: Date.now().toString(), name, types, teachers });
    renderSubjectsList();
    document.getElementById('subjName').value = '';
});

function renderSubjectsList() {
    document.getElementById('subjectsList').innerHTML = state.subjects.map(s => `
        <div class="subject-card" style="padding:10px; border:1px solid #ccc; margin-bottom:5px; border-radius:8px">
            <strong>${s.name}</strong> <small>(${s.types.join(', ')})</small>
        </div>
    `).join('');
}

/* ================= STEP 3: STRUCTURE GRID (Complex Logic) ================= */
function renderStructureGrid() {
    const container = document.getElementById('structureGrid');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `60px repeat(${days.length}, 1fr)`;

    // Headers
    container.appendChild(createDiv('grid-header', 'Час'));
    days.forEach(d => container.appendChild(createDiv('grid-header', d)));

    for (let p = 0; p < state.settings.pairsPerDay; p++) {
        container.appendChild(createDiv('grid-header', state.settings.times[p])); // Time col

        for (let d = 0; d < days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || { structure: 'single' };
            
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.key = key;
            
            // Generate HTML based on structure
            cell.innerHTML = generateStructureHTML(cellData.structure, key);
            
            // Attach Click Event for Menu
            cell.addEventListener('click', (e) => handleCellClick(e, key));
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

// Генерація HTML для структури (рекурсія імітується класами)
function generateStructureHTML(structure, key) {
    // 1. Звичайна клітинка
    if (structure === 'single') return `<div class="sub-cell single" data-pos="main">Одна пара</div>`;
    
    // 2. Глобальні підгрупи
    if (structure === 'split-h') {
        return `<div class="cell-split-h">
            <div class="sub-cell group1" data-pos="left">Підгрупа 1</div>
            <div class="sub-cell group2" data-pos="right">Підгрупа 2</div>
        </div>`;
    }

    // 3. Вертикальний поділ (Чис/Знам) та його варіації
    let topContent = `<div class="sub-cell numerator" data-pos="top">Чисельник</div>`;
    let botContent = `<div class="sub-cell denominator" data-pos="bottom">Знаменник</div>`;

    // Якщо чисельник розбитий на підгрупи
    if (structure === 'split-v-top-h' || structure === 'split-v-both-h') {
        topContent = `<div class="cell-split-h numerator" style="height:50%">
            <div class="sub-cell group1" data-pos="top-left">Чис. Гр1</div>
            <div class="sub-cell group2" data-pos="top-right">Чис. Гр2</div>
        </div>`;
    }

    // Якщо знаменник розбитий на підгрупи
    if (structure === 'split-v-bottom-h' || structure === 'split-v-both-h') {
        botContent = `<div class="cell-split-h denominator" style="height:50%">
            <div class="sub-cell group1" data-pos="bottom-left">Знам. Гр1</div>
            <div class="sub-cell group2" data-pos="bottom-right">Знам. Гр2</div>
        </div>`;
    }

    return `<div class="cell-split-v">${topContent}${botContent}</div>`;
}

// === Radial Menu Logic ===
const radialMenu = document.getElementById('gridRadialMenu');
let activeMenuContext = null; // { key, position }

function handleCellClick(e, key) {
    e.stopPropagation();
    
    // Визначаємо, на яку частину клітинки клікнули
    const subCell = e.target.closest('.sub-cell');
    if (!subCell) return;
    
    const position = subCell.dataset.pos; // main, top, bottom, left, right...
    const currentStruct = state.grid[key]?.structure || 'single';

    activeMenuContext = { key, position, structure: currentStruct };

    // Показуємо меню біля курсора
    radialMenu.style.left = `${e.clientX - 70}px`;
    radialMenu.style.top = `${e.clientY - 70}px`;
    radialMenu.classList.remove('hidden');

    // Налаштовуємо кнопки меню залежно від контексту
    configureMenuButtons(position, currentStruct);
}

function configureMenuButtons(pos, struct) {
    const btnTop = radialMenu.querySelector('.top');    // Split V
    const btnRight = radialMenu.querySelector('.right'); // Split H
    const btnBottom = radialMenu.querySelector('.bottom'); // Clear
    
    // Скидання тексту
    btnTop.innerHTML = '⬆'; btnTop.title = "Чис/Знам";
    btnRight.innerHTML = '➡'; btnRight.title = "Підгрупи";
    btnBottom.innerHTML = '🗑'; btnBottom.title = "Очистити";
    
    // Логіка видимості кнопок
    btnTop.style.display = 'flex';
    btnRight.style.display = 'flex';

    if (struct === 'single') {
        // Можна все
    } else if (struct === 'split-v') {
        // Якщо клікнули на Чисельник (top) -> можна розбити на підгрупи
        if (pos === 'top') { btnTop.style.display = 'none'; btnRight.innerHTML = 'G'; btnRight.title = "Підгрупи Чисельника"; }
        // Якщо клікнули на Знаменник (bottom)
        else if (pos === 'bottom') { btnTop.style.display = 'none'; btnRight.innerHTML = 'G'; btnRight.title = "Підгрупи Знаменника"; }
        else { btnTop.style.display = 'none'; btnRight.style.display = 'none'; }
    } else {
        // Вже складна структура - тільки очищення
        btnTop.style.display = 'none';
        btnRight.style.display = 'none';
    }
}

// Обробка натискань меню
radialMenu.querySelectorAll('.radial-btn').forEach(btn => {
    btn.onclick = (e) => {
        e.stopPropagation();
        const action = btn.dataset.action; // split-vertical, split-horizontal, clear
        applyGridChange(action);
        radialMenu.classList.add('hidden');
    };
});

function applyGridChange(action) {
    if (!activeMenuContext) return;
    const { key, position, structure } = activeMenuContext;
    
    let newStructure = structure;

    if (action === 'clear') {
        newStructure = 'single';
        state.grid[key].content = {}; // Очищаємо контент
    } 
    else if (action === 'split-vertical') {
        if (structure === 'single') newStructure = 'split-v';
    } 
    else if (action === 'split-horizontal') {
        if (structure === 'single') newStructure = 'split-h';
        else if (structure === 'split-v') {
            if (position === 'top') newStructure = 'split-v-top-h';
            if (position === 'bottom') newStructure = 'split-v-bottom-h';
        }
        else if (structure === 'split-v-top-h' && position === 'bottom') newStructure = 'split-v-both-h';
        else if (structure === 'split-v-bottom-h' && position === 'top') newStructure = 'split-v-both-h';
    }

    // Зберігаємо
    if (!state.grid[key]) state.grid[key] = {};
    state.grid[key].structure = newStructure;
    
    renderStructureGrid();
}

/* ================= STEP 4: FILL GRID (Drag & Drop) ================= */
function renderDraggables() {
    const list = document.getElementById('draggableSubjects');
    list.innerHTML = state.subjects.map(s => `
        <div class="drag-item" data-id="${s.id}" onmousedown="startDrag(event)">
            <div style="font-weight:bold">${s.name}</div>
            <div style="font-size:0.8rem; color:#666">${s.types.join(', ')}</div>
        </div>
    `).join('');
}

function renderFillGrid() {
    const container = document.getElementById('fillGrid');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `60px repeat(${days.length}, 1fr)`;

    // Headers... (same as Step 3)
    for (let p = 0; p < state.settings.pairsPerDay; p++) {
        container.appendChild(createDiv('grid-header', state.settings.times[p])); 
        for (let d = 0; d < days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || { structure: 'single', content: {} };
            
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            // Generate structure but with CONTENT placeholders
            cell.innerHTML = generateFillHTML(cellData.structure, key, cellData.content || {});
            container.appendChild(cell);
        }
    }
}

function generateFillHTML(struct, key, content) {
    const renderContent = (pos) => {
        const data = content[pos];
        if (!data) return `<span style="color:#ccc; font-size:0.7rem;">Empty</span>`;
        return `<div class="lesson-chip type-${data.type}"><b>${data.subject}</b><br>${data.type}</div>`;
    };

    const wrap = (pos, extraClass='') => 
        `<div class="sub-cell ${extraClass}" data-drop-key="${key}" data-drop-pos="${pos}">${renderContent(pos)}</div>`;

    if (struct === 'single') return wrap('main', 'single');
    if (struct === 'split-h') return `<div class="cell-split-h">${wrap('left', 'group1')}${wrap('right', 'group2')}</div>`;
    
    // Vertical Logic
    let top = wrap('top', 'numerator');
    let bot = wrap('bottom', 'denominator');

    if (struct.includes('top-h') || struct.includes('both-h')) {
        top = `<div class="cell-split-h numerator" style="height:50%">${wrap('top-left', 'group1')}${wrap('top-right', 'group2')}</div>`;
    }
    if (struct.includes('bottom-h') || struct.includes('both-h')) {
        bot = `<div class="cell-split-h denominator" style="height:50%">${wrap('bottom-left', 'group1')}${wrap('bottom-right', 'group2')}</div>`;
    }

    return `<div class="cell-split-v">${top}${bot}</div>`;
}

// === DRAG AND DROP ENGINE (Виправлений) ===
let isDragging = false;
let dragSubjectId = null;
const ghost = document.getElementById('dragGhost');

function startDrag(e) {
    if (e.button !== 0) return;
    dragSubjectId = e.currentTarget.dataset.id;
    const subj = state.subjects.find(s => s.id === dragSubjectId);
    
    isDragging = true;
    ghost.querySelector('.ghost-content').innerText = subj.name;
    ghost.classList.remove('hidden');
    ghost.style.display = 'block';
    
    updateGhost(e);
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
}

function onDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    updateGhost(e);
    
    // Highlight
    ghost.style.display = 'none'; // Ховаємо привид, щоб побачити, що під ним
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    ghost.style.display = 'block';

    document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover'));
    const cell = elem?.closest('.sub-cell');
    if (cell && cell.dataset.dropKey) cell.classList.add('drop-hover');
}

function updateGhost(e) {
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
}

function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    ghost.style.display = 'none'; // Важливо сховати перед пошуком

    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const target = elem?.closest('.sub-cell');

    if (target && target.dataset.dropKey) {
        saveDrop(target.dataset.dropKey, target.dataset.dropPos);
    }

    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
}

function saveDrop(key, pos) {
    const subj = state.subjects.find(s => s.id === dragSubjectId);
    // Для простоти беремо перший тип, тут можна додати модалку
    const type = subj.types[0]; 
    
    if (!state.grid[key].content) state.grid[key].content = {};
    state.grid[key].content[pos] = {
        subject: subj.name,
        type: type,
        teacher: subj.teachers[type]?.name || ''
    };
    renderFillGrid();
}

// Init
wizard.init();
