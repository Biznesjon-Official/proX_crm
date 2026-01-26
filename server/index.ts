import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import { connectMongoDB } from './mongodb.js';
import branchesMongoRouter from './routes/branches-mongo.js';
import studentsMongoRouter from './routes/students-mongo.js';
import studentProgressRouter from './routes/student-progress.js';
import progressMongoRouter from './routes/progress-mongo.js';
import paymentsMongoRouter from './routes/payments-mongo.js';
import authRouter from './routes/auth.js';
// import backupRouter from './routes/backup.js'; // TODO: Fix export issue
import examResultsRouter from './routes/exam-results.js';
import { startPaymentScheduler } from './utils/paymentScheduler.js';
import { scheduleBackups } from './utils/backup.js';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createServer() {
  const app = express();

  // Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Vite dev server uchun
    crossOriginEmbedderPolicy: false
  }));

  // CORS Configuration
  const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:5173', 'http://localhost:3000'];
  
  app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('CORS policy: Origin not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body Parser with size limit (DoS protection)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

  // Backup scheduler'ni ishga tushirish
  scheduleBackups();

  // MongoDB ulanishini tekshirish va qayta ulanish middleware
  app.use(async (req, _res, next) => {
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
  app.use('/api/exam-results', examResultsRouter); // Exam results
  // app.use('/api/backup', backupRouter); // Backup system - TODO: Fix export issue

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

