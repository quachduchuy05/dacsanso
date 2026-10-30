import './register.mjs';
import {configuration} from './config.mjs';
const options=configuration();
process.env.TZ = 'Asia/Ho_Chi_Minh';
const { createApplication } = await import('./app.mjs');
const port = Number(process.env.PORT || options.port);
if (!options.demo && !options.encryptionKey)
    throw new Error('Cần DATA_ENCRYPTION_KEY khi chạy chế độ thật. Xem README.md.');
const app = await createApplication(options);
app.server.listen(port, process.env.API_HOST ?? '0.0.0.0', () => console.log(`Backend listening on port ${port} | ${app.db.provider} | demo=${options.demo}`));
for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => app.server.close(() => process.exit(0)));
