import { Router } from 'express';
import { Student, Payment } from '../mongodb.js';
import { authenticateToken, requireBranchManagerOrSuperAdmin } from './auth.js';
import mongoose from 'mongoose';

const router = Router();

// Get upcoming payments (students who need to pay this month)
router.get('/upcoming', authenticateToken, async (req: any, res) => {
  try {
    console.log('📊 Upcoming payments so\'rovi (MongoDB)...');

    // MongoDB ulanishini tekshirish
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB ulanmagan');
      return res.json([]);
    }

    // Query yaratish - faqat Student Offline va Mentor emas
    let query: any = {
      role: { $ne: 'Mentor' } // Mentorlarni chiqarib tashlash
    };

    if (req.user.role !== 'super_admin') {
      query.branch_id = req.user.branch_id;
    }

    const students = await Student.find(query)
      .populate('branch_id', 'name')
      .sort({ name: 1 })
      .lean();

    console.log(`✅ ${students.length} ta student topildi`);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Har bir student uchun joriy oy payment holatini tekshirish
    const studentsWithStatus = await Promise.all(
      students.map(async (student: any) => {
        // Keyingi to'lov sanasini hisoblash
        let nextPaymentDate: Date | null = null;
        if (student.joinDate) {
          const joinDate = new Date(student.joinDate);
          const joinDay = joinDate.getDate();

          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();

          // Joriy oyda to'lov sanasi
          nextPaymentDate = new Date(currentYear, currentMonth, joinDay);

          // Agar bu sana o'tgan bo'lsa, keyingi oyga o'tkazamiz
          if (nextPaymentDate < now) {
            nextPaymentDate = new Date(currentYear, currentMonth + 1, joinDay);
          }
        }

        // Joriy oy uchun so'nggi paymentni olish
        const latestPayment: any = await Payment.findOne({
          student_id: student._id.toString(),
          payment_date: { $gte: monthStart, $lt: monthEnd }
        })
          .sort({ created_at: -1 })
          .lean();

        // To'lov sanasi 1 kun o'tgan va to'lanmagan bo'lsa - avtomatik bloklash
        if (nextPaymentDate && !latestPayment) {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(23, 59, 59, 999);
          
          // Agar to'lov sanasi kecha yoki undan oldin bo'lsa va hali bloklanmagan bo'lsa
          if (nextPaymentDate <= yesterday && !student.is_blocked) {
            await Student.findByIdAndUpdate(student._id, { is_blocked: true });
            console.log(`⚠️ O'quvchi avtomatik bloklandi: ${student.name} (to'lov sanasi o'tgan)`);
          }
        }

        return {
          student_id: student._id.toString(),
          student_name: student.name,
          phone: student.phone,
          monthly_fee: student.monthly_fee || 0,
          joinDate: student.joinDate,
          branch_name: student.branch_id ? (student.branch_id as any).name : 'Filialsiz',
          branch_id: student.branch_id ? (student.branch_id as any)._id?.toString() : null,
          next_payment_date: nextPaymentDate
            ? nextPaymentDate.toISOString().split('T')[0]
            : null,
          payment_status: (latestPayment?.status as any) || 'unpaid',
          paid_amount: latestPayment?.amount || 0,
          payment_id: latestPayment?._id?.toString() || null
        };
      })
    );

    res.json(studentsWithStatus);
  } catch (error: any) {
    console.error('❌ Error fetching upcoming payments (MongoDB):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create payment record
router.post('/', authenticateToken, requireBranchManagerOrSuperAdmin, async (req: any, res) => {
  try {
    const { student_id, amount, expected_amount, payment_date, status, note } = req.body;

    console.log('Payment creation request (MongoDB):', req.body);

    // Validation with detailed error messages
    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }
    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'amount is required' });
    }
    if (expected_amount === undefined || expected_amount === null) {
      return res.status(400).json({ error: 'expected_amount is required' });
    }
    if (!payment_date) {
      return res.status(400).json({ error: 'payment_date is required' });
    }
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    // Check student exists and user has permission
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
      return res.status(403).json({ error: 'No permission' });
    }

    const payment = new Payment({
      student_id,
      amount,
      expected_amount,
      payment_date: new Date(payment_date),
      status,
      note: note || null
    });

    await payment.save();

    res.status(201).json({
      ...payment.toObject(),
      id: payment._id.toString()
    });
  } catch (error: any) {
    console.error('Error creating payment (MongoDB):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment
router.put('/:id', authenticateToken, requireBranchManagerOrSuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { amount, expected_amount, status, note } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check permission
    const student = await Student.findById(payment.student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
      return res.status(403).json({ error: 'No permission' });
    }

    payment.amount = amount;
    payment.expected_amount = expected_amount;
    payment.status = status;
    payment.note = note || null;
    payment.updated_at = new Date();

    await payment.save();

    res.json({
      ...payment.toObject(),
      id: payment._id.toString()
    });
  } catch (error: any) {
    console.error('Error updating payment (MongoDB):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete payment
router.delete('/:id', authenticateToken, requireBranchManagerOrSuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check permission
    const student = await Student.findById(payment.student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (req.user.role !== 'super_admin' && req.user.branch_id !== student.branch_id?.toString()) {
      return res.status(403).json({ error: 'No permission' });
    }

    await payment.deleteOne();

    res.json({ message: 'Payment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting payment (MongoDB):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
