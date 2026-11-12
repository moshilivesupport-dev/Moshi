import Link from "next/link";
import { Play, Heart } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface VideoResultProps {
  video: {
    id: string;
    url: string;
    caption: string | null;
    view_count: number | null;
    like_count: number | null;
    profiles?: {
      username: string | null;
      avatar_url: string | null;
    } | null;
  };
}

export default function VideoResult({ video }: VideoResultProps) {
  const authorName = video.profiles?.username || "Utilisateur";

  return (
    <Link
      href={`/videos/${video.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-900 transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative w-20 h-28 rounded-xl bg-neutral-800 overflow-hidden flex-shrink-0">
        <video
          src={video.url}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="w-6 h-6 text-white fill-white" />
        </div>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-neutral-400 mb-1">@{authorName}</p>
        {video.caption && (
          <p className="text-sm text-white line-clamp-2 mb-2">{video.caption}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Play className="w-3 h-3" />
            {formatNumber(video.view_count || 0)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {formatNumber(video.like_count || 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}
