// === КОНСТАНТИ ===
const SCHEDULE_STORAGE_KEY = 'myCustomSchedule';
const DEFAULT_TIMES = ['08:30 – 09:50', '10:05 – 11:25', '11:40 – 13:00', '13:15 – 14:35', '14:50 – 16:10', '16:25 – 17:45', '18:00 – 19:20', '19:30 – 20:50'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// === СТАН ===
let appState = {
    mode: null, // 'classic' або 'visual'
    step: 1,
    config: { weekType: 'numden', count: 5, times: [] },
    db: { subjects: [], rooms: [] }, // База предметів і аудиторій
    gridData: {}, // Структура розкладу
    currentDay: 'monday'
};

// === ІНІЦІАЛІЗАЦІЯ ===
document.addEventListener('DOMContentLoaded', () => {
    // Навігація між режимами
    document.getElementById('btnClassicEdit').onclick = () => showScreen('classicEditor');
    document.getElementById('btnVisualEdit').onclick = () => { showScreen('visualWizard'); initWizard(); };
    
    // Ініціалізація компонентів
    document.getElementById('addSubjectBtn').onclick = addSubjectToDb;
    document.getElementById('addRoomBtn').onclick = addRoomToDb;
    
    document.querySelectorAll('.day-tab').forEach(btn => {
        btn.onclick = (e) => switchDayTab(e.target.dataset.day);
    });

    document.querySelectorAll('.puz-tab').forEach(btn => {
        btn.onclick = (e) => switchPuzzleTab(e.target.dataset.type);
    });

    document.getElementById('saveTimeBtn').onclick = applyCustomTime;
    document.getElementById('finishVisualBtn').onclick = saveVisualSchedule;

    // Авто-генерація часів у Кроці 1
    renderWizardTimeSlots();
});

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById(id).style.display = 'block';
}

// === ЛОГІКА WIZARD (КРОКИ) ===
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
    }
    if (step === 3) {
        renderVisualGrid();
        renderPuzzles('subjects');
    }
}

function renderWizardTimeSlots() {
    const container = document.getElementById('wizTimeSlots');
    container.innerHTML = '';
    for(let i=0; i<8; i++) {
        container.innerHTML += `<input type="text" id="wizTime_${i+1}" value="${DEFAULT_TIMES[i] || ''}" placeholder="Час ${i+1}">`;
    }
}

// === КРОК 2: БАЗА ДАНИХ ===
function addSubjectToDb() {
    const name = document.getElementById('newSubjectName').value.trim();
    if(!name) return;
    const types = {
        lec: document.getElementById('hasLec').checked,
        prac: document.getElementById('hasPrac').checked,
        lab: document.getElementById('hasLab').checked
    };
    appState.db.subjects.push({ id: Date.now(), name, types });
    document.getElementById('newSubjectName').value = '';
    renderDbList();
}

function addRoomToDb() {
    const name = document.getElementById('newRoomName').value.trim();
    if(!name) return;
    appState.db.rooms.push({ id: Date.now(), name });
    document.getElementById('newRoomName').value = '';
    renderDbList();
}

function renderDbList() {
    const sList = document.getElementById('subjectList');
    sList.innerHTML = appState.db.subjects.map(s => 
        `<div class="db-item">${s.name} <span onclick="removeItem('subjects', ${s.id})">×</span></div>`
    ).join('');

    const rList = document.getElementById('roomList');
    rList.innerHTML = appState.db.rooms.map(r => 
        `<div class="db-item">${r.name} <span onclick="removeItem('rooms', ${r.id})">×</span></div>`
    ).join('');
}

function removeItem(type, id) {
    appState.db[type] = appState.db[type].filter(x => x.id !== id);
    renderDbList();
}

// === КРОК 3: ВІЗУАЛЬНИЙ РЕДАКТОР ===

// 1. Рендеринг Сітки
function renderVisualGrid() {
    const container = document.getElementById('visualGrid');
    container.innerHTML = '';
    
    // Якщо для цього дня ще немає даних, створюємо пусті
    if (!appState.gridData[appState.currentDay]) {
        appState.gridData[appState.currentDay] = Array(appState.config.count).fill(null).map(() => ({ type: 'single', content: {} }));
    }

    const lessons = appState.gridData[appState.currentDay];

    lessons.forEach((lesson, index) => {
        const slot = document.createElement('div');
        slot.className = `grid-slot ${lesson.content.subject ? 'filled' : ''}`;
        slot.dataset.index = index;
        
        // Header (Час + Кнопка меню, якщо треба)
        const time = appState.config.times[index] || '';
        slot.innerHTML = `<div class="grid-slot-header"><span>${index+1}. ${lesson.customTime || time}</span></div>`;

        // Content Area
        const contentDiv = document.createElement('div');
        contentDiv.className = 'slot-content';
        
        // Генерація під-слотів (залежно від структури: звичайна, підгрупи, чисельник)
        if (lesson.type === 'single') {
            contentDiv.appendChild(createSubSlot(lesson.content, 'main'));
        } else if (lesson.type === 'subgroups') {
            contentDiv.appendChild(createSubSlot(lesson.content.sub1 || {}, 'sub1', 'Група 1'));
            contentDiv.appendChild(createSubSlot(lesson.content.sub2 || {}, 'sub2', 'Група 2'));
        } else if (lesson.type === 'numden') {
            contentDiv.appendChild(createSubSlot(lesson.content.num || {}, 'num', 'Чисельник'));
            contentDiv.appendChild(createSubSlot(lesson.content.den || {}, 'den', 'Знаменник'));
        }

        slot.appendChild(contentDiv);
        
        // === ЖЕСТИ ДЛЯ СЛОТА (Спліт/Час) ===
        setupSlotGestures(slot, index);

        container.appendChild(slot);
    });
}

function createSubSlot(data, key, label) {
    const div = document.createElement('div');
    div.className = 'sub-slot';
    div.dataset.key = key; // sub1, sub2, num, den, main
    
    if (data.subject) {
        div.innerHTML = `<div><b>${data.subject}</b><br><small>${data.type || ''}</small><br><small>${data.room || ''}</small></div>`;
        div.style.backgroundColor = getSubjectColor(data.type);
    } else {
        if(label) div.innerHTML = `<span style="color:#aaa">${label}</span>`;
    }

    // Дозволяємо Drop
    div.ondragover = e => e.preventDefault();
    div.ondrop = e => handleDrop(e, div);
    
    // Для мобільних (Touch Drop)
    // Це складніше, реалізуємо через touchend на елементі, що перетягується
    
    return div;
}

function getSubjectColor(type) {
    if(type === 'Лекція') return 'var(--lec-color)';
    if(type === 'Практична') return 'var(--prac-color)';
    if(type === 'Лабораторна') return 'var(--lab-color)';
    return 'transparent';
}

// 2. Рендеринг Пазлів (Sidebar)
function renderPuzzles(mode) {
    const container = document.getElementById('puzzleContainer');
    container.innerHTML = '';
    
    const items = mode === 'subjects' ? appState.db.subjects : appState.db.rooms;
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'puzzle-piece';
        div.textContent = item.name;
        div.draggable = true;
        div.dataset.id = item.id;
        div.dataset.name = item.name;
        div.dataset.mode = mode; // subjects or rooms
        
        // Інформація про типи для жестів
        if(mode === 'subjects') {
            div.dataset.hasLec = item.types.lec;
            div.dataset.hasPrac = item.types.prac;
            div.dataset.hasLab = item.types.lab;
        }

        // Desktop Drag
        div.ondragstart = e => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: item.id, name: item.name, mode: mode,
                types: item.types // передаємо типи
            }));
            appState.draggedItem = div; // зберігаємо посилання
        };

        // Mobile Drag (Touch)
        setupTouchDrag(div);

        container.appendChild(div);
    });
    
    // Підказка
    document.getElementById('sidebarHint').innerText = mode === 'subjects' 
        ? "Тягни предмет: ⬆ Лекція | ↙ Практика | ↘ Лаба"
        : "Перетягніть аудиторію на предмет";
}

// 3. Обробка Drop (Падіння пазла)
function handleDrop(e, targetSlot) {
    e.preventDefault();
    let data;
    try {
        data = JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch(err) {
        // Якщо це Touch Drop, дані беремо з глобальної змінної
        data = appState.touchDragData;
    }

    if (!data) return;

    // Знаходимо індекс пари та ключ під-слота
    const gridSlot = targetSlot.closest('.grid-slot');
    const index = parseInt(gridSlot.dataset.index);
    const subKey = targetSlot.dataset.key; // main, sub1, num...

    const lessonObj = appState.gridData[appState.currentDay][index];
    
    // Визначаємо куди писати
    let targetObj;
    if (lessonObj.type === 'single') targetObj = lessonObj.content;
    else targetObj = lessonObj.content[subKey];

    if (!targetObj) lessonObj.content[subKey] = {}; // ініціалізація якщо пусто

    if (data.mode === 'subjects') {
        // Записуємо предмет
        // Враховуємо "Жест" (який тип було обрано під час перетягування)
        let selectedType = appState.draggedType || 'Лекція'; // За замовчуванням
        
        // Якщо немає такого типу у предмета, беремо перший доступний
        // (спрощення логіки)
        
        targetObj.subject = data.name;
        targetObj.type = selectedType;
    } else {
        // Записуємо аудиторію
        targetObj.room = data.name;
    }

    renderVisualGrid(); // Оновити вид
}

// === ЖЕСТИ (TOUCH LOGIC) ===

// A. Жести на сітці (Split / Time)
function setupSlotGestures(element, index) {
    let startX, startY, startTime;
    
    element.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
    }, {passive: true});

    element.addEventListener('touchend', e => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - startX;
        const diffY = endY - startY;
        const duration = Date.now() - startTime;

        if (duration > 150) { // Ігноруємо випадкові кліки
            // Логіка жестів
            if (Math.abs(diffX) > 50 && Math.abs(diffY) < 30) {
                // Горизонтальний свайп
                if (diffX > 0) splitSlot(index, 'subgroups'); // Вправо -> Підгрупи
                else openTimeModal(index); // Вліво -> Час
            } else if (Math.abs(diffY) > 50 && Math.abs(diffX) < 30) {
                // Вертикальний свайп
                if (diffY > 0) splitSlot(index, 'numden'); // Вниз -> Числ/Знам
            }
        }
    });
    
    // Для Desktop (Context Menu simulation)
    element.oncontextmenu = (e) => {
        e.preventDefault();
        // Можна додати просте меню, якщо треба
        if(confirm("Розділити на підгрупи?")) splitSlot(index, 'subgroups');
    };
}

function splitSlot(index, type) {
    const lesson = appState.gridData[appState.currentDay][index];
    lesson.type = type;
    lesson.content = {}; // Очищаємо контент при зміні структури
    renderVisualGrid();
}

let editingTimeIndex = null;
function openTimeModal(index) {
    editingTimeIndex = index;
    const lesson = appState.gridData[appState.currentDay][index];
    document.getElementById('customTimeInput').value = lesson.customTime || '';
    document.getElementById('timeModal').style.display = 'flex';
}

function applyCustomTime() {
    const val = document.getElementById('customTimeInput').value;
    if (editingTimeIndex !== null) {
        appState.gridData[appState.currentDay][editingTimeIndex].customTime = val;
    }
    document.getElementById('timeModal').style.display = 'none';
    renderVisualGrid();
}

// B. Жести на Пазлах (Вибір типу предмету)
function setupTouchDrag(element) {
    let startX, startY;
    
    element.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        
        // Готуємо дані для дропу
        appState.touchDragData = {
            id: element.dataset.id,
            name: element.dataset.name,
            mode: element.dataset.mode
        };
        appState.draggedItem = element;
        
        // Створюємо "привид" для візуалізації
        const ghost = element.cloneNode(true);
        ghost.id = 'dragGhost';
        ghost.style.position = 'fixed';
        ghost.style.opacity = '0.8';
        ghost.style.zIndex = '9999';
        ghost.style.pointerEvents = 'none';
        document.body.appendChild(ghost);
        appState.ghost = ghost;
        
    }, {passive: false});

    element.addEventListener('touchmove', e => {
        e.preventDefault(); // Щоб не скролило екран
        const touch = e.touches[0];
        
        // Рухаємо привид
        if(appState.ghost) {
            appState.ghost.style.left = touch.clientX + 'px';
            appState.ghost.style.top = touch.clientY + 'px';
            
            // ЛОГІКА ЗМІНИ ТИПУ ВІД НАПРЯМКУ
            // Вектор від початку
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            
            // Поріг чутливості
            if (Math.abs(dy) > 30) {
                if (dy < 0) { // ВГОРУ -> Лекція
                    appState.draggedType = 'Лекція';
                    appState.ghost.style.backgroundColor = 'var(--lec-color)';
                    appState.ghost.style.borderColor = 'var(--lec-border)';
                } else { // ВНИЗ
                    if (dx < 0) { // ВНИЗ-ВЛІВО -> Практика
                        appState.draggedType = 'Практична';
                        appState.ghost.style.backgroundColor = 'var(--prac-color)';
                        appState.ghost.style.borderColor = 'var(--prac-border)';
                    } else { // ВНИЗ-ВПРАВО -> Лабораторна
                        appState.draggedType = 'Лабораторна';
                        appState.ghost.style.backgroundColor = 'var(--lab-color)';
                        appState.ghost.style.borderColor = 'var(--lab-border)';
                    }
                }
                appState.ghost.innerText = `${appState.touchDragData.name}\n(${appState.draggedType})`;
            }
        }
    }, {passive: false});

    element.addEventListener('touchend', e => {
        // Видаляємо привид
        if(appState.ghost) appState.ghost.remove();
        
        // Визначаємо елемент під пальцем
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Шукаємо, чи це sub-slot
        const slot = target.closest('.sub-slot');
        if (slot) {
            handleDrop({ preventDefault: () => {} }, slot);
        }
        
        appState.touchDragData = null;
        appState.draggedType = null;
    });
}

// === ЗБЕРЕЖЕННЯ ===
function switchDayTab(day) {
    document.querySelectorAll('.day-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.day-tab[data-day="${day}"]`).classList.add('active');
    appState.currentDay = day;
    renderVisualGrid();
}

function switchPuzzleTab(type) {
    document.querySelectorAll('.puz-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.puz-tab[data-type="${type}"]`).classList.add('active');
    renderPuzzles(type);
}

function saveVisualSchedule() {
    // Конвертація внутрішнього формату gridData у формат сайту (schedule.json)
    const finalSchedule = {
        group: "My Group", 
        semester: "1", 
        startDate: new Date().toISOString(), // Треба додати вибір дати, якщо критично
        schedule: {}
    };

    // Проходимо по всіх днях
    DAYS.forEach(day => {
        const dayLessons = appState.gridData[day];
        if (!dayLessons) return;

        finalSchedule.schedule[day] = {
            name: ALL_DAYS[day],
            lessons: dayLessons.map((l, idx) => {
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
                
                // Конвертація sub/numden в формат schedule.json
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
