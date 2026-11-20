/**
 * UI Controller
 */

export class UI {
  constructor(app) {
    this.app = app;
    this.els = {
      selfCode: document.getElementById('selfCode'),
      enemyCode: document.getElementById('enemyCode'),
      selfConsole: document.getElementById('selfConsole'),
      enemyConsole: document.getElementById('enemyConsole'),
      langSelect: document.getElementById('langSelect'),
      connectionStatus: document.getElementById('connectionStatus'),
      roomInfo: document.getElementById('roomInfo'),
      roomIdInput: document.getElementById('roomIdInput'),
      overlay: document.getElementById('overlay'),
      overlayTitle: document.getElementById('overlayTitle'),
      overlayMessage: document.getElementById('overlayMessage'),
      matchTimer: document.getElementById('matchTimer'),
      matchStatus: document.getElementById('matchStatus'),
      selfHpFill: document.getElementById('selfHpFill'),
      enemyHpFill: document.getElementById('enemyHpFill'),
      selfHpValue: document.getElementById('selfHpValue'),
      enemyHpValue: document.getElementById('enemyHpValue'),
      selfEnergy: document.getElementById('selfEnergy'),
      selfHeat: document.getElementById('selfHeat'),
      fpsCounter: document.getElementById('fpsCounter'),
      enemyLang: document.getElementById('enemyLang'),
      helpModal: document.getElementById('helpModal'),
      helpBody: document.getElementById('helpBody')
    };
  }

  bindEvents() {
    document.getElementById('btnHost').addEventListener('click', () => this.app.network.host());
    document.getElementById('btnJoin').addEventListener('click', () => {
      this.app.network.join(this.els.roomIdInput.value.trim());
    });
    this.els.roomIdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.app.network.join(this.els.roomIdInput.value.trim());
    });
    document.getElementById('btnRun').addEventListener('click', () => this.deployCode());
    document.getElementById('btnStop').addEventListener('click', () => this.logSelf('AI stopped'));
    this.els.selfCode.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); this.deployCode(); }
    });
    this.els.langSelect.addEventListener('change', () => {
      const lang = this.els.langSelect.value;
      this.app.langManager.setLanguage(lang);
      this.updateHelp(lang);
      const sample = this.app.langManager.getSample(lang);
      if (sample && !this.els.selfCode.value.trim()) this.els.selfCode.value = sample;
    });
    let syncTimer = null;
    this.els.selfCode.addEventListener('input', () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        this.app.network.syncCode(this.els.selfCode.value, this.els.langSelect.value);
      }, 200);
    });
    document.getElementById('helpToggle').addEventListener('click', () => this.els.helpModal.classList.add('open'));
    document.getElementById('helpClose').addEventListener('click', () => this.els.helpModal.classList.remove('open'));
    this.els.helpModal.addEventListener('click', (e) => {
      if (e.target === this.els.helpModal) this.els.helpModal.classList.remove('open');
    });
    document.querySelectorAll('.help-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.updateHelp(tab.dataset.lang);
      });
    });
  }

  deployCode() {
    const code = this.els.selfCode.value;
    const lang = this.els.langSelect.value;
    this.app.network.syncCode(code, lang);
    this.logSelf(`Deployed [${lang}] (${code.length} chars)`);
  }

  getSelfCode() { return this.els.selfCode.value; }
  getEnemyCode() { return this.els.enemyCode.value; }
  setEnemyCode(code) { this.els.enemyCode.value = code; }
  setEnemyLang(lang) { this.els.enemyLang.textContent = lang.toUpperCase(); }

  logSelf(msg) {
    const time = new Date().toLocaleTimeString('ja-JP', { hour12: false });
    this.els.selfConsole.textContent += `[${time}] ${msg}\n`;
    this.els.selfConsole.scrollTop = this.els.selfConsole.scrollHeight;
  }

  setConnectionStatus(connected) {
    const el = this.els.connectionStatus;
    if (connected) {
      el.classList.add('connected');
      el.querySelector('.text').textContent = 'CONNECTED';
    } else {
      el.classList.remove('connected');
      el.querySelector('.text').textContent = 'DISCONNECTED';
    }
  }

  setRoomInfo(id) { this.els.roomInfo.textContent = `Room: ${id}`; }

  showOverlay(title, message) {
    this.els.overlayTitle.textContent = title;
    this.els.overlayMessage.textContent = message;
    this.els.overlay.classList.remove('hidden');
  }

  hideOverlay() { this.els.overlay.classList.add('hidden'); }
  setMatchStatus(status) { this.els.matchStatus.textContent = status; }

  updateTimer(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    this.els.matchTimer.textContent = `${m}:${s}`;
  }

  updateShipStats(self, enemy) {
    if (!self || !enemy) return;
    this.els.selfHpFill.style.width = `${Math.max(0, self.hp)}%`;
    this.els.enemyHpFill.style.width = `${Math.max(0, enemy.hp)}%`;
    this.els.selfHpValue.textContent = Math.round(self.hp);
    this.els.enemyHpValue.textContent = Math.round(enemy.hp);
    this.els.selfEnergy.textContent = `EN: ${Math.round(self.energy)}%`;
    this.els.selfHeat.textContent = `HEAT: ${Math.round(self.heat)}%`;
  }

  updateFps(fps) { this.els.fpsCounter.textContent = `FPS: ${fps}`; }

  updateHelp(lang) {
    const ref = this.app.langManager.getReference(lang);
    this.els.helpBody.innerHTML = ref || '<p>Reference not available.</p>';
  }
}
