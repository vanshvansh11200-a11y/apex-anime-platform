# ⚡ APEX — Production Anime Streaming Platform

> **A fully functional, production-ready anime streaming platform** built with Express.js backend, Vanilla JS SPA frontend, AniList GraphQL API integration, HLS.js video streaming, JWT authentication, and an admin dashboard.

---

## 🚀 Quick Start (3 Commands)

```bash
cd /data/data/com.termux/files/home/apex-anime-platform
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

---

## 🔐 Default Credentials

| Role  | Email                | Password  |
|-------|----------------------|-----------|
| Admin | admin@apex.stream    | Admin123! |
| User  | user@apex.stream     | User123!  |

---

## 📁 Project Structure

```
apex-anime-platform/
├── server/                    # Node.js Express Backend
│   ├── index.js               # Server entry point
│   ├── config.js              # Environment configuration
│   ├── database/
│   │   ├── db.js              # JSON file database (zero-dependency)
│   │   └── seed.js            # Sample data seeder
│   ├── controllers/           # Route handlers
│   │   ├── authController.js
│   │   ├── animeController.js # + AniList GraphQL integration
│   │   ├── episodeController.js
│   │   ├── adminController.js
│   │   ├── watchlistController.js
│   │   ├── historyController.js
│   │   └── commentController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   └── errorHandler.js
│   ├── routes/                # Express route definitions
│   └── services/
│       └── anilistService.js  # AniList GraphQL client + cache
├── public/                    # Frontend SPA
│   ├── index.html             # Single entry point
│   ├── assets/logo.svg
│   ├── css/
│   │   ├── styles.css         # Global styles + dark/light themes
│   │   └── player.css         # Video player styles
│   └── js/
│       ├── app.js             # Router setup + global shortcuts
│       ├── router.js          # Hash-based SPA router
│       ├── state.js           # Reactive global state store
│       ├── api.js             # API client (all endpoints)
│       ├── components/
│       │   ├── navbar.js      # Navbar with search autocomplete
│       │   ├── footer.js
│       │   ├── toast.js       # Toast notification system
│       │   ├── animeCard.js   # Reusable anime card
│       │   ├── heroBanner.js  # Hero carousel
│       │   └── emptyState.js  # Empty state component
│       └── pages/
│           ├── home.js        # Home: hero + sections
│           ├── explore.js     # Browse with filters + pagination
│           ├── trending.js    # AniList trending
│           ├── popular.js     # AniList popular
│           ├── latest.js      # Airing anime
│           ├── seasons.js     # Seasonal browser
│           ├── search.js      # Debounced search
│           ├── animeDetail.js # Anime details + episodes
│           ├── watchPage.js   # Full video player page
│           ├── watchlist.js   # User watchlist management
│           ├── history.js     # Watch history + resume
│           ├── auth.js        # Login + Register
│           ├── profile.js     # Profile + preferences
│           ├── admin.js       # Admin dashboard
│           └── notFound.js    # 404 page
├── prisma/
│   └── schema.prisma          # PostgreSQL schema (for production)
├── data/                      # Auto-created: JSON database
├── .env                       # Environment variables
├── .env.example               # Template
└── package.json
```

---

## 🌐 All Pages & Routes

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Home — Hero banner + Trending/Popular/Latest | No |
| `/#/explore` | Explore — Browse with filters | No |
| `/#/trending` | Trending — AniList top trending | No |
| `/#/popular` | Popular — All-time popular | No |
| `/#/latest` | Latest — Currently airing | No |
| `/#/seasons` | Seasons — Browse by season+year | No |
| `/#/search?q=...` | Search — Debounced with AniList | No |
| `/#/anime/:slug` | Anime Detail — Episodes, rating, watchlist | Optional |
| `/#/watch/:id` | Watch Page — Full player + comments | Optional |
| `/#/watchlist` | Watchlist — Track progress | ✅ Required |
| `/#/history` | Watch History — Resume any episode | ✅ Required |
| `/#/login` | Login | No |
| `/#/register` | Register | No |
| `/#/profile` | Profile & Preferences | ✅ Required |
| `/#/admin` | Admin Dashboard | ✅ Admin Only |

---

## 🎬 Video Player Features

| Feature | Status |
|---------|--------|
| HLS Adaptive Bitrate (HLS.js) | ✅ Working |
| MP4 Direct Playback | ✅ Working |
| Japanese / English Dub / Hindi Dub Audio | ✅ Server Switching |
| Subtitle Tracks | ✅ (WebVTT, when src provided) |
| Quality Selection | ✅ Per-server |
| Playback Speed (0.5x–2x) | ✅ Working |
| Skip Intro / Skip Outro | ✅ Working |
| Auto-Skip Intro | ✅ User Setting |
| Auto Next Episode Countdown | ✅ 10 second overlay |
| Resume Playback | ✅ Synced with server |
| Progress Saving (every 15s) | ✅ Authenticated users |
| Keyboard Shortcuts | ✅ Space/M/F/P/Arrows |
| Picture-in-Picture | ✅ Browser API |
| Fullscreen | ✅ Working |
| Volume Slider + Mute | ✅ Working |
| Buffered Progress Bar | ✅ Working |
| Scrubber Tooltip | ✅ Working |
| Spoiler Comments | ✅ Click to reveal |

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/profile
```

### Anime (Public, some AniList-enhanced)
```
GET  /api/anime              # Browse catalog
GET  /api/anime/trending     # AniList trending (w/ local fallback)
GET  /api/anime/popular      # AniList popular (w/ local fallback)
GET  /api/anime/latest       # Airing anime
GET  /api/anime/seasons      # Seasonal browser
GET  /api/anime/featured     # Hero banner anime
GET  /api/anime/genres       # Genre list with counts
GET  /api/anime/search?q=    # Hybrid AniList + Local search
GET  /api/anime/:slug        # Full anime detail
POST /api/anime/:id/rate     # Rate anime 1-10
```

### Episodes
```
GET /api/episodes/:id        # Episode details + sources
```

### User Features (Auth Required)
```
GET    /api/watchlist
POST   /api/watchlist
DELETE /api/watchlist/:animeId
GET    /api/history
POST   /api/history/progress
DELETE /api/history
GET    /api/comments/episode/:episodeId
POST   /api/comments
DELETE /api/comments/:id
```

### Admin (Admin Role Required)
```
GET    /api/admin/stats
POST   /api/admin/anime
PUT    /api/admin/anime/:id
DELETE /api/admin/anime/:id
POST   /api/admin/episodes
PUT    /api/admin/episodes/:id
DELETE /api/admin/episodes/:id
GET    /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
```

### SEO
```
GET /sitemap.xml
GET /robots.txt
GET /api/health
```

---

## 🌍 AniList GraphQL Integration

APEX uses the **official [AniList GraphQL API](https://anilist.co/graphiql)** (no API key required, rate-limited) for:
- Trending anime (real-time)
- Popular anime rankings
- Latest airing anime
- Seasonal browser (Winter/Spring/Summer/Fall by year)
- Debounced search

**Graceful fallback**: If AniList is unavailable, APEX serves from its local curated catalog automatically. All metadata is clearly attributed.

---

## 📺 Video Sources (Authorized Demo)

The seeded episodes use these **authorized open-source** demo streams:

| Server | Type | Audio |
|--------|------|-------|
| Kaizen (HLS Multi-Bitrate) | HLS | Japanese (Original) |
| Titan (Direct HD) | MP4 | English Dub |
| Apex CDN (Fast) | MP4 | Hindi Dub |
| Mirror | MP4 | Japanese (HQ) |

> ⚠️ **APEX never scrapes or hosts unauthorized content.** The admin panel allows adding authorized stream URLs only. Demo streams use Google/Blender Foundation open-source video samples.

---

## ⚙️ Environment Variables (.env)

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your_very_secure_secret_key_here
JWT_EXPIRES_IN=7d
DATA_DIR=./data
DATABASE_FILE=./data/apex.db.json
ADMIN_DEFAULT_EMAIL=admin@apex.stream
ADMIN_DEFAULT_PASSWORD=Admin123!
USER_DEFAULT_EMAIL=user@apex.stream
USER_DEFAULT_PASSWORD=User123!
```

---

## 🗄️ Database

**Development**: JSON file database (zero setup, no external dependencies)
- Location: `./data/apex.db.json`
- Auto-seeded on first start
- Atomic writes (temp file + rename)

**Production**: PostgreSQL via Prisma ORM
- Schema: `prisma/schema.prisma`
- Full relational schema with proper indexes

```bash
# To use PostgreSQL:
npm install @prisma/client prisma
npx prisma migrate dev
npx prisma generate
```

---

## 🚀 Deployment Guide

### Option 1: VPS / Cloud (Recommended)
```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone & install
cd /var/www
git clone <your-repo> apex-anime-platform
cd apex-anime-platform
npm install

# Set environment
cp .env.example .env
nano .env  # Set JWT_SECRET to a strong random string

# Run with PM2
npm install -g pm2
pm2 start server/index.js --name apex
pm2 startup && pm2 save

# Optional: Nginx reverse proxy
# Proxy pass localhost:3000 to your domain
```

### Option 2: Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server/index.js"]
```

### Option 3: Railway / Render / Fly.io
1. Connect your repository
2. Set environment variables in dashboard
3. Deploy command: `node server/index.js`
4. Port: 3000

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `M` | Mute / Unmute |
| `F` | Fullscreen |
| `P` | Picture-in-Picture |
| `←` / `→` | Seek ±10 seconds |
| `↑` / `↓` | Volume up/down |
| `Ctrl+K` or `/` | Focus search bar |
| `Ctrl+Shift+T` | Toggle dark/light theme |

---

## ✅ What Works

- ✅ Full SPA navigation (hash routing)
- ✅ Authentication (JWT, bcrypt)
- ✅ AniList GraphQL with local fallback
- ✅ HLS.js adaptive bitrate player
- ✅ Japanese / English / Hindi audio switching
- ✅ Skip intro/outro buttons
- ✅ Auto-skip intro setting
- ✅ Resume playback
- ✅ Progress sync every 15 seconds
- ✅ Keyboard shortcuts (all 7)
- ✅ Picture-in-Picture
- ✅ Fullscreen
- ✅ Spoiler comment blur/reveal
- ✅ Watchlist (4 statuses)
- ✅ Watch history + continue watching
- ✅ Admin dashboard (CRUD anime/episodes/users)
- ✅ Role-based access control
- ✅ Dark + Light themes
- ✅ Autocomplete search in navbar
- ✅ Debounced search page
- ✅ Pagination
- ✅ Skeleton loaders
- ✅ Empty states
- ✅ Toast notifications
- ✅ Hero banner carousel (auto-rotate 7s)
- ✅ Anime rating (1–10 stars)
- ✅ Sitemap.xml + robots.txt
- ✅ Responsive mobile-first
- ✅ SEO metadata

## ⚠️ What Requires External Setup

| Feature | Requirement |
|---------|-------------|
| Real anime streams | Admin must add authorized video URLs |
| Actual subtitle .vtt files | Admin must upload and add SRT/WebVTT URLs |
| PostgreSQL | Configure DATABASE_URL and run prisma migrate |
| Email verification | Add SMTP config (not included) |
| CDN image hosting | Use Cloudinary/S3 for poster/banner uploads |
| AniList search | No API key needed (public GraphQL, rate-limited) |

---

*Built with ❤️ for anime fans worldwide. APEX respects intellectual property rights and only streams authorized content.*
