import { Router } from 'express';
import { StudentProgress, Student } from '../mongodb.js';
import { authenticateToken } from './auth.js';

const router = Router();

// Barcha progress ma'lumotlarini olish (faqat studentprogresses collection'dan)
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    console.log('📊 Progress ma\'lumotlarini olish...');

    // MongoDB ulanishini tekshirish
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB ulanmagan. Bo\'sh ma\'lumot qaytarilmoqda.');
      return res.json([]);
    }

    // To'g'ridan-to'g'ri collection'dan ma'lumot olish (faqat bitta collection)
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('⚠️  Database ulanmagan. Bo\'sh ma\'lumot qaytarilmoqda.');
      return res.json([]);
    }
    const collection = db.collection('studentprogresses');

    // Query yaratish - faqat studentprogresses collection'dan
    let query: any = {};

    // Branch manager uchun - avval studentIds ni olish (lekin bu bitta query)
    if (req.user.role === 'branch_manager') {
      // Faqat bitta collection'dan - Student collection'dan studentIds olish
      const studentIds = await Student.find({ branch_id: req.user.branch_id })
        .select('_id')
        .lean()
        .then(students => students.map((s: any) => s._id.toString()));
      
      if (studentIds.length > 0) {
        query.studentId = { $in: studentIds };
      } else {
        // Agar studentIds bo'sh bo'lsa, bo'sh natija qaytarish
        return res.json([]);
      }
    }

    // Faqat studentprogresses collection'dan ma'lumot olish
    const progressData = await collection
      .find(query)
      .sort({ completedAt: -1, createdAt: -1 })
      .limit(1000)
      .toArray();

    console.log(`✅ ${progressData.length} ta progress topildi`);

    const formattedProgress = progressData.map((progress: any) => ({
      ...progress,
      id: progress._id.toString(),
      student_id: progress.studentId, // studentId ni student_id ga mapping
      step: progress.stepNumber, // stepNumber ni step ga mapping
      date: progress.completedAt || progress.createdAt || new Date(), // Sana
      score: progress.score || 0,
      note: progress.stepTitle || ''
    }));

    res.json(formattedProgress);
  } catch (error: any) {
    console.error('❌ Error fetching progress:', error.message);

    // Agar MongoDB ulanmasa yoki xatolik bo'lsa, bo'sh array qaytarish
    if (error.name === 'MongoServerSelectionError' ||
      error.name === 'MongoNetworkError' ||
      error.message.includes('Client must be connected')) {
      console.warn('⚠️  MongoDB ulanish xatoligi. Bo\'sh ma\'lumot qaytarilmoqda.');
      return res.json([]);
    }

    // Boshqa xatoliklar uchun ham bo'sh array qaytarish
    console.warn('⚠️  Xatolik yuz berdi. Bo\'sh ma\'lumot qaytarilmoqda.');
    return res.json([]);
  }
});

// Ball belgilash
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    // MongoDB ulanishini tekshirish
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB ulanmagan. Ball belgilash mumkin emas.');
      return res.status(503).json({ error: 'MongoDB ulanmagan. Iltimos, qayta urinib ko\'ring.' });
    }

    const { student_id, score, date, step, note } = req.body;

    if (!student_id || !score || !date) {
      return res.status(400).json({ error: 'Student ID, score, and date are required' });
    }

    if (score < 0) {
      return res.status(400).json({ error: 'Ball manfiy bo\'lishi mumkin emas' });
    }

    // O'quvchi mavjudligini tekshirish
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Ruxsat tekshirish
    if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
      return res.status(403).json({ error: 'Bu o\'quvchiga ball berishga ruxsat yo\'q' });
    }

    // Progress yaratish
    const progress = new StudentProgress({
      studentId: student_id, // studentId maydonini to'g'ri ishlatish
      score,
      completedAt: date,
      stepNumber: step,
      stepTitle: note
    });

    await progress.save();

    // O'quvchining totalBall va step ni to'g'ridan-to'g'ri yangilash
    // Frontend'dan kelgan qiymatlar to'g'ridan-to'g'ri saqlanadi
    await Student.findByIdAndUpdate(student_id, {
      totalBall: score,
      step: step || student.step || 0,
      updated_at: new Date()
    });

    res.status(201).json({
      ...progress.toObject(),
      id: progress._id.toString()
    });
  } catch (error: any) {
    console.error('Error creating progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// O'quvchining progress tarixini olish
router.get('/student/:studentId', authenticateToken, async (req: any, res) => {
  try {
    // MongoDB ulanishini tekshirish
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB ulanmagan. Bo\'sh ma\'lumot qaytarilmoqda.');
      return res.json([]);
    }

    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Ruxsat tekshirish
    if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
      return res.status(403).json({ error: 'Bu o\'quvchining ma\'lumotlariga ruxsat yo\'q' });
    }

    const progressData = await StudentProgress.find({ studentId: studentId })
      .sort({ completedAt: -1, createdAt: -1 });

    const formattedProgress = progressData.map(progress => ({
      ...progress.toObject(),
      id: progress._id.toString()
    }));

    res.json(formattedProgress);
  } catch (error: any) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// O'quvchilarning foiz ma'lumotlarini olish
router.get('/students', authenticateToken, async (req: any, res) => {
  try {
    // MongoDB ulanishini tekshirish
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB ulanmagan. Bo\'sh ma\'lumot qaytarilmoqda.');
      return res.json([]);
    }

    let query: any = {};

    // Branch manager faqat o'z filialidagi o'quvchilarni ko'radi
    if (req.user.role === 'branch_manager') {
      query.branch_id = req.user.branch_id;
    } else if (req.query.branch_id) {
      query.branch_id = req.query.branch_id;
    }

    // Faqat students collection'dan aggregation bilan (bitta collection)
    const students = await Student.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'branches',
          localField: 'branch_id',
          foreignField: '_id',
          as: 'branch_info'
        }
      },
      {
        $addFields: {
          branch_id_obj: { $arrayElemAt: ['$branch_info', 0] }
        }
      },
      {
        $project: {
          branch_info: 0
        }
      },
      { $sort: { step: -1 } }
    ]);

    const studentsWithPercentage = students.map((student: any) => {
      const joinDate = new Date(student.joinDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - joinDate.getTime());
      const daysSinceJoin = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const percentage = daysSinceJoin > 0 ? Math.round((student.step * 100) / daysSinceJoin) : 0;

      return {
        student_id: student._id.toString(),
        student_name: student.name,
        phone: student.phone,
        role: student.role,
        branch_id: student.branch_id ? (typeof student.branch_id === 'object' ? student.branch_id.toString() : student.branch_id) : null,
        branch_name: student.branch_id_obj ? student.branch_id_obj.name : null,
        total_ball: student.totalBall || 0,
        step: student.step || 0,
        percentage,
        days_since_join: daysSinceJoin,
        joinDate: student.joinDate,
        is_blocked: student.is_blocked || false
      };
    });

    res.json(studentsWithPercentage);
  } catch (error: any) {
    console.error('Error fetching student percentages:', error);
    // MongoDB ulanmagan bo'lsa, bo'sh array qaytarish
    if (error.name === 'MongoServerSelectionError' ||
      error.name === 'MongoNetworkError' ||
      error.message.includes('Client must be connected')) {
      console.warn('⚠️  MongoDB ulanish xatoligi. Bo\'sh ma\'lumot qaytarilmoqda.');
      return res.json([]);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Progress statistikasi (Dashboard uchun)
router.get('/stats', authenticateToken, async (req: any, res) => {
  try {
    // MongoDB ulanishini tekshirish
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB ulanmagan. Bo\'sh statistika qaytarilmoqda.');
      return res.json({
        total_students: 0,
        avg_percentage: 0,
        excellent_students: 0,
        blocked_students: 0,
        total_points: 0,
        total_steps: 0,
        new_students_30d: 0,
        growth_percentage: 0
      });
    }

    let query: any = {};

    // Branch manager faqat o'z filialidagi o'quvchilarni ko'radi
    if (req.user.role !== 'super_admin') {
      query.branch_id = req.user.branch_id;
    }

    const students = await Student.find(query).lean();

    // Statistikalarni hisoblash
    let totalStudents = students.length;
    let totalPercentage = 0;
    let excellentCount = 0;
    let blockedCount = 0;
    let totalPoints = 0;
    let totalSteps = 0;

    // Oxirgi 30 kunda qo'shilgan o'quvchilar
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    let newStudents30d = 0;

    students.forEach((student: any) => {
      const joinDate = new Date(student.joinDate);
      const createdAt = student.created_at ? new Date(student.created_at) : joinDate;
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - joinDate.getTime());
      const daysSinceJoin = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const percentage = daysSinceJoin > 0 ? (student.step * 100) / daysSinceJoin : 0;

      totalPercentage += percentage;
      totalPoints += student.totalBall || 0;
      totalSteps += student.step || 0;

      if (percentage >= 80) {
        excellentCount++;
      }
      if (percentage < 50) {
        blockedCount++;
      }

      // Yangi o'quvchilarni hisoblash
      if (createdAt >= thirtyDaysAgo) {
        newStudents30d++;
      }
    });

    const avgPercentage = totalStudents > 0 ? totalPercentage / totalStudents : 0;
    
    // O'sish foizini hisoblash
    const oldCount = totalStudents - newStudents30d;
    const growthPercentage = oldCount > 0 ? Math.round((newStudents30d / oldCount) * 100) : (newStudents30d > 0 ? 100 : 0);

    res.json({
      total_students: totalStudents,
      avg_percentage: Math.round(avgPercentage * 100) / 100,
      excellent_students: excellentCount,
      blocked_students: blockedCount,
      total_points: totalPoints,
      total_steps: totalSteps,
      new_students_30d: newStudents30d,
      growth_percentage: growthPercentage
    });
  } catch (error: any) {
    console.error('Error fetching progress stats:', error);
    // MongoDB ulanmagan bo'lsa, bo'sh statistika qaytarish
    if (error.name === 'MongoServerSelectionError' ||
      error.name === 'MongoNetworkError' ||
      error.message.includes('Client must be connected')) {
      console.warn('⚠️  MongoDB ulanish xatoligi. Bo\'sh statistika qaytarilmoqda.');
      return res.json({
        total_students: 0,
        avg_percentage: 0,
        excellent_students: 0,
        blocked_students: 0,
        total_points: 0,
        total_steps: 0,
        new_students_30d: 0,
        growth_percentage: 0
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
