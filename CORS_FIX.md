# CORS Xatosi Tuzatildi

## Muammo
```
Error: CORS policy: Origin not allowed
```

Frontend dan backend ga so'rov yuborilayotganda origin ruxsat etilmagan edi.

## Sabab
- `.env` faylida `FRONTEND_URL` yo'q edi
- CORS da faqat `localhost` ruxsat etilgan edi
- Production domenlar qo'shilmagan edi

## Yechim

### 1. `.env` faylini yangilash
```env
FRONTEND_URL=https://crm.prox.uz
NODE_ENV=production
```

### 2. CORS konfiguratsiyasini yangilash
```javascript
const allowedOrigins = [
  'http://localhost:5173',      // Dev
  'http://localhost:3000',      // Dev
  'https://crm.prox.uz',        // Production
  'https://prox.uz',            // Production
  'http://crm.prox.uz',         // HTTP fallback
  'http://prox.uz'              // HTTP fallback
];
```

### 3. Qo'shimcha xususiyatlar
- No origin requests ruxsat etildi (Postman, curl)
- Development rejimda barcha originlar ruxsat etiladi
- Production da faqat allowed origins
- CORS blocked loglar qo'shildi

## Serverni Qayta Ishga Tushirish

### SSH orqali:
```bash
cd /var/www/crmprox
pm2 restart 5
pm2 logs 5
```

### Yoki:
```bash
pm2 restart prox-crm
pm2 logs prox-crm
```

## Tekshirish

### 1. Logs tekshirish
```bash
pm2 logs 5 --lines 50
```

### 2. CORS xatosi yo'qligini tekshirish
```bash
# Agar xato bo'lmasa, muvaffaqiyatli!
# Agar "CORS blocked" ko'rinsa, origin qo'shish kerak
```

### 3. Frontend dan test qilish
```bash
# Browser console da xato bo'lmasligi kerak
# Network tab da 200 OK status
```

## Qo'shimcha Domenlar Qo'shish

Agar boshqa domen kerak bo'lsa:

### Variant 1: .env ga qo'shish
```env
FRONTEND_URL=https://yangi-domen.uz
```

### Variant 2: Kod ga qo'shish
```javascript
const allowedOrigins = [
  // ... mavjud domenlar
  'https://yangi-domen.uz'
];
```

## Status
✅ **TUZATILDI** - CORS xatosi hal qilindi
- Barcha kerakli domenlar qo'shildi
- Development va Production rejimlar sozlandi
- Serverni qayta ishga tushirish kerak

## Keyingi Qadam
```bash
pm2 restart 5
```
