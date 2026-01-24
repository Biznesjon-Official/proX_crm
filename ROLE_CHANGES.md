# Role O'zgarishlari

## 📋 Qilingan O'zgarishlar

### 1. `branch_manager` roli olib tashlandi
- `branch_manager` → `manager` ga almashtirildi
- Barcha funksiyalar saqlanib qoldi

### 2. `head_teacher` roli olib tashlandi
- Keraksiz murakkablik
- Mentor va Manager yetarli
- Hardcoded userlar o'chirildi

## 🔄 O'zgartirilgan Fayllar

### Backend (Server)
1. **crmprox/server/routes/auth.ts**
   - `branch_manager` → `manager`
   - `head_teacher` userlari o'chirildi (vobkent_teacher, tashkent_teacher)
   - `requireBranchManagerOrSuperAdmin` → `requireManagerOrSuperAdmin`

2. **crmprox/server/mongodb.ts**
   - User schema: `branch_manager` va `head_teacher` olib tashlandi

3. **crmprox/server/routes/progress-mongo.ts**
   - `branch_manager` → `manager`

4. **crmprox/server/routes/branches-mongo.ts**
   - User query: `branch_manager` va `head_teacher` olib tashlandi

5. **crmprox/server/routes/payments-mongo.ts**
   - `requireBranchManagerOrSuperAdmin` → `requireManagerOrSuperAdmin`

6. **crmprox/server/routes/students-mongo.ts**
   - `requireBranchManagerOrSuperAdmin` → `requireManagerOrSuperAdmin`

### Frontend (Client)
1. **crmprox/client/components/Layout.tsx**
   - Menu items: `branch_manager` olib tashlandi

2. **crmprox/client/pages/Dashboard.tsx**
   - UserRole type: `branch_manager` va `head_teacher` olib tashlandi

3. **crmprox/client/pages/StudentProfile.tsx**
   - UserRole type: `branch_manager` va `head_teacher` olib tashlandi

### Shared
1. **crmprox/shared/types.ts**
   - User interface: `branch_manager` va `head_teacher` olib tashlandi

## ✅ Yangi Rollar Ro'yxati (Soddalashtirilgan)

1. **super_admin** - Bosh administrator
2. **manager** - Filial rahbari
3. **mentor** - O'qituvchi (dars beradi)
4. **student** - O'quvchi

## 🔑 Login Ma'lumotlari

### Ishlaydi:
```
# Super Admin
superadmin / prox2024

# Filial Rahbarlari (Manager)
gijduvan_manager / gijduvan123
vobkent_manager / vobkent123
tashkent_manager / tashkent123
```

### O'chirildi (endi ishlamaydi):
```
# Head Teachers (olib tashlandi)
vobkent_teacher / teacher123  ❌
tashkent_teacher / teacher456 ❌
```

## 📊 Filial Tuzilmasi

```
FILIAL
├─ 1 ta MANAGER (Filial Rahbari) ⭐ MAJBURIY
├─ 1-5 ta MENTOR (O'qituvchi) 📚 IXTIYORIY
└─ Ko'p STUDENT (O'quvchilar) 👥 ASOSIY
```

## 📝 Eslatma

- `branch_manager` → `manager` (soddalashtirildi)
- `head_teacher` to'liq olib tashlandi (keraksiz)
- Barcha funksiyalar saqlanib qoldi
- Tizim soddaroq va tushunarli bo'ldi
