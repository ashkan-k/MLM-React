# Finopal Sales Organization — React

RTL Persian SPA for role dashboards and the Superuser admin panel.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.

**The Laravel API must be running** (`php artisan serve --host=127.0.0.1 --port=8000` in `MLM-Backend`). If it is down, login shows the offline message instead of treating it as a wrong password.

Optional live chat:

```bash
cd ../MLM-Backend
npm install ws
node realtime/ws-server.mjs
```

If that process is down, chat still works over HTTP.

```bash
npm run test:e2e:install
npm run test:e2e
```

Demo password: `Password123!`. Full artisan/setup notes are in the repository root `README.md` and `MLM-Backend/README.md`.
