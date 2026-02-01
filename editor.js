// === КОНСТАНТИ ===
const SCHEDULE_STORAGE_KEY = 'myCustomSchedule';
const DEFAULT_TIMES = ['08:30 – 09:50', '10:05 – 11:25', '11:40 – 13:00', '13:15 – 14:35', '14:50 – 16:10', '16:25 – 17:45', '18:00 – 19:20', '19:30 – 20:50'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAYS_UA = { monday: 'Понеділок', tuesday: 'Вівторок', wednesday: 'Середа', thursday: 'Четвер', friday: 'П’ятниця' };

// === СТАН ПРОГРАМИ ===
let appState = {
    step: 1,
    config: { weekType: 'numden', count: 5, times: [] },
    subjects: [], // Смарт-карти: { id, name, types: {lec, prac, lab}, details: [{teacher, room}] }
    gridData: {}, // { monday: [ {type, content} ] }
    
    // Drag State
    draggedSubject: null,
    dragStartPos: { x: 0, y: 0 },
    activeSector: null, // 'lec', 'prac', 'lab'
    ghost: null,
    radialMenu: null
};

document.addEventListener('DOMContentLoaded', () => {
    // Навігація
    document.getElementById('btnClassicEdit').onclick = () => showScreen('classicEditor');
    document.getElementById('btnVisualEdit').onclick = () => { showScreen('visualWizard'); initWizard(); };
    
    // Смарт-карти (Крок 2)
    document.getElementById('addDetailRowBtn').onclick = addDetailRow;
    document.getElementById('addSmartSubjectBtn').onclick = addSmartSubject;
    
    // Збереження
    document.getElementById('finishVisualBtn').onclick = saveVisualSchedule;
    document.getElementById('saveTimeBtn').onclick = applyCustomTime;

    // Створюємо радіальне меню в DOM
    createRadialMenuDOM();
});

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById(id).style.display = 'block';
}

// === WIZARD LOGIC ===
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
        // Зберігаємо конфіг з Кроку 1
        appState.config.weekType = document.getElementById('wizWeekType').value;
        appState.config.count = parseInt(document.getElementById('wizLessonCount').value);
        appState.config.times = [];
        for(let i=1; i<=appState.config.count; i++) {
            appState.config.times.push(document.getElementById(`wizTime_${i}`).value);
        }
        // Ініціалізуємо сітку даними
        DAYS.forEach(day => {
            if (appState.gridData[day].length === 0) {
                appState.gridData[day] = Array(appState.config.count).fill(null).map(() => ({ type: 'single', content: {} }));
            }
        });
    }
    if (step === 3) {
        renderFullSchedule();
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

// === КРОК 2: СМАРТ КАРТИ ===
function addDetailRow() {
    const container = document.getElementById('smartDetailsList');
    const div = document.createElement('div');
    div.className = 'detail-row';
    div.innerHTML = `<input type="text" class="inp-teacher" placeholder="Викладач"><input type="text" class="inp-room" placeholder="Аудиторія">`;
    container.appendChild(div);
}

function addSmartSubject() {
    const name = document.getElementById('smartSubjectName').value.trim();
    if(!name) return alert('Введіть назву предмета');
    
    const types = {
        lec: document.getElementById('smartHasLec').checked,
        prac: document.getElementById('smartHasPrac').checked,
        lab: document.getElementById('smartHasLab').checked
    };
    if(!types.lec && !types.prac && !types.lab) return alert('Оберіть хоча б один тип (Лек/Прак/Лаб)');

    const details = [];
    document.querySelectorAll('#smartDetailsList .detail-row').forEach(row => {
        const t = row.querySelector('.inp-teacher').value.trim();
        const r = row.querySelector('.inp-room').value.trim();
        if(t || r) details.push({ teacher: t, room: r });
    });
    if(details.length === 0) details.push({teacher: '', room: ''}); // Default empty

    appState.subjects.push({ id: Date.now(), name, types, details });
    
    // Очищення форми
    document.getElementById('smartSubjectName').value = '';
    document.getElementById('smartDetailsList').innerHTML = `<div class="detail-row"><input type="text" class="inp-teacher" placeholder="Викладач"><input type="text" class="inp-room" placeholder="Аудиторія"></div>`;
    renderSmartList();
}

function renderSmartList() {
    const list = document.getElementById('smartSubjectList');
    list.innerHTML = appState.subjects.map(s => `
        <div class="smart-item">
            <span class="del-item-btn" onclick="removeSmartSubject(${s.id})">×</span>
            <h5>${s.name}</h5>
            <div class="badges">
                ${s.types.lec ? '<span class="badge lec">Лек</span>' : ''}
                ${s.types.prac ? '<span class="badge prac">Прак</span>' : ''}
                ${s.types.lab ? '<span class="badge lab">Лаб</span>' : ''}
            </div>
            <div style="font-size:11px; color:#666; margin-top:4px;">
                ${s.details.length} варіант(ів) аудиторій
            </div>
        </div>
    `).join('');
}

function removeSmartSubject(id) {
    appState.subjects = appState.subjects.filter(s => s.id !== id);
    renderSmartList();
}

// === КРОК 3: ІНТЕРФЕЙС ===
function renderSidebarPuzzles() {
    const container = document.getElementById('puzzleContainer');
    container.innerHTML = '';
    appState.subjects.forEach(s => {
        const el = document.createElement('div');
        el.className = 'puzzle-piece';
        el.innerText = s.name;
        // Прив'язуємо дані до елемента
        el.dataset.id = s.id;
        setupTouchDrag(el, s); // Ініціалізуємо Drag
        container.appendChild(el);
    });
}

function renderFullSchedule() {
    const container = document.getElementById('visualGrid');
    container.innerHTML = '';

    DAYS.forEach(day => {
        const dayBlock = document.createElement('div');
        dayBlock.className = 'day-block';
        dayBlock.innerHTML = `<div class="day-header">${DAYS_UA[day]}</div>`;
        
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'day-slots';

        appState.gridData[day].forEach((lesson, idx) => {
            const slot = document.createElement('div');
            slot.className = `grid-slot ${lesson.content.subject ? 'filled' : ''}`;
            
            // Час (збоку)
            const timeVal = lesson.customTime || appState.config.times[idx] || '';
            
            // Внутрішня структура
            let contentHTML = '';
            if (lesson.type === 'single') {
                contentHTML = renderSubCell(lesson.content, day, idx, 'main');
            } else if (lesson.type === 'subgroups') {
                contentHTML = `
                    <div class="sub-row">${renderSubCell(lesson.content.sub1 || {}, day, idx, 'sub1', 'Група 1')}</div>
                    <div class="sub-row">${renderSubCell(lesson.content.sub2 || {}, day, idx, 'sub2', 'Група 2')}</div>`;
            } else if (lesson.type === 'numden') {
                 contentHTML = `
                    <div class="sub-row">${renderSubCell(lesson.content.num || {}, day, idx, 'num', 'Чисельник')}</div>
                    <div class="sub-row">${renderSubCell(lesson.content.den || {}, day, idx, 'den', 'Знаменник')}</div>`;
            }

            slot.innerHTML = `
                <div class="slot-time" onclick="openTimeModal('${day}', ${idx})">${timeVal}</div>
                <div class="slot-content">${contentHTML}</div>
            `;
            
            // Жести для самого слота (Спліт)
            setupSlotGestures(slot, day, idx);

            slotsContainer.appendChild(slot);
        });

        dayBlock.appendChild(slotsContainer);
        container.appendChild(dayBlock);
    });
}

function renderSubCell(data, day, idx, subKey, label) {
    // Кольори для фону
    let style = '';
    let typeLabel = '';
    if(data.type === 'Лекція') { style = 'background:var(--lec-bg); color:var(--lec-txt);'; typeLabel = 'Лек'; }
    if(data.type === 'Практична') { style = 'background:var(--prac-bg); color:var(--prac-txt);'; typeLabel = 'Прак'; }
    if(data.type === 'Лабораторна') { style = 'background:var(--lab-bg); color:var(--lab-txt);'; typeLabel = 'Лаб'; }

    let inner = '';
    if(data.subject) {
        inner = `<b>${data.subject}</b><br><small>${typeLabel}</small><br><small>${data.room || ''}</small>`;
    } else if (label) {
        inner = `<span style="opacity:0.5">${label}</span>`;
    }

    // data-target атрибути для drop
    return `<div class="sub-cell" style="${style}" data-day="${day}" data-idx="${idx}" data-key="${subKey}">${inner}</div>`;
}

// === РАДІАЛЬНЕ МЕНЮ & DRAG LOGIC ===

function createRadialMenuDOM() {
    const menu = document.createElement('div');
    menu.id = 'radialMenu';
    menu.className = 'radial-menu';
    document.body.appendChild(menu);
    appState.radialMenu = menu;
}

function updateRadialMenuVisuals(subject) {
    const menu = appState.radialMenu;
    const types = subject.types;
    let sectors = [];

    // Логіка секторів: 
    // Лекція (Біла) - Ліво (135deg - 225deg)
    // Практика (Сіра) - Право (-45deg - 45deg)
    // Лаба (Чорна) - Низ (45deg - 135deg)
    
    // CSS Conic Gradient будується від 0deg (верх) за годинниковою.
    // Право = 90deg, Низ = 180deg, Ліво = 270deg.
    
    // Спрощена логіка для градієнта (візуально)
    // Якщо є всі 3: 
    //   Lec (Left): 210deg - 330deg
    //   Prac (Right): 30deg - 150deg
    //   Lab (Bottom): 150deg - 210deg ... це складно для conic-gradient без розривів.
    
    // Використаємо простий підхід:
    // Білий (Lec), Сірий (Prac), Чорний (Lab)
    
    let gradientParts = [];
    
    // Якщо всі 3 є:
    if(types.lec && types.prac && types.lab) {
        // Три сектора по 120 градусів
        // Lab (Bottom): 120deg - 240deg (Black)
        // Lec (Left/TopLeft): 240deg - 360deg (White)
        // Prac (Right/TopRight): 0deg - 120deg (Gray)
        gradientParts.push('#9ca3af 0deg 120deg'); // Prac
        gradientParts.push('#1f2937 120deg 240deg'); // Lab
        gradientParts.push('#ffffff 240deg 360deg'); // Lec
    } 
    else if (types.lec && types.prac) {
        // Ліво-Право (50/50)
        gradientParts.push('#9ca3af 0deg 180deg'); // Prac (Right)
        gradientParts.push('#ffffff 180deg 360deg'); // Lec (Left)
    }
    else {
        // Fallback
        gradientParts.push('#ccc 0deg 360deg');
    }

    menu.style.background = `conic-gradient(${gradientParts.join(', ')})`;
    
    // Додаємо підписи (абсолютно позиціоновані)
    menu.innerHTML = ''; // Clear old
    if(types.lec) addLabel(menu, 'Лекція', 'left');
    if(types.prac) addLabel(menu, 'Практика', 'right');
    if(types.lab) addLabel(menu, 'Лабораторна', 'bottom');
}

function addLabel(parent, text, pos) {
    const el = document.createElement('div');
    el.className = 'radial-label';
    el.innerText = text;
    if(pos === 'left') { el.style.left = '10px'; el.style.top = '50%'; }
    if(pos === 'right') { el.style.right = '10px'; el.style.top = '50%'; }
    if(pos === 'bottom') { el.style.bottom = '10px'; el.style.left = '50%'; el.style.transform = 'translateX(-50%)'; }
    parent.appendChild(el);
}

function setupTouchDrag(element, subject) {
    element.addEventListener('touchstart', startDrag, {passive: false});
    element.addEventListener('mousedown', startDrag); // Для PC

    function startDrag(e) {
        // e.preventDefault(); // Заважає скролу, якщо просто торкнулись
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        appState.dragStartPos = { x: clientX, y: clientY };
        appState.draggedSubject = subject;
        appState.activeSector = null;

        // Показуємо меню
        const menu = appState.radialMenu;
        updateRadialMenuVisuals(subject);
        
        // Якщо тільки 1 тип — меню не показуємо, зразу вибираємо тип
        const typeKeys = Object.keys(subject.types).filter(k => subject.types[k]);
        if(typeKeys.length === 1) {
            appState.activeSector = getTypeName(typeKeys[0]); // 'Лекція'
        } else {
            menu.style.display = 'block';
            menu.style.left = clientX + 'px';
            menu.style.top = clientY + 'px';
        }

        // Ghost Element
        const ghost = element.cloneNode(true);
        ghost.style.position = 'fixed';
        ghost.style.width = '150px';
        ghost.style.zIndex = 10000;
        ghost.style.opacity = 0.8;
        ghost.style.pointerEvents = 'none';
        document.body.appendChild(ghost);
        appState.ghost = ghost;

        document.addEventListener('touchmove', onMove, {passive: false});
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchend', onEnd);
        document.addEventListener('mouseup', onEnd);
    }

    function onMove(e) {
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Рухаємо Ghost
        if(appState.ghost) {
            appState.ghost.style.left = clientX + 'px';
            appState.ghost.style.top = clientY + 'px';
        }

        // Рахуємо кут для секторів
        const dx = clientX - appState.dragStartPos.x;
        const dy = clientY - appState.dragStartPos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Якщо вийшли за межі центру (15px)
        if (dist > 20 && appState.radialMenu.style.display !== 'none') {
            const angle = Math.atan2(dy, dx) * 180 / Math.PI; // -180 to 180
            
            // Визначаємо сектор
            // Left: > 135 || < -135
            // Right: > -45 && < 45
            // Bottom: > 45 && < 135
            
            let type = null;
            const t = appState.draggedSubject.types;

            if (angle > 45 && angle < 135) { // Down
                if(t.lab) type = 'Лабораторна';
            } else if (angle > -45 && angle <= 45) { // Right
                if(t.prac) type = 'Практична';
            } else { // Left (includes top range fallback)
                if(t.lec) type = 'Лекція';
            }
            
            appState.activeSector = type;

            // Візуальний фідбек на Ghost
            if (type) {
                appState.ghost.style.background = type === 'Лекція' ? 'white' : (type === 'Практична' ? 'gray' : '#333');
                appState.ghost.style.color = type === 'Лекція' ? 'black' : 'white';
                appState.ghost.innerText = `${appState.draggedSubject.name}\n(${type})`;
                // Підсвітка активної зони кола
                appState.radialMenu.style.borderColor = 'var(--highlight)';
            }
        }
    }

    function onEnd(e) {
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchend', onEnd);
        document.removeEventListener('mouseup', onEnd);
        
        // Ховаємо меню і ghost
        appState.radialMenu.style.display = 'none';
        appState.radialMenu.style.borderColor = 'transparent';
        if(appState.ghost) appState.ghost.remove();

        // Шукаємо, куди впало
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        
        const target = document.elementFromPoint(clientX, clientY);
        const subCell = target?.closest('.sub-cell');

        if (subCell && appState.activeSector) {
            handleDropLogic(subCell, appState.draggedSubject, appState.activeSector);
        }
    }
}

function getTypeName(key) {
    if(key === 'lec') return 'Лекція';
    if(key === 'prac') return 'Практична';
    if(key === 'lab') return 'Лабораторна';
    return 'Лекція';
}

function handleDropLogic(targetEl, subject, type) {
    const day = targetEl.dataset.day;
    const idx = parseInt(targetEl.dataset.idx);
    const key = targetEl.dataset.key; // main, sub1, num...

    const details = subject.details;
    let selectedDetail = details[0];

    // Якщо більше 1 варіанту — питаємо
    if (details.length > 1) {
        showRoomChoiceModal(details, (choice) => {
            applyDataToGrid(day, idx, key, subject.name, type, choice.room, choice.teacher);
        });
    } else {
        applyDataToGrid(day, idx, key, subject.name, type, selectedDetail.room, selectedDetail.teacher);
    }
}

function showRoomChoiceModal(details, callback) {
    const modal = document.getElementById('roomChoiceModal');
    const list = document.getElementById('roomChoicesList');
    list.innerHTML = '';
    
    details.forEach((d, i) => {
        const btn = document.createElement('div');
        btn.className = 'room-btn';
        btn.innerHTML = `<b>${d.teacher || 'Без викладача'}</b> <br> ${d.room || 'Без ауд.'}`;
        btn.onclick = () => {
            modal.style.display = 'none';
            callback(d);
        };
        list.appendChild(btn);
    });
    modal.style.display = 'flex';
}

function applyDataToGrid(day, idx, key, subjName, type, room, teacher) {
    const lesson = appState.gridData[day][idx];
    let target = (lesson.type === 'single') ? lesson.content : lesson.content[key];
    
    if(!target) { lesson.content[key] = {}; target = lesson.content[key]; } // init if missing

    target.subject = subjName;
    target.type = type;
    target.room = room;
    target.teacher = teacher;
    
    renderFullSchedule();
}

// === ЖЕСТИ ДЛЯ СЛОТІВ ===
function setupSlotGestures(element, day, index) {
    let startX, startY;
    element.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, {passive: true});

    element.addEventListener('touchend', e => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - startX;
        const diffY = endY - startY;

        if (Math.abs(diffX) > 50 && Math.abs(diffY) < 30) {
            if (diffX > 0) splitSlot(day, index, 'subgroups');
        } else if (Math.abs(diffY) > 50 && Math.abs(diffX) < 30) {
            if (diffY > 0) splitSlot(day, index, 'numden');
        }
    });
}

function splitSlot(day, index, type) {
    const lesson = appState.gridData[day][index];
    if(lesson.type === type) return; // вже є
    lesson.type = type;
    lesson.content = {}; 
    renderFullSchedule();
}

let editTimeTarget = null;
function openTimeModal(day, idx) {
    editTimeTarget = {day, idx};
    const val = appState.gridData[day][idx].customTime || DEFAULT_TIMES[idx] || '';
    document.getElementById('customTimeInput').value = val;
    document.getElementById('timeModal').style.display = 'flex';
}

function applyCustomTime() {
    if(editTimeTarget) {
        appState.gridData[editTimeTarget.day][editTimeTarget.idx].customTime = document.getElementById('customTimeInput').value;
    }
    document.getElementById('timeModal').style.display = 'none';
    renderFullSchedule();
}

// === FINAL SAVE ===
function saveVisualSchedule() {
    const finalSchedule = {
        group: "My Group", 
        semester: "1", 
        startDate: new Date().toISOString(),
        schedule: {}
    };

    DAYS.forEach(day => {
        finalSchedule.schedule[day] = {
            name: DAYS_UA[day],
            lessons: appState.gridData[day].map((l, idx) => {
                const base = { 
                    number: idx + 1, 
                    time: l.customTime || appState.config.times[idx] || '' 
                };

                if (l.type === 'single') {
                    if (l.content.subject) {
                        return { ...base, ...l.content, weeks: 'all', subgroups: [] };
                    }
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
    alert('Розклад збережено!');
    window.location.href = './index.html';
}
