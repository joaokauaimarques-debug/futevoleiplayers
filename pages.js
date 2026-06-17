// =============================================
//  FUTEVÔLEI.NET — Pages
// =============================================

// ─── LANDING PAGE ─────────────────────────────
App.register('landing', () => {
  if (Auth.isLoggedIn()) { App.showPage('home'); return; }
});

// ─── HOME (Feed) ───────────────────────────────
App.register('home', (data) => {
  if (!Auth.isLoggedIn()) { App.showPage('landing'); return; }
  const user = Auth.getUser();
  const comps = Comps.getAll().sort((a,b) => new Date(a.date) - new Date(b.date));
  const upcoming = comps.filter(c => new Date(c.date) >= new Date()).slice(0, 6);
  const el = document.getElementById('home-content');
  if (!el) return;

  el.innerHTML = `
    <div class="section">
      <div class="container">
        <div class="flex items-center justify-between mb-24">
          <div>
            <h1 class="font-display" style="font-size:2rem;letter-spacing:.02em">
              Olá, <span class="text-accent">${Utils.sanitize(user.alias || user.name.split(' ')[0])}</span> 👋
            </h1>
            <p class="text-muted text-sm mt-8">Prontos para a próxima partida?</p>
          </div>
          <button class="btn btn-cta" onclick="App.showPage('competitions')">
            🏆 Explorar Campeonatos
          </button>
        </div>

        ${upcoming.length ? `
        <h2 class="fw-700 mb-16" style="font-size:1.1rem">Próximos Campeonatos</h2>
        <div class="grid-3 mb-32">
          ${upcoming.map(c => renderCompCard(c)).join('')}
        </div>` : `
        <div class="card mb-32">
          <div class="card-body empty-state">
            <div class="empty-state-icon">🏐</div>
            <div class="empty-state-title">Nenhum campeonato disponível ainda</div>
            <div class="empty-state-text">Seja o primeiro a criar uma competição!</div>
            <button class="btn btn-cta mt-16" onclick="openAddCompModal()">+ Adicionar Competição</button>
          </div>
        </div>`}

        <h2 class="fw-700 mb-16" style="font-size:1.1rem">Meu Histórico</h2>
        ${renderHistoryMini(user.id)}
      </div>
    </div>`;
});

// ─── COMPETITIONS PAGE ─────────────────────────
App.register('competitions', () => {
  if (!Auth.isLoggedIn()) { App.showPage('landing'); return; }
  renderCompetitionsPage();
});

function renderCompetitionsPage(filter='', catFilter='') {
  const el = document.getElementById('competitions-content');
  if (!el) return;
  let comps = Comps.getAll().sort((a,b) => new Date(a.date) - new Date(b.date));

  if (filter) {
    const q = filter.toLowerCase();
    comps = comps.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.instagram?.toLowerCase().includes(q)
    );
  }
  if (catFilter) {
    comps = comps.filter(c => c.categories?.includes(catFilter));
  }

  el.innerHTML = `
    <div class="section">
      <div class="container">
        <div class="flex items-center justify-between mb-24">
          <div>
            <h1 class="font-display" style="font-size:2rem;letter-spacing:.02em">🏆 Competições</h1>
            <p class="text-muted text-sm">Encontre e inscreva-se nos melhores campeonatos</p>
          </div>
          <button class="btn btn-cta" onclick="openAddCompModal()">+ Nova Competição</button>
        </div>

        <div class="card mb-24" style="padding:16px 20px">
          <div class="flex gap-12" style="flex-wrap:wrap;align-items:center">
            <div class="search-bar" style="flex:1;min-width:200px">
              <span class="search-icon">🔍</span>
              <input class="form-control" id="comp-search" placeholder="Buscar campeonato, local..." value="${Utils.sanitize(filter)}"
                oninput="renderCompetitionsPage(this.value, document.getElementById('comp-cat-filter').value)">
            </div>
            <select class="form-control" id="comp-cat-filter" style="width:auto" onchange="renderCompetitionsPage(document.getElementById('comp-search').value, this.value)">
              <option value="">Todas as categorias</option>
              <option ${catFilter==='Masculino'?'selected':''}>Masculino</option>
              <option ${catFilter==='Feminino'?'selected':''}>Feminino</option>
              <option ${catFilter==='Misto'?'selected':''}>Misto</option>
              <option ${catFilter==='Iniciante'?'selected':''}>Iniciante</option>
              <option ${catFilter==='Intermediário'?'selected':''}>Intermediário</option>
              <option ${catFilter==='Avançado'?'selected':''}>Avançado</option>
              <option ${catFilter==='Elite'?'selected':''}>Elite</option>
            </select>
          </div>
        </div>

        <p class="text-sm text-muted mb-16">${comps.length} competiç${comps.length===1?'ão':'ões'} encontrada${comps.length===1?'':'s'}</p>

        ${comps.length ? `
        <div class="grid-3">
          ${comps.map(c => renderCompCard(c, true)).join('')}
        </div>` : `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">Nenhuma competição encontrada</div>
          <div class="empty-state-text">Tente outros filtros ou crie uma nova competição.</div>
        </div>`}
      </div>
    </div>`;
}

function renderCompCard(comp, showBtn=false) {
  const regs = Regs.getByComp(comp.id);
  const pairs = regs.filter(r=>r.status==='confirmed').length;
  const user = Auth.getUser();
  const isReg = user ? Regs.isUserRegistered(comp.id, user.id) : false;
  const date = Utils.formatDate(comp.date);
  const isPast = new Date(comp.date) < new Date();

  return `
  <div class="comp-card" onclick="openCompModal('${comp.id}')">
    <div class="comp-card-banner"></div>
    <div class="comp-card-body">
      <div class="flex items-center justify-between mb-8">
        <span class="badge ${isPast?'badge-gray':'badge-green'}">${isPast?'Encerrado':'Inscrições abertas'}</span>
        ${isReg ? '<span class="badge badge-ocean">✓ Inscrito</span>' : ''}
      </div>
      <div class="comp-card-title">${Utils.sanitize(comp.name)}</div>
      <div class="comp-card-meta">
        <span>📅 ${date}</span>
        ${comp.location ? `<span>📍 ${Utils.sanitize(comp.location)}</span>` : ''}
        ${comp.instagram ? `<span>📸 @${Utils.sanitize(comp.instagram)}</span>` : ''}
        <span>👥 ${pairs} dupla${pairs!==1?'s':''}</span>
      </div>
      <div class="comp-card-cats">
        ${(comp.categories||[]).map(cat=>`<span class="badge ${Utils.catColor(cat)}">${Utils.sanitize(cat)}</span>`).join('')}
      </div>
      <div class="comp-card-footer">
        <span class="comp-price">${comp.price > 0 ? Utils.formatCurrency(comp.price) : 'Gratuito'}</span>
        ${showBtn && !isPast ? `
          <button class="btn btn-sm ${isReg?'btn-outline':'btn-primary'}" onclick="event.stopPropagation();${isReg?'':'openRegModal(\''+comp.id+'\')'}">
            ${isReg ? '✓ Inscrito' : 'Inscrever-se'}
          </button>` : ''}
      </div>
    </div>
  </div>`;
}

// ─── ATHLETES PAGE ─────────────────────────────
App.register('athletes', () => {
  if (!Auth.isLoggedIn()) { App.showPage('landing'); return; }
  renderAthletesPage();
});

function renderAthletesPage(filter='', levelFilter='') {
  const el = document.getElementById('athletes-content');
  if (!el) return;
  let users = DB.get('users') || [];
  if (filter) {
    const q = filter.toLowerCase();
    users = users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.alias||'').toLowerCase().includes(q)
    );
  }
  if (levelFilter) users = users.filter(u => u.level === levelFilter);

  el.innerHTML = `
    <div class="section">
      <div class="container">
        <div class="mb-24">
          <h1 class="font-display" style="font-size:2rem;letter-spacing:.02em">👤 Atletas</h1>
          <p class="text-muted text-sm">Rede de jogadores de futevôlei</p>
        </div>

        <div class="card mb-24" style="padding:16px 20px">
          <div class="flex gap-12" style="flex-wrap:wrap">
            <div class="search-bar" style="flex:1;min-width:200px">
              <span class="search-icon">🔍</span>
              <input class="form-control" placeholder="Buscar atleta..." value="${Utils.sanitize(filter)}"
                oninput="renderAthletesPage(this.value, '${Utils.sanitize(levelFilter)}')">
            </div>
            <select class="form-control" style="width:auto" onchange="renderAthletesPage('${Utils.sanitize(filter)}', this.value)">
              <option value="">Todos os níveis</option>
              ${['Iniciante','Intermediário','Avançado','Elite'].map(l=>`<option ${levelFilter===l?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="grid-2">
          ${users.map(u => renderAthleteCard(u)).join('') || '<div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-title">Nenhum atleta encontrado</div></div>'}
        </div>
      </div>
    </div>`;
}

function renderAthleteCard(u) {
  const age = Utils.calcAge(u.birthdate);
  const regs = Regs.getByUser(u.id).filter(r=>r.status==='confirmed');
  return `
  <div class="athlete-card" onclick="openAthleteModal('${u.id}')">
    ${Utils.avatarHTML(u, 'avatar-md')}
    <div class="athlete-info">
      <div class="athlete-name">${Utils.sanitize(u.name)}</div>
      <div class="athlete-alias">@${Utils.sanitize(u.username)}${u.alias?` · "${Utils.sanitize(u.alias)}"`:''}</div>
      <div class="flex gap-8 mt-8">
        <span class="badge ${Utils.levelColor(u.level)}">${Utils.sanitize(u.level)}</span>
        ${age ? `<span class="badge badge-gray">${age} anos</span>` : ''}
        <span class="badge badge-gray">${Utils.sexLabel(u.sex)}</span>
      </div>
    </div>
    <div class="athlete-stats">
      <div class="athlete-stat">
        <div class="athlete-stat-val">${regs.length}</div>
        <div class="athlete-stat-lbl">Torneios</div>
      </div>
    </div>
  </div>`;
}

// ─── PROFILE PAGE ──────────────────────────────
App.register('profile', (data) => {
  if (!Auth.isLoggedIn()) { App.showPage('landing'); return; }
  const userId = data?.userId || Auth.current().userId;
  renderProfilePage(userId);
});

function renderProfilePage(userId) {
  const el = document.getElementById('profile-content');
  if (!el) return;
  const user = Auth.getUser(userId);
  if (!user) return;
  const isSelf = userId === Auth.current()?.userId;
  const age = Utils.calcAge(user.birthdate);
  const allRegs = Regs.getByUser(user.id);
  const confirmedRegs = allRegs.filter(r => r.status === 'confirmed');

  el.innerHTML = `
    <div class="section">
      <div class="container" style="max-width:800px">
        <!-- Profile Header -->
        <div class="card mb-24">
          <div style="background:linear-gradient(135deg,var(--ocean-600),var(--sunset));height:100px;border-radius:var(--radius-md) var(--radius-md) 0 0"></div>
          <div class="card-body" style="margin-top:-40px">
            <div class="flex gap-16 items-center justify-between" style="flex-wrap:wrap">
              <div class="flex gap-16 items-center">
                <div style="border:4px solid var(--bg-card);border-radius:50%;overflow:hidden;cursor:${isSelf?'pointer':''}" onclick="${isSelf?'triggerPhotoUpload()':''}">
                  ${Utils.avatarHTML(user, 'avatar-xl')}
                </div>
                <div>
                  <h1 style="font-size:1.5rem;font-weight:700">${Utils.sanitize(user.name)}</h1>
                  <p class="text-muted">@${Utils.sanitize(user.username)}${user.alias?` · "${Utils.sanitize(user.alias)}"`:''}</p>
                  <div class="flex gap-8 mt-8">
                    <span class="badge ${Utils.levelColor(user.level)}">${Utils.sanitize(user.level)}</span>
                    ${age ? `<span class="badge badge-gray">${age} anos</span>` : ''}
                    <span class="badge badge-gray">${Utils.sexLabel(user.sex)}</span>
                  </div>
                </div>
              </div>
              ${isSelf ? `
              <div class="flex gap-8">
                <button class="btn btn-outline btn-sm" onclick="openEditProfileModal()">✏️ Editar</button>
              </div>` : `
              <button class="btn btn-primary btn-sm" onclick="openInviteModal('${user.id}')">🤝 Convidar para jogar</button>`}
            </div>
            ${isSelf ? `<input type="file" id="photo-upload" class="hidden" accept="image/*" onchange="handlePhotoUpload(event)">` : ''}
            <div class="stats-grid mt-24">
              <div class="stat-card"><div class="stat-num">${confirmedRegs.length}</div><div class="stat-lbl">Torneios</div></div>
              <div class="stat-card"><div class="stat-num">${age||'—'}</div><div class="stat-lbl">Idade</div></div>
              <div class="stat-card"><div class="stat-num">${Utils.formatDateShort(user.createdAt)}</div><div class="stat-lbl">Membro desde</div></div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab-btn active" onclick="switchProfileTab('history', this)">📋 Histórico</button>
          ${isSelf ? `<button class="tab-btn" onclick="switchProfileTab('settings', this)">⚙️ Configurações</button>` : ''}
        </div>

        <div id="profile-tab-history" class="tab-panel active">
          ${renderHistory(user.id)}
        </div>
        ${isSelf ? `<div id="profile-tab-settings" class="tab-panel">${renderSettings(user)}</div>` : ''}
      </div>
    </div>`;
}

function switchProfileTab(tab, btn) {
  document.querySelectorAll('#profile-content .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#profile-content .tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const panel = document.getElementById('profile-tab-' + tab);
  if (panel) panel.classList.add('active');
}

function renderHistory(userId) {
  const regs = Regs.getByUser(userId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!regs.length) return `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Nenhum histórico ainda</div><div class="empty-state-text">Inscreva-se em uma competição para começar!</div></div>`;
  return `<div style="padding:4px 0">${regs.map(r => {
    const comp = Comps.getById(r.compId);
    if (!comp) return '';
    const partner = Auth.getUser(r.userId === userId ? r.partnerId : r.userId);
    const statusMap = { pending:'⏳ Aguardando', confirmed:'✅ Confirmado', cancelled:'❌ Cancelado' };
    return `
    <div class="history-item">
      <div class="history-dot" style="background:${r.status==='confirmed'?'var(--accent)':r.status==='pending'?'var(--cta)':'var(--border)'}"></div>
      <div class="history-content">
        <div class="history-title">${Utils.sanitize(comp.name)}</div>
        <div class="history-sub">
          Dupla com ${partner ? `<strong>@${Utils.sanitize(partner.username)}</strong>` : '?'}
          · ${(r.category||[]).join(', ')}
          · <span class="badge ${r.status==='confirmed'?'badge-green':r.status==='pending'?'badge-sunset':'badge-gray'}" style="font-size:0.7rem">${statusMap[r.status]||r.status}</span>
        </div>
      </div>
      <div class="history-date">${Utils.formatDateShort(comp.date)}</div>
    </div>`;
  }).join('')}</div>`;
}

function renderHistoryMini(userId) {
  const regs = Regs.getByUser(userId).filter(r=>r.status==='confirmed').slice(0,3);
  if (!regs.length) return `<div class="card"><div class="card-body"><p class="text-muted text-sm">Nenhum torneio ainda. <a href="#" onclick="App.showPage('competitions')" class="text-accent">Explorar campeonatos →</a></p></div></div>`;
  return `<div class="card"><div class="card-body">${regs.map(r => {
    const comp = Comps.getById(r.compId);
    if (!comp) return '';
    return `<div class="flex items-center gap-12" style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0"></div>
      <div style="flex:1"><span class="fw-600 text-sm">${Utils.sanitize(comp.name)}</span></div>
      <span class="badge badge-green text-xs">${Utils.formatDateShort(comp.date)}</span>
    </div>`;
  }).join('')}
  <button class="btn btn-ghost btn-sm mt-12 w-full" onclick="App.showPage('profile')">Ver histórico completo →</button>
  </div></div>`;
}

function renderSettings(user) {
  return `
  <div class="card">
    <div class="card-body">
      <h3 class="fw-700 mb-16">Nível do Atleta</h3>
      <p class="text-muted text-sm mb-16">Seu nível determina em quais categorias você pode participar.</p>
      <div class="flex gap-8" style="flex-wrap:wrap">
        ${['Iniciante','Intermediário','Avançado','Elite'].map(l=>`
          <button class="btn ${user.level===l?'btn-primary':'btn-outline'}" onclick="setLevel('${l}')">
            ${Utils.sanitize(l)}
          </button>`).join('')}
      </div>
    </div>
  </div>`;
}

// ─── NOTIFICATIONS PAGE ─────────────────────────
App.register('notifications', () => {
  if (!Auth.isLoggedIn()) { App.showPage('landing'); return; }
  renderNotificationsPage();
});

function renderNotificationsPage() {
  const el = document.getElementById('notifications-content');
  if (!el) return;
  const user = Auth.getUser();
  const notifs = Notifs.getByUser(user.id);
  Notifs.markAllRead(user.id);
  App.render();

  el.innerHTML = `
    <div class="section">
      <div class="container" style="max-width:700px">
        <div class="flex items-center justify-between mb-24">
          <h1 class="font-display" style="font-size:2rem;letter-spacing:.02em">🔔 Notificações</h1>
          ${notifs.length ? `<button class="btn btn-ghost btn-sm" onclick="Notifs.markAllRead('${user.id}');renderNotificationsPage()">Marcar todas como lidas</button>` : ''}
        </div>
        <div class="card">
          ${notifs.length ? notifs.map(n => renderNotifItem(n)).join('') :
            `<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">Nenhuma notificação</div></div>`}
        </div>
      </div>
    </div>`;
}

function renderNotifItem(n) {
  if (n.type === 'pair_invite') {
    const reg = (DB.get('registrations')||[]).find(r=>r.id===n.regId);
    const isPending = reg?.status === 'pending';
    return `
    <div class="notif-item ${n.read?'':'unread'}">
      <div class="notif-icon notif-icon-pair">🤝</div>
      <div class="notif-content">
        <div class="notif-text"><strong>${Utils.sanitize(n.fromName)}</strong> te convidou para jogar em <strong>${Utils.sanitize(n.compName)}</strong> como dupla.</div>
        <div class="notif-time">${Utils.timeAgo(n.createdAt)}</div>
        ${isPending ? `
        <div class="notif-actions">
          <button class="btn btn-primary btn-sm" onclick="acceptPairInvite('${n.regId}','${n.id}')">✅ Aceitar</button>
          <button class="btn btn-outline btn-sm" onclick="declinePairInvite('${n.regId}','${n.id}')">❌ Recusar</button>
        </div>` : `<div class="text-xs text-muted">${reg?.status==='confirmed'?'✅ Aceito':reg?.status==='cancelled'?'❌ Recusado':'—'}</div>`}
      </div>
    </div>`;
  }
  if (n.type === 'pair_accepted') {
    return `
    <div class="notif-item ${n.read?'':'unread'}">
      <div class="notif-icon notif-icon-pair">🎉</div>
      <div class="notif-content">
        <div class="notif-text"><strong>${Utils.sanitize(n.fromName)}</strong> aceitou seu convite para jogar em <strong>${Utils.sanitize(n.compName)}</strong>!</div>
        <div class="notif-time">${Utils.timeAgo(n.createdAt)}</div>
      </div>
    </div>`;
  }
  if (n.type === 'pair_declined') {
    return `
    <div class="notif-item ${n.read?'':'unread'}">
      <div class="notif-icon notif-icon-pair">😕</div>
      <div class="notif-content">
        <div class="notif-text"><strong>${Utils.sanitize(n.fromName)}</strong> recusou seu convite para jogar em <strong>${Utils.sanitize(n.compName)}</strong>.</div>
        <div class="notif-time">${Utils.timeAgo(n.createdAt)}</div>
      </div>
    </div>`;
  }
  return `
  <div class="notif-item ${n.read?'':'unread'}">
    <div class="notif-icon notif-icon-comp">🏆</div>
    <div class="notif-content">
      <div class="notif-text">${Utils.sanitize(n.message||'')}</div>
      <div class="notif-time">${Utils.timeAgo(n.createdAt)}</div>
    </div>
  </div>`;
}
