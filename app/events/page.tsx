import EventView from "@/components/EventView";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { latestEvents } from "@/lib/events";

export const dynamic = "force-static";

export default function EventsPage() {
  const doc = latestEvents();
  return (
    <>
      <SiteHeader />
      <EventView doc={doc} />
      <SiteFooter />
    </>
  );
}
