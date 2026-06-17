// =============================================
//  FUTEVÔLEI.NET — Actions & Modals
// =============================================

// ─── AUTH FORMS ───────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type=submit]');
  const errEl = document.getElementById('reg-error');

  const data = {
    name:      form.reg_name.value.trim(),
    birthdate: form.reg_birthdate.value,
    cpf:       form.reg_cpf.value.replace(/\D/g,''),
    sex:       form.reg_sex.value,
    username:  form.reg_username.value.trim().toLowerCase(),
    alias:     form.reg_alias.value.trim(),
    password:  form.reg_password.value,
  };

  if (!data.name || !data.birthdate || !data.cpf || !data.sex || !data.username || !data.password) {
    errEl.textContent = 'Preencha todos os campos obrigatórios.'; return;
  }
  if (data.cpf.length !== 11) {
    errEl.textContent = 'CPF inválido (11 dígitos).'; return;
  }
  if (data.password.length < 6) {
    errEl.textContent = 'Senha deve ter no mínimo 6 caracteres.'; return;
  }
  if (!/^[a-z0-9_]{3,20}$/.test(data.username)) {
    errEl.textContent = 'Usuário: 3-20 chars, apenas letras, números e _.'; return;
  }

  btn.disabled = true; btn.textContent = 'Criando conta...';
  errEl.textContent = '';
  const res = await Auth.register(data);
  btn.disabled = false; btn.textContent = 'Criar Conta';

  if (!res.ok) { errEl.textContent = res.error; return; }
  await Auth.login(data.username, data.password);
  Modal.close('modal-register');
  App.render();
  App.showPage('profile', { userId: res.user.id });
  Toast.show('Bem-vindo!', `Conta criada para @${data.username}`, 'success');
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type=submit]');
  const errEl = document.getElementById('login-error');

  const username = form.login_username.value.trim().toLowerCase();
  const password = form.login_password.value;
  if (!username || !password) { errEl.textContent = 'Preencha usuário e senha.'; return; }

  btn.disabled = true; btn.textContent = 'Entrando...';
  errEl.textContent = '';
  const res = await Auth.login(username, password);
  btn.disabled = false; btn.textContent = 'Entrar';

  if (!res.ok) { errEl.textContent = res.error; return; }
  Modal.close('modal-login');
  App.render();
  App.showPage('home');
  Toast.show('Bem-vindo de volta!', `Olá, @${username}`, 'success');
}

// ─── COMPETITION FORM ──────────────────────────
function openAddCompModal() {
  if (!Auth.isLoggedIn()) { openLoginModal(); return; }
  Modal.open('modal-add-comp');
}

function handleAddComp(e) {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById('comp-error');
  const checkboxes = form.querySelectorAll('input[name=cat]:checked');
  const categories = Array.from(checkboxes).map(c => c.value);

  if (!form.comp_name.value.trim()) { errEl.textContent = 'Informe o nome.'; return; }
  if (!form.comp_date.value) { errEl.textContent = 'Informe a data.'; return; }
  if (!categories.length) { errEl.textContent = 'Selecione ao menos uma categoria.'; return; }

  const user = Auth.getUser();
  const comp = {
    id:         crypto.randomUUID(),
    name:       form.comp_name.value.trim(),
    date:       form.comp_date.value,
    location:   form.comp_location.value.trim(),
    categories,
    price:      parseFloat(form.comp_price.value) || 0,
    instagram:  form.comp_instagram.value.replace('@','').trim(),
    creatorId:  user.id,
    createdAt:  new Date().toISOString(),
    description: form.comp_description.value.trim(),
  };

  Comps.add(comp);
  form.reset();
  errEl.textContent = '';
  Modal.close('modal-add-comp');
  Toast.show('Competição criada!', comp.name, 'success');
  if (document.getElementById('competitions-content').parentElement.classList.contains('active') ||
      document.getElementById('page-competitions').classList.contains('active')) {
    renderCompetitionsPage();
  }
}

// ─── COMPETITION DETAIL MODAL ──────────────────
function openCompModal(compId) {
  const comp = Comps.getById(compId);
  if (!comp) return;
  const user = Auth.getUser();
  const regs = Regs.getByComp(compId);
  const confirmedPairs = regs.filter(r=>r.status==='confirmed');
  const isReg = user ? Regs.isUserRegistered(compId, user.id) : false;
  const isPast = new Date(comp.date) < new Date();

  document.getElementById('comp-detail-content').innerHTML = `
    <div style="background:linear-gradient(135deg,var(--ocean-600),var(--sunset));height:6px;border-radius:6px;margin-bottom:20px"></div>
    <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:8px">${Utils.sanitize(comp.name)}</h2>
    <div class="flex gap-8 mb-16" style="flex-wrap:wrap">
      ${(comp.categories||[]).map(c=>`<span class="badge ${Utils.catColor(c)}">${Utils.sanitize(c)}</span>`).join('')}
      <span class="badge ${isPast?'badge-gray':'badge-green'}">${isPast?'Encerrado':'Inscrições abertas'}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="card" style="padding:12px"><div class="text-xs text-muted mb-4">Data</div><div class="fw-600">📅 ${Utils.formatDate(comp.date)}</div></div>
      <div class="card" style="padding:12px"><div class="text-xs text-muted mb-4">Valor</div><div class="fw-600 font-mono text-accent">${comp.price > 0 ? Utils.formatCurrency(comp.price) : 'Gratuito'}</div></div>
      ${comp.location ? `<div class="card" style="padding:12px"><div class="text-xs text-muted mb-4">Local</div><div class="fw-600">📍 ${Utils.sanitize(comp.location)}</div></div>` : ''}
      ${comp.instagram ? `<div class="card" style="padding:12px"><div class="text-xs text-muted mb-4">Instagram</div><div class="fw-600">📸 @${Utils.sanitize(comp.instagram)}</div></div>` : ''}
      <div class="card" style="padding:12px"><div class="text-xs text-muted mb-4">Duplas inscritas</div><div class="fw-600">👥 ${confirmedPairs.length}</div></div>
    </div>
    ${comp.description ? `<p class="text-sm text-muted mb-16">${Utils.sanitize(comp.description)}</p>` : ''}
    ${confirmedPairs.length ? `
    <h3 class="fw-700 text-sm mb-12">Duplas confirmadas</h3>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      ${confirmedPairs.map(r => {
        const u1 = Auth.getUser(r.userId);
        const u2 = Auth.getUser(r.partnerId);
        return `<div class="card" style="padding:10px 14px">
          <div class="flex items-center gap-8">
            ${Utils.avatarHTML(u1,'avatar-sm')} <span class="text-sm fw-600">@${Utils.sanitize(u1?.username||'?')}</span>
            <span class="text-muted">+</span>
            ${Utils.avatarHTML(u2,'avatar-sm')} <span class="text-sm fw-600">@${Utils.sanitize(u2?.username||'?')}</span>
            <div style="flex:1"></div>
            <span class="badge badge-gray text-xs">${(r.category||[]).join(', ')}</span>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}
    ${user && !isPast ? `
    <button class="btn ${isReg?'btn-outline':'btn-cta'} btn-full" onclick="${isReg?'':''openRegModal(\''+compId+'\')'}">
      ${isReg ? '✓ Você já está inscrito' : '🏐 Inscrever minha dupla'}
    </button>` : ''}`;
  Modal.open('modal-comp-detail');
}

// ─── REGISTRATION FLOW ─────────────────────────
let _regCompId = null;

function openRegModal(compId) {
  if (!Auth.isLoggedIn()) { openLoginModal(); return; }
  const comp = Comps.getById(compId);
  if (!comp) return;
  _regCompId = compId;

  const user = Auth.getUser();
  const el = document.getElementById('reg-modal-content');

  // categories are combined strings like "Masculino Iniciante"
  const cats = comp.categories || [];
  const catOpts = cats.map(c => {
    const lvl = c.split(' ')[1] || '';
    const hint = lvl === user.level ? ' ★ recomendada' : '';
    return `<option value="${c}">${c}${hint}</option>`;
  }).join('');

  el.innerHTML = `
    <h2 class="modal-title">🏐 Inscrição</h2>
    <p class="text-sm text-muted">${Utils.sanitize(comp.name)} · ${Utils.formatDate(comp.date)}</p>
    <hr class="divider">

    <div class="form-group">
      <label class="form-label">Sua dupla (usuário)</label>
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input id="reg-partner-input" class="form-control" placeholder="@usuário do parceiro..."
          oninput="searchPartner(this.value)">
      </div>
      <div id="reg-partner-results" style="margin-top:4px"></div>
      <div id="reg-partner-selected" class="hidden" style="margin-top:8px"></div>
    </div>

    ${cats.length ? `
    <div class="form-group">
      <label class="form-label">Categoria *</label>
      <select class="form-control" id="reg-cat">
        <option value="">Selecione a categoria da dupla...</option>
        ${catOpts}
      </select>
      <span class="form-hint">★ indica a categoria compatível com seu nível (${Utils.sanitize(user.level)})</span>
    </div>` : ''}

    <div id="reg-error" class="form-error"></div>
    <button class="btn btn-cta btn-full" onclick="submitRegistration()">Enviar convite à dupla 🤝</button>`;

  Modal.open('modal-register-comp');
}

let _selectedPartnerId = null;

function searchPartner(query) {
  const q = query.trim().replace('@','').toLowerCase();
  const resEl = document.getElementById('reg-partner-results');
  _selectedPartnerId = null;
  document.getElementById('reg-partner-selected').classList.add('hidden');

  if (q.length < 2) { resEl.innerHTML = ''; return; }
  const me = Auth.getUser();
  const users = (DB.get('users')||[]).filter(u =>
    u.id !== me.id &&
    (u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || (u.alias||'').toLowerCase().includes(q))
  ).slice(0,5);

  if (!users.length) { resEl.innerHTML = '<p class="text-xs text-muted" style="padding:4px 0">Nenhum atleta encontrado</p>'; return; }
  resEl.innerHTML = `<div class="card" style="overflow:hidden">${users.map(u => {
    const age = Utils.calcAge(u.birthdate);
    return `<div class="dropdown-item" onclick="selectPartner('${u.id}')">
      ${Utils.avatarHTML(u,'avatar-sm')}
      <div>
        <div class="fw-600 text-sm">${Utils.sanitize(u.name)}</div>
        <div class="text-xs text-muted">@${Utils.sanitize(u.username)} · <span class="badge ${Utils.levelColor(u.level)}" style="font-size:0.65rem">${u.level}</span>${age?` · ${age}a`:''}</div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function selectPartner(userId) {
  _selectedPartnerId = userId;
  const u = Auth.getUser(userId);
  document.getElementById('reg-partner-results').innerHTML = '';
  document.getElementById('reg-partner-input').value = '';
  const selEl = document.getElementById('reg-partner-selected');
  selEl.classList.remove('hidden');
  selEl.innerHTML = `
    <div class="card" style="padding:10px 14px">
      <div class="flex items-center gap-12">
        ${Utils.avatarHTML(u,'avatar-sm')}
        <div style="flex:1">
          <div class="fw-600 text-sm">${Utils.sanitize(u.name)}</div>
          <div class="text-xs text-muted">@${Utils.sanitize(u.username)} · ${u.level}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="_selectedPartnerId=null;document.getElementById('reg-partner-selected').classList.add('hidden')">✕</button>
      </div>
    </div>`;
}

function submitRegistration() {
  const errEl = document.getElementById('reg-error');
  if (!_selectedPartnerId) { errEl.textContent = 'Selecione um parceiro de dupla.'; return; }

  const comp = Comps.getById(_regCompId);
  const me = Auth.getUser();
  const catSexEl = document.getElementById('reg-cat-sex');
  const catLvlEl = document.getElementById('reg-cat-lvl');
  const category = [catSexEl?.value, catLvlEl?.value].filter(Boolean);

  if (catSexEl && !catSexEl.value) { errEl.textContent = 'Selecione a categoria de sexo.'; return; }
  if (catLvlEl && !catLvlEl.value) { errEl.textContent = 'Selecione a categoria de nível.'; return; }

  if (Regs.isUserRegistered(_regCompId, me.id)) { errEl.textContent = 'Você já está inscrito nesta competição.'; return; }
  if (Regs.isUserRegistered(_regCompId, _selectedPartnerId)) { errEl.textContent = 'Este atleta já está inscrito nesta competição.'; return; }

  const reg = {
    id:        crypto.randomUUID(),
    compId:    _regCompId,
    userId:    me.id,
    partnerId: _selectedPartnerId,
    category,
    status:    'pending',
    createdAt: new Date().toISOString(),
  };
  Regs.add(reg);

  const partner = Auth.getUser(_selectedPartnerId);
  Notifs.add({
    toUserId: _selectedPartnerId,
    type:     'pair_invite',
    fromId:   me.id,
    fromName: me.alias || me.name,
    compId:   _regCompId,
    compName: comp.name,
    regId:    reg.id,
  });

  Modal.close('modal-register-comp');
  Modal.close('modal-comp-detail');
  Toast.show('Convite enviado!', `${partner.name} receberá uma notificação.`, 'pair');
  App.render();
}

// ─── PAIR INVITE ACTIONS ───────────────────────
function acceptPairInvite(regId, notifId) {
  Regs.update(regId, { status: 'confirmed' });
  Notifs.markRead(notifId);

  const reg = (DB.get('registrations')||[]).find(r=>r.id===regId);
  const comp = reg ? Comps.getById(reg.compId) : null;
  const me = Auth.getUser();

  if (reg && comp) {
    Notifs.add({
      toUserId: reg.userId,
      type:     'pair_accepted',
      fromId:   me.id,
      fromName: me.alias || me.name,
      compId:   reg.compId,
      compName: comp.name,
    });
  }
  Toast.show('Inscrição confirmada!', comp?.name || '', 'success');
  App.render();
  renderNotificationsPage();
}

function declinePairInvite(regId, notifId) {
  Regs.update(regId, { status: 'cancelled' });
  Notifs.markRead(notifId);

  const reg = (DB.get('registrations')||[]).find(r=>r.id===regId);
  const comp = reg ? Comps.getById(reg.compId) : null;
  const me = Auth.getUser();

  if (reg && comp) {
    Notifs.add({
      toUserId: reg.userId,
      type:     'pair_declined',
      fromId:   me.id,
      fromName: me.alias || me.name,
      compId:   reg.compId,
      compName: comp.name,
    });
  }
  Toast.show('Convite recusado.', '', 'warning');
  App.render();
  renderNotificationsPage();
}

// ─── INVITE MODAL (from athlete profile) ────────
let _inviteTargetId = null;
function openInviteModal(userId) {
  if (!Auth.isLoggedIn()) { openLoginModal(); return; }
  _inviteTargetId = userId;
  const target = Auth.getUser(userId);
  const comps = Comps.getAll().filter(c => new Date(c.date) >= new Date() && !Regs.isUserRegistered(c.id, Auth.current().userId));
  const el = document.getElementById('invite-modal-content');

  el.innerHTML = `
    <h2 class="modal-title">🤝 Convidar ${Utils.sanitize(target.alias||target.name)}</h2>
    <p class="text-sm text-muted">Escolha uma competição para jogar juntos</p>
    <hr class="divider">
    ${comps.length ? `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${comps.map(c=>`
      <div class="card" style="padding:14px;cursor:pointer" onclick="sendPairInviteFromProfile('${c.id}')">
        <div class="fw-600 text-sm">${Utils.sanitize(c.name)}</div>
        <div class="text-xs text-muted mt-4">📅 ${Utils.formatDate(c.date)} · ${Utils.formatCurrency(c.price)}</div>
        <div class="flex gap-4 mt-8">${(c.categories||[]).map(cat=>`<span class="badge ${Utils.catColor(cat)}" style="font-size:.65rem">${cat}</span>`).join('')}</div>
      </div>`).join('')}
    </div>` : '<p class="text-muted text-sm">Nenhuma competição disponível para inscrição.</p>'}`;

  Modal.open('modal-invite');
}

function sendPairInviteFromProfile(compId) {
  _regCompId = compId;
  _selectedPartnerId = _inviteTargetId;
  Modal.close('modal-invite');
  openRegModal(compId);
  // Pre-select partner
  setTimeout(() => selectPartner(_inviteTargetId), 100);
}

// ─── EDIT PROFILE ─────────────────────────────
function openEditProfileModal() {
  const user = Auth.getUser();
  const el = document.getElementById('edit-profile-content');
  el.innerHTML = `
    <h2 class="modal-title">✏️ Editar Perfil</h2>
    <hr class="divider">
    <div class="form-group">
      <label class="form-label">Conhecido por (apelido)</label>
      <input class="form-control" id="edit-alias" value="${Utils.sanitize(user.alias||'')}" placeholder="Ex: Foca, Fera, Rei do Saque...">
    </div>
    <div class="form-group">
      <label class="form-label">Nível</label>
      <select class="form-control" id="edit-level">
        ${['Iniciante','Intermediário','Avançado','Elite'].map(l=>`<option ${user.level===l?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    <div id="edit-error" class="form-error"></div>
    <button class="btn btn-primary btn-full" onclick="saveEditProfile()">Salvar alterações</button>`;
  Modal.open('modal-edit-profile');
}

function saveEditProfile() {
  const user = Auth.getUser();
  const alias = document.getElementById('edit-alias').value.trim();
  const level = document.getElementById('edit-level').value;
  Auth.updateUser(user.id, { alias, level });
  Modal.close('modal-edit-profile');
  Toast.show('Perfil atualizado!', '', 'success');
  renderProfilePage(user.id);
  App.render();
}

// ─── PHOTO UPLOAD ──────────────────────────────
function triggerPhotoUpload() {
  document.getElementById('photo-upload')?.click();
}

function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { Toast.show('Foto muito grande', 'Máximo 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const user = Auth.getUser();
    Auth.updateUser(user.id, { photo: ev.target.result });
    App.render();
    renderProfilePage(user.id);
    Toast.show('Foto atualizada!', '', 'success');
  };
  reader.readAsDataURL(file);
}

// ─── ATHLETE PROFILE MODAL ─────────────────────
function openAthleteModal(userId) {
  App.showPage('profile', { userId });
}

// ─── LEVEL ─────────────────────────────────────
function setLevel(level) {
  const user = Auth.getUser();
  Auth.updateUser(user.id, { level });
  renderProfilePage(user.id);
  Toast.show(`Nível atualizado para ${level}`, '', 'success');
}

// ─── MODAL OPENERS ────────────────────────────
function openLoginModal() {
  document.getElementById('login-error').textContent = '';
  Modal.open('modal-login');
}
function openRegisterModal() {
  document.getElementById('reg-error').textContent = '';
  Modal.open('modal-register');
}
function switchToLogin() { Modal.close('modal-register'); openLoginModal(); }
function switchToRegister() { Modal.close('modal-login'); openRegisterModal(); }

// ─── CPF MASK ─────────────────────────────────
function maskCPF(el) {
  let v = el.value.replace(/\D/g,'').slice(0,11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  el.value = v;
}
