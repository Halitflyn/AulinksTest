// Ключ для збереження кастомного розкладу в пам'яті браузера
const SCHEDULE_STORAGE_KEY = 'myCustomSchedule';

// === Глобальні змінні ===
let scheduleData = null;
let themeAutoHideTimer;
let subgroupFilter, showAllWeeks, hideEmptyLessons, showNextWeekBtn;
let toggleFiltersBtn, advancedFiltersPanel, openModalBtn, settingsModal, modalClose;
let importBtn, importFile, exportBtn, deleteBtn, importStatusEl;
const themeBtn = document.getElementById('themeBtn');

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
// === ЗАВАНТАЖЕННЯ ДАНИХ (ВИПРАВЛЕНО) ===
// =======================================

async function loadScheduleData() {
    // 1. Спроба завантажити створений розклад
    const customSchedule = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    
    if (customSchedule) {
        try {
            console.log("Знайдено власний розклад. Завантаження...");
            const data = JSON.parse(customSchedule);
            if (!data || !data.schedule) throw new Error("Невірний формат даних");
            return data;
        } catch (e) {
            console.warn("Помилка читання власного розкладу. Видалення...", e);
            localStorage.removeItem(SCHEDULE_STORAGE_KEY);
        }
    }

    // 2. Якщо власного немає, вантажимо стандартний JSON
    try {
        const response = await fetch('./schedule.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Помилка завантаження розкладу:', error);
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = `<div style="color: #d32f2f; text-align: center;"><h3>❌ Помилка завантаження</h3><p>${error.message}</p></div>`;
        }
        return null;
    }
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
    // Логіка визначення чисельника/знаменника
    const currentWeekNum = getISOWeek(now);
    
    if (!startSemesterStr) {
        return isNaN(currentWeekNum) || currentWeekNum % 2 !== 0 ? 'num' : 'den';
    }

    const startSemester = new Date(startSemesterStr);
    if (isNaN(startSemester.getTime())) {
        return isNaN(currentWeekNum) || currentWeekNum % 2 !== 0 ? 'num' : 'den';
    }

    const weekStart = getISOWeek(startSemester);
    const startWeekIsOdd = weekStart % 2 !== 0;
    const currentWeekIsOdd = currentWeekNum % 2 !== 0;
    
    // Якщо навчальний рік почався в непарний тиждень, то непарні тижні року = 1-й тиждень навчання (Чисельник)
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
// === ГЕНЕРАЦІЯ UI ===
// =======================================

function generateNavigation() {
    const nav = document.getElementById('navigation');
    if (!nav || !scheduleData?.schedule) return;
    const days = Object.keys(scheduleData.schedule);
    
    nav.innerHTML = days.map(dayKey => {
        const day = scheduleData.schedule[dayKey];
        const hasLessons = day && day.lessons && day.lessons.length > 0; // Спрощена перевірка
        if (!hasLessons) return ''; 

        const dayName = day.name || dayKey;
        const shortName = dayName.substring(0, 2).toUpperCase();
        return `<a href="#" data-day-id="${dayKey}" data-full="${dayName}" data-short="${shortName}">${dayName}</a>`;
    }).join('');
}

function generateSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container || !scheduleData?.schedule) return;
    const days = Object.keys(scheduleData.schedule);
    
    container.innerHTML = days.map(dayKey => {
        const day = scheduleData.schedule[dayKey];
        if (!day || !day.lessons || day.lessons.length === 0) return '';

        return `<section class="day" id="${dayKey}">
            <h2>${day.name || dayKey}</h2>
            <div class="cards">${day.lessons.map(lesson => generateLessonCard(lesson, dayKey)).join('')}</div>
        </section>`;
    }).join('');
}

function generateLessonCard(lesson, dayKey) {
    if (!lesson) return '';
    const hasSubgroups = Array.isArray(lesson.subgroups) && lesson.subgroups.length > 0;
    // Виправляємо логіку empty: якщо немає назви і немає підгруп
    const isEmpty = (!lesson.subject && !hasSubgroups) || lesson.type === 'empty';

    let cardClass = isEmpty ? 'card empty' : `card ${lesson.type || 'lecture'}`;
    if (!hasSubgroups && (lesson.weeks === 'num' || lesson.weeks === 'den')) {
        cardClass += ` numden ${lesson.weeks}`;
    }
    
    const lessonId = `lesson-${dayKey}-${lesson.number || Math.random()}`;

    if (isEmpty) {
        return `<article class="${cardClass}" id="${lessonId}">
            <h3>${lesson.number || '?'} пара</h3>
            <p class="empty-message">Немає</p>
        </article>`;
    }

    let contentHtml = '';
    
    // Якщо це складна пара з підгрупами
    if (hasSubgroups) {
        contentHtml = lesson.subgroups.map(sub => {
            const subClass = (sub.weeks ? `numden ${sub.weeks}` : '') + (sub.group ? ` ${sub.group}` : '');
            let label = sub.group === 'sub1' ? 'Підгрупа 1' : (sub.group === 'sub2' ? 'Підгрупа 2' : '');
            if(sub.weeks === 'num') label += ' (Чис)';
            if(sub.weeks === 'den') label += ' (Знам)';
            
            // Мапінг типів для відображення
            let typeText = sub.type;
            if(typeText === 'lecture') typeText = 'Лекція';
            if(typeText === 'practical') typeText = 'Практична';
            if(typeText === 'lab') typeText = 'Лабораторна';

            return `<div class="subgroup ${subClass}">
                <p class="subgroup-label">${label}</p>
                <p><b>${sub.subject}</b> (${typeText})</p>
                <p class="teacher-room">${sub.teacher || ''} ${sub.room || ''}</p>
            </div>`;
        }).join('');
    } else {
        // Звичайна пара
        let weekLabel = '';
        if (lesson.weeks === 'num') weekLabel = ' (Чисельник)';
        if (lesson.weeks === 'den') weekLabel = ' (Знаменник)';
        
        let typeText = lesson.type;
        if(typeText === 'lecture') typeText = 'Лекція';
        if(typeText === 'practical') typeText = 'Практична';
        if(typeText === 'lab') typeText = 'Лабораторна';

        contentHtml = `<p data-main-content="true"><b>${lesson.subject}</b>${weekLabel} (${typeText})</p>
                       <p class="teacher-room">${lesson.teacher || ''} ${lesson.room || ''}</p>`;
    }

    return `<article class="${cardClass}" id="${lessonId}">
        <h3>${lesson.number || '?'} пара</h3>
        ${contentHtml}
        <p class="time">${lesson.time || ''}</p>
    </article>`;
}

// =======================================
// === ФІЛЬТРАЦІЯ ===
// =======================================

function filterSchedule() {
    const subgroup = subgroupFilter?.value || 'all';
    const showAll = showAllWeeks?.checked || false;
    const hideEmpty = hideEmptyLessons?.checked || false;
    const currentType = getCurrentType();
    
    document.querySelectorAll('.card').forEach(card => {
        // Логіка відображення порожніх пар
        if (card.classList.contains('empty')) {
            card.style.display = hideEmpty ? 'none' : 'flex';
            return;
        }

        // Логіка відображення по тижнях (Чис/Знам) для головної картки
        let visible = true;
        if (!showAll) {
            if (card.classList.contains('num') && currentType !== 'num') visible = false;
            if (card.classList.contains('den') && currentType !== 'den') visible = false;
        }

        // Логіка підгруп
        const subgroups = card.querySelectorAll('.subgroup');
        let hasVisibleSubgroups = false;
        
        if (subgroups.length > 0) {
            subgroups.forEach(sub => {
                let subVisible = true;
                // Фільтр підгрупи
                if (subgroup !== 'all') {
                    if (sub.classList.contains('sub1') && subgroup !== 'sub1') subVisible = false;
                    if (sub.classList.contains('sub2') && subgroup !== 'sub2') subVisible = false;
                }
                // Фільтр тижня
                if (!showAll) {
                    if (sub.classList.contains('num') && currentType !== 'num') subVisible = false;
                    if (sub.classList.contains('den') && currentType !== 'den') subVisible = false;
                }
                
                sub.style.display = subVisible ? 'block' : 'none';
                if (subVisible) hasVisibleSubgroups = true;
            });
            // Якщо є підгрупи, але жодна не видима - ховаємо картку
            if (!hasVisibleSubgroups) visible = false;
        } else {
            // Якщо підгруп немає, перевіряємо чи підходить ця пара під фільтр підгрупи (зазвичай загальні пари видно всім)
            // Але якщо це змішана пара без підгруп (рідкість), залишаємо visible
        }

        card.style.display = visible ? 'flex' : 'none';
    });
    
    updateWeekInfo();
}

function updateWeekInfo() {
    const infoSpan = document.getElementById('currentWeekInfo');
    if (!infoSpan) return;
    
    if (showAllWeeks?.checked) {
        infoSpan.textContent = '';
        return;
    }
    
    const type = getCurrentType();
    infoSpan.textContent = type === 'num' ? 'Чисельник' : 'Знаменник';
}

// ==============================
// === INIT ===
// ==============================

async function initApp() {
    console.log("Initializing app...");
    
    // Елементи
    subgroupFilter = document.getElementById('subgroupFilter');
    showAllWeeks = document.getElementById('showAllWeeks');
    hideEmptyLessons = document.getElementById('hideEmptyLessons');
    
    // Завантаження даних
    const data = await loadScheduleData();
    if (!data) return;
    scheduleData = data;

    // Рендер
    generateNavigation();
    generateSchedule();
    
    // Слухачі подій
    subgroupFilter?.addEventListener('change', filterSchedule);
    showAllWeeks?.addEventListener('change', filterSchedule);
    hideEmptyLessons?.addEventListener('change', filterSchedule);
    
    // Ініціалізація стану
    filterSchedule();
    
    // Прибираємо лоадер
    document.getElementById('loading').style.display = 'none';
    document.getElementById('schedule-container').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initApp);
