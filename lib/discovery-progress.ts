import { WORLD_COUNTRY_COUNT } from "@/constants/geo";
import { cca2FromFlagUrl } from "@/lib/map-country";
import type { Country, MapCountry } from "@/types/country";

/** Mon–Sun completion flags (index 0 = Monday). */
export type WeekProgress = [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
];

const EMPTY_WEEK: WeekProgress = [
  false,
  false,
  false,
  false,
  false,
  false,
  false,
];

/** Local calendar date as YYYY-MM-DD. */
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Monday of the current local ISO week (YYYY-MM-DD). */
export function getWeekMondayString(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return getLocalDateString(d);
}

/** Mon=0 … Sun=6 for week dot indexing. */
export function getMondayBasedWeekIndex(date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export function createEmptyWeekProgress(): WeekProgress {
  return [...EMPTY_WEEK];
}

/** Prefer ISO alpha-2; fall back to flag URL or country name. */
export function resolveVisitCountryId(
  country: Pick<Country, "name" | "cca2"> & { flag?: string },
): string {
  const cca2 = country.cca2?.trim().toUpperCase();
  if (cca2?.length === 2) return cca2;

  if (country.flag) {
    const fromFlag = cca2FromFlagUrl(country.flag);
    if (fromFlag) return fromFlag;
  }

  return country.name.trim();
}

export function computeWorldProgressPercent(count: number): number {
  if (count <= 0) return 0;
  return Math.round((count / WORLD_COUNTRY_COUNT) * 100);
}

/**
 * Streak rule (local calendar days):
 * - Fresh user: streak stays 0 until the first country visit or a second
 *   consecutive day with app activity.
 * - Increment when the user opens the app or visits a country on the day
 *   immediately after the previous active day. Same-day activity does not
 *   increment again. A gap of 2+ days resets the streak to 1.
 */
export function applyDailyActivity(input: {
  streakDays: number;
  lastActiveDate: string | null;
  weekProgress: WeekProgress;
  today?: string;
}): {
  streakDays: number;
  lastActiveDate: string;
  weekProgress: WeekProgress;
} {
  const today = input.today ?? getLocalDateString();
  const weekMonday = getWeekMondayString(new Date(`${today}T12:00:00`));

  let weekProgress = input.weekProgress;
  if (!input.lastActiveDate || input.lastActiveDate < weekMonday) {
    weekProgress = createEmptyWeekProgress();
  }

  const nextWeek = [...weekProgress] as WeekProgress;
  nextWeek[getMondayBasedWeekIndex(new Date(`${today}T12:00:00`))] = true;

  if (!input.lastActiveDate) {
    return { streakDays: 0, lastActiveDate: today, weekProgress: nextWeek };
  }

  if (input.lastActiveDate === today) {
    return {
      streakDays: input.streakDays,
      lastActiveDate: today,
      weekProgress: nextWeek,
    };
  }

  const yesterday = getLocalDateString(
    new Date(new Date(`${today}T12:00:00`).getTime() - 86_400_000),
  );

  const streakDays =
    input.lastActiveDate === yesterday ? input.streakDays + 1 : 1;

  return { streakDays, lastActiveDate: today, weekProgress: nextWeek };
}

export function buildVisitedNameSet(
  countries: MapCountry[],
  visitedIds: string[],
): Set<string> {
  const idSet = new Set(visitedIds);
  const names = new Set<string>();

  for (const country of countries) {
    const id = resolveVisitCountryId({
      name: country.name,
      cca2: "",
      flag: country.flag,
    });
    if (idSet.has(id)) {
      names.add(country.name);
    }
  }

  return names;
}
