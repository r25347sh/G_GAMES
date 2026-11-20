/**
 * UI — Lobby + Game
 */
export class UI {
  constructor(app) {
    this.app = app;
  }

  bindLobbyEvents() {
    const $ = (s) => document.querySelector(s);

    // Guide toggle
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

    // Diff buttons
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

    $('#btn-cpu-start')?.addEventListener('click', () => {
      this.app.startCpu(this.app.cpuLevel || 3);
    });

    // Lobby language select
    $('#lobbyLangSelect')?.addEventListener('change', (e) => {
      this.app.setSelectedLang(e.target.value);
    });

    // Tutorial buttons
    document.querySelectorAll('[data-tutorial]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.tutorial;
        this.app.startTutorial(lang);
      });
    });

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

    $('#btn-sortie')?.addEventListener('click', () => {
      this.app.startOnline();
    });

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
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.deployCode();
      }
    });

    let syncTimer = null;
    selfCode?.addEventListener('input', () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        const code = selfCode.value;
        const lang = this.app.selectedLang || 'novice';
        this.app.network.syncCode(code, lang);
      }, 200);
    });

    // Language change only allowed when unlocked (lobby)
    $('#langSelect')?.addEventListener('change', () => {
      if (this.app.mode !== 'lobby') return;
      const lang = $('#langSelect').value;
      this.app.setSelectedLang(lang);
      this.updateHelp(lang);
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

  lockLanguage(lang) {
    const sel = document.getElementById('langSelect');
    if (!sel) return;
    sel.value = lang || 'novice';
    sel.disabled = true;
    sel.title = '言語はロビーでのみ変更可能';
  }

  unlockLanguage() {
    const sel = document.getElementById('langSelect');
    if (!sel) return;
    sel.disabled = false;
    sel.title = '';
  }

  clearConsoles() {
    const s = document.getElementById('selfConsole');
    const e = document.getElementById('enemyConsole');
    if (s) s.textContent = '';
    if (e) e.textContent = '';
  }

  onSecretUnlocked() {
    const panel = document.getElementById('secret-panel');
    if (panel) panel.classList.remove('hidden');
    const opt = document.getElementById('opt-ctrlworld');
    if (opt) {
      opt.disabled = false;
      opt.textContent = 'CtrlWorld';
    }
    const lobbyOpt = document.getElementById('lobby-opt-ctrlworld');
    if (lobbyOpt) {
      lobbyOpt.disabled = false;
      lobbyOpt.textContent = 'CtrlWorld (SECRET)';
    }
    const tab = document.getElementById('tab-ctrlworld');
    if (tab) tab.classList.remove('hidden');
    const tutBtn = document.getElementById('tut-ctrlworld');
    if (tutBtn) tutBtn.classList.remove('hidden');
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
    const lang = this.app.selectedLang || 'novice';
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
    if (connected) {
      this.showConnectedPanel(id);
      this.setLobbyStatus('online', '接続済み');
    } else {
      this.setLobbyStatus('', '未接続');
    }
  }

  setRoomInfo(id) {
    const el = document.getElementById('conn-room-id');
    if (el) el.textContent = id || '—';
    const input = document.getElementById('room-id');
    if (input && id) input.value = id;
  }

  showOverlay(title, message) {
    const o = document.getElementById('overlay');
    const t = document.getElementById('overlayTitle');
    const m = document.getElementById('overlayMessage');
    if (t) t.textContent = title;
    if (m) m.textContent = message;
    if (o) o.classList.remove('hidden');
  }

  hideOverlay() {
    document.getElementById('overlay')?.classList.add('hidden');
  }

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
