import { Radio, Users, ShoppingBag } from "lucide-react";

interface LiveSession {
  id: string;
  title: string | null;
  viewers_count: number | null;
  thumbnail_url: string | null;
  started_at: string;
  host_role?: string | null;
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface LiveCardProps {
  session: LiveSession;
  featured?: boolean;
}

function formatViewers(count: number | null): string {
  if (!count) return "0";
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

function timeSince(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "en direct";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  return `${Math.floor(seconds / 3600)} h`;
}

export default function LiveCard({ session, featured = false }: LiveCardProps) {
  const host = session.profiles;
  const hostName = host?.username || host?.full_name || "Vendeur";
  const isSeller = session.host_role === "vendeur";

  if (featured) {
    return (
      <div className="relative aspect-[9/16] max-h-[500px] rounded-2xl overflow-hidden bg-neutral-900 group">
        {session.thumbnail_url ? (
          <img
            src={session.thumbnail_url}
            alt={session.title || "Live"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-900 via-pink-900 to-purple-900" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Badge LIVE + Viewers */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isSeller ? (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-pink-600 px-2 py-1 rounded-md shadow-lg">
              <ShoppingBag className="w-3 h-3 text-white" />
              <span className="text-[10px] font-black tracking-wider text-white">LIVE SHOPPING</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-red-600 px-2 py-1 rounded-md shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-black tracking-wider">LIVE</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">
            <Users className="w-3 h-3 text-neutral-300" />
            <span className="text-[10px] font-bold">{formatViewers(session.viewers_count)}</span>
          </div>
        </div>

        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">
          <span className="text-[10px] font-bold">{timeSince(session.started_at)}</span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden bg-neutral-800 flex-shrink-0">
            {host?.avatar_url ? (
              <img src={host.avatar_url} alt={hostName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                {hostName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate drop-shadow-md">{hostName}</p>
            {session.title && (
              <p className="text-xs text-neutral-200 truncate drop-shadow-md">{session.title}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Version grille (compacte)
  return (
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-900 group">
      {session.thumbnail_url ? (
        <img
          src={session.thumbnail_url}
          alt={session.title || "Live"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Badge LIVE */}
      <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 px-1.5 py-0.5 rounded">
        {isSeller ? (
          <ShoppingBag className="w-2.5 h-2.5 text-white" />
        ) : (
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
        )}
        <span className="text-[9px] font-black tracking-wider">
          {isSeller ? "SHOPPING" : "LIVE"}
        </span>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded">
        <Users className="w-2.5 h-2.5 text-neutral-300" />
        <span className="text-[9px] font-bold">{formatViewers(session.viewers_count)}</span>
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full border border-white/30 overflow-hidden bg-neutral-800 flex-shrink-0">
          {host?.avatar_url ? (
            <img src={host.avatar_url} alt={hostName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-[10px]">
              {hostName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate drop-shadow-md">{hostName}</p>
        </div>
      </div>
    </div>
  );
}
