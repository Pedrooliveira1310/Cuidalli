import { createApp } from './app.js';
const app = createApp();
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
app.server.listen(port, host, () => console.log(`Cuidali iniciado em ${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
