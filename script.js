// Глобальні змінні
let scheduleData = null;
let themeAutoHideTimer;
const themeBtn = document.getElementById('themeBtn'); // Кнопка Теми
const SCHEDULE_STORAGE_KEY = 'myCustomSchedule';

// Елементи (оголошуємо глобально для доступу)
let subgroupFilter, showAllWeeks, hideEmptyLessons, showNextWeekBtn;
let toggleFiltersBtn, advancedFiltersPanel, openModalBtn, settingsModal, modalClose;
let importBtn, importFile, exportBtn, deleteBtn, importStatusEl; // Елементи модалки

// === CSS Змінні (для JS доступу, якщо потрібно) ===
const cssRoot = document.documentElement;
const getCssVar = (varName) => getComputedStyle(cssRoot).getPropertyValue(varName).trim();
const setCssVar = (varName, value) => cssRoot.style.setProperty(varName, value);

// Функції для cookies
function setCookie(name, value, days = 30) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

// --- Функції для скасованих пар ---
function getTodayDateString() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function daysDifference(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
function loadCanceledLessons() {
    const cookie = getCookie('canceledLessons');
    if (!cookie) return { asSet: new Set(), asList: [] };
    let list = [];
    try { list = JSON.parse(cookie); if (!Array.isArray(list)) list = []; } catch (e) { list = []; }
    const today = getTodayDateString();
    const cleanedList = list.filter(item => daysDifference(item.canceledOn, today) < 7);
    if (cleanedList.length < list.length) setCookie('canceledLessons', JSON.stringify(cleanedList));
    return { asSet: new Set(cleanedList.map(item => item.id)), asList: cleanedList };
}
function toggleCanceledLesson(id) {
    const { asList } = loadCanceledLessons();
    const today = getTodayDateString();
    const index = asList.findIndex(item => item.id === id);
    if (index > -1) asList.splice(index, 1); else asList.push({ id: id, canceledOn: today });
    setCookie('canceledLessons', JSON.stringify(asList));
}
// --- Кінець функцій скасування ---

// --- Функції для тижнів ---
function getISOWeek(date) {
    const d = new Date(date.getTime()); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}
function getCurrentType() {
    const showNextWeek = showNextWeekBtn?.classList.contains('active') || false;
    const now = new Date();
    if (showNextWeek) now.setDate(now.getDate() + 7);
    // Перевірка наявності scheduleData перед доступом до startDate
    const startSemester = new Date(scheduleData?.startDate || Date.now()); // Використовуємо поточну дату як fallback
    const weekStart = getISOWeek(startSemester);
    const currentWeek = getISOWeek(now);
    // Додаємо перевірку, щоб уникнути NaN, якщо дати некоректні
    const weeksSinceStart = (isNaN(currentWeek) || isNaN(weekStart)) ? 1 : currentWeek - weekStart + 1;
    const isNumerator = weeksSinceStart % 2 !== 0;
    return isNumerator ? 'num' : 'den';
}
function getWeekDates(date) {
    const d = new Date(date); const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setFullYear(monday.getFullYear(), monday.getMonth(), monday.getDate()); // Нормалізація дати
    const friday = new Date(monday); friday.setDate(friday.getDate() + 4);
    return { start: monday, end: friday };
}
// --- ---

// --- Завантаження JSON даних ---
async function loadScheduleData() {
    const customSchedule = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (customSchedule) {
        try {
            console.log('Завантаження збереженого розкладу...');
            scheduleData = JSON.parse(customSchedule);
            return scheduleData;
        } catch (e) {
            console.error('Помилка читання збереженого розкладу:', e);
            localStorage.removeItem(SCHEDULE_STORAGE_KEY);
        }
    }
    try {
        console.log('Завантаження розкладу за замовчуванням...');
        const response = await fetch('./schedule.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        scheduleData = await response.json();
        return scheduleData;
    } catch (error) {
        console.error('Помилка завантаження розкладу:', error);
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = `
              <div style="color: #d32f2f; text-align: center;">
                <h3>❌ Помилка завантаження</h3>
                <p>Не вдалося завантажити дані розкладу (${error.message}). Спробуйте оновити сторінку.</p>
                <p style="font-size: 0.8em; color: #666;">(Можлива помилка в schedule.json або проблеми з мережею)</p>
              </div>`;
        }
        return null;
    }
}
// --- ---

// --- Генерація навігації ---
function generateNavigation() {
    const nav = document.getElementById('navigation');
    if (!nav || !scheduleData?.schedule) return; // Додав перевірки
    const days = Object.keys(scheduleData.schedule);
    nav.innerHTML = days.map(dayKey => {
        const dayName = scheduleData.schedule[dayKey]?.name || dayKey; // Fallback
        const shortName = getShortDayName(dayName);
        return `<a href="#" onclick="scrollToDay('${dayKey}'); return false;"
                 data-full="${dayName}" data-short="${shortName}">${dayName}</a>`;
    }).join('');
}
function getShortDayName(fullName) {
    const shortNames = { 'Понеділок': 'ПН', 'Вівторок': 'ВТ', 'Середа': 'СР', 'Четвер': 'ЧТ', 'П\'ятниця': 'ПТ' };
    return shortNames[fullName] || fullName.substring(0, 2).toUpperCase();
}
// --- ---

// --- Генерація розкладу ---
function generateSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container || !scheduleData?.schedule) return;
    const days = Object.keys(scheduleData.schedule);
    container.innerHTML = days.map(dayKey => {
        const day = scheduleData.schedule[dayKey];
        if (!day || !day.lessons) return ''; // Пропустити день без даних
        return `
          <section class="day" id="${dayKey}">
            <h2>${day.name || dayKey}</h2>
            <div class="cards">
              ${day.lessons.map(lesson => generateLessonCard(lesson, dayKey)).join('')}
            </div>
          </section>`;
    }).join('');
}
function generateLessonCard(lesson, dayKey) {
    const hasSubgroups = lesson.subgroups && lesson.subgroups.length > 0;
    const isEmpty = (lesson.type === 'empty' || !lesson.subject) && !hasSubgroups;
    let cardClass = isEmpty ? 'card empty' : `card ${lesson.type}`;
    if (!hasSubgroups && lesson.weeks && (lesson.weeks === 'num' || lesson.weeks === 'den')) {
        cardClass += ` numden ${lesson.weeks}`;
    }
    const lessonId = `lesson-${dayKey}-${lesson.number}`;
    if (isEmpty) {
        return `<article class="${cardClass}" id="${lessonId}"><h3>${lesson.number} пара</h3><p class="empty-message">Немає</p></article>`;
    }
    let subgroupsHtml = ''; let mainContent = '';
    if (hasSubgroups) {
        subgroupsHtml = lesson.subgroups.map(sub => {
            const subClass = getSubgroupClass(sub); const subLabel = getSubgroupLabel(sub);
            let weekLabel = '';
            if (sub.weeks === 'num') weekLabel = '<span class="week-label num-label"> (Чисельник)</span>';
            else if (sub.weeks === 'den') weekLabel = '<span class="week-label den-label"> (Знаменник)</span>';
            return `
              <div class="subgroup ${subClass}">
                <p class="subgroup-label">${subLabel}${weekLabel}</p>
                <p><b>${sub.subject || '?'}</b> (${getTypeLabel(sub.type)})</p>
                <p class="teacher-room">${sub.teacher || ''}${sub.room ? ', ' + sub.room : ''}</p>
              </div>`;
        }).join('');
    } else if (lesson.subject) {
        mainContent = `
          <p data-main-content="true"><b>${lesson.subject}</b> (${getTypeLabel(lesson.type)})</p>
          <p class="teacher-room">${lesson.teacher || ''}${lesson.room ? ', ' + lesson.room : ''}</p>`;
    }
    return `
      <article class="${cardClass}" id="${lessonId}">
        <h3>
          ${lesson.number} пара
          <button class="cancel-btn" title="Скасувати/повернути пару" data-lesson-id="${lessonId}">❌</button>
        </h3>
        ${mainContent}${subgroupsHtml}
        <p class="time">${lesson.time || '??:?? - ??:??'}</p>
      </article>`;
}
function getSubgroupClass(sub) { /* ... без змін ... */ return (sub.weeks ? `numden ${sub.weeks}` : '') + (sub.group ? ` ${sub.group}`: ''); }
function getSubgroupLabel(sub) { /* ... без змін ... */ if (sub.group === 'sub1') return 'Підгрупа 1'; if (sub.group === 'sub2') return 'Підгрупа 2'; return ''; }
function getTypeLabel(type) { const types = { 'lecture': 'Лекція', 'practical': 'Практична', 'lab': 'Лабораторна', 'mixed': 'Змішана' }; return types[type] || type || '?'; }
// --- ---

// Фільтрація розкладу
function filterSchedule() {
    const subgroup = subgroupFilter?.value || 'all';
    const showAll = showAllWeeks?.checked || false;
    const hideEmpty = hideEmptyLessons?.checked || false;
    const canceledLessonIds = loadCanceledLessons().asSet;
    const currentType = getCurrentType();
    const cards = document.querySelectorAll('#schedule-container .card'); // Уточнив селектор

    // Блокування кнопки "Наст. тиждень"
    if (showNextWeekBtn) {
        const isDisabled = showAll;
        showNextWeekBtn.disabled = isDisabled;
        showNextWeekBtn.style.opacity = isDisabled ? '0.5' : '1';
        showNextWeekBtn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
        if (isDisabled) showNextWeekBtn.classList.remove('active'); // Скидаємо стан
    }

    cards.forEach(card => {
        let emptyMsg = card.querySelector('.empty-message');
        const timeEl = card.querySelector('.time');
        const mainContentEl = card.querySelector('p[data-main-content]');
        const teacherRoomEl = card.querySelector('.teacher-room');
        const subgroups = card.querySelectorAll('.subgroup');

        const isCanceled = canceledLessonIds.has(card.id);
        card.classList.toggle('canceled', isCanceled);

        if (isCanceled) {
            if (!emptyMsg) { emptyMsg = document.createElement('p'); emptyMsg.className = 'empty-message'; card.querySelector('h3')?.insertAdjacentElement('afterend', emptyMsg); }
            if (emptyMsg) { emptyMsg.textContent = 'Скасовано'; emptyMsg.style.display = 'block'; }
            if (timeEl) timeEl.style.display = 'none';
            if (mainContentEl) mainContentEl.style.display = 'none';
            if (teacherRoomEl) teacherRoomEl.style.display = 'none';
            subgroups.forEach(sub => sub.style.display = 'none');
            card.style.display = 'flex'; // Використовуємо flex для карток
            card.classList.remove('empty');
            return;
        }

        if (emptyMsg) { if (emptyMsg.textContent === 'Скасовано') emptyMsg.remove(); else emptyMsg.style.display = 'none'; }
        if (timeEl) timeEl.style.display = 'block';
        if (mainContentEl) mainContentEl.style.display = 'block';
        if (teacherRoomEl) teacherRoomEl.style.display = 'block';

        let hasVisibleContent = false;
        if (mainContentEl) {
            let mainVisible = true;
            if (!showAll) {
                const weekType = card.classList.contains('num') ? 'num' : (card.classList.contains('den') ? 'den' : 'all');
                if (weekType !== 'all' && weekType !== currentType) mainVisible = false;
            }
            if (mainVisible) hasVisibleContent = true;
            else { mainContentEl.style.display = 'none'; if (teacherRoomEl) teacherRoomEl.style.display = 'none'; }
        }

        if (subgroups.length > 0) {
            subgroups.forEach(sub => {
                let visible = true;
                const subType = sub.classList.contains('sub1') ? 'sub1' : (sub.classList.contains('sub2') ? 'sub2' : 'all');
                if (subgroup !== 'all' && subType !== 'all' && subType !== subgroup) visible = false;
                if (!showAll) {
                    const weekType = sub.classList.contains('num') ? 'num' : (sub.classList.contains('den') ? 'den' : 'all');
                    if (weekType !== 'all' && weekType !== currentType) visible = false;
                }
                sub.style.display = visible ? 'block' : 'none';
                if (visible) hasVisibleContent = true;
            });
        }

        if (card.classList.contains('empty') && !card.querySelector('h3')) { // Перевірка, чи це дійсно порожня картка
             hasVisibleContent = false;
        }


        if (hasVisibleContent) {
            card.classList.remove('empty');
            card.style.display = 'flex';
            if (timeEl) timeEl.style.display = 'block';
            if (emptyMsg) emptyMsg.style.display = 'none';
        } else {
            card.classList.add('empty');
            if (timeEl) timeEl.style.display = 'none';
            if (!emptyMsg) { emptyMsg = document.createElement('p'); emptyMsg.className = 'empty-message'; card.querySelector('h3')?.insertAdjacentElement('afterend', emptyMsg); }
            if (emptyMsg) { emptyMsg.textContent = 'Немає'; emptyMsg.style.display = 'block'; }
            card.style.display = hideEmpty ? 'none' : 'flex';
        }
    });

    const labels = document.querySelectorAll('.week-label'); // Оновлено селектор
    labels.forEach(label => label.style.display = showAll ? 'none' : 'inline'); // Показуємо як inline

    updateWeekInfo();
    highlightCurrentPair();
    saveSettings(); // Зберігаємо стан фільтрів
    // generateReports(); // Звіти можна оновлювати рідше, якщо потрібно
}


// Оновлення інформації про тиждень
function updateWeekInfo() {
  const showAll = showAllWeeks?.checked || false;
  const showNextWeek = showNextWeekBtn?.classList.contains('active') || false;
  const infoSpan = document.getElementById('currentWeekInfo');
  if (!infoSpan) return;

  if (showAll) {
    infoSpan.innerHTML = '';
  } else {
    const date = new Date();
    if (showNextWeek) {
      date.setDate(date.getDate() + 7);
      infoSpan.style.color = '#9c27b0';
    } else {
      infoSpan.style.color = ''; // Використовуємо колір CSS змінної
    }

    const type = getCurrentType();
    const dates = getWeekDates(date);
    const typeName = type === 'num' ? 'Чисельник' : 'Знаменник';
    const prefix = showNextWeek ? 'Наст. тиждень: ' : '';

    infoSpan.innerHTML = `${prefix}${typeName} <span class="week-date">(${dates.start.toLocaleDateString('uk-UA')} – ${dates.end.toLocaleDateString('uk-UA')})</span>`;
  }
}

// --- Навігація, Темна тема, Поточний день ---
function scrollToDay(dayId) { const el = document.getElementById(dayId); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return false; }
function updateNavText() {
    const isMobile = window.innerWidth <= 600;
    document.querySelectorAll('nav a').forEach(link => {
        link.textContent = isMobile ? link.dataset.short : link.dataset.full;
    });
}
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light'); // Зберігаємо тему в localStorage
    // Оновлюємо іконку кнопки теми, якщо вона є
    const themeToggle = document.getElementById('themeBtn');
    if (themeToggle) themeToggle.textContent = isDark ? '☀️' : '🌙';
}
function highlightToday() { /* ... без змін ... */ }
function highlightCurrentPair() { /* ... без змін ... */ }
// --- ---

// --- Кнопка Теми (основний сайт) ---
// (Залишаємо стару логіку, якщо кнопка expanded існує)
if (themeBtn && themeBtn.classList.contains('theme-toggle')) {
    themeBtn.addEventListener('click', () => {
        toggleDarkMode(); // Просто перемикаємо тему
        vibrate();
    });
     // Ініціалізація іконки
    themeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}
function vibrate() { if (navigator.vibrate) navigator.vibrate(50); }
// --- ---

// Завантаження налаштувань
function loadSettings() {
  // Завантаження теми з localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
  } else {
      document.body.classList.remove('dark-mode');
  }
  // Оновлюємо іконку кнопки теми
  if (themeBtn) themeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';


  const subgroup = getCookie('subgroupFilter');
  if (subgroup && subgroupFilter) subgroupFilter.value = subgroup;

  const showAll = getCookie('showAllWeeks');
  if (showAll === 'true' && showAllWeeks) showAllWeeks.checked = true;

  const hideEmpty = getCookie('hideEmptyLessons');
  if (hideEmpty === 'true' && hideEmptyLessons) hideEmptyLessons.checked = true;

  const showNext = getCookie('showNextWeek');
  if (showNext === 'true' && showNextWeekBtn) {
      showNextWeekBtn.classList.add('active');
  } else if (showNextWeekBtn) {
       showNextWeekBtn.classList.remove('active');
  }
}

// Збереження налаштувань
function saveSettings() {
  if (subgroupFilter) setCookie('subgroupFilter', subgroupFilter.value);
  if (showAllWeeks) setCookie('showAllWeeks', showAllWeeks.checked ? 'true' : 'false');
  if (hideEmptyLessons) setCookie('hideEmptyLessons', hideEmptyLessons.checked ? 'true' : 'false');
  if (showNextWeekBtn) setCookie('showNextWeek', showNextWeekBtn.classList.contains('active') ? 'true' : 'false');
}

// --- Обробник кліку скасування ---
function handleCancelClick(e) { if (e.target.classList.contains('cancel-btn')) { /* ... без змін ... */ } }
// --- ---

// --- Звіти та Статистика ---
function generateReports() { /* ... без змін ... */ }
function calculateStatistics() { /* ... без змін ... */ }
// --- ---

// --- Модальне вікно Імпорту/Експорту ---
function initModal() {
  // Знаходимо елементи тут, всередині функції
  settingsModal = document.getElementById('settingsModal'); // Присвоюємо глобальній змінній
  modalClose = document.getElementById('modalClose');
  importBtn = document.getElementById('importBtn');
  importFile = document.getElementById('importFile');
  exportBtn = document.getElementById('exportBtn');
  deleteBtn = document.getElementById('deleteBtn');
  importStatusEl = document.getElementById('importStatus'); // Використовуємо глобальну змінну

  if (!settingsModal || !modalClose || !importBtn || !importFile || !exportBtn || !deleteBtn || !importStatusEl) {
      console.warn('Modal elements not found for initModal'); // Попередження замість помилки
      return;
  }
  modalClose.onclick = () => { settingsModal.style.display = 'none'; }
  window.onclick = (event) => { if (event.target == settingsModal) settingsModal.style.display = 'none'; }

  importBtn.onclick = () => importFile?.click(); // Додав перевірку
  importFile.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text !== 'string') throw new Error('Cannot read file');
              const jsonData = JSON.parse(text); // Перевіряємо JSON
              localStorage.setItem(SCHEDULE_STORAGE_KEY, text);
              if (importStatusEl) { importStatusEl.textContent = '✅ Імпортовано! Оновіть сторінку.'; importStatusEl.style.color = getCssVar('--success-text'); importStatusEl.className = 'status success active'; }
              // Оновлюємо сторінку автоматично
              setTimeout(() => location.reload(), 1500);
          } catch (err) {
              console.error('Import error:', err);
              if (importStatusEl) { importStatusEl.textContent = '❌ Помилка! Невірний формат файлу.'; importStatusEl.style.color = getCssVar('--error-text'); importStatusEl.className = 'status error active';}
          }
      };
      reader.onerror = () => { /* ... обробка помилок читання ... */ };
      reader.readAsText(file);
      event.target.value = null;
  };

  exportBtn.onclick = () => {
       if (!scheduleData) { /* ... повідомлення про помилку ... */ return; }
       try { // Додав try-catch
           const dataStr = JSON.stringify(scheduleData, null, 2);
           const dataBlob = new Blob([dataStr], {type: 'application/json'});
           const url = URL.createObjectURL(dataBlob);
           const a = document.createElement('a'); a.href = url;
           a.download = `${scheduleData.group || 'schedule'}.json`; // Використовуємо дані з scheduleData
           a.click(); URL.revokeObjectURL(url); a.remove(); // Чистка
           if (importStatusEl) { importStatusEl.textContent = '✅ Експортовано!'; importStatusEl.style.color = getCssVar('--info-text'); importStatusEl.className = 'status info active'; }
       } catch (err) {
            console.error('Export error:', err);
            if (importStatusEl) { importStatusEl.textContent = '❌ Помилка експорту.'; importStatusEl.style.color = getCssVar('--error-text'); importStatusEl.className = 'status error active';}
       }
  };
  deleteBtn.onclick = () => {
      if (confirm('Видалити ваш розклад і повернути стандартний?')) {
          localStorage.removeItem(SCHEDULE_STORAGE_KEY);
          if (importStatusEl) { importStatusEl.textContent = '✅ Видалено! Оновіть сторінку.'; importStatusEl.style.color = getCssVar('--error-text'); importStatusEl.className = 'status error active';}
          setTimeout(() => location.reload(), 1500);
      }
  };
}
// --- ---


// === Ініціалізація додатку ===
async function initApp() {
  // Знаходимо елементи керування та фільтрів
  subgroupFilter = document.getElementById('subgroupFilter');
  showAllWeeks = document.getElementById('showAllWeeks');
  hideEmptyLessons = document.getElementById('hideEmptyLessons');
  showNextWeekBtn = document.getElementById('showNextWeekBtn');
  toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
  advancedFiltersPanel = document.getElementById('advancedFiltersPanel');
  openModalBtn = document.getElementById('openModalBtn');
  // settingsModal ініціалізується в initModal

  // Спочатку завантажуємо налаштування (включаючи тему)
  loadSettings();

  const data = await loadScheduleData();
  if (!data) return; // Зупиняємось, якщо дані не завантажено

  const titleEl = document.getElementById('schedule-title');
  if (titleEl) titleEl.textContent = `Розклад занять`; // Перевірка існування

  generateNavigation();
  generateSchedule();

  // Обробники подій
  toggleFiltersBtn?.addEventListener('click', () => {
    if (advancedFiltersPanel) {
        const isVisible = advancedFiltersPanel.style.display === 'block';
        advancedFiltersPanel.style.display = isVisible ? 'none' : 'block';
        toggleFiltersBtn.textContent = isVisible ? '⚙️ Фільтри' : '⚙️ Сховати';
    }
  });
  openModalBtn?.addEventListener('click', () => {
      if (settingsModal) settingsModal.style.display = 'block';
      if (importStatusEl) importStatusEl.textContent = ''; // Очищаємо статус
  });
  showNextWeekBtn?.addEventListener('click', () => {
      showNextWeekBtn.classList.toggle('active');
      filterSchedule();
  });
  subgroupFilter?.addEventListener('change', filterSchedule);
  showAllWeeks?.addEventListener('change', filterSchedule);
  hideEmptyLessons?.addEventListener('change', filterSchedule);
  document.getElementById('schedule-container')?.addEventListener('click', handleCancelClick);

  initModal(); // Ініціалізуємо модальне вікно тут

  filterSchedule(); // Перший запуск фільтрації

  highlightToday();
  updateNavText();
  generateReports();

  const loadingEl = document.getElementById('loading');
  const containerEl = document.getElementById('schedule-container');
  if(loadingEl) loadingEl.style.display = 'none';
  if(containerEl) containerEl.style.display = 'block';
}

// Запуск додатку
document.addEventListener('DOMContentLoaded', initApp);

// Оновлення кожну хвилину (залишаємо тільки highlightCurrentPair)
setInterval(() => {
  highlightCurrentPair();
  // updateThemeButtonTime(); // Прибираємо, бо логіка кнопки теми змінилась
}, 60000);

// Обробка зміни розміру екрану
window.addEventListener('resize', updateNavText);