# 設置指南

## 🚀 快速開始

恭喜！您的3D設計師網站已經準備就緒。以下是完成設置的步驟：

### 1. 📋 檢查檔案結構
確認您的資料夾包含以下檔案：
```
佩奇網站/
├── index.html              ✅ 主頁面
├── css/style.css           ✅ 樣式檔案
├── js/script.js            ✅ JavaScript功能
├── images/                 ✅ 圖片資料夾
├── models/                 ✅ 3D模型資料夾
├── package.json            ✅ 專案配置
├── README.md               ✅ 說明文件
├── DEPLOYMENT.md           ✅ 部署指南
├── image-generator.html    ✅ 圖片生成器
└── .gitignore             ✅ Git忽略檔案
```

### 2. 🖼️ 生成示例圖片
1. 開啟 `image-generator.html`
2. 點擊「生成所有示例」按鈕
3. 圖片將自動下載到您的下載資料夾
4. 將下載的圖片移動到 `images/` 資料夾

### 3. 📦 獲取3D模型
#### 選項A：下載免費模型
1. 訪問 [Sketchfab](https://sketchfab.com/features/free) 
2. 搜尋「free」並篩選可下載的模型
3. 下載GLB格式的模型
4. 重新命名為：
   - `house.glb` (建築模型)
   - `product.glb` (產品模型) 
   - `character.glb` (角色模型)
   - `sample1.glb`, `sample2.glb`, `sample3.glb` (示例模型)

#### 選項B：使用佔位模型
如果您暫時沒有3D模型，網站仍然可以運行，只是3D預覽功能會顯示載入錯誤。

### 4. 🌐 啟動本地伺服器

#### 方法1：使用Python（推薦）
```bash
cd "/Users/bbrruu0722/Desktop/佩奇網站"
python3 -m http.server 8000
```

#### 方法2：使用VS Code任務
1. 在VS Code中開啟專案
2. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows)
3. 輸入「Tasks: Run Task」
4. 選擇「啟動開發伺服器」

#### 方法3：使用Node.js
```bash
npx http-server -p 8000
```

### 5. 🔍 訪問網站
開啟瀏覽器訪問：`http://localhost:8000`

## 📝 自訂內容

### 修改個人資訊
編輯 `index.html` 檔案中的以下部分：

1. **網站標題** (第7行)：
```html
<title>您的名字 - 專業3D建模服務</title>
```

2. **導航欄標題** (第15行)：
```html
<h2>您的工作室名稱</h2>
```

3. **主標題** (第30行)：
```html
<h1>您的專業技能描述</h1>
```

4. **聯絡資訊** (第165-175行)：
```html
<span>your-email@domain.com</span>
<span>+886-您的電話</span>
<span>您的地址</span>
```

### 添加作品項目
在 `index.html` 的作品集區域 (第45-85行) 複製貼上作品項目結構：

```html
<div class="portfolio-item">
    <div class="portfolio-image">
        <img src="images/您的圖片.jpg" alt="專案描述">
    </div>
    <div class="portfolio-info">
        <h3>專案名稱</h3>
        <p>專案描述</p>
        <button class="view-3d-btn" data-model="models/您的模型.glb">查看3D模型</button>
    </div>
</div>
```

### 修改顏色主題
編輯 `css/style.css` 檔案中的顏色變數：

```css
/* 在檔案開頭添加 */
:root {
    --primary-color: #3498db;    /* 主要顏色 */
    --secondary-color: #2c3e50;  /* 次要顏色 */
    --accent-color: #e74c3c;     /* 強調顏色 */
}
```

## 🔧 進階功能

### 添加Google Analytics
在 `index.html` 的 `</head>` 標籤前添加：

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 添加聯絡表單後端
目前表單只會在控制台顯示資料。要實際發送郵件，您可以：

1. 使用 Netlify Forms
2. 使用 Formspree
3. 使用 EmailJS
4. 自建後端API

### SEO優化
1. 添加meta描述
2. 優化圖片alt標籤
3. 添加結構化資料
4. 創建sitemap.xml

## 🚀 部署到線上

### GitHub Pages (免費)
1. 創建GitHub帳號
2. 創建新倉庫
3. 上傳所有檔案
4. 在設定中啟用GitHub Pages

### Netlify (免費)
1. 拖拽整個資料夾到 [Netlify](https://netlify.com)
2. 網站會自動部署

### 購買網域
1. 選擇網域註冊商（如GoDaddy、Namecheap）
2. 購買您想要的網域
3. 設定DNS指向您的主機

## 🆘 問題排除

### 3D模型無法載入
- 檢查檔案路徑是否正確
- 確認檔案格式為GLB或GLTF
- 檢查控制台錯誤訊息

### 本地伺服器無法啟動
- 確認Python已安裝：`python3 --version`
- 檢查埠號8000是否被佔用
- 嘗試其他埠號：`python3 -m http.server 3000`

### 樣式沒有載入
- 檢查檔案路徑
- 確認CSS檔案沒有語法錯誤
- 清除瀏覽器快取

## 📞 需要幫助？

如果您在設置過程中遇到任何問題：

1. 檢查瀏覽器控制台錯誤訊息
2. 參考 `README.md` 的詳細說明
3. 查看 `DEPLOYMENT.md` 的部署指南

---

**預祝您的3D設計師網站成功上線！** 🎉
