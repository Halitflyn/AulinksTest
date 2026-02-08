/* ================= CONFIG ================= */
const state = {
    step: 1,
    settings: {
        group: "My Group",
        pairsPerDay: 5,
        times: ["08:30 – 09:50", "10:05 – 11:25", "11:40 – 13:00", "13:15 – 14:35", "14:50 – 16:10", "16:25 – 17:45", "18:00 – 19:20"]
    },
    subjects: [],
    grid: {} 
};

const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const dayNames = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];

/* ================= NAV ================= */
const wizard = {
    init: () => {
        renderTimeInputs();
        updateUI();
        document.addEventListener('click', (e) => {
            if(!e.target.closest('.radial-menu')) document.getElementById('gridRadialMenu').classList.add('hidden');
        });
        document.getElementById('saveResultBtn').addEventListener('click', saveFinalResult);
    },
    next: () => {
        if(state.step===1) {
            state.settings.group = document.getElementById('groupName').value;
            state.settings.pairsPerDay = parseInt(document.getElementById('pairsPerDay').value);
            state.settings.times = Array.from(document.querySelectorAll('.time-in')).map(i=>i.value);
        }
        if(state.step===2 && state.subjects.length===0) { alert("Додайте предмет!"); return; }
        if(state.step===3) { renderFillGrid(); renderDraggables(); }
        if(state.step<4) { state.step++; updateUI(); }
    },
    prev: () => { if(state.step>1) { state.step--; updateUI(); } }
};

function updateUI() {
    document.querySelectorAll('.wizard-step').forEach(el=>el.classList.remove('active'));
    document.querySelectorAll('.step-indicator').forEach(el=>el.classList.remove('active'));
    document.getElementById(`step-${state.step}`).classList.add('active');
    document.querySelector(`.step-indicator[data-step="${state.step}"]`).classList.add('active');
    if(state.step===3) renderStructureGrid();
}

/* ================= STEP 1 & 2 ================= */
function renderTimeInputs() {
    const c = document.getElementById('timeSettings'); c.innerHTML='';
    const n = parseInt(document.getElementById('pairsPerDay').value);
    for(let i=0; i<n; i++) c.innerHTML += `<div><label>${i+1}</label><input class="time-in" value="${state.settings.times[i]}"></div>`;
}
document.getElementById('pairsPerDay').addEventListener('change', renderTimeInputs);

document.getElementById('addSubjectBtn').addEventListener('click', () => {
    const name = document.getElementById('subjName').value;
    if(!name) return;
    const types = Array.from(document.querySelectorAll('.type-check:checked')).map(cb=>cb.value);
    if(types.length===0) types.push('lecture');
    state.subjects.push({id:Date.now().toString(), name, types});
    renderSubjectsList();
    document.getElementById('subjName').value='';
});

function renderSubjectsList() {
    const list = document.getElementById('subjectsList');
    list.innerHTML = state.subjects.map(s => `<div><b>${s.name}</b> <small>${s.types.join(',')}</small></div>`).join('');
}

/* ================= STEP 3 & 4 (GRID) ================= */
function renderStructureGrid() { renderGrid(false); }
function renderFillGrid() { renderGrid(true); }

function renderGrid(isFill) {
    const container = document.getElementById(isFill ? 'fillGrid' : 'structureGrid');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `50px repeat(${dayKeys.length}, 1fr)`;

    container.appendChild(div('grid-header', '#'));
    dayNames.forEach(d => container.appendChild(div('grid-header', d)));

    for(let p=0; p<state.settings.pairsPerDay; p++) {
        container.appendChild(div('grid-header', `${p+1}`));
        for(let d=0; d<dayKeys.length; d++) {
            const key = `${d}-${p}`;
            const cell = state.grid[key] || {structure:'single', content:{}};
            const html = generateHTML(cell.structure, isFill, cell.content, key);
            const el = div('grid-cell', html);
            
            if(!isFill) {
                el.querySelectorAll('.sub-cell').forEach(s => 
                    s.addEventListener('click', (e) => openMenu(e, key, s.dataset.pos, cell.structure)));
            }
            container.appendChild(el);
        }
    }
}

function div(cls, html) { const d=document.createElement('div'); d.className=cls; d.innerHTML=html; return d; }

function generateHTML(struct, isFill, content, key) {
    const r = (pos, cls) => {
        let inner = "";
        if(isFill && content[pos]) {
            const item = content[pos];
            let type = item.type;
            if(type==='lecture'||type==='Lec') type='lecture';
            if(type==='practical'||type==='Prac') type='practical';
            if(type==='lab'||type==='Lab') type='lab';
            inner = `<div class="lesson-chip type-${type}">${item.subject}</div>`;
        }
        const attrs = isFill ? `data-drop-key="${key}" data-drop-pos="${pos}"` : `data-pos="${pos}"`;
        return `<div class="sub-cell ${cls}" ${attrs}>${inner}</div>`;
    };

    if(struct==='single') return r('main','');
    if(struct==='split-h') return `<div class="cell-split-h">${r('left','group1')}${r('right','group2')}</div>`;
    
    let top = (struct.includes('top-h')||struct.includes('both-h')) 
        ? `<div class="cell-split-h numerator">${r('top-left','group1')}${r('top-right','group2')}</div>`
        : r('top','numerator');

    let bot = (struct.includes('bottom-h')||struct.includes('both-h'))
        ? `<div class="cell-split-h denominator">${r('bottom-left','group1')}${r('bottom-right','group2')}</div>`
        : r('bottom','denominator');

    return `<div class="cell-split-v">${top}${bot}</div>`;
}

// === MENU ===
const menu = document.getElementById('gridRadialMenu');
let menuCtx = null;
function openMenu(e,key,pos,struct) {
    e.stopPropagation();
    menuCtx={key,pos,struct};
    menu.style.left=(e.clientX-50)+'px'; menu.style.top=(e.clientY-50)+'px';
    menu.classList.remove('hidden');
    
    const v = menu.querySelector('.top');
    const h = menu.querySelector('.right');
    v.style.display='flex'; h.style.display='flex';
    
    if(struct.includes('split-v')) v.style.display='none';
    if(pos.includes('left')||pos.includes('right')) h.style.display='none';
}

menu.querySelectorAll('.radial-btn').forEach(b => b.onclick = () => {
    const {key,pos,struct} = menuCtx;
    if(!state.grid[key]) state.grid[key] = {structure:'single',content:{}};
    let ns = struct;
    const act = b.dataset.action;
    
    if(act==='clear') { ns='single'; state.grid[key].content={}; }
    else if(act==='split-vertical' && struct==='single') ns='split-v';
    else if(act==='split-horizontal') {
        if(struct==='single') ns='split-h';
        else if(struct==='split-v') ns = (pos==='top') ? 'split-v-top-h' : 'split-v-bottom-h';
        else if(struct==='split-v-top-h' && pos==='bottom') ns='split-v-both-h';
        else if(struct==='split-v-bottom-h' && pos==='top') ns='split-v-both-h';
    }
    state.grid[key].structure = ns;
    renderGrid(false);
    menu.classList.add('hidden');
});

/* ================= DRAG DROP ================= */
function renderDraggables() {
    document.getElementById('draggableSubjects').innerHTML = state.subjects.map(s => 
        `<div class="drag-item" data-id="${s.id}" onmousedown="startDrag(event)">${s.name}</div>`).join('');
}

let isDrag=false, dragId=null;
const ghost=document.getElementById('dragGhost');

function startDrag(e) {
    if(e.button!==0) return;
    dragId = e.currentTarget.dataset.id;
    isDrag=true;
    ghost.innerText = state.subjects.find(s=>s.id===dragId).name;
    ghost.classList.remove('hidden');
    updGhost(e);
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
}
function onDrag(e) { if(!isDrag) return; e.preventDefault(); updGhost(e); }
function updGhost(e) { ghost.style.left=e.clientX+'px'; ghost.style.top=e.clientY+'px'; }

function endDrag(e) {
    if(!isDrag) return;
    isDrag=false; ghost.classList.add('hidden');
    ghost.style.display='none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    ghost.style.display='block';
    
    const cell = el?.closest('.sub-cell');
    if(cell && cell.dataset.dropKey) {
        const key = cell.dataset.dropKey;
        const pos = cell.dataset.dropPos;
        const s = state.subjects.find(x=>x.id===dragId);
        
        if(!state.grid[key]) state.grid[key]={structure:'single', content:{}};
        if(!state.grid[key].content) state.grid[key].content={};
        
        state.grid[key].content[pos] = { subject: s.name, type: s.types[0] };
        renderGrid(true);
    }
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
}

/* ================= SAVE ================= */
function saveFinalResult() {
    const exportData = { group: state.settings.group, startDate: new Date().toISOString().split('T')[0], schedule: {} };
    
    dayKeys.forEach((dk, di) => {
        const lessons = [];
        for(let p=0; p<state.settings.pairsPerDay; p++) {
            const key = `${di}-${p}`;
            const cell = state.grid[key];
            if(!cell || !cell.content || Object.keys(cell.content).length===0) continue;
            
            const time = state.settings.times[p];
            const base = { number: p+1, time, type:'mixed', subgroups: [] };
            
            // Mapper
            const add = (pos, g, w) => {
                if(cell.content[pos]) {
                    let t = cell.content[pos].type;
                    if(t==='Lec'||t==='lecture') t='lecture';
                    if(t==='Prac'||t==='practical') t='practical';
                    if(t==='Lab'||t==='lab') t='lab';
                    
                    base.subgroups.push({ subject: cell.content[pos].subject, type: t, group: g, weeks: w, teacher:'', room:'' });
                }
            };
            
            if(cell.structure==='single' && cell.content.main) {
                // Save simple lesson as 1 subgroup 'all' 'all' or simple lesson
                lessons.push({ number: p+1, time, subject: cell.content.main.subject, type: 'lecture', weeks:'all', teacher:'', room:'' });
                continue;
            }
            
            if(cell.structure==='split-h') { add('left','sub1','all'); add('right','sub2','all'); }
            else if(cell.structure==='split-v') { add('top','all','num'); add('bottom','all','den'); }
            else {
                if(cell.structure.includes('top-h')||cell.structure.includes('both-h')) { add('top-left','sub1','num'); add('top-right','sub2','num'); }
                else add('top','all','num');
                
                if(cell.structure.includes('bottom-h')||cell.structure.includes('both-h')) { add('bottom-left','sub1','den'); add('bottom-right','sub2','den'); }
                else add('bottom','all','den');
            }
            
            if(base.subgroups.length>0) lessons.push(base);
        }
        exportData.schedule[dk] = { name: dayNames[di], lessons };
    });
    
    localStorage.setItem('myCustomSchedule', JSON.stringify(exportData));
    window.location.href = 'index.html';
}

wizard.init();
