/**
 * EVENT CONFIGURATION
 * Central config for the wedding & baptism event
 */

// ==============================================
// EVENT DATE & PHASE DETECTION
// ==============================================
export const EVENT_DATE = '2026-03-18'; // YYYY-MM-DD format

export type EventPhase = 'BEFORE_EVENT' | 'EVENT_DAY' | 'AFTER_EVENT';

/**
 * Get current event phase based on today's date
 */
export function getEventPhase(): EventPhase {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const eventDate = new Date(EVENT_DATE);
	eventDate.setHours(0, 0, 0, 0);

	const dayAfterEvent = new Date(eventDate);
	dayAfterEvent.setDate(dayAfterEvent.getDate() + 1);

	if (today < eventDate) {
		return 'BEFORE_EVENT';
	} else if (today.getTime() === eventDate.getTime()) {
		return 'EVENT_DAY';
	} else {
		return 'AFTER_EVENT';
	}
}

// ==============================================
// EVENT DETAILS
// ==============================================
export const EVENT_INFO = {
	coupleName: 'Sofia & Alexander',
	eventTitle: 'Wedding & Baptism Celebration',
	eventDate: EVENT_DATE,
	hashtag: '#SofiaAndAlexander2026',
};

// ==============================================
// EVENT SCHEDULE
// ==============================================
export interface ScheduleEvent {
	id: string;
	title: string;
	time: string;
	location: string;
	description: string;
	// Time in 24h format for highlighting current event
	startTime: string; // HH:MM
	endTime: string; // HH:MM
}

export const SCHEDULE: ScheduleEvent[] = [
	{
		id: 'ceremony',
		title: 'Wedding Ceremony',
		time: '2:00 PM',
		startTime: '14:00',
		endTime: '15:00',
		location: "St. Mary's Cathedral",
		description: 'Join us for our sacred wedding ceremony',
	},
	{
		id: 'baptism',
		title: 'Baptism Ceremony',
		time: '3:30 PM',
		startTime: '15:30',
		endTime: '16:15',
		location: "St. Mary's Cathedral",
		description: 'Baptism of our beloved child',
	},
	{
		id: 'photos',
		title: 'Group Photos',
		time: '4:30 PM',
		startTime: '16:30',
		endTime: '17:30',
		location: 'Cathedral Gardens',
		description: 'Family and group photography session',
	},
	{
		id: 'cocktails',
		title: 'Cocktail Hour',
		time: '6:00 PM',
		startTime: '18:00',
		endTime: '19:00',
		location: 'Grand Ballroom Terrace',
		description: 'Welcome drinks and canapés',
	},
	{
		id: 'reception',
		title: 'Reception & Dinner',
		time: '7:00 PM',
		startTime: '19:00',
		endTime: '22:00',
		location: 'Grand Ballroom',
		description: 'Three-course dinner and toasts',
	},
	{
		id: 'party',
		title: 'Dancing & Celebration',
		time: '10:00 PM',
		startTime: '22:00',
		endTime: '02:00',
		location: 'Grand Ballroom',
		description: "Let's celebrate into the night!",
	},
];

/**
 * Get current event based on time
 */
export function getCurrentEvent(): ScheduleEvent | null {
	const now = new Date();
	const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

	return (
		SCHEDULE.find((event) => {
			return currentTime >= event.startTime && currentTime < event.endTime;
		}) || null
	);
}

// ==============================================
// LOCATIONS
// ==============================================
export interface Location {
	id: string;
	name: string;
	address: string;
	mapUrl: string;
	description?: string;
}

export const LOCATIONS: Location[] = [
	{
		id: 'ceremony',
		name: "St. Mary's Cathedral",
		address: '123 Church Street, Cityville, ST 12345',
		mapUrl: 'https://maps.google.com/?q=St+Marys+Cathedral',
		description: 'Historic cathedral in the heart of the city',
	},
	{
		id: 'reception',
		name: 'The Grand Hotel',
		address: '456 Celebration Avenue, Cityville, ST 12345',
		mapUrl: 'https://maps.google.com/?q=The+Grand+Hotel',
		description: 'Luxury ballroom with stunning city views',
	},
];

// ==============================================
// TRAVEL & ACCOMMODATION
// ==============================================
export interface Accommodation {
	id: string;
	name: string;
	address: string;
	phone: string;
	website: string;
	notes: string;
}

export const ACCOMMODATIONS: Accommodation[] = [
	{
		id: 'grand',
		name: 'The Grand Hotel',
		address: '456 Celebration Avenue',
		phone: '+1 (555) 123-4567',
		website: 'https://thegrandhotel.com',
		notes: 'Special rate available - mention "Sofia & Alexander Wedding"',
	},
	{
		id: 'marriott',
		name: 'Marriott Downtown',
		address: '789 Main Street',
		phone: '+1 (555) 234-5678',
		website: 'https://marriott.com',
		notes: '5 minutes walk from venue',
	},
	{
		id: 'hilton',
		name: 'Hilton Garden Inn',
		address: '321 Park Boulevard',
		phone: '+1 (555) 345-6789',
		website: 'https://hilton.com',
		notes: 'Free shuttle service to venue',
	},
];

export const TRAVEL_INFO = {
	airport: {
		name: 'Cityville International Airport (CVA)',
		distance: '25 miles from venue',
		taxi: 'Approximately $45-60',
		uber: 'Approximately $35-50',
	},
	parking: {
		venue: 'Free valet parking available at The Grand Hotel',
		cathedral: 'Limited street parking, recommend ride-sharing',
	},
};
