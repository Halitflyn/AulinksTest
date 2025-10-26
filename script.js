// Глобальні змінні
let scheduleData = null;
let themeAutoHideTimer; // Розкоментовано
const themeBtn = document.getElementById('themeBtn'); // Кнопка Теми (кругла справа)
const SCHEDULE_STORAGE_KEY = 'myCustomSchedule';

// Елементи (оголошуємо глобально для доступу)
let subgroupFilter, showAllWeeks, hideEmptyLessons, showNextWeekBtn;
let toggleFiltersBtn, advancedFiltersPanel, openModalBtn, settingsModal, modalClose;
let importBtn, importFile, exportBtn, deleteBtn, importStatusEl; // Елементи модалки

// === CSS Змінні (для JS доступу, якщо потрібно) ===
const cssRoot = document.documentElement;
const getCssVar = (varName) => getComputedStyle(cssRoot).getPropertyValue(varName).trim();
// const setCssVar = (varName, value) => cssRoot.style.setProperty(varName, value); // Поки не використовується

// Функції для cookies (для налаштувань фільтрів)
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
    // Перевірка на валідність дат
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        console.error("Invalid date string provided to daysDifference:", dateStr1, dateStr2);
        return Infinity; // Повертаємо нескінченність, щоб старі записи точно видалялись
    }
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
function loadCanceledLessons() {
    const cookie = getCookie('canceledLessons');
    if (!cookie) return { asSet: new Set(), asList: [] };
    let list = [];
    try { list = JSON.parse(cookie); if (!Array.isArray(list)) list = []; } catch (e) { list = []; }
    const today = getTodayDateString();
    // Фільтруємо невалідні записи та старі
    const cleanedList = list.filter(item => item && item.id && item.canceledOn && daysDifference(item.canceledOn, today) < 7);
    if (cleanedList.length < list.length) setCookie('canceledLessons', JSON.stringify(cleanedList));
    return { asSet: new Set(cleanedList.map(item => item.id)), asList: cleanedList };
}
function toggleCanceledLesson(id) {
    if (!id) return; // Перевірка
    const { asList } = loadCanceledLessons();
    const today = getTodayDateString();
    const index = asList.findIndex(item => item.id === id);
    if (index > -1) asList.splice(index, 1); else asList.push({ id: id, canceledOn: today });
    setCookie('canceledLessons', JSON.stringify(asList));
}
// --- Кінець функцій скасування ---

// --- Функції для тижнів ---
function getISOWeek(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return NaN; // Перевірка валідності
    const d = new Date(date.getTime()); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    // Перевірка на валідність року
    const week1 = new Date(d.getFullYear(), 0, 4);
      if (isNaN(week1.getTime())) return NaN;
    // Calculate full weeks to nearest Thursday
    const dayOfYear = ((d - yearStart) / 86400000) + 1;
    const weekNum = Math.ceil((dayOfYear - d.getDay() + 4) / 7);

    // // Старий розрахунок, може давати помилки на межі року
    // const week1 = new Date(d.getFullYear(), 0, 4);
    // return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      return weekNum;
}
function getCurrentType() {
    const showNextWeek = showNextWeekBtn?.classList.contains('active') || false;
    const now = new Date();
    if (showNextWeek) now.setDate(now.getDate() + 7);

    const startSemesterStr = scheduleData?.startDate;
    if (!startSemesterStr) { // Якщо дата не задана, вважаємо поточний тиждень чисельником
        console.warn("startDate is not defined in scheduleData. Assuming current week is numerator.");
        const currentWeekNum = getISOWeek(now);
        return isNaN(currentWeekNum) || currentWeekNum % 2 !== 0 ? 'num' : 'den';
    }

    const startSemester = new Date(startSemesterStr);
      if (isNaN(startSemester.getTime())) { // Якщо дата невалідна
        console.error("Invalid startDate in scheduleData:", startSemesterStr,". Assuming current week is numerator.");
          const currentWeekNum = getISOWeek(now);
          return isNaN(currentWeekNum) || currentWeekNum % 2 !== 0 ? 'num' : 'den';
    }

    const weekStart = getISOWeek(startSemester);
    const currentWeek = getISOWeek(now);

    if (isNaN(weekStart) || isNaN(currentWeek)) {
          console.error("Could not calculate week numbers. Assuming numerator.");
          return 'num'; // Fallback
    }

    const weeksSinceStart = currentWeek - weekStart + 1;
    // Якщо тиждень старту непарний (чис), то всі непарні відносно нього - чис.
    // Якщо тиждень старту парний (знам), то всі парні відносно нього - знам (тобто непарні - чис).
    // const isNumerator = (weeksSinceStart % 2 !== 0); // Це працює тільки якщо startWeek завжди 1 чи інше непарне число
      const startWeekIsOdd = weekStart % 2 !== 0;
      const currentWeekIsOdd = currentWeek % 2 !== 0;
      const isNumerator = startWeekIsOdd === currentWeekIsOdd; // Чисельник, якщо парність тижнів збігається

    return isNumerator ? 'num' : 'den';
}
function getWeekDates(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) date = new Date(); // Fallback на поточну дату
    const d = new Date(date); const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff); // Використовуємо конструктор
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
            if (typeof scheduleData !== 'object' || scheduleData === null) throw new Error("Invalid data format");
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
          if (typeof scheduleData !== 'object' || scheduleData === null) throw new Error("Invalid data format");
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
    if (!nav || !scheduleData?.schedule) return;
    const days = Object.keys(scheduleData.schedule);
nav.innerHTML = days.map(dayKey => {
    const dayName = scheduleData.schedule[dayKey]?.name || dayKey;
    const shortName = getShortDayName(dayName);
    // Прибрали onclick, додали data-day-id
    return `<a href="#" data-day-id="${dayKey}"
              data-full="${dayName}" data-short="${shortName}">${dayName}</a>`;
}).join('');
}
function getShortDayName(fullName) {
    const shortNames = { 'Понеділок': 'ПН', 'Вівторок': 'ВТ', 'Середа': 'СР', 'Четвер': 'ЧТ', 'П\'ятниця': 'ПТ' };
    return shortNames[fullName] || fullName?.substring(0, 2).toUpperCase() || '?'; // Додав ?.
}
// --- ---

// --- Генерація розкладу ---
function generateSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container || !scheduleData?.schedule) return;
    const days = Object.keys(scheduleData.schedule);
    container.innerHTML = days.map(dayKey => {
        const day = scheduleData.schedule[dayKey];
        if (!day || !Array.isArray(day.lessons)) return ''; // Перевірка на масив
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
    if (!lesson) return ''; // Перевірка
    const hasSubgroups = Array.isArray(lesson.subgroups) && lesson.subgroups.length > 0;
    const isEmpty = (lesson.type === 'empty' || !lesson.subject) && !hasSubgroups;
    let cardClass = isEmpty ? 'card empty' : `card ${lesson.type || 'unknown'}`; // Додав fallback
    if (!hasSubgroups && lesson.weeks && (lesson.weeks === 'num' || lesson.weeks === 'den')) {
        cardClass += ` numden ${lesson.weeks}`;
    }
    const lessonId = `lesson-${dayKey}-${lesson.number || '?'}`; // Fallback для номера
    if (isEmpty) {
        return `<article class="${cardClass}" id="${lessonId}"><h3>${lesson.number || '?'} пара</h3><p class="empty-message">Немає</p></article>`;
    }
    let subgroupsHtml = ''; let mainContent = '';
    if (hasSubgroups) {
        subgroupsHtml = lesson.subgroups.map(sub => {
            if (!sub) return ''; // Перевірка підгрупи
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
          ${lesson.number || '?'} пара
          <button class="cancel-btn" title="Скасувати/повернути пару" data-lesson-id="${lessonId}">❌</button>
        </h3>
        ${mainContent}${subgroupsHtml}
        <p class="time">${lesson.time || '??:?? - ??:??'}</p>
      </article>`;
}
function getSubgroupClass(sub) { return (sub?.weeks ? `numden ${sub.weeks}` : '') + (sub?.group ? ` ${sub.group}`: ''); }
function getSubgroupLabel(sub) { if (sub?.group === 'sub1') return 'Підгрупа 1'; if (sub?.group === 'sub2') return 'Підгрупа 2'; return ''; }
function getTypeLabel(type) { const types = { 'lecture': 'Лекція', 'practical': 'Практична', 'lab': 'Лабораторна', 'mixed': 'Змішана' }; return types[type] || type || '?'; }
// --- ---

// Фільтрація розкладу
function filterSchedule() {
    const subgroup = subgroupFilter?.value || 'all';
    const showAll = showAllWeeks?.checked || false;
    const hideEmpty = hideEmptyLessons?.checked || false;
    const canceledLessonIds = loadCanceledLessons().asSet;
    const currentType = getCurrentType();
    const cards = document.querySelectorAll('#schedule-container .card');

    if (showNextWeekBtn) {
        const isDisabled = showAll;
        showNextWeekBtn.disabled = isDisabled;
        showNextWeekBtn.style.opacity = isDisabled ? '0.5' : '1';
        showNextWeekBtn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
        if (isDisabled) showNextWeekBtn.classList.remove('active');
    }

    cards.forEach(card => {
        if (!card) return; // Додаткова перевірка
        let emptyMsg = card.querySelector('.empty-message');
        const timeEl = card.querySelector('.time');
        const mainContentEl = card.querySelector('p[data-main-content]');
        const teacherRoomEl = card.querySelector('.teacher-room');
        const subgroups = card.querySelectorAll('.subgroup');
        const h3El = card.querySelector('h3'); // Знаходимо H3 для вставки повідомлення

        const isCanceled = canceledLessonIds.has(card.id);
        card.classList.toggle('canceled', isCanceled);

        if (isCanceled) {
            if (!emptyMsg && h3El) { emptyMsg = document.createElement('p'); emptyMsg.className = 'empty-message'; h3El.insertAdjacentElement('afterend', emptyMsg); }
            if (emptyMsg) { emptyMsg.textContent = 'Скасовано'; emptyMsg.style.display = 'block'; }
            if (timeEl) timeEl.style.display = 'none';
            if (mainContentEl) mainContentEl.style.display = 'none';
            if (teacherRoomEl) teacherRoomEl.style.display = 'none';
            subgroups.forEach(sub => sub.style.display = 'none');
            card.style.display = 'flex';
            card.classList.remove('empty');
            return;
        }

        if (emptyMsg) { if (emptyMsg.textContent === 'Скасовано') emptyMsg.remove(); else emptyMsg.style.display = 'none'; }
        // Відновлюємо видимість елементів (якщо вони існують)
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
                if (!sub) return; // Перевірка
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

        // Перевіряємо, чи це картка, яка початково була порожньою (має клас empty і НЕ має підгруп/головного контенту)
        if (card.classList.contains('empty') && !mainContentEl && subgroups.length === 0) {
              hasVisibleContent = false;
        }

        if (hasVisibleContent) {
            card.classList.remove('empty'); // Прибираємо клас empty, якщо з'явився контент
            card.style.display = 'flex';
            if (timeEl) timeEl.style.display = 'block'; // Показуємо час
            if (emptyMsg) emptyMsg.style.display = 'none'; // Ховаємо "Немає"
        } else {
            // Якщо картка стала порожньою ПІСЛЯ фільтрації
            if (!card.classList.contains('empty')) { // Додаємо клас, якщо його не було
                card.classList.add('empty');
            }
            if (timeEl) timeEl.style.display = 'none'; // Ховаємо час
            if (!emptyMsg && h3El) { emptyMsg = document.createElement('p'); emptyMsg.className = 'empty-message'; h3El.insertAdjacentElement('afterend', emptyMsg); }
            if (emptyMsg) { emptyMsg.textContent = 'Немає'; emptyMsg.style.display = 'block'; } // Показуємо "Немає"
            card.style.display = hideEmpty ? 'none' : 'flex'; // Ховаємо або показуємо як порожню
        }
    });

    const weekLabels = document.querySelectorAll('.week-label');
    weekLabels.forEach(label => label.style.display = showAll ? 'none' : 'inline');

    updateWeekInfo();
    highlightCurrentPair();
  // --- Допоміжна функція: Перевіряє, чи є пари в цей день ---
function dayHasClasses(dayKey) {
  // Перевіряємо, чи існує такий день в нашому JSON
  if (!scheduleData || !scheduleData.schedule || !scheduleData.schedule[dayKey]) {
    return false; // Такого дня немає (наприклад, 'sunday')
  }
  const lessons = scheduleData.schedule[dayKey].lessons;
  if (!lessons || lessons.length === 0) {
    return false;
  }
  
  // .some() поверне true, якщо ХОЧА Б ОДНА пара не є 'empty'
  // (тобто має 'subject' або підгрупи)
  return lessons.some(lesson => lesson.type !== 'empty');
}

// --- Головна функція: Прокрутка до потрібного дня при завантаженні ---
function scrollToCorrectDay() {
  const dayKeys = [
    'sunday',    // 0
    'monday',    // 1
    'tuesday',   // 2
    'wednesday', // 3
    'thursday',  // 4
    'friday',    // 5
    'saturday'   // 6
  ];
  
  const todayIndex = new Date().getDay();
  let targetKey = dayKeys[todayIndex]; // Починаємо з 'сьогодні' (напр. 'tuesday')

  // Правило 4: Виняток для П'ятниці.
  // Якщо сьогодні п'ятниця, ми ЗАВЖДИ відкриваємо п'ятницю,
  // незалежно від того, чи є там пари.
  if (targetKey === 'friday') {
    console.log('Сьогодні п\'ятниця, відкриваємо п\'ятницю.');
    scrollToDay('friday');
    return;
  }

  // Правило 2: Перевіряємо 'сьогодні'
  // (Це покриває твій випадок про 5:00 ранку. Якщо пари є, день відкриється)
  if (dayHasClasses(targetKey)) {
    console.log('Сьогодні є пари, відкриваємо:', targetKey);
    scrollToDay(targetKey);
    return;
  }

  // Правило 3: 'Сьогодні' пар немає (напр. 'saturday' або 'sunday').
  // Шукаємо наступний день.
  console.log('Сьогодні пар немає, шукаємо наступний день...');
  let nextDayIndex = (todayIndex + 1) % 7; // Починаємо з завтра (напр. 0 - 'sunday')

  for (let i = 0; i < 7; i++) {
    const nextDayKey = dayKeys[nextDayIndex];

    // Якщо наступний день - це П'ятниця (і ми дійшли до неї),
    // ми зупиняємось на ній (за логікою винятку).
    if (nextDayKey === 'friday') {
      console.log('Дійшли до п\'ятниці, зупиняємось на ній.');
      scrollToDay('friday');
      return;
    }

    // Якщо знайшли день з парами (і це НЕ п'ятниця)
    if (dayHasClasses(nextDayKey)) {
      console.log('Знайдено наступний день з парами:', nextDayKey);
      scrollToDay(nextDayKey);
      return; // Знайшли!
    }
    
    nextDayIndex = (nextDayIndex + 1) % 7; // Йдемо далі по колу
  }
  
  // Якщо ми пройшли все коло і нічого не знайшли (весь тиждень порожній),
  // просто відкриваємо понеділок.
  console.log('Весь тиждень порожній. Відкриваємо понеділок.');
  scrollToDay('monday');
}
    saveSettings();
    // generateReports(); // Можна викликати рідше
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
    if (showNextWeek) date.setDate(date.getDate() + 7);

    // Встановлюємо колір залежно від теми та стану кнопки
    if (showNextWeek) {
        infoSpan.style.color = getCssVar(document.body.classList.contains('dark-mode') ? '--accent-secondary' : '--accent-dark'); // Фіолетовий/Темно-синій
    } else {
        infoSpan.style.color = ''; // Повертаємо стандартний колір (успадковується або з CSS)
    }

    const type = getCurrentType();
    const dates = getWeekDates(date);
    const typeName = type === 'num' ? 'Чисельник' : 'Знаменник';
    const prefix = showNextWeek ? 'Наст. тиждень: ' : '';

    // Перевірка валідності дат
    const startDateStr = !isNaN(dates.start.getTime()) ? dates.start.toLocaleDateString('uk-UA') : '??.??.????';
    const endDateStr = !isNaN(dates.end.getTime()) ? dates.end.toLocaleDateString('uk-UA') : '??.??.????';

    infoSpan.innerHTML = `${prefix}${typeName} <span class="week-date">(${startDateStr} – ${endDateStr})</span>`;
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
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    // РЯДОК (themeBtn.textContent = ...) ВИДАЛЕНО ЗВІДСИ
}
function highlightToday() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    const todayKey = days[today];
    document.querySelectorAll('.day').forEach(section => {
        section.classList.remove('today');
        if (section.id === todayKey) section.classList.add('today');
    });
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active-day');
        const dayName = scheduleData?.schedule?.[todayKey]?.name; // Безпечний доступ
        if (dayName && link.dataset.full === dayName) link.classList.add('active-day');
    });
      // Не скролимо при початковому завантаженні, щоб не заважати користувачу
      // const todaySection = document.getElementById(todayKey);
      // if (todaySection) todaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function highlightCurrentPair() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todaySection = document.querySelector('.day.today');
    if (!todaySection) return;

    const cards = todaySection.querySelectorAll('.card:not(.empty)');
    let currentCard = null;
    let upcomingCard = null;
    let minDiffToStart = Infinity;

    cards.forEach(card => {
        if (card.style.display === 'none' || card.classList.contains('canceled')) return;
        const timeP = card.querySelector('.time');
        if (!timeP?.textContent) return; // Безпечний доступ
        const timeMatch = timeP.textContent.match(/(\d{2}):(\d{2})\s*–\s*(\d{2}):(\d{2})/);
        if (!timeMatch) return;

        const [, startHour, startMin, endHour, endMin] = timeMatch.map(Number);
        if ([startHour, startMin, endHour, endMin].some(isNaN)) return;

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            currentCard = card;
            return; // Виходимо з forEach, якщо знайшли поточну
        }
        if (startMinutes > currentMinutes) {
            const diff = startMinutes - currentMinutes;
            if (diff < minDiffToStart) { minDiffToStart = diff; upcomingCard = card; }
        }
    });

    cards.forEach(c => c.classList.remove('current', 'upcoming'));
    if (currentCard) currentCard.classList.add('current');
    if (upcomingCard && minDiffToStart <= 15) upcomingCard.classList.add('upcoming');
}
// --- ---

// --- Кнопка Теми ---
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    if (!themeBtn.classList.contains('expanded')) {
      themeBtn.classList.add('expanded');
      updateThemeButtonTime();
      vibrate();
      clearTimeout(themeAutoHideTimer);
      themeAutoHideTimer = setTimeout(() => {
        themeBtn.classList.remove('expanded', 'green', 'yellow', 'purple');
        themeBtn.textContent = '';
        vibrate();
      }, 3000);
    } else {
      toggleDarkMode();
      updateThemeButtonTime();
      vibrate();
      clearTimeout(themeAutoHideTimer);
      themeAutoHideTimer = setTimeout(() => {
        themeBtn.classList.remove('expanded', 'green', 'yellow', 'purple');
        themeBtn.textContent = '';
        vibrate();
      }, 2000);
    }
  });
}
function vibrate() { if (navigator.vibrate) navigator.vibrate(50); }

// Збір проміжків часу для кнопки теми
function collectTodayIntervals() {
  const todaySection = document.querySelector('.day.today');
  if (!todaySection) return [];
  const cards = todaySection.querySelectorAll('.card:not(.empty):not(.canceled)');
  const intervals = [];
  
  cards.forEach(card => {
    if (card.style.display === 'none') return;
    const timeEl = card.querySelector('.time');
    if (!timeEl || !timeEl.textContent) return;
    const [startTime, endTime] = timeEl.textContent.split(' – ');
    if (!startTime || !endTime) return;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return;
    intervals.push({ start: sh * 60 + sm, end: eh * 60 + em });
  });
  
  intervals.sort((a, b) => a.start - b.start);
  return intervals;
}

// Оновлення кнопки теми
function updateThemeButtonTime() {
  if (!themeBtn || !themeBtn.classList.contains('expanded')) return;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const intervals = collectTodayIntervals();

  let current = null;
  let upcomingDiff = Infinity;
  let minutesLeft = null;

  intervals.forEach(({ start, end }) => {
    if (currentMinutes >= start && currentMinutes < end) {
      current = { start, end };
      minutesLeft = end - currentMinutes;
    } else if (start > currentMinutes) {
      const diff = start - currentMinutes;
      if (diff < upcomingDiff) upcomingDiff = diff;
    }
  });

  themeBtn.className = 'theme-toggle expanded';
  if (current) {
    themeBtn.classList.add('green');
    themeBtn.textContent = `${minutesLeft}хв`;
  } else if (upcomingDiff !== Infinity) {
    themeBtn.classList.add('yellow');
    themeBtn.textContent = `${upcomingDiff}хв`;
  } else {
    themeBtn.classList.add('purple');
    themeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
  }
}
// --- ---

// Завантаження налаштувань
function loadSettings() {
  const savedTheme = localStorage.getItem('theme');
  // Встановлюємо тему ДО того, як завантажувати інші налаштування
  if (savedTheme === 'dark') document.body.classList.add('dark-mode');
  else document.body.classList.remove('dark-mode');
  // РЯДОК (themeBtn.textContent = ...) ВИДАЛЕНО ЗВІДСИ

  const subgroup = getCookie('subgroupFilter');
  if (subgroup && subgroupFilter) subgroupFilter.value = subgroup;
  else if (subgroupFilter) subgroupFilter.value = 'all'; // За замовчуванням

  const showAll = getCookie('showAllWeeks');
  if (showAllWeeks) showAllWeeks.checked = (showAll === 'true');

  const hideEmpty = getCookie('hideEmptyLessons');
  if (hideEmptyLessons) hideEmptyLessons.checked = (hideEmpty === 'true');

  const showNext = getCookie('showNextWeek');
  if (showNextWeekBtn) {
      if (showNext === 'true') showNextWeekBtn.classList.add('active');
      else showNextWeekBtn.classList.remove('active');
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
function handleCancelClick(e) {
    if (e.target?.classList.contains('cancel-btn')) { // Безпечний доступ
        const id = e.target.dataset.lessonId;
        toggleCanceledLesson(id);
        filterSchedule();
        vibrate();
    }
}
// --- ---

// --- Звіти та Статистика ---
function generateReports() {
    if (!scheduleData?.schedule) return;
    const stats = calculateStatistics();
    const totalLessonsEl = document.getElementById('totalLessons');
    const subjectsBreakdown = document.getElementById('subjectsBreakdown');
    if (totalLessonsEl) totalLessonsEl.textContent = stats.totalLessons || 0;
    if (subjectsBreakdown) {
        subjectsBreakdown.innerHTML = Array.from(stats.subjectTypes?.entries() || []) // Безпечний доступ
            .map(([subject, types]) => `
              <div class="subject-item">
                <div class="subject-name">${subject}</div>
                <div class="subject-types">${Array.from(types || []).map(getTypeLabel).join(', ')}</div>
              </div>`).join('');
    }
}
function calculateStatistics() {
    const stats = { subjects: new Set(), teachers: new Set(), subjectTypes: new Map(), totalLessons: 0, busyDays: 0 };
    if (!scheduleData?.schedule) return stats;

    Object.values(scheduleData.schedule).forEach(day => {
        if (!day?.lessons) return;
        let dayHasLessons = false;
        day.lessons.forEach(lesson => {
            const hasSubgroups = Array.isArray(lesson?.subgroups) && lesson.subgroups.length > 0;
            const isEmpty = (lesson?.type === 'empty' || !lesson?.subject) && !hasSubgroups;
            if (isEmpty) return;

            let lessonCounted = false;
            const processItem = (item, isSubgroup) => {
                if (!item?.subject) return;
                dayHasLessons = true;
                if (!isSubgroup || !lessonCounted) { // Рахуємо пару один раз
                    stats.totalLessons++;
                    lessonCounted = true;
                }
                stats.subjects.add(item.subject);
                if (item.teacher) stats.teachers.add(item.teacher);
                if (!stats.subjectTypes.has(item.subject)) stats.subjectTypes.set(item.subject, new Set());
                if(item.type) stats.subjectTypes.get(item.subject).add(item.type);
            };

            processItem(lesson, false); // Обробка основної пари
            if (hasSubgroups) lesson.subgroups.forEach(sub => processItem(sub, true)); // Обробка підгруп
        });
        if (dayHasLessons) stats.busyDays++;
    });
    return stats;
}
// --- ---

// --- Модальне вікно Імпорту/Експорту ---
function initModal() {
  settingsModal = document.getElementById('settingsModal');
  modalClose = document.getElementById('modalClose');
  importBtn = document.getElementById('importBtn');
  importFile = document.getElementById('importFile');
  exportBtn = document.getElementById('exportBtn');
  deleteBtn = document.getElementById('deleteBtn');
  importStatusEl = document.getElementById('importStatus');

  if (!settingsModal || !modalClose || !importBtn || !importFile || !exportBtn || !deleteBtn || !importStatusEl) {
      console.warn('Modal elements not found for initModal'); return;
  }
  modalClose.onclick = () => { settingsModal.style.display = 'none'; }
  window.onclick = (event) => { if (event.target == settingsModal) settingsModal.style.display = 'none'; }

  importBtn.onclick = () => importFile?.click();
  importFile.onchange = (event) => {
      const file = event.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result; if (typeof text !== 'string') throw new Error('Cannot read file');
              const jsonData = JSON.parse(text);
              localStorage.setItem(SCHEDULE_STORAGE_KEY, text);
              if (importStatusEl) { importStatusEl.textContent = '✅ Імпортовано! Сторінка зараз оновиться.'; importStatusEl.className = 'status success active'; }
              setTimeout(() => location.reload(), 1500);
          } catch (err) {
              console.error('Import error:', err);
              if (importStatusEl) { importStatusEl.textContent = '❌ Помилка! Невірний формат файлу.'; importStatusEl.className = 'status error active';}
          }
      };
      reader.onerror = () => { console.error('File read error'); if (importStatusEl) { /* ... */ } };
      reader.readAsText(file);
      event.target.value = null;
  };

  exportBtn.onclick = () => {
      if (!scheduleData) { if(importStatusEl) { /* ... помилка ... */} return; }
      try {
          const dataStr = JSON.stringify(scheduleData, null, 2);
          const dataBlob = new Blob([dataStr], {type: 'application/json'});
          const url = URL.createObjectURL(dataBlob);
          const a = document.createElement('a'); a.href = url;
          a.download = `${scheduleData.group?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'schedule'}.json`; // Безпечна назва
          a.click(); URL.revokeObjectURL(url); a.remove();
          if (importStatusEl) { importStatusEl.textContent = '✅ Експортовано!'; importStatusEl.className = 'status info active'; }
      } catch (err) {
          console.error('Export error:', err); if (importStatusEl) { /* ... помилка ... */}
      }
  };
  deleteBtn.onclick = () => {
      if (confirm('Видалити ваш розклад і повернути стандартний?')) {
          localStorage.removeItem(SCHEDULE_STORAGE_KEY);
          if (importStatusEl) { importStatusEl.textContent = '✅ Видалено! Сторінка зараз оновиться.'; importStatusEl.className = 'status error active';}
          setTimeout(() => location.reload(), 1500);
      }
  };
}
// --- ---


// === Ініціалізація додатку ===
async function initApp() {
    console.log("Initializing app..."); // Логування старту

    // Знаходимо елементи DOM якомога раніше
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
    console.log("Settings loaded.");

    const data = await loadScheduleData();
    if (!data) {
        console.error("Failed to load schedule data. Stopping initialization.");
        // Повідомлення про помилку вже виведено в loadScheduleData
        return;
    }
    console.log("Schedule data loaded:", data);

    const titleEl = document.getElementById('schedule-title');
    if (titleEl) titleEl.textContent = `Розклад занять`;

generateNavigation();
console.log("Navigation generated.");
document.getElementById('navigation').addEventListener('click', (event) => {
    // Знаходимо, чи був клік саме по посиланню, яке нас цікавить
    const link = event.target.closest('a[data-day-id]');

    if (link) {
        event.preventDefault(); // Забороняємо посиланню стрибати наверх
        const dayId = link.dataset.dayId; // Беремо ID дня з data-атрибута

        // Викликаємо нашу функцію scrollToDay (зсередини модуля це працює!)
        scrollToDay(dayId);
    }
});
generateSchedule();
    console.log("Schedule generated.");

    // Обробники подій
    toggleFiltersBtn?.addEventListener('click', () => {
        if (advancedFiltersPanel) {
            const isVisible = advancedFiltersPanel.style.display === 'block';
            advancedFiltersPanel.style.display = isVisible ? 'none' : 'block';
            if(toggleFiltersBtn) toggleFiltersBtn.textContent = isVisible ? '⚙️ Фільтри' : '⚙️ Сховати'; // Перевірка toggleFiltersBtn
        }
    });
    openModalBtn?.addEventListener('click', () => {
        if (settingsModal) settingsModal.style.display = 'block';
        if (importStatusEl) importStatusEl.textContent = '';
        if (importStatusEl) importStatusEl.className = 'status'; // Скидаємо клас статусу
    });
    showNextWeekBtn?.addEventListener('click', () => {
        showNextWeekBtn.classList.toggle('active');
        filterSchedule();
    });
    subgroupFilter?.addEventListener('change', filterSchedule);
    showAllWeeks?.addEventListener('change', filterSchedule);
    hideEmptyLessons?.addEventListener('change', filterSchedule);
    document.getElementById('schedule-container')?.addEventListener('click', handleCancelClick);
    console.log("Event listeners added.");

    initModal(); // Ініціалізуємо модальне вікно
    handleUpdateModal(); // <--- ДОДАЙТЕ ЦЕЙ РЯДОК
    console.log("Modal initialized.");

    // Перший запуск фільтрації ПІСЛЯ того, як всі елементи створено
    filterSchedule();

// --- Модальне вікно "Що нового" ---
function handleUpdateModal() {
  // 1. Знаходимо елементи
  const updateModal = document.getElementById('updateModal');
  const closeUpdateBtn = document.getElementById('closeUpdateBtn');

  // Якщо елементи не знайдені, нічого не робимо
  if (!updateModal || !closeUpdateBtn) {
    console.warn('Елементи модального вікна оновлень не знайдені.');
    return; 
  }

  // 2. Встановлюємо ключові змінні
  const storageKey = 'seenUpdate_Oct2025_v1'; // Унікальний ключ для цього оновлення
  // 29 Жовтня 2025, 23:59:59 (місяці в JS рахуються з 0, тому 9 = Жовтень)
  const deadline = new Date(2025, 9, 29, 23, 59, 59); 
  const today = new Date(); // Сьогодні 25.10.2025

  // 3. Перевіряємо, чи бачив користувач це вікно
  const hasSeenPopup = localStorage.getItem(storageKey);

  // 4. ГОЛОВНА ЛОГІКА:
  //    Показуємо, якщо:
  //    а) Сьогоднішня дата ще НЕ пізніша за дедлайн
  //    б) Користувач ще НЕ бачив це вікно (!hasSeenPopup)
  if (today <= deadline && !hasSeenPopup) {
    updateModal.style.display = 'block'; // Показуємо вікно
  }

  // 5. Функція, яка закриває вікно і зберігає позначку
  const closeAndMarkAsSeen = () => {
    updateModal.style.display = 'none'; // Ховаємо вікно

    // ВАЖЛИВО: Зберігаємо позначку в localStorage
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (e) {
      console.error('Не вдалося зберегти в localStorage:', e);
    }
  };

  // 6. Додаємо обробники подій для закриття

  // Закриття по натисканню на 'х'
  closeUpdateBtn.addEventListener('click', closeAndMarkAsSeen);

  // (Як у вашій функції initModal) Закриття по кліку на темний фон
  updateModal.addEventListener('click', (event) => {
    // Якщо клікнули саме на фон (а не на вміст вікна)
    if (event.target === updateModal) {
      closeAndMarkAsSeen();
    }
  });
}
// --- Кінець блоку модального вікна ---
// ...
  initModal(); // Ініціалізуємо модальне вікно
  handleUpdateModal(); 
  console.log("Modal initialized.");

  // Перший запуск фільтрації ПІСЛЯ того, як всі елементи створено
  filterSchedule();
  console.log("Initial filter applied.");

  highlightToday(); // Виділяємо сьогоднішній день
  scrollToCorrectDay();
    updateNavText(); // Оновлюємо текст навігації
    generateReports(); // Генеруємо звіти
    console.log("UI updated.");

    const loadingEl = document.getElementById('loading');
    const containerEl = document.getElementById('schedule-container');
    if (loadingEl) loadingEl.style.display = 'none';
    if (containerEl) containerEl.style.display = 'block';
    console.log("App ready.");
}

// Запуск додатку
document.addEventListener('DOMContentLoaded', initApp);

// Оновлення кожну хвилину
const minuteUpdater = setInterval(() => {
  highlightCurrentPair();
  updateThemeButtonTime(); // <--- ДОДАНО
}, 60000);

// Обробка зміни розміру екрану
window.addEventListener('resize', updateNavText);

// === НОВИЙ КОД (ВСТАВ ЗАМІСТЬ СТАРОГО) ===
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    
    let waitingServiceWorker; // Змінна для збереження "очікуючого" SW
    let isReloading = false; // Прапорець, щоб уникнути подвійного перезавантаження

    // 1. Знаходимо елементи (нову панель оновлення ТА стару навігацію)
    const updateBar = document.getElementById('update-bar');
    const updateButton = document.getElementById('update-now-btn');
    const navigation = document.getElementById('navigation'); // Твоя навігація (Пн, Вт...)

    // 2. Логіка кнопки "Оновити"
    if (updateButton && updateBar) {
      updateButton.addEventListener('click', () => {
        if (waitingServiceWorker) {
          console.log('[App] Користувач натиснув "Оновити". Надсилаємо команду SKIP_WAITING...');
          
          // Надсилаємо команду Service Worker'у, щоб він активувався
          waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
          updateBar.style.display = 'none'; // Ховаємо панель оновлення
        }
      });
    }

    // 3. Функція, що відстежує оновлення
    const trackUpdates = (registration) => {
      registration.addEventListener('updatefound', () => {
        console.log('[App] Знайдено оновлення! Встановлюємо...');
        
        const newWorker = registration.installing;

        newWorker.addEventListener('statechange', () => {
          console.log('[App] Стан нового SW змінився:', newWorker.state);
          
          // Коли новий SW успішно встановився і ЧЕКАЄ на активацію
          if (newWorker.state === 'installed') {
            // Перевіряємо, чи сторінка вже контролюється (тобто це оновлення)
            if (navigator.serviceWorker.controller) {
              console.log('[App] Новий SW очікує. Блокуємо навігацію.');
              waitingServiceWorker = newWorker; // Зберігаємо його
              
              // === ГОЛОВНА ЛОГІКА (ЯК ТИ ХОТІВ) ===
              if (navigation) navigation.style.display = 'none'; // Ховаємо навігацію
              if (updateBar) updateBar.style.display = 'flex'; // Показуємо твою панель!
            }
          }
        });
      });
    };

    // 4. Реєструємо Service Worker
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('Service Worker зареєстровано успішно:', registration);
        
        // Запускаємо відстеження оновлень
        trackUpdates(registration);
      })
      .catch((error) => {
        console.error('Помилка реєстрації Service Worker:', error);
      });

    // 5. Слухач для перезавантаження
    // Спрацьовує, коли новий SW (після SKIP_WAITING) стає "головним"
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[App] Контролер змінився! Перезавантажуємо сторінку...');
      if (!isReloading) {
        window.location.reload();
        isReloading = true;
      }
    });
    
  }
});




