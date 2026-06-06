# 荒野據點 Survival Outpost

純前端 + Supabase BaaS 的 2D 俯視角生存遊戲。

- 🎮 3 種職業 × 3 個獨家技能
- 🎴 Roguelike 卡牌系統（含技能升級）
- 🐉 3 種誇張造型 Boss
- ☁ 雲端存檔 + 排行榜 + 成就同步
- 👤 匿名 / Discord / Google 三種登入
- 📱 觸控操作 + PWA

線上版：https://job159.github.io/WEB_GMAE/

---

## ⚠ 第一次部署：Supabase 必做的 4 件事

雲端功能依賴 Supabase。請在 Dashboard 完成以下 4 步驟，否則登入會失敗：

### Step 1：建立資料表與 RLS

在新 Supabase 專案的 **SQL Editor** 執行
[`supabase/schema.sql`](supabase/schema.sql) 全部內容。

SQL 已包含匿名玩家需要的 RLS。每位匿名玩家只能讀寫自己的存檔。

### Step 2：啟用 Anonymous Sign-Ins

**Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable**

### Step 3：設定 Site URL & Redirect URLs（OAuth 必需）

**Authentication → URL Configuration**

- **Site URL**：`https://job159.github.io/WEB_GMAE/`
- **Redirect URLs**（按 Add URL 加 4 條）：
  ```
  https://job159.github.io/WEB_GMAE/**
  http://localhost:5500/**
  http://127.0.0.1:5500/**
  http://localhost:5173/**
  ```
  雙星號 `**` 是萬用字元。漏這步會出現「Redirect URL not allowed」。

### Step 4：啟用 Discord / Google OAuth

#### Discord
1. https://discord.com/developers/applications → New Application
2. **OAuth2 → Redirects → Add**：`https://izokvkrdmbfuksetzfhe.supabase.co/auth/v1/callback`
3. **OAuth2 → Reset Secret** 取得 Client Secret
4. 回 Supabase **Authentication → Providers → Discord → Enable**，貼 Client ID + Secret

#### Google
1. https://console.cloud.google.com → 新專案
2. **APIs & Services → OAuth consent screen → Configure**（External）
3. **Credentials → Create OAuth Client ID → Web application**
4. Authorized redirect URI：`https://izokvkrdmbfuksetzfhe.supabase.co/auth/v1/callback`
5. 取得 Client ID/Secret 貼進 Supabase **Authentication → Providers → Google**

---

## 玩法操作

| 鍵 | 功能 |
|----|------|
| WASD | 移動 |
| 滑鼠左鍵 | 攻擊 |
| Space | 衝刺 |
| E | 採集 |
| 1 / 2 / 3 | 切換武器 |
| Q / R / V | 職業專屬 3 技能 |
| B | 建築選單 |
| T | 被動技能面板 |
| N | 商店（準備時段） |
| P | 暫停 / Esc 關閉面板 |
| F / L | 存 / 讀檔 |

遊戲中按 `P` 開啟暫停選單，再選擇「存檔」，可自行存入手動槽
1–3。每個槽位會記錄完整存檔日期與時間。

## 雲端機制（重點）

- 啟動時**自動匿名登入**，立即可用雲端
- 切換到目前的新 Supabase 後，首次載入會一次性清除舊專案存檔與 session
- 存檔一定先寫 localStorage，再同步 Supabase
- 同步失敗會保留待上傳狀態，匿名登入或網路恢復後補傳
- 讀檔比較本地與雲端時間，使用較新的版本
- 通關自動上傳分數到排行榜
- 解成就自動同步雲端
- 登入 Discord / Google 後跨裝置同步

公開連線設定放在 `js/supabase-config.js`。前端只能使用 anon key 或
publishable key，不能放 `service_role` key。

## 部署

```bash
git add . && git commit -m "cloud" && git push
```

GitHub Pages 約 1 分鐘後更新。
