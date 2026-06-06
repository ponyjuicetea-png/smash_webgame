/* ================================================================
 * save.js
 * 多存檔槽 (3 個手動 + 1 個自動) + 簡易簽章（防 F12 修改）
 * Key: survival-outpost-save-v3-slotN
 * ================================================================ */
const Save = {
  PREFIX: 'survival-outpost-save-v3-slot',
  PENDING_KEY: 'survival-outpost-pending-cloud-izokvkrdmbfuksetzfhe',
  RESET_KEY: 'survival-outpost-save-reset-izokvkrdmbfuksetzfhe',
  SLOTS: [0, 1, 2, 3],   // 0 = autosave，1/2/3 = 手動

  // 簡易混淆雜湊（不是強加密，只擋 F12 玩家）
  hash(str) {
    let h = 1779033703;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0).toString(36);
  },

  key(slot) { return this.PREFIX + slot; },

  resetPreviousSavesOnce() {
    if (localStorage.getItem(this.RESET_KEY)) return false;
    for (const slot of this.SLOTS) localStorage.removeItem(this.key(slot));
    [
      'survival-outpost-pending-cloud-qmcpltfabwtzfdsevztf',
      'survival-outpost-cloud-migrated-qmcpltfabwtzfdsevztf',
      'sb-qmcpltfabwtzfdsevztf-auth-token',
      'sb-ifdpokqieznddirqxubq-auth-token'
    ].forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(this.PENDING_KEY);
    localStorage.setItem(this.RESET_KEY, String(Date.now()));
    return true;
  },

  writeLocal(slot, data) {
    const json = JSON.stringify(data);
    localStorage.setItem(this.key(slot), JSON.stringify({ d: data, s: this.hash(json) }));
  },

  readLocal(slot) {
    const raw = localStorage.getItem(this.key(slot));
    if (!raw) return null;
    const wrap = JSON.parse(raw);
    if (!wrap?.d || wrap.s !== this.hash(JSON.stringify(wrap.d))) {
      throw new Error(`存檔 ${slot} 簽章不符`);
    }
    return wrap.d;
  },

  pendingSlots() {
    try {
      const slots = JSON.parse(localStorage.getItem(this.PENDING_KEY) || '[]');
      return Array.isArray(slots) ? slots.filter(s => this.SLOTS.includes(s)) : [];
    } catch (e) {
      return [];
    }
  },

  markPending(slot) {
    const slots = new Set(this.pendingSlots());
    slots.add(slot);
    localStorage.setItem(this.PENDING_KEY, JSON.stringify([...slots]));
  },

  clearPending(slot) {
    const slots = this.pendingSlots().filter(s => s !== slot);
    if (slots.length) localStorage.setItem(this.PENDING_KEY, JSON.stringify(slots));
    else localStorage.removeItem(this.PENDING_KEY);
  },

  async syncDataToCloud(slot, data) {
    if (typeof Cloud === 'undefined') return false;
    if (!Cloud.user && Cloud.waitUntilReady) await Cloud.waitUntilReady();
    if (!Cloud.user) return false;
    const ok = await Cloud.saveToCloud(slot, data);
    if (ok) this.clearPending(slot);
    return ok;
  },

  async syncPendingToCloud() {
    if (typeof Cloud === 'undefined' || !Cloud.user) return false;
    let allSynced = true;
    for (const slot of this.pendingSlots()) {
      try {
        const data = this.readLocal(slot);
        if (!data) {
          this.clearPending(slot);
          continue;
        }
        if (!await Cloud.saveToCloud(slot, data)) allSynced = false;
        else this.clearPending(slot);
      } catch (e) {
        console.warn('[Save] 補傳失敗', e);
        allSynced = false;
      }
    }
    return allSynced;
  },

  // 全部 slot 的摘要（用於 UI）— 含雲端合併
  async list() {
    const local = this.SLOTS.map(slot => {
      try {
        const data = this.readLocal(slot);
        if (!data) return { slot, empty: true };
        return {
          slot,
          empty: false,
          time: data.time,
          wave: data.wave,
          day: data.day,
          score: data.score,
          classId: data.player?.classId || 'warrior',
          level: data.player?.level || 1,
          mode: data.mode || 'normal',
          auto: slot === 0,
          source: 'local'
        };
      } catch (e) { return { slot, empty: true, broken: true }; }
    });

    if (typeof Cloud === 'undefined') return local;
    if (!Cloud.user && Cloud.waitUntilReady) await Cloud.waitUntilReady();
    if (!Cloud.user) return local;

    // 拉雲端，比較 updated_at，新的覆蓋舊的
    try {
      const cloud = await Cloud.listCloudSaves();
      const byId = {};
      for (const s of local) byId[s.slot] = s;
      for (const c of cloud) {
        const cloudInfo = {
          slot: c.slot, empty: false,
          time: new Date(c.updated_at).getTime(),
          wave: c.wave, day: 0, score: c.score,
          classId: c.class_id, level: c.level,
          mode: c.mode, auto: c.slot === 0,
          source: 'cloud'
        };
        const localInfo = byId[c.slot];
        if (!localInfo || localInfo.empty || cloudInfo.time > localInfo.time) {
          byId[c.slot] = cloudInfo;
        }
      }
      return Object.values(byId).sort((a, b) => a.slot - b.slot);
    } catch (e) {
      console.warn(e); return local;
    }
  },

  serialize(game) {
    const p = game.player;
    const savedAt = Date.now();
    return {
      version: 4,
      time: savedAt,
      savedAt: new Date(savedAt).toISOString(),
      mode: game.stats.mode,
      player: {
        x: p.x, y: p.y,
        radius: p.radius,
        hp: p.hp, maxHp: p.maxHp,
        mp: p.mp, maxMp: p.maxMp,
        baseMaxHp: p.baseMaxHp, baseMaxMp: p.baseMaxMp,
        stamina: p.stamina, maxStamina: p.maxStamina,
        hunger: p.hunger, maxHunger: p.maxHunger,
        level: p.level, exp: p.exp, expNeed: p.expNeed,
        baseAttack: p.baseAttack, baseDefense: p.baseDefense,
        speed: p.speed,
        skillPoints: p.skillPoints,
        facing: p.facing,
        currentWeapon: p.currentWeapon,
        classId: p.classId,
        unlockedWeapons: p.unlockedWeapons || [],
        shopUpgrades: { ...(p.shopUpgrades || {}) }
      },
      inventory: { ...game.inventory },
      skills: Object.fromEntries(game.skills.list.map(s => [s.id, s.level])),
      buildings: game.buildings.filter(b => b.alive).map(b => ({
        type: b.type, x: b.x, y: b.y, hp: b.hp
      })),
      mutations: { ...game.mut },
      wave: game.waveManager.current,
      day: game.day,
      isNight: game.isNight,
      timeOfDay: game.timeOfDay,
      score: game.score,
      killCount: game.killCount,
      seed: game.seed,
      quests: game.quests.map(q => ({ id: q.id, done: q.done, progress: q.progress }))
    };
  },

  save(game, slot = 1) {
    try {
      const data = this.serialize(game);
      this.writeLocal(slot, data);
      this.markPending(slot);

      const canSync = typeof Cloud !== 'undefined';
      if (slot === 0) {
        Utils.toast('已自動存檔' + (canSync ? '（雲端同步中）' : '（本地）'));
      } else {
        Utils.toast(`存檔 ${slot}：已存本地` + (canSync ? '，雲端同步中' : ''));
      }

      if (canSync) {
        this.syncDataToCloud(slot, data).then(ok => {
          if (slot === 0) return;
          Utils.toast(ok ? `存檔 ${slot}：雲端同步完成` : `存檔 ${slot}：已存本地，雲端稍後重試`);
        }).catch(e => console.warn('[Save] syncDataToCloud', e));
      }
      AudioMgr.click();
      return true;
    } catch (err) {
      console.error(err); Utils.toast('存檔失敗'); return false;
    }
  },

  autosave(game) {
    return this.save(game, 0);
  },

  // 對外的 load 介面：比較本地與雲端時間，載入較新的版本
  async load(game, slot = 1) {
    let localData = null;
    try {
      localData = this.readLocal(slot);
    } catch (e) {
      console.warn(e);
    }

    let cloudSave = null;
    if (typeof Cloud !== 'undefined') {
      cloudSave = await Cloud.getCloudSave(slot);
    }

    const localTime = localData?.time || 0;
    const cloudTime = cloudSave?.data?.time ||
      (cloudSave?.updated_at ? new Date(cloudSave.updated_at).getTime() : 0);

    if (cloudSave?.data && (!localData || cloudTime >= localTime)) {
      try {
        this.applyToGame(game, cloudSave.data);
        this.writeLocal(slot, cloudSave.data);
        this.clearPending(slot);
        Utils.toast(`雲端讀檔 ${slot}`);
        AudioMgr.click();
        return true;
      } catch (e) {
        console.warn('[Save] 雲端存檔無法載入', e);
      }
    }

    if (localData) {
      this.applyToGame(game, localData);
      if (typeof Cloud !== 'undefined') {
        this.markPending(slot);
        this.syncDataToCloud(slot, localData).catch(e => console.warn(e));
      }
      Utils.toast(`本地讀檔 ${slot}`);
      AudioMgr.click();
      return true;
    }

    Utils.toast('沒有存檔');
    return false;
  },

  // 純本地讀檔（保留原本邏輯）
  loadLocal(game, slot = 1) {
    try {
      const data = this.readLocal(slot);
      if (!data) { Utils.toast('沒有存檔'); return false; }
      this.applyToGame(game, data);
      Utils.toast(`本地讀檔 ${slot}`);
      AudioMgr.click();
      return true;
    } catch (err) {
      console.error(err); Utils.toast('讀檔失敗'); return false;
    }
  },

  applyToGame(game, data) {
    const savedPlayer = data.player || {};
    const classId = this.resolveClassId(savedPlayer);
    const classConfig = CHAR_CLASSES[classId];
    const classWeaponIds = (LEGENDARY_WEAPONS[classId] || []).map(w => w.id);
    const startingWeapon = classConfig.starting.weapon;

    const player = new Player(
      savedPlayer.x ?? game.mapW / 2,
      savedPlayer.y ?? game.mapH / 2
    );
    player.applyClass(classId);
    Object.assign(player, savedPlayer);
    player.classId = classId;
    player.classMods = { ...(classConfig.starting.mods || {}) };

    const savedUnlocked = Array.isArray(savedPlayer.unlockedWeapons)
      ? savedPlayer.unlockedWeapons.filter(id => classWeaponIds.includes(id))
      : [];
    player.unlockedWeapons = [...new Set([startingWeapon, ...savedUnlocked])];

    const savedWeapon = classWeaponIds.includes(savedPlayer.currentWeapon)
      ? savedPlayer.currentWeapon
      : startingWeapon;
    player.currentWeapon = savedWeapon;

    // 讀檔後檢查等級對應的傳說武器是否需要自動解鎖
    player.checkAutoUnlock?.(null);
    // 自動解鎖只補齊清單，不能改變存檔當下裝備的外觀。
    player.currentWeapon = savedWeapon;
    game.player = player;

    game.inventory = { wood: 0, stone: 0, iron: 0, gold: 0, food: 0, ...data.inventory };
    for (const s of game.skills.list) {
      if (data.skills && data.skills[s.id] != null) s.level = data.skills[s.id];
    }
    game.skills.applyAll(game.player);

    game.buildings = data.buildings.map(b => new Building(b.type, b.x, b.y, b.hp));
    game.mut = data.mutations || {};

    game.waveManager.current = data.wave || 1;
    game.waveManager.state = 'prepare';
    game.waveManager.timer = 8;
    game.day = data.day || 1;
    game.isNight = !!data.isNight;
    game.timeOfDay = data.timeOfDay || 0;
    game.score = data.score || 0;
    game.killCount = data.killCount || 0;
    game.seed = data.seed;
    game.stats.mode = data.mode || 'normal';
    game.stats.classId = classId;

    if (data.quests) {
      for (const sq of data.quests) {
        const q = game.quests.find(x => x.id === sq.id);
        if (q) { q.done = sq.done; q.progress = sq.progress || 0; }
      }
    }
  },

  resolveClassId(savedPlayer) {
    if (CHAR_CLASSES[savedPlayer.classId]) return savedPlayer.classId;
    if (savedPlayer.classId === 'warrior') return 'berserker';

    const weapon = savedPlayer.currentWeapon;
    for (const classId of CLASS_LIST) {
      if ((LEGENDARY_WEAPONS[classId] || []).some(w => w.id === weapon)) {
        return classId;
      }
    }
    return CLASS_LIST[0];
  },

  delete(slot) {
    localStorage.removeItem(this.key(slot));
    this.clearPending(slot);
    if (typeof Cloud !== 'undefined') Cloud.deleteCloud(slot);
    Utils.toast(`存檔 ${slot} 已刪除`);
  },

  async hasAny() {
    for (const slot of this.SLOTS) {
      try {
        if (this.readLocal(slot)) return true;
      } catch (e) {}
    }
    return (await this.list()).some(s => !s.empty);
  }
};
