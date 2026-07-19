# AdminFlow AI｜智慧行政工作站 — MVP PRD

## 產品定位

AdminFlow AI 是用於行政、行政助理、業務助理與總務職缺作品集展示的瀏覽器端工作站。它把會議整理、商務信件、行政報表、簡報、SOP 與文件管理整合為一個可操作的 React 應用程式。

第一版採規則式模擬服務，不需要 API Key；公開展示版在瀏覽器本機處理資料。程式保留 provider 與儲存介面，未來可依公司資安政策改接 Gemini API、內部服務或企業儲存。

## 成功標準

- 面試官不用登入，在 60 秒內理解並操作主要流程。
- 可用 `npm install`、`npm run dev` 啟動，並部署至 GitHub Pages。
- 能下載 Word、PowerPoint、Excel、CSV、Markdown，並列印成 PDF。
- 桌機體驗完整，手機具基本響應式操作。

## 核心情境

以「每月行政營運會議」串聯辦公用品支出、設備維修、活動安排、跨部門待辦、正式通知與後續 SOP。

## 核心模組

1. **總覽／60 秒 Demo**：能力摘要與四步驟導覽。
2. **會議紀錄**：逐字稿轉摘要、決議、負責人與期限，可匯出 Word／PPT／Markdown。
3. **Email／公文**：依情境、用途、對象與語氣產生正式文字，可複製、開啟 Gmail、匯出 Word。
4. **Excel 報表**：匯入 CSV／XLSX、自動欄位對應、總額與分類統計、資料品質與金額異常、圖表與文字摘要。
5. **SOP 產生器**：口語流程轉角色、步驟、注意事項與檢核表，可匯出 Word／PPT。
6. **文件中心**：確認後手動儲存；草稿自動保存；支援搜尋、篩選、Markdown、列印 PDF 與清除資料。

## 資料處理與 AI 邊界

- 公開展示版的檔案解析、模擬分析與匯出在瀏覽器執行。
- 展示版以 `localStorage` 保存草稿與使用者主動儲存的文件；正式版可依公司政策替換。
- UI 標示示範模式；無法確定的資訊顯示「待確認」。
- `GEMINI_API_KEY` 不得放在 React 前端、公開 Repository 或 `VITE_*` 變數。
- 未來 Gemini provider 必須透過 Node／Serverless 後端代理。

## 視覺與技術

- 現代商務藍灰：深藍側欄、灰白工作區、藍綠狀態色。
- React + Vite + TypeScript；SheetJS、docx、PptxGenJS、Recharts、Lucide。
- 桌機優先、基本響應式、鍵盤 focus、短促狀態動畫與 reduced-motion 支援。

## MVP 不包含

Gmail／Microsoft 365 OAuth、真正 Gemini API、帳號與雲端同步、多人協作、OCR、錄音轉文字。

## 未來擴充

Serverless Gemini provider、Gmail／Outlook 草稿、Drive／OneDrive、音訊轉錄、範本與品牌套版、簽核與版本紀錄。
