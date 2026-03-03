# Homelabarr

A self-hosted homelab dashboard built with Next.js. Monitor your services, manage widgets, and keep an eye on your infrastructure from one place.

## Features

- Drag-and-drop widget grid
- Widgets for Docker, Proxmox, TrueNAS, Unraid, Plex, Jellyfin, Sonarr, Radarr, Pi-hole, AdGuard, Uptime Kuma, and more
- Encrypted secret storage for API keys
- Import/export configuration
- Dark mode

---

## Docker (recommended)

### Requirements

- Docker with Compose v2 (`docker compose`)
- The machine running the container must have Docker installed (for the Docker widget)

### Quick start

```bash
git clone https://github.com/your-username/homelabarr.git
cd homelabarr
docker compose up -d
```

Open **http://your-server-ip:3575** in your browser.

Data is stored in `./data/` on the host — it persists across container restarts and upgrades.

### Portainer (Stack)

1. In Portainer, go to **Stacks → Add stack**
2. Choose **Repository** and point it at your clone, or paste the contents of `docker-compose.yml` directly
3. Deploy the stack
4. Access the dashboard at **http://your-server-ip:3575**

### docker-compose.yml

```yaml
services:
  homelabarr:
    build: .
    container_name: homelabarr
    restart: unless-stopped
    ports:
      - "3575:3575"
    volumes:
      - ./data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=production
      - PORT=3575
      # Uncomment and set to persist encryption key across rebuilds:
      # - ENCRYPTION_SECRET=change-me-to-a-long-random-string
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3575` | Port the app listens on |
| `NODE_ENV` | `production` | Node environment |
| `ENCRYPTION_SECRET` | _(auto-generated)_ | Key used to encrypt stored API secrets. If not set, a key is auto-generated and saved to `./data/.encryption-key`. Set this explicitly if you want to retain your secrets after wiping the data directory. |

### Volumes

| Host path | Container path | Purpose |
|---|---|---|
| `./data` | `/app/data` | SQLite database + encryption key |
| `/var/run/docker.sock` | `/var/run/docker.sock` | Docker widget host access |

### Upgrading

```bash
git pull
docker compose build
docker compose up -d
```

Migrations run automatically on startup — no manual steps needed.

---

## Local development

### Requirements

- Node.js 20+
- npm

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/homelabarr.git
cd homelabarr

# 2. Install dependencies
npm install

# 3. Initialize the database (creates ./data/homelabarr.db, runs migrations, seeds a default board)
npm run db:setup

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000**.

> **No `.env` file needed.** There are no required environment variables for local development. The SQLite database and encryption key are auto-created in `./data/` on first run.

### Project structure

```
app/                  Next.js App Router pages and API routes
  api/widgets/        One folder per widget type (server-side data fetching)
  board/[id]/         Board page and layout
  settings/           Settings page
components/
  widgets/            React widget components
  ui/                 Shared UI primitives (shadcn)
lib/
  db/                 Drizzle ORM schema, queries, and DB connection
  crypto/             AES-256-GCM secret encryption
  services/           HTTP client for homelab services (TLS-tolerant)
drizzle/              SQL migration files
```

### Database commands

| Command | Description |
|---|---|
| `npm run db:setup` | Generate + migrate + seed (run once after cloning) |
| `npm run db:generate` | Generate a new migration file after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to the local DB |
| `npm run db:seed` | Seed a default board (no-op if one already exists) |
| `npm run db:studio` | Open Drizzle Studio in the browser to inspect the DB |

### Making schema changes

1. Edit `lib/db/schema.ts`
2. Run `npm run db:generate` to create a new migration file in `drizzle/`
3. Run `npm run db:migrate` to apply it locally
4. Commit both the schema change and the generated migration file

### Adding a new widget

Each widget is made up of:

| File | Purpose |
|---|---|
| `components/widgets/{type}-widget.tsx` | React component |
| `app/api/widgets/{type}/route.ts` | Server-side API route |
| `app/api/widgets/{type}/types.ts` | Response type interfaces |

After creating those files, register the widget in:
- `components/widget-renderer.tsx` — add a `case` for the new type
- `components/add-widget-dialog.tsx` — add to `WIDGET_CATEGORIES` and `WIDGET_DEFAULT_SIZES`

Use an existing widget (e.g. `dns`, `uptime-kuma`) as a reference for the pattern.

---

## Adding API keys (secrets)

Homelabarr encrypts all API keys at rest. To configure a widget that needs an API key:

1. Go to **Settings → Secrets**
2. Create a new secret with a name (e.g. `PLEX_TOKEN`) and paste your API key as the value
3. In the widget's settings, enter the secret **name** (not the key itself) in the "Secret Name" field

---

## Troubleshooting

**Docker widget shows "Cannot connect to Docker daemon"**
Make sure `/var/run/docker.sock` is mounted. If you're using Portainer, add the volume in the stack editor.

**Secrets stop working after wiping `./data/`**
Set `ENCRYPTION_SECRET` to a fixed value in `docker-compose.yml`. Without it, a new key is auto-generated, making previously encrypted secrets unreadable.

**Widget shows an error after entering a secret name**
Check that the secret name in the widget settings matches exactly what you named it in Settings → Secrets (case-sensitive).
