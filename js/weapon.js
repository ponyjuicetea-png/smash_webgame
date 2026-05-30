/* ================================================================
 * weapon.js
 * 武器資料定義 — 每職業 3 階傳說武器
 * ================================================================ */
const WEAPONS = {
  // ===== 法師 =====
  meteorStaff: {
    id: 'meteorStaff', name: '隕石杖', type: 'ranged',
    damage: 26, range: 420, cooldown: 0.55, staminaCost: 4,
    color: '#b06aff', projectileSpeed: 580,
    gatherBonus: {},
    projectileKind: 'eldritch',
    skillMult: 1.0
  },
  skyburnStaff: {
    id: 'skyburnStaff', name: '焚天杖', type: 'ranged',
    damage: 50, range: 440, cooldown: 0.60, staminaCost: 5,
    color: '#ff5a30', projectileSpeed: 600,
    gatherBonus: {},
    projectileKind: 'eldritchFire',
    skillMult: 1.4
  },
  genesisStaff: {
    id: 'genesisStaff', name: '創世神杖', type: 'ranged',
    damage: 90, range: 500, cooldown: 0.65, staminaCost: 6,
    color: '#1a0030', projectileSpeed: 540,
    gatherBonus: {},
    projectileKind: 'eldritchVoid',
    skillMult: 1.8,
    cdMult: 0.75
  },

  // ===== 弓手 =====
  giantbow: {
    id: 'giantbow', name: '巨弓', type: 'ranged',
    damage: 26, range: 460, cooldown: 0.75, staminaCost: 7,
    color: '#8a5a2b', projectileSpeed: 720,
    gatherBonus: {}, skillMult: 1.0
  },
  stormBow: {
    id: 'stormBow', name: '風暴弓', type: 'ranged',
    damage: 40, range: 480, cooldown: 0.8, staminaCost: 8,
    color: '#88ccff', projectileSpeed: 740,
    gatherBonus: {},
    multiShot: 3,
    skillMult: 1.4
  },
  frostBow: {
    id: 'frostBow', name: '永凍弓', type: 'ranged',
    damage: 60, range: 500, cooldown: 0.85, staminaCost: 9,
    color: '#aaccff', projectileSpeed: 760,
    gatherBonus: {},
    alwaysIce: true,
    skillMult: 1.8
  },

  // ===== 狂戰士 =====
  cleaver: {
    id: 'cleaver', name: '巨砍刀', type: 'melee',
    damage: 32, range: 82, arc: Math.PI * 0.7,
    cooldown: 0.75, staminaCost: 8,
    color: '#aa3030', gatherBonus: { tree: 1.5 },
    shockwave: true, skillMult: 1.0
  },
  bloodCleaver: {
    id: 'bloodCleaver', name: '血飲砍刀', type: 'melee',
    damage: 50, range: 88, arc: Math.PI * 0.75,
    cooldown: 0.80, staminaCost: 9,
    color: '#aa0000', gatherBonus: { tree: 1.5 },
    shockwave: true, healOnHit: 6, skillMult: 1.4
  },
  doomCleaver: {
    id: 'doomCleaver', name: '末日砍刀', type: 'melee',
    damage: 75, range: 94, arc: Math.PI * 0.8,
    cooldown: 0.85, staminaCost: 10,
    color: '#3a0a3a', gatherBonus: { tree: 1.5 },
    shockwave: true, passiveMoon: true, skillMult: 1.8
  }
};
