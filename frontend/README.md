# MIA Frontend

Next.js frontend for the MIA AI Documentation Assistant.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create `.env.local` with:

```bash
DATABASE_URL=postgresql://...
INFERENCE_URL=https://...
INFERENCE_KEY=...
EMBEDDING_URL=https://...
EMBEDDING_KEY=...
RERANKING_URL=https://...
RERANKING_KEY=...
AUTH_SECRET=...
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── pipelines/     # Pipeline CRUD & RAG endpoints
│   ├── pipelines/         # Pipeline pages
│   └── page.tsx           # Home page
├── components/
│   ├── chat/              # Chat UI components
│   ├── citations/         # Citations panel
│   ├── pipeline/          # Pipeline management
│   ├── sidebar/           # Sidebar components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── api.ts             # Frontend API client
│   ├── ai.ts              # AI service integrations
│   ├── db.ts              # Database operations
│   └── crawler.ts         # URL crawling
└── public/                # Static assets
```

## Build

```bash
npm run build
npm run start
```
