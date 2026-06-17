// =============================================
//  FUTEVÔLEI.NET — Core State & Auth
// =============================================

// ─── Simple hash (SHA-256 via SubtleCrypto) ──
async function hashPassword(password) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ─── LocalStorage helpers ─────────────────────
const DB = {
  get: (k) => { try { return JSON.parse(localStorage.getItem('fv_'+k)); } catch { return null; } },
  set: (k,v) => localStorage.setItem('fv_'+k, JSON.stringify(v)),
  del: (k)   => localStorage.removeItem('fv_'+k),
};

// ─── Data initialization ──────────────────────
function initDB() {
  if (!DB.get('users'))         DB.set('users', []);
  if (!DB.get('competitions'))  DB.set('competitions', []);
  if (!DB.get('notifications')) DB.set('notifications', []);
  if (!DB.get('registrations')) DB.set('registrations', []);
  if (!DB.get('session'))       DB.set('session', null);
}

// ─── Auth ─────────────────────────────────────
const Auth = {
  current: () => DB.get('session'),

  async register(data) {
    const users = DB.get('users') || [];
    if (users.find(u => u.username === data.username))
      return { ok: false, error: 'Nome de usuário já existe.' };
    if (users.find(u => u.cpf === data.cpf))
      return { ok: false, error: 'CPF já cadastrado.' };
    const hash = await hashPassword(data.password);
    const user = {
      id:        crypto.randomUUID(),
      name:      data.name,
      birthdate: data.birthdate,
      cpf:       data.cpf,
      sex:       data.sex,
      username:  data.username,
      alias:     data.alias,
      passwordHash: hash,
      photo:     null,
      level:     'Iniciante',
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    DB.set('users', users);
    return { ok: true, user };
  },

  async login(username, password) {
    const users = DB.get('users') || [];
    const user = users.find(u => u.username === username);
    if (!user) return { ok: false, error: 'Usuário não encontrado.' };
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) return { ok: false, error: 'Senha incorreta.' };
    DB.set('session', { userId: user.id });
    return { ok: true, user };
  },

  logout() {
    DB.set('session', null);
    App.showPage('landing');
    App.render();
  },

  getUser(id) {
    const uid = id || Auth.current()?.userId;
    if (!uid) return null;
    return (DB.get('users') || []).find(u => u.id === uid) || null;
  },

  updateUser(id, changes) {
    const users = DB.get('users') || [];
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    users[idx] = { ...users[idx], ...changes };
    DB.set('users', users);
    return true;
  },

  isLoggedIn() { return !!Auth.current(); },
};

// ─── Competition helpers ──────────────────────
const Comps = {
  getAll()    { return DB.get('competitions') || []; },
  getById(id) { return Comps.getAll().find(c => c.id === id) || null; },

  add(comp) {
    const comps = Comps.getAll();
    comps.push(comp);
    DB.set('competitions', comps);
  },

  update(id, changes) {
    const comps = Comps.getAll();
    const idx = comps.findIndex(c => c.id === id);
    if (idx === -1) return false;
    comps[idx] = { ...comps[idx], ...changes };
    DB.set('competitions', comps);
    return true;
  },
};

// ─── Registration helpers ─────────────────────
const Regs = {
  getAll()            { return DB.get('registrations') || []; },
  getByComp(compId)   { return Regs.getAll().filter(r => r.compId === compId); },
  getByUser(userId)   { return Regs.getAll().filter(r => r.userId === userId || r.partnerId === userId); },

  add(reg) {
    const regs = Regs.getAll();
    regs.push(reg);
    DB.set('registrations', regs);
  },

  update(id, changes) {
    const regs = Regs.getAll();
    const idx = regs.findIndex(r => r.id === id);
    if (idx === -1) return false;
    regs[idx] = { ...regs[idx], ...changes };
    DB.set('registrations', regs);
    return true;
  },

  hasPair(compId, userId, partnerId) {
    return Regs.getAll().some(r =>
      r.compId === compId && r.status !== 'cancelled' &&
      ((r.userId === userId && r.partnerId === partnerId) ||
       (r.userId === partnerId && r.partnerId === userId))
    );
  },

  isUserRegistered(compId, userId) {
    return Regs.getAll().some(r =>
      r.compId === compId && r.status !== 'cancelled' &&
      (r.userId === userId || r.partnerId === userId)
    );
  },
};

// ─── Notification helpers ─────────────────────
const Notifs = {
  getAll()           { return DB.get('notifications') || []; },
  getByUser(userId)  { return Notifs.getAll().filter(n => n.toUserId === userId); },
  getUnread(userId)  { return Notifs.getByUser(userId).filter(n => !n.read); },

  add(notif) {
    const all = Notifs.getAll();
    all.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false, ...notif });
    DB.set('notifications', all);
  },

  markRead(id) {
    const all = Notifs.getAll();
    const n = all.find(x => x.id === id);
    if (n) { n.read = true; DB.set('notifications', all); }
  },

  markAllRead(userId) {
    const all = Notifs.getAll();
    all.filter(n => n.toUserId === userId).forEach(n => n.read = true);
    DB.set('notifications', all);
  },
};

// ─── Utility functions ─────────────────────────
const Utils = {
  calcAge(birthdate) {
    if (!birthdate) return null;
    const today = new Date();
    const bday  = new Date(birthdate);
    let age = today.getFullYear() - bday.getFullYear();
    const m = today.getMonth() - bday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--;
    return age;
  },

  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
  },

  formatDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
  },

  formatCPF(cpf) {
    const d = cpf.replace(/\D/g,'');
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },

  formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(val);
  },

  timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff/60000);
    if (mins < 1)  return 'agora';
    if (mins < 60) return `${mins}m atrás`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24)  return `${hrs}h atrás`;
    const days = Math.floor(hrs/24);
    return `${days}d atrás`;
  },

  initials(name) {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  },

  sexLabel(sex) {
    return { M:'Masculino', F:'Feminino', O:'Outro' }[sex] || sex;
  },

  levelColor(level) {
    return {
      'Iniciante':     'badge-green',
      'Intermediário': 'badge-ocean',
      'Avançado':      'badge-sunset',
      'Elite':         'badge-sand',
    }[level] || 'badge-gray';
  },

  catColor(cat) {
    const m = {
      'Masculino':'badge-ocean','Feminino':'badge-sunset','Misto':'badge-sand',
      'Iniciante':'badge-green','Intermediário':'badge-ocean','Avançado':'badge-sunset','Elite':'badge-sand',
    };
    return m[cat] || 'badge-gray';
  },

  sanitize(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  avatarHTML(user, cls='avatar-md') {
    if (user?.photo) {
      return `<div class="avatar ${cls}"><img src="${user.photo}" alt="${Utils.sanitize(user.name)}"></div>`;
    }
    return `<div class="avatar ${cls}">${Utils.initials(user?.name || user?.username || '?')}</div>`;
  },
};

// ─── Toast system ─────────────────────────────
const Toast = {
  show(title, msg='', type='info') {
    const icons = { info:'ℹ️', success:'✅', error:'❌', warning:'⚠️', pair:'🤝' };
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="toast-icon">${icons[type]||'ℹ️'}</div>
      <div class="toast-body"><div class="toast-title">${Utils.sanitize(title)}</div>
      ${msg ? `<div class="toast-msg">${Utils.sanitize(msg)}</div>` : ''}</div>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    }, 3500);
  },
};

// ─── Modal helpers ────────────────────────────
const Modal = {
  open(id)  { document.getElementById(id)?.classList.add('open'); },
  close(id) { document.getElementById(id)?.classList.remove('open'); },
  closeAll() { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); },
};

// ─── Theme ────────────────────────────────────
const Theme = {
  current() { return localStorage.getItem('fv_theme') || 'light'; },
  toggle() {
    const next = Theme.current() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('fv_theme', next);
    Theme.apply();
  },
  apply() {
    const t = Theme.current();
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.btn-theme').forEach(b => {
      b.textContent = t === 'dark' ? '☀️' : '🌙';
      b.title = t === 'dark' ? 'Modo claro' : 'Modo escuro';
    });
  },
};

// ─── Router/App shell ─────────────────────────
const App = {
  pages: {},

  register(name, fn) { App.pages[name] = fn; },

  showPage(name, data={}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + name);
    if (el) {
      el.classList.add('active');
      window.scrollTo(0, 0);
    }
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === name);
    });
    if (App.pages[name]) App.pages[name](data);
  },

  render() {
    const user = Auth.getUser();
    const loggedIn = Auth.isLoggedIn();
    const navGuest = document.getElementById('nav-guest');
    const navUser  = document.getElementById('nav-user');
    if (navGuest) navGuest.classList.toggle('hidden', loggedIn);
    if (navUser)  navUser.classList.toggle('hidden', !loggedIn);
    if (loggedIn && user) {
      const avatarEl = document.getElementById('nav-avatar-img');
      if (avatarEl) {
        if (user.photo) {
          avatarEl.innerHTML = `<img src="${user.photo}" alt="${user.name}">`;
        } else {
          avatarEl.textContent = Utils.initials(user.name);
        }
      }
      const unread = Notifs.getUnread(user.id).length;
      const dot = document.getElementById('notif-dot');
      if (dot) dot.classList.toggle('visible', unread > 0);
    }
  },
};

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initDB();
  Theme.apply();
});
