/* ================================================================
 * card.js
 * Roguelike 卡牌：每波結束選 3 取 1
 * 卡牌會修改 game.mut（持久變異旗標），直接改變技能特效
 * classes 屬性指定可出現的職業
 * ================================================================ */
const CARD_POOL = [
  // ====================== 通用 屬性 ======================
  { id: 'hp_up',  classes: 'all', tier: 'common', name: '生命之心', desc: '+25 最大 HP', color: '#ff7777',
    apply: g => { g.player.maxHp += 25; g.player.hp += 25; } },
  { id: 'mp_up',  classes: 'all', tier: 'common', name: '魔法之心', desc: '+30 最大 MP', color: '#7aaaff',
    apply: g => { g.player.maxMp += 30; g.player.mp += 30; } },
  { id: 'atk_up', classes: 'all', tier: 'common', name: '猛力之握', desc: '+5 攻擊力', color: '#ffaa55',
    apply: g => { g.player.baseAttack += 5; g.skills.applyAll(g.player); } },
  { id: 'def_up', classes: 'all', tier: 'common', name: '鋼鐵之膚', desc: '+3 防禦力', color: '#aaaaaa',
    apply: g => { g.player.baseDefense += 3; g.skills.applyAll(g.player); } },
  { id: 'spd_up', classes: 'all', tier: 'common', name: '疾風之靴', desc: '+12% 移動速度', color: '#88ff88',
    apply: g => { g.player.speed *= 1.12; } },
  { id: 'sk_pt',  classes: 'all', tier: 'common', name: '頓悟',     desc: '+2 技能點', color: '#ffd86b',
    apply: g => { g.player.skillPoints += 2; } },

  // ====================== 通用 技能強化 ======================
  { id: 'cd_reduce',  classes: 'all', tier: 'rare', name: '冷靜思緒',  desc: '技能冷卻 -20%', color: '#88ddff',
    apply: g => { g.mut.cdMult = (g.mut.cdMult || 1) * 0.8; } },
  { id: 'sk_dmg',     classes: 'all', tier: 'rare', name: '法力強化',  desc: '技能傷害 +25%', color: '#cc66ff',
    apply: g => { g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.25; } },
  { id: 'heal_kill',  classes: 'all', tier: 'rare', name: '吸血鬥士',  desc: '擊殺回 3 HP', color: '#aa3333',
    apply: g => { g.mut.healOnKill = (g.mut.healOnKill || 0) + 3; } },
  { id: 'mp_kill',    classes: 'all', tier: 'rare', name: '靈魂收割',  desc: '擊殺回 5 MP', color: '#5a8aff',
    apply: g => { g.mut.mpOnKill = (g.mut.mpOnKill || 0) + 5; } },
  { id: 'gold_mult',  classes: 'all', tier: 'rare', name: '黃金獵手',  desc: '金幣 +50%', color: '#ffd86b',
    apply: g => { g.mut.goldMult = (g.mut.goldMult || 1) + 0.5; } },
  { id: 'tower_speed',classes: 'all', tier: 'rare', name: '速射箭塔',  desc: '箭塔射速 +40%', color: '#88aaff',
    apply: g => { g.mut.towerSpeedMult = (g.mut.towerSpeedMult || 1) * 0.7; } },
  { id: 'wall_regen', classes: 'all', tier: 'rare', name: '自癒之牆',  desc: '牆隨時間回血', color: '#cccccc',
    apply: g => { g.mut.wallRegen = true; } },

  // ====================== 法師 專屬 ======================
  { id: 'm_meteor_more', classes: ['mage'], tier: 'rare', name: '隕石暴雨', color: '#ff5020',
    desc: '隕石術 +3 顆隕石',
    apply: g => { g.mut.meteorExtra = (g.mut.meteorExtra || 0) + 3; } },
  { id: 'm_meteor_ice', classes: ['mage'], tier: 'rare', name: '冰火合擊', color: '#aaccff',
    desc: '隕石命中後留下冰霜減速地面',
    apply: g => { g.mut.meteorIce = true; } },
  { id: 'm_freeze_ext', classes: ['mage'], tier: 'rare', name: '永凍領域', color: '#88aaff',
    desc: '冰封新星凍結時間 +2 秒',
    apply: g => { g.mut.freezeExtra = (g.mut.freezeExtra || 0) + 2; } },
  { id: 'm_spring_dur', classes: ['mage'], tier: 'rare', name: '黑炎深淵', color: '#aa00ff',
    desc: '黑炎隕石雨傷害 +30%、隕石 +6 顆',
    apply: g => { g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.3; g.mut.meteorExtra = (g.mut.meteorExtra || 0) + 6; } },
  { id: 'm_arcane', classes: ['mage'], tier: 'legendary', name: '奧術主宰', color: '#cc66ff',
    desc: '所有技能傷害 +40%、冷卻 -25%',
    apply: g => {
      g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.4;
      g.mut.cdMult = (g.mut.cdMult || 1) * 0.75;
    } },

  // ====================== 弓手 專屬 ======================
  { id: 'a_storm_more', classes: ['archer'], tier: 'rare', name: '箭雨之神', color: '#ffd86b',
    desc: '箭矢風暴 +5 道箭',
    apply: g => { g.mut.stormExtra = (g.mut.stormExtra || 0) + 5; } },
  { id: 'a_pierce_more', classes: ['archer'], tier: 'rare', name: '穿透精通', color: '#ffaa55',
    desc: '所有箭穿透 +2',
    apply: g => { g.mut.pierceAll = (g.mut.pierceAll || 0) + 2; } },
  { id: 'a_ice_dur', classes: ['archer'], tier: 'rare', name: '永凍領域', color: '#bbeaff',
    desc: '冰巨箭持續 +6 秒',
    apply: g => { g.mut.iceArrowDur = (g.mut.iceArrowDur || 0) + 6; } },
  { id: 'a_invis_dmg', classes: ['archer'], tier: 'rare', name: '焰爆連射', color: '#ff6020',
    desc: '爆裂連矢持續 +6 秒、爆炸範圍 +50',
    apply: g => { g.mut.boomDur = (g.mut.boomDur || 0) + 6; g.mut.boomRadius = (g.mut.boomRadius || 0) + 50; } },
  { id: 'a_ranger', classes: ['archer'], tier: 'legendary', name: '荒野之神', color: '#aaffaa',
    desc: '箭矢風暴 +5、穿透 +1、攻速 +30%',
    apply: g => {
      g.mut.stormExtra = (g.mut.stormExtra || 0) + 5;
      g.mut.pierceAll = (g.mut.pierceAll || 0) + 1;
      g.mut.attackSpeedMult = (g.mut.attackSpeedMult || 1) * 0.7;
    } },

  // ====================== 黑靈狂戰士 專屬 ======================
  { id: 'b_double_moon', classes: ['berserker'], tier: 'rare', name: '雙倍月牙', color: '#5a0a5a',
    desc: '黑魂附體期間每次攻擊釋放 2 道月牙',
    apply: g => { g.mut.darkmoonDouble = true; } },
  { id: 'b_moon_dmg', classes: ['berserker'], tier: 'rare', name: '巨型月牙', color: '#cc3030',
    desc: '黑色月牙傷害 +60%',
    apply: g => { g.mut.darkmoonDmg = (g.mut.darkmoonDmg || 1) + 0.6; } },
  { id: 'b_darksoul_dur', classes: ['berserker'], tier: 'rare', name: '永恆黑魂', color: '#3a0a3a',
    desc: '黑魂附體持續 +6 秒',
    apply: g => { g.mut.darksoulDur = (g.mut.darksoulDur || 0) + 6; } },
  { id: 'b_frenzy_dur', classes: ['berserker'], tier: 'rare', name: '無盡狂熱', color: '#ff3030',
    desc: '狂熱持續 +4 秒',
    apply: g => { g.mut.frenzyDur = (g.mut.frenzyDur || 0) + 4; } },
  { id: 'b_recovery', classes: ['berserker'], tier: 'rare', name: '吞噬恢復', color: '#5a0a0a',
    desc: '恢復改為 +70% HP 且無敵 +3 秒',
    apply: g => { g.mut.recoveryBoost = true; } },
  { id: 'b_overlord', classes: ['berserker'], tier: 'legendary', name: '黑暗領主', color: '#aa00aa',
    desc: '黑魂 +10 秒、月牙傷害 +100%、攻速 +20%',
    apply: g => {
      g.mut.darksoulDur = (g.mut.darksoulDur || 0) + 10;
      g.mut.darkmoonDmg = (g.mut.darkmoonDmg || 1) + 1.0;
      g.mut.attackSpeedMult = (g.mut.attackSpeedMult || 1) * 0.8;
    } },

  // ====================== 詛咒 ======================
  { id: 'glass_cannon', classes: 'all', tier: 'curse', name: '玻璃大砲',
    desc: '攻擊 +60%，HP -30%', color: '#ff3030',
    apply: g => {
      g.player.baseAttack = Math.floor(g.player.baseAttack * 1.6);
      g.player.maxHp = Math.floor(g.player.maxHp * 0.7);
      g.player.hp = Math.min(g.player.hp, g.player.maxHp);
      g.skills.applyAll(g.player);
    } },
  { id: 'magic_drain', classes: 'all', tier: 'curse', name: '魔法乾涸',
    desc: 'MP -50% 但技能傷害 +40%', color: '#aa30dd',
    apply: g => {
      g.player.maxMp = Math.floor(g.player.maxMp * 0.5);
      g.player.mp = Math.min(g.player.mp, g.player.maxMp);
      g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.4;
    } },

  // ====================== 傳奇 ======================
  { id: 'leg_phoenix', classes: 'all', tier: 'legendary', name: '不死鳥之魂',
    desc: '死亡時自動復活一次（回滿）', color: '#ff8030',
    apply: g => { g.mut.phoenix = (g.mut.phoenix || 0) + 1; } },

  // ====================== 新增:通用 ======================
  { id: 'crit_up',    classes: 'all', tier: 'rare', name: '致命一擊', desc: '+15% 暴擊機率(命中時黃光爆閃)',
    color: '#ffea30',
    apply: g => { g.mut.critChance = (g.mut.critChance || 0) + 0.15; } },
  { id: 'crit_dmg',   classes: 'all', tier: 'rare', name: '裂魂之力', desc: '暴擊倍率 +50%(預設 1.6x)', color: '#ff8800',
    apply: g => { g.mut.critMult = (g.mut.critMult || 1.6) + 0.5; } },
  { id: 'big_aoe',    classes: 'all', tier: 'rare', name: '禍世擴張', desc: '所有技能 AOE 半徑 +25%', color: '#ff66cc',
    apply: g => { g.mut.aoeMult = (g.mut.aoeMult || 1) * 1.25; } },
  { id: 'sk_dmg2',    classes: 'all', tier: 'rare', name: '魔力洪流', desc: '技能傷害再 +30%', color: '#cc66ff',
    apply: g => { g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.3; } },
  { id: 'cd_reduce2', classes: 'all', tier: 'rare', name: '思緒清明', desc: '技能冷卻再 -15%', color: '#66ddff',
    apply: g => { g.mut.cdMult = (g.mut.cdMult || 1) * 0.85; } },
  { id: 'mp_regen',   classes: 'all', tier: 'rare', name: '魔泉湧動', desc: '每秒自動 +3 MP',     color: '#88aaff',
    apply: g => { g.mut.mpRegenBonus = (g.mut.mpRegenBonus || 0) + 3; } },
  { id: 'hp_regen',   classes: 'all', tier: 'rare', name: '生命湧動', desc: '每秒自動 +1.5 HP',   color: '#aaffaa',
    apply: g => { g.mut.hpRegenBonus = (g.mut.hpRegenBonus || 0) + 1.5; } },
  { id: 'sk_pt_3',    classes: 'all', tier: 'common', name: '頓悟之劍', desc: '+3 技能點',         color: '#ffd86b',
    apply: g => { g.player.skillPoints += 3; } },
  { id: 'atk_up2',    classes: 'all', tier: 'common', name: '神力之握', desc: '+8 攻擊力',         color: '#ff7733',
    apply: g => { g.player.baseAttack += 8; g.skills.applyAll(g.player); } },
  { id: 'hp_up2',     classes: 'all', tier: 'common', name: '巨人之心', desc: '+50 最大 HP',       color: '#ff5555',
    apply: g => { g.player.maxHp += 50; g.player.hp += 50; } },
  { id: 'lifesteal',  classes: 'all', tier: 'rare', name: '吸血之牙', desc: '擊殺額外回 +5 HP',    color: '#aa1010',
    apply: g => { g.mut.healOnKill = (g.mut.healOnKill || 0) + 5; } },
  { id: 'screen_atk', classes: 'all', tier: 'legendary', name: '震雷之眼', desc: '震屏時對範圍內怪造成 15 傷害',
    color: '#ffea30',
    apply: g => { g.mut.shakeDamage = true; } },

  // ====================== 新增:法師專屬 ======================
  { id: 'm_meteor_size', classes: ['mage'], tier: 'rare', name: '隕石巨化', color: '#ff8030',
    desc: '隕石爆炸範圍 +50%、傷害 +25%',
    apply: g => { g.mut.meteorRadiusMult = (g.mut.meteorRadiusMult || 1) * 1.5; g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.25; } },
  { id: 'm_meteor_split', classes: ['mage'], tier: 'rare', name: '裂變隕石', color: '#ff5050',
    desc: '隕石命中後 50% 機率分裂為 3 顆小隕石',
    apply: g => { g.mut.meteorSplit = true; } },
  { id: 'm_frost_radius', classes: ['mage'], tier: 'rare', name: '極地擴張', color: '#88ccff',
    desc: '冰封新星半徑 +40%',
    apply: g => { g.mut.frostRadiusMult = (g.mut.frostRadiusMult || 1) * 1.4; } },
  { id: 'm_frost_chain', classes: ['mage'], tier: 'rare', name: '永凍連鎖', color: '#bbeaff',
    desc: '冰封新星後留下持續 5 秒冰霜地面',
    apply: g => { g.mut.frostGround = true; } },
  { id: 'm_spring_more', classes: ['mage'], tier: 'rare', name: '深淵隕落', color: '#aa00ff',
    desc: '黑炎隕石雨 +10 顆隕石、爆炸傷害 +40%',
    apply: g => { g.mut.meteorExtra = (g.mut.meteorExtra || 0) + 10; g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.4; } },
  { id: 'm_burn_all', classes: ['mage'], tier: 'rare', name: '焚天烙印', color: '#ff5020',
    desc: '所有技能命中附 4 秒燃燒',
    apply: g => { g.mut.skillBurn = true; } },
  { id: 'm_mana_drain', classes: ['mage'], tier: 'rare', name: '魔力虹吸', color: '#5a8aff',
    desc: '技能命中每隻怪 +1 MP',
    apply: g => { g.mut.mpOnSkillHit = (g.mut.mpOnSkillHit || 0) + 1; } },
  { id: 'm_god', classes: ['mage'], tier: 'legendary', name: '法皇加冕', color: '#ff00ff',
    desc: '所有技能傷害 +60%、隕石 +5 顆、cd -20%',
    apply: g => {
      g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.6;
      g.mut.meteorExtra = (g.mut.meteorExtra || 0) + 5;
      g.mut.cdMult = (g.mut.cdMult || 1) * 0.8;
    } },

  // ====================== 新增:弓手專屬 ======================
  { id: 'a_storm_big', classes: ['archer'], tier: 'rare', name: '萬箭齊發', color: '#fff066',
    desc: '箭矢風暴 +10 道箭、扇形角度 +20%',
    apply: g => { g.mut.stormExtra = (g.mut.stormExtra || 0) + 10; g.mut.stormSpread = (g.mut.stormSpread || 1) + 0.2; } },
  { id: 'a_boom_chain', classes: ['archer'], tier: 'rare', name: '連鎖爆裂', color: '#ff5020',
    desc: '爆裂連矢:爆炸後對範圍內 3 隻怪再次小爆',
    apply: g => { g.mut.boomChain = true; } },
  { id: 'a_boom_radius', classes: ['archer'], tier: 'rare', name: '焚天爆裂', color: '#ff8030',
    desc: '爆裂連矢爆炸範圍 +60、傷害 +50%',
    apply: g => { g.mut.boomRadius = (g.mut.boomRadius || 0) + 60; g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.25; } },
  { id: 'a_double_shot', classes: ['archer'], tier: 'rare', name: '雙生連射', color: '#aaffaa',
    desc: '普攻 40% 機率多射 1 箭',
    apply: g => { g.mut.doubleShot = (g.mut.doubleShot || 0) + 0.4; } },
  { id: 'a_arrow_speed', classes: ['archer'], tier: 'rare', name: '迅捷飛羽', color: '#88ff88',
    desc: '箭速 +50%、攻速 +20%',
    apply: g => { g.mut.arrowSpeed = (g.mut.arrowSpeed || 1) * 1.5; g.mut.attackSpeedMult = (g.mut.attackSpeedMult || 1) * 0.83; } },
  { id: 'a_storm_double', classes: ['archer'], tier: 'rare', name: '雙重風暴', color: '#ffd86b',
    desc: '箭矢風暴 0.4 秒後自動再發射一次',
    apply: g => { g.mut.stormDouble = true; } },
  { id: 'a_ice_size', classes: ['archer'], tier: 'rare', name: '極寒箭巨化', color: '#aaccff',
    desc: '冰巨箭半徑 +60%、凍結時間 +1.5 秒',
    apply: g => { g.mut.iceArrowSize = (g.mut.iceArrowSize || 1) * 1.6; g.mut.freezeExtra = (g.mut.freezeExtra || 0) + 1.5; } },
  { id: 'a_god', classes: ['archer'], tier: 'legendary', name: '神弓加持', color: '#fff066',
    desc: '箭矢風暴 +8、穿透 +3、爆裂範圍 +50',
    apply: g => {
      g.mut.stormExtra = (g.mut.stormExtra || 0) + 8;
      g.mut.pierceAll = (g.mut.pierceAll || 0) + 3;
      g.mut.boomRadius = (g.mut.boomRadius || 0) + 50;
    } },

  // ====================== 新增:狂戰士專屬 ======================
  { id: 'b_recovery_range', classes: ['berserker'], tier: 'rare', name: '血祭擴張', color: '#ff2030',
    desc: '血祭斬擊範圍 +25%、傷害 +30%',
    apply: g => { g.mut.bloodSlashRange = (g.mut.bloodSlashRange || 1) * 1.25; g.mut.skillDmgMult = (g.mut.skillDmgMult || 1) * 1.3; } },
  { id: 'b_recovery_heal', classes: ['berserker'], tier: 'rare', name: '血祭吞噬', color: '#cc1030',
    desc: '血祭斬擊每擊殺回 +25 HP(原 +12)',
    apply: g => { g.mut.bloodSlashHeal = 25; } },
  { id: 'b_slash_more', classes: ['berserker'], tier: 'rare', name: '狂暴連斬', color: '#ff5050',
    desc: '狂暴斬擊 +4 道、火焰附加',
    apply: g => { g.mut.slashExtra = (g.mut.slashExtra || 0) + 4; g.mut.slashFire = true; } },
  { id: 'b_quake_size', classes: ['berserker'], tier: 'rare', name: '大地咆哮', color: '#aa6020',
    desc: '大地震動半徑 +50%、加 6 秒燃燒',
    apply: g => { g.mut.earthSize = (g.mut.earthSize || 0) + 0.5; g.mut.earthCrack = true; } },
  { id: 'b_fury_dur', classes: ['berserker'], tier: 'rare', name: '永燃血怒', color: '#ff3030',
    desc: '血怒持續 +6 秒、攻擊加成 +50%',
    apply: g => { g.mut.furyDur = (g.mut.furyDur || 0) + 6; g.mut.furyBoost = true; } },
  { id: 'b_armor', classes: ['berserker'], tier: 'rare', name: '黑鐵之膚', color: '#444',
    desc: '+8 防禦、+50 最大 HP',
    apply: g => { g.player.baseDefense += 8; g.player.maxHp += 50; g.player.hp += 50; g.skills.applyAll(g.player); } },
  { id: 'b_god', classes: ['berserker'], tier: 'legendary', name: '吞噬之主', color: '#5a0a0a',
    desc: '血祭範圍 +30%、月牙傷害 +80%、血怒+8 秒',
    apply: g => {
      g.mut.bloodSlashRange = (g.mut.bloodSlashRange || 1) * 1.3;
      g.mut.darkmoonDmg = (g.mut.darkmoonDmg || 1) + 0.8;
      g.mut.furyDur = (g.mut.furyDur || 0) + 8;
    } },

  // ====================== 新增:傳奇 ======================
  { id: 'leg_combo', classes: 'all', tier: 'legendary', name: '連擊之神', color: '#ffea00',
    desc: 'Combo 每 10 點傷害 +5%(最高 +50%)',
    apply: g => { g.mut.comboDmg = true; } },
  { id: 'leg_supremacy', classes: 'all', tier: 'legendary', name: '至高戰魂', color: '#ff00aa',
    desc: '所有傷害 +30%、攻速 +20%、cd -15%',
    apply: g => {
      g.mut.allDmgMult = (g.mut.allDmgMult || 1) * 1.3;
      g.mut.attackSpeedMult = (g.mut.attackSpeedMult || 1) * 0.83;
      g.mut.cdMult = (g.mut.cdMult || 1) * 0.85;
    } },
  { id: 'leg_apocalypse', classes: 'all', tier: 'legendary', name: '末日降臨', color: '#aa00ff',
    desc: '主動技能每次施放後自動小爆炸(玩家中心)',
    apply: g => { g.mut.castShockwave = true; } }
];

const Cards = {
  draw(game, rng) {
    const r = rng || { next: Math.random, pick: arr => arr[Math.floor(Math.random()*arr.length)] };
    const wave = game.waveManager.current;
    const cls = game.player.classId;
    const rareChance = Math.min(0.6, 0.20 + wave * 0.04);
    const legChance  = Math.min(0.20, 0.02 + wave * 0.02);
    const curseChance = 0.12;

    const eligible = CARD_POOL.filter(c =>
      c.classes === 'all' || (Array.isArray(c.classes) && c.classes.includes(cls)));

    const draw1 = () => {
      const roll = r.next();
      let tier = 'common';
      if (roll < legChance) tier = 'legendary';
      else if (roll < legChance + rareChance) tier = 'rare';
      else if (roll < legChance + rareChance + curseChance) tier = 'curse';
      const pool = eligible.filter(c => c.tier === tier);
      return pool.length ? r.pick(pool) : null;
    };

    const cards = [];
    let tries = 0;
    while (cards.length < 3 && tries < 30) {
      tries++;
      const c = draw1();
      if (!c) continue;
      if (cards.find(x => x.id === c.id)) continue;
      cards.push(c);
    }
    // 補滿
    while (cards.length < 3) {
      const c = eligible[Math.floor(r.next() * eligible.length)];
      if (!cards.find(x => x.id === c.id)) cards.push(c);
    }
    return cards;
  },

  take(card, game) {
    card.apply(game);
    game.stats.recordCard(card.id);
    Utils.bigToast(`獲得：${card.name}`);
    AudioMgr.levelup();
    Cards.playPickupVFX(card, game);
  },

  // 拿卡牌的絢麗特效:依稀有度分級
  playPickupVFX(card, game) {
    const p = game.player;
    const color = card.color || '#ffd86b';
    const tier = card.tier || 'common';
    // 基礎 levelup 一律加上
    game.particles.levelup(p.x, p.y);

    // 共通:中央大爆閃
    game.particles.add({
      x: p.x, y: p.y, vx: 0, vy: 0,
      life: 0.55, max: 0.55,
      color: 'rgba(255,255,255,0.55)', size: 200, type: 'flash'
    });
    game.particles.add({
      x: p.x, y: p.y, vx: 0, vy: 0,
      life: 0.6, max: 0.6,
      color: color, size: 160, type: 'flash'
    });
    game.particles.shockRing(p.x, p.y, 180, color);
    game.particles.shockRing(p.x, p.y, 120, '#fff');

    if (tier === 'common') {
      // 金色火花 + 上飄
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        game.particles.add({
          x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30,
          vx: Math.cos(a) * 80, vy: Math.sin(a) * 80 - 60,
          life: 1.0, max: 1.0, color, size: 4, type: 'fire', grow: -3
        });
      }
      game.shake(4, 0.18);
    } else if (tier === 'rare') {
      // 紫色光柱 + 多層震波 + 上升符文
      for (let i = 0; i < 3; i++) {
        game.schedule(i * 0.08, () => {
          game.particles.shockRing(p.x, p.y, 260 + i * 60, color);
          game.particles.shockRing(p.x, p.y, 180 + i * 40, '#fff');
        });
      }
      // 上升光柱
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * 60;
        game.particles.add({
          x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r,
          vx: Utils.jitter(20), vy: -Utils.randomRange(80, 220),
          life: 1.5, max: 1.5, color, size: Utils.randomRange(4, 7), type: 'fire', grow: -3
        });
      }
      // 環繞符文(暫時旋轉)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        game.particles.add({
          x: p.x + Math.cos(a) * 80, y: p.y + Math.sin(a) * 80,
          vx: -Math.sin(a) * 50, vy: Math.cos(a) * 50,
          life: 1.3, max: 1.3, color, size: 6, type: 'spark'
        });
      }
      AudioMgr.shockwave();
      game.shake(8, 0.3);
    } else if (tier === 'legendary') {
      // 全屏黃金爆閃 + 螺旋 + 大震屏 + Boss 級進場感
      game.particles.add({
        x: p.x, y: p.y, vx: 0, vy: 0,
        life: 0.8, max: 0.8,
        color: 'rgba(255,216,107,0.7)', size: 500, type: 'flash'
      });
      game.particles.add({
        x: p.x, y: p.y, vx: 0, vy: 0,
        life: 0.7, max: 0.7,
        color: color, size: 360, type: 'flash'
      });
      // 5 層金紅震波
      for (let i = 0; i < 5; i++) {
        game.schedule(i * 0.08, () => {
          game.particles.shockRing(p.x, p.y, 200 + i * 80, i % 2 === 0 ? color : '#ffd86b');
        });
      }
      // 螺旋粒子
      for (let i = 0; i < 60; i++) {
        const t = i / 60;
        const a = t * Math.PI * 8;
        const r = 30 + t * 200;
        game.particles.add({
          x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r,
          vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 30,
          life: 1.4, max: 1.4,
          color: Utils.pick([color, '#ffd86b', '#fff', '#ff8800']),
          size: Utils.randomRange(4, 8), type: 'fire', grow: -3
        });
      }
      // 上方升起的傳奇光柱
      for (let i = 0; i < 18; i++) {
        game.particles.add({
          x: p.x + Utils.jitter(50), y: p.y + Utils.jitter(20),
          vx: Utils.jitter(20), vy: -Utils.randomRange(120, 280),
          life: 1.8, max: 1.8,
          color: Utils.pick([color, '#ffd86b', '#fff']),
          size: Utils.randomRange(8, 14), type: 'smoke', grow: 6
        });
      }
      AudioMgr.victory();
      AudioMgr.bossSpawn();
      game.shake(18, 0.7);
    } else if (tier === 'curse') {
      // 黑紫暗光波 + 邪氣煙霧 + 黑光點纏繞
      game.particles.add({
        x: p.x, y: p.y, vx: 0, vy: 0,
        life: 0.6, max: 0.6,
        color: 'rgba(20,0,30,0.7)', size: 360, type: 'flash'
      });
      game.particles.shockRing(p.x, p.y, 240, '#1a001a');
      game.particles.shockRing(p.x, p.y, 160, color);
      game.particles.shockRing(p.x, p.y, 90, '#5a00aa');
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        game.particles.add({
          x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40,
          vx: -Math.sin(a) * 80, vy: Math.cos(a) * 80 - 30,
          life: 1.4, max: 1.4,
          color: Utils.pick(['#1a001a', color, '#aa00ff', '#3a0a3a']),
          size: 5, type: 'fire', grow: -2
        });
      }
      // 上升邪氣
      for (let i = 0; i < 14; i++) {
        game.particles.add({
          x: p.x + Utils.jitter(40), y: p.y + Utils.jitter(20),
          vx: Utils.jitter(15), vy: -Utils.randomRange(40, 100),
          life: 1.6, max: 1.6, color: 'rgba(40,5,40,0.8)',
          size: Utils.randomRange(8, 14), type: 'smoke', grow: 6
        });
      }
      AudioMgr.shockwave();
      game.shake(10, 0.4);
    }
  }
};
