# EngFeed 🚀

**EngFeed** is a production-grade, real-time aggregator and distraction-free reader dashboard for top engineering blogs (Netflix, Meta, Cloudflare, Uber, Stripe, Airbnb, GitHub, OpenAI, Vercel, Supabase, etc.).

It polls, cleans, normalizes, and indexes thousands of technical engineering posts, providing sub-100ms API response times with Redis caching, tech-topic categorization, automated read-time estimation, bookmark management, and a clean Reader Mode UI.

---

## ✨ Features

- **📡 Automated RSS/Atom Ingestion Engine**:
  - Polling worker utilizing BullMQ and `rss-parser`.
  - HTML scrubbing and sanitization via `cheerio` & `sanitize-html`.
  - SHA-256 GUID hash deduplication preventing duplicate entries.
  - Keyword-based topic tags (AI & ML, Infrastructure, Distributed Systems, Databases, Backend, Frontend, Security, DevOps, Mobile, Fintech), refined by the optional LLM classifier below.
  - Feed health tracking: failing feeds retry, then get marked `FAILING` or `BROKEN`, and unchanged feeds are skipped with `ETag`/`Last-Modified`.

- **🗂️ Curated Source List**:
  - Blogs live in `sources.yaml`. Give a blog a name, slug, website and category, and its feed and logo are found automatically.
  - Removing a blog retires it: polling stops and its articles stay. A broken discovered feed is re-discovered automatically; a broken pinned feed gets a suggested replacement in `npm run feeds:health`.

- **🧠 Optional LLM Classifier**:
  - Sorts posts into engineering, announcement, careers or marketing, and hides everything but engineering by default. Search and bookmarks always show everything, and the feed has a toggle to turn the filter off.
  - Works with any OpenAI-compatible API (see `.env.example`). With no LLM configured the feed still works, using keyword tags and no filtering.
  - Estimated reading time calculator (words / 200 WPM).

- **⚡ Sub-100ms API Layer & Caching**:
  - High-performance Next.js Server API routes.
  - Intelligent Redis caching (`ioredis`) for articles, stats, and company lists.
  - Support for pagination (`page`, `limit`), instant keyword search, domain category filters, tech tag filters, and bookmark filters.

- **🎨 Modern Dark-Glassmorphic Dashboard UI**:
  - Built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.
  - Multi-column responsive article feed grid with company badges, relative publish dates ("2 hours ago"), and read times.
  - **Distraction-Free Reader Mode**: Accessible modal stripping out corporate sidebars, headers, popups, with reading progress indicator, font size toggle (`A-`, `A`, `A+`), and direct post links.
  - **Live RSS Sync Modal**: On-demand feed sync execution with live progress reporting.
  - **Bookmark Manager**: Instant optimistic bookmarking with user persistence.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Date-Fns, `@tailwindcss/typography`
- **Backend API**: Next.js Server API Routes & Server Actions
- **Database & ORM**: PostgreSQL managed via Prisma ORM
- **Caching & Queues**: Redis 7, Ioredis, BullMQ
- **Feed Processing**: `rss-parser`, Cheerio, `sanitize-html`
- **Containers**: Docker Compose for PostgreSQL & Redis

---

## 📂 Repository Architecture & Folder Structure

```
engineering-blogs/
├── docker-compose.yml           # PostgreSQL & Redis container definitions
├── package.json                 # Project dependencies & scripts
├── tsconfig.json                # Strict TypeScript configuration
├── tailwind.config.js           # Dark theme design system & typography plugin
├── sources.yaml                 # The curated list of engineering blogs
├── prisma/
│   ├── schema.prisma            # PostgreSQL models (Company, Article, UserBookmark)
│   └── seed.ts                  # Syncs sources.yaml into the database
├── scripts/
│   ├── test-rss.ts              # Ingestion worker test script
│   └── test-api.ts              # Full API integration & Redis cache test suite
├── src/
│   ├── app/
│   │   ├── api/                 # High-performance API routes
│   │   │   ├── admin/trigger-sync/ # POST: Force RSS sync endpoint
│   │   │   ├── articles/       # GET: Paginated & filtered articles endpoint
│   │   │   ├── articles/[id]/  # GET: Single article detail & Reader Mode HTML
│   │   │   ├── bookmarks/      # GET & POST: User bookmark manager
│   │   │   ├── companies/      # GET: Registered company blogs list
│   │   │   └── stats/          # GET: Global metrics
│   │   ├── globals.css         # Dark glassmorphic design system styling
│   │   ├── layout.tsx          # Root layout & SEO metadata
│   │   └── page.tsx            # Main application entry point
│   ├── components/              # Frontend React UI Components
│   │   ├── ArticleCard.tsx     # Article card with badges & actions
│   │   ├── ArticleSkeleton.tsx # Shimmer loading skeleton grid
│   │   ├── EngFeedDashboard.tsx# Main client state container & layout
│   │   ├── Navbar.tsx          # Navigation header, search & stats
│   │   ├── ReaderModal.tsx     # Distraction-free clean reader view
│   │   ├── SidebarFilters.tsx  # Tech tags, categories & company filters
│   │   └── SyncProgressModal.tsx# On-demand RSS sync execution overlay
│   ├── lib/
│   │   ├── db.ts               # Prisma Client singleton instance
│   │   ├── ingestion.ts        # RSS ingestion service & cache invalidation
│   │   ├── queue.ts            # BullMQ background job queue
│   │   ├── redis.ts            # Redis client connection pool
│   │   ├── rss-parser.ts       # Feed parser, HTML scrubber & tag generator
│   │   └── utils.ts            # Class merging & date formatting helpers
│   └── workers/
│       └── standalone-worker.ts# Standalone background worker process
└── .env.example                 # Environment configuration template
```

---

## 🚦 Getting Started

### 1. Prerequisites

Ensure you have the following installed:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker Desktop** (or running PostgreSQL and Redis instances)

---

### 2. Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/engfeed.git
   cd engfeed
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   `.env` file configuration:
   ```env
   DATABASE_URL="postgresql://engfeed:engfeed123@localhost:5432/engfeed?schema=public"
   REDIS_URL="redis://localhost:6379"
   ADMIN_API_KEY=""   # Generate your own with: openssl rand -hex 32
   NODE_ENV="development"
   ```

---

### 3. Launch Services & Database Migration

1. **Start PostgreSQL and Redis via Docker Compose**:
   ```bash
   docker-compose up -d
   ```

2. **Push Prisma Schema & Seed Database**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

3. **Run Initial RSS Feed Ingestion**:
   ```bash
   npm run test:rss
   ```
   *This ingests the articles from every feed in `sources.yaml` into PostgreSQL.*

---

### 4. Running the Web Application

1. **Start Next.js Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

2. **Start Standalone Background Worker (Optional)**:
   ```bash
   npm run worker
   ```
   *Syncs every feed on a 2-hour schedule and, if `LLM_MODEL` is set, classifies new articles every 10 minutes.*

3. **Useful Commands**:
   ```bash
   npm run db:seed                       # Apply changes to sources.yaml
   npm run feeds:health                  # List failing, broken and stale feeds
   npm run feeds:discover -- <website>   # See which feed and logo a website resolves to
   npm run classify -- [max articles]    # Classify pending articles now
   npm run eval:classify                 # Score the configured LLM against hand-labelled articles
   npm run test:tags && npm run test:sync && npm run test:classify
   ```

---

## 📡 API Reference

### 1. `GET /api/articles`
Fetch paginated and filtered articles. Response is cached in Redis for sub-100ms response times.

**Query Parameters:**
- `page` (number, default: `1`)
- `limit` (number, default: `20`)
- `company` (string, company slug)
- `tag` (string, tech topic tag e.g. `AI & ML`, `Infrastructure`)
- `search` (string, keyword search in title/summary)
- `sort` (`desc` or `asc`, default: `desc`)
- `bookmarked` (`true` or `false`)
- `kinds` (`all` to include announcements, careers and marketing posts, which are hidden by default)

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmtpitzx606urs56ankz13tgs",
      "title": "Achieving Extreme Efficiency through Specialized GPU Kernel Generation",
      "slug": "achieving-extreme-efficiency-through-specialized-gpu-kernel-generation-3f9b2d",
      "url": "https://www.databricks.com/blog/achieving-extreme-efficiency-through-specialized-gpu-kernel-generation",
      "summary": "Traditionally, production inference systems rely on generic kernels...",
      "publishedAt": "2026-09-04T20:00:00.000Z",
      "readTime": 5,
      "tags": ["AI & ML", "Infrastructure"],
      "company": {
        "id": "company_123",
        "name": "Databricks Blog",
        "slug": "databricks",
        "category": "Data Engineering"
      },
      "isBookmarked": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 7360,
    "totalPages": 368,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 2. `GET /api/articles/[id]`
Fetch full article details and sanitized HTML for Reader Mode.

---

### 3. `GET /api/companies`
Fetch list of all registered engineering blogs with article counts and categories.

---

### 4. `POST /api/bookmarks`
Toggle bookmark status for an article.

**Request Body:**
```json
{
  "articleId": "cmtpitzx606urs56ankz13tgs",
  "userId": "default-user"
}
```

---

### 5. `POST /api/admin/trigger-sync`
Force-poll and refresh RSS feeds. Requires `Authorization: Bearer <ADMIN_API_KEY>`.

---

## 🧪 Testing & Benchmarks

Run the automated test suites:

```bash
# Test RSS parser, HTML scrubber, read time, and deduplication
npm run test:rss

# Test full backend API layer and Redis sub-100ms cache latency
npm run test:api

# Test production build compilation
npm run build
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
