/* ================= STATE MANAGEMENT ================= */
const state = {
    step: 1,
    settings: {
        group: "Group",
        weekType: "dynamic",
        pairsPerDay: 5,
        times: ["08:30-09:50", "10:05-11:25", "11:40-13:00", "13:15-14:35", "14:50-16:10", "16:25-17:45", "18:00-19:20"]
    },
    subjects: [],
    grid: {} 
    /* Структури grid:
       'single'
       'split-h' (тільки підгрупи)
       'split-v' (чис/знам)
       'split-v-top-h' (чис з підгрупами, знам цілий)
       'split-v-bottom-h' (чис цілий, знам з підгрупами)
       'split-v-both-h' (обидва з підгрупами)
    */
};

const days = ["Пн", "Вт", "Ср", "Чт", "Пт"];

/* ================= WIZARD ENGINE ================= */
const wizard = {
    init: () => {
        renderTimeInputs();
        updateUI();
        
        // Закриття меню при кліку поза ним
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.radial-menu')) {
                document.getElementById('gridRadialMenu').classList.add('hidden');
            }
        });
    },
    next: () => {
        if (state.step === 1) saveStep1();
        if (state.step === 2 && state.subjects.length === 0) {
            alert("Будь ласка, додайте хоча б один предмет!");
            return;
        }
        if (state.step === 3) {
            renderFillGrid(); // Готуємо сітку для Drag & Drop
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
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-indicator').forEach(el => el.classList.remove('active'));
    
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

/* ================= STEP 2: SUBJECTS ================= */
document.getElementById('addSubjectBtn').addEventListener('click', () => {
    const name = document.getElementById('subjName').value;
    if (!name) return;
    
    const types = Array.from(document.querySelectorAll('.type-check:checked')).map(cb => cb.value);
    if(types.length === 0) types.push('Lec'); // Дефолт

    const teachers = {};
    types.forEach(t => teachers[t] = { name: "", room: "" }); 

    state.subjects.push({ id: Date.now().toString(), name, types, teachers });
    renderSubjectsList();
    document.getElementById('subjName').value = '';
});

function renderSubjectsList() {
    document.getElementById('subjectsList').innerHTML = state.subjects.map(s => `
        <div style="padding:10px; border:1px solid #ccc; margin-bottom:5px; border-radius:8px; background:white;">
            <strong>${s.name}</strong> <small>(${s.types.join(', ')})</small>
        </div>
    `).join('');
}

/* ================= STEP 3: STRUCTURE GRID (ПОВНА ЛОГІКА) ================= */
function renderStructureGrid() {
    const container = document.getElementById('structureGrid');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `60px repeat(${days.length}, 1fr)`;

    // Заголовки
    container.appendChild(createDiv('grid-header', 'Час'));
    days.forEach(d => container.appendChild(createDiv('grid-header', d)));

    for (let p = 0; p < state.settings.pairsPerDay; p++) {
        container.appendChild(createDiv('grid-header', state.settings.times[p])); 

        for (let d = 0; d < days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || { structure: 'single' };
            
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            // Генеруємо HTML структури
            cell.innerHTML = generateStructureHTML(cellData.structure);
            
            // Подія кліку для відкриття меню
            cell.addEventListener('click', (e) => handleCellClick(e, key, cellData.structure));
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

function generateStructureHTML(structure) {
    // 1. Звичайна
    if (structure === 'single') return `<div class="sub-cell" data-pos="main">Одна пара</div>`;
    
    // 2. Підгрупи (Горизонтально)
    if (structure === 'split-h') {
        return `<div class="cell-split-h">
            <div class="sub-cell group1" data-pos="left">Гр. 1</div>
            <div class="sub-cell group2" data-pos="right">Гр. 2</div>
        </div>`;
    }

    // 3. Вертикальні поділи
    let topContent = `<div class="sub-cell numerator" data-pos="top">Чисельник</div>`;
    let botContent = `<div class="sub-cell denominator" data-pos="bottom">Знаменник</div>`;

    // Якщо Чисельник поділений
    if (structure === 'split-v-top-h' || structure === 'split-v-both-h') {
        topContent = `<div class="cell-split-h numerator">
            <div class="sub-cell group1" data-pos="top-left">Чис. Гр1</div>
            <div class="sub-cell group2" data-pos="top-right">Чис. Гр2</div>
        </div>`;
    }

    // Якщо Знаменник поділений
    if (structure === 'split-v-bottom-h' || structure === 'split-v-both-h') {
        botContent = `<div class="cell-split-h denominator">
            <div class="sub-cell group1" data-pos="bottom-left">Знам. Гр1</div>
            <div class="sub-cell group2" data-pos="bottom-right">Знам. Гр2</div>
        </div>`;
    }

    return `<div class="cell-split-v">${topContent}${botContent}</div>`;
}

// --- Radial Menu Logic ---
const radialMenu = document.getElementById('gridRadialMenu');
let activeMenuContext = null; 

function handleCellClick(e, key, structure) {
    e.stopPropagation();
    const subCell = e.target.closest('.sub-cell');
    if (!subCell) return;
    
    const position = subCell.dataset.pos;
    activeMenuContext = { key, position, structure };

    // Позиціонування меню
    radialMenu.style.left = `${e.clientX - 70}px`;
    radialMenu.style.top = `${e.clientY - 70}px`;
    radialMenu.classList.remove('hidden');

    const btnV = radialMenu.querySelector('.top');    // Split Vertical
    const btnH = radialMenu.querySelector('.right');  // Split Horizontal
    
    // Скидання
    btnV.style.display = 'flex'; btnV.innerHTML = '⬆'; btnV.title = "Чис/Знам";
    btnH.style.display = 'flex'; btnH.innerHTML = '➡'; btnH.title = "Підгрупи";

    // Логіка показу кнопок
    if (structure === 'single') {
        // Можна все
    } else if (structure === 'split-v') {
        btnV.style.display = 'none'; // Вже поділено вертикально
    } else if (structure.includes('split-v')) {
        // Якщо складна структура, вертикальний поділ вже є
        btnV.style.display = 'none';
        
        // Якщо клікнули на ту частину, яка вже має підгрупи, ховаємо кнопку підгруп
        if (position.includes('left') || position.includes('right')) {
            btnH.style.display = 'none'; 
        }
    } else if (structure === 'split-h') {
        btnH.style.display = 'none';
        btnV.style.display = 'none'; // Поки що заборонимо міксувати з підгруп назад у чисельник
    }
}

radialMenu.querySelectorAll('.radial-btn').forEach(btn => {
    btn.onclick = (e) => {
        const action = btn.dataset.action;
        applyGridChange(action);
        radialMenu.classList.add('hidden');
    };
});

function applyGridChange(action) {
    if (!activeMenuContext) return;
    const { key, position, structure } = activeMenuContext;
    
    if (!state.grid[key]) state.grid[key] = { structure: 'single', content: {} };

    if (action === 'clear') {
        state.grid[key].structure = 'single';
        state.grid[key].content = {};
    } 
    else if (action === 'split-vertical') {
        if (structure === 'single') state.grid[key].structure = 'split-v';
    } 
    else if (action === 'split-horizontal') {
        if (structure === 'single') {
            state.grid[key].structure = 'split-h';
        }
        else if (structure === 'split-v') {
            if (position === 'top') state.grid[key].structure = 'split-v-top-h';
            if (position === 'bottom') state.grid[key].structure = 'split-v-bottom-h';
        }
        // ЛОГІКА ДЛЯ ОБ'ЄДНАННЯ (Чис і Знам разом)
        else if (structure === 'split-v-top-h' && position === 'bottom') {
            state.grid[key].structure = 'split-v-both-h';
        }
        else if (structure === 'split-v-bottom-h' && position === 'top') {
            state.grid[key].structure = 'split-v-both-h';
        }
    }
    
    renderStructureGrid();
}

/* ================= STEP 4: FILL GRID (DRAG & DROP) ================= */
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

    for (let p = 0; p < state.settings.pairsPerDay; p++) {
        container.appendChild(createDiv('grid-header', state.settings.times[p])); 
        for (let d = 0; d < days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || { structure: 'single', content: {} };
            
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            // Вставляємо структуру з зонами drop
            cell.innerHTML = generateFillHTML(cellData.structure, key, cellData.content || {});
            container.appendChild(cell);
        }
    }
}

function generateFillHTML(struct, key, content) {
    // Хелпер для рендерингу зони
    const renderZone = (pos, extraClass = '') => {
        const item = content[pos];
        let inner = `<span style="color:#ccc; font-size:10px;">+</span>`;
        
        if (item) {
            inner = `<div class="lesson-chip type-${item.type}">
                <b>${item.subject}</b>
                <div style="font-size:0.6rem">${item.type}</div>
            </div>`;
        }
        
        // ВАЖЛИВО: Атрибути для Drop
        return `<div class="sub-cell ${extraClass}" data-drop-key="${key}" data-drop-pos="${pos}">
            ${inner}
        </div>`;
    };

    if (struct === 'single') return renderZone('main');
    
    if (struct === 'split-h') return `<div class="cell-split-h">${renderZone('left', 'group1')}${renderZone('right', 'group2')}</div>`;
    
    let top = renderZone('top', 'numerator');
    let bot = renderZone('bottom', 'denominator');

    if (struct === 'split-v-top-h' || struct === 'split-v-both-h') {
        top = `<div class="cell-split-h numerator">${renderZone('top-left', 'group1')}${renderZone('top-right', 'group2')}</div>`;
    }
    
    if (struct === 'split-v-bottom-h' || struct === 'split-v-both-h') {
        bot = `<div class="cell-split-h denominator">${renderZone('bottom-left', 'group1')}${renderZone('bottom-right', 'group2')}</div>`;
    }

    return `<div class="cell-split-v">${top}${bot}</div>`;
}

// === DRAG & DROP ENGINE ===
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
    
    // Тимчасово ховаємо привид, щоб побачити що під ним
    ghost.style.display = 'none';
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    ghost.style.display = 'block';

    document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover'));
    
    const cell = elem?.closest('.sub-cell');
    if (cell && cell.dataset.dropKey) {
        cell.classList.add('drop-hover');
    }
}

function updateGhost(e) {
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
}

function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    ghost.style.display = 'none';
    ghost.classList.add('hidden');

    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const target = elem?.closest('.sub-cell');

    if (target && target.dataset.dropKey) {
        saveDrop(target.dataset.dropKey, target.dataset.dropPos);
    }

    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover'));
}

function saveDrop(key, pos) {
    const subj = state.subjects.find(s => s.id === dragSubjectId);
    if (!subj) return;

    // Беремо перший тип для простоти
    const type = subj.types[0]; 
    
    if (!state.grid[key].content) state.grid[key].content = {};
    
    state.grid[key].content[pos] = {
        subject: subj.name,
        type: type,
        teacher: subj.teachers[type]?.name || ''
    };
    
    renderFillGrid();
}

// Запуск
wizard.init();
