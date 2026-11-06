import './server/register.mjs';

const { configuration } = await import('./server/config.mjs');
const { openDatabase } = await import('./server/postgres-database.mjs');

const db = await openDatabase(configuration());

try {
  const users = (await db.read()).state.users;

  const accounts = users
    .filter(u => u.role === 'admin')
    .map(u => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      adminGroup: u.adminGroup ?? '',
      status: u.status
    }));

  console.log('Tong so tai khoan Admin va HTX:', accounts.length);
  console.table(accounts);
} finally {
  await db.close?.();
}

