import React, { useState, useEffect, useRef } from 'react';
import {
	Upload as UploadIcon,
	X,
	ChevronLeft,
	ChevronRight,
	Download,
	Camera,
	Image as ImageIcon,
	Plus,
} from 'lucide-react';
import { supabase, Media, getMediaUrl } from '../lib/supabase';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { uploadQueue, validateFile } from '../lib/upload';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';

export function Moments() {
	const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(
		null
	);
	const [showUploadModal, setShowUploadModal] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Fetch media with pagination
	const fetchMedia = async (
		offset: number,
		limit: number
	): Promise<Media[]> => {
		const { data, error } = await supabase
			.from('media')
			.select('*')
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) throw error;
		return data || [];
	};

	const { items, loading, hasMore, ref, addItem } = useInfiniteScroll({
		fetchFn: fetchMedia,
		pageSize: 20,
	});

	// Subscribe to your own upload completions
	useEffect(() => {
		const unsubscribe = uploadQueue.onUploadComplete((mediaRecord) => {
			addItem(mediaRecord as Media);
		});
		return unsubscribe;
	}, [addItem]);

	// Realtime subscription
	useEffect(() => {
		const timer = setTimeout(() => {
			const channel = supabase
				.channel(`media-changes-${Date.now()}`)
				.on(
					'postgres_changes',
					{ event: 'INSERT', schema: 'public', table: 'media' },
					(payload) => {
						addItem(payload.new as Media);
					}
				)
				.subscribe();

			return () => {
				supabase.removeChannel(channel);
			};
		}, 1000);
		return () => clearTimeout(timer);
	}, [addItem]);

	return (
		<div className="min-h-screen pt-24 pb-48 overflow-x-hidden">
			{/* Header Section */}
			<div className="px-5 max-w-7xl mx-auto mb-16 text-center">
				<span className="font-sans text-[11px] uppercase font-bold tracking-[0.4em] text-accent mb-6 block">
					Shared Memories
				</span>
				<h1 className="font-serif text-6xl sm:text-7xl md:text-8xl leading-[1] tracking-tight text-text-primary mb-8 px-4">
					Οι <span className="italic text-accent">Στιγμές</span> μας
				</h1>
				<p className="font-sans text-lg sm:text-xl leading-relaxed text-text-muted px-4 max-w-2xl mx-auto">
					Απαθανατίστε και μοιραστείτε τις αγαπημένες σας στιγμές από το τριήμερο. Η δική σας ματιά είναι το πιο πολύτιμο ενθύμιο για εμάς.
				</p>
			</div>

			{/* Upload Floating Button */}
			<div className="fixed bottom-32 right-6 z-40 md:bottom-12 md:right-12">
				<button
					onClick={() => setShowUploadModal(true)}
					className="w-16 h-16 bg-text-primary text-surface rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group"
				>
					<Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
				</button>
			</div>

			{/* Gallery Grid */}
			<div className="px-4 max-w-7xl mx-auto">
				<div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
					{items.map((media, idx) => (
						<div
							key={media.id}
							onClick={() => setSelectedMediaIndex(idx)}
							className="relative group cursor-pointer overflow-hidden rounded-2xl md:rounded-3xl border border-white/20 shadow-sm transition-transform duration-500 hover:-translate-y-1"
						>
							<img
								src={getMediaUrl(media.storage_path)}
								alt=""
								className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
								loading="lazy"
							/>
							<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
								<Camera className="w-8 h-8 text-white opacity-80" />
							</div>
						</div>
					))}
				</div>

				{/* Loading indicator */}
				<div ref={ref} className="py-12 flex justify-center">
					{loading && (
						<div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
					)}
					{!hasMore && items.length > 0 && (
						<p className="font-serif italic text-text-muted">Τέλος συλλογής</p>
					)}
				</div>
			</div>

			{/* Lightbox & Upload Modal placeholders (logic remains same, just styling/labels) */}
			{/* ... rest of the component ... */}
		</div>
	);
}
