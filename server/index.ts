import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongoDB } from './mongodb.js';
import branchesMongoRouter from './routes/branches-mongo.js';
import studentsMongoRouter from './routes/students-mongo.js';
import studentProgressRouter from './routes/student-progress.js';
import progressMongoRouter from './routes/progress-mongo.js';
import paymentsMongoRouter from './routes/payments-mongo.js';
import authRouter from './routes/auth.js';
import { startPaymentScheduler } from './utils/paymentScheduler.js';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createServer() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Static files - faqat production uchun
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.join(__dirname, '../spa');
  
  if (isProduction) {
    console.log('📁 Static files serve qilinmoqda:', distPath);
    app.use(express.static(distPath));
  } else {
    console.log('🔧 Dev rejim - static files Vite tomonidan serve qilinadi');
  }

  // Connect to MongoDB (Faqat MongoDB ishlatamiz) - await qilish
  await connectMongoDB();

  // To'lov scheduler'ni ishga tushirish
  startPaymentScheduler();

  // MongoDB ulanishini tekshirish va qayta ulanish middleware
  app.use(async (req, res, next) => {
    // Auth endpoint'lari uchun MongoDB shart emas
    if (req.path.startsWith('/api/auth')) {
      return next();
    }

    // Agar MongoDB ulanmagan bo'lsa, qayta urinish
    if (mongoose.connection.readyState !== 1) {
      try {
        await connectMongoDB();
      } catch (error) {
        // Xatolik bo'lsa ham davom etish (server ishlashi kerak)
        console.warn('⚠️  MongoDB qayta ulanishda xatolik');
      }
    }
    next();
  });

  // Routes - Faqat MongoDB
  app.use('/api/auth', authRouter);
  app.use('/api/branches', branchesMongoRouter); // MongoDB branches
  app.use('/api/branches-mongo', branchesMongoRouter); // Backward compatibility
  app.use('/api/students', studentsMongoRouter); // MongoDB students
  app.use('/api/students-mongo', studentsMongoRouter); // Backward compatibility
  app.use('/api/student-progress', studentProgressRouter);
  app.use('/api/progress', progressMongoRouter); // MongoDB progress
  app.use('/api/progress-mongo', progressMongoRouter); // Backward compatibility
  app.use('/api/payments', paymentsMongoRouter); // MongoDB payments

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // SPA fallback - faqat production uchun
  if (isProduction) {
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('❌ index.html topilmadi:', indexPath);
          res.status(500).send('index.html topilmadi. Build qiling: npm run build');
        }
      });
    });
  }

  return app;
}

