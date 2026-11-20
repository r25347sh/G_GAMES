/**
 * WebRTC P2P Networking via PeerJS
 */

export class Network {
  constructor(app) {
    this.app = app;
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomId = null;
    this.enemyLang = 'novice';
    this.lastCodeSync = 0;
  }

  init() {}

  host() {
    this.cleanup();
    this.isHost = true;
    this.roomId = this.generateRoomId();

    this.peer = new Peer(this.roomId, { debug: 1 });

    this.peer.on('open', (id) => {
      this.app.ui.setConnectionStatus(true, id);
      this.app.ui.setRoomInfo(id);
      this.app.ui.showOverlay('WAITING FOR OPPONENT', `Room ID: ${id}\nShare this ID with your opponent`);
      this.app.ui.setMatchStatus('WAITING');
    });

    this.peer.on('connection', (conn) => {
      this.conn = conn;
      this.setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error('[Network] Peer error', err);
      this.app.ui.logSelf(`Network Error: ${err.type || err.message}`);
      this.app.ui.setConnectionStatus(false);
    });
  }

  join(roomId) {
    if (!roomId || roomId.length < 4) {
      this.app.ui.logSelf('Invalid Room ID');
      return;
    }

    this.cleanup();
    this.isHost = false;
    this.roomId = roomId.toUpperCase();

    this.peer = new Peer({ debug: 1 });

    this.peer.on('open', () => {
      this.conn = this.peer.connect(this.roomId, { reliable: true });
      this.setupConnection(this.conn);
    });

    this.peer.on('error', (err) => {
      console.error('[Network] Join error', err);
      this.app.ui.logSelf(`Join failed: ${err.type || err.message}`);
      this.app.ui.setConnectionStatus(false);
    });
  }

  setupConnection(conn) {
    conn.on('open', () => {
      console.log('[Network] Connected');
      this.app.ui.setConnectionStatus(true, this.roomId);
      this.app.ui.hideOverlay();

      if (this.isHost) {
        this.send({ type: 'start' });
        this.app.game.startMatch();
      }
    });

    conn.on('data', (data) => {
      this.handleMessage(data);
    });

    conn.on('close', () => {
      this.app.ui.setConnectionStatus(false);
      this.app.ui.showOverlay('DISCONNECTED', 'Opponent left the room');
      this.app.game.state = 'idle';
    });

    conn.on('error', (err) => {
      console.error('[Network] Conn error', err);
    });
  }

  handleMessage(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'start':
        this.app.game.startMatch();
        break;
      case 'code':
        this.app.ui.setEnemyCode(data.code || '');
        this.enemyLang = data.lang || 'novice';
        this.app.ui.setEnemyLang(this.enemyLang);
        break;
      case 'state':
        if (data.ship && this.app.game.enemy) {
          const e = this.app.game.enemy;
          e.x = data.ship.x;
          e.y = data.ship.y;
          e.angle = data.ship.angle;
          e.hp = data.ship.hp;
          e.energy = data.ship.energy;
          e.heat = data.ship.heat;
        }
        break;
      default:
        break;
    }
  }

  syncCode(code, lang) {
    if (!this.conn || this.conn.open !== true) return;
    const now = performance.now();
    if (now - this.lastCodeSync < 120) return;
    this.lastCodeSync = now;

    this.send({ type: 'code', code, lang });
  }

  syncState() {
    if (!this.isHost || !this.conn || !this.app.game.self) return;
    const s = this.app.game.self;
    this.send({
      type: 'state',
      ship: {
        x: s.x, y: s.y, angle: s.angle,
        hp: s.hp, energy: s.energy, heat: s.heat
      }
    });
  }

  send(data) {
    if (this.conn && this.conn.open) {
      try { this.conn.send(data); } catch (e) { console.warn('[Network] send failed', e); }
    }
  }

  generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  cleanup() {
    if (this.conn) { this.conn.close(); this.conn = null; }
    if (this.peer) { this.peer.destroy(); this.peer = null; }
    this.isHost = false;
    this.roomId = null;
  }
}
