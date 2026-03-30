/**
 * WISHES COMPONENT
 * Instagram-like feed with likes
 */

import React, { useState, useEffect } from 'react';
import { Heart, Send } from 'lucide-react';
import { supabase, Wish, generateFingerprint } from '../../lib/supabase';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { FormInput } from '../ui/FormInput';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const FINGERPRINT = generateFingerprint();

export function Wishes() {
	const [name, setName] = useState('');
	const [message, setMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);

	// Fetch wishes with pagination
	const fetchWishes = async (
		offset: number,
		limit: number
	): Promise<Wish[]> => {
		const { data, error } = await supabase
			.from('wishes')
			.select(
				`
        *,
        like_count:likes(count),
        user_has_liked:likes!inner(fingerprint)
      `
			)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) throw error;

		// Process likes data
		return (data || []).map((wish: any) => ({
			id: wish.id,
			author_name: wish.author_name,
			message: wish.message,
			created_at: wish.created_at,
			like_count: wish.like_count?.[0]?.count || 0,
			user_has_liked:
				wish.user_has_liked?.some((l: any) => l.fingerprint === FINGERPRINT) ||
				false,
		}));
	};

	const { items, loading, hasMore, ref, refresh, addItem } = useInfiniteScroll({
		fetchFn: fetchWishes,
		pageSize: 20,
	});

	// Realtime subscription for new wishes
	useEffect(() => {
		const channel = supabase
			.channel('wishes-changes')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'wishes',
				},
				async (payload) => {
					const newWish = payload.new as Wish;
					newWish.like_count = 0;
					newWish.user_has_liked = false;
					addItem(newWish);
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [addItem]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!message.trim()) {
			toast.error('Please write a message');
			return;
		}

		setSubmitting(true);

		try {
			const { error } = await supabase.from('wishes').insert({
				author_name: name.trim() || 'Anonymous',
				message: message.trim(),
			});

			if (error) throw error;

			toast.success('Wish posted successfully!');
			setMessage('');
			setName('');
		} catch (err) {
			toast.error('Failed to post wish. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="space-y-8">
			{/* Post Form */}
			<Card>
				<CardContent className="p-6">
					<h3 className="text-xl font-semibold text-neutral-900 mb-4">
						Share Your Wishes
					</h3>

					<form onSubmit={handleSubmit} className="space-y-4">
						<FormInput
							type="text"
							placeholder="Your name (optional)"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={50}
						/>

						<div>
							<textarea
								placeholder="Write your message..."
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								maxLength={500}
								rows={4}
								className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all duration-200 resize-none"
								required
							/>
							<div className="flex justify-between items-center mt-2">
								<p className="text-xs text-neutral-500">
									{message.length}/500 characters
								</p>
							</div>
						</div>

						<Button
							type="submit"
							variant="primary"
							size="lg"
							loading={submitting}
							className="w-full"
						>
							<Send className="w-5 h-5 mr-2" />
							Post Wish
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Wishes Feed */}
			<div className="space-y-4">
				{items.map((wish) => (
					<WishCard key={wish.id} wish={wish} onLikeChange={refresh} />
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
					<p>No wishes yet. Be the first to share yours!</p>
				</div>
			)}
		</div>
	);
}

// ==============================================
// WISH CARD
// ==============================================
interface WishCardProps {
	wish: Wish;
	onLikeChange: () => void;
}

function WishCard({ wish, onLikeChange }: WishCardProps) {
	const [liked, setLiked] = useState(wish.user_has_liked);
	const [likeCount, setLikeCount] = useState(wish.like_count || 0);
	const [liking, setLiking] = useState(false);

	const handleLike = async () => {
		if (liking) return;

		setLiking(true);

		try {
			if (liked) {
				// Unlike
				const { error } = await supabase
					.from('likes')
					.delete()
					.eq('wish_id', wish.id)
					.eq('fingerprint', FINGERPRINT);

				if (!error) {
					setLiked(false);
					setLikeCount((prev) => Math.max(0, prev - 1));
				}
			} else {
				// Like
				const { error } = await supabase.from('likes').insert({
					wish_id: wish.id,
					fingerprint: FINGERPRINT,
				});

				if (!error) {
					setLiked(true);
					setLikeCount((prev) => prev + 1);
				}
			}
		} catch (err) {
			// Ignore duplicate errors
		} finally {
			setLiking(false);
		}
	};

	return (
		<Card>
			<CardContent className="p-6">
				<div className="space-y-4">
					{/* Header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white font-semibold">
								{wish.author_name[0].toUpperCase()}
							</div>
							<div>
								<p className="font-semibold text-neutral-900">
									{wish.author_name}
								</p>
								<p className="text-xs text-neutral-500">
									{formatDistanceToNow(new Date(wish.created_at), {
										addSuffix: true,
									})}
								</p>
							</div>
						</div>
					</div>

					{/* Message */}
					<p className="text-neutral-700 whitespace-pre-wrap">{wish.message}</p>

					{/* Like button */}
					<div className="flex items-center gap-3 pt-2">
						<button
							onClick={handleLike}
							disabled={liking}
							className="flex items-center gap-2 group transition-all duration-200"
						>
							<Heart
								className={`w-6 h-6 transition-all duration-200 ${
									liked
										? 'fill-rose-500 text-rose-500'
										: 'text-neutral-400 group-hover:text-rose-500 group-hover:scale-110'
								}`}
							/>
							{likeCount > 0 && (
								<span className="text-sm font-medium text-neutral-700">
									{likeCount}
								</span>
							)}
						</button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
