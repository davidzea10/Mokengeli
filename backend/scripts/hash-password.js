#!/usr/bin/env node
/**
 * Génère un hash bcrypt pour la colonne clients.password_hash.
 * Usage : node scripts/hash-password.js "votreMotDePasse"
 */
const bcrypt = require('bcryptjs');

const pwd = process.argv[2];
if (!pwd) {
  console.error('Usage: node scripts/hash-password.js <mot-de-passe>');
  process.exit(1);
}
console.log(bcrypt.hashSync(pwd, 12));
