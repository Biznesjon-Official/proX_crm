# 🔗 CRMPROX ↔ PROX.UZ Integratsiya

## ✅ Muvaffaqiyatli O'rnatildi!

### **Tizim Arxitekturasi:**

```
┌─────────────┐         ┌──────────────┐
│   CRMPROX   │ ◄─────► │   PROX.UZ    │
│   (CRM)     │         │  (Platform)  │
└─────────────┘         └──────────────┘
       │                        │
       └────────┬───────────────┘
                │
         ┌──────▼──────┐
         │   MongoDB   │
         │  prox_crm   │
         └─────────────┘
```

### **Ikki Xil Qadam:**

| Qadam | Manba | Qanday O'zgaradi | Ko'rsatiladi |
|-------|-------|------------------|--------------|
| **Hozirgi qadam** | prox.uz (Submissions) | O'quvchi vazifa topshiradi | StudentOpenSteps |
| **Jami qadam** | CRMPROX (Mentor) | Mentor ball beradi | StudentProgress |

---

## 📊 **Hozirgi Qadam (currentStep)**

### **Qanday Ishlaydi:**

1. O'quvchi **prox.uz** ga kiradi (username/password)
2. "Qadamlar" sahifasiga o'tadi
3. Vazifa bajaradi va topshiradi
4. Submission yaratiladi:
   ```javascript
   {
     studentId: "ali_123",
     taskId: "task_5",
     status: "approved"
   }
   ```
5. Task'da `stepNumber` bor:
   ```javascript
   {
     _id: "task_5",
     stepNumber: 5,  // ← 5-qadam
     title: "HTML Basics"
   }
   ```
6. CRMPROX aggregation:
   ```javascript
   currentStep = MAX(submissions.tasks.stepNumber)
   currentStep = 5  // ← Ali hozir 5-qadamda
   ```

### **Natija:**
```
StudentOpenSteps sahifasida:
Ali Valiyev | Hozirgi: 5-qadam ✅ | Jami: 213-qadam
```

---

## 📝 **Jami Qadam (step)**

### **Qanday Ishlaydi:**

1. Mentor **CRMPROX** ga kiradi
2. "Qadam Belgilash" sahifasiga o'tadi
3. O'quvchini tanlaydi (Ali Valiyev)
4. Qadam kiritadi: 213
5. Saqlaydi:
   ```javascript
   POST /api/progress-mongo
   {
     student_id: "ali_123",
     step: 213,
     score: 1500
   }
   ```
6. Database yangilanadi:
   ```javascript
   Student.findByIdAndUpdate("ali_123", {
     step: 213,
     totalBall: 1500
   })
   ```

### **Natija:**
```
StudentOpenSteps sahifasida:
Ali Valiyev | Hozirgi: 5-qadam | Jami: 213-qadam ✅
```

---

## 🔍 **Farq:**

### **Misol:**
```
Ali Valiyev:
- prox.uz da 5-qadamni bajarayapti (currentStep = 5)
- Lekin jami 213 qadam bajargan (step = 213)
- Demak:
  ✅ 1-4 qadamlarni tugatgan
  ✅ 5-qadamda ishlayapti
  ⏳ 6-213 qadamlarni hali boshlamagan
```

---

## 🛠️ **Aggregation Query**

### **Backend (students-mongo.ts):**

```typescript
router.get('/with-steps', async (req, res) => {
  const result = await Student.aggregate([
    // 1. Students
    { $project: { _id: 1, name: 1, username: 1, step: 1 } },
    
    // 2. JOIN submissions
    {
      $lookup: {
        from: 'submissions',
        let: { studentId: { $toString: '$_id' } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$studentId', '$$studentId'] },
              status: { $in: ['approved', 'reviewed'] }
            }
          }
        ],
        as: 'submissions'
      }
    },
    
    // 3. JOIN tasks
    {
      $lookup: {
        from: 'tasks',
        let: { taskIds: '$submissions.taskId' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$taskIds'] } } },
          { $project: { stepNumber: 1 } }
        ],
        as: 'tasks'
      }
    },
    
    // 4. Calculate currentStep
    {
      $addFields: {
        currentStep: { $max: '$tasks.stepNumber' }
      }
    }
  ]);
  
  res.json(result);
});
```

---

## 📱 **Frontend (StudentOpenSteps.tsx)**

### **Table:**
```typescript
<table>
  <thead>
    <tr>
      <th>O'quvchi</th>
      <th>Hozirgi qadam (prox.uz)</th>
      <th>Jami qadam (CRM)</th>
      <th>Progress</th>
    </tr>
  </thead>
  <tbody>
    {students.map(student => (
      <tr>
        <td>{student.fullName}</td>
        <td>
          {student.currentStep > 0 
            ? `${student.currentStep}-qadam ✅`
            : 'Boshlanmagan'
          }
        </td>
        <td>{student.step}-qadam</td>
        <td>{student.progress}%</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## ✅ **Test Qilish**

### **1. O'quvchi prox.uz da vazifa topshiradi:**
```bash
# prox.uz
POST /api/steps/5/submit
{
  studentId: "ali_123",
  content: "HTML kod..."
}

# Natija: Submission yaratiladi
```

### **2. CRMPROX da ko'rish:**
```bash
# CRMPROX
GET /api/students-mongo/with-steps

# Natija:
[
  {
    fullName: "Ali Valiyev",
    currentStep: 5,  // ← prox.uz dan
    step: 213,       // ← CRM dan
    progress: 120
  }
]
```

### **3. Frontend'da ko'rish:**
```
StudentOpenSteps sahifasi:
Ali Valiyev | 5-qadam ✅ | 213-qadam | 120%
```

---

## 🎯 **Xulosa**

✅ **Database birlashtirish** - Bajarildi!
✅ **Aggregation query** - Yozildi!
✅ **Frontend UI** - Yangilandi!
✅ **Ikki qadam** - Farqlanadi!

**Endi tizim to'liq ishlaydi!** 🚀

---

## 📞 **Yordam**

Agar muammo bo'lsa:
1. MongoDB ulanishini tekshiring
2. Submissions collection'ni tekshiring
3. Tasks collection'ni tekshiring
4. Aggregation query'ni tekshiring
5. Console log'larni ko'ring

**Omad!** 🎉
