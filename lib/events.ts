import fs from "node:fs";
import path from "node:path";
import { EVENTS_DIR, eventJsonPath } from "@/lib/paths";
import type { EventsDoc } from "@/types/event";

export function allEventSlugs(): string[] {
  if (!fs.existsSync(EVENTS_DIR)) return [];
  return fs
    .readdirSync(EVENTS_DIR)
    .filter((d) => fs.existsSync(path.join(EVENTS_DIR, d, "events.json")));
}

export function readEvents(slug: string): EventsDoc | null {
  const p = eventJsonPath(slug);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as EventsDoc;
  } catch {
    return null;
  }
}

export function latestEvents(): EventsDoc | null {
  const slugs = allEventSlugs().sort((a, b) => b.localeCompare(a));
  return slugs.length ? readEvents(slugs[0]) : null;
}
