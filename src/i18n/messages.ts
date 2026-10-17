import type { Locale } from "./config";

// Server-side messages (API errors, OAuth redirect errors, stored lead errors)
// are written in Uzbek in the code. This table translates them at the edge —
// in API responses and where they are shown — so routes keep plain strings.
// `{x}` marks a variable part of the message.
const MESSAGES: Record<string, { ru: string; en: string }> = {
  "Avtorizatsiya talab qilinadi": { ru: "Требуется авторизация", en: "Authentication required" },
  "CRM ulanishi topilmadi": { ru: "CRM-подключение не найдено", en: "CRM connection not found" },
  "CRM ulanishi topilmadi (o'chirilgan bo'lishi mumkin)": {
    ru: "CRM-подключение не найдено (возможно, удалено)",
    en: "CRM connection not found (it may have been deleted)",
  },
  "Foydalanuvchi topilmadi": { ru: "Пользователь не найден", en: "User not found" },
  "Integratsiya topilmadi": { ru: "Интеграция не найдена", en: "Integration not found" },
  "Forma topilmadi": { ru: "Форма не найдена", en: "Form not found" },
  "Facebook ulanishi topilmadi": { ru: "Подключение Facebook не найдено", en: "Facebook connection not found" },
  "fullName, email va password to'ldirilishi shart": {
    ru: "Заполните имя, email и пароль",
    en: "Name, email and password are required",
  },
  "email va password to'ldirilishi shart": { ru: "Введите email и пароль", en: "Email and password are required" },
  "Webhook URL kiritilishi shart": { ru: "Укажите Webhook URL", en: "Webhook URL is required" },
  "Ulanish topilmadi": { ru: "Подключение не найдено", en: "Connection not found" },
  "Telefon raqam noto'g'ri": { ru: "Неверный номер телефона", en: "Invalid phone number" },
  "Tarif topilmadi": { ru: "Тариф не найден", en: "Plan not found" },
  "Ruxsat yo'q": { ru: "Нет доступа", en: "Access denied" },
  "Platforma noto'g'ri tanlangan": { ru: "Неверно выбрана платформа", en: "Invalid platform" },
  "Nom bo'sh bo'lmasligi kerak": { ru: "Название не может быть пустым", en: "Name can't be empty" },
  "Manba, forma nomi va CRM tanlanishi shart": {
    ru: "Выберите источник, название формы и CRM",
    en: "Source, form name and CRM are required",
  },
  "Manba noto'g'ri": { ru: "Неверный источник", en: "Invalid source" },
  "Ma'lumot noto'g'ri": { ru: "Неверные данные", en: "Invalid data" },
  "Lid topilmadi": { ru: "Лид не найден", en: "Lead not found" },
  "Kodni to'g'ri kiriting": { ru: "Введите код правильно", en: "Enter the code correctly" },
  "Kod topilmadi yoki muddati tugagan": { ru: "Код не найден или истёк", en: "Code not found or expired" },
  "Kod noto'g'ri": { ru: "Неверный код", en: "Incorrect code" },
  "Kalit topilmadi": { ru: "Ключ не найден", en: "Key not found" },
  "Kalit nomini kiriting": { ru: "Введите название ключа", en: "Enter a key name" },
  "Juda ko'p noto'g'ri urinish, yangi kod so'rang": {
    ru: "Слишком много неверных попыток, запросите новый код",
    en: "Too many wrong attempts, request a new code",
  },
  "Ismni kiriting": { ru: "Введите имя", en: "Enter your name" },
  "Ism va telefon raqam kiritilishi shart": { ru: "Укажите имя и номер телефона", en: "Name and phone number are required" },
  "Holat noto'g'ri": { ru: "Неверный статус", en: "Invalid status" },
  "Faqat kutilayotgan buyurtmani o'zgartirish mumkin": {
    ru: "Изменить можно только ожидающий заказ",
    en: "Only pending orders can be changed",
  },
  "Facebook sahifa ma'lumotlari to'liq emas": { ru: "Данные страницы Facebook неполные", en: "Facebook Page data is incomplete" },
  "Email yoki parol noto'g'ri": { ru: "Неверный email или пароль", en: "Incorrect email or password" },
  "Buyurtma topilmadi": { ru: "Заказ не найден", en: "Order not found" },
  "Bu tarif uchun buyurtma allaqachon kutilmoqda": {
    ru: "Заказ на этот тариф уже ожидает оплаты",
    en: "An order for this plan is already pending",
  },
  "Bu email bilan foydalanuvchi allaqachon ro'yxatdan o'tgan": {
    ru: "Пользователь с таким email уже зарегистрирован",
    en: "A user with this email is already registered",
  },
  "Barcha maydonlar to'ldirilishi shart": { ru: "Заполните все поля", en: "All fields are required" },
  "Account URL va token kiritilishi shart": { ru: "Укажите Account URL и токен", en: "Account URL and token are required" },
  "Server xatosi": { ru: "Ошибка сервера", en: "Server error" },
  "Noto'g'ri ID format": { ru: "Неверный формат ID", en: "Invalid ID format" },
  "To'liq ism kiritilishi shart": { ru: "Укажите полное имя", en: "Full name is required" },
  "Email kiritilishi shart": { ru: "Укажите email", en: "Email is required" },
  "Email formati noto'g'ri": { ru: "Неверный формат email", en: "Invalid email format" },
  "Parol kiritilishi shart": { ru: "Укажите пароль", en: "Password is required" },
  "Account URL formati noto'g'ri": { ru: "Неверный формат Account URL", en: "Invalid Account URL format" },
  "amoCRM/Kommo'ga ulanib bo'lmadi": { ru: "Не удалось подключиться к amoCRM/Kommo", en: "Could not connect to amoCRM/Kommo" },
  "Account URL yoki token noto'g'ri": { ru: "Неверный Account URL или токен", en: "Invalid Account URL or token" },
  "Webhook URL formati noto'g'ri": { ru: "Неверный формат Webhook URL", en: "Invalid Webhook URL format" },
  "Bitrix24'ga ulanib bo'lmadi": { ru: "Не удалось подключиться к Bitrix24", en: "Could not connect to Bitrix24" },
  "Bitrix24 webhook yaroqsiz": { ru: "Вебхук Bitrix24 недействителен", en: "Bitrix24 webhook is invalid" },
  "Facebook'dan lid ma'lumoti olinmadi": {
    ru: "Не удалось получить данные лида из Facebook",
    en: "Could not fetch lead data from Facebook",
  },
  "Bitrix24'ga lead yuborilmadi": { ru: "Не удалось отправить лид в Bitrix24", en: "Could not send the lead to Bitrix24" },
  "amoCRM/Kommo'ga lead yuborilmadi": {
    ru: "Не удалось отправить лид в amoCRM/Kommo",
    en: "Could not send the lead to amoCRM/Kommo",
  },
  "Bosqichlar ro'yxati olinmadi": { ru: "Не удалось получить список этапов", en: "Could not load the stage list" },
  "Formalar ro'yxati olinmadi": { ru: "Не удалось получить список форм", en: "Could not load the form list" },
  // OAuth redirect errors (?error= / ?facebook_error=)
  "Xavfsizlik tekshiruvi muvaffaqiyatsiz": { ru: "Проверка безопасности не пройдена", en: "Security check failed" },
  "Xavfsizlik tekshiruvi muvaffaqiyatsiz, qayta urinib ko'ring": {
    ru: "Проверка безопасности не пройдена, попробуйте ещё раз",
    en: "Security check failed, please try again",
  },
  "Avval saytga kiring": { ru: "Сначала войдите на сайт", en: "Please sign in first" },
  "Boshqaradigan Facebook sahifangiz topilmadi": {
    ru: "Не найдено страниц Facebook, которыми вы управляете",
    en: "No Facebook Pages you manage were found",
  },
  "Facebook ulanishida xatolik": { ru: "Ошибка подключения Facebook", en: "Facebook connection error" },
  "Google orqali kirish bekor qilindi": { ru: "Вход через Google отменён", en: "Google sign-in was cancelled" },
  "Google orqali kirish sozlanmagan": { ru: "Вход через Google не настроен", en: "Google sign-in is not configured" },
  "Google'dan token olinmadi": { ru: "Не удалось получить токен от Google", en: "Could not get a token from Google" },
  "Google profil ma'lumotlari olinmadi": {
    ru: "Не удалось получить данные профиля Google",
    en: "Could not get your Google profile",
  },
  "Google akkauntingizdagi email tasdiqlanmagan": {
    ru: "Email в вашем аккаунте Google не подтверждён",
    en: "The email on your Google account is not verified",
  },
  "Google orqali kirishda xatolik": { ru: "Ошибка входа через Google", en: "Google sign-in error" },
  // Templates
  "{platform} ulanishi hali qo'llab-quvvatlanmaydi": {
    ru: "Подключение {platform} пока не поддерживается",
    en: "{platform} connections aren't supported yet",
  },
  "Eng ko'pi bilan {n} ta kalit yaratish mumkin": { ru: "Можно создать не более {n} ключей", en: "You can create at most {n} keys" },
  "Parol kamida {n} belgidan iborat bo'lishi kerak": {
    ru: "Пароль должен содержать не менее {n} символов",
    en: "Password must be at least {n} characters",
  },
  "Bu {field} allaqachon band": { ru: "Значение поля {field} уже занято", en: "This {field} is already taken" },
};

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const TEMPLATES = Object.entries(MESSAGES)
  .filter(([uz]) => uz.includes("{"))
  .map(([uz, translations]) => {
    const names = [...uz.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    const pattern = new RegExp(`^${escapeRegex(uz).replace(/\\\{\w+\\\}/g, "(.+?)")}$`);
    return { pattern, names, translations };
  });

// Translates a known Uzbek server message into `locale`; unknown messages
// (e.g. raw errors from Bitrix24 or Facebook) are returned unchanged.
export function translateMessage(message: string, locale: Locale): string {
  if (locale === "uz") return message;
  const exact = MESSAGES[message];
  if (exact) return exact[locale];
  for (const { pattern, names, translations } of TEMPLATES) {
    const match = message.match(pattern);
    if (!match) continue;
    return names.reduce((text, name, index) => text.replace(`{${name}}`, match[index + 1]), translations[locale]);
  }
  return message;
}
