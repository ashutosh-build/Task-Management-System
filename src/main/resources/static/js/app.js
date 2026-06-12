/* ============================================================
   Taskflow — Frontend  (calls Spring Boot REST API)
   ============================================================ */

// ── State ────────────────────────────────────────────────────
var token        = localStorage.getItem('tf_token') || null;
var currentUser  = JSON.parse(localStorage.getItem('tf_user') || 'null');
var allTasks     = [];
var currentView  = 'all';
var currentDisp  = 'list';
var statusFilter = 'all';
var editingId    = null;
var openDetailId = null;
var dragId       = null;
var toastTimer   = null;

var notifications = [];
var activityFeed  = [];

var PC  = { Design:'#8b7cf8', Engineering:'#2dd4bf', Marketing:'#f87171', General:'#888' };
var AVC = { You:'#8b7cf8', Alice:'#f87171', Bob:'#2dd4bf', Carol:'#fbbf24' };

var COLS = [
  { id:'TODO',       label:'To do',       color:'#9090b0' },
  { id:'INPROGRESS', label:'In progress',  color:'#8b7cf8' },
  { id:'REVIEW',     label:'In review',    color:'#fbbf24' },
  { id:'DONE',       label:'Done',         color:'#4ade80' }
];

// ── API ──────────────────────────────────────────────────────
function apiFetch(method, path, body) {
  var opts = {
    method: method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body)  opts.body = JSON.stringify(body);
  return fetch('/api' + path, opts).then(function(r) {
    return r.json().then(function(data) {
      if (!r.ok) throw new Error(data.message || ('HTTP ' + r.status));
      return data;
    });
  });
}
function apiGet(p)    { return apiFetch('GET',    p, null); }
function apiPost(p,b) { return apiFetch('POST',   p, b);    }
function apiPut(p,b)  { return apiFetch('PUT',    p, b);    }
function apiPatch(p)  { return apiFetch('PATCH',  p, null); }
function apiDel(p)    { return apiFetch('DELETE', p, null); }

// ── Auth ─────────────────────────────────────────────────────
function authTab(t) {
  document.querySelectorAll('.auth-tab').forEach(function(e,i) {
    e.classList.toggle('active', (t === 'login') ? i===0 : i===1);
  });
  document.getElementById('form-login').style.display  = t==='login'  ? 'block' : 'none';
  document.getElementById('form-signup').style.display = t==='signup' ? 'block' : 'none';
  document.getElementById('l-err').textContent = '';
  document.getElementById('s-err').textContent = '';
}

function doLogin() {
  var email = document.getElementById('l-email').value.trim();
  var pass  = document.getElementById('l-pass').value;
  apiPost('/auth/login', { email: email, password: pass })
    .then(function(res) {
      token = res.token;
      currentUser = { id: res.userId, name: res.name, email: res.email };
      localStorage.setItem('tf_token', token);
      localStorage.setItem('tf_user',  JSON.stringify(currentUser));
      launchApp();
    })
    .catch(function(e) {
      document.getElementById('l-err').textContent = e.message;
    });
}

function doSignup() {
  var name  = document.getElementById('s-name').value.trim();
  var email = document.getElementById('s-email').value.trim();
  var pass  = document.getElementById('s-pass').value;
  if (!name || !email || !pass) {
    document.getElementById('s-err').textContent = 'All fields are required.'; return;
  }
  apiPost('/auth/register', { name: name, email: email, password: pass })
    .then(function(res) {
      token = res.token;
      currentUser = { id: res.userId, name: res.name, email: res.email };
      localStorage.setItem('tf_token', token);
      localStorage.setItem('tf_user',  JSON.stringify(currentUser));
      launchApp();
    })
    .catch(function(e) {
      document.getElementById('s-err').textContent = e.message;
    });
}

function doLogout() {
  token = null; currentUser = null;
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  document.getElementById('app-screen').style.display  = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  showToast('Signed out', '⎋');
}

// ── App Launch ───────────────────────────────────────────────
function launchApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'flex';
  var initials = currentUser.name.split(' ').map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();
  document.getElementById('user-av').textContent = initials;
  document.getElementById('tb-name').textContent = currentUser.name.split(' ')[0];
  seedActivity();
  seedNotifications();
  loadAll();
  setInterval(liveUpdate, 13000);
}

function loadAll() {
  loadTasks();
  loadStats();
}

// ── Tasks ────────────────────────────────────────────────────
function buildUrl() {
  var v = currentView;
  if (v === 'today')    return '/tasks?filter=today';
  if (v === 'upcoming') return '/tasks?filter=upcoming';
  if (v === 'done')     return '/tasks?filter=done';
  if (v.indexOf('proj:') === 0) return '/tasks?project=' + encodeURIComponent(v.slice(5));
  return '/tasks';
}

function loadTasks() {
  apiGet(buildUrl()).then(function(data) {
    allTasks = data;
    renderSideBadges();
    applyFilter();
  }).catch(function(e) { console.error('loadTasks:', e); });
}

function loadStats() {
  apiGet('/tasks/stats').then(function(s) {
    var pct = s.total ? Math.round(s.done / s.total * 100) : 0;
    document.getElementById('stats-row').innerHTML =
      sc('Total',        s.total,    'var(--purple)', 'all tasks')  +
      sc('Completed',    s.done,     'var(--green)',  pct + '% done') +
      sc('High priority',s.high,     'var(--coral)',  'need attention') +
      sc('Overdue',      s.overdue,  s.overdue > 0 ? 'var(--amber)' : 'var(--text2)', 'past due');
  }).catch(function(e) { console.error('loadStats:', e); });
}

function sc(lbl, val, color, sub) {
  return '<div class="sc"><div class="sc-lbl">' + lbl + '</div>' +
         '<div class="sc-val" style="color:' + color + '">' + val + '</div>' +
         '<div class="sc-sub">' + sub + '</div></div>';
}

// ── Filter & Render ──────────────────────────────────────────
function applyFilter() {
  var q   = (document.getElementById('search').value || '').toLowerCase();
  var arr = allTasks.slice();

  if (currentView.indexOf('pri:') === 0) {
    var pri = currentView.slice(4);
    arr = arr.filter(function(t) { return t.priority === pri; });
  }

  if (q) {
    arr = arr.filter(function(t) {
      return (t.title||'').toLowerCase().indexOf(q) >= 0 ||
             (t.description||'').toLowerCase().indexOf(q) >= 0 ||
             (t.tags||'').toLowerCase().indexOf(q) >= 0;
    });
  }

  if (statusFilter === 'TODO')       arr = arr.filter(function(t){ return t.status === 'TODO'; });
  else if (statusFilter === 'INPROGRESS') arr = arr.filter(function(t){ return t.status === 'INPROGRESS' || t.status === 'REVIEW'; });
  else if (statusFilter === 'DONE')  arr = arr.filter(function(t){ return t.done; });

  if (currentDisp === 'list')  renderList(arr);
  else                         renderBoard(arr);
}

function setStatusFilter(f, el) {
  statusFilter = f;
  document.querySelectorAll('.fb').forEach(function(b){ b.classList.remove('active'); });
  el.classList.add('active');
  applyFilter();
}

// ── Navigation ───────────────────────────────────────────────
var VIEW_TITLES = {
  all:'All Tasks', today:"Today's Tasks", upcoming:'Upcoming',
  done:'Completed', dashboard:'Dashboard'
};

function navTo(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  var key = view.split(':')[0];
  var el  = document.getElementById('ni-' + key);
  if (el) el.classList.add('active');

  var title = VIEW_TITLES[view] || (view.indexOf('proj:')===0 ? view.slice(5) : view.indexOf('pri:')===0 ? view.slice(4)+' Priority' : view);
  document.getElementById('page-title').textContent = title;

  var isDash = view === 'dashboard';
  document.getElementById('view-tog').style.display     = isDash ? 'none' : 'flex';
  document.getElementById('filters-row').style.display  = isDash ? 'none' : 'flex';
  document.getElementById('stats-row').style.display    = isDash ? 'none' : 'grid';
  document.getElementById('view-list').style.display    = (!isDash && currentDisp==='list')  ? 'flex' : 'none';
  document.getElementById('view-board').style.display   = (!isDash && currentDisp==='board') ? 'flex' : 'none';
  document.getElementById('view-dash').style.display    = isDash ? 'flex' : 'none';

  if (isDash) renderDash();
  else        loadTasks();
}

function setDisplay(d) {
  currentDisp = d;
  document.getElementById('vb-list').classList.toggle('active',  d==='list');
  document.getElementById('vb-board').classList.toggle('active', d==='board');
  document.getElementById('view-list').style.display  = d==='list'  ? 'flex' : 'none';
  document.getElementById('view-board').style.display = d==='board' ? 'flex' : 'none';
  applyFilter();
}

// ── List View ─────────────────────────────────────────────────
function renderList(tasks) {
  var today = new Date().toISOString().slice(0,10);
  var grps  = {};
  COLS.forEach(function(c){ grps[c.id] = []; });

  tasks.forEach(function(t) {
    var g = t.done ? 'DONE' : (t.status || 'TODO');
    if (grps[g]) grps[g].push(t);
  });

  var hasAny = COLS.some(function(c){ return grps[c.id].length > 0; });
  if (!hasAny) {
    document.getElementById('task-list').innerHTML =
      '<div class="empty"><div class="empty-ic">✓</div><div class="empty-txt">No tasks found</div></div>';
    return;
  }

  var html = COLS.map(function(col) {
    var items = grps[col.id];
    if (!items.length) return '';
    return '<div class="tgrp">' +
      '<div class="tg-hdr">' +
        '<span style="width:7px;height:7px;border-radius:50%;background:' + col.color + ';display:inline-block"></span>' +
        '<span class="tg-title">' + col.label + '</span>' +
        '<span class="tg-count">' + items.length + '</span>' +
      '</div>' +
      items.map(function(t){ return taskCardHtml(t, today); }).join('') +
    '</div>';
  }).join('');

  document.getElementById('task-list').innerHTML = html;
}

function taskCardHtml(t, today) {
  var od   = t.dueDate && t.dueDate < today && !t.done;
  var pb   = { HIGH:'ph', MEDIUM:'pm', LOW:'pl' }[t.priority] || 'pm';
  var pLbl = (t.priority || 'medium').toLowerCase();
  var tags = (t.tags || '').split(',').filter(function(x){ return x.trim(); })
               .map(function(x){ return '<span class="ttag">' + esc(x.trim()) + '</span>'; }).join('');
  var fmt  = t.dueDate ? fmtDate(t.dueDate) : '';
  var cc   = t.commentCount ? '<span class="cc">💬 ' + t.commentCount + '</span>' : '';
  var avc  = AVC[t.assignee] || '#666';
  return '<div class="task-card' + (t.done ? ' is-done' : '') + '" onclick="openDetail(' + t.id + ')">' +
    '<div class="tc-top">' +
      '<div class="chk' + (t.done ? ' ck' : '') + '" onclick="event.stopPropagation();doToggle(' + t.id + ')">' + (t.done ? '✓' : '') + '</div>' +
      '<div class="tc-title' + (t.done ? ' struck' : '') + '">' + esc(t.title) + '</div>' +
      '<div class="tc-actions">' +
        '<button class="ab" onclick="event.stopPropagation();doEdit(' + t.id + ')">✎</button>' +
        '<button class="ab del" onclick="event.stopPropagation();doDelete(' + t.id + ')">✕</button>' +
      '</div>' +
    '</div>' +
    '<div class="tc-meta">' +
      '<span class="pb ' + pb + '">' + pLbl + '</span>' +
      tags +
      (fmt ? '<span class="due' + (od?' od':'') + '">📅 ' + fmt + '</span>' : '') +
      cc +
      '<div class="aav" style="background:' + avc + '">' + esc((t.assignee||'?')[0]) + '</div>' +
    '</div>' +
  '</div>';
}

// ── Board View ────────────────────────────────────────────────
function renderBoard(tasks) {
  var html = COLS.map(function(col) {
    var items = tasks.filter(function(t){ return t.done ? col.id==='DONE' : t.status===col.id; });
    return '<div class="kcol">' +
      '<div class="kch">' +
        '<span class="kcd" style="background:' + col.color + '"></span>' +
        '<span class="kct">' + col.label + '</span>' +
        '<span class="kcc">' + items.length + '</span>' +
      '</div>' +
      '<div class="kdrop" id="kd-' + col.id + '"' +
        ' ondragover="event.preventDefault();this.classList.add(\'over\')"' +
        ' ondragleave="this.classList.remove(\'over\')"' +
        ' ondrop="doDrop(event,\'' + col.id + '\')">' +
        items.map(function(t) {
          var pb  = { HIGH:'ph', MEDIUM:'pm', LOW:'pl' }[t.priority] || 'pm';
          var pLbl = (t.priority||'medium').toLowerCase();
          var fmt = t.dueDate ? fmtDate(t.dueDate) : '';
          var avc = AVC[t.assignee] || '#666';
          return '<div class="kcard" draggable="true" id="kc-' + t.id + '"' +
            ' ondragstart="dragId=' + t.id + ';var e=document.getElementById(\'kc-'+t.id+'\');if(e)e.classList.add(\'dragging\')"' +
            ' ondragend="document.querySelectorAll(\'.kcard\').forEach(function(x){x.classList.remove(\'dragging\')})"' +
            ' onclick="openDetail(' + t.id + ')">' +
            '<div class="kcard-title">' + esc(t.title) + '</div>' +
            '<div class="kcard-meta">' +
              '<span class="pb ' + pb + '">' + pLbl + '</span>' +
              (fmt ? '<span style="font-size:10px;color:var(--text2)">📅 ' + fmt + '</span>' : '') +
              '<div class="aav" style="margin-left:auto;background:' + avc + '">' + esc((t.assignee||'?')[0]) + '</div>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<button class="kadd" onclick="openModal(\'' + col.id + '\')">+ Add task</button>' +
    '</div>';
  }).join('');
  document.getElementById('kanban-board').innerHTML = html;
}

function doDrop(e, status) {
  e.preventDefault();
  document.querySelectorAll('.kdrop').forEach(function(d){ d.classList.remove('over'); });
  if (!dragId) return;
  apiFetch('PATCH', '/tasks/' + dragId + '/move?status=' + status, null)
    .then(function() {
      showToast('Moved to ' + status.toLowerCase(), '⊞');
      addActivity('You', 'ME', '#8b7cf8', 'moved a task to ' + status.toLowerCase());
      loadAll();
    })
    .catch(function(e){ showToast('Move failed', '✕'); });
  dragId = null;
}

// ── Dashboard ─────────────────────────────────────────────────
function renderDash() {
  apiGet('/tasks/stats').then(function(s) {
    var total = s.total || 1;
    var projs = ['Design','Engineering','Marketing','General'].map(function(p) {
      return {
        name:  p,
        color: PC[p],
        total: allTasks.filter(function(t){ return t.project===p; }).length,
        done:  allTasks.filter(function(t){ return t.project===p && t.done; }).length
      };
    });
    var statuses = [
      { lbl:'To do',       count: s.todo||0,       color:'#9090b0' },
      { lbl:'In progress', count: s.inProgress||0,  color:'#8b7cf8' },
      { lbl:'In review',   count: s.review||0,      color:'#fbbf24' },
      { lbl:'Done',        count: s.done||0,         color:'#4ade80' }
    ];
    var pris = [
      { lbl:'High',   count: s.high||0,   color:'#f87171' },
      { lbl:'Medium', count: s.medium||0, color:'#fbbf24' },
      { lbl:'Low',    count: s.low||0,    color:'#4ade80'  }
    ];
    var hmap = Array.from({length:28}, function(){ return Math.floor(Math.random()*4); });
    var donut = buildDonut(statuses, total);

    document.getElementById('dash-content').innerHTML =
      '<div class="dash-grid">' +

      '<div class="dcard"><div class="dcard-title">Progress by project</div>' +
      projs.map(function(p) {
        var pct = p.total ? Math.round(p.done/p.total*100) : 0;
        return '<div class="bar-row"><span class="bar-lbl">' + p.name + '</span>' +
               '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+p.color+'"></div></div>' +
               '<span class="bar-val">'+pct+'%</span></div>';
      }).join('') + '</div>' +

      '<div class="dcard"><div class="dcard-title">Status breakdown</div>' +
      '<div class="donut-wrap">' +
        '<svg width="90" height="90" viewBox="0 0 90 90">' + donut + '</svg>' +
        '<div class="donut-legend">' +
        statuses.map(function(s){
          return '<div class="donut-item"><span class="donut-dot" style="background:'+s.color+'"></span>'+s.lbl+' ('+s.count+')</div>';
        }).join('') +
        '</div></div></div>' +

      '<div class="dcard"><div class="dcard-title">Priority distribution</div>' +
      pris.map(function(p) {
        var pct = Math.round(p.count/total*100);
        return '<div class="bar-row"><span class="bar-lbl">'+p.lbl+'</span>' +
               '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+p.color+'"></div></div>' +
               '<span class="bar-val">'+p.count+'</span></div>';
      }).join('') + '</div>' +

      '<div class="dcard"><div class="dcard-title">Activity heatmap</div>' +
      '<div class="hmap">' +
      hmap.map(function(v){
        return '<div class="hcell" style="background:rgba(139,124,248,'+ [0,.3,.6,.9][v] +')"></div>';
      }).join('') +
      '</div><div style="display:flex;justify-content:space-between;margin-top:6px">' +
      '<span style="font-size:10px;color:var(--text2)">4w ago</span>' +
      '<span style="font-size:10px;color:var(--text2)">Today</span></div></div>' +

      '<div class="dcard" style="grid-column:1/-1"><div class="dcard-title">Recent activity</div>' +
      activityFeed.slice(0,6).map(function(a) {
        return '<div class="act-item">' +
          '<div class="act-av" style="background:'+a.color+'">'+a.init+'</div>' +
          '<div><div class="act-name">'+esc(a.user)+'</div>' +
          '<div class="act-txt">'+esc(a.action)+'</div>' +
          '<div class="act-time">'+a.time+'</div></div></div>';
      }).join('') + '</div>' +

      '</div>';
  }).catch(function(e){ console.error('Dashboard:', e); });
}

function buildDonut(segs, total) {
  var cx = 45, cy = 45, r = 32;
  var start = -Math.PI / 2;
  var paths = segs.map(function(s) {
    var angle = (s.count / total) * Math.PI * 2;
    if (angle < 0.01) return '';
    var x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    var x2 = cx + r * Math.cos(start + angle), y2 = cy + r * Math.sin(start + angle);
    var large = angle > Math.PI ? 1 : 0;
    var d = 'M'+cx+','+cy+' L'+x1.toFixed(1)+','+y1.toFixed(1)+
            ' A'+r+','+r+' 0 '+large+',1 '+x2.toFixed(1)+','+y2.toFixed(1)+' Z';
    start += angle;
    return '<path d="'+d+'" fill="'+s.color+'" opacity="0.85"/>';
  }).join('');
  var pct = total ? Math.round((segs[3] ? segs[3].count : 0) / total * 100) : 0;
  return paths +
    '<circle cx="'+cx+'" cy="'+cy+'" r="18" fill="var(--bg2)"/>' +
    '<text x="'+cx+'" y="'+(cy+4)+'" text-anchor="middle" fill="var(--text)" font-size="13" font-weight="700">'+pct+'%</text>';
}

// ── Detail Panel ──────────────────────────────────────────────
function openDetail(id) {
  openDetailId = id;
  document.getElementById('detail-panel').innerHTML = '<div style="padding:1rem;color:var(--text2);font-size:12px">Loading…</div>';
  document.getElementById('detail-panel').classList.add('open');
  apiGet('/tasks/' + id).then(function(t) {
    renderDetail(t);
  }).catch(function(){ document.getElementById('detail-panel').classList.remove('open'); });
}

function renderDetail(t) {
  var pb   = { HIGH:'ph', MEDIUM:'pm', LOW:'pl' }[t.priority] || 'pm';
  var pLbl = (t.priority||'medium').toLowerCase();
  var fmt  = t.dueDate ? fmtDate(t.dueDate) : 'No due date';
  var tags = (t.tags||'').split(',').filter(function(x){ return x.trim(); })
               .map(function(x){ return '<span class="ttag">'+esc(x.trim())+'</span>'; }).join(' ');
  var cmts = (t.comments||[]).map(function(c) {
    return '<div class="cmt-item">' +
      '<div class="cmt-auth">'+esc(c.author)+'</div>' +
      '<div class="cmt-text">'+esc(c.text)+'</div>' +
      '<div class="cmt-time">'+fmtDateTime(c.createdAt)+'</div>' +
    '</div>';
  }).join('');

  document.getElementById('detail-panel').innerHTML =
    '<div class="dp-hdr"><h4 title="'+esc(t.title)+'">'+esc(t.title)+'</h4>' +
    '<button class="icon-btn" onclick="closeDetail()">✕</button></div>' +
    '<div class="dp-body">' +
      '<div class="dp-sec"><div class="dp-lbl">Description</div>' +
        '<div class="dp-val">'+esc(t.description||'No description.')+'</div></div>' +
      '<div class="dp-sec"><div class="dp-lbl">Status & Priority</div>' +
        '<div style="display:flex;gap:6px;margin-top:4px">' +
          '<span class="pb '+pb+'">'+pLbl+'</span>' +
          '<span style="font-size:11px;background:var(--bg3);padding:2px 7px;border-radius:5px;color:var(--text2)">'+(t.status||'')+'</span>' +
        '</div></div>' +
      '<div class="dp-sec"><div class="dp-lbl">Details</div>' +
        '<div class="dp-meta">📅 '+fmt+'<br>📁 '+(t.project||'—')+'<br>👤 '+(t.assignee||'—')+'</div></div>' +
      (tags ? '<div class="dp-sec"><div class="dp-lbl">Tags</div><div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">'+tags+'</div></div>' : '') +
      '<div class="dp-sec"><div class="dp-lbl">Comments ('+(t.comments||[]).length+')</div>' +
        '<div id="cmt-list">'+(cmts||'<div style="font-size:11px;color:var(--text2)">No comments yet.</div>')+'</div>' +
        '<div class="cmt-row">' +
          '<input id="cmt-in" type="text" placeholder="Add a comment…" onkeydown="if(event.key===\'Enter\')doAddComment('+t.id+')"/>' +
          '<button class="cmt-send" onclick="doAddComment('+t.id+')">Send</button>' +
        '</div></div>' +
      '<div class="dp-btns">' +
        '<button class="btn-edit" onclick="doEdit('+t.id+')">Edit task</button>' +
        '<button class="btn-del" onclick="doDelete('+t.id+');closeDetail()">Delete</button>' +
      '</div>' +
    '</div>';
}

function closeDetail() {
  openDetailId = null;
  document.getElementById('detail-panel').classList.remove('open');
}

function doAddComment(taskId) {
  var inp  = document.getElementById('cmt-in');
  var text = inp ? inp.value.trim() : '';
  if (!text) return;
  apiPost('/tasks/' + taskId + '/comments', { text: text })
    .then(function() {
      inp.value = '';
      showToast('Comment added', '💬');
      addActivity('You','ME','#8b7cf8','commented on a task');
      openDetail(taskId);
      loadAll();
    })
    .catch(function(e){ showToast('Failed: ' + e.message, '✕'); });
}

// ── Task CRUD ─────────────────────────────────────────────────
function openModal(defaultStatus) {
  editingId = null;
  document.getElementById('modal-ttl').textContent = 'New task';
  document.getElementById('f-title').value    = '';
  document.getElementById('f-desc').value     = '';
  document.getElementById('f-status').value   = defaultStatus || 'TODO';
  document.getElementById('f-priority').value  = 'MEDIUM';
  document.getElementById('f-due').value      = '';
  document.getElementById('f-project').value  = 'General';
  document.getElementById('f-assignee').value = 'You';
  document.getElementById('f-tags').value     = '';
  document.getElementById('f-err').textContent = '';
  document.getElementById('modal-ov').style.display = 'flex';
  setTimeout(function(){ document.getElementById('f-title').focus(); }, 80);
}

function doEdit(id) {
  var t = allTasks.find(function(x){ return x.id === id; });
  if (!t) { apiGet('/tasks/'+id).then(function(t2){ fillModal(t2); }); return; }
  fillModal(t);
}

function fillModal(t) {
  editingId = t.id;
  document.getElementById('modal-ttl').textContent = 'Edit task';
  document.getElementById('f-title').value    = t.title || '';
  document.getElementById('f-desc').value     = t.description || '';
  document.getElementById('f-status').value   = t.status || 'TODO';
  document.getElementById('f-priority').value  = t.priority || 'MEDIUM';
  document.getElementById('f-due').value      = t.dueDate || '';
  document.getElementById('f-project').value  = t.project || 'General';
  document.getElementById('f-assignee').value = t.assignee || 'You';
  document.getElementById('f-tags').value     = t.tags || '';
  document.getElementById('f-err').textContent = '';
  document.getElementById('modal-ov').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-ov').style.display = 'none';
}

function saveTask() {
  var title = document.getElementById('f-title').value.trim();
  if (!title) { document.getElementById('f-err').textContent = 'Title is required.'; return; }
  var body = {
    title:       title,
    description: document.getElementById('f-desc').value,
    status:      document.getElementById('f-status').value,
    priority:    document.getElementById('f-priority').value,
    dueDate:     document.getElementById('f-due').value || null,
    project:     document.getElementById('f-project').value,
    assignee:    document.getElementById('f-assignee').value,
    tags:        document.getElementById('f-tags').value
  };
  var req = editingId
    ? apiPut('/tasks/' + editingId, body)
    : apiPost('/tasks', body);
  req.then(function() {
      var msg = editingId ? 'Task updated' : 'Task created';
      showToast(msg, editingId ? '✎' : '✦');
      addActivity('You','ME','#8b7cf8', (editingId?'updated':'created') + ' "' + title + '"');
      if (editingId && openDetailId === editingId) openDetail(editingId);
      closeModal();
      loadAll();
    })
    .catch(function(e){ document.getElementById('f-err').textContent = e.message; });
}

function doToggle(id) {
  apiPatch('/tasks/' + id + '/toggle').then(function(t) {
    showToast(t.done ? 'Task completed' : 'Task reopened', t.done ? '✓' : '◎');
    addActivity('You','ME','#8b7cf8', (t.done?'completed':'reopened') + ' "'+t.title+'"');
    if (openDetailId === id) openDetail(id);
    loadAll();
  }).catch(function(e){ showToast('Error: '+e.message,'✕'); });
}

function doDelete(id) {
  var t = allTasks.find(function(x){ return x.id===id; });
  apiDel('/tasks/' + id).then(function() {
    showToast('Task deleted', '✕');
    addActivity('You','ME','#8b7cf8','deleted "'+(t?t.title:'task')+'"');
    if (openDetailId === id) closeDetail();
    loadAll();
  }).catch(function(e){ showToast('Error: '+e.message,'✕'); });
}

// ── Notifications ─────────────────────────────────────────────
function seedNotifications() {
  notifications = [
    { id:1, icon:'✦', bg:'rgba(139,124,248,.2)',  title:'New task assigned',        sub:'Fix mobile nav bug — from Bob',          time:'5 min ago', read:false },
    { id:2, icon:'💬', bg:'rgba(45,212,191,.15)', title:'New comment on your task', sub:'Carol: "Need conversion numbers too."',  time:'3h ago',    read:false },
    { id:3, icon:'✓',  bg:'rgba(74,222,128,.15)', title:'Task completed',           sub:'Social assets marked done by Carol',     time:'1d ago',    read:true  },
    { id:4, icon:'⚠',  bg:'rgba(251,191,36,.15)', title:'Task overdue',             sub:'Fix mobile nav bug is past due',         time:'1d ago',    read:false }
  ];
  renderNotifBadge();
}

function seedActivity() {
  activityFeed = [
    { id:1, user:'Alice', init:'AL', color:'#8b7cf8', action:'completed "Design tokens" review',    time:'2 min ago' },
    { id:2, user:'Bob',   init:'BO', color:'#2dd4bf', action:'created task "API rate limiting"',     time:'15 min ago' },
    { id:3, user:'You',   init:'ME', color:'#8b7cf8', action:'commented on "Q2 performance report"', time:'1h ago' },
    { id:4, user:'Carol', init:'CA', color:'#f87171', action:'moved "Launch assets" to Done',        time:'1d ago' }
  ];
}

function addActivity(user, init, color, action) {
  activityFeed.unshift({ id: Date.now(), user:user, init:init, color:color, action:action, time:'Just now' });
  if (activityFeed.length > 20) activityFeed.length = 20;
}

function renderNotifBadge() {
  var unread = notifications.filter(function(n){ return !n.read; }).length;
  document.getElementById('notif-badge').style.display = unread ? 'block' : 'none';
}

function toggleNotif() {
  var p = document.getElementById('notif-panel');
  var open = p.style.display === 'block';
  p.style.display = open ? 'none' : 'block';
  if (!open) renderNotifPanel();
}

function renderNotifPanel() {
  var unread = notifications.filter(function(n){ return !n.read; }).length;
  var html =
    '<div class="np-hdr"><h4>Notifications' +
    (unread ? ' <span style="background:var(--purple3);color:var(--purple);font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px">'+unread+'</span>' : '') +
    '</h4><span class="np-clear" onclick="markAllRead()">Mark all read</span></div>';
  html += notifications.slice(0,8).map(function(n) {
    return '<div class="ni-item'+(n.read?'':' unread')+'" onclick="markRead('+n.id+')">' +
      '<div class="ni-icon" style="background:'+n.bg+'">'+n.icon+'</div>' +
      '<div class="ni-body"><div class="ni-title">'+esc(n.title)+'</div>' +
      '<div class="ni-sub">'+esc(n.sub)+'</div>' +
      '<div class="ni-time">'+n.time+'</div></div>' +
      (n.read ? '' : '<div class="ni-udot"></div>') +
    '</div>';
  }).join('');
  document.getElementById('notif-panel').innerHTML = html;
}

function markRead(id) {
  var n = notifications.find(function(x){ return x.id===id; });
  if (n) n.read = true;
  renderNotifPanel(); renderNotifBadge();
}
function markAllRead() {
  notifications.forEach(function(n){ n.read=true; });
  renderNotifPanel(); renderNotifBadge();
}

document.addEventListener('click', function(e) {
  var btn = document.getElementById('notif-btn');
  var pan = document.getElementById('notif-panel');
  if (pan && !pan.contains(e.target) && btn && !btn.contains(e.target))
    pan.style.display = 'none';
});

// ── Live Simulator ─────────────────────────────────────────────
function liveUpdate() {
  var msgs = [
    ['Alice updated "Hero redesign" status',    'Alice','AL','#8b7cf8'],
    ['Bob pushed commits to Engineering',         'Bob','BO','#2dd4bf'],
    ['New comment on "Q2 report"',                'Carol','CA','#f87171'],
    ['Carol completed a Design task',             'Carol','CA','#f87171']
  ];
  var m = msgs[Math.floor(Math.random() * msgs.length)];
  addActivity(m[1], m[2], m[3], m[0]);
  notifications.unshift({ id:Date.now(), icon:'◉', bg:'rgba(74,222,128,.15)', title:'Live update', sub:m[0], time:'Just now', read:false });
  if (notifications.length > 20) notifications.length = 20;
  renderNotifBadge();
  showToast(m[0], '◉');
  if (currentView === 'dashboard') renderDash();
}

// ── Sidebar badges ────────────────────────────────────────────
function renderSideBadges() {
  var today   = new Date().toISOString().slice(0,10);
  var pending = allTasks.filter(function(t){ return !t.done; }).length;
  var todayN  = allTasks.filter(function(t){ return t.dueDate===today && !t.done; }).length;
  var nbAll   = document.getElementById('nb-all');
  var nbToday = document.getElementById('nb-today');
  if (nbAll)   nbAll.textContent   = pending || '';
  if (nbToday) nbToday.textContent = todayN  || '';
}

// ── Toast ──────────────────────────────────────────────────────
function showToast(msg, icon) {
  clearTimeout(toastTimer);
  var el = document.getElementById('toast');
  el.innerHTML = '<span>'+(icon||'✓')+'</span><span>'+esc(msg)+'</span>';
  el.style.display = 'flex';
  toastTimer = setTimeout(function(){ el.style.display='none'; }, 3000);
}

// ── Helpers ────────────────────────────────────────────────────
function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en', { month:'short', day:'numeric' });
  } catch(e) { return d; }
}

function fmtDateTime(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString('en', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch(e) { return ''; }
}

// ── Keyboard shortcuts ─────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeModal(); closeDetail(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openModal(null); }
});

// ── Auto-login if token exists ─────────────────────────────────
if (token && currentUser) {
  launchApp();
}
