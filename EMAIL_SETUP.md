# 📧 EmailJS 設定指南

## 🚀 設定步驟

### 1. 建立 EmailJS 帳號
1. 前往 [EmailJS 官網](https://www.emailjs.com/)
2. 點擊 "Sign Up" 註冊免費帳號
3. 驗證電子郵件

### 2. 建立郵件服務 (Email Service)
1. 登入後點擊 "Email Services"
2. 點擊 "Add New Service"
3. 選擇你的郵件服務商（推薦 Gmail）：
   - **Gmail**: 免費且簡單
   - **Outlook**: Microsoft 帳號
   - **其他**: Yahoo, 自訂 SMTP 等

#### 使用 Gmail 設定：
1. 選擇 "Gmail"
2. 輸入你的 Gmail 地址
3. 點擊 "Connect Account" 並授權
4. 記下 **Service ID**（例如：service_abc123）

### 3. 建立郵件模板 (Email Template)
1. 點擊 "Email Templates"
2. 點擊 "Create New Template"
3. 設定模板內容：

**主旨:**
```
3D設計服務諮詢 - {{user_name}}
```

**內容:**
```
您收到一則來自3D設計師網站的新訊息：

客戶姓名: {{user_name}}
客戶信箱: {{user_email}}
服務項目: {{service_type}}

訊息內容:
{{message}}

---
此郵件來自 3D Designer Peggy 網站聯絡表單
回覆地址: {{reply_to}}
```

**📝 重要提醒：**
請確保在 EmailJS 模板中使用以下變數名稱：
- `{{user_name}}` - 客戶姓名
- `{{user_email}}` - 客戶信箱  
- `{{service_type}}` - 服務項目
- `{{message}}` - 訊息內容
- `{{reply_to}}` - 回覆地址

4. 儲存模板並記下 **Template ID**（例如：template_xyz789）

### 4. 取得公鑰 (Public Key)
1. 點擊右上角的帳號圖示
2. 選擇 "Account"
3. 在 "API Keys" 區域找到 **Public Key**（例如：abcdef123456）

### 5. 更新網站程式碼
在 `js/script.js` 檔案中找到並替換以下三個值：

```javascript
// 第 15 行附近
emailjs.init("YOUR_PUBLIC_KEY"); // 替換為你的 Public Key

// 第 34-35 行附近
emailjs.send(
    'YOUR_SERVICE_ID',    // 替換為你的 Service ID
    'YOUR_TEMPLATE_ID',   // 替換為你的 Template ID
    templateParams
)
```

### 📝 實際設定範例：
```javascript
// 範例（請使用你自己的實際 ID）
emailjs.init("abcdef123456");

emailjs.send(
    'service_gmail123',
    'template_contact456', 
    templateParams
)
```

## 🔧 進階設定

### 自動回覆設定：
可以建立第二個模板給客戶自動回覆：
```
主旨: 感謝您的諮詢 - 3D Designer Peggy

親愛的 {{from_name}}，

感謝您透過我們的網站聯絡我們！
我們已收到您關於「{{service_type}}」的諮詢。

我們將在 24 小時內回覆您的訊息。

3D Designer Peggy 團隊
```

### 免費額度：
- **每月 200 封郵件**
- **每日 30 封郵件**
- 超過需要付費計劃

## 🧪 測試設定

設定完成後：
1. 重新載入網站
2. 填寫聯絡表單
3. 檢查：
   - 瀏覽器控制台是否有錯誤
   - 你的信箱是否收到郵件
   - 填表者是否看到成功訊息

## 🚨 常見問題

1. **CORS 錯誤**: 確保從正確的網域發送
2. **403 錯誤**: 檢查 Public Key 是否正確
3. **模板錯誤**: 確保模板中的變數名稱正確

## 📞 需要幫助？
如果設定過程中遇到問題，請提供錯誤訊息，我可以協助排除問題。
