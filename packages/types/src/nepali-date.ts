/**
 * Thin, typed wrapper around `nepali-date-converter` so the rest of the
 * codebase never imports the third-party package directly. Centralizing
 * this here means the BS<->AD calendar-data table is validated in one
 * place, and the API/web apps just consume simple functions.
 */
import NepaliDateConverter from "nepali-date-converter";

export const BS_MONTH_NAMES = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

export const BS_MONTH_NAMES_NP = [
  "बैशाख",
  "जेठ",
  "असार",
  "श्रावण",
  "भदौ",
  "आश्विन",
  "कार्तिक",
  "मंसिर",
  "पौष",
  "माघ",
  "फाल्गुण",
  "चैत्र",
] as const;

export interface BsDate {
  year: number;
  /** 1-indexed month (1 = Baisakh) */
  month: number;
  day: number;
}

/** Converts a JS/AD `Date` to its Bikram Sambat equivalent. */
export function adToBs(date: Date): BsDate {
  const nd = new NepaliDateConverter(date);
  const bs = nd.getBS();
  return { year: bs.year, month: bs.month + 1, day: bs.date };
}

/** Converts a Bikram Sambat date to its AD/Gregorian `Date` equivalent. */
export function bsToAd(bs: BsDate): Date {
  const nd = new NepaliDateConverter(bs.year, bs.month - 1, bs.day);
  return nd.toJsDate();
}

/** Formats an AD date directly as a BS string, e.g. "2083-04-16". */
export function formatAdAsBs(date: Date, withMonthName = false): string {
  const bs = adToBs(date);
  if (withMonthName) {
    return `${BS_MONTH_NAMES[bs.month - 1]} ${bs.day}, ${bs.year}`;
  }
  return `${bs.year}-${String(bs.month).padStart(2, "0")}-${String(bs.day).padStart(2, "0")}`;
}

/** Returns today's date in Bikram Sambat. */
export function todayBs(): BsDate {
  return adToBs(new Date());
}
