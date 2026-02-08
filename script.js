// Ключ для збереження кастомного розкладу в пам'яті браузера
const SCHEDULE_STORAGE_KEY = 'myCustomSchedule';

// === Глобальні змінні ===
let scheduleData = null;
let themeAutoHideTimer;
let subgroupFilter, showAllWeeks, hideEmptyLessons, showNextWeekBtn;
let toggleFiltersBtn, advancedFiltersPanel, openModalBtn, settingsModal, modalClose;
let importBtn, importFile, exportBtn, deleteBtn, importStatusEl;
const themeBtn = document.getElementById('themeBtn');
const cssRoot = document.documentElement;

// =======================================
// === УТИЛІТИ (Cookies) ===
// =======================================

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

// =======================================
// === ЛОГІКА СКАСОВАНИХ ПАР ===
// =======================================

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
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return Infinity;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function loadCanceledLessons() {
    const cookie = getCookie('canceledLessons');
    if (!cookie) return { asSet: new Set(), asList: [] };
    let list = [];
    try { list = JSON.parse(cookie); if (!Array.isArray(list)) list = []; } catch (e) { list = []; }
    const today = getTodayDateString();
    const cleanedList = list.filter(item => item && item.id && item.canceledOn && daysDifference(item.canceledOn, today) < 7);
    if (cleanedList.length < list.length) setCookie('canceledLessons', JSON.stringify(cleanedList));
    return { asSet: new Set(cleanedList.map(item => item.id)), asList: cleanedList };
}

function toggleCanceledLesson(id) {
    if (!id) return;
    const { asList } = loadCanceledLessons();
    const today = getTodayDateString();
    const index = asList.findIndex(item => item.id === id);
    if (index > -1) asList.splice(index, 1); else asList.push({ id: id, canceledOn: today });
    setCookie('canceledLessons', JSON.stringify(asList));
}

// =======================================
// === ЛОГІКА ТИЖНІВ ТА ДАТ ===
// =======================================

function getISOWeek(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return NaN;
    const d = new Date(date.getTime()); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = ((d - yearStart) / 86400000) + 1;
    return Math.ceil((dayOfYear - d.getDay() + 4) / 7);
}

function getCurrentType() {
    const showNextWeek = showNextWeekBtn?.classList.contains('active') || false;
    const now = new Date();
    if (showNextWeek) now.setDate(now.getDate() + 7);

    const startSemesterStr = scheduleData?.startDate;
    if (!startSemesterStr) {
        const currentWeekNum = getISOWeek(now);
        return isNaN(currentWeekNum) || currentWeekNum % 2 !== 0 ? 'num' : 'den';
    }

    const startSemester = new Date(startSemesterStr);
    if (isNaN(startSemester.getTime())) {
        const currentWeekNum = getISOWeek(now);
        return isNaN(currentWeekNum) || currentWeekNum % 2 !== 0 ? 'num' : 'den';
    }

    const weekStart = getISOWeek(startSemester);
    const currentWeek = getISOWeek(now);

    if (isNaN(weekStart) || isNaN(currentWeek)) return 'num';

    const startWeekIsOdd = weekStart % 2 !== 0;
    const currentWeekIsOdd = currentWeek % 2 !== 0;
    const isNumerator = startWeekIsOdd === currentWeekIsOdd;

    return isNumerator ? 'num' : 'den';
}

function getWeekDates(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) date = new Date();
    const d = new Date(date); const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    const friday = new Date(monday); friday.setDate(friday.getDate() + 4);
    return { start: monday, end: friday };
}

// =======================================
// === ЗАВАНТАЖЕННЯ ТА ГЕНЕРАЦІЯ UI ===
// =======================================

async function loadScheduleData() {
    const customSchedule = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (customSchedule) {
        try {
            scheduleData = JSON.parse(customSchedule);
            if (typeof scheduleData !== 'object' || scheduleData === null) throw new Error("Invalid data format");
            return scheduleData;
        } catch (e) {
            localStorage.removeItem(SCHEDULE_STORAGE_KEY);
        }
    }
    try {
        // Перевіряємо, чи є збережений розклад з редактора
const savedSchedule = localStorage.getItem('scheduleData');

if (savedSchedule) {
    const data = JSON.parse(savedSchedule);
    console.log("Знайдено локальний розклад:", data);
    
    // Тут треба викликати твою функцію відображення, наприклад:
    // renderSchedule(data); 
    // displaySchedule(data);
    
    // АБО просто замінити глобальну змінну, якщо вона в тебе є.
} else {
    // Якщо немає - вантажимо стандартний JSON
    fetch('schedule.json')...
}
        const response = await fetch('./schedule.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        scheduleData = await response.json();
        return scheduleData;
    } catch (error) {
        console.error('Помилка завантаження розкладу:', error);
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = `<div style="color: #d32f2f; text-align: center;"><h3>❌ Помилка завантаження</h3><p>${error.message}</p></div>`;
        }
        return null;
    }
}

function generateNavigation() {
    const nav = document.getElementById('navigation');
    if (!nav || !scheduleData?.schedule) return;
    const days = Object.keys(scheduleData.schedule);
    nav.innerHTML = days.map(dayKey => {
        const day = scheduleData.schedule[dayKey];
        // Перевіряємо, чи є пари в цей день
        const hasLessons = day && day.lessons && day.lessons.some(l => l.type !== 'empty');
        if (!hasLessons) return ''; // Не показуємо пусті дні

        const dayName = day.name || dayKey;
        const shortName = getShortDayName(dayName);
        return `<a href="#" data-day-id="${dayKey}" data-full="${dayName}" data-short="${shortName}">${dayName}</a>`;
    }).join('');
}

function getShortDayName(fullName) {
    // Виправлено апостроф
    const shortNames = { 'Понеділок': 'ПН', 'Вівторок': 'ВТ', 'Середа': 'СР', 'Четвер': 'ЧТ', 'П’ятниця': 'ПТ' };
    return shortNames[fullName] || fullName?.substring(0, 2).toUpperCase() || '?';
}

function generateSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container || !scheduleData?.schedule) return;
    const days = Object.keys(scheduleData.schedule);
    container.innerHTML = days.map(dayKey => {
        const day = scheduleData.schedule[dayKey];
        const hasLessons = day && day.lessons && day.lessons.some(l => l.type !== 'empty');
        if (!hasLessons) return ''; // Не показуємо пусті дні

        return `<section class="day" id="${dayKey}"><h2>${day.name || dayKey}</h2><div class="cards">${day.lessons.map(lesson => generateLessonCard(lesson, dayKey)).join('')}</div></section>`;
    }).join('');
}

function generateLessonCard(lesson, dayKey) {
    if (!lesson) return '';
    const hasSubgroups = Array.isArray(lesson.subgroups) && lesson.subgroups.length > 0;
    const isEmpty = (lesson.type === 'empty' || !lesson.subject) && !hasSubgroups;

    let cardClass = isEmpty ? 'card empty' : `card ${lesson.type || 'unknown'}`;
    if (!hasSubgroups && lesson.weeks && (lesson.weeks === 'num' || lesson.weeks === 'den')) {
        cardClass += ` numden ${lesson.weeks}`;
    }
    const lessonId = `lesson-${dayKey}-${lesson.number || '?'}`;

    if (isEmpty) {
        return `<article class="${cardClass}" id="${lessonId}"><h3>${lesson.number || '?'} пара</h3><p class="empty-message">Немає</p></article>`;
    }

    const createLinkButton = (link) => {
        if (!link) return '';
        if (!link.startsWith('http://') && !link.startsWith('https://')) link = 'https://' + link;
        return `<a href="${link}" target="_blank" rel="noopener" class="join-svg-btn" title="Приєднатись до пари"><svg class="join-svg" viewBox="0 0 24 24"><circle class="svg-pulse" cx="12" cy="12" r="8"></circle><circle class="svg-dot" cx="12" cy="12" r="5"></circle></svg></a>`;
    };

    let subgroupsHtml = '';
    let mainContent = '';
    let mainLinkBtn = '';

    if (hasSubgroups) {
        subgroupsHtml = lesson.subgroups.map(sub => {
            if (!sub) return '';
            const subClass = getSubgroupClass(sub);
            const subLabel = getSubgroupLabel(sub);

            // Генерація підписів для підгруп
            let weekLabel = '';
            if (sub.weeks === 'num') weekLabel = '<span class="week-label num-label"> (Чисельник)</span>';
            else if (sub.weeks === 'den') weekLabel = '<span class="week-label den-label"> (Знаменник)</span>';

            const subLinkBtn = createLinkButton(sub.link);
            return `<div class="subgroup ${subClass}"><p class="subgroup-label">${subLabel}${weekLabel}</p><p><b>${sub.subject || '?'}</b> (${getTypeLabel(sub.type)})</p><p class="teacher-room">${sub.teacher || ''}${sub.room ? ', ' + sub.room : ''}</p>${subLinkBtn}</div>`;
        }).join('');
    } else if (lesson.subject) {
        // Генерація підписів для звичайної пари (НОВЕ)
        let mainWeekLabel = '';
        if (lesson.weeks === 'num') mainWeekLabel = '<span class="week-label num-label"> (Чисельник)</span>';
        else if (lesson.weeks === 'den') mainWeekLabel = '<span class="week-label den-label"> (Знаменник)</span>';

        mainContent = `<p data-main-content="true"><b>${lesson.subject}</b>${mainWeekLabel} (${getTypeLabel(lesson.type)})</p><p class="teacher-room">${lesson.teacher || ''}${lesson.room ? ', ' + lesson.room : ''}</p>`;
        mainLinkBtn = createLinkButton(lesson.link);
    }

    return `<article class="${cardClass}" id="${lessonId}"><h3>${lesson.number || '?'} пара<button class="cancel-btn" title="Скасувати/повернути пару" data-lesson-id="${lessonId}">❌</button></h3>${mainContent}${subgroupsHtml}${mainLinkBtn}<p class="time">${lesson.time || '??:?? - ??:??'}</p></article>`;
}

function getSubgroupClass(sub) { return (sub?.weeks ? `numden ${sub.weeks}` : '') + (sub?.group ? ` ${sub.group}` : ''); }
function getSubgroupLabel(sub) { if (sub?.group === 'sub1') return 'Підгрупа 1'; if (sub?.group === 'sub2') return 'Підгрупа 2'; return ''; }
function getTypeLabel(type) { const types = { 'lecture': 'Лекція', 'practical': 'Практична', 'lab': 'Лабораторна', 'mixed': 'Змішана' }; return types[type] || type || '?'; }

// =======================================
// === ГОЛОВНИЙ ФІЛЬТР ===
// =======================================

function filterSchedule() {
    const subgroup = subgroupFilter?.value || 'all';
    const showAll = showAllWeeks?.checked || false;
    const hideEmpty = hideEmptyLessons?.checked || false;
    const canceledLessonIds = loadCanceledLessons().asSet;
    const currentType = getCurrentType();
    const cards = document.querySelectorAll('#schedule-container .card');

    // Фільтри для приховування елементів
    const hideTotalLessons = document.getElementById('hideTotalLessons')?.checked || false;
    const hideSubjectsType = document.getElementById('hideSubjectsType')?.checked || false;
    const hideDonate = document.getElementById('hideDonate')?.checked || false;

    const totalLessonsCard = document.getElementById('totalLessonsCard');
    const donateBtn = document.getElementById('donateBtn');

    if (totalLessonsCard) totalLessonsCard.style.display = hideTotalLessons ? 'none' : 'flex';

    // Ховаємо статистику
    const reportsBlock = document.querySelector('.reports');
    if (reportsBlock) reportsBlock.style.display = hideSubjectsType ? 'none' : 'block';

    if (donateBtn) donateBtn.style.display = hideDonate ? 'none' : 'block';

    if (showNextWeekBtn) {
        const isDisabled = showAll;
        showNextWeekBtn.disabled = isDisabled;
        showNextWeekBtn.style.opacity = isDisabled ? '0.5' : '1';
        showNextWeekBtn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
        if (isDisabled) showNextWeekBtn.classList.remove('active');
    }

    cards.forEach(card => {
        if (!card) return;
        let emptyMsg = card.querySelector('.empty-message');
        const timeEl = card.querySelector('.time');
        const mainContentEl = card.querySelector('p[data-main-content]');
        const teacherRoomEl = card.querySelector('.teacher-room');
        const subgroups = card.querySelectorAll('.subgroup');
        const h3El = card.querySelector('h3');
        const joinBtn = card.querySelector('.join-svg-btn');

        const isCanceled = canceledLessonIds.has(card.id);
        card.classList.toggle('canceled', isCanceled);

        if (isCanceled) {
            if (!emptyMsg && h3El) { emptyMsg = document.createElement('p'); emptyMsg.className = 'empty-message'; h3El.insertAdjacentElement('afterend', emptyMsg); }
            if (emptyMsg) { emptyMsg.textContent = 'Скасовано'; emptyMsg.style.display = 'block'; }
            if (timeEl) timeEl.style.display = 'none';
            if (mainContentEl) mainContentEl.style.display = 'none';
            if (teacherRoomEl) teacherRoomEl.style.display = 'none';
            if (joinBtn) joinBtn.style.display = 'none';
            subgroups.forEach(sub => sub.style.display = 'none');
            card.style.display = 'flex';
            card.classList.remove('empty');
            return;
        }

        if (emptyMsg) { if (emptyMsg.textContent === 'Скасовано') emptyMsg.remove(); else emptyMsg.style.display = 'none'; }
        if (timeEl) timeEl.style.display = 'block';
        if (mainContentEl) mainContentEl.style.display = 'block';
        if (teacherRoomEl) teacherRoomEl.style.display = 'block';
        if (joinBtn) joinBtn.style.display = 'block';

        let hasVisibleContent = false;

        if (mainContentEl) {
            let mainVisible = true;
            if (!showAll) {
                const weekType = card.classList.contains('num') ? 'num' : (card.classList.contains('den') ? 'den' : 'all');
                if (weekType !== 'all' && weekType !== currentType) mainVisible = false;
            }
            if (mainVisible) hasVisibleContent = true;
            else {
                mainContentEl.style.display = 'none';
                if (teacherRoomEl) teacherRoomEl.style.display = 'none';
                if (joinBtn) joinBtn.style.display = 'none';
            }
        }

        if (subgroups.length > 0) {
            subgroups.forEach(sub => {
                if (!sub) return;
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

        if (card.classList.contains('empty') && !mainContentEl && subgroups.length === 0) {
            hasVisibleContent = false;
        }

        if (hasVisibleContent) {
            card.classList.remove('empty');
            card.style.display = 'flex';
            if (timeEl) timeEl.style.display = 'block';
            if (emptyMsg) emptyMsg.style.display = 'none';
        } else {
            if (!card.classList.contains('empty')) card.classList.add('empty');
            if (timeEl) timeEl.style.display = 'none';
            if (!emptyMsg && h3El) { emptyMsg = document.createElement('p'); emptyMsg.className = 'empty-message'; h3El.insertAdjacentElement('afterend', emptyMsg); }
            if (emptyMsg) { emptyMsg.textContent = 'Немає'; emptyMsg.style.display = 'block'; }
            card.style.display = hideEmpty ? 'none' : 'flex';
        }
    });

    // === ВИПРАВЛЕННЯ ТУТ ===
    // Ми завжди показуємо підписи, або показуємо їх, якщо showAll = true.
    // Оскільки користувач хоче бачити підписи, коли дивиться "Всі тижні", ставимо 'inline'.
    const weekLabels = document.querySelectorAll('.week-label');
    weekLabels.forEach(label => label.style.display = 'inline');

    updateWeekInfo();
    highlightCurrentPair();
    saveSettings();
    generateReports();
}

// =======================================
// === ЛОГІКА ПРОКРУТКИ ===
// =======================================

function scrollToDay(dayId) {
    const el = document.getElementById(dayId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getLastVisibleLessonEndTime(dayKey) {
    const daySection = document.getElementById(dayKey);
    if (!daySection) return 0;
    const visibleCards = daySection.querySelectorAll('.card:not(.empty):not(.canceled)');
    let maxEndTime = 0;
    visibleCards.forEach(card => {
        if (card.style.display === 'none') return;
        const timeEl = card.querySelector('.time');
        if (!timeEl || !timeEl.textContent) return;
        const timeMatch = timeEl.textContent.match(/(\d{2}):(\d{2})\s*–\s*(\d{2}):(\d{2})/);
        if (!timeMatch) return;
        const endHour = parseInt(timeMatch[3], 10);
        const endMin = parseInt(timeMatch[4], 10);
        if (isNaN(endHour) || isNaN(endMin)) return;
        const endTimeInMinutes = endHour * 60 + endMin;
        if (endTimeInMinutes > maxEndTime) maxEndTime = endTimeInMinutes;
    });
    return maxEndTime;
}

function scrollToCorrectDay() {
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const todayIndex = today.getDay();
    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    const todayKey = dayKeys[todayIndex];

    const todayLastLessonEnd = getLastVisibleLessonEndTime(todayKey);

    if (todayLastLessonEnd > 0 && currentMinutes <= todayLastLessonEnd) {
        console.log('Сьогодні ще є пари, відкриваємо:', todayKey);
        scrollToDay(todayKey);
        return;
    }

    console.log('Сьогодні пари закінчились або їх немає. Шукаємо наступний день...');
    for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (todayIndex + i) % 7;
        const nextDayKey = dayKeys[nextDayIndex];
        if (getLastVisibleLessonEndTime(nextDayKey) > 0) {
            console.log('Знайдено наступний день з парами:', nextDayKey);
            scrollToDay(nextDayKey);
            return;
        }
    }
    // Fallback
    scrollToDay('monday');
}

// ==============================
// === ОНОВЛЕННЯ UI ===
// ==============================

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

        if (showNextWeek) {
            const bodyStyles = getComputedStyle(document.body);
            const accentColor = document.body.classList.contains('dark-mode') ?
                bodyStyles.getPropertyValue('--accent-dark') :
                bodyStyles.getPropertyValue('--accent-secondary');
            infoSpan.style.color = accentColor || '';
        } else {
            infoSpan.style.color = '';
        }

        const type = getCurrentType();
        const dates = getWeekDates(date);
        const typeName = type === 'num' ? 'Чисельник' : 'Знаменник';
        const prefix = showNextWeek ? 'Наст. тиждень: ' : '';
        const startDateStr = !isNaN(dates.start.getTime()) ? dates.start.toLocaleDateString('uk-UA') : '??.??.????';
        const endDateStr = !isNaN(dates.end.getTime()) ? dates.end.toLocaleDateString('uk-UA') : '??.??.????';
        infoSpan.innerHTML = `${prefix}${typeName} <span class="week-date">(${startDateStr} – ${endDateStr})</span>`;
    }
}

function updateNavText() {
    const isMobile = window.innerWidth <= 600;
    document.querySelectorAll('nav a').forEach(link => {
        link.textContent = isMobile ? link.dataset.short : link.dataset.full;
    });
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
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
        const dayName = scheduleData?.schedule?.[todayKey]?.name;
        if (dayName && link.dataset.full === dayName) link.classList.add('active-day');
    });
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
        if (!timeP?.textContent) return;
        const timeMatch = timeP.textContent.match(/(\d{2}):(\d{2})\s*–\s*(\d{2}):(\d{2})/);
        if (!timeMatch) return;

        const [, startHour, startMin, endHour, endMin] = timeMatch.map(Number);
        if ([startHour, startMin, endHour, endMin].some(isNaN)) return;

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            currentCard = card;
            return;
        }
        if (startMinutes > currentMinutes) {
            const diff = startMinutes - currentMinutes;
            if (diff < minDiffToStart) { minDiffToStart = diff; upcomingCard = card; }
        }
    });

    cards.forEach(c => c.classList.remove('current', 'upcoming'));
    if (currentCard) currentCard.classList.add('current');
    if (upcomingCard && minDiffToStart <= 60) upcomingCard.classList.add('upcoming');
}

// ==============================
// === ПЛАВАЮЧА КНОПКА ТЕМИ ===
// ==============================

let themeClickCount = 0;
let themeClickTimer;

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        themeClickCount++;
        if (themeClickCount === 1) {
            themeClickTimer = setTimeout(() => { themeClickCount = 0; }, 10000);
        }
        if (themeClickCount >= 10) {
            clearTimeout(themeClickTimer);
            themeClickCount = 0;
            triggerGravity();
        }

        if (!themeBtn.classList.contains('expanded')) {
            themeBtn.classList.add('expanded');
            updateThemeButtonTime();
            vibrate();
            clearTimeout(themeAutoHideTimer);
            themeAutoHideTimer = setTimeout(() => {
                themeBtn.classList.remove('expanded');
                themeBtn.textContent = '';
                vibrate();
            }, 3000);
        } else {
            toggleDarkMode();
            updateThemeButtonTime();
            vibrate();
            clearTimeout(themeAutoHideTimer);
            themeAutoHideTimer = setTimeout(() => {
                themeBtn.classList.remove('expanded');
                themeBtn.textContent = '';
                vibrate();
            }, 2000);
        }
    });
}

function vibrate() { if (navigator.vibrate) navigator.vibrate(50); }

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

// ==============================
// === НАЛАШТУВАННЯ ===
// ==============================

function loadSettings() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');

    const subgroup = getCookie('subgroupFilter');
    if (subgroup && subgroupFilter) subgroupFilter.value = subgroup;
    else if (subgroupFilter) subgroupFilter.value = 'all';

    const showAll = getCookie('showAllWeeks');
    if (showAllWeeks) showAllWeeks.checked = (showAll === 'true');

    const hideEmpty = getCookie('hideEmptyLessons');
    if (hideEmptyLessons) hideEmptyLessons.checked = (hideEmpty === 'true');

    const showNext = getCookie('showNextWeek');
    if (showNextWeekBtn) {
        if (showNext === 'true') showNextWeekBtn.classList.add('active');
        else showNextWeekBtn.classList.remove('active');
    }

    // Завантаження нових фільтрів
    const hideTotal = getCookie('hideTotalLessons');
    const hideSubj = getCookie('hideSubjectsType');
    const hideDon = getCookie('hideDonate');

    const hideTotalEl = document.getElementById('hideTotalLessons');
    const hideSubjEl = document.getElementById('hideSubjectsType');
    const hideDonEl = document.getElementById('hideDonate');

    if (hideTotalEl) hideTotalEl.checked = (hideTotal === 'true');
    if (hideSubjEl) hideSubjEl.checked = (hideSubj === 'true');
    if (hideDonEl) hideDonEl.checked = (hideDon === 'true');

    // Завантаження disableUpdates
    const disableUpd = getCookie('disableUpdates');
    const disableUpdEl = document.getElementById('disableUpdates');
    if (disableUpdEl) disableUpdEl.checked = (disableUpd === 'true');
}

function saveSettings() {
    if (subgroupFilter) setCookie('subgroupFilter', subgroupFilter.value);
    if (showAllWeeks) setCookie('showAllWeeks', showAllWeeks.checked ? 'true' : 'false');
    if (hideEmptyLessons) setCookie('hideEmptyLessons', hideEmptyLessons.checked ? 'true' : 'false');
    if (showNextWeekBtn) setCookie('showNextWeek', showNextWeekBtn.classList.contains('active') ? 'true' : 'false');

    const hideTotalEl = document.getElementById('hideTotalLessons');
    const hideSubjEl = document.getElementById('hideSubjectsType');
    const hideDonEl = document.getElementById('hideDonate');
    const disableUpdEl = document.getElementById('disableUpdates');

    if (hideTotalEl) setCookie('hideTotalLessons', hideTotalEl.checked ? 'true' : 'false');
    if (hideSubjEl) setCookie('hideSubjectsType', hideSubjEl.checked ? 'true' : 'false');
    if (hideDonEl) setCookie('hideDonate', hideDonEl.checked ? 'true' : 'false');
    if (disableUpdEl) setCookie('disableUpdates', disableUpdEl.checked ? 'true' : 'false');
}

function handleCancelClick(e) {
    if (e.target?.classList.contains('cancel-btn')) {
        const id = e.target.dataset.lessonId;
        toggleCanceledLesson(id);
        filterSchedule();
        vibrate();
    }
}

// ==============================
// === ЗВІТИ ТА СТАТИСТИКА ===
// ==============================

function generateReports() {
    if (!scheduleData?.schedule) return;
    const stats = calculateStatistics();
    const totalLessonsEl = document.getElementById('totalLessons');
    const subjectsBreakdown = document.getElementById('subjectsBreakdown');

    if (totalLessonsEl) totalLessonsEl.textContent = stats.totalLessons || 0;

    if (subjectsBreakdown) {
        subjectsBreakdown.innerHTML = Array.from(stats.subjectTypes?.entries() || [])
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

    const subgroup = subgroupFilter?.value || 'all';
    const showAll = showAllWeeks?.checked || false;
    const currentType = getCurrentType();
    const canceledLessonIds = loadCanceledLessons().asSet;

    Object.entries(scheduleData.schedule).forEach(([dayKey, day]) => {
        if (!day?.lessons) return;
        let dayHasLessons = false;

        day.lessons.forEach(lesson => {
            const lessonId = `lesson-${dayKey}-${lesson.number}`;
            if (canceledLessonIds.has(lessonId)) return;

            const hasSubgroups = Array.isArray(lesson?.subgroups) && lesson.subgroups.length > 0;
            const isEmpty = (lesson?.type === 'empty' || !lesson?.subject) && !hasSubgroups;
            if (isEmpty) return;

            let isVisible = false;

            if (hasSubgroups) {
                const visibleSubgroups = lesson.subgroups.filter(sub => {
                    const subType = sub.group === 'sub1' ? 'sub1' : (sub.group === 'sub2' ? 'sub2' : 'all');
                    if (subgroup !== 'all' && subType !== 'all' && subType !== subgroup) return false;
                    if (!showAll) {
                        const weekType = sub.weeks || 'all';
                        if (weekType !== 'all' && weekType !== currentType) return false;
                    }
                    return true;
                });

                if (visibleSubgroups.length > 0) {
                    isVisible = true;
                    visibleSubgroups.forEach(sub => {
                        stats.subjects.add(sub.subject);
                        if (sub.teacher) stats.teachers.add(sub.teacher);
                        if (!stats.subjectTypes.has(sub.subject)) stats.subjectTypes.set(sub.subject, new Set());
                        if (sub.type) stats.subjectTypes.get(sub.subject).add(sub.type);
                    });
                }
            } else {
                // Main lesson logic
                isVisible = true;
                if (!showAll) {
                    const weekType = lesson.weeks || 'all';
                    if (weekType !== 'all' && weekType !== currentType) isVisible = false;
                }

                if (isVisible) {
                    stats.subjects.add(lesson.subject);
                    if (lesson.teacher) stats.teachers.add(lesson.teacher);
                    if (!stats.subjectTypes.has(lesson.subject)) stats.subjectTypes.set(lesson.subject, new Set());
                    if (lesson.type) stats.subjectTypes.get(lesson.subject).add(lesson.type);
                }
            }

            if (isVisible) {
                stats.totalLessons++;
                dayHasLessons = true;
            }
        });

        if (dayHasLessons) stats.busyDays++;
    });
    return stats;
}

// ==============================
// === МОДАЛЬНІ ВІКНА ===
// ==============================

function initModal() {
    settingsModal = document.getElementById('settingsModal');
    modalClose = document.getElementById('modalClose');
    importBtn = document.getElementById('importBtn');
    importFile = document.getElementById('importFile');
    exportBtn = document.getElementById('exportBtn');
    deleteBtn = document.getElementById('deleteBtn');
    importStatusEl = document.getElementById('importStatus');

    if (!settingsModal || !modalClose || !importBtn || !importFile || !exportBtn || !deleteBtn || !importStatusEl) return;

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
                console.error(err);
                if (importStatusEl) { importStatusEl.textContent = '❌ Помилка! Невірний формат файлу.'; importStatusEl.className = 'status error active'; }
            }
        };
        reader.readAsText(file);
        event.target.value = null;
    };

    exportBtn.onclick = () => {
        if (!scheduleData) return;
        try {
            const dataStr = JSON.stringify(scheduleData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a'); a.href = url;
            a.download = `${scheduleData.group?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'schedule'}.json`;
            a.click(); URL.revokeObjectURL(url); a.remove();
            if (importStatusEl) { importStatusEl.textContent = '✅ Експортовано!'; importStatusEl.className = 'status info active'; }
        } catch (err) { console.error(err); }
    };

    deleteBtn.onclick = () => {
        if (confirm('Видалити ваш розклад і повернути стандартний?')) {
            localStorage.removeItem(SCHEDULE_STORAGE_KEY);
            if (importStatusEl) { importStatusEl.textContent = '✅ Видалено! Сторінка зараз оновиться.'; importStatusEl.className = 'status error active'; }
            setTimeout(() => location.reload(), 1500);
        }
    };
}

function handleUpdateModal() {
    const updateModal = document.getElementById('updateModal');
    const closeUpdateBtn = document.getElementById('closeUpdateBtn');
    if (!updateModal || !closeUpdateBtn) return;

    const storageKey = 'seenUpdate_Oct2025_v1';
    const deadline = new Date(2025, 9, 29, 23, 59, 59);
    const today = new Date();
    const hasSeenPopup = localStorage.getItem(storageKey);

    if (today <= deadline && !hasSeenPopup) {
        updateModal.style.display = 'block';
    }

    const closeAndMarkAsSeen = () => {
        updateModal.style.display = 'none';
        try { localStorage.setItem(storageKey, 'true'); } catch (e) { }
    };

    closeUpdateBtn.addEventListener('click', closeAndMarkAsSeen);
    updateModal.addEventListener('click', (event) => {
        if (event.target === updateModal) closeAndMarkAsSeen();
    });
}

function initDonateModal() {
    const donateBtn = document.getElementById('donateBtn');
    const donateModal = document.getElementById('donateModal');
    const closeDonateBtn = document.getElementById('closeDonateBtn');

    if (!donateBtn || !donateModal || !closeDonateBtn) return;

    donateBtn.addEventListener('click', () => {
        donateModal.style.display = 'block';
    });

    closeDonateBtn.addEventListener('click', () => {
        donateModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === donateModal) {
            donateModal.style.display = 'none';
        }
    });
}

// ==============================
// === ГОЛОВНА ФУНКЦІЯ ЗАПУСКУ (INIT) ===
// ==============================

function setupEventListeners() {
    document.getElementById('navigation').addEventListener('click', (event) => {
        const link = event.target.closest('a[data-day-id]');
        if (link) {
            event.preventDefault();
            scrollToDay(link.dataset.dayId);
        }
    });

    toggleFiltersBtn?.addEventListener('click', () => {
        if (advancedFiltersPanel) {
            const isVisible = advancedFiltersPanel.style.display === 'block';
            advancedFiltersPanel.style.display = isVisible ? 'none' : 'block';
            if (toggleFiltersBtn) toggleFiltersBtn.textContent = isVisible ? '⚙️ Фільтри' : '⚙️ Сховати';
        }
    });

    openModalBtn?.addEventListener('click', () => {
        if (settingsModal) settingsModal.style.display = 'block';
        if (importStatusEl) { importStatusEl.textContent = ''; importStatusEl.className = 'status'; }
    });

    showNextWeekBtn?.addEventListener('click', () => {
        showNextWeekBtn.classList.toggle('active');
        filterSchedule();
    });

    subgroupFilter?.addEventListener('change', filterSchedule);
    showAllWeeks?.addEventListener('change', filterSchedule);
    hideEmptyLessons?.addEventListener('change', filterSchedule);

    // Додаткові фільтри
    document.getElementById('hideTotalLessons')?.addEventListener('change', filterSchedule);
    document.getElementById('hideSubjectsType')?.addEventListener('change', filterSchedule);
    document.getElementById('hideDonate')?.addEventListener('change', filterSchedule);
    document.getElementById('disableUpdates')?.addEventListener('change', saveSettings);

    document.getElementById('schedule-container')?.addEventListener('click', handleCancelClick);

    window.addEventListener('resize', updateNavText);
    setInterval(() => {
        highlightCurrentPair();
        updateThemeButtonTime();
    }, 60000);
}

async function initApp() {
    console.log("Initializing app...");
    subgroupFilter = document.getElementById('subgroupFilter');
    showAllWeeks = document.getElementById('showAllWeeks');
    hideEmptyLessons = document.getElementById('hideEmptyLessons');
    showNextWeekBtn = document.getElementById('showNextWeekBtn');
    toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
    advancedFiltersPanel = document.getElementById('advancedFiltersPanel');
    openModalBtn = document.getElementById('openModalBtn');

    loadSettings();
    const data = await loadScheduleData();
    if (!data) return;

    const titleEl = document.getElementById('schedule-title');
    if (titleEl) titleEl.textContent = `Розклад занять`;

    generateNavigation();
    generateSchedule();
    setupEventListeners();

    initModal();
    handleUpdateModal();
    initDonateModal();

    filterSchedule();
    highlightToday();
    setTimeout(scrollToCorrectDay, 100);
    updateNavText();
    generateReports();

    const loadingEl = document.getElementById('loading');
    const containerEl = document.getElementById('schedule-container');
    if (loadingEl) loadingEl.style.display = 'none';
    if (containerEl) containerEl.style.display = 'block';
    console.log("App ready.");
}

function triggerGravity() {
    const elements = document.querySelectorAll('body *');
    document.body.style.overflow = 'hidden';
    if (themeBtn) {
        themeBtn.textContent = '🍎';
        themeBtn.style.transition = 'all 1s ease-in';
        themeBtn.style.top = (window.innerHeight - 50) + 'px';
    }
    const fallElements = document.querySelectorAll('.card, .stat-card, h1, h2, p, nav, .filters, .reports');
    fallElements.forEach(el => {
        el.style.transition = `transform ${1 + Math.random() * 2}s cubic-bezier(0.25, 0.8, 0.25, 1)`;
        el.style.transform = `translateY(${window.innerHeight}px) rotate(${Math.random() * 360 - 180}deg)`;
    });
}

document.addEventListener('DOMContentLoaded', initApp);

window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
        let waitingServiceWorker;
        let isReloading = false;
        const updateBar = document.getElementById('update-bar');
        const updateButton = document.getElementById('update-now-btn');
        const navigation = document.getElementById('navigation');

        if (updateButton && updateBar) {
            updateButton.addEventListener('click', () => {
                if (waitingServiceWorker) {
                    waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
                    updateBar.style.display = 'none';
                }
            });
        }

        const trackUpdates = (registration) => {
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            waitingServiceWorker = newWorker;
                            const disableUpdatesCheckbox = document.getElementById('disableUpdates');
                            if (disableUpdatesCheckbox && disableUpdatesCheckbox.checked) return;
                            if (navigation) navigation.style.display = 'none';
                            if (updateBar) updateBar.style.display = 'flex';
                        }
                    }
                });
            });
        };

        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker зареєстровано успішно:', registration);
                trackUpdates(registration);
            })
            .catch((error) => {
                console.error('Помилка реєстрації Service Worker:', error);
            });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!isReloading) {
                window.location.reload();
                isReloading = true;
            }
        });
    }
});

