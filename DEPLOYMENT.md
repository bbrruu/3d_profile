# 🌐 3D設計師網站部署指南

## 🏠 本地開發伺服器

### 使用Python（推薦）
```bash
# 在專案目錄下執行
python3 -m http.server 8000
# 或使用 npm script
npm run start
```

### 使用Node.js
```bash
# 安裝http-server
npm install -g http-server
# 啟動伺服器
http-server -p 8000 -c-1
```

### 瀏覽網站
開啟瀏覽器訪問：`http://localhost:8000`

## 🚀 免費網站部署（推薦）

### 1. GitHub Pages（最推薦）✨
**優點：**
- ✅ 完全免費
- ✅ 自動 HTTPS
- ✅ 支援自訂域名
- ✅ 與 Git 整合
- ✅ 全球 CDN

**部署步驟：**
1. 創建 GitHub 帳號（免費）
2. 創建新 Repository（設為 Public）
3. 上傳所有檔案：
```bash
git init
git add .
git commit -m "3D Portfolio Website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```
4. 在 Repository 設定中啟用 GitHub Pages
5. 選擇 main branch 作為來源
6. 網址：`https://YOUR_USERNAME.github.io/REPO_NAME`

### 2. Vercel（簡單易用）⚡
**優點：**
- ✅ 免費額度豐富
- ✅ 自動部署
- ✅ 優秀性能
- ✅ 零設定

**部署步驟：**
1. 前往 [vercel.com](https://vercel.com)
2. 用 GitHub 帳號登入
3. Import Project
4. 選擇您的 Repository
5. 自動部署完成

### 3. Netlify（拖拉部署）🎯
**優點：**
- ✅ 拖拉即部署
- ✅ 表單處理
- ✅ 無伺服器函數

**部署步驟：**
1. 前往 [netlify.com](https://netlify.com)
2. 註冊免費帳號
3. 拖拉整個專案資料夾到部署區域
4. 立即上線

### 4. Firebase Hosting（Google）🔥
**優點：**
- ✅ Google 基礎設施
- ✅ 快速 CDN
- ✅ SSL 憑證

**部署步驟：**
1. 安裝 Firebase CLI：`npm install -g firebase-tools`
2. 登入：`firebase login`
3. 初始化：`firebase init hosting`
4. 部署：`firebase deploy`

## 💡 部署最佳實踐

### 部署前檢查清單
- ✅ 所有 3D 模型檔案路徑正確
- ✅ 在本地測試所有功能正常
- ✅ 檢查控制台無錯誤訊息
- ✅ 確認所有頁面都能正常載入

### 效能最佳化
- **模型壓縮**：確保 3D 模型檔案大小合理（< 10MB）
- **圖片最佳化**：使用 WebP 或優化的 JPEG/PNG
- **啟用 Gzip**：多數平台自動啟用
- **CDN 加速**：GitHub Pages/Vercel/Netlify 都提供

### 瀏覽器相容性
- **WebGL 支援**：現代瀏覽器都支援
- **HTTPS 需求**：生產環境必須使用 HTTPS
- **跨域問題**：所有資源從同一域名載入

## 🔧 常見問題解決

### 模型載入失敗
1. 檢查模型檔案路徑
2. 確認檔案大小不超過限制
3. 檢查控制台錯誤訊息

### 頁面無法顯示
1. 確認所有檔案都已上傳
2. 檢查 index.html 在根目錄
3. 等待部署完成（可能需要 5-10 分鐘）

### HTTPS 相關問題
- 所有免費平台都自動提供 HTTPS
- 確保所有資源使用相對路徑

## 📊 免費方案比較

| 平台 | 頻寬限制 | 儲存空間 | 自訂域名 | 部署方式 |
|------|----------|----------|----------|----------|
| GitHub Pages | 100GB/月 | 1GB | ✅ | Git Push |
| Vercel | 100GB/月 | 無限制 | ✅ | Git 連接 |
| Netlify | 100GB/月 | 無限制 | ✅ | 拖拉上傳 |
| Firebase | 10GB/月 | 10GB | ✅ | CLI 部署 |

## 🚀 快速部署命令

### GitHub Pages 完整設定步驟

#### 步驟 1: 設定 Git 用戶資訊 (首次使用必須)
```bash
# 設定您的姓名 (替換成您的真實姓名)
git config --global user.name "您的姓名"

# 設定您的郵箱 (必須使用 GitHub 註冊時的郵箱)
git config --global user.email "your-email@example.com"

# 檢查設定是否正確
git config --global user.name
git config --global user.email
```

#### 步驟 2: 創建 GitHub 帳號和倉庫
1. 前往 [github.com](https://github.com) 註冊帳號 (免費)
2. 記住您的用戶名 (例如: `john123`)
3. 點擊 "New repository" 創建新倉庫
4. 倉庫名稱建議: `3d-portfolio` 或 `my-portfolio`
5. 設定為 **Public** (重要：GitHub Pages 免費版需要公開)
6. **不要**勾選 "Initialize with README" (我們已有檔案)

#### 步驟 3: 準備並上傳檔案
```bash
# 添加所有檔案到 Git
git add .

# 提交變更 (建立第一個版本)
git commit -m "Initial commit: 3D Portfolio Website"

# 設定主分支名稱
git branch -M main

# 連接到您的 GitHub 倉庫 (替換 YOUR_USERNAME 和 YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 推送到 GitHub
git push -u origin main
```

#### 步驟 4: 啟用 GitHub Pages
1. 進入您的 GitHub 倉庫頁面
2. 點擊 "Settings" 標籤
3. 左側選單找到 "Pages"
4. Source 選擇 "Deploy from a branch"
5. Branch 選擇 "main"
6. Folder 保持 "/ (root)"
7. 點擊 "Save"

#### 步驟 5: 等待部署完成
- 部署需要 5-10 分鐘
- 您的網站網址: `https://YOUR_USERNAME.github.io/YOUR_REPO`

### 簡化版本 (已有 GitHub 帳號)
```bash
# 初始化 Git（如果還沒有）
git init
git add .
git commit -m "Initial commit: 3D Portfolio"
git branch -M main

# 替換成您的 GitHub 用戶名和倉庫名
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 📞 技術支援

如果遇到部署問題：
1. 檢查瀏覽器控制台錯誤
2. 確認所有檔案路徑正確
3. 聯繫平台客服（GitHub/Vercel/Netlify 都有社群支援）

## 🔄 網站更新流程

### 💻 本地開發更新
每次修改程式碼後，需要將變更推送到 GitHub，網站會自動更新：

#### 步驟 1: 檢查變更
```bash
# 查看修改了哪些檔案
git status

# 查看具體變更內容
git diff
```

#### 步驟 2: 添加變更
```bash
# 添加所有變更的檔案
git add .

# 或者添加特定檔案
git add index.html css/style.css js/script.js
```

#### 步驟 3: 提交變更
```bash
# 提交變更並添加描述訊息
git commit -m "更新說明，例如：修復建築模型載入問題"

# 常見的提交訊息範例：
# git commit -m "新增產品設計材質變化功能"
# git commit -m "修復 3D 模型居中問題"
# git commit -m "優化載入速度"
# git commit -m "更新 UI 介面設計"
```

#### 步驟 4: 推送到 GitHub
```bash
# 推送變更到遠端倉庫
git push origin main
```

### 🚀 自動部署

#### GitHub Pages
- ✅ **推送後 2-5 分鐘自動更新**
- ✅ 前往 `https://bbrruu.github.io/3d_profile` 查看結果

#### Vercel
- ✅ **推送後 1-2 分鐘自動更新**
- ✅ 前往您的 Vercel 網址查看結果
- ✅ 可在 Vercel 控制台查看部署狀態

### 📋 更新檢查清單

在每次更新前，建議執行：

1. **本地測試**
```bash
# 啟動本地伺服器測試
python3 -m http.server 8000
# 瀏覽器訪問 http://localhost:8000 確認功能正常
```

2. **檢查檔案**
- ✅ 確認所有新檔案都已添加
- ✅ 檢查 3D 模型路徑正確
- ✅ 測試所有頁面連結

3. **提交變更**
```bash
git add .
git commit -m "具體的更新說明"
git push origin main
```

### 🎯 常見更新情境

#### 修改網站內容
```bash
# 修改 HTML/CSS/JS 檔案後
git add .
git commit -m "更新網站內容"
git push origin main
```

#### 新增 3D 模型
```bash
# 添加新的 .fbx/.obj 檔案到 models/ 資料夾後
git add models/
git commit -m "新增 XXX 3D 模型"
git push origin main
```

#### 修復錯誤
```bash
# 修復程式錯誤後
git add .
git commit -m "修復 XXX 功能問題"
git push origin main
```

### ⚡ 快速更新腳本

您也可以創建一個快速更新腳本：

```bash
#!/bin/bash
# 快速更新腳本 - 儲存為 update.sh
echo "🔄 正在更新網站..."

# 添加所有變更
git add .

# 要求輸入提交訊息
echo "請輸入更新說明："
read commit_message

# 提交變更
git commit -m "$commit_message"

# 推送到 GitHub
git push origin main

echo "✅ 網站更新完成！等待 2-5 分鐘部署完成。"
```

### 📊 部署狀態檢查

#### GitHub Pages
- 前往：`https://github.com/bbrruu/3d_profile/actions`
- 查看部署狀態（綠色勾勾表示成功）

#### Vercel
- 登入 Vercel 控制台
- 查看專案部署歷史和狀態

### 💡 最佳實踐

1. **頻繁小更新** - 每次只修改一個功能
2. **清楚的提交訊息** - 方便追蹤變更歷史
3. **本地測試** - 推送前確保功能正常
4. **備份重要檔案** - Git 自動版本控制，但重要檔案另外備份

---
*部署指南更新：2025年7月21日*
