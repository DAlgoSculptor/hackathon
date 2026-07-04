# Relu Company Intelligence Assistant 📊

An AI-powered Company Research Assistant that enables users to research any company by providing either the company name or its website URL. The application automatically crawls the target website, searches the web via Serper.dev, analyzes facts via OpenRouter AI, and produces downloadable PDF reports.

## Features
- **ChatGPT-Style Layout**: Sleek, fully responsive dark-themed user interface.
- **Search-Enriched Crawling**: Uses Serper.dev to find official sites (if only names are supplied) and fetches contact coordinates.
- **Website Crawler**: In-memory HTML parser utilizing `cheerio` that dynamically extracts clean textual contents from Home, About, Contact, Services, and Pricing sections.
- **OpenRouter AI Engine**: Supports model selector dropdowns, fetching custom structured summaries, products, pain points, and competitor lists.
- **Client-Side jsPDF Output**: Instant vector PDF compiler with custom headers, styled lists, and details.
- **Discord Bot Webhook**: Delivers PDF attachments along with applicant coordinates, company name, and website to a target Discord channel.

---

## Technical Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Vanilla CSS (CSS Modules)
- **Libraries**:
  - `cheerio` (In-memory web crawler)
  - `jspdf` (Client-side report compilation)
  - `lucide-react` (UI icons)

---

## Environment Variables / Settings
The application is fully client-managed via the configuration panels in the Sidebar (stored securely in `localStorage` for safety). No central database setup or backend secrets are required for local runs:
- **OpenRouter API Key** (`openrouterKey`): Found in OpenRouter dashboard.
- **Serper.dev API Key** (`serperKey`): Found in Serper.dev dashboard.
- **Discord Bot Token** (`botToken`): Provided by Discord developer portal.
- **Discord Channel ID** (`channelId`): Target text channel ID.
- **Applicant Details**: Name and Email address.

---

## Setup & Running Locally

1. **Clone/Unpack Workspace**:
   ```bash
   cd AiCrawler
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Access UI**:
   Open browser at `http://localhost:3000`. Set keys in the sidebar configuration to begin researching!

---

## Production Build & Deploy

Deploy instantly to Vercel, Netlify, or Cloudflare Pages.
```bash
npm run build
```
Since the project uses Next.js serverless functions (inside `app/api/`), it compiles to standard deployment targets automatically.
