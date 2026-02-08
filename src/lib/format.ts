import type { Locale } from "@/lib/i18n";

export function formatCurrency(amount: number | string, currency: string, locale: Locale = "es") {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(numeric)) {
    return "—";
  }

  const localeTag = locale === "es" ? "es-DO" : "en-US";

  try {
    return new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${numeric.toFixed(2)} ${currency}`;
  }
}

export function formatDate(dateValue: string, locale: Locale = "es") {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  const localeTag = locale === "es" ? "es-DO" : "en-US";

  return new Intl.DateTimeFormat(localeTag, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
