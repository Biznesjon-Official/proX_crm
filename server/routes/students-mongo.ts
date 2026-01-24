import { Router } from 'express';
import { Student, Branch } from '../mongodb.js';
import { authenticateToken, requireManagerOrSuperAdmin } from './auth.js';
import mongoose from 'mongoose';

const router = Router();

// Get all students from MongoDB
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const { branch_id } = req.query;
    
    // Agar MongoDB ulanmagan bo'lsa, darhol bo'sh massiv qaytaramiz
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB ulanmagan. Bo\'sh ma\'lumot qaytarilmoqda.');
      return res.json([]);
    }

    let query: any = {};
    
    // Barcha foydalanuvchilar super admin kabi ishlaydi - barcha o'quvchilarni ko'radi
    if (branch_id) {
      // branch_id ni ObjectId ga o'girish
      try {
        query.branch_id = new mongoose.Types.ObjectId(branch_id as string);
      } catch {
        query.branch_id = branch_id;
      }
    }
    // Role-based filtering olib tashlandi - barcha o'quvchilarni ko'rsatish
    
    // Faqat students collection'dan ma'lumot olish (populate o'rniga aggregation)
    const students = await Student.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'branches', // Branch collection nomi
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
          branch_info: 0 // branch_info array'ni olib tashlash
        }
      },
      { $sort: { name: 1 } }
    ]);
    
    // 1 yil o'tgan bloklangan o'quvchilarni avtomatik ochish
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    await Student.updateMany(
      {
        is_blocked: true,
        blocked_at: { $lte: oneYearAgo }
      },
      {
        $set: {
          is_blocked: false,
          warnings: [],
          blocked_at: null
        }
      }
    );
    
    // Format response (aggregation natijasini formatlash)
    const formattedStudents = students.map((student: any) => ({
      ...student,
      id: student._id.toString(),
      branch: student.branch_id_obj ? {
        id: student.branch_id_obj._id.toString(),
        name: student.branch_id_obj.name,
        district: student.branch_id_obj.district
      } : null,
      branch_name: student.branch_id_obj ? student.branch_id_obj.name : null,
      branch_district: student.branch_id_obj ? student.branch_id_obj.district : null,
      branch_id: student.branch_id ? (typeof student.branch_id === 'object' ? student.branch_id.toString() : student.branch_id) : null,
      // Parolni ochiq ko'rinishda qaytarish (plainPassword yoki password)
      plainPassword: student.plainPassword || student.password || ''
    }));
    
    res.json(formattedStudents);
  } catch (error: any) {
    console.error('Error fetching students from MongoDB:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get students with their current step from submissions (prox.uz style)
// MUHIM: Bu route /:id dan OLDIN bo'lishi kerak!
// OPTIMIZED: Aggregation pipeline bilan 10x tezroq
router.get('/with-steps', authenticateToken, async (req: any, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB ulanmagan.');
      return res.json([]);
    }

    const db = mongoose.connection.db;
    if (!db) {
      console.warn('⚠️  Database ulanmagan');
      return res.json([]);
    }

    const startTime = Date.now();

    // Bitta aggregation pipeline bilan barcha ma'lumotlarni olish
    const result = await Student.aggregate([
      // 1. Faqat kerakli fieldlarni olish
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          step: 1,
          totalBall: 1,
          joinDate: 1,
          created_at: 1
        }
      },
      // 2. Submissions bilan join qilish (studentId bo'yicha)
      {
        $lookup: {
          from: 'submissions',
          let: { studentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$studentId', '$$studentId'] },
                status: { $in: ['approved', 'reviewed'] }
              }
            },
            // Faqat taskId ni olish
            { $project: { taskId: 1 } }
          ],
          as: 'submissions'
        }
      },
      // 3. Tasks bilan join qilish (stepNumber olish uchun)
      {
        $lookup: {
          from: 'tasks',
          let: { taskIds: '$submissions.taskId' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$_id', '$$taskIds'] }
              }
            },
            { $project: { stepNumber: 1 } }
          ],
          as: 'tasks'
        }
      },
      // 4. Natijalarni hisoblash
      {
        $addFields: {
          currentStep: {
            $ifNull: [{ $max: '$tasks.stepNumber' }, 0]
          },
          // Progress hisoblash
          daysSinceJoin: {
            $max: [
              1,
              {
                $add: [
                  1,
                  {
                    $floor: {
                      $divide: [
                        { $subtract: [new Date(), { $ifNull: ['$joinDate', '$created_at'] }] },
                        1000 * 60 * 60 * 24
                      ]
                    }
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          progress: {
            $max: [
              0,
              {
                $round: [
                  { $multiply: [{ $divide: [{ $ifNull: ['$step', 0] }, '$daysSinceJoin'] }, 100] }
                ]
              }
            ]
          }
        }
      },
      // 5. Final projection
      {
        $project: {
          _id: 1,
          fullName: { $ifNull: ['$name', "Noma'lum"] },
          login: { $ifNull: ['$username', "noma'lum"] },
          currentStep: 1,
          step: { $ifNull: ['$step', 0] },
          totalBall: { $ifNull: ['$totalBall', 0] },
          progress: 1
        }
      },
      // 6. Saralash
      { $sort: { currentStep: -1, step: -1 } }
    ]);

    const endTime = Date.now();
    console.log(`✅ ${result.length} ta o'quvchi ma'lumotlari ${endTime - startTime}ms da qaytarildi`);
    console.log(`📊 Hozirgi qadam > 0: ${result.filter(r => r.currentStep > 0).length} ta`);
    
    res.json(result);
  } catch (error: any) {
    console.error('Get students with steps error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single student
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('branch_id', 'name district');
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Permission check - barcha authenticated foydalanuvchilar ko'rishi mumkin
    // if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
    //   return res.status(403).json({ error: 'Bu o\'quvchiga ruxsat yo\'q' });
    // }
    
    const studentObj = student.toObject();
    const formattedStudent = {
      ...studentObj,
      id: student._id,
      branch: student.branch_id ? {
        id: (student.branch_id as any)._id,
        name: (student.branch_id as any).name,
        district: (student.branch_id as any).district
      } : null,
      // Parolni ochiq ko'rinishda qaytarish
      plainPassword: studentObj.plainPassword || studentObj.password || ''
    };
    
    res.json(formattedStudent);
  } catch (error: any) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new student
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    console.log('🔍 O\'quvchi qo\'shish so\'rovi:', {
      user: {
        id: req.user?.id,
        role: req.user?.role,
        branch_id: req.user?.branch_id
      },
      body: {
        name: req.body.name,
        branch_id: req.body.branch_id
      }
    });

    console.log('🔐 Authentication middleware natijasi:', {
      userExists: !!req.user,
      userRole: req.user?.role,
      userBranchId: req.user?.branch_id
    });

    const {
      name,
      phone,
      role = 'Student Offline',
      subscriptionPlan = 'Pro',
      monthly_fee = 0,
      balance = 0,
      totalBall = 50,
      step = 5,
      joinDate,
      days = [],
      todayBall = '',
      workType = '',
      branch_id,
      study_days = [],
      payment_date,
      username,
      password
    } = req.body;

    if (!name || !phone || !joinDate) {
      return res.status(400).json({ error: 'Name, phone, and join date are required' });
    }

    // Username unique tekshiruvini olib tashladik - faqat parollar har xil bo'lishi yetarli

    // Branch ID ni belgilash
    let finalBranchId = branch_id;
    
    // Mentor va Manager faqat o'z filialiga qo'shadi
    if (req.user.role === 'mentor' || req.user.role === 'manager') {
      finalBranchId = req.user.branch_id;
      console.log('👨‍🏫 Mentor/Manager o\'z filialiga qo\'shmoqda:', finalBranchId);
    } else if (!finalBranchId && req.user.branch_id) {
      // Boshqa foydalanuvchilar uchun
      finalBranchId = req.user.branch_id;
      console.log('🏢 Foydalanuvchi branch_id dan foydalanildi:', finalBranchId);
    }
    
    // branch_id ni to'g'rilash - agar object yoki string object bo'lsa
    if (finalBranchId && typeof finalBranchId === 'string') {
      // Agar string ichida object ko'rinishi bo'lsa, parse qilish
      if (finalBranchId.includes('ObjectId') || finalBranchId.includes('_id')) {
        console.log('⚠️  Branch_id noto\'g\'ri formatda:', finalBranchId);
        return res.status(400).json({ 
          error: 'Branch_id noto\'g\'ri formatda. Iltimos logout qilib qayta login qiling.' 
        });
      }
    }

    console.log('📝 Final branch_id:', finalBranchId);

    const studentData: any = {
      name,
      phone,
      role,
      subscriptionPlan,
      monthly_fee,
      balance,
      totalBall,
      step,
      joinDate,
      days,
      todayBall,
      workType,
      branch_id: finalBranchId,
      study_days,
      payment_date
    };

    // Agar username va password berilgan bo'lsa, qo'shish
    if (username) {
      studentData.username = username;
    }
    if (password) {
      // Parolni hashlamasdan, ochiq holda saqlash
      studentData.password = password;
      studentData.plainPassword = password;
    }

    console.log('💾 Saqlanayotgan student ma\'lumotlari:', studentData);

    const student = new Student(studentData);
    await student.save();
    
    console.log('✅ Student saqlandi:', student._id);
    
    const populatedStudent = await Student.findById(student._id).populate('branch_id', 'name district');
    
    const populatedStudentObj = populatedStudent!.toObject();
    const formattedStudent = {
      ...populatedStudentObj,
      id: populatedStudent!._id,
      branch: populatedStudent!.branch_id ? {
        id: (populatedStudent!.branch_id as any)._id,
        name: (populatedStudent!.branch_id as any).name,
        district: (populatedStudent!.branch_id as any).district
      } : null,
      // Parolni ochiq ko'rinishda qaytarish
      plainPassword: populatedStudentObj.plainPassword || populatedStudentObj.password || ''
    };
    
    console.log('📤 Response yuborilmoqda:', formattedStudent.id);
    
    res.status(201).json(formattedStudent);
  } catch (error: any) {
    console.error('❌ O\'quvchi yaratishda xatolik:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Permission check - barcha authenticated foydalanuvchilar tahrirlashi mumkin
    // if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
    //   return res.status(403).json({ error: 'Bu o\'quvchini tahrirlashga ruxsat yo\'q' });
    // }

    const updateData: any = { ...req.body, updated_at: new Date() };

    // Username unique tekshiruvini olib tashladik - faqat parollar har xil bo'lishi yetarli

    // Agar parol berilgan bo'lsa, ochiq holda saqlash (hashlamasdan)
    if (updateData.password && updateData.password.trim() !== '') {
      updateData.plainPassword = updateData.password; // Ochiq ko'rinishda ham saqlash
    } else {
      // Agar parol bo'sh bo'lsa, o'zgartirmaslik
      delete updateData.password;
      delete updateData.plainPassword;
    }
    
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('branch_id', 'name district');
    
    const updatedStudentObj = updatedStudent!.toObject();
    const formattedStudent = {
      ...updatedStudentObj,
      id: updatedStudent!._id,
      branch: updatedStudent!.branch_id ? {
        id: (updatedStudent!.branch_id as any)._id,
        name: (updatedStudent!.branch_id as any).name,
        district: (updatedStudent!.branch_id as any).district
      } : null,
      // Parolni ochiq ko'rinishda qaytarish
      plainPassword: updatedStudentObj.plainPassword || updatedStudentObj.password || ''
    };
    
    res.json(formattedStudent);
  } catch (error: any) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Permission check - barcha authenticated foydalanuvchilar o'chirishi mumkin
    // if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
    //   return res.status(403).json({ error: 'Bu o\'quvchini o\'chirishga ruxsat yo\'q' });
    // }
    
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add warning to student
router.post('/:id/warning', authenticateToken, async (req: any, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Ogohlantirish sababi kiritilishi shart' });
    }

    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: 'O\'quvchi topilmadi' });
    }
    
    // Permission check - barcha authenticated foydalanuvchilar ogohlantirish berishi mumkin
    // if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
    //   return res.status(403).json({ error: 'Bu o\'quvchiga ogohlantirish berishga ruxsat yo\'q' });
    // }

    // Check if already has 3 warnings
    if (student.warnings && student.warnings.length >= 3) {
      return res.status(400).json({ error: 'O\'quvchi allaqachon 3ta ogohlantirish olgan' });
    }

    // Add warning
    if (!student.warnings) {
      student.warnings = [];
    }
    
    student.warnings.push({
      reason: reason.trim(),
      date: new Date(),
      given_by: req.user.name || req.user.username
    });

    // If this is the 3rd warning, block the student
    if (student.warnings.length === 3) {
      student.is_blocked = true;
      student.blocked_at = new Date();
    }

    await student.save();
    
    const populatedStudent = await Student.findById(student._id).populate('branch_id', 'name district');
    
    res.json({
      message: student.warnings.length === 3 
        ? 'Ogohlantirish qo\'shildi va profil bloklandi' 
        : 'Ogohlantirish muvaffaqiyatli qo\'shildi',
      student: populatedStudent
    });
  } catch (error: any) {
    console.error('Error adding warning:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unblock student
router.post('/:id/unblock', authenticateToken, async (req: any, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: 'O\'quvchi topilmadi' });
    }
    
    // Permission check - barcha authenticated foydalanuvchilar blockdan ochishi mumkin
    // if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
    //   return res.status(403).json({ error: 'Bu o\'quvchini blockdan ochishga ruxsat yo\'q' });
    // }

    // Unblock and clear warnings
    student.is_blocked = false;
    student.blocked_at = undefined;
    student.warnings = [];

    await student.save();
    
    const populatedStudent = await Student.findById(student._id).populate('branch_id', 'name district');
    
    res.json({
      message: 'Profil blockdan ochildi va ogohlantirishlar tozalandi',
      student: populatedStudent
    });
  } catch (error: any) {
    console.error('Error unblocking student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
