# Lead Sync — Facebook Lead Ads → Bitrix24

Facebook reklama formalaridan (Lead Ads) kelgan lidlarni avtomatik ravishda Bitrix24 CRM'ga yozadigan sayt. Next.js (App Router) + Prisma + Neon Postgres, Vercel'da ishlashga mo'ljallangan.

## ⚠️ Muhim: Facebook App Review haqida

Haqiqiy lidlarni webhook orqali olish uchun Meta'dan **App Review** (`leads_retrieval` ruxsatnomasi) o'tish shart — bu Development Mode'da yoki App/Page admin bo'lish orqali chetlab o'tib bo'lmaydi. Jarayon bir necha ish kunini oladi (Business Verification + App Review submission — privacy policy va screencast talab qilinadi). Sayt texnik jihatdan tayyor bo'lsa ham, real lidlar faqat Review tasdiqlanib App "Live" holatiga o'tgandan keyin kela boshlaydi. Shuning uchun bu qadamni **eng birinchi** boshlang — sayt tayyor bo'lguncha fonda kutib turadi.

## Sozlash tartibi

### 1. Bitrix24 Inbound Webhook

1. Bitrix24'da: **Ilovalar (Applications) → Ishlab chiquvchi resurslari → Boshqa → Kiruvchi webhook**.
2. **CRM** scope'ini tanlang.
3. Yaratilgan URL'ni nusxalang (masalan `https://yourcompany.bitrix24.com/rest/1/abc123xyz/`) — bu `BITRIX_WEBHOOK_URL`. Uni parol kabi maxfiy saqlang.

### 2. Facebook Developer App (shu yerdan boshlang — eng uzoq qadam)

1. [developers.facebook.com](https://developers.facebook.com) da Business turidagi App yarating.
2. **Webhooks** mahsulotini qo'shing, `page` obyektiga, `leadgen` field'iga obuna bo'ling.
3. Callback URL: `https://<sayt-domeningiz>/api/webhook/facebook` (sayt deploy qilingandan keyin to'ldiriladi — 5-qadamga qarang).
4. O'zingiz o'ylab topgan tasodifiy satrni Verify Token sifatida kiriting — bu `FB_VERIFY_TOKEN`.
5. App Secret'ni nusxalang — bu `FB_APP_SECRET`.
6. Business Manager uchun **Business Verification**ni boshlang (bir necha kun cho'zilishi mumkin).
7. Kerakli sahifa uchun Page Access Token generatsiya qiling — bu `FB_PAGE_ACCESS_TOKEN`.
8. `leads_retrieval` (+ tegishli page ruxsatnomalari) uchun **App Review**ga screencast va privacy policy bilan ariza topshiring.
9. Review tasdiqlanmaguncha, Meta App Dashboard'dagi **"Test Lead"** vositasidan foydalanib butun pipeline'ni (webhook → Bitrix24) sinab ko'rishingiz mumkin.

### 3. Neon Postgres

1. [Vercel loyihangizda](https://vercel.com) **Marketplace → Neon** integratsiyasini qo'shing — bu `DATABASE_URL` (pooled) va `DIRECT_URL` (unpooled) o'zgaruvchilarini avtomatik joylashtiradi. (Yoki mustaqil ravishda [neon.tech](https://neon.tech)da baza yarating.)

### 4. Admin parol va sessiya kaliti

Loyiha papkasida:

```
npm run generate-secrets -- "sizning-admin-parolingiz"
```

Chiqadigan `ADMIN_PASSWORD_HASH` va `SESSION_SECRET` qiymatlarini saqlab qo'ying.

### 5. Vercel'ga deploy

1. Repozitoriyni Vercel'ga ulang.
2. Quyidagi environment variable'larni kiriting (Neon'dan kelganlardan tashqari):
   - `FB_APP_SECRET`, `FB_VERIFY_TOKEN`, `FB_PAGE_ACCESS_TOKEN`
   - `BITRIX_WEBHOOK_URL`, `BITRIX_SOURCE_ID` (standart: `WEBFORM`)
   - `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`
3. Deploy qiling. Endi haqiqiy domeningiz bor — 2-qadamdagi Facebook Webhooks callback URL'ni shu manzil bilan yakunlang (bu GET tekshiruvini ishga tushiradi).

### 6. Sinov

1. Meta App Dashboard'dagi **"Test Lead"** vositasi bilan sintetik lid yuboring.
2. `/dashboard`ga admin paroli bilan kirib, yozuv **Muvaffaqiyatli** statusda paydo bo'lganini tekshiring.
3. Bitrix24 CRM'da mos Lead yaratilganini tekshiring.
4. App Review tasdiqlangandan keyin real reklama orqali yakuniy testni o'tkazing.

## Lokal ishga tushirish

```
npm install
cp .env.example .env   # va qiymatlarni to'ldiring
npx prisma migrate dev --name init
npm run dev
```

## Loyiha tuzilishi

- `src/app/api/webhook/facebook/route.ts` — Facebook webhook qabul qiluvchi (GET tekshiruv + POST lid hodisasi).
- `src/app/api/leads/[id]/retry/route.ts` — muvaffaqiyatsiz lidni qayta yuborish.
- `src/app/dashboard` — parol bilan himoyalangan ichki panel (lidlar ro'yxati va tafsilotlari).
- `src/lib/facebook.ts` — Graph API bilan ishlash, webhook imzosini tekshirish.
- `src/lib/bitrix.ts` — Bitrix24'ga lid yuborish va maydonlarni moslashtirish.
- `prisma/schema.prisma` — `SyncedLead` jadvali (idempotentlik uchun `fbLeadgenId` unique).
