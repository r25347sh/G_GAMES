/**
 * Language Manager
 * 各言語インタープリタの登録・取得
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
      ctrlworld: new CtrlWorld(app)
    };
  }

  setLanguage(lang) {
    if (this.interpreters[lang]) {
      this.currentLang = lang;
    }
  }

  getInterpreter(lang) {
    return this.interpreters[lang] || this.interpreters.novice;
  }

  getSample(lang) {
    const interp = this.interpreters[lang];
    return interp && interp.getSample ? interp.getSample() : '';
  }

  getTutorialStarter(lang) {
    const interp = this.interpreters[lang];
    if (interp && interp.getTutorialStarter) return interp.getTutorialStarter();
    // Fallback minimal starters
    const fallbacks = {
      novice: `// TUTORIAL: NoviceScript
// 1. face enemy で敵の方向を向く
// 2. go で前進
// 3. fire で射撃
// 4. Ctrl+Enter でデプロイ
face enemy
go
if front then fire
`,
      cyber: `// TUTORIAL: CyberScript
// sensors.dist / sensors.angle を使ってみよう
face(enemy)
thrust(0.7)
if sensors.dist < 180 and abs(sensors.angle) < 0.3:
  fire()
`,
      vectra: `// TUTORIAL: Vectra
// ベクトルで敵方向へ
V = normalize(enemy - self)
face V
thrust 0.6
fire when angle(V) < 0.25
`,
      shadow: `// TUTORIAL: ShadowScript (1文字命令)
// F=face  G=go  S=shoot
FGS
`,
      cyberhack: `// TUTORIAL: CyberHack
// イベント駆動の基本
ON ready DO face enemy
ON near DO spread
ON front DO fire
`,
      ctrlworld: `// TUTORIAL: CtrlWorld (SECRET)
// レジスタと低レイヤ操作
MOV R0, dist
CMP R0, 150
JL close
THRUST 0.8
FIRE
close:
SHIELD
`
    };
    return fallbacks[lang] || fallbacks.novice;
  }

  getReference(lang) {
    const interp = this.interpreters[lang];
    return interp && interp.getReference ? interp.getReference() : '';
  }
}
