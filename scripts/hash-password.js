// Usá este script para generar un hash bcrypt de tu contraseña de admin.
// Ejecutá: node scripts/hash-password.js tuPasswordAqui
// Luego copiá el resultado en ADMIN_PASSWORD en Railway.
const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/hash-password.js <password>');
  process.exit(1);
}
bcrypt.hash(password, 12).then(hash => {
  console.log('\nTu ADMIN_PASSWORD hasheada (copiá esto en Railway):\n');
  console.log(hash);
  console.log('');
});
