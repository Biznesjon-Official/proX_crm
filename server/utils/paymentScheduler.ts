import cron from 'node-cron';
import { Student } from '../mongodb.js';

// Har oy 1-sanasida barcha o'quvchilarni "to'lanmagan" qilish
export function startPaymentScheduler() {
  console.log('💰 To\'lov scheduler ishga tushirildi');

  // Har oy 1-sanasida soat 00:01 da ishga tushadi
  cron.schedule('1 0 1 * *', async () => {
    try {
      console.log('📅 Yangi oy boshlandi - barcha o\'quvchilar to\'lanmagan qilinmoqda...');
      
      const today = new Date();
      const paymentDeadline = new Date(today.getFullYear(), today.getMonth(), 10, 23, 59, 59); // 10-sanasi oxiri
      
      // Barcha o'quvchilarni "to'lanmagan" qilish
      const result = await Student.updateMany(
        { role: 'Student Offline' }, // Faqat offline o'quvchilar
        {
          $set: {
            current_month_payment: 'unpaid',
            payment_deadline: paymentDeadline,
            payment_warning_shown: false,
            is_blocked: false, // Yangi oyda blokni olib tashlash
            updated_at: new Date()
          }
        }
      );
      
      console.log(`✅ ${result.modifiedCount} ta o'quvchi yangi oy uchun to'lanmagan qilindi`);
    } catch (error: any) {
      console.error('❌ To\'lov scheduler xatoligi:', error.message);
    }
  });

  // Har oy 11-sanasida soat 00:01 da to'lamagan o'quvchilarni bloklash
  cron.schedule('1 0 11 * *', async () => {
    try {
      console.log('🚫 To\'lov muddati o\'tdi - to\'lamagan o\'quvchilar bloklanmoqda...');
      
      // To'lamagan o'quvchilarni bloklash
      const result = await Student.updateMany(
        { 
          role: 'Student Offline',
          current_month_payment: 'unpaid'
        },
        {
          $set: {
            is_blocked: true,
            blocked_at: new Date(),
            updated_at: new Date()
          }
        }
      );
      
      console.log(`🚫 ${result.modifiedCount} ta o'quvchi to'lov qilmaganligi sababli bloklandi`);
    } catch (error: any) {
      console.error('❌ Bloklash scheduler xatoligi:', error.message);
    }
  });

  // Test uchun - har daqiqada tekshirish (development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Development rejimida test scheduler ishga tushirildi');
    
    // Har 5 daqiqada test
    cron.schedule('*/5 * * * *', async () => {
      try {
        const today = new Date();
        const currentDay = today.getDate();
        
        console.log(`🧪 Test: Bugun ${currentDay}-sana`);
        
        // Agar 1-10 sanalar orasida bo'lsa
        if (currentDay >= 1 && currentDay <= 10) {
          console.log('💰 To\'lov davri: 1-10 sanalar');
        } else {
          console.log('🚫 To\'lov muddati o\'tgan: 10-sanadan keyin');
        }
      } catch (error: any) {
        console.error('❌ Test scheduler xatoligi:', error.message);
      }
    });
  }
}

// To'lov holatini tekshirish funksiyasi
export async function checkPaymentStatus(studentId: string) {
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return { canAccess: false, message: 'O\'quvchi topilmadi' };
    }

    const today = new Date();
    const currentDay = today.getDate();
    
    // Agar to'lagan bo'lsa, ruxsat berish
    if (student.current_month_payment === 'paid') {
      return { canAccess: true, message: 'To\'lov qilingan' };
    }
    
    // Agar 1-10 sanalar orasida bo'lsa va to'lamagan bo'lsa
    if (currentDay >= 1 && currentDay <= 10) {
      return { 
        canAccess: true, 
        message: 'To\'lov davri. 10-sanagacha to\'lov qiling!',
        warning: true 
      };
    }
    
    // Agar 10-sanadan keyin bo'lsa va to'lamagan bo'lsa
    return { 
      canAccess: false, 
      message: 'To\'lov muddati o\'tdi! To\'lov qilmaguningizcha foizlaringizni ko\'ra olmaysiz.',
      blocked: true 
    };
  } catch (error: any) {
    console.error('❌ To\'lov holati tekshirish xatoligi:', error.message);
    return { canAccess: false, message: 'Xatolik yuz berdi' };
  }
}

// To'lov qilish funksiyasi
export async function markAsPaid(studentId: string) {
  try {
    const result = await Student.findByIdAndUpdate(
      studentId,
      {
        $set: {
          current_month_payment: 'paid',
          last_payment_date: new Date(),
          is_blocked: false,
          blocked_at: null,
          payment_warning_shown: false,
          updated_at: new Date()
        }
      },
      { new: true }
    );
    
    return { success: true, student: result };
  } catch (error: any) {
    console.error('❌ To\'lov belgilash xatoligi:', error.message);
    return { success: false, message: error.message };
  }
}

// To'lov holatini qaytarish funksiyasi
export async function markAsUnpaid(studentId: string) {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    
    // Agar 10-sanadan keyin bo'lsa, avtomatik bloklash
    const shouldBlock = currentDay > 10;
    
    const result = await Student.findByIdAndUpdate(
      studentId,
      {
        $set: {
          current_month_payment: 'unpaid',
          is_blocked: shouldBlock,
          blocked_at: shouldBlock ? new Date() : null,
          updated_at: new Date()
        }
      },
      { new: true }
    );
    
    return { success: true, student: result, blocked: shouldBlock };
  } catch (error: any) {
    console.error('❌ To\'lov qaytarish xatoligi:', error.message);
    return { success: false, message: error.message };
  }
}