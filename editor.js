/* ================= КОНФІГУРАЦІЯ ================= */
const state = {
    step: 1,
    settings: {
        group: "ІП-24",
        pairsPerDay: 5,
        times: ["08:30", "10:05", "11:40", "13:15", "14:50", "16:25", "18:00"]
    },
    subjects: [],
    grid: {} 
};

const days = ["Пн", "Вт", "Ср", "Чт", "Пт"];
const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"]; // Для сумісності з сайтом

/* ================= WIZARD NAV ================= */
const wizard = {
    init: () => {
        renderTimeInputs();
        updateUI();
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.radial-menu')) document.getElementById('gridRadialMenu').classList.add('hidden');
        });
        
        // Кнопка збереження
        const saveBtn = document.getElementById('saveResultBtn');
        if(saveBtn) saveBtn.addEventListener('click', saveFinalResult);
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
    
    document.getElementById(`step-${state.step}`).classList.add('active');
    document.querySelector(`.step-indicator[data-step="${state.step}"]`).classList.add('active');
    
    if (state.step === 3) renderStructureGrid();
}

/* ================= КРОК 1 ================= */
function renderTimeInputs() {
    const container = document.getElementById('timeSettings');
    container.innerHTML = '';
    const n = parseInt(document.getElementById('pairsPerDay').value);
    for(let i=0; i<n; i++) {
        const val = state.settings.times[i] || "00:00";
        container.innerHTML += `<div><label>Пара ${i+1}</label><input class="time-in" value="${val}"></div>`;
    }
}
document.getElementById('pairsPerDay').addEventListener('change', renderTimeInputs);

/* ================= КРОК 2 ================= */
document.getElementById('addSubjectBtn').addEventListener('click', () => {
    const name = document.getElementById('subjName').value;
    if(!name) return;
    const types = Array.from(document.querySelectorAll('.type-check:checked')).map(cb => cb.value);
    if(types.length === 0) types.push('Lec');
    
    state.subjects.push({ id: Date.now().toString(), name, types });
    renderSubjectsList();
    document.getElementById('subjName').value = '';
});

function renderSubjectsList() {
    const list = document.getElementById('subjectsList');
    if(state.subjects.length === 0) {
        list.innerHTML = '<p class="empty-msg">Список порожній</p>';
        return;
    }
    list.innerHTML = state.subjects.map(s => `
        <div style="background:white; padding:10px; border:1px solid #ddd; border-radius:6px; margin-bottom:5px;">
            <b>${s.name}</b> <small>(${s.types.join(', ')})</small>
        </div>
    `).join('');
}

/* ================= КРОК 3 (Структура) ================= */
function renderStructureGrid() {
    const c = document.getElementById('structureGrid');
    c.innerHTML = '';
    c.style.gridTemplateColumns = `50px repeat(${days.length}, 1fr)`;
    
    c.appendChild(div('grid-header', '#'));
    days.forEach(d => c.appendChild(div('grid-header', d)));

    for(let p=0; p<state.settings.pairsPerDay; p++) {
        c.appendChild(div('grid-header', `${p+1}`)); // Номер пари
        for(let d=0; d<days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || {structure: 'single'};
            
            // Генеруємо структуру (false = режим налаштування)
            const cell = div('grid-cell', generateHTML(cellData.structure, false, {}, key));
            
            // Клік для меню
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

// === HTML GENERATOR (Універсальний) ===
function generateHTML(struct, isFillMode, content = {}, key = "") {
    const render = (pos, cls) => {
        let inner = isFillMode ? `<span style="color:#ddd; font-size:12px">+</span>` : "";
        
        // Якщо є контент
        if (isFillMode && content && content[pos]) {
            const item = content[pos];
            inner = `<div class="lesson-chip type-${item.type}">
                <b>${item.subject}</b>
                <div style="font-size:10px">${item.type}</div>
            </div>`;
        }
        
        // Атрибути для Drop
        const dropAttr = isFillMode ? `data-drop-key="${key}" data-drop-pos="${pos}"` : `data-pos="${pos}"`;
        return `<div class="sub-cell ${cls}" ${dropAttr}>${inner}</div>`;
    };

    if (struct === 'single') return render('main', '');
    if (struct === 'split-h') return `<div class="cell-split-h">${render('left','group1')}${render('right','group2')}</div>`;
    
    // Vertical logic
    let top, bot;
    
    // Top
    if (struct === 'split-v-top-h' || struct === 'split-v-both-h') {
        top = `<div class="cell-split-h numerator">${render('top-left','group1')}${render('top-right','group2')}</div>`;
    } else {
        top = render('top', 'numerator');
    }

    // Bottom
    if (struct === 'split-v-bottom-h' || struct === 'split-v-both-h') {
        bot = `<div class="cell-split-h denominator">${render('bottom-left','group1')}${render('bottom-right','group2')}</div>`;
    } else {
        bot = render('bottom', 'denominator');
    }

    return `<div class="cell-split-v">${top}${bot}</div>`;
}

// === RADIAL MENU ===
const menu = document.getElementById('gridRadialMenu');
let menuCtx = null;

function openMenu(e, key, pos, struct) {
    e.stopPropagation();
    menuCtx = {key, pos, struct};
    
    menu.style.left = (e.clientX - 60) + 'px';
    menu.style.top = (e.clientY - 60) + 'px';
    menu.classList.remove('hidden');

    const btnV = menu.querySelector('.top');
    const btnH = menu.querySelector('.right');
    
    btnV.style.display = 'flex'; 
    btnH.style.display = 'flex';

    if (struct.includes('split-v')) btnV.style.display = 'none';
    if (pos.includes('left') || pos.includes('right')) btnH.style.display = 'none';
}

menu.querySelectorAll('.radial-btn').forEach(b => b.onclick = (e) => {
    changeGrid(b.dataset.action);
    menu.classList.add('hidden');
});

function changeGrid(action) {
    const {key, pos, struct} = menuCtx;
    if(!state.grid[key]) state.grid[key] = {structure: 'single', content: {}};
    
    let newS = struct;
    if (action === 'clear') { newS = 'single'; state.grid[key].content = {}; }
    else if (action === 'split-vertical' && struct === 'single') newS = 'split-v';
    else if (action === 'split-horizontal') {
        if (struct === 'single') newS = 'split-h';
        else if (struct === 'split-v') {
            if (pos === 'top') newS = 'split-v-top-h';
            if (pos === 'bottom') newS = 'split-v-bottom-h';
        }
        else if (struct === 'split-v-top-h' && pos === 'bottom') newS = 'split-v-both-h';
        else if (struct === 'split-v-bottom-h' && pos === 'top') newS = 'split-v-both-h';
    }
    
    state.grid[key].structure = newS;
    renderStructureGrid();
}

/* ================= КРОК 4 (Fill) ================= */
function renderDraggables() {
    const c = document.getElementById('draggableSubjects');
    c.innerHTML = state.subjects.map(s => 
        `<div class="drag-item" data-id="${s.id}" onmousedown="startDrag(event)">${s.name}</div>`
    ).join('');
}

function renderFillGrid() {
    const c = document.getElementById('fillGrid');
    c.innerHTML = '';
    c.style.gridTemplateColumns = `50px repeat(${days.length}, 1fr)`;

    c.appendChild(div('grid-header', '#'));
    days.forEach(d => c.appendChild(div('grid-header', d)));

    for(let p=0; p<state.settings.pairsPerDay; p++) {
        c.appendChild(div('grid-header', `${p+1}`));
        for(let d=0; d<days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || {structure: 'single', content: {}};
            // Генеруємо з true (режим заповнення)
            const html = generateHTML(cellData.structure, true, cellData.content, key);
            c.appendChild(div('grid-cell', html));
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

function updateGhost(e) {
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
}

function endDrag(e) {
    isDragging = false;
    ghost.classList.add('hidden');
    
    ghost.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest('.sub-cell');
    ghost.style.display = 'block';

    if(target && target.dataset.dropKey) {
        saveDrop(target.dataset.dropKey, target.dataset.dropPos);
    }
    
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.querySelectorAll('.drop-hover').forEach(x => x.classList.remove('drop-hover'));
}

function saveDrop(key, pos) {
    if(!state.grid[key]) state.grid[key] = {structure: 'single', content: {}};
    if(!state.grid[key].content) state.grid[key].content = {};

    const s = state.subjects.find(x => x.id === dragSubjId);
    state.grid[key].content[pos] = { subject: s.name, type: s.types[0] }; // Беремо перший тип
    renderFillGrid();
}

/* ================= ЗБЕРЕЖЕННЯ (ФІНАЛ) ================= */
function saveFinalResult() {
    // 1. Формуємо об'єкт для index.html
    const scheduleData = {
        groupName: state.settings.group,
        schedule: {}
    };

    // 2. Конвертуємо grid у формат { monday: [...], tuesday: [...] }
    days.forEach((_, dIndex) => {
        const dayKey = dayKeys[dIndex];
        const dayLessons = [];

        for(let p=0; p<state.settings.pairsPerDay; p++) {
            const key = `${dIndex}-${p}`;
            const cell = state.grid[key];
            
            // Якщо клітинки немає або вона порожня - додаємо порожню пару
            if (!cell || !cell.content || Object.keys(cell.content).length === 0) {
                dayLessons.push({
                    number: p + 1,
                    time: state.settings.times[p],
                    subject: "",
                    type: ""
                });
                continue;
            }

            // Якщо є дані - треба конвертувати складну структуру в об'єкт уроку
            // Для простоти, якщо це single, просто зберігаємо
            if (cell.structure === 'single' && cell.content.main) {
                dayLessons.push({
                    number: p + 1,
                    time: state.settings.times[p],
                    subject: cell.content.main.subject,
                    type: cell.content.main.type
                });
            } else {
                // Якщо складна структура (підгрупи/чис/знам)
                // Зберігаємо як "mixed" або адаптуємо під формат твого JSON
                // Тут я зберігаю спрощено, щоб головний сайт хоч щось показав
                dayLessons.push({
                    number: p + 1,
                    time: state.settings.times[p],
                    subject: "Складна пара",
                    type: "Mixed",
                    details: cell.content // Зберігаємо повні дані для майбутнього
                });
            }
        }
        scheduleData.schedule[dayKey] = dayLessons;
    });

    // 3. Зберігаємо в LocalStorage
    localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
    
    // 4. Повертаємо на головну
    alert('Розклад збережено! Перехід на головну...');
    window.location.href = 'index.html';
}

wizard.init();
