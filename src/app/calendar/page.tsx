import { LiveCalendar } from "@/components/calendar/LiveCalendar";
import { Calendar } from "lucide-react";

export default function CalendarPage() {
  const demo = [
    {
      id: "1",
      title: "Flash Sale Mode – Nouveautés",
      seller_username: "AminaStyle",
      scheduled_at: new Date(Date.now() + 86400000 * 1).toISOString(),
    },
    {
      id: "2",
      title: "Beauté & Skincare Live",
      seller_username: "BeautyByFatou",
      scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <Calendar className="w-6 h-6 text-coral" /> Calendrier des lives
      </h1>
      <p className="text-muted text-sm mb-8">Programmez des rappels pour ne rien manquer</p>
      <LiveCalendar lives={demo} />
    </div>
  );
}
