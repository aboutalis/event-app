/**
 * SUPABASE CLIENT
 * Singleton instance for database connection
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==============================================
// ENVIRONMENT VARIABLES
// ==============================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error('Missing Supabase environment variables');
}

// ==============================================
// SUPABASE CLIENT INSTANCE
// ==============================================
export const supabase: SupabaseClient = createClient(
	SUPABASE_URL,
	SUPABASE_ANON_KEY,
	{
		auth: {
			persistSession: false, // No authentication required
		},
		realtime: {
			params: {
				eventsPerSecond: 10, // Rate limit for realtime updates
			},
		},
	}
);

// ==============================================
// DATABASE TYPES
// ==============================================

export interface InvitationFamily {
	id: string;
	family_name: string;
	expected_guests: number;
	relationship_type: string;
	added_by: string;
	contact_phone: string | null;
	contact_email: string | null;
	invitation_sent: boolean;
	invitation_sent_date: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface RSVP {
	id: string;
	name: string;
	surname: string | null;
	email: string | null;
	phone: string | null;
	number_of_guests: number;
	attending: boolean;
	needs_transportation: boolean;
	dietary_requirements: string | null;
	message: string | null;
	family_id: string | null;
	is_primary_contact: boolean;
	submitted_by: string | null;
	created_at: string;
	updated_at: string;
}

export interface TableAssignment {
	id: string;
	guest_id: string | null;
	guest_name: string;
	table_number: number;
	seat_number: number | null;
	family_id: string | null;
	notes: string | null;
	created_at: string;
}

export interface SeatingTable {
	id: string;
	table_number: number;
	table_name: string | null;
	capacity: number;
	location: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface Media {
	id: string;
	file_path: string;
	thumbnail_path: string | null;
	file_type: 'image' | 'video';
	file_size: number | null;
	width: number | null;
	height: number | null;
	uploaded_by: string | null;
	created_at: string;
}

export interface Wish {
	id: string;
	author_name: string;
	message: string;
	photo_path: string | null;
	created_at: string;
}

export interface Like {
	id: string;
	wish_id: string;
	created_at: string;
	fingerprint: string;
}

// ==============================================
// STORAGE CONFIGURATION
// ==============================================
export const STORAGE_BUCKET = 'media';

/**
 * Get public URL for media file
 */
export function getMediaUrl(filePath: string): string {
	const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
	return data.publicUrl;
}

/**
 * Generate unique fingerprint for like system
 * Simple browser-based fingerprint (no tracking, just prevent duplicates)
 */
export function generateFingerprint(): string {
	const nav = navigator;
	const screen = window.screen;

	const fingerprint = [
		nav.userAgent,
		nav.language,
		screen.colorDepth,
		screen.width + 'x' + screen.height,
		new Date().getTimezoneOffset(),
	].join('|');

	// Simple hash function
	let hash = 0;
	for (let i = 0; i < fingerprint.length; i++) {
		const char = fingerprint.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}

	return Math.abs(hash).toString(36);
}
