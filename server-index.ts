import { createServer } from './server/index.js';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const app = await createServer();
  const PORT = process.env.PORT || 8081;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();