// What a conversion endpoint can send. Kept free of server-only imports so both
// the database model and the dashboard (browser) can use the same lists.
export const CONVERSION_EVENT_NAMES = [
  "O'ylab ko'radi",
  "Tashrif belgilandi",
  "Kelmadi",
  "Bekor bo'ldi",
  "Tashrif buyurdi",
  "Shartnoma",
  "To'lov o'tkazildi",
] as const;
export type ConversionEventName = (typeof CONVERSION_EVENT_NAMES)[number];

export const CONVERSION_CURRENCIES = ["USD", "UZS", "EUR", "RUB", "KZT"] as const;
export type ConversionCurrency = (typeof CONVERSION_CURRENCIES)[number];
