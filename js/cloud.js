/* ================================================================
 * cloud.js
 * Supabase 雲端整合：匿名登入 / Discord / Google / 存檔 / 排行榜 / 成就
 * 所有方法都包了 try/catch，失敗也不會影響遊戲本體
 * ================================================================ */
const Cloud = {
  client: null,
  user: null,
  ready: false,
  profile: null,
  initPromise: null,
  _setupUserId: null,
  _setupPromise: null,

  // ===== 初始化（main.js 啟動時呼叫）=====
  init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init()
      .catch(e => {
        console.warn('[Cloud] init 失敗：', e);
        return false;
      })
      .finally(() => {
        this.ready = true;
        UI.refreshCloudStatus?.(this.user, this.profile);
      });
    return this.initPromise;
  },

  async _init() {
    if (typeof supabase === 'undefined') {
      throw new Error('Supabase script 未載入');
    }
    const config = window.SUPABASE_CONFIG;
    if (!config?.url || !config?.anonKey) {
      throw new Error('缺少 js/supabase-config.js 設定');
    }

    this.client = supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    // 避免在 Supabase auth callback 內直接 await 其他 Supabase 查詢。
    this.client.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => this.handleSession(session), 0);
    });

    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    this.user = data.session?.user || null;

    if (!this.user) {
      await this.signInAnon();
    } else {
      await this.finishUserSetup(this.user);
    }
    return !!this.user;
  },

  async withTimeout(promise, fallback, timeoutMs = 5000) {
    let timer = null;
    try {
      return await Promise.race([
        promise,
        new Promise(resolve => {
          timer = setTimeout(() => resolve(fallback), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  },

  async waitUntilReady(timeoutMs = 5000) {
    if (!this.initPromise) this.init();
    await this.withTimeout(this.initPromise, false, timeoutMs);
    return !!(this.client && this.user);
  },

  async handleSession(session) {
    const nextUser = session?.user || null;
    if (nextUser?.id !== this.user?.id) {
      this.user = nextUser;
      this.profile = null;
      this._setupUserId = null;
      this._setupPromise = null;
    }
    if (this.user) await this.finishUserSetup(this.user);
    UI.refreshCloudStatus?.(this.user, this.profile);
    UI.updateMainMenuButtons?.();
  },

  async finishUserSetup(user) {
    if (!user || user.id !== this.user?.id) return;
    if (this._setupUserId === user.id && this._setupPromise) {
      return this._setupPromise;
    }
    this._setupUserId = user.id;
    this._setupPromise = (async () => {
      await this.ensureProfile();
      await this.mergeCloudAchievements();
      await Save.syncPendingToCloud?.();
    })();
    return this._setupPromise;
  },

  // 取得當前要顯示的名稱
  suggestName() {
    if (!this.user) return 'Guest';
    const meta = this.user.user_metadata || {};
    return meta.full_name || meta.name || meta.user_name ||
           (this.user.email ? this.user.email.split('@')[0] : null) ||
           (this.user.is_anonymous ? `Guest_${this.user.id.slice(0, 6)}` : `Player_${this.user.id.slice(0, 6)}`);
  },

  // 建立 / 更新 profile
  async ensureProfile() {
    if (!this.user || !this.client) return;
    try {
      const { data, error } = await this.client.from('profiles')
        .select('*').eq('id', this.user.id).maybeSingle();
      if (error) throw error;
      if (data) {
        this.profile = data;
      } else {
        const name = this.suggestName().slice(0, 20);
        const { data: ins, error: insertError } = await this.client.from('profiles')
          .upsert({ id: this.user.id, display_name: name })
          .select().single();
        if (insertError) throw insertError;
        this.profile = ins;
      }
    } catch (e) {
      console.warn('[Cloud] ensureProfile', e);
    }
  },

  // 更新顯示名稱
  async updateDisplayName(name) {
    if (!name) return false;
    if (!this.user && !(await this.waitUntilReady())) return false;
    try {
      const { error } = await this.client.from('profiles')
        .update({ display_name: name.slice(0, 20) }).eq('id', this.user.id);
      if (error) return false;
      this.profile = { ...this.profile, display_name: name.slice(0, 20) };
      UI.refreshCloudStatus?.(this.user, this.profile);
      return true;
    } catch (e) { return false; }
  },

  // ===== 登入 / 登出 =====
  async signInAnon() {
    if (!this.client) return false;
    try {
      const { data, error } = await this.client.auth.signInAnonymously();
      if (error) { console.warn('[Cloud] 匿名登入失敗：', error); return false; }
      this.user = data.user;
      await this.finishUserSetup(this.user);
      return true;
    } catch (e) {
      console.warn('[Cloud] 匿名登入失敗：', e);
      return false;
    }
  },

  loginDiscord() {
    if (!this.client) return;
    const redirect = location.href.split('?')[0].split('#')[0];
    return this.client.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: redirect }
    });
  },
  loginGoogle() {
    if (!this.client) return;
    const redirect = location.href.split('?')[0].split('#')[0];
    return this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirect }
    });
  },

  async logout() {
    if (!this.client) return;
    await this.client.auth.signOut();
    this.user = null;
    this.profile = null;
    this._setupUserId = null;
    this._setupPromise = null;
    // 自動切回匿名（玩家不會「斷線」）
    await this.signInAnon();
    UI.refreshCloudStatus?.(this.user, this.profile);
  },

  isAnonymous() {
    return !!this.user?.is_anonymous;
  },

  // ===== 存檔 =====
  async saveToCloud(slot, gameOrData) {
    if (!this.user || !this.client) return false;
    try {
      const data = gameOrData?.player && gameOrData?.wave != null &&
        gameOrData?.version ? gameOrData : Save.serialize(gameOrData);
      const { error } = await this.client.from('saves').upsert({
        user_id: this.user.id,
        slot,
        data,
        wave: data.wave,
        level: data.player?.level || 1,
        class_id: data.player?.classId || 'warrior',
        score: data.score || 0,
        mode: data.mode || 'normal',
        updated_at: new Date().toISOString()
      });
      if (error) { console.warn('[Cloud] saveToCloud', error); return false; }
      return true;
    } catch (e) { console.warn(e); return false; }
  },

  async loadFromCloud(slot, game) {
    const cloudSave = await this.getCloudSave(slot);
    if (!cloudSave) return false;
    try {
      Save.applyToGame(game, cloudSave.data);
      return true;
    } catch (e) { console.warn(e); return false; }
  },

  async getCloudSave(slot) {
    if (!this.user && !(await this.waitUntilReady())) return null;
    try {
      const result = await this.withTimeout(
        this.client.from('saves')
          .select('data, updated_at')
          .eq('user_id', this.user.id).eq('slot', slot).maybeSingle(),
        null
      );
      if (!result) return null;
      const { data, error } = result;
      if (error) throw error;
      return data || null;
    } catch (e) {
      console.warn('[Cloud] getCloudSave', e);
      return null;
    }
  },

  async listCloudSaves() {
    if (!this.user && !(await this.waitUntilReady())) return [];
    try {
      const result = await this.withTimeout(
        this.client.from('saves')
          .select('slot, wave, level, class_id, score, mode, updated_at')
          .eq('user_id', this.user.id).order('slot'),
        null
      );
      if (!result) return [];
      const { data, error } = result;
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[Cloud] listCloudSaves', e);
      return [];
    }
  },

  async deleteCloud(slot) {
    if (!this.user || !this.client) return;
    try {
      await this.client.from('saves').delete()
        .eq('user_id', this.user.id).eq('slot', slot);
    } catch (e) { console.warn(e); }
  },

  // ===== 排行榜 =====
  async submitScore(game) {
    if (!this.user && !(await this.waitUntilReady())) return;
    if (!game.stats?.victory) return; // 只記錄通關
    try {
      const name = this.profile?.display_name || this.suggestName();
      const score = Math.min(9999999, Math.max(0, game.score || 0));
      const wave = Math.min(15, Math.max(1, game.waveManager.current));
      const cls = game.stats.classId || 'warrior';
      const mode = ['normal', 'daily', 'ngplus'].includes(game.stats.mode) ? game.stats.mode : 'normal';
      const seed = mode === 'daily' ? PRNG.todaySeed().label : null;
      const dur = Math.min(86400, Math.max(0, Math.round(game.stats.timePlayed())));
      const { error } = await this.client.from('scores').insert({
        user_id: this.user.id,
        display_name: name,
        score, wave, class_id: cls, mode,
        daily_seed: seed,
        duration_sec: dur
      });
      if (error) console.warn('[Cloud] submitScore', error);
      else Utils.toast('分數已上傳排行榜');
    } catch (e) { console.warn(e); }
  },

  async topScores(mode = 'normal', limit = 50) {
    if (!this.client) return [];
    try {
      const { data } = await this.client.from('scores')
        .select('display_name, score, wave, class_id, created_at, duration_sec')
        .eq('mode', mode)
        .order('score', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (e) { return []; }
  },

  async dailyScores(seed) {
    if (!this.client) return [];
    try {
      const { data } = await this.client.from('scores')
        .select('display_name, score, wave, class_id, duration_sec, created_at')
        .eq('daily_seed', seed)
        .order('score', { ascending: false })
        .limit(100);
      return data || [];
    } catch (e) { return []; }
  },

  // ===== 成就 =====
  async syncAchievement(achievementId) {
    if (!this.user && !(await this.waitUntilReady())) return;
    try {
      await this.client.from('achievements').upsert({
        user_id: this.user.id,
        achievement_id: achievementId
      }, {
        onConflict: 'user_id,achievement_id',
        ignoreDuplicates: true
      });
    } catch (e) {}
  },

  async fetchAchievements() {
    if (!this.user || !this.client) return [];
    try {
      const { data } = await this.client.from('achievements')
        .select('achievement_id').eq('user_id', this.user.id);
      return (data || []).map(d => d.achievement_id);
    } catch (e) { return []; }
  },

  // 把雲端成就合併進本地 Meta 並反向把本地未上傳的推上去
  async mergeCloudAchievements() {
    const remote = await this.fetchAchievements();
    if (!remote.length) {
      // 雲端沒有 → 把本地全部上傳
      for (const id of Meta.data.unlocked) this.syncAchievement(id);
      return;
    }
    let added = 0;
    for (const id of remote) {
      if (!Meta.data.unlocked.includes(id)) {
        Meta.data.unlocked.push(id);
        added++;
      }
    }
    // 本地獨有的也上傳
    for (const id of Meta.data.unlocked) {
      if (!remote.includes(id)) this.syncAchievement(id);
    }
    if (added > 0) {
      Meta.save();
      Utils.toast(`同步雲端成就 +${added}`);
    }
  }
};
