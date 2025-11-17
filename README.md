# 夥班 Huoban ｜團隊勤務排班與庫存管理系統

這是一個專為小型團隊設計的勤務排班與庫存管理系統。它完全基於前端技術（Vue.js）和 Firebase 後端服務，旨在提供一個輕量、快速、易於部署且無需伺服器維護的解決方案。

---

## 目錄

- [功能特色](#功能特色)
- [技術堆疊](#技術堆疊)
- [專案結構](#專案結構)
- [部署教學（從零到上線）](#部署教學從零到上線)
  - [事前準備](#事前準備)
  - [步驟一：設定 Firebase](#步驟一設定-firebase)
  - [步驟二：設定本地專案](#步驟二設定本地專案)
  - [步驟三：上傳程式碼至 GitHub](#步驟三上傳程式碼至-github)
  - [步驟四：部署至 Vercel](#步驟四部署至-vercel)
- [未來維護](#未來維護)

---

## 功能特色

- **身份驗證**：透過 Firebase Authentication 實現安全的帳號密碼登入機制。
- **排班總覽**：以月曆格線方式直觀顯示所有成員的出勤狀況，支援多班別切換。
- **快速操作**：在總覽頁面即可快速新增「請假」、「代班」、「調班」、「調假」、「加班」等事件，大幅提升操作效率。
- **事件追蹤**：將所有差勤事件於獨立頁面列表化，支援按成員或事件類型進行篩選。
- **假別額度**：為每位成員獨立設定年度假別額度（如特休、事假），並自動計算已使用和剩餘的時數／天數。
- **成員管理**：可新增、修改、刪除成員，並設定其職稱與班別。支援拖曳排序和在職／離職狀態切換。
- **庫存盤點**：按班別管理庫存物品，可記錄數量、單位、上傳圖片，並支援拖曳排序。
- **庫存快照**：一鍵建立當前庫存的歷史快照，方便追蹤與核對。
- **資料匯出**：支援將當月班表及歷史盤點快照匯出為 CSV 檔案，方便離線存檔與資料分析。
- **PWA 支援**：支援「新增至主畫面」，提供類似原生 App 的離線使用體驗。

---

## 技術堆疊

- **前端框架**：Vue 3（透過 CDN 引入，無構建步驟）
- **後端服務**：Firebase（Authentication & Firestore Database）
- **樣式**：Tailwind CSS（透過 CDN 引入）
- **圖示**：Font Awesome
- **部署平台**：Vercel
- **離線支援**：Progressive Web App via Service Worker

---

## 專案結構

本專案採用高度模組化的結構，將不同職責的程式碼分離到各自的目錄中，方便維護與擴充。

```
📁 專案根目錄/
├── 📄 index.html                 # 應用程式進入點，負責載入所有腳本和樣式
├── 📄 main.js                    # Vue 應用程式的初始化與核心邏輯
├── 📄 firebase-config.js         # Firebase 設定的模板檔案
├── 📄 firebase-config.local.js   # [本地專用] 儲存您的 Firebase 金鑰，此檔案不應上傳
├── 📄 vercel-env.sh              # [Vercel 專用] 在部署時生成 env.js 的腳本
├── 📄 env.js                     # [Vercel 專用] 環境變數模板，會被 vercel-env.sh 覆蓋
├── 📄 styles.css                 # 全域 CSS 樣式
├── 📄 manifest.json              # PWA 設定檔
├── 📄 service-worker.js          # PWA 離線快取邏輯
├── 📁 firebase-api/              # 封裝所有與 Firebase 互動的函式
├── 📁 components/                # 可重複使用的 Vue 元件（Button、Modal、選單等）
├── 📁 composables/               # 封裝各頁面核心業務邏輯的 Vue Composition API
├── 📁 utils/                     # 共用的工具函式與常數
└── 📁 views/                     # 頁面級別的 Vue 元件（總覽、成員、庫存頁面等）
```

---

## 部署教學（從零到上線）

這份教學將引導您輕鬆地將此專案從零開始部署上線。**請嚴格依照步驟順序操作。**

### 事前準備

在開始之前，請確保您擁有以下帳號與工具：

1.  **Google 帳戶**：用於建立 Firebase 專案。
2.  **GitHub 帳戶**：用於託管您的程式碼。
3.  **Vercel 帳戶**：用於部署您的網站（可使用 GitHub 帳戶直接登入）。
4.  **程式碼編輯器**：例如 Visual Studio Code。
5.  **Live Server（VS Code 擴充功能）**：一個簡單的工具，讓您可以在本機電腦上預覽網站。

### 步驟一：設定 Firebase

Firebase 是我們所有資料的家，這是最關鍵的第一步。

1.  **建立 Firebase 專案**

    - 前往 [Firebase 控制台](https://console.firebase.google.com/)。
    - 點擊「新增專案」，輸入專案名稱，完成建立。

2.  **建立 Firestore 資料庫**

    - 在專案主控台的左側選單，點擊「建構」＞「Firestore Database」。
    - 點擊「建立資料庫」，選擇「**以正式版模式啟動**」。
    - 選擇一個資料庫位置，然後點擊「啟用」。
    - 資料庫建立後，手動建立以下幾個空的「集合」（Collection）：
      - `members`, `events`, `inventories`, `inventory_snapshots`, `quotas`, `schedules`

3.  **設定 Firestore 安全規則**

    - 在 Firestore Database 頁面，切換到「規則」分頁。
    - 將編輯器內容**完全替換**為以下規則，然後點擊「發布」：

    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if request.auth != null;
        }
      }
    }
    ```

    > **說明**：此規則確保只有登入的用戶才能讀寫資料。

4.  **啟用登入功能（Authentication）**

    - 在左側選單，點擊「建構」＞「Authentication」。
    - 點擊「開始使用」，在「登入服務供應商」中，找到並「啟用」**電子郵件／密碼**。

5.  **建立您的第一個使用者**

    - 在 Authentication 頁面，切換到「使用者」分頁，點擊「新增使用者」，建立您登入 App 時要使用的 Email 和密碼。

6.  **取得 Firebase 設定金鑰**

    - 回到專案主控台首頁，點擊網頁應用圖示 `</>` 來新增網頁應用。
    - 輸入暱稱後「註冊應用程式」。
    - 下一步會顯示一個 `firebaseConfig` 物件。**完整複製**這個物件，我們馬上會用到。

7.  **🔥 建立 Firestore 索引（非常重要！）**

    - **為何需要**？應用程式中有一些查詢需要同時根據多個欄位進行排序（例如 `members` 集合），為了讓這些查詢能夠高效運作，Firestore 要求我們手動建立「複合索引」。**如果缺少這個步驟，應用程式將會在讀取資料時失敗。**
    - **如何建立**？
      1.  回到 Firestore Database 頁面，切換到「**索引**」分頁。
      2.  在「複合索引」區塊，點擊「**新增索引**」。
      3.  **建立 `members` 索引**：
          - 集合 ID：`members`
          - 新增欄位：`team`，排序方式：`遞增`
          - 新增欄位：`displayOrder`，排序方式：`遞增`
          - 查詢範圍：`集合`
          - 點擊「**建立**」
      4.  **建立 `inventories` 索引**：
          - 再次點擊「**新增索引**」
          - 集合 ID：`inventories`
          - 新增欄位：`team`，排序方式：`遞增`
          - 新增欄位：`displayOrder`，排序方式：`遞增`
          - 查詢範圍：`集合`
          - 點擊「**建立**」
    - 索引建立需要幾分鐘時間。您可以在頁面上看到建立進度。請務必等待索引狀態變為「**已啟用**」後再進行下一步。

### 步驟二：設定本地專案

1.  **下載程式碼**並解壓縮。

2.  **建立本地設定檔**

    - 在專案根目錄下，手動建立一個新檔案 `firebase-config.local.js`。
    - 打開此檔案，貼上以下內容，並將 `window.env = { ... }` 的大括號內部，**替換成您在上一步複製的 `firebaseConfig` 物件對應的值**。

    ```javascript
    // /firebase-config.local.js
    // 🔴 重要：此檔案僅供本地開發使用，絕不可上傳至 GitHub！

    window.env = {
      VUE_APP_FIREBASE_API_KEY: "替換成您的 apiKey",
      VUE_APP_FIREBASE_AUTH_DOMAIN: "替換成您的 authDomain",
      VUE_APP_FIREBASE_PROJECT_ID: "替換成您的 projectId",
      VUE_APP_FIREBASE_STORAGE_BUCKET: "替換成您的 storageBucket",
      VUE_APP_FIREBASE_MESSAGING_SENDER_ID: "替換成您的 messagingSenderId",
      VUE_APP_FIREBASE_APP_ID: "替換成您的 appId",
    };
    ```

3.  **在本機預覽**
    - 使用 VS Code 打開專案資料夾。
    - 在 `index.html` 檔案上按右鍵，選擇「Open with Live Server」。
    - 您的瀏覽器應該會自動打開網站並顯示登入畫面。

### 步驟三：上傳程式碼至 GitHub

1.  **在 GitHub 上建立一個新的儲存庫（New Repository）**。

2.  **上傳程式碼**

    - 在您的專案資料夾中打開終端機，依序執行以下指令：

    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    # ⚠️ 將 URL 換成您自己的 GitHub 儲存庫 URL
    git remote add origin https://github.com/your-username/your-repository-name.git
    git push -u origin main
    ```

### 步驟四：部署至 Vercel

這是將您的應用程式發佈到網路的最後一步。

1.  **從 GitHub 匯入專案**

    - 登入 Vercel，點擊「Add New...」＞「Project」。
    - 選擇您剛剛建立的 GitHub 儲存庫，點擊「Import」。

2.  **設定環境變數（金鑰上雲端）**
    - 在「Configure Project」頁面，展開「Environment Variables」區塊。
    - 將您之前複製的 Firebase 金鑰，一條一條地新增進來。**請務必確保「Key」的名稱完全一樣**：

| Key（變數名稱）                        | Value（您的 Firebase 設定值）  |
| :------------------------------------- | :----------------------------- |
| `VUE_APP_FIREBASE_API_KEY`             | `AIzaSy...`                    |
| `VUE_APP_FIREBASE_AUTH_DOMAIN`         | `your-project.firebaseapp.com` |
| `VUE_APP_FIREBASE_PROJECT_ID`          | `your-project-id`              |
| `VUE_APP_FIREBASE_STORAGE_BUCKET`      | `your-project.appspot.com`     |
| `VUE_APP_FIREBASE_MESSAGING_SENDER_ID` | `1234567890`                   |
| `VUE_APP_FIREBASE_APP_ID`              | `1:12345...`                   |

3.  **配置構建設定（最關鍵！）**

    - 完成環境變數設定後，**不要急著點 Deploy**。
    - 在同一頁面，找到「Build and Output Settings」區塊。
    - 將 **Build Command** 右側的開關打開（Override），並在輸入框中填入：
      ```
      sh vercel-env.sh
      ```
    - 將 **Output Directory** 右側的開關打開（Override），並在輸入框中填入一個**單獨的點**：
      ```
      .
      ```
    - 將 **Install Command** 右側的開關打開（Override），並**清空**輸入框。

4.  **部署**

    - 完成以上所有設定後，點擊頁面底部的「**Deploy**」按鈕。
    - Vercel 會開始部署。您可以在日誌中看到 `env.js file generated successfully.` 的訊息。
    - 部署成功後，Vercel 會提供一個網域。點擊它，您就可以訪問您的線上應用程式了！

5.  **關閉 Vercel Authentication**
    - 部署成功後，進入專案的「Settings」＞「Security」。
    - 確認最頂部的「Vercel Authentication」處於**關閉**狀態，這樣任何擁有網址的人才能看到您的登入頁面。

---

## 未來維護

- **更新 PWA 快取**：如果您修改了任何**非 JS** 的核心檔案（如 `index.html`, `styles.css`），為了讓舊使用者的 PWA 能夠更新，請記得去 `service-worker.js` 檔案中，將 `CACHE_NAME` 的版本號加一（例如從 `v1.0` 改為 `v1.1`）。
- **修改程式碼**：未來任何程式碼的修改，都只需要在本地完成後，使用 `git add .`、`git commit -m "更新日誌"`、`git push` 這三道指令推送到 GitHub，Vercel 就會自動幫您完成部署。
