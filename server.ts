import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import app from './server/app';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🟢 MW Adventure Park Server Running`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`=======================================================`);
});