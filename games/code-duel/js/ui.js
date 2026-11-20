/** UI — Lobby + Game */
export class UI {
  constructor(app) { this.app = app; }

  bindLobbyEvents() {
    const $ = (s) => document.querySelector(s);
    const btnGuide = $('#btn-toggle-guide');
    const guidePanel = $('#guide-panel');
    if (btnGuide && guidePanel) {
      btnGuide.addEventListener('click', () => {
        const body = guidePanel.querySelector('.guide-grid');
        if (!body) return;
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? '' : 'none';
        btnGuide.textContent = hidden ? 'ガイドを折りたたむ' : '操作ガイドを表示';
      });
    }
    document.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-diff]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const lv = parseInt(btn.dataset.diff, 10) || 3;
        this.app.cpuLevel = lv;
        const desc = document.getElementById('diff-desc');
        if (desc) desc.textContent = this.app.cpu.getDesc(lv);
      });
    });
    $('#btn-cpu-start')?.addEventListener('click', () => this.app.startCpu(this.app.cpuLevel || 3));
    $('#btn-host')?.addEventListener('click', () => {
      this.app.network.host();
      this.setLobbyStatus('connecting', 'HOST作成中…');
    });
    $('#btn-join')?.addEventListener('click', () => {
      const id = ($('#room-id')?.value || '').trim();
      if (!id) { this.showToast('ルームIDを入力してください', true); return; }
      this.app.network.join(id);
      this.setLobbyStatus('connecting', '参加中…');
    });
    $('#btn-sortie')?.addEventListener('click', () => this.app.startOnline());
    $('#btn-leave')?.addEventListener('click', () => {
      this.app.network.cleanup();
      this.showFormPanel();
      this.setLobbyStatus('', '未接続');
      this.showToast('ルームを退出しました');
    });
  }

  bindGameEvents() {
    const $ = (s) => document.querySelector(s);
    $('#btn-exit-game')?.addEventListener('click', () => this.app.returnToLobby());
    $('#btnRun')?.addEventListener('click', () => this.deployCode());
    const selfCode = $('#selfCode');
    selfCode?.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); this.deployCode(); }
    });
    let syncTimer = null;
    selfCode?.addEventListener('input', () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        this.app.network.syncCode(selfCode.value, $('#langSelect')?.value || 'novice');
      }, 200);
    });
    $('#langSelect')?.addEventListener('change', () => {
      const lang = $('#langSelect').value;
      this.app.langManager.setLanguage(lang);
      this.updateHelp(lang);
      const sample = this.app.langManager.getSample(lang);
      if (sample && !selfCode.value.trim()) selfCode.value = sample;
    });
    $('#helpToggle')?.addEventListener('click', () => $('#helpModal')?.classList.add('open'));
    $('#helpClose')?.addEventListener('click', () => $('#helpModal')?.classList.remove('open'));
    $('#helpModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'helpModal') e.target.classList.remove('open');
    });
    document.querySelectorAll('.help-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.help-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.updateHelp(tab.dataset.lang);
      });
    });
  }

  onSecretUnlocked() {
    document.getElementById('secret-panel')?.classList.remove('hidden');
    const opt = document.getElementById('opt-ctrlworld');
    if (opt) { opt.disabled = false; opt.textContent = 'CtrlWorld'; }
    document.getElementById('tab-ctrlworld')?.classList.remove('hidden');
  }

  showToast(msg, isError, isSecret) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.toggle('error', !!isError);
    t.classList.toggle('secret', !!isSecret);
    t.classList.add('show');
    clearTimeout(this._toastTid);
    this._toastTid = setTimeout(() => t.classList.remove('show'), 3600);
  }

  setLobbyStatus(kind, text) {
    const dot = document.getElementById('lobby-status-dot');
    const el = document.getElementById('lobby-status-text');
    if (dot) dot.className = 'status-dot ' + (kind || '');
    if (el) el.textContent = text || '';
  }

  showConnectedPanel(roomId) {
    document.getElementById('form-panel')?.classList.add('hidden');
    document.getElementById('connected-panel')?.classList.remove('hidden');
    const el = document.getElementById('conn-room-id');
    if (el) el.textContent = roomId || '—';
    this.setLobbyStatus('online', '接続済み');
  }

  showFormPanel() {
    document.getElementById('connected-panel')?.classList.add('hidden');
    document.getElementById('form-panel')?.classList.remove('hidden');
  }

  showGameLayer(modeLabel) {
    document.getElementById('lobby-wrap')?.classList.add('hidden');
    document.getElementById('game-layer')?.classList.remove('hidden');
    const label = document.getElementById('game-mode-label');
    if (label) label.textContent = modeLabel || 'BATTLE';
    this.hideOverlay();
  }

  showLobby() {
    document.getElementById('game-layer')?.classList.add('hidden');
    document.getElementById('lobby-wrap')?.classList.remove('hidden');
  }

  deployCode() {
    const code = document.getElementById('selfCode')?.value || '';
    const lang = document.getElementById('langSelect')?.value || 'novice';
    this.app.network.syncCode(code, lang);
    this.logSelf(`Deployed [${lang}] (${code.length} chars)`);
  }

  getSelfCode() { return document.getElementById('selfCode')?.value || ''; }
  getEnemyCode() { return document.getElementById('enemyCode')?.value || ''; }
  setSelfCode(c) { const el = document.getElementById('selfCode'); if (el) el.value = c; }
  setEnemyCode(c) { const el = document.getElementById('enemyCode'); if (el) el.value = c; }
  setEnemyLang(lang) {
    const el = document.getElementById('enemyLangLabel');
    if (el) el.textContent = (lang || '—').toUpperCase();
  }
  setCpuWpmLabel(t) {
    const el = document.getElementById('cpu-wpm-label');
    if (el) el.textContent = t || '';
  }

  logSelf(msg) {
    const el = document.getElementById('selfConsole');
    if (!el) return;
    const time = new Date().toLocaleTimeString('ja-JP', { hour12: false });
    el.textContent += `[${time}] ${msg}\n`;
    el.scrollTop = el.scrollHeight;
  }

  setConnectionStatus(connected, id) {
    if (connected) { this.showConnectedPanel(id); this.setLobbyStatus('online', '接続済み'); }
    else this.setLobbyStatus('', '未接続');
  }

  setRoomInfo(id) {
    const el = document.getElementById('conn-room-id');
    if (el) el.textContent = id || '—';
    const input = document.getElementById('room-id');
    if (input && id) input.value = id;
  }

  showOverlay(title, message) {
    const t = document.getElementById('overlayTitle');
    const m = document.getElementById('overlayMessage');
    if (t) t.textContent = title;
    if (m) m.textContent = message;
    document.getElementById('overlay')?.classList.remove('hidden');
  }

  hideOverlay() { document.getElementById('overlay')?.classList.add('hidden'); }
  setMatchStatus(status) {
    const el = document.getElementById('matchStatus');
    if (el) el.textContent = status;
  }

  updateTimer(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const el = document.getElementById('matchTimer');
    if (el) el.textContent = `${m}:${s}`;
  }

  updateShipStats(self, enemy) {
    if (!self || !enemy) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const setW = (id, w) => { const el = document.getElementById(id); if (el) el.style.width = w; };
    setW('selfHpFill', `${Math.max(0, self.hp)}%`);
    setW('enemyHpFill', `${Math.max(0, enemy.hp)}%`);
    set('selfHpValue', Math.round(self.hp));
    set('enemyHpValue', Math.round(enemy.hp));
    set('selfEnergy', `EN: ${Math.round(self.energy)}%`);
    set('selfHeat', `HEAT: ${Math.round(self.heat)}%`);
  }

  updateFps(fps) {
    const el = document.getElementById('fpsCounter');
    if (el) el.textContent = `FPS: ${fps}`;
  }

  updateHelp(lang) {
    const ref = this.app.langManager.getReference(lang);
    const body = document.getElementById('helpBody');
    if (body) body.innerHTML = ref || '<p>Reference not available.</p>';
  }
}
