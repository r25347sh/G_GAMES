/**
 * Language Manager — resilient registration
 */
import { NoviceScript } from './novice.js';
import { CyberScript } from './cyber.js';
import { Vectra } from './vectra.js';
import { ShadowScript } from './shadow.js';
import { CyberHack } from './cyberhack.js';
import { CtrlWorld } from './ctrlworld.js';

export class LanguageManager {
  constructor(app) {
    this.app = app;
    this.currentLang = 'novice';
    this.interpreters = {
      novice: new NoviceScript(app),
      cyber: new CyberScript(app),
      vectra: new Vectra(app),
      shadow: new ShadowScript(app),
      cyberhack: new CyberHack(app),
      ctrlworld: new CtrlWorld(app),
    };
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

  getTutorialStarter(lang) {
    const i = this.interpreters[lang];
    if (i && i.getTutorialStarter) return i.getTutorialStarter();
    return this.getSample(lang) || '// write code here\n';
  }

  getReference(lang) {
    const i = this.interpreters[lang];
    return i && i.getReference ? i.getReference() : '<p>No reference</p>';
  }
}
