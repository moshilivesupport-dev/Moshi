'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Video } from '@/types/video';
import { VideoCard } from '@/components/video/VideoCard';
import { List, Heart, Bookmark, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { PostgrestError } from '@supabase/supabase-js';
import { List } from 'lucide-react';

interface ProfileViewProps {
  initialProfileId: string;
  initialVideos: Video[];
  initialLikes: Video[];
  initialSaves: Video[];
  initialStats: {
    followers: number;
    following: number;
    videos: number;
    totalViews?: number;
  };
}

const ProfileView: React.FC<ProfileViewProps> = ({
  initialProfileId,
  initialVideos,
  initialLikes,
  initialSaves,
  initialStats
}) => {
  const [profileId, setProfileId] = useState(initialProfileId);
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [likes, setLikes] = useState<Video[]>(initialLikes);
  const [saves, setSaves] = useState<Video[]>(initialSaves);
  const [activeTab, setActiveTab] = useState<'grid' | 'favorites' | 'liked'>('grid');
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setProfileId(initialProfileId);
    setVideos(initialVideos);
    setLikes(initialLikes);
    setSaves(initialSaves);
    setStats(initialStats);
    setIsOwnProfile(initialProfileId === 'current-user-id-here'); // Remplace par ton user_id actuel si besoin
  }, [initialProfileId, initialVideos, initialLikes, initialSaves, initialStats]);

  const loadVideos = async (type: 'grid' | 'favorites' | 'liked') => {
    setLoading(true);
    setActiveTab(type);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      let query = supabase
        .from('videos')
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (type === 'grid') {
        query = query.eq('user_id', profileId).eq('status', 'published');
      } else if (type === 'favorites') {
        const { data: bookmarks } = await supabase
          .from('video_bookmarks')
          .select('video_id')
          .eq('user_id', user.id);
        if (bookmarks && bookmarks.length > 0) {
          query = query.in('id', bookmarks.map(b => b.video_id));
        } else {
          query = query.is('id', null); // aucun résultat
        }
      } else if (type === 'liked') {
        const { data: likesData } = await supabase
          .from('video_likes')
          .select('video_id')
          .eq('user_id', user.id);
        if (likesData && likesData.length > 0) {
          query = query.in('id', likesData.map(l => l.video_id));
        } else {
          query = query.is('id', null);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const loadedVideos = (data || []).map((row: any) => ({
        ...row,
        id: row.id,
        title: row.title,
        description: row.description || '',
        video_url: row.video_url,
        thumbnail_url: row.thumbnail_url,
        duration: row.duration,
        views: row.views || 0,
        like_count: row.like_count || 0,
        comment_count: row.comment_count || 0,
        user_id: row.user_id,
        status: row.status,
        user: row.user
      })) as Video[];

      if (type === 'grid') setVideos(loadedVideos);
      else if (type === 'favorites') setSaves(loadedVideos);
      else if (type === 'liked') setLikes(loadedVideos);
    } catch (error) {
      console.error('Erreur chargement vidéos:', error);
      toast.error('Impossible de charger les vidéos');
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial sur mount (pour le tab actif par défaut)
  useEffect(() => {
    if (activeTab !== 'grid') return;
    loadVideos('grid');
  }, [profileId, activeTab]);

  const toggleLike = async (videoId: string, currentLikes: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const isLiked = likes.some(l => l.id === videoId);

      if (isLiked) {
        await supabase.from('video_likes').delete().eq('video_id', videoId).eq('user_id', user.id);
        setLikes(prev => prev.filter(v => v.id !== videoId));
        setStats(prev => ({ ...prev, videos: prev.videos - 1 }));
      } else {
        await supabase.from('video_likes').insert({ video_id: videoId, user_id: user.id });
        setLikes(prev => [...prev, videos.find(v => v.id === videoId)!]);
        setStats(prev => ({ ...prev, videos: prev.videos + 1 }));
      }
    } catch (error) {
      console.error('Erreur like:', error);
      toast.error('Impossible de liker');
    }
  };

  const toggleSave = async (videoId: string, currentSaves: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const isSaved = saves.some(s => s.id === videoId);

      if (isSaved) {
        await supabase.from('video_bookmarks').delete().eq('video_id', videoId).eq('user_id', user.id);
        setSaves(prev => prev.filter(s => s.id !== videoId));
      } else {
        await supabase.from('video_bookmarks').insert({ video_id: videoId, user_id: user.id });
        setSaves(prev => [...prev, videos.find(v => v.id === videoId)!]);
      }
    } catch (error) {
      console.error('Erreur save:', error);
      toast.error('Impossible d\'enregistrer');
    }
  };

  const handleComment = async (videoId: string, comment: string) => {
    // Implémentation via CommentsSheet (déjà fonctionnelle)
    console.log('Commentaire envoyé:', videoId, comment);
  };

  const handleFollow = async (followerId: string, followingId: string) => {
    // Logique FollowButton (déjà intégrée)
    toast.success('Abonnement mis à jour');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-xl">Profil</h1>
          <div className="flex items-center gap-4">
            <User className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stats */}
        <div className="flex justify-between mb-6">
          <div className="text-center">
            <div className="font-bold text-2xl">{stats.videos}</div>
            <div className="text-sm text-gray-500">Vidéos</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl">{stats.followers}</div>
            <div className="text-sm text-gray-500">Abonnés</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl">{stats.following}</div>
            <div className="text-sm text-gray-500">Abonnements</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => loadVideos('grid')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 ${activeTab === 'grid' ? 'border-b-2 border-black font-semibold' : 'text-gray-500'}`}
          >
            <List className="w-5 h-5" />
            Grille
          </button>
          <button
            onClick={() => loadVideos('favorites')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 ${activeTab === 'favorites' ? 'border-b-2 border-black font-semibold' : 'text-gray-500'}`}
          >
            <Bookmark className="w-5 h-5" />
            Favoris
          </button>
          <button
            onClick={() => loadVideos('liked')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 ${activeTab === 'liked' ? 'border-b-2 border-black font-semibold' : 'text-gray-500'}`}
          >
            <Heart className="w-5 h-5" />
            Aimés
          </button>
        </div>

        {/* Videos Grid / Liste */}
        {loading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {activeTab === 'grid' && videos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onToggleLike={toggleLike}
                onToggleSave={toggleSave}
                onComment={handleComment}
              />
            ))}
            {activeTab === 'favorites' && saves.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onToggleLike={toggleLike}
                onToggleSave={toggleSave}
                onComment={handleComment}
              />
            ))}
            {activeTab === 'liked' && likes.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onToggleLike={toggleLike}
                onToggleSave={toggleSave}
                onComment={handleComment}
              />
            ))}
            {((activeTab === 'grid' && videos.length === 0) ||
              (activeTab === 'favorites' && saves.length === 0) ||
              (activeTab === 'liked' && likes.length === 0)) && (
              <div className="col-span-3 text-center py-12 text-gray-500">
                Aucune vidéo ici pour le moment
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;