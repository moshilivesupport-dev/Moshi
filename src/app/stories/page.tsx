import { StoryBar } from "@/components/social/StoryBar";

export default function StoriesPage() {
  const demoStories = [
    { id: "1", seller_username: "AminaStyle", has_unseen: true },
    { id: "2", seller_username: "BeautyByFatou", has_unseen: true },
    { id: "3", seller_username: "TechKofi", has_unseen: false },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Stories</h1>
      <StoryBar stories={demoStories} />
      <div className="card mt-8 text-center py-12 text-muted text-sm">
        Sélectionnez une story pour la voir.
        <br />
        <span className="text-xs">Les stories disparaissent après 24h.</span>
      </div>
    </div>
  );
}
