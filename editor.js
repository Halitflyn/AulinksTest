// Константа для ключа в localStorage
const SCHEDULE_STORAGE_KEY = 'myCustomSchedule';

// Елементи керування (оголошуємо тут, щоб були доступні глобально всередині файлу)
let saveBtn, loadStorageBtn, loadFileBtn, loadFileInput, exportJsonBtn, scheduleFormContainer, statusEl, themeToggle,
    lessonCountInput, defaultTimesContainer, daySelectionContainer; // <-- ДОДАНО НОВІ

// (НОВІ) Глобальні константи для налаштувань
const ALL_DAYS = {
    monday: 'Понеділок',
    tuesday: 'Вівторок',
    wednesday: 'Середа',
    thursday: 'Четвер',
    friday: 'П’ятниця',
    saturday: 'Субота',
    sunday: 'Неділя'
};
// (НОВІ) Часи за замовчуванням (за твоїм запитом)
const DEFAULT_TIMES = [
    '08:30 – 09:50', // 1
    '10:05 – 11:25', // 2
    '11:40 – 13:00', // 3
    '13:15 – 14:35', // 4
    '14:50 – 16:10', // 5
    '16:25 – 17:45', // 6
    '18:00 – 19:20', // 7
    '19:30 – 20:50'  // 8
];

// (ВИДАЛЕНО) Старі масиви days та dayNames

const lessonTypes = {
    'Лекція': 'lecture',
    'Практична': 'practical',
    'Лабораторна': 'lab',
    'Змішана': 'mixed',
    '': ''
};
const lessonTypesReverse = {
    'lecture': 'Лекція',
    'practical': 'Практична',
    'lab': 'Лабораторна',
    'mixed': 'Змішана',
    'empty': '',
    '': ''
};

// --- Генерація HTML для однієї пари (ОНОВЛЕНО) ---
function generatePairHTML(day, pairNum, defaultTime) {
    const baseId = `${day}-${pairNum}`;

    const typeOptions = `
    <option value="">Оберіть</option>
    <option value="Лекція">Лекція</option>
    <option value="Практична">Практична</option>
    <option value="Лабораторна">Лабораторна</option>
    <option value="Змішана">Змішана</option>
  `;

    let html = `
    <div class="pair" data-day="${day}" data-pair="${pairNum}">
      <h4>
        <span>${pairNum} пара <span class="pair-time-default">${defaultTime}</span></span>
        <input type="text" id="${baseId}-time-custom" class="pair-time-custom-input" placeholder="00:00 – 00:00">
        <label class="pair-time-custom-toggle">
            <input type="checkbox" id="${baseId}-time-toggle"> інший час
        </label>
      </h4>
      <div class="option-group main-mode">
        <label><input type="radio" name="mode-${baseId}" value="none"> Звичайна</label>
        <label><input type="radio" name="mode-${baseId}" value="subgroups"> Підгрупи</label>
        <label><input type="radio" name="mode-${baseId}" value="numden"> Числ/Знам</label>
        <label><input type="radio" name="mode-${baseId}" value="empty" checked> Немає</label>
      </div>

      <div class="details-container">
        <div class="input-group main-details mode-none details-block">
          <div><label>Предмет:</label><input type="text" id="${baseId}-subject"></div>
          <div><label>Тип:</label><select id="${baseId}-type">${typeOptions}</select></div>
          <div><label>Викладач:</label><input type="text" id="${baseId}-teacher"></div>
          <div><label>Аудиторія:</label><input type="text" id="${baseId}-room"></div>
          <div><label>Посилання:</label><input type="text" id="${baseId}-link" placeholder="https://meet.google.com/..."></div>
        </div>

        <div class="subgroup-inputs mode-subgroups details-block">
          ${[1, 2].map(subNum => `
            <div class="subgroup">
              <h5>Підгрупа ${subNum}:</h5>
              <div class="option-group sub-mode">
                <label><input type="radio" name="mode-${baseId}-sub${subNum}" value="none"> Завжди</label>
                <label><input type="radio" name="mode-${baseId}-sub${subNum}" value="numden"> Числ/Знам</label>
                <label><input type="radio" name="mode-${baseId}-sub${subNum}" value="empty" checked> Немає</label>
              </div>

              <div class="details-container">
                  <div class="input-group sub-details mode-none details-block">
                    <div><label>Предмет:</label><input type="text" id="${baseId}-sub${subNum}-subject"></div>
                    <div><label>Тип:</label><select id="${baseId}-sub${subNum}-type">${typeOptions}</select></div>
                    <div><label>Викладач:</label><input type="text" id="${baseId}-sub${subNum}-teacher"></div>
                    <div><label>Аудиторія:</label><input type="text" id="${baseId}-sub${subNum}-room"></div>
                    <div><label>Посилання:</label><input type="text" id="${baseId}-sub${subNum}-link" placeholder="https://meet.google.com/..."></div>
                  </div>

                  <div class="num-den-inputs sub-numden mode-numden details-block">
                    ${['num', 'den'].map(weekType => `
                      <div class="week-section">
                        <h6>${weekType === 'num' ? 'Чисельник' : 'Знаменник'}:</h6>
                        <div class="option-group sub-week-mode">
                           <label><input type="radio" name="mode-${baseId}-sub${subNum}-${weekType}" value="none"> Є пара</label>
                           <label><input type="radio" name="mode-${baseId}-sub${subNum}-${weekType}" value="empty" checked> Немає</label>
                        </div>
                        <div class="details-container">
                            <div class="input-group sub-week-details mode-none details-block">
                              <div><label>Предмет:</label><input type="text" id="${baseId}-sub${subNum}-${weekType}-subject"></div>
                              <div><label>Тип:</label><select id="${baseId}-sub${subNum}-${weekType}-type">${typeOptions}</select></div>
                              <div><label>Викладач:</label><input type="text" id="${baseId}-sub${subNum}-${weekType}-teacher"></div>
                              <div><label>Аудиторія:</label><input type="text" id="${baseId}-sub${subNum}-${weekType}-room"></div>
                              <div><label>Посилання:</label><input type="text" id="${baseId}-sub${subNum}-${weekType}-link" placeholder="https://meet.google.com/..."></div>
                            </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="num-den-inputs mode-numden details-block">
           ${['num', 'den'].map(weekType => `
             <div class="week-section">
               <h5>${weekType === 'num' ? 'Чисельник' : 'Знаменник'}:</h5>
               <div class="option-group main-week-mode">
                  <label><input type="radio" name="mode-${baseId}-${weekType}" value="none"> Є пара</label>
                  <label><input type="radio" name="mode-${baseId}-${weekType}" value="empty" checked> Немає</label>
               </div>
               <div class="details-container">
                   <div class="input-group main-week-details mode-none details-block">
                     <div><label>Предмет:</label><input type="text" id="${baseId}-${weekType}-subject"></div>
                     <div><label>Тип:</label><select id="${baseId}-${weekType}-type">${typeOptions}</select></div>
                     <div><label>Викладач:</label><input type="text" id="${baseId}-${weekType}-teacher"></div>
                     <div><label>Аудиторія:</label><input type="text" id="${baseId}-${weekType}-room"></div>
                     <div><label>Посилання:</label><input type="text" id="${baseId}-${weekType}-link" placeholder="https://meet.google.com/..."></div>
                   </div>
               </div>
             </div>
            `).join('')}
        </div>
      </div>
    </div>`;
    return html;
}

// --- Генерація повної форми (ОНОВЛЕНО) ---
function generateForm() {
    let formHTML = '';
    // Читаємо кількість пар з нового поля
    const lessonCount = parseInt(lessonCountInput?.value, 10) || 8;

    // (НОВЕ) Отримуємо обрані дні
    const selectedDays = getSelectedDays();

    selectedDays.forEach(dayKey => {
        const dayName = ALL_DAYS[dayKey] || dayKey;
        formHTML += `
      <div class="section day" data-day="${dayKey}">
        <h2>${dayName}</h2>
        <div class="pairs">`;

        // Цикл тепер динамічний
        for (let pairNum = 1; pairNum <= lessonCount; pairNum++) {
            // Отримуємо час за замовчуванням з полів
            const defaultTimeInput = document.getElementById(`default-time-${pairNum}`);
            const defaultTime = defaultTimeInput?.value || '00:00 – 00:00';
            // Передаємо час у функцію
            formHTML += generatePairHTML(dayKey, pairNum, defaultTime);
        }
        formHTML += '</div></div>';
    });

    if (scheduleFormContainer) {
        scheduleFormContainer.innerHTML = formHTML;
        setupAllPairRadios();
        setupTimeToggles();
    } else {
        console.error("Елемент #scheduleForm не знайдено!");
    }
}

// === Логіка показу/приховування для Радіокнопок ===
function setupAllPairRadios() {
    if (!scheduleFormContainer) return; // Додав перевірку
    scheduleFormContainer.querySelectorAll('.pair, .subgroup, .week-section').forEach(container => {
        const radioGroup = container.querySelector(':scope > .option-group');
        if (!radioGroup) return;
        const radios = radioGroup.querySelectorAll('input[type="radio"]');
        if (radios.length === 0) return;
        const detailsContainer = container.querySelector(':scope > .details-container');
        if (!detailsContainer) return;

        const updateVisibility = () => {
            const selectedRadio = radioGroup.querySelector('input[type="radio"]:checked');
            if (!selectedRadio) return;
            const mode = selectedRadio.value;

            detailsContainer.querySelectorAll(':scope > .details-block').forEach(el => el.classList.remove('active'));

            if (mode !== 'empty') {
                const targetBlock = detailsContainer.querySelector(`:scope > .mode-${mode}`);
                if (targetBlock) targetBlock.classList.add('active');
            }
        };

        radios.forEach(radio => radio.addEventListener('change', updateVisibility));
        updateVisibility();
    });
}

// === Логіка для Чекбоксів Часу ===
function setupTimeToggles() {
    if (!scheduleFormContainer) return; // Додав перевірку
    scheduleFormContainer.querySelectorAll('.pair-time-custom-toggle input[type="checkbox"]').forEach(checkbox => {
        const pairDiv = checkbox.closest('.pair');
        const defaultTimeSpan = pairDiv?.querySelector('.pair-time-default');
        const customTimeInput = pairDiv?.querySelector('.pair-time-custom-input');

        if (!pairDiv || !defaultTimeSpan || !customTimeInput) return;

        const update = () => {
            defaultTimeSpan.style.display = checkbox.checked ? 'none' : 'inline';
            customTimeInput.style.display = checkbox.checked ? 'inline-block' : 'none';
        };

        checkbox.addEventListener('change', update);
        update();
    });
}

// --- Обчислення startDate (ПРАВИЛЬНА ВЕРСІЯ) ---
function calculateStartDate() {
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    // Знаходимо понеділок поточного тижня
    const diffToMonday = todayDayOfWeek === 0 ? -6 : 1 - todayDayOfWeek;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    // Читаємо, що вибрав користувач
    const todayIsRadio = document.querySelector('input[name="todayWeekType"]:checked');
    const todayIs = todayIsRadio ? todayIsRadio.value : 'num';

    let startDate = new Date(currentMonday);

    // ЛОГІКА:
    // Якщо ми кажемо, що сьогодні "Знаменник" ('den'),
    // то ми відкручуємо дату початку на тиждень назад.
    // Тоді script.js побачить різницю в тижнях і скаже: "Ага, зараз Знаменник".
    if (todayIs === 'den') {
        startDate.setDate(startDate.getDate() - 7);
    }

    const y = startDate.getFullYear();
    const m = String(startDate.getMonth() + 1).padStart(2, '0');
    const d = String(startDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Функція getISOWeek
function getISOWeek(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// --- (НОВА) Нова функція для генерації полів часу ---
function updateDefaultTimeInputs() {
    if (!lessonCountInput || !defaultTimesContainer) return;

    const count = parseInt(lessonCountInput.value, 10) || 0;
    const currentTimes = [];

    // 1. Зберігаємо поточні значення, щоб не стирати їх
    const maxInputsToRead = Math.max(count, DEFAULT_TIMES.length, 10);
    for (let i = 1; i <= maxInputsToRead; i++) {
        const input = document.getElementById(`default-time-${i}`);
        if (input) currentTimes[i - 1] = input.value;
    }

    defaultTimesContainer.innerHTML = ''; // Очищуємо контейнер

    // 2. Генеруємо нові поля вводу
    for (let i = 1; i <= count; i++) {
        // Беремо збережене значення, АБО дефолтне, АБО пустий рядок
        const savedValue = currentTimes[i - 1] || DEFAULT_TIMES[i - 1] || '';
        defaultTimesContainer.innerHTML += `
            <div>
                <label for="default-time-${i}">${i} пара:</label>
                <input type="text" id="default-time-${i}" placeholder="00:00 – 00:00" value="${savedValue}">
            </div>
        `;
    }
}

// --- (НОВІ) Функції для генерації та отримання днів ---
function generateDaySelectionCheckboxes() {
    if (!daySelectionContainer) return;
    daySelectionContainer.innerHTML = Object.keys(ALL_DAYS).map(dayKey => {
        const dayName = ALL_DAYS[dayKey];
        // За замовчуванням Пн-Пт увімкнені
        const isChecked = (dayKey !== 'saturday' && dayKey !== 'sunday');
        return `
            <label>
                <input type="checkbox" class="day-checkbox" data-day-key="${dayKey}" ${isChecked ? 'checked' : ''}>
                ${dayName}
            </label>
        `;
    }).join('');

    // Додаємо слухачі, щоб форма перегенерувалась при зміні
    daySelectionContainer.querySelectorAll('.day-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', generateForm);
    });
}

function getSelectedDays() {
    if (!daySelectionContainer) {
        // Fallback, якщо щось пішло не так
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    }
    const days = [];
    daySelectionContainer.querySelectorAll('.day-checkbox:checked').forEach(checkbox => {
        days.push(checkbox.dataset.dayKey);
    });
    return days;
}


// --- ЗБИРАННЯ ДАНИХ З ФОРМИ (ОНОВЛЕНО) ---
function buildScheduleObject() {
    const schedule = {};
    const lessonCount = parseInt(lessonCountInput?.value, 10) || 8;

    // 1. Зберігаємо час за замовчуванням
    schedule.defaultTimes = [];
    for (let i = 1; i <= lessonCount; i++) {
        const timeInput = document.getElementById(`default-time-${i}`);
        schedule.defaultTimes.push(timeInput?.value || '00:00 – 00:00');
    }

    // 2. Зберігаємо загальну інформацію
    schedule.group = document.getElementById('group')?.value || 'Моя група';
    schedule.semester = document.getElementById('semester')?.value || 'Поточний семестр';
    schedule.startDate = calculateStartDate();
    schedule.schedule = {}; // Створюємо пустий об'єкт розкладу

    // 3. Збираємо дані по днях (ТІЛЬКИ для обраних)
    const selectedDays = getSelectedDays();

    selectedDays.forEach(dayKey => {
        schedule.schedule[dayKey] = { name: ALL_DAYS[dayKey], lessons: [] };

        // Використовуємо динамічний цикл
        for (let pairNum = 1; pairNum <= lessonCount; pairNum++) {
            const baseId = `${dayKey}-${pairNum}`;
            const pairDiv = scheduleFormContainer.querySelector(`.pair[data-day="${dayKey}"][data-pair="${pairNum}"]`);
            if (!pairDiv) continue;
            const modeRadio = pairDiv.querySelector(`input[name="mode-${baseId}"]:checked`);
            if (!modeRadio) continue;
            const mode = modeRadio.value;

            // Отримуємо час (за замовчуванням або кастомний)
            const timeToggle = document.getElementById(`${baseId}-time-toggle`);
            let timeValue = schedule.defaultTimes[pairNum - 1] || '00:00 - 00:00'; // Беремо з масиву
            if (timeToggle?.checked) {
                const customTimeInput = document.getElementById(`${baseId}-time-custom`);
                if (customTimeInput?.value.trim()) timeValue = customTimeInput.value.trim();
            }

            const lesson = {
                number: pairNum, time: timeValue, subject: "", type: "",
                teacher: "", room: "", link: "", weeks: "all", subgroups: []
            };

            if (mode === 'empty') {
                lesson.type = 'empty';
            } else if (mode === 'none') {
                lesson.subject = document.getElementById(`${baseId}-subject`)?.value || '';
                lesson.type = lessonTypes[document.getElementById(`${baseId}-type`)?.value] || '';
                lesson.teacher = document.getElementById(`${baseId}-teacher`)?.value || '';
                lesson.room = document.getElementById(`${baseId}-room`)?.value || '';
                lesson.link = document.getElementById(`${baseId}-link`)?.value || '';
                if (!lesson.subject) lesson.type = 'empty';
            } else if (mode === 'numden') {
                lesson.type = 'mixed';
                ['num', 'den'].forEach(weekType => {
                    const weekModeRadio = pairDiv.querySelector(`input[name="mode-${baseId}-${weekType}"]:checked`);
                    if (weekModeRadio?.value === 'none') {
                        const weekSubject = document.getElementById(`${baseId}-${weekType}-subject`)?.value || '';
                        if (weekSubject) {
                            lesson.subgroups.push({
                                group: "all", weeks: weekType, subject: weekSubject,
                                type: lessonTypes[document.getElementById(`${baseId}-${weekType}-type`)?.value] || '',
                                teacher: document.getElementById(`${baseId}-${weekType}-teacher`)?.value || '',
                                room: document.getElementById(`${baseId}-${weekType}-room`)?.value || '',
                                link: document.getElementById(`${baseId}-${weekType}-link`)?.value || ''
                            });
                        }
                    }
                });
                if (lesson.subgroups.length === 0) lesson.type = 'empty';
            } else if (mode === 'subgroups') {
                lesson.type = 'mixed';
                [1, 2].forEach(subNum => {
                    const subModeRadio = pairDiv.querySelector(`input[name="mode-${baseId}-sub${subNum}"]:checked`);
                    if (!subModeRadio) return;
                    const subMode = subModeRadio.value;
                    if (subMode === 'none') {
                        const subSubject = document.getElementById(`${baseId}-sub${subNum}-subject`)?.value || '';
                        if (subSubject) {
                            lesson.subgroups.push({
                                group: `sub${subNum}`, weeks: "all", subject: subSubject,
                                type: lessonTypes[document.getElementById(`${baseId}-sub${subNum}-type`)?.value] || '',
                                teacher: document.getElementById(`${baseId}-sub${subNum}-teacher`)?.value || '',
                                room: document.getElementById(`${baseId}-sub${subNum}-room`)?.value || '',
                                link: document.getElementById(`${baseId}-sub${subNum}-link`)?.value || ''
                            });
                        }
                    } else if (subMode === 'numden') {
                        ['num', 'den'].forEach(weekType => {
                            const weekModeRadio = pairDiv.querySelector(`input[name="mode-${baseId}-sub${subNum}-${weekType}"]:checked`);
                            if (weekModeRadio?.value === 'none') {
                                const weekSubject = document.getElementById(`${baseId}-sub${subNum}-${weekType}-subject`)?.value || '';
                                if (weekSubject) {
                                    lesson.subgroups.push({
                                        group: `sub${subNum}`, weeks: weekType, subject: weekSubject,
                                        type: lessonTypes[document.getElementById(`${baseId}-sub${subNum}-${weekType}-type`)?.value] || '',
                                        teacher: document.getElementById(`${baseId}-sub${subNum}-${weekType}-teacher`)?.value || '',
                                        room: document.getElementById(`${baseId}-sub${subNum}-${weekType}-room`)?.value || '',
                                        link: document.getElementById(`${baseId}-sub${subNum}-${weekType}-link`)?.value || ''
                                    });
                                }
                            }
                        });
                    }
                });
                if (lesson.subgroups.length === 0) lesson.type = 'empty';
            }

            if (!lesson.subject && lesson.subgroups.length === 0) lesson.type = 'empty';
            if (lesson.type === 'empty') {
                lesson.subject = ""; lesson.teacher = ""; lesson.room = ""; lesson.link = "";
                lesson.weeks = "all"; lesson.subgroups = [];
            }

            schedule.schedule[dayKey].lessons.push(lesson);
        }
    });

    // 4. (НОВЕ) Додаємо пусті об'єкти для днів, які НЕ обрані
    // Це потрібно, щоб головний сайт (script.js) знав, що ці дні існують, але порожні
    Object.keys(ALL_DAYS).forEach(dayKey => {
        if (!schedule.schedule[dayKey]) {
            schedule.schedule[dayKey] = { name: ALL_DAYS[dayKey], lessons: [] };
        }
    });

    return schedule;
}


// --- ЗАПОВНЕННЯ ФОРМИ З JSON (ОНОВЛЕНО) ---
function populateForms(schedule) {
    const groupEl = document.getElementById('group'); if (groupEl) groupEl.value = schedule.group || '';
    const semesterEl = document.getElementById('semester'); if (semesterEl) semesterEl.value = schedule.semester || '';

    // 1. Встановлюємо кількість пар та час за замовчуванням
    let lessonCount = DEFAULT_TIMES.length; // За замовчуванням
    if (schedule.defaultTimes && schedule.defaultTimes.length > 0) {
        lessonCount = schedule.defaultTimes.length;
    } else if (schedule.schedule?.monday?.lessons?.length > 0) {
        // Fallback для старих JSON
        lessonCount = schedule.schedule.monday.lessons.length;
    }

    if (lessonCountInput) lessonCountInput.value = lessonCount;

    // 2. Оновлюємо та заповнюємо поля часу
    updateDefaultTimeInputs();
    if (schedule.defaultTimes) {
        for (let i = 0; i < lessonCount; i++) {
            const timeInput = document.getElementById(`default-time-${i + 1}`);
            if (timeInput) timeInput.value = schedule.defaultTimes[i] || '';
        }
    } else {
        // Fallback для старих JSON: витягуємо час
        for (let i = 0; i < lessonCount; i++) {
            const timeInput = document.getElementById(`default-time-${i + 1}`);
            if (timeInput && schedule.schedule?.monday?.lessons?.[i]) {
                timeInput.value = schedule.schedule.monday.lessons[i].time || '';
            }
        }
    }

    // 3. (НОВЕ) Встановлюємо галочки днів
    const savedDays = Object.keys(schedule.schedule).filter(dayKey =>
        schedule.schedule[dayKey] && schedule.schedule[dayKey].lessons.length > 0
    );

    if (daySelectionContainer) {
        daySelectionContainer.querySelectorAll('.day-checkbox').forEach(checkbox => {
            const dayKey = checkbox.dataset.dayKey;
            // Якщо дні збережені, ставимо галочки за збереженим
            if (savedDays.length > 0) {
                checkbox.checked = savedDays.includes(dayKey);
            }
            // Інакше, залишаємо Пн-Пт за замовчуванням (вже зроблено в generateDaySelectionCheckboxes)
        });
    }

    // 4. Генеруємо структуру форми на основі нової кількості пар І днів
    generateForm();

    // 5. Заповнюємо згенеровану форму даними
    const daysToPopulate = getSelectedDays(); // Отримуємо дні, які *зараз* видимі

    daysToPopulate.forEach(dayKey => {
        const dayData = schedule.schedule[dayKey];
        if (!dayData || !Array.isArray(dayData.lessons)) return;

        // Використовуємо динамічний цикл
        for (let pairNum = 1; pairNum <= lessonCount; pairNum++) {
            const lesson = dayData.lessons.find(l => l.number === pairNum);
            const baseId = `${dayKey}-${pairNum}`;
            const pairDiv = scheduleFormContainer.querySelector(`.pair[data-day="${dayKey}"][data-pair="${pairNum}"]`);
            if (!pairDiv) continue;

            pairDiv.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = (radio.value === 'empty'));
            pairDiv.querySelectorAll('input[type="text"], select').forEach(input => {
                if (input.tagName === 'SELECT') input.value = ""; else input.value = "";
            });

            if (!lesson) continue; // Якщо даних для цієї пари немає, пропускаємо

            // Обробка часу (кастомний чи ні)
            const timeToggle = document.getElementById(`${baseId}-time-toggle`);
            const defaultTimeInput = document.getElementById(`default-time-${pairNum}`);
            const defaultTime = defaultTimeInput?.value || '';

            const customTimeInput = document.getElementById(`${baseId}-time-custom`);

            if (timeToggle && customTimeInput) {
                if (lesson.time && lesson.time !== defaultTime) {
                    timeToggle.checked = true;
                    customTimeInput.value = lesson.time;
                } else {
                    timeToggle.checked = false;
                    customTimeInput.value = '';
                }
            }

            // Визначаємо головний режим
            let mainMode = 'empty';
            if (lesson.type !== 'empty') {
                const isMainNumDen = lesson.subgroups.length > 0 && lesson.subgroups.every(sg => sg.group === 'all');
                const isSubgroups = lesson.subgroups.length > 0 && lesson.subgroups.some(sg => sg.group === 'sub1' || sg.group === 'sub2');
                if (isSubgroups) mainMode = 'subgroups';
                else if (isMainNumDen) mainMode = 'numden';
                else if (lesson.subject) mainMode = 'none';
            }

            const mainRadio = pairDiv.querySelector(`input[name="mode-${baseId}"][value="${mainMode}"]`);
            if (mainRadio) mainRadio.checked = true;

            // Заповнюємо деталі (включаючи посилання)
            if (mainMode === 'none') {
                const subjEl = document.getElementById(`${baseId}-subject`); if (subjEl) subjEl.value = lesson.subject || '';
                const typeEl = document.getElementById(`${baseId}-type`); if (typeEl) typeEl.value = lessonTypesReverse[lesson.type] || '';
                const teachEl = document.getElementById(`${baseId}-teacher`); if (teachEl) teachEl.value = lesson.teacher || '';
                const roomEl = document.getElementById(`${baseId}-room`); if (roomEl) roomEl.value = lesson.room || '';
                const linkEl = document.getElementById(`${baseId}-link`); if (linkEl) linkEl.value = lesson.link || '';
            } else if (mainMode === 'numden') {
                lesson.subgroups.forEach(sg => {
                    const weekType = sg.weeks;
                    const weekRadio = pairDiv.querySelector(`input[name="mode-${baseId}-${weekType}"][value="none"]`);
                    if (weekRadio) weekRadio.checked = true;
                    const subjEl = document.getElementById(`${baseId}-${weekType}-subject`); if (subjEl) subjEl.value = sg.subject || '';
                    const typeEl = document.getElementById(`${baseId}-${weekType}-type`); if (typeEl) typeEl.value = lessonTypesReverse[sg.type] || '';
                    const teachEl = document.getElementById(`${baseId}-${weekType}-teacher`); if (teachEl) teachEl.value = sg.teacher || '';
                    const roomEl = document.getElementById(`${baseId}-${weekType}-room`); if (roomEl) roomEl.value = sg.room || '';
                    const linkEl = document.getElementById(`${baseId}-${weekType}-link`); if (linkEl) linkEl.value = sg.link || '';
                });
                ['num', 'den'].forEach(wt => {
                    if (!lesson.subgroups.some(sg => sg.weeks === wt)) {
                        const emptyRadio = pairDiv.querySelector(`input[name="mode-${baseId}-${wt}"][value="empty"]`);
                        if (emptyRadio) emptyRadio.checked = true;
                    }
                });
            } else if (mainMode === 'subgroups') {
                [1, 2].forEach(subNum => {
                    const subGroupData = lesson.subgroups.filter(sg => sg.group === `sub${subNum}`);
                    let subMode = 'empty';
                    if (subGroupData.length > 0) {
                        const alwaysData = subGroupData.find(sg => sg.weeks === 'all');
                        const numData = subGroupData.find(sg => sg.weeks === 'num');
                        const denData = subGroupData.find(sg => sg.weeks === 'den');
                        if (alwaysData) {
                            subMode = 'none';
                            const subjEl = document.getElementById(`${baseId}-sub${subNum}-subject`); if (subjEl) subjEl.value = alwaysData.subject || '';
                            const typeEl = document.getElementById(`${baseId}-sub${subNum}-type`); if (typeEl) typeEl.value = lessonTypesReverse[alwaysData.type] || '';
                            const teachEl = document.getElementById(`${baseId}-sub${subNum}-teacher`); if (teachEl) teachEl.value = alwaysData.teacher || '';
                            const roomEl = document.getElementById(`${baseId}-sub${subNum}-room`); if (roomEl) roomEl.value = alwaysData.room || '';
                            const linkEl = document.getElementById(`${baseId}-sub${subNum}-link`); if (linkEl) linkEl.value = alwaysData.link || '';
                        } else if (numData || denData) {
                            subMode = 'numden';
                            if (numData) {
                                const weekRadio = pairDiv.querySelector(`input[name="mode-${baseId}-sub${subNum}-num"][value="none"]`); if (weekRadio) weekRadio.checked = true;
                                const subjEl = document.getElementById(`${baseId}-sub${subNum}-num-subject`); if (subjEl) subjEl.value = numData.subject || '';
                                const typeEl = document.getElementById(`${baseId}-sub${subNum}-num-type`); if (typeEl) typeEl.value = lessonTypesReverse[numData.type] || '';
                                const teachEl = document.getElementById(`${baseId}-sub${subNum}-num-teacher`); if (teachEl) teachEl.value = numData.teacher || '';
                                const roomEl = document.getElementById(`${baseId}-sub${subNum}-num-room`); if (roomEl) roomEl.value = numData.room || '';
                                const linkEl = document.getElementById(`${baseId}-sub${subNum}-num-link`); if (linkEl) linkEl.value = numData.link || '';
                            } else {
                                const emptyRadio = pairDiv.querySelector(`input[name="mode-${baseId}-sub${subNum}-num"][value="empty"]`); if (emptyRadio) emptyRadio.checked = true;
                            }
                            if (denData) {
                                const weekRadio = pairDiv.querySelector(`input[name="mode-${baseId}-sub${subNum}-den"][value="none"]`); if (weekRadio) weekRadio.checked = true;
                                const subjEl = document.getElementById(`${baseId}-sub${subNum}-den-subject`); if (subjEl) subjEl.value = denData.subject || '';
                                const typeEl = document.getElementById(`${baseId}-sub${subNum}-den-type`); if (typeEl) typeEl.value = lessonTypesReverse[denData.type] || '';
                                const teachEl = document.getElementById(`${baseId}-sub${subNum}-den-teacher`); if (teachEl) teachEl.value = denData.teacher || '';
                                const roomEl = document.getElementById(`${baseId}-sub${subNum}-den-room`); if (roomEl) roomEl.value = denData.room || '';
                                const linkEl = document.getElementById(`${baseId}-sub${subNum}-den-link`); if (linkEl) linkEl.value = denData.link || '';
                            } else {
                                const emptyRadio = pairDiv.querySelector(`input[name="mode-${baseId}-sub${subNum}-den"][value="empty"]`); if (emptyRadio) emptyRadio.checked = true;
                            }
                        }
                    }
                    const subRadio = pairDiv.querySelector(`input[name="mode-${baseId}-sub${subNum}"][value="${subMode}"]`);
                    if (subRadio) subRadio.checked = true;
                });
            }
        }
    });

    // 6. Оновлюємо слухачі радіокнопок
    setupAllPairRadios();
    setupTimeToggles();
}


// --- ІНІЦІАЛІЗАЦІЯ (ОНОВЛЕНО) ---
document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізуємо змінні елементів
    saveBtn = document.getElementById('saveBtn');
    loadStorageBtn = document.getElementById('loadStorageBtn');
    loadFileBtn = document.getElementById('loadFileBtn');
    loadFileInput = document.getElementById('loadFileInput');
    exportJsonBtn = document.getElementById('exportJsonBtn');
    scheduleFormContainer = document.getElementById('scheduleForm');
    statusEl = document.getElementById('status');
    themeToggle = document.getElementById('themeToggle');

    // --- НОВІ ЕЛЕМЕНТИ ---
    lessonCountInput = document.getElementById('lessonCount');
    defaultTimesContainer = document.getElementById('defaultTimesContainer');
    daySelectionContainer = document.getElementById('daySelectionContainer'); // (НОВЕ)

    // === Логіка для кнопки перемикання теми ===
    if (themeToggle) {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            themeToggle.textContent = '🌙';
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            if (document.body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                themeToggle.textContent = '☀️';
            } else {
                localStorage.removeItem('theme');
                themeToggle.textContent = '🌙';
            }
        });
    }

    // --- НОВІ СЛУХАЧІ ---
    // Слухач для зміни кількості пар
    if (lessonCountInput) {
        lessonCountInput.addEventListener('change', () => {
            updateDefaultTimeInputs(); // Оновлюємо поля часу
            generateForm(); // Оновлюємо всю форму
        });
    }

    // 1. (НОВЕ) Генеруємо чекбокси днів
    generateDaySelectionCheckboxes();
    // 2. Генеруємо поля часу за замовчуванням (для 8 пар)
    updateDefaultTimeInputs();
    // 3. Генеруємо форму на основі цих 8 пар і Пн-Пт
    generateForm();
    // === Кінець логіки теми ===

    saveBtn?.addEventListener('click', () => {
        try {
            const schedule = buildScheduleObject();
            const jsonString = JSON.stringify(schedule, null, 2);
            localStorage.setItem(SCHEDULE_STORAGE_KEY, jsonString);
            if (statusEl) {
                statusEl.textContent = '✅ Розклад збережено! Повертаємося на головну...';
                statusEl.className = 'status success active';
            }
            setTimeout(() => { window.location.href = './index.html'; }, 1500);
        } catch (error) {
            console.error("Помилка при збереженні:", error);
            if (statusEl) {
                statusEl.textContent = `❌ Помилка: ${error.message || 'Невідома помилка'}`;
                statusEl.className = 'status error active';
            }
        }
    });

    loadStorageBtn?.addEventListener('click', () => {
        try {
            const jsonString = localStorage.getItem(SCHEDULE_STORAGE_KEY);
            if (!jsonString) {
                fetch('./schedule.json')
                    .then(response => {
                        if (!response.ok) throw new Error('Дефолтний schedule.json не знайдено');
                        return response.json();
                    })
                    .then(defaultSchedule => {
                        populateForms(defaultSchedule); // Ця функція тепер все перебудує
                        if (statusEl) {
                            statusEl.textContent = 'ℹ️ Завантажено розклад за замовчуванням (збереженого не знайдено).';
                            statusEl.className = 'status info active';
                        }
                    })
                    .catch(fetchError => {
                        console.error("Помилка завантаження дефолтного розкладу:", fetchError);
                        if (statusEl) {
                            statusEl.textContent = 'ℹ️ Збереженого розкладу не знайдено. Заповніть поля.';
                            statusEl.className = 'status info active';
                        }
                        // Навіть якщо помилка, генеруємо все за замовчуванням
                        if (lessonCountInput) lessonCountInput.value = DEFAULT_TIMES.length;
                        updateDefaultTimeInputs();
                        generateForm();
                    });
                return;
            }

            const schedule = JSON.parse(jsonString);
            populateForms(schedule); // Ця функція тепер все перебудує

            if (statusEl) {
                statusEl.textContent = '✅ Ваш збережений розклад завантажено в редактор.';
                statusEl.className = 'status success active';
            }

        } catch (error) {
            console.error("Помилка при завантаженні:", error);
            if (statusEl) {
                statusEl.textContent = `❌ Помилка завантаження збереженого розкладу: ${error.message || 'Не вдалося прочитати дані'}`;
                statusEl.className = 'status error active';
            }
            // Скидаємо на дефолт у разі помилки
            if (lessonCountInput) lessonCountInput.value = DEFAULT_TIMES.length;
            updateDefaultTimeInputs();
            generateForm();
        }
    });

    loadFileBtn?.addEventListener('click', () => {
        if (loadFileInput) loadFileInput.click();
    });

    loadFileInput?.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('Не вдалося прочитати файл');
                const schedule = JSON.parse(text);
                populateForms(schedule); // Ця функція тепер все перебудує
                if (statusEl) {
                    statusEl.textContent = `✅ Розклад з файлу "${file.name}" завантажено в редактор.`;
                    statusEl.className = 'status success active';
                }
            } catch (err) {
                console.error('Помилка імпорту файлу:', err);
                if (statusEl) {
                    statusEl.textContent = '❌ Помилка! Файл пошкоджений або це не .json.';
                    statusEl.className = 'status error active';
                }
                if (lessonCountInput) lessonCountInput.value = DEFAULT_TIMES.length;
                updateDefaultTimeInputs();
                generateForm();
            }
        };
        reader.onerror = () => {
            console.error('Помилка читання файлу');
            if (statusEl) {
                statusEl.textContent = '❌ Помилка читання файлу.';
                statusEl.className = 'status error active';
            }
            if (lessonCountInput) lessonCountInput.value = DEFAULT_TIMES.length;
            updateDefaultTimeInputs();
            generateForm();
        };
        reader.readAsText(file);
        event.target.value = null;
    });

    exportJsonBtn?.addEventListener('click', () => {
        try {
            const schedule = buildScheduleObject();
            const dataStr = JSON.stringify(schedule, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const a = document.createElement('a');
            a.href = url;
            const groupName = document.getElementById('group')?.value || 'schedule';
            a.download = `${groupName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (statusEl) {
                statusEl.textContent = '✅ Розклад експортовано у файл .json.';
                statusEl.className = 'status success active';
            }

        } catch (error) {
            console.error("Помилка при експорті:", error);
            if (statusEl) {
                statusEl.textContent = `❌ Помилка експорту: ${error.message || 'Не вдалося створити файл'}`;
                statusEl.className = 'status error active';
            }
        }
    });

    // Авто-завантаження при вході на сторінку
    if (loadStorageBtn) {
        loadStorageBtn.click();
    } else {
        // Якщо кнопки load немає, все одно ініціалізуємо
        updateDefaultTimeInputs();
        generateForm();
    }
}); // Кінець DOMContentLoaded
