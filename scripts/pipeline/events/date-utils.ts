import { addDays, format, parseISO, subDays } from "date-fns";

export function todaySlug(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function addSlugDays(slug: string, days: number): string {
  return format(addDays(parseISO(slug), days), "yyyy-MM-dd");
}

export function subSlugDays(slug: string, days: number): string {
  return format(subDays(parseISO(slug), days), "yyyy-MM-dd");
}

export function compactDate(slug: string): string {
  return slug.replaceAll("-", "");
}

export function fromCompactDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{8}$/.test(value)) return undefined;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function inDisplayRange(
  startDate: string,
  endDate: string,
  displayFrom: string,
  displayTo: string,
): boolean {
  return startDate <= displayTo && endDate >= displayFrom;
}
