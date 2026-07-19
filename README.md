# AdminFlow AI｜智慧行政工作站

一套為行政、行政助理、業務助理與總務職缺設計的 AI × Office 作品集。以「每月行政營運會議」為主線，示範如何把零散資訊整理成會議紀錄、正式信件、Excel 報表、PowerPoint 與 SOP。

> 此公開展示版使用規則式模擬服務，資料在瀏覽器本機處理；正式部署時可依公司資安、保存與權限政策調整。

## 展示亮點

- **60 秒引導式 Demo**：讓面試官快速理解完整行政工作流。
- **會議紀錄整理**：摘要、決議、待辦、負責人與截止日。
- **Email／公文助手**：依情境、用途與語氣產生正式內容，並可開啟 Gmail 撰寫畫面。
- **Excel／CSV 報表**：自動辨識欄位、計算 KPI、分類圖表、資料品質與高額支出異常。
- **SOP 產生器**：角色分工、流程步驟、注意事項與可操作檢核表。
- **文件中心**：本機儲存、搜尋、篩選、Markdown 與列印 PDF。
- **完整 Office 匯出**：Word `.docx`、PowerPoint `.pptx`、Excel `.xlsx`、CSV 與 Markdown。

## 技術架構

```text
React UI
  ├─ MockAiService（目前使用）
  ├─ GeminiAiService 契約（預留）
  ├─ Browser file parser（CSV / XLSX）
  ├─ Office exporters（DOCX / PPTX / XLSX）
  └─ localStorage（草稿 / 文件中心）
```

- React 18、Vite、TypeScript
- Recharts、Lucide React
- SheetJS、docx、PptxGenJS
- GitHub Actions + GitHub Pages

## 本機啟動

需要 Node.js 18 以上版本。

```bash
npm install
npm run dev
```

終端機會顯示本機網址，通常為 `http://localhost:5173`。

正式建置：

```bash
npm run build
npm run preview
```

## 建議展示流程

1. 在首頁按「開始 60 秒導覽」。
2. 進入會議紀錄並按「載入示範」，產生摘要與待辦。
3. 進入 Excel 報表，載入示範 CSV，展示欄位辨識、圖表與異常。
4. 下載 Word、PowerPoint 或 Excel 成果。
5. 將結果存入文件中心，展示搜尋、Markdown 與列印 PDF。

## GitHub Pages

Repository 已包含 `.github/workflows/deploy.yml`。推送至 `main` 後：

1. 到 GitHub Repository 的 **Settings → Pages**。
2. Source 選擇 **GitHub Actions**。
3. 等待 **Deploy AdminFlow AI to GitHub Pages** workflow 完成。
4. 在 Repository 首頁的 About 區塊加入 Pages 網址。

Vite 的 `base` 設為 `./`，可支援一般 GitHub Pages Repository 路徑。

## Gemini-ready 設計

`src/services/aiService.ts` 定義共用 provider 契約；`mockAiService.ts` 提供公開 Demo；`geminiService.ts` 說明未來串接位置。

請勿把 Gemini API Key 放入：

- React 原始碼
- `.env.example`
- `VITE_GEMINI_API_KEY`
- GitHub Repository 或 GitHub Pages

正式串接時，應新增 Node／Serverless API，讓後端以 `GEMINI_API_KEY` 環境變數呼叫 Gemini，前端只呼叫自己的安全 endpoint。

## 資料處理與部署

- 公開展示版的檔案與文字在目前瀏覽器處理。
- 展示版文件與草稿保存在 `localStorage`。
- 可在文件中心按「清除全部」刪除 AdminFlow 的本機資料。
- 清除瀏覽器資料也會移除文件中心，重要成果請下載備份。
- 正式版本可依公司需求改接內部 API、權限管理、企業雲端儲存與備份政策。

## 專案結構

```text
src/
  components/       各工作模組與共用 UI
  data/             每月行政營運會議示範資料
  services/         Mock / Gemini-ready AI provider
  utils/            報表分析、Office 匯出、本機儲存
  App.tsx           導覽、60 秒 Demo 與應用程式外殼
  styles.css        商務藍灰設計系統與響應式樣式
PRD.md              MVP 產品需求
```

## 目前限制

- Mock AI 使用關鍵字與規則，不具真正語意理解能力。
- Gmail 僅開啟預填草稿頁，沒有 OAuth 或直接寄信。
- PDF 透過瀏覽器列印產生。
- 本機資料不會跨裝置同步。
- 第一版適合一般行政資料量，不以大型檔案為目標。

## 未來可擴充

- 安全的 Gemini Serverless provider
- Gmail／Outlook、Google Drive／OneDrive
- 錄音轉逐字稿與 OCR
- 公司品牌範本、簽核、版本紀錄與雲端文件中心

詳細需求請參閱 [PRD.md](./PRD.md)。
