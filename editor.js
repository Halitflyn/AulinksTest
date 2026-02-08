/* ================= КОНФІГУРАЦІЯ ================= */
const state = {
    step: 1,
    settings: {
        group: "ІП-24",
        pairsPerDay: 5,
        // Формат часу ВАЖЛИВИЙ для твого script.js (має бути "XX:XX – XX:XX")
        times: [
            "08:30 – 09:50",
            "10:05 – 11:25",
            "11:40 – 13:00",
            "13:15 – 14:35",
            "14:50 – 16:10",
            "16:25 – 17:45",
            "18:00 – 19:20"
        ]
    },
    subjects: [],
    grid: {} 
};

// Ключі днів, які очікує твій script.js
const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const dayNamesUk = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];

/* ================= WIZARD NAV ================= */
const wizard = {
    init: () => {
        renderTimeInputs();
        updateUI();
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.radial-menu')) document.getElementById('gridRadialMenu').classList.add('hidden');
        });
        
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
        const val = state.settings.times[i] || "00:00 – 00:00";
        container.innerHTML += `<div><label>Пара ${i+1}</label><input class="time-in" value="${val}"></div>`;
    }
}
document.getElementById('pairsPerDay').addEventListener('change', renderTimeInputs);

/* ================= КРОК 2 ================= */
document.getElementById('addSubjectBtn').addEventListener('click', () => {
    const name = document.getElementById('subjName').value;
    if(!name) return;
    const types = Array.from(document.querySelectorAll('.type-check:checked')).map(cb => cb.value);
    if(types.length === 0) types.push('lecture'); // Default type matching your script (lecture/practical/lab)
    
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

// === HTML GENERATOR ===
function generateHTML(struct, isFillMode, content = {}, key = "") {
    const render = (pos, cls) => {
        let inner = isFillMode ? `<span style="color:#ddd; font-size:12px">+</span>` : "";
        
        if (isFillMode && content && content[pos]) {
            const item = content[pos];
            // Використовуємо твої класи кольорів (lecture/practical/lab)
            let typeClass = item.type; 
            if(item.type === 'Lec') typeClass = 'lecture';
            if(item.type === 'Prac') typeClass = 'practical';
            if(item.type === 'Lab') typeClass = 'lab';

            inner = `<div class="lesson-chip type-${typeClass}" style="background-color: var(--c-${item.type.toLowerCase()});">
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
    
    if (struct === 'split-v-top-h' || struct === 'split-v-both-h') {
        top = `<div class="cell-split-h numerator">${render('top-left','group1')}${render('top-right','group2')}</div>`;
    } else {
        top = render('top', 'numerator');
    }

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
    c.style.gridTemplateColumns = `50px repeat(${dayKeys.length}, 1fr)`;

    c.appendChild(div('grid-header', '#'));
    dayNamesUk.forEach(d => c.appendChild(div('grid-header', d)));

    for(let p=0; p<state.settings.pairsPerDay; p++) {
        c.appendChild(div('grid-header', `${p+1}`));
        for(let d=0; d<dayKeys.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || {structure: 'single', content: {}};
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
    state.grid[key].content[pos] = { subject: s.name, type: s.types[0] }; 
    renderFillGrid();
}

/* ================= ЗБЕРЕЖЕННЯ (ФІНАЛ) ================= */
function saveFinalResult() {
    // Формуємо об'єкт точно так, як його очікує твій script.js
    const scheduleExport = {
        group: state.settings.group,
        startDate: new Date().toISOString().split('T')[0], // Поточна дата для розрахунку тижнів
        schedule: {}
    };

    dayKeys.forEach((dayKey, dIndex) => {
        const lessons = [];

        for(let p=0; p<state.settings.pairsPerDay; p++) {
            const key = `${dIndex}-${p}`;
            const cell = state.grid[key];
            const timeStr = state.settings.times[p];

            if (!cell || !cell.content || Object.keys(cell.content).length === 0) continue;

            // Конвертація внутрішньої структури в формат script.js (subgroups)
            const baseLesson = {
                number: p + 1,
                time: timeStr,
                type: 'mixed', // Якщо структура складна
                subgroups: []
            };

            // Функція для мапінгу типів (Lec -> lecture)
            const mapType = (t) => {
                if(t === 'Lec') return 'lecture';
                if(t === 'Prac') return 'practical';
                if(t === 'Lab') return 'lab';
                return 'lecture';
            };

            // 1. Одинарна клітинка (Single)
            if (cell.structure === 'single' && cell.content.main) {
                lessons.push({
                    number: p + 1,
                    time: timeStr,
                    subject: cell.content.main.subject,
                    type: mapType(cell.content.main.type),
                    weeks: 'all'
                });
                continue;
            }

            // 2. Складна структура -> переганяємо все в subgroups
            const pushSub = (pos, group, weeks) => {
                if(cell.content[pos]) {
                    baseLesson.subgroups.push({
                        subject: cell.content[pos].subject,
                        type: mapType(cell.content[pos].type),
                        group: group, // 'all', 'sub1', 'sub2'
                        weeks: weeks,  // 'all', 'num', 'den'
                        teacher: "",
                        room: ""
                    });
                }
            };

            // Розбір структури
            if (cell.structure === 'split-h') {
                pushSub('left', 'sub1', 'all');
                pushSub('right', 'sub2', 'all');
            }
            else if (cell.structure === 'split-v') {
                pushSub('top', 'all', 'num');
                pushSub('bottom', 'all', 'den');
            }
            else {
                // Складні мікси
                // Верхня частина (Чисельник)
                if(cell.structure.includes('top-h') || cell.structure.includes('both-h')) {
                    pushSub('top-left', 'sub1', 'num');
                    pushSub('top-right', 'sub2', 'num');
                } else {
                    pushSub('top', 'all', 'num');
                }
                
                // Нижня частина (Знаменник)
                if(cell.structure.includes('bottom-h') || cell.structure.includes('both-h')) {
                    pushSub('bottom-left', 'sub1', 'den');
                    pushSub('bottom-right', 'sub2', 'den');
                } else {
                    pushSub('bottom', 'all', 'den');
                }
            }

            if(baseLesson.subgroups.length > 0) {
                lessons.push(baseLesson);
            }
        }
        
        scheduleExport.schedule[dayKey] = {
            name: dayNamesUk[dIndex],
            lessons: lessons
        };
    });

    // ЗБЕРІГАЄМО ПІД ПРАВИЛЬНИМ КЛЮЧЕМ
    localStorage.setItem('myCustomSchedule', JSON.stringify(scheduleExport));
    
    alert('✅ Розклад збережено! Зараз відкриється головна сторінка.');
    window.location.href = 'index.html';
}

wizard.init();
