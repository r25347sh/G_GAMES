/** Language Manager — resilient imports */
import { NoviceScript } from './novice.js';

async function tryImport(path, exportName) {
  try {
    const mod = await import(path);
    return mod[exportName] || null;
  } catch (e) {
    console.warn('[Lang] missing', path, e.message);
    return null;
  }
}

export class LanguageManager {
  constructor(app) {
    this.app = app;
    this.currentLang = 'novice';
    this.interpreters = { novice: new NoviceScript(app) };
    this._loadRest();
  }

  async _loadRest() {
    const specs = [
      ['./cyber.js', 'CyberScript', 'cyber'],
      ['./vectra.js', 'Vectra', 'vectra'],
      ['./shadow.js', 'ShadowScript', 'shadow'],
      ['./cyberhack.js', 'CyberHack', 'cyberhack'],
      ['./ctrlworld.js', 'CtrlWorld', 'ctrlworld'],
    ];
    for (const [path, name, key] of specs) {
      try {
        const mod = await import(path);
        if (mod[name]) this.interpreters[key] = new mod[name](this.app);
      } catch (e) {
        // fallback: use novice-like stub
        this.interpreters[key] = this.interpreters.novice;
      }
    }
  }

  setLanguage(lang) {
    if (this.interpreters[lang]) this.currentLang = lang;
  }

  getInterpreter(lang) {
    return this.interpreters[lang] || this.interpreters.novice;
  }

  getSample(lang) {
    const i = this.interpreters[lang];
    return i && i.getSample ? i.getSample() : '';
  }

  getReference(lang) {
    const i = this.interpreters[lang];
    return i && i.getReference ? i.getReference() : '';
  }
}
