export type EventSourceType = "tour-api" | "news";

export type EventCategory =
  | "concert"
  | "festival"
  | "exhibition"
  | "performance"
  | "film"
  | "esports"
  | "popup"
  | "heritage"
  | "other";

export interface EventSourceRef {
  type: EventSourceType;
  title: string;
  url?: string;
  outlet?: string;
  pubDate?: string;
  contentId?: string;
}

export interface EventScores {
  importance: number;
  interest: number;
  urgency: number;
  scale: number;
  reliability: number;
}

export interface CultureEvent {
  id: string;
  title: string;
  category: EventCategory;
  displayGroup?: "featured" | "festival" | "ongoing";
  region?: string;
  venue?: string;
  address?: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  officialUrl?: string;
  description?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  sources: EventSourceRef[];
  scores: EventScores;
  score: number;
  rationale: string;
  dateConfidence: "high" | "medium" | "low";
}

export interface EventsDoc {
  slug: string;
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  meta: {
    title: string;
    dek: string;
    totalCandidates: number;
    selected: number;
    sourceBreakdown: {
      tourApi: number;
      news: number;
    };
    note: string;
  };
  events: CultureEvent[];
}
