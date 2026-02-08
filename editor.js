/* ================= ЗБЕРЕЖЕННЯ (ФІНАЛ) ================= */
function calculateStartDate() {
    const userSaysTodayIs = document.querySelector('input[name="currentWeekType"]:checked').value; 
    let startDate = new Date();
    // Якщо сьогодні знаменник, то "початок семестру" був тиждень тому (умовно)
    if (userSaysTodayIs === 'den') startDate.setDate(startDate.getDate() - 7);
    return startDate.toISOString().split('T')[0];
}

function saveFinalResult() {
    const startDate = calculateStartDate();
    
    // Створюємо структуру для ГОЛОВНОГО САЙТУ
    const scheduleExport = {
        group: state.settings.group,
        semester: "Generated Schedule", // Можна додати поле в налаштування, якщо треба
        startDate: startDate, 
        schedule: {}
    };

    dayKeys.forEach((dayKey, dIndex) => {
        const lessons = [];
        for(let p=0; p<state.settings.pairsPerDay; p++) {
            const key = `${dIndex}-${p}`;
            const cell = state.grid[key];
            const defaultTime = state.settings.times[p];

            // Якщо клітинка пуста, додаємо "empty" урок, щоб сітка не "з'їхала"
            if (!cell || !cell.content || Object.keys(cell.content).length === 0) {
                lessons.push({
                    number: p + 1,
                    time: defaultTime,
                    type: "empty",
                    weeks: "all",
                    subgroups: []
                });
                continue;
            }

            const finalTime = cell.customTime || defaultTime;
            
            // Базова структура уроку
            const baseLesson = { 
                number: p+1, 
                time: finalTime, 
                subject: "",  // Заповниться нижче
                type: "mixed", // За замовчуванням mixed, якщо це складна клітинка
                weeks: "all",
                subgroups: [] 
            };

            const mapType = (t) => {
                if(t === 'Lec' || t === 'lecture') return 'lecture';
                if(t === 'Prac' || t === 'practical') return 'practical';
                if(t === 'Lab' || t === 'lab') return 'lab';
                return 'lecture';
            };

            // Функція-помічник для додавання підгрупи
            const addSub = (pos, grp, wks) => {
                if(cell.content[pos]) {
                    const c = cell.content[pos];
                    baseLesson.subgroups.push({
                        group: grp, 
                        weeks: wks, 
                        subject: c.subject,
                        type: mapType(c.type),
                        teacher: c.teacher || "", 
                        room: c.room || ""
                    });
                }
            };

            // 1. Проста клітинка (single)
            if (cell.structure === 'single' && cell.content.main) {
                const c = cell.content.main;
                // Переписуємо baseLesson як звичайний урок (не mixed)
                baseLesson.type = mapType(c.type);
                baseLesson.subject = c.subject;
                baseLesson.teacher = c.teacher || "";
                baseLesson.room = c.room || "";
                baseLesson.weeks = "all";
                baseLesson.subgroups = []; // Пустий масив
            }
            // 2. Складні клітинки (split)
            else {
                if (cell.structure === 'split-h') { 
                    addSub('left','sub1','all'); 
                    addSub('right','sub2','all'); 
                }
                else if (cell.structure === 'split-v') { 
                    addSub('top','all','num'); 
                    addSub('bottom','all','den'); 
                }
                else {
                    // Складні комбінації (top-h, bottom-h)
                    if(cell.structure.includes('top-h')||cell.structure.includes('both-h')) { 
                        addSub('top-left','sub1','num'); 
                        addSub('top-right','sub2','num'); 
                    } else {
                        addSub('top','all','num');
                    }
                    
                    if(cell.structure.includes('bottom-h')||cell.structure.includes('both-h')) { 
                        addSub('bottom-left','sub1','den'); 
                        addSub('bottom-right','sub2','den'); 
                    } else {
                        addSub('bottom','all','den');
                    }
                }
            }

            lessons.push(baseLesson);
        }
        
        scheduleExport.schedule[dayKey] = { 
            name: dayNamesUk[dIndex], 
            lessons: lessons 
        };
    });

    // Зберігаємо ГОТОВИЙ розклад для сайту
    localStorage.setItem('myCustomSchedule', JSON.stringify(scheduleExport));
    
    // Зберігаємо СТАН РЕДАКТОРА (щоб можна було повернутися і доредагувати)
    localStorage.setItem('editorStateBackup', JSON.stringify(state));
    
    alert('✅ Розклад збережено і застосовано!');
    window.location.href = 'index.html';
}
