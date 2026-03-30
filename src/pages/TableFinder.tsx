import React, { useState, useEffect } from 'react';
import {
	Utensils,
	Wine,
	Coffee,
	ChevronLeft,
	Loader2,
	AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase, TableAssignment } from '../lib/supabase';

const MENU_FOOD = [
	{ course: 'Ορεκτικό', dish: 'Παραδοσιακός Ντάκος & Σαλάτα με Τοπική Μπουράτα' },
	{ course: 'Πρώτο Πιάτο', dish: 'Ριζότο με Άγρια Μανιτάρια και Λάδι Τρούφας' },
	{ course: 'Κυρίως Πιάτο', dish: 'Σιγομαγειρεμένο Φιλέτο Μοσχαριού με Βελούδινο Πουρέ Πατάτας' },
	{ course: 'Επιδόρπιο', dish: 'Cheesecake Λεμόνι & Η Τούρτα του Γάμου' },
];

const MENU_DRINKS = [
	{
		category: 'Επιλογή Κρασιών',
		items:
			'Μπουτάρη Μοσχοφίλερο (Λευκό) \n Κτήμα Κυρ-Γιάννη (Ερυθρό) \n Whispering Angel (Ροζέ)',
	},
	{ category: 'Μπύρες', items: 'Mythos Ice \n Fix Hellas \n Corona Extra' },
	{
		category: 'Αλκοολούχα & Κοκτέιλ',
		items: "Hendrick's Gin \n Don Julio Vodka \n Παλαιωμένη Τσικουδιά (Ρακή)",
	},
];

export function TableFinder() {
	const [query, setQuery] = useState('');
	const [hasSearched, setHasSearched] = useState(false);
	const [selectedGuest, setSelectedGuest] = useState<TableAssignment | null>(
		null
	);
	const [activePreview, setActivePreview] = useState<string | null>(null);
	const [showGuestList, setShowGuestList] = useState(false);

	// Database state
	const [allGuests, setAllGuests] = useState<TableAssignment[]>([]);
	const [tableCompanions, setTableCompanions] = useState<TableAssignment[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch all guests on component mount (for search suggestions)
	useEffect(() => {
		fetchAllGuests();
	}, []);

	const fetchAllGuests = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from('tables')
				.select('*')
				.order('guest_name', { ascending: true });

			if (error) throw error;
			setAllGuests(data || []);
		} catch (err) {
			console.error('Error fetching guests:', err);
			setError('Αποτυχία φόρτωσης λίστας καλεσμένων');
		} finally {
			setLoading(false);
		}
	};

	// Filter guests based on query
	const filteredGuests =
		query.trim() === ''
			? []
			: allGuests.filter((g) =>
					g.guest_name.toLowerCase().includes(query.toLowerCase())
				);

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (filteredGuests.length === 1) {
			await handleSelectGuest(filteredGuests[0]);
		} else {
			const exactMatch = allGuests.find(
				(g) => g.guest_name.toLowerCase() === query.toLowerCase()
			);
			if (exactMatch) await handleSelectGuest(exactMatch);
		}
	};

	const handleSelectGuest = async (guest: TableAssignment) => {
		try {
			setSearchLoading(true);
			setQuery(guest.guest_name);
			setSelectedGuest(guest);

			// Fetch all guests at the same table
			const { data, error } = await supabase
				.from('tables')
				.select('*')
				.eq('table_number', guest.table_number)
				.order('seat_number', { ascending: true });

			if (error) throw error;
			setTableCompanions(data || []);
			setHasSearched(true);
			setError(null);
		} catch (err) {
			console.error('Error fetching table companions:', err);
			setError('Αποτυχία φόρτωσης πληροφοριών τραπεζιού');
		} finally {
			setSearchLoading(false);
		}
	};

	// Helper to dynamically highlight matched substrings in names
	const renderHighlightedText = (text: string, highlight: string) => {
		if (!highlight.trim()) {
			return <span>{text}</span>;
		}
		const regex = new RegExp(`(${highlight})`, 'gi');
		const parts = text.split(regex);
		return (
			<span>
				{parts.map((part, i) =>
					regex.test(part) ? (
						<strong key={i} className="font-bold text-accent">
							{part}
						</strong>
					) : (
						<span key={i}>{part}</span>
					)
				)}
			</span>
		);
	};

	return (
		<div className="min-h-screen pt-16 px-4 sm:px-6 pb-24 overflow-x-hidden">
			{!hasSearched ? (
				<div className="animate-fade-in max-w-lg mx-auto pt-8 sm:pt-16">
					{/* Header Section */}
					<div className="text-center mb-12 sm:mb-16">
						<Utensils className="w-10 h-10 text-accent mx-auto mb-6 opacity-80" />
						<h1 className="font-serif text-5xl sm:text-6xl text-text-primary mb-4">
							Βρείτε το Τραπέζι σας
						</h1>
						<p className="font-sans text-base text-text-muted max-w-md mx-auto">
							Πληκτρολογήστε το όνομά σας για να βρείτε τη θέση σας
						</p>
					</div>

					{/* Error Message */}
					{error && (
						<div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-3">
							<AlertCircle className="w-5 h-5 text-destructive shrink-0" />
							<p className="font-sans text-sm text-destructive">{error}</p>
						</div>
					)}

					{/* Loading State */}
					{loading ? (
						<div className="flex flex-col items-center justify-center py-12">
							<Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
							<p className="font-sans text-sm text-text-muted">
								Φόρτωση λίστας καλεσμένων...
							</p>
						</div>
					) : (
						<form onSubmit={handleSearch} className="space-y-6">
							<div className="relative">
								<input
									type="text"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Το όνομά σας..."
									disabled={loading || searchLoading}
									className="w-full text-xl font-sans text-center px-6 py-4 bg-surface rounded-2xl border-2 border-secondary focus:border-accent outline-none transition-colors placeholder:text-text-muted/50 text-text-primary shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
								/>
								{searchLoading && (
									<div className="absolute right-4 top-1/2 -translate-y-1/2">
										<Loader2 className="w-5 h-5 text-accent animate-spin" />
									</div>
								)}
							</div>

							{/* Suggestions List */}
							{query.trim().length > 0 &&
								filteredGuests.length > 0 &&
								!searchLoading && (
									<div className="space-y-2 animate-fade-in max-h-[400px] overflow-y-auto">
										{filteredGuests.slice(0, 20).map((guest) => (
											<button
												key={guest.id}
												type="button"
												onClick={() => handleSelectGuest(guest)}
												className="w-full py-3 px-5 bg-surface rounded-xl border border-secondary/50 text-text-primary hover:border-accent hover:bg-accent/5 transition-all font-sans text-lg text-left shadow-soft hover:shadow-card"
											>
												{renderHighlightedText(guest.guest_name, query)}
												{guest.table_number && (
													<span className="ml-2 text-xs text-text-muted">
														• Τραπέζι {guest.table_number}
													</span>
												)}
											</button>
										))}
										{filteredGuests.length > 20 && (
											<p className="text-center text-sm text-text-muted py-2">
												Εμφάνιση των πρώτων 20 από {filteredGuests.length} αποτελέσματα
											</p>
										)}
									</div>
								)}

							{/* No Matches */}
							{query.trim().length > 0 &&
								filteredGuests.length === 0 &&
								!loading &&
								!searchLoading && (
									<div className="py-4 px-5 bg-surface rounded-xl border border-secondary/50 text-center animate-fade-in">
										<p className="font-sans text-sm text-text-muted">
											Δεν βρέθηκε καλεσμένος που να ταιριάζει με "{query}"
										</p>
									</div>
								)}
						</form>
					)}
				</div>
			) : (
				<div className="animate-fade-in space-y-8 max-w-7xl mx-auto pt-4">
					{/* Back Button */}
					<button
						onClick={() => {
							setHasSearched(false);
							setQuery('');
							setActivePreview(null);
							setSelectedGuest(null);
							setTableCompanions([]);
							setShowGuestList(false);
							setError(null);
						}}
						className="inline-flex items-center gap-2 text-text-muted hover:text-accent text-base font-sans transition-all duration-300 hover:gap-3 hover:scale-105"
					>
						<ChevronLeft className="w-5 h-5" />
						<span>Πίσω στην αναζήτηση</span>
					</button>

					{/* Error Message */}
					{error && (
						<div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-3">
							<AlertCircle className="w-5 h-5 text-destructive shrink-0" />
							<p className="font-sans text-sm text-destructive">{error}</p>
						</div>
					)}

					{/* Table Section - 3D View */}
					{selectedGuest && tableCompanions.length > 0 && (
						<section className="bg-gradient-to-br from-surface via-surface to-background rounded-3xl p-6 sm:p-10 shadow-xl border-2 border-secondary/40 transition-all duration-500">
							<div className="text-center mb-10">
								<Utensils className="w-12 h-12 text-accent mx-auto mb-5 opacity-80" />
								<h2 className="font-serif text-4xl sm:text-5xl text-text-primary mb-4 font-semibold">
									Η Θέση σας
								</h2>
								<div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 px-5 py-2.5 rounded-full">
									<span className="font-sans text-base sm:text-lg font-bold text-accent">
										Τραπέζι {selectedGuest.table_number}
									</span>
									<span className="text-text-muted">•</span>
									<span className="font-sans text-sm text-text-muted">
										Περάστε το ποντίκι πάνω από κάθε θέση για να δείτε τον καλεσμένο
									</span>
								</div>
							</div>

							{/* Side by Side Layout */}
							<div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-start">
								{/* 3D Table Visualization */}
								<div className="flex justify-center lg:justify-end">
									<TableFloorPlan3D
										selectedGuest={selectedGuest}
										activePreview={activePreview}
										setActivePreview={setActivePreview}
										guests={tableCompanions}
									/>
								</div>

								{/* Guest List - Right Side */}
								<div className="bg-background/50 rounded-2xl p-6 sm:p-7 border border-secondary/20 lg:min-w-[400px]">
									<div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-secondary/40">
										<h3 className="font-serif text-2xl sm:text-3xl text-text-primary">
											Συνοδοί Τραπεζιού
										</h3>
										<span className="text-sm font-sans font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full">
											{tableCompanions.length}{' '}
											{tableCompanions.length !== 1 ? 'Καλεσμένοι' : 'Καλεσμένος'}
										</span>
									</div>
									<div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 pb-1">
										{tableCompanions.map((guest) => {
											const initials = guest.guest_name
												.split(' ')
												.map((n) => n[0])
												.join('')
												.substring(0, 2)
												.toUpperCase();
											const isUserSeat = guest.id === selectedGuest.id;
											const isPreviewing = activePreview === guest.guest_name;

											return (
												<div
													key={guest.id}
													onMouseEnter={() =>
														setActivePreview(guest.guest_name)
													}
													onMouseLeave={() => setActivePreview(null)}
													onClick={() => setActivePreview(guest.guest_name)}
													className={cn(
														'flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer border-2',
														isPreviewing
															? 'bg-accent/15 border-accent shadow-md'
															: isUserSeat
																? 'bg-accent/10 border-accent/50'
																: 'bg-surface border-secondary/40 hover:bg-accent/5 hover:border-accent/40'
													)}
												>
													<div
														className={cn(
															'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200',
															isUserSeat
																? 'bg-accent text-white shadow-md'
																: isPreviewing
																	? 'bg-accent text-white shadow-md'
																	: 'bg-secondary/40 text-text-primary'
														)}
													>
														{initials}
													</div>
													<div className="flex-1 min-w-0">
														<div className="flex items-baseline gap-2 flex-wrap">
															<span
																className={cn(
																	'text-base sm:text-lg font-sans font-medium',
																	isUserSeat || isPreviewing
																		? 'text-accent font-semibold'
																		: 'text-text-primary'
																)}
															>
																{guest.guest_name}
															</span>
															{guest.seat_number && (
																<span className="text-sm text-text-muted font-sans">
																	• Θέση {guest.seat_number}
																</span>
															)}
														</div>
													</div>

													{isUserSeat && (
														<span className="ml-auto text-xs font-bold bg-accent text-white px-3 py-1.5 rounded-full shadow-sm">
															Εσείς
														</span>
													)}
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</section>
					)}

					{/* Menu Section - Simplified */}
					<section className="bg-surface rounded-3xl p-6 sm:p-8 md:p-10 shadow-card border border-secondary/30">
						{/* Food Menu */}
						<div className="text-center mb-10">
							<Utensils className="w-8 h-8 text-accent mx-auto mb-4 opacity-80" />
							<h2 className="font-serif text-3xl sm:text-4xl text-text-primary mb-8">
								Μενού
							</h2>

							<div className="space-y-6 max-w-2xl mx-auto">
								{MENU_FOOD.map((item, idx) => (
									<div
										key={idx}
										className="pb-6 border-b border-secondary/20 last:border-0 last:pb-0"
									>
										<p className="text-accent text-xs font-sans font-semibold uppercase tracking-wider mb-2">
											{item.course}
										</p>
										<p className="font-serif text-lg sm:text-xl text-text-primary">
											{item.dish}
										</p>
									</div>
								))}
							</div>
						</div>

						{/* Divider */}
						<div className="flex items-center justify-center gap-3 my-10">
							<div className="h-px bg-secondary w-12" />
							<Wine className="w-5 h-5 text-accent opacity-60" />
							<div className="h-px bg-secondary w-12" />
						</div>

						{/* Drinks Menu */}
						<div className="text-center">
							<h2 className="font-serif text-3xl sm:text-4xl text-text-primary mb-8">
								Ποτά
							</h2>

							<div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
								{MENU_DRINKS.map((item, idx) => (
									<div key={idx} className="bg-background/50 rounded-xl p-5">
										<p className="text-accent text-xs font-sans font-semibold uppercase tracking-wider mb-3">
											{item.category}
										</p>
										{item.items.split('\n').map((line, i) => (
											<p
												key={i}
												className="font-serif text-sm sm:text-base text-text-primary leading-relaxed"
											>
												{line.trim()}
											</p>
										))}
									</div>
								))}
							</div>

							<div className="bg-background/30 rounded-xl p-4 max-w-xs mx-auto">
								<Coffee className="w-5 h-5 text-accent mx-auto mb-2 opacity-70" />
								<p className="font-serif text-base text-text-primary">
									Espresso & Ελληνικός Καφές
								</p>
							</div>
						</div>
					</section>
				</div>
			)}
		</div>
	);
}

// ----------------------------------------------------------------------------------
// Internal Component: 3D Perspective Table View
// ----------------------------------------------------------------------------------
function TableFloorPlan3D({
	selectedGuest,
	activePreview,
	setActivePreview,
	guests,
}: {
	selectedGuest: TableAssignment;
	activePreview: string | null;
	setActivePreview: (val: string | null) => void;
	guests: TableAssignment[];
}) {
	const containerWidth = 500;

	const N = guests.length;
	const M = N - 2;
	const LEFT_COUNT = Math.ceil(M / 2);

	const rowSpacing = 70;
	const baseTableHeight = LEFT_COUNT * rowSpacing;
	const tableHeight = Math.max(220, baseTableHeight);

	const tableWidth = 200;
	const tableTop = 80;
	const centerX = containerWidth / 2;

	return (
		<div className="flex flex-col items-center w-full">
			<div
				className="relative mx-auto transition-all duration-500"
				style={{
					width: containerWidth,
					height: tableHeight + 100,
					perspective: '1200px',
					perspectiveOrigin: 'center top',
				}}
			>
				{/* Table - 3D View */}
				<div
					className="absolute left-1/2 -translate-x-1/2 bg-gradient-to-br from-amber-900/20 via-surface to-background shadow-2xl border-4 border-amber-700/30 flex items-center justify-center rounded-3xl overflow-hidden transition-all duration-500"
					style={{
						width: tableWidth,
						height: tableHeight,
						top: tableTop,
						transform: 'translateX(-50%) rotateX(35deg)',
						transformStyle: 'preserve-3d',
						boxShadow:
							'0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(217, 119, 6, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
					}}
				>
					{/* Table inner glow */}
					<div
						className="absolute inset-6 border-3 border-accent/30 rounded-2xl pointer-events-none shadow-inner"
						style={{
							boxShadow: 'inset 0 2px 8px rgba(217, 119, 6, 0.15)',
						}}
					/>
					{/* Table Number - Large and Visible */}
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div className="bg-accent/20 backdrop-blur-sm rounded-full w-20 h-20 flex items-center justify-center border-2 border-accent/40 shadow-lg">
							<span className="font-serif text-4xl text-accent font-bold drop-shadow-lg">
								{selectedGuest.table_number}
							</span>
						</div>
					</div>
				</div>

				{/* Seats - 3D Effect */}
				{guests.map((guest, idx) => {
					const isUserSeat = guest.id === selectedGuest.id;
					const initials = guest.guest_name
						.split(' ')
						.map((n) => n[0])
						.join('')
						.substring(0, 2)
						.toUpperCase();
					const isPreviewing = activePreview === guest.guest_name;

					let xPos = 0;
					let yPos = 0;

					const seatSize = 56;
					const overlap = 10;

					if (idx === 0) {
						xPos = centerX - seatSize / 2;
						yPos = tableTop - seatSize + overlap;
					} else if (idx === N - 1) {
						xPos = centerX - seatSize / 2;
						yPos = tableTop + tableHeight - overlap;
					} else if (idx >= 1 && idx <= LEFT_COUNT) {
						const localIdx = idx - 1;
						xPos = centerX - tableWidth / 2 - seatSize + overlap;
						const step =
							LEFT_COUNT > 1
								? (tableHeight - seatSize * 2) / (LEFT_COUNT - 1)
								: 0;
						yPos =
							LEFT_COUNT > 1
								? tableTop + seatSize + localIdx * step - seatSize / 2
								: tableTop + tableHeight / 2 - seatSize / 2;
					} else {
						const localIdx = idx - (LEFT_COUNT + 1);
						const RIGHT_COUNT = M - LEFT_COUNT;
						xPos = centerX + tableWidth / 2 - overlap;
						const step =
							RIGHT_COUNT > 1
								? (tableHeight - seatSize * 2) / (RIGHT_COUNT - 1)
								: 0;
						yPos =
							RIGHT_COUNT > 1
								? tableTop + seatSize + localIdx * step - seatSize / 2
								: tableTop + tableHeight / 2 - seatSize / 2;
					}

					// Calculate depth based on position for 3D effect
					let zOffset = 0;
					if (idx === 0)
						zOffset = -15; // Top seat (further back)
					else if (idx === N - 1)
						zOffset = 15; // Bottom seat (closer)
					else if (idx >= 1 && idx <= LEFT_COUNT)
						zOffset = 0; // Left side
					else zOffset = 0; // Right side

					return (
						<button
							key={guest.id}
							onMouseEnter={() => setActivePreview(guest.guest_name)}
							onMouseLeave={() => setActivePreview(null)}
							onClick={() => setActivePreview(guest.guest_name)}
							className={cn(
								'absolute rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer touch-manipulation',
								isUserSeat
									? 'bg-accent text-white border-4 border-accent/50 shadow-2xl z-20 ring-4 ring-accent/30'
									: 'bg-white text-text-primary border-3 border-slate-300 hover:border-accent hover:bg-accent hover:text-white hover:shadow-xl z-10',
								isPreviewing &&
									!isUserSeat &&
									'border-accent bg-accent text-white shadow-2xl z-30 scale-110'
							)}
							style={{
								width: seatSize,
								height: seatSize,
								left: xPos,
								top: yPos,
								transform: `translateZ(${zOffset}px) ${isUserSeat ? 'scale(1.2)' : isPreviewing ? 'scale(1.15)' : 'scale(1)'}`,
								transformStyle: 'preserve-3d',
								boxShadow:
									isUserSeat || isPreviewing
										? '0 20px 40px -10px rgba(217, 119, 6, 0.6), 0 0 20px rgba(217, 119, 6, 0.3)'
										: '0 10px 25px -5px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
							}}
							aria-label={`Προβολή στοιχείων του/της ${guest.guest_name}`}
						>
							<span
								className={cn(
									'font-sans font-bold drop-shadow-sm',
									isUserSeat || isPreviewing ? 'text-sm' : 'text-sm'
								)}
							>
								{initials}
							</span>
						</button>
					);
				})}
			</div>

			{/* Active Preview - Enhanced */}
			<div className="h-14 w-full mt-6 flex items-center justify-center">
				{activePreview ? (
					<div className="inline-flex items-center gap-3 bg-gradient-to-r from-accent/15 via-accent/10 to-accent/15 border-2 border-accent/50 px-6 py-3 rounded-full shadow-xl animate-fade-in backdrop-blur-sm transition-all duration-300">
						<span className="w-2.5 h-2.5 rounded-full bg-accent shadow-lg shadow-accent/50" />
						<span className="font-sans text-base font-bold text-accent">
							{activePreview}
						</span>
						{activePreview === selectedGuest.guest_name && (
							<span className="text-xs font-bold text-white bg-accent px-3 py-1.5 rounded-full shadow-md">
								Εσείς
							</span>
						)}
					</div>
				) : (
					<p className="font-sans text-base text-text-muted/60">
						Περάστε το ποντίκι ή πατήστε σε οποιαδήποτε θέση
					</p>
				)}
			</div>
		</div>
	);
}
