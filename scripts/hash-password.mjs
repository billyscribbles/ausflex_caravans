// One-off: generate the ADMIN_PASSWORD_HASH value for Railway.
//   yarn node scripts/hash-password.mjs 'the-password'
// The plaintext never enters the repo — only the hash is stored, in Railway's
// environment variables.
import { hashPassword } from '../server/auth.js'

const password = process.argv[2]
if (!password) {
  console.error("Usage: yarn node scripts/hash-password.mjs '<password>'")
  process.exit(1)
}

console.log(await hashPassword(password))
