# Finopal Sales Organization — React

RTL Persian SPA for role dashboards and the Superuser admin panel.

```bash
npm install
npm run dev
npm run test:e2e:install
npm run test:e2e
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`. For live chat, also run `node realtime/ws-server.mjs` in `MLM-Backend`. If that process is down, chat still works over HTTP.
