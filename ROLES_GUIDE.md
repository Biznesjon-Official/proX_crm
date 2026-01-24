# 🎭 CRM Prox - Rollar Qo'llanmasi

## 📊 Rollar Tizimi (Soddalashtirilgan)

CRM Prox tizimida **4 ta rol** mavjud:

```
1. super_admin  → Bosh Administrator
2. manager      → Filial Rahbari
3. mentor       → O'qituvchi
4. student      → O'quvchi
```

---

## 1️⃣ SUPER_ADMIN (Bosh Administrator)

### 👤 Kim?
- Kompaniya boshlig'i
- Barcha tizimga to'liq kirish

### 🔑 Login:
```
username: superadmin
password: prox2024
```

### ⚡ Vazifalari:
- ✅ Filiallar yaratish/tahrirlash/o'chirish
- ✅ Barcha filiallarni ko'rish
- ✅ Barcha o'quvchilarni boshqarish
- ✅ Mentor va Manager yaratish
- ✅ To'lovlarni boshqarish
- ✅ Barcha statistikalarni ko'rish

### 🎯 Kirish:
- Barcha sahifalar
- Barcha filiallar
- Barcha ma'lumotlar

---

## 2️⃣ MANAGER (Filial Rahbari)

### 👤 Kim?
- Filial boshlig'i
- Bir filialning mas'ul shaxsi

### 🔑 Login (Misollar):
```
username: gijduvan_manager
password: gijduvan123

username: vobkent_manager
password: vobkent123

username: tashkent_manager
password: tashkent123
```

### ⚡ Vazifalari:
- ✅ O'z filialidagi o'quvchilarni boshqarish
- ✅ O'quvchi qo'shish/tahrirlash/o'chirish
- ✅ To'lovlarni qabul qilish
- ✅ Ball va qadam belgilash
- ✅ O'z filiali statistikasini ko'rish
- ✅ Mentorlarni boshqarish
- ❌ Boshqa filiallarni ko'ra olmaydi
- ❌ Filial yarata olmaydi

### 🎯 Kirish:
- Faqat o'z filiali
- O'z filialidagi o'quvchilar
- O'z filialidagi to'lovlar

### 📝 Yaratilishi:
Super admin tomonidan filial yaratishda

---

## 3️⃣ MENTOR (O'qituvchi)

### 👤 Kim?
- Dars beruvchi o'qituvchi
- Filialda ishlaydi

### 🔑 Login:
Filial yaratishda super admin tomonidan beriladi

### ⚡ Vazifalari:
- ✅ Dars berish
- ✅ O'quvchi qo'shish (faqat o'z filialiga)
- ✅ Ball va qadam belgilash
- ✅ O'quvchilar progressini ko'rish
- ❌ To'lov qabul qila olmaydi
- ❌ O'quvchi o'chira olmaydi
- ❌ Boshqa filiallarni ko'ra olmaydi

### 🎯 Kirish:
- Faqat o'z filiali
- O'quvchilar va progress sahifalari

### 📝 Yaratilishi:
Super admin tomonidan filial yaratishda:
```
Filial yaratish → Filial turi: Mentor
→ Mentor username/password kiritish
```

---

## 4️⃣ STUDENT (O'quvchi)

### 👤 Kim?
- Talaba
- O'qiyotgan shaxs

### 🔑 Login:
Har bir o'quvchiga individual beriladi

### ⚡ Vazifalari:
- ✅ O'z profilini ko'rish
- ✅ O'z ball va qadamini ko'rish
- ✅ O'z progressini ko'rish
- ✅ O'z to'lovlarini ko'rish
- ❌ Boshqa hech narsa qila olmaydi

### 🎯 Kirish:
- Faqat `/student-profile` sahifasi
- Faqat o'z ma'lumotlari

### 📝 Yaratilishi:
Manager yoki Mentor tomonidan:
```
O'quvchilar → Yangi → Ma'lumotlar kiritish
```

---

## 📊 Ruxsatlar Jadvali

| Funksiya | super_admin | manager | mentor | student |
|----------|:-----------:|:-------:|:------:|:-------:|
| **Filial yaratish** | ✅ | ❌ | ❌ | ❌ |
| **O'quvchi qo'shish** | ✅ | ✅ | ✅ | ❌ |
| **O'quvchi o'chirish** | ✅ | ✅ | ❌ | ❌ |
| **Ball belgilash** | ✅ | ✅ | ✅ | ❌ |
| **To'lov qabul** | ✅ | ✅ | ❌ | ❌ |
| **Barcha filiallar** | ✅ | ❌ | ❌ | ❌ |
| **O'z filiali** | ✅ | ✅ | ✅ | ❌ |
| **O'z profili** | ✅ | ✅ | ✅ | ✅ |

---

## 🏢 Filial Tuzilmasi

### Minimal (Majburiy):
```
FILIAL
├─ 1 ta MANAGER ⭐
└─ 1+ ta STUDENT ⭐
```

### To'liq (Tavsiya):
```
FILIAL
├─ 1 ta MANAGER ⭐
├─ 1-5 ta MENTOR 📚
└─ Ko'p STUDENT 👥
```

---

## 🎯 Filial Hajmiga Qarab

### 🏪 Kichik Filial (10-30 o'quvchi):
```
✅ 1 ta Manager (o'zi dars beradi)
❌ Mentor kerak emas
✅ 10-30 ta Student
```

### 🏬 O'rta Filial (30-70 o'quvchi):
```
✅ 1 ta Manager
✅ 1-2 ta Mentor
✅ 30-70 ta Student
```

### 🏢 Katta Filial (70+ o'quvchi):
```
✅ 1 ta Manager
✅ 3-5 ta Mentor
✅ 70+ ta Student
```

---

## 🔐 Xavfsizlik

### Token Autentifikatsiya:
- Barcha API so'rovlar token bilan himoyalangan
- Token localStorage'da saqlanadi
- Har bir rol o'z ruxsatlariga ega

### Middleware:
- `authenticateToken` - Token tekshirish
- `requireSuperAdmin` - Faqat super admin
- `requireManagerOrSuperAdmin` - Manager yoki super admin

---

## 📝 Eslatmalar

1. **Bir filial = bir manager**
2. **Mentor ixtiyoriy** (kerak bo'lsa qo'shiladi)
3. **Student cheksiz** (istalgancha)
4. **Super admin yagona** (barcha filiallar uchun)

---

## ❓ Tez-tez So'raladigan Savollar

**Q: Bir mentor bir nechta filialda ishlay oladimi?**  
A: Yo'q, har bir mentor faqat bitta filialga tegishli.

**Q: Manager o'zi dars bera oladimi?**  
A: Ha, kichik filiallarda manager o'zi dars beradi.

**Q: Mentor to'lov qabul qila oladimi?**  
A: Yo'q, faqat manager to'lov qabul qiladi.

**Q: Student o'z ma'lumotlarini o'zgartira oladimi?**  
A: Yo'q, faqat ko'rish mumkin.

---

## 🚀 Yangi Filial Yaratish

1. Super admin sifatida kirish
2. Filiallar → Yangi
3. Filial ma'lumotlarini kiritish
4. Filial turi tanlash:
   - **Manager** - Faqat manager
   - **Mentor** - Manager + Mentor
5. Login va parol kiritish
6. Saqlash

Manager/Mentor avtomatik yaratiladi va kirishi mumkin bo'ladi.
