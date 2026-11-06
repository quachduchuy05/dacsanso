import './server/register.mjs';

const {configuration} = await import('./server/config.mjs');
const {openDatabase} = await import('./server/postgres-database.mjs');
const {hashPassword} = await import('./server/passwords.mjs');

const ids = [
  'u-ad-root',
  'u-ad-vh',
  'u-ad-cl',
  'u-ad-cskh',
  'u-ad-tc',
  'u-htx-bacha',
  'u-htx-mk',
  'u-htx-suoigiang',
  'u-htx-sapa',
  'u-htx-baoha',
  'u-htx-tule',
  'u-htx-thacba'
];

const password = process.env.BULK_TEST_PASSWORD;

if (!password) {
  throw new Error('Chua nhap mat khau thu nghiem.');
}

const db = await openDatabase(configuration());

try {
  const users = (await db.read()).state.users;

  for (const id of ids) {
    const user = users.find(u => u.id === id);

    if (!user ||
        !['admin', 'coop'].includes(user.role) ||
        user.status !== 'active') {
      throw new Error('Tai khoan khong hop le: ' + id);
    }
  }

  const passwordHash = await hashPassword(password);

  await db.transaction(async () => {
    for (const id of ids) {
      await db.sql.prepare(
        `INSERT INTO password_credentials(user_id,password_hash)
         VALUES(?,?)
         ON CONFLICT(user_id)
         DO UPDATE SET password_hash=excluded.password_hash`
      ).run(id, passwordHash);

      await db.sql.prepare(
        'DELETE FROM sessions WHERE user_id=?'
      ).run(id);

      await db.sql.prepare(
        'DELETE FROM account_links WHERE user_id=?'
      ).run(id);
    }
  });

  console.log('DA CAP NHAT MAT KHAU CHO 12 TAI KHOAN!');
  console.log('5 Admin + 7 HTX');
} finally {
  await db.close?.();
}
