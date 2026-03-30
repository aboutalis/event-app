/**
 * GALLERY COMPONENT
 * Infinite scroll grid of photos/videos
 */

import React, { useState, useEffect } from 'react';
import { X, Play } from 'lucide-react';
import { supabase, Media, getMediaUrl } from '../../lib/supabase';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { cn } from '../../lib/utils';

export function Gallery() {
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [newMediaCount, setNewMediaCount] = useState(0);

  // Fetch media with pagination
  const fetchMedia = async (offset: number, limit: number): Promise<Media[]> => {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  };

  const { items, loading, hasMore, ref, refresh, addItem } = useInfiniteScroll({
    fetchFn: fetchMedia,
    pageSize: 20,
  });

  // Realtime subscription for new media
  useEffect(() => {
    const channel = supabase
      .channel('media-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'media',
        },
        (payload) => {
          const newMedia = payload.new as Media;
          addItem(newMedia);
          setNewMediaCount((prev) => prev + 1);

          // Reset counter after 3 seconds
          setTimeout(() => setNewMediaCount(0), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addItem]);

  return (
    <div>
      {/* New media notification */}
      {newMediaCount > 0 && (
        <div className="mb-6 bg-green-100 text-green-800 rounded-lg p-4 text-center animate-in fade-in slide-in-from-top-2">
          <p className="font-medium">
            {newMediaCount} new {newMediaCount === 1 ? 'photo' : 'photos'} added!
          </p>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((media) => (
          <MediaCard
            key={media.id}
            media={media}
            onClick={() => setSelectedMedia(media)}
          />
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && !loading && <div ref={ref} className="h-20" />}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <p>No photos or videos yet. Be the first to upload!</p>
        </div>
      )}

      {/* Lightbox */}
      {selectedMedia && (
        <Lightbox media={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
    </div>
  );
}

// ==============================================
// MEDIA CARD
// ==============================================
interface MediaCardProps {
  media: Media;
  onClick: () => void;
}

function MediaCard({ media, onClick }: MediaCardProps) {
  const url = getMediaUrl(media.file_path);

  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100 group cursor-pointer"
    >
      {media.file_type === 'image' ? (
        <img
          src={url}
          alt="Wedding moment"
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="relative w-full h-full">
          <video
            src={url}
            className="w-full h-full object-cover"
            preload="metadata"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-neutral-900 ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
    </button>
  );
}

// ==============================================
// LIGHTBOX
// ==============================================
interface LightboxProps {
  media: Media;
  onClose: () => void;
}

function Lightbox({ media, onClose }: LightboxProps) {
  const url = getMediaUrl(media.file_path);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Media */}
      <div
        className="max-w-4xl w-full max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {media.file_type === 'image' ? (
          <img
            src={url}
            alt="Wedding moment"
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            className="w-full h-full rounded-lg"
          />
        )}
      </div>
    </div>
  );
}
