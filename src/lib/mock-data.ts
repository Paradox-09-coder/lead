export interface ServiceItem {
  title: string;
  description: string;
  icon: "leads" | "crm" | "reports" | "pixel" | "domain" | "security";
}

export const SERVICES: ServiceItem[] = [
  {
    title: "Facebook Leads",
    description: "Facebook lead formalaridan kelgan lidlarni avtomatik qabul qilish va real vaqtda CRM'ga yuborish",
    icon: "leads",
  },
  {
    title: "CRM integratsiya",
    description: "Bitrix24, amoCRM va Kommo bilan qo'l bilan nusxalashsiz, hammasi avtomatik",
    icon: "crm",
  },
  {
    title: "Hisobotlar",
    description: "Kunlik statistika (lidlar, xarajat, konversiya) avtomatik Telegram'ga yuboriladi",
    icon: "reports",
  },
  {
    title: "Facebook Pixel",
    description: "Saytingizga Pixel o'rnatish va reklamalarni maqsadli auditoriyaga yo'naltirish",
    icon: "pixel",
  },
  {
    title: "Domen xizmati",
    description: "Landing page yoki CPA sayti kerak bo'lsa — domen ro'yxatdan o'tkazish, DNS va SSL bir joyda",
    icon: "domain",
  },
  {
    title: "Xavfsizlik",
    description: "SSL sertifikat, DDoS himoya va ma'lumotlaringiz xavfsizligi ta'minlangan",
    icon: "security",
  },
];

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  priceSuffix: string;
  leadQuota: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Boshlang'ich",
    price: "Bepul",
    priceSuffix: "",
    leadQuota: "1,000 lid/oy",
    description: "Yangi boshlayotganlar uchun bepul tarif",
    features: [
      "1,000 ta lead o'tkazish",
      "1 ta Facebook akkaunt ulash",
      "Cheksiz mahsulot yuklash",
      "Asosiy analitika",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "49,000",
    priceSuffix: "so'm/oy",
    leadQuota: "5,000 lid/oy",
    description: "O'sib borayotgan bizneslar uchun",
    features: [
      "5,000 ta lead o'tkazish",
      "5 ta Facebook akkaunt ulash",
      "Cheksiz mahsulot yuklash",
      "Analitika va hisobotlar",
      "Maxsus CRM integratsiyalari",
    ],
  },
  {
    id: "business",
    name: "Biznes",
    price: "69,000",
    priceSuffix: "so'm/oy",
    leadQuota: "10,000 lid/oy",
    description: "Barqaror bizneslar uchun optimal yechim",
    features: [
      "10,000 ta lead o'tkazish",
      "100 ta Facebook akkaunt ulash",
      "Cheksiz mahsulot yuklash",
      "Analitika va hisobotlar",
      "Maxsus CRM integratsiyalari",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Korporativ",
    price: "89,000",
    priceSuffix: "so'm/oy",
    leadQuota: "Cheksiz lid/oy",
    description: "Katta biznes va agentliklar uchun",
    features: [
      "Cheksiz lead o'tkazish",
      "100 ta Facebook akkaunt ulash",
      "Cheksiz mahsulot yuklash",
      "Analitika va hisobotlar",
      "Maxsus CRM integratsiyalari",
    ],
  },
];

export const CAROUSEL_LOGOS = [
  { name: "Facebook Lead Ads", initials: "f", color: "#1877F2" },
  { name: "Bitrix24", initials: "B24", color: "#22C7A9" },
  { name: "amoCRM", initials: "amo", color: "#A970FF" },
  { name: "Kommo", initials: "K", color: "#6D5BD0" },
  { name: "Facebook Conversion API", initials: "CAPI", color: "#3B82F6" },
  { name: "Telegram Mini App", initials: "T", color: "#26A5E4" },
  { name: "REST API", initials: "API", color: "#14B8A6" },
];

export interface StatTile {
  label: string;
  value: string;
  trend?: string;
}

export const OVERVIEW_STATS: StatTile[] = [
  { label: "Bugun", value: "0", trend: "0 ta lid tushdi" },
  { label: "Bir haftada", value: "0", trend: "0 ta lid tushdi" },
  { label: "Bir oyda", value: "0", trend: "0 ta lid tushdi" },
];

export interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  time: string;
  status?: string;
  href?: string;
}

// Display texts are i18n keys (platforms.*), resolved with t() where shown.
export const CONNECT_PLATFORMS = [
  {
    id: "facebook",
    name: "Facebook",
    authTypeKey: "platforms.oauth",
    descriptionKey: "platforms.facebookDesc",
    locked: false,
  },
  {
    id: "bitrix24",
    name: "Bitrix24",
    authTypeKey: "platforms.webhookUrl",
    descriptionKey: "platforms.bitrix24Desc",
    locked: false,
  },
  {
    id: "amocrm",
    name: "amoCRM / Kommo",
    authTypeKey: "platforms.jwtToken",
    descriptionKey: "platforms.amocrmDesc",
    locked: false,
  },
  {
    id: "telegram",
    name: "Telegram bot",
    authTypeKey: "platforms.botToken",
    descriptionKey: "platforms.telegramDesc",
    locked: true,
  },
] as const;
