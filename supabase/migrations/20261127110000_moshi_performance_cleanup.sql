
BEGIN;

-- Suppression des index en doublon sur les stories.
DROP INDEX IF EXISTS public.stories_expires_idx;
DROP INDEX IF EXISTS public.stories_user_idx;

-- Index pour les relations des commandes.
CREATE INDEX IF NOT EXISTS order_items_order_id_idx
ON public.order_items(order_id);

-- Index pour les vues des stories.
CREATE INDEX IF NOT EXISTS story_views_viewer_id_idx
ON public.story_views(viewer_id);

-- Index pour les événements vidéo.
CREATE INDEX IF NOT EXISTS video_events_user_id_idx
ON public.video_events(user_id);

-- Index pour les relations des vidéos.
CREATE INDEX IF NOT EXISTS videos_duet_from_id_idx
ON public.videos(duet_from_id);

CREATE INDEX IF NOT EXISTS videos_sound_id_idx
ON public.videos(sound_id);

CREATE INDEX IF NOT EXISTS videos_stitch_from_id_idx
ON public.videos(stitch_from_id);

-- Suppression des anciennes politiques de lecture redondantes.
DROP POLICY IF EXISTS video_comments_read
ON public.video_comments;

DROP POLICY IF EXISTS video_likes_read
ON public.video_likes;

COMMIT;
