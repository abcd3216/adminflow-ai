# AdminFlow AI｜智慧行政工作站

一套為行政、行政助理、業務助理與總務職缺設計的 AI × Office ej/ 工具。以日常行政工作為情境，示範如何把零散資訊整理成會議紀錄、正式信件、Excel 報表與 SOP，並輸出可交付的 Office 文件。

> 目前是示範版本：前端以 React／TypeScript 製作，AI 請求透過本機 Node API 代理呼叫 Gemini，API key 不會放進瀏覽器程式碼或 GitHub Repository。

## 這個專案在做什麼

我想解決的不是單一聊天機器人問題，而是行政工作裡「資料很零散、整理很花時間、最後還要做成文件」的完整流程。使用者可以把臨時會議筆記、Word 逐字稿、信件需求或 Excel 支出資料放進工作站，讓系統先整理，再確認並匯出成果。

專案目前包含會議摘要與待辦、Email／公文草稿、Excel 支出分析、SOP 產生器和文件中心。介面採商務型後台設計，也保留檔案格式驗證、草稿自動保存、錯誤提示及響應式版面等。

## 工具介紹

> 這是我做的 AdminFlow AI 智慧行政工作站。我觀察到行政工作常常不是缺少資料，而是資料散落在會議筆記、Word、Email 和 Excel 裡，整理成主管能直接看的成果很花時間。所以我把幾個常見流程整合成一個工作站：例如載入一份臨時會議紀錄後，系統會整理摘要、決議、負責人和期限；支出表也能自動產生分類與異常分析。這個作品除了 AI 功能，也特別處理了 API key 安全、Office 檔案匯入匯出、資料保存。

## 工具特色

- **會議紀錄整理**：支援貼上文字、載入 `.docx`／`.txt`，產生摘要、決議、待辦、負責人與截止日。
- **Email／公文助手**：依情境、用途與語氣產生正式內容，並可開啟 Gmail 撰寫畫面。
- **Excel／CSV 報表**：自動辨識欄位、計算 KPI、分類圖表、資料品質與高額支出異常。
- **SOP 產生器**：角色分工、流程步驟、注意事項與可操作檢核表。
- **文件中心**：本機儲存、搜尋、篩選、Markdown 與列印 PDF。
- **Office 成果匯出**：會議紀錄可匯出 Word；報表與 SOP 另支援 Excel、PowerPoint、CSV 或 Markdown 等對應格式。

## 技術架構

```text
React UI
  ├─ Gemini AI service
  ├─ Browser file parser（DOCX / TXT / CSV / XLSX）
  ├─ Office exporters（DOCX / PPTX / XLSX）
  └─ localStorage（草稿 / 文件中心）

Node API
  └─ Server-side Gemini proxy（環境變數保存 API key）
```

- React 18、Vite、TypeScript
- Recharts、Lucide React
- Mammoth、SheetJS、docx、PptxGenJS
- GitHub Actions + GitHub Pages

## 本機啟動

需要 Node.js 20 以上版本，以及一組 Gemini API key。

```bash
npm ci
copy .env.example .env
npm run dev
```

接著在 `.env` 填入：

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.5-flash
PORT=8787
```

終端機會顯示本機網址，通常為 `http://localhost:5173`。

正式建置：

```bash
npm run build
npm run preview
```

## GitHub Pages

Repository 已包含 `.github/workflows/deploy.yml`。推送至 `main` 後：

1. 到 GitHub Repository 的 **Settings → Pages**。
2. Source 選擇 **GitHub Actions**。
3. 等待 **Deploy AdminFlow AI to GitHub Pages** workflow 完成。
4. 在 Repository 首頁的 About 區塊加入 Pages 網址。

Vite 的 `base` 設為 `./`，可支援一般 GitHub Pages Repository 路徑。

GitHub Pages 是靜態展示環境，不會保存 Gemini API key，也不會啟動 `server/index.mjs`。如需讓公開網站直接使用 AI，應另外部署 Serverless／Node 後端並設定環境變數；本機完整展示請使用 `npm run dev`。

## Gemini-ready 設計

`src/services/aiService.ts` 負責前端 AI 請求，`server/index.mjs` 在伺服器端讀取 `GEMINI_API_KEY` 並代理 Gemini API。

請勿把 Gemini API Key 放入：

- React 原始碼
- `.env.example`
- `VITE_GEMINI_API_KEY`
- GitHub Repository 或 GitHub Pages

目前本機版本已採 Node API 代理；公開部署時仍應使用相同原則，讓前端只呼叫自己的安全 endpoint。

## 資料處理與部署

- 公開展示版的檔案與文字在目前瀏覽器處理。
- 展示版文件與草稿保存在 `localStorage`。
- 可在文件中心按「清除全部」刪除 AdminFlow 的資料。
- 清除瀏覽器資料也會移除文件中心，重要成果請下載備份。
- 正式版本可依公司需求改接內部 API、權限管理、企業雲端儲存與備份政策。

## 專案結構

```text
src/
  components/       各工作模組與共用 UI
  data/             每月行政營運會議示範資料
  services/         Mock / Gemini-ready AI provider
  utils/            報表分析、Office 匯出、本機儲存
  App.tsx           側邊導覽與應用程式外殼
  styles.css        商務藍灰設計系統與響應式樣式
server/             Gemini API 代理
scripts/            本機前後端啟動腳本
test-data/          Excel、Word 與錄音測試資料
TODO.md             後續實作與驗收條件
PRD.md              MVP 產品需求
```

## 目前限制

- iPhone 語音備忘錄目前只有上傳展示流程，尚未實作真正的語音轉文字。
- DOCX 匯入以抽取文字為主，不保留 Word 的原始版面樣式。
- Gmail 僅開啟預填草稿頁，沒有 OAuth 或直接寄信。
- PDF 透過瀏覽器列印產生。
- 本機資料不會跨裝置同步。
- GitHub Pages 靜態版不包含 Gemini 後端。
- 第一版適合一般行政資料量，不以大型檔案為目標。

## 未來可擴充

- 部署 Gemini Serverless provider
- Gmail／Outlook、Google Drive／OneDrive
- iPhone 語音備忘錄轉逐字稿與 OCR
- 公司品牌範本、簽核、版本紀錄與雲端文件中心

詳細需求請參閱 [PRD.md](./PRD.md)。
