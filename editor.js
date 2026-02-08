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
};

const days = ["Пн", "Вт", "Ср", "Чт", "Пт"];

/* ================= WIZARD ENGINE ================= */
const wizard = {
    init: () => {
        renderTimeInputs();
        updateUI();
        
        // Закриття меню
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.radial-menu')) {
                document.getElementById('gridRadialMenu').classList.add('hidden');
            }
        });

        // Ініціалізація кнопки збереження (Крок 4)
        const saveBtn = document.getElementById('saveResultBtn');
        if(saveBtn) {
            saveBtn.addEventListener('click', saveFinalResult);
        }
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
    const indEl = document.querySelector(`.step-indicator[data-step="${state.step}"]`);
    
    if(stepEl) stepEl.classList.add('active');
    if(indEl) indEl.classList.add('active');

    if (state.step === 3) renderStructureGrid();
}

/* ================= STEP 1 & 2 ================= */
function renderTimeInputs() {
    const c = document.getElementById('timeSettings'); 
    if(!c) return;
    c.innerHTML = '';
    const n = parseInt(document.getElementById('pairsPerDay').value) || 5;
    for(let i=0; i<n; i++) {
        const val = state.settings.times[i] || '00:00-00:00';
        const div = document.createElement('div');
        div.innerHTML = `<label>Пара ${i+1}</label><input class="time-in" value="${val}">`;
        c.appendChild(div);
    }
}
if(document.getElementById('pairsPerDay')) {
    document.getElementById('pairsPerDay').addEventListener('change', renderTimeInputs);
}

const addSubjBtn = document.getElementById('addSubjectBtn');
if(addSubjBtn) {
    addSubjBtn.addEventListener('click', () => {
        const name = document.getElementById('subjName').value;
        if(!name) return;
        const types = Array.from(document.querySelectorAll('.type-check:checked')).map(cb=>cb.value);
        if(types.length === 0) types.push('Lec'); // Default

        const teachers = {}; 
        types.forEach(t => teachers[t] = {name:"", room:""});
        
        state.subjects.push({id: Date.now().toString(), name, types, teachers});
        
        renderSubjectsList();
        document.getElementById('subjName').value = '';
    });
}

function renderSubjectsList() {
    const list = document.getElementById('subjectsList');
    if(!list) return;
    list.innerHTML = state.subjects.map(s => 
        `<div style="padding:10px; background:#f8fafc; border:1px solid #e2e8f0; margin-bottom:5px; border-radius:6px;">
            <strong>${s.name}</strong> <small style="color:#64748b">(${s.types.join(', ')})</small>
        </div>`
    ).join('');
}

/* ================= STEP 3: STRUCTURE ================= */
function renderStructureGrid() {
    const c = document.getElementById('structureGrid'); 
    if(!c) return;
    c.innerHTML = '';
    c.style.gridTemplateColumns = `60px repeat(${days.length}, 1fr)`;
    
    // Headers
    c.appendChild(div('grid-header', 'Час'));
    days.forEach(d => c.appendChild(div('grid-header', d)));

    for(let p=0; p<state.settings.pairsPerDay; p++) {
        c.appendChild(div('grid-header', state.settings.times[p]));
        for(let d=0; d<days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || {structure: 'single'};
            
            const cell = div('grid-cell', generateHTML(cellData.structure, false, {}, key));
            
            // Listener
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

// === UNIVERSAL HTML GENERATOR ===
function generateHTML(struct, isFillMode, content = {}, key = "") {
    const render = (pos, cls) => {
        let inner = isFillMode ? `<span style="color:#cbd5e1; font-size:10px">+</span>` : pos;
        
        if (isFillMode && content && content[pos]) {
            const item = content[pos];
            inner = `<div class="lesson-chip type-${item.type}">
                        <b>${item.subject}</b>
                        <div style="font-size:0.65rem">${item.type}</div>
                     </div>`;
        }

        // ВАЖЛИВО: Передаємо KEY прямо в атрибут
        const dropKeyAttr = isFillMode ? `data-drop-key="${key}"` : '';
        
        return `<div class="sub-cell ${cls}" data-pos="${pos}" ${dropKeyAttr} data-drop-pos="${pos}">${inner}</div>`;
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
    
    btnV.style.display = 'flex'; btnV.innerText = '⬆';
    btnH.style.display = 'flex'; btnH.innerText = '➡';

    if (struct.includes('split-v')) btnV.style.display = 'none';
    if (pos.includes('left') || pos.includes('right')) btnH.style.display = 'none';
}

if(menu) {
    menu.querySelectorAll('.radial-btn').forEach(b => b.onclick = (e) => {
        e.stopPropagation();
        changeGrid(b.dataset.action);
        menu.classList.add('hidden');
    });
}

function changeGrid(action) {
    const {key, pos, struct} = menuCtx;
    // Ініціалізація, якщо немає
    if(!state.grid[key]) state.grid[key] = {structure: 'single', content:{}};
    
    let newS = struct;

    if (action === 'clear') {
        newS = 'single';
        state.grid[key].content = {};
    }
    else if (action === 'split-vertical') {
        if (struct === 'single') newS = 'split-v';
    }
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

/* ================= STEP 4: FILL & DRAG ================= */
function renderDraggables() {
    const container = document.getElementById('draggableSubjects');
    if(!container) return;
    container.innerHTML = state.subjects.map(s => 
        `<div class="drag-item" data-id="${s.id}" onmousedown="startDrag(event)">
            <div style="font-weight:600">${s.name}</div> 
            <small style="color:#666">${s.types[0]}</small>
         </div>`
    ).join('');
}

function renderFillGrid() {
    const c = document.getElementById('fillGrid'); 
    if(!c) return;
    c.innerHTML = '';
    c.style.gridTemplateColumns = `60px repeat(${days.length}, 1fr)`;

    for(let p=0; p<state.settings.pairsPerDay; p++) {
        c.appendChild(div('grid-header', state.settings.times[p]));
        for(let d=0; d<days.length; d++) {
            const key = `${d}-${p}`;
            const cellData = state.grid[key] || {structure: 'single', content: {}};
            
            // Тут ми передаємо KEY в генератор
            const html = generateHTML(cellData.structure, true, cellData.content, key);
            c.appendChild(div('grid-cell', html));
        }
    }
}

// === DRAG & DROP ENGINE (FIXED) ===
let isDragging = false, dragSubjId = null;
const ghost = document.getElementById('dragGhost');

function startDrag(e) {
    if(e.button!==0) return;
    dragSubjId = e.currentTarget.dataset.id;
    const s = state.subjects.find(x=>x.id===dragSubjId);
    
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
    ghost.style.display = 'flex';
    
    document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));
    const cell = el?.closest('.sub-cell');
    if(cell && cell.dataset.dropKey) cell.classList.add('drop-hover');
}

function updateGhost(e) {
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
}

function endDrag(e) {
    if(!isDragging) return;
    isDragging = false;
    ghost.classList.add('hidden');
    ghost.style.display = 'none';

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest('.sub-cell');

    if (target && target.dataset.dropKey) {
        const key = target.dataset.dropKey;
        const pos = target.dataset.dropPos;
        
        saveDrop(key, pos);
    }
    
    ghost.style.display = 'flex';
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));
}

function saveDrop(key, pos) {
    const subj = state.subjects.find(x => x.id === dragSubjId);
    if (!subj) return;

    // 1. ПЕРЕВІРКА: Якщо клітинка "стандартна", її ще немає в state.grid. Створюємо!
    if (!state.grid[key]) {
        state.grid[key] = { structure: 'single', content: {} };
    }
    if (!state.grid[key].content) {
        state.grid[key].content = {};
    }

    // Якщо у предмета є типи, вибираємо. 
    // Для простоти беремо перший, або можна розкоментувати модалку.
    const type = subj.types[0];
    
    if (subj.types.length > 1) {
        // Якщо хочете модалку, розкоментуйте:
        // showTypeModal(subj, (t) => writeToState(key, pos, subj, t));
        writeToState(key, pos, subj, type); // Поки що автоматично перший
    } else {
        writeToState(key, pos, subj, type);
    }
}

function writeToState(key, pos, subj, type) {
    state.grid[key].content[pos] = {
        subject: subj.name,
        type: type,
        teacher: subj.teachers[type]?.name || ''
    };
    renderFillGrid();
}

/* ================= SAVE FINAL RESULT ================= */
function saveFinalResult() {
    const exportData = {
        group: state.settings.group,
        schedule: {}
    };

    // Конвертація у формат для index.html
    // Проходимо по днях
    days.forEach((dayName, dIndex) => {
        // Тут мапування назв днів для вашого index.html (monday, tuesday...)
        const engDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
        const dayKey = engDays[dIndex];
        
        exportData.schedule[dayKey] = [];
        
        // Тут треба дописати логіку конвертації зі state.grid у лінійний список lessons
        // Це залежить від вашого формату в index.html.
        // Наразі зберігаємо "сирий" дамп для редактора:
    });

    // Зберігаємо в LocalStorage
    localStorage.setItem('mySchedule', JSON.stringify(state));
    alert('✅ Розклад збережено! (Дані записані в LocalStorage)');
}

// Global helper for Modal (якщо додасте)
window.closeModal = () => {
    document.getElementById('modalOverlay')?.classList.add('hidden');
};

wizard.init();
