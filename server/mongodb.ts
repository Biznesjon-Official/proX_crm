import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Google DNS serverlarini ishlatish
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || '';

export async function connectMongoDB() {
  try {
    if (!MONGO_URI) {
      console.warn('⚠️  MongoDB URI topilmadi. MongoDB ishlatilmaydi.');
      return;
    }

    // Disconnect if already connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log('🔄 MongoDB ulanmoqda...');
    
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 2
    });
    console.log('✅ MongoDB ulandi');
  } catch (error: any) {
    console.error('❌ MongoDB ulanishda xatolik:', error.message);
    console.error('');
    console.error('🔧 Yechim:');
    console.error('   1. VPN yoqing (Psiphon, ProtonVPN)');
    console.error('   2. Mobile internet ishlatib ko\'ring (hotspot)');
    console.error('   3. Boshqa Wi-Fi tarmoqqa ulaning');
    console.error('   4. MongoDB Atlas Network Access sozlamalarini tekshiring');
    console.error('');
    console.error('⚠️  Server MongoDB\'siz davom etadi, lekin ma\'lumotlar bo\'sh bo\'ladi!');
    // Server to'xtamasin, faqat ogohlantirish
  }
}

// Branch Schema
const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  district: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  manager_name: String,
  manager_phone: String,
  branch_type: { type: String, enum: ['mentor', 'manager'], default: 'manager' }, // mentor yoki manager
  // Mentor (o'qituvchi) ma'lumotlari
  mentor_name: String,
  mentor_username: String,
  mentor_password: String, // Ochiq holda saqlash
  // Manager ma'lumotlari
  manager_user_name: String,
  manager_username: String,
  manager_user_password: String, // Ochiq holda saqlash
  student_count: { type: Number, default: 0 },
  last_login: { type: Date }, // Oxirgi kirish vaqti
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

branchSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema);

// Student Schema
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, default: 'Student Offline' },
  subscriptionPlan: { type: String, default: 'Pro' },
  monthly_fee: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  totalBall: { type: Number, default: 50 },
  step: { type: Number, default: 5 },
  joinDate: { type: Date, required: true },
  days: [String],
  todayBall: String,
  workType: String,
  branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  study_days: [String],
  payment_date: Date,
  username: { type: String, sparse: true }, // O'quvchi login (ixtiyoriy, unique emas)
  password: String, // O'quvchi paroli (ixtiyoriy)
  plainPassword: String, // Parolni ochiq ko'rinishda saqlash
  warnings: [{
    reason: String,
    date: { type: Date, default: Date.now },
    given_by: String // Kim ogohlantirish berdi
  }],
  is_blocked: { type: Boolean, default: false }, // Profil bloklangan yoki yo'q
  blocked_at: Date, // Qachon bloklangan
  // To'lov tizimi uchun yangi maydonlar
  current_month_payment: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' }, // Joriy oy to'lovi
  last_payment_date: Date, // Oxirgi to'lov sanasi
  payment_deadline: Date, // To'lov muddati (har oy 10-sanasi)
  payment_warning_shown: { type: Boolean, default: false }, // Ogohlantirish ko'rsatilganmi
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

studentSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

// User Schema (for authentication)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: String, // Parolni ochiq ko'rinishda saqlash
  role: { type: String, enum: ['super_admin', 'mentor', 'manager'], default: 'manager' },
  branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

userSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);

// Session Schema (for token storage)
const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now, expires: 86400 } // 24 hours
});

export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

// StudentProgress Schema (O'quvchilarning qadamlari tarixi)
const studentProgressSchema = new mongoose.Schema({
  studentId: { type: String, required: true }, // MongoDB'dagi studentId maydoni
  stepNumber: { type: Number }, // MongoDB'dagi stepNumber maydoni
  stepTitle: { type: String }, // Qadam nomi
  studentName: { type: String }, // O'quvchi ismi
  studentUsername: { type: String }, // O'quvchi username
  score: { type: Number }, // Ball
  percentage: { type: Number }, // Foiz
  completed: { type: Boolean }, // Bajarilganmi
  completedAt: { type: Date }, // Bajarilgan vaqt
  createdAt: { type: Date, default: Date.now }, // Yaratilgan vaqt
  updatedAt: { type: Date }, // Yangilangan vaqt
  totalQuestions: { type: Number }, // Jami savollar
  correctCount: { type: Number }, // To'g'ri javoblar
  answers: [mongoose.Schema.Types.Mixed], // Javoblar
  sectionNumber: { type: Number }, // Bo'lim raqami
  stars: { type: Number }, // Yulduzlar
  // Mentor ma'lumotlari (kim ball berdi)
  mentorId: { type: String }, // Mentor ID
  mentorUsername: { type: String }, // Mentor username
  mentorName: { type: String } // Mentor ismi
}, { 
  collection: 'studentprogresses', // Ko'plik shakli
  strict: false // MongoDB'dagi qo'shimcha maydonlarni ham qabul qilish
});

studentProgressSchema.index({ studentId: 1, completedAt: -1 }); // Tez qidiruv uchun

export const StudentProgress = mongoose.models.StudentProgress || mongoose.model('StudentProgress', studentProgressSchema);

// Payment Schema (To'lovlar tarixi)
const paymentSchema = new mongoose.Schema({
  student_id: { type: String, required: true }, // Student._id string ko'rinishida
  amount: { type: Number, required: true },
  expected_amount: { type: Number, required: true },
  payment_date: { type: Date, required: true },
  status: { type: String, enum: ['paid', 'partial', 'unpaid'], required: true },
  note: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

paymentSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);