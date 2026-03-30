/**
 * RSVP PAGE — 3-step wizard
 * Step 1: Your details
 * Step 2: Add guests (simple, one at a time)
 * Step 3: Review & confirm
 */

import React, { useState } from 'react';
import {
	Heart,
	CheckCircle2,
	ChevronRight,
	ChevronLeft,
	UserPlus,
	Trash2,
	Pencil,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────
interface GuestEntry {
	name: string;
	surname: string;
	email: string;
	phone: string;
	dietaryRequirements: string;
	needsTransportation: boolean;
}

interface InvitationFamily {
	id: string;
	family_name: string;
	expected_guests: number;
}

const emptyGuest = (): GuestEntry => ({
	name: '',
	surname: '',
	email: '',
	phone: '',
	dietaryRequirements: '',
	needsTransportation: false,
});

// ─── Shared input style — large & clear for all ages ───────────────────────
const field =
	'w-full px-5 py-4 rounded-2xl border-2 border-neutral-200 bg-white text-neutral-900 text-lg placeholder:text-neutral-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200';

const errField =
	'w-full px-5 py-4 rounded-2xl border-2 border-red-400 bg-white text-neutral-900 text-lg placeholder:text-neutral-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all duration-200';

// ─── TransportToggle ────────────────────────────────────────────────────────
function TransportToggle({
	value,
	onChange,
}: {
	value: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<button
			type="button"
			onClick={() => onChange(!value)}
			className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all duration-200 text-left ${
				value
					? 'border-green-400 bg-green-50 text-green-900'
					: 'border-neutral-200 bg-white text-neutral-700'
			}`}
		>
			<span className="text-lg font-medium">
				{value ? '🚌 Ναι, χρειάζομαι μεταφορά' : '🚗 Δεν χρειάζομαι μεταφορά'}
			</span>
			<div
				className={`relative w-14 h-7 rounded-full transition-colors duration-200 shrink-0 ${
					value ? 'bg-green-500' : 'bg-neutral-300'
				}`}
			>
				<div
					className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
						value ? 'translate-x-7' : 'translate-x-0'
					}`}
				/>
			</div>
		</button>
	);
}

// ─── GuestCard (summary) ────────────────────────────────────────────────────
function GuestCard({
	guest,
	label,
	onEdit,
	onRemove,
}: {
	guest: GuestEntry;
	label: string;
	onEdit?: () => void;
	onRemove?: () => void;
}) {
	return (
		<div className="bg-white rounded-2xl border-2 border-neutral-100 p-5 space-y-1">
			<div className="flex items-start justify-between gap-2">
				<div>
					<p className="text-xs uppercase tracking-widest font-bold text-neutral-400 mb-1">
						{label}
					</p>
					<p className="text-xl font-semibold text-neutral-900">
						{guest.name} {guest.surname}
					</p>
				</div>
				<div className="flex gap-2 mt-1">
					{onEdit && (
						<button
							type="button"
							onClick={onEdit}
							className="p-2 rounded-xl text-neutral-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
						>
							<Pencil className="w-4 h-4" />
						</button>
					)}
					{onRemove && (
						<button
							type="button"
							onClick={onRemove}
							className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
						>
							<Trash2 className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>
			<div className="text-sm text-neutral-500 space-y-0.5 pt-1">
				{guest.phone && <p>📞 {guest.phone}</p>}
				{guest.email && <p>✉️ {guest.email}</p>}
				{guest.dietaryRequirements && <p>🍽 {guest.dietaryRequirements}</p>}
				<p>
					{guest.needsTransportation
						? '🚌 Χρειάζεται μεταφορά'
						: '🚗 Δεν χρειάζεται μεταφορά'}
				</p>
			</div>
		</div>
	);
}

// ─── Page ───────────────────────────────────────────────────────────────────
export function RSVP() {
	const navigate = useNavigate();
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [submitted, setSubmitted] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const [attending, setAttending] = useState<'yes' | 'no'>('yes');
	const [message, setMessage] = useState('');
	const [primary, setPrimary] = useState<GuestEntry>(emptyGuest());
	const [additionalGuests, setAdditionalGuests] = useState<GuestEntry[]>([]);

	// Family selection
	const [families, setFamilies] = useState<InvitationFamily[]>([]);
	const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
	const [loadingFamilies, setLoadingFamilies] = useState(true);

	// Guest being currently edited in step 2
	const [draftGuest, setDraftGuest] = useState<GuestEntry>(emptyGuest());
	const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
	// -1 = new guest, ≥0 = editing existing
	const [editingIndex, setEditingIndex] = useState<number>(-1);
	const [showGuestForm, setShowGuestForm] = useState(false);

	const [primaryErrors, setPrimaryErrors] = useState<Record<string, string>>(
		{}
	);

	// Fetch families on mount
	React.useEffect(() => {
		fetchFamilies();
	}, []);

	const fetchFamilies = async () => {
		setLoadingFamilies(true);
		try {
			const { data, error } = await supabase
				.from('invitation_families')
				.select('id, family_name, expected_guests')
				.order('family_name');

			if (error) throw error;
			setFamilies(data || []);
		} catch (err) {
			console.error('Error fetching families:', err);
			toast.error('Αποτυχία φόρτωσης οικογενειών');
		} finally {
			setLoadingFamilies(false);
		}
	};

	// ── Step 1 validation ──
	const validatePrimary = () => {
		const errs: Record<string, string> = {};
		if (!selectedFamilyId) errs.family = 'Παρακαλώ επιλέξτε την οικογένεια/ομάδα σας';
		if (!primary.name.trim()) errs.name = 'Το όνομα είναι υποχρεωτικό';
		if (!primary.surname.trim()) errs.surname = 'Το επώνυμο είναι υποχρεωτικό';
		if (primary.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primary.email))
			errs.email = 'Μη έγκυρο email';
		setPrimaryErrors(errs);
		return Object.keys(errs).length === 0;
	};

	// ── Draft guest validation ──
	const validateDraft = () => {
		const errs: Record<string, string> = {};
		if (!draftGuest.name.trim()) errs.name = 'Το όνομα είναι υποχρεωτικό';
		if (!draftGuest.surname.trim()) errs.surname = 'Το επώνυμο είναι υποχρεωτικό';
		if (
			draftGuest.email &&
			!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftGuest.email)
		)
			errs.email = 'Μη έγκυρο email';
		setDraftErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const saveGuest = () => {
		if (!validateDraft()) return;
		if (editingIndex >= 0) {
			setAdditionalGuests((prev) =>
				prev.map((g, i) => (i === editingIndex ? draftGuest : g))
			);
		} else {
			setAdditionalGuests((prev) => [...prev, draftGuest]);
		}
		setDraftGuest(emptyGuest());
		setDraftErrors({});
		setEditingIndex(-1);
		setShowGuestForm(false);
	};

	const startEditGuest = (index: number) => {
		setDraftGuest(additionalGuests[index]);
		setEditingIndex(index);
		setDraftErrors({});
		setShowGuestForm(true);
	};

	const removeGuest = (index: number) =>
		setAdditionalGuests((prev) => prev.filter((_, i) => i !== index));

	const goToStep2 = () => {
		if (!validatePrimary()) return;
		if (attending === 'no') {
			setStep(3);
			return;
		}
		setStep(2);
	};

	// ── Submit ──
	const handleSubmit = async () => {
		setSubmitting(true);
		try {
			const { data: pData, error: pErr } = await supabase
				.from('rsvp')
				.insert({
					name: primary.name.trim(),
					surname: primary.surname.trim(),
					email: primary.email.trim() || null,
					phone: primary.phone.trim() || null,
					attending: attending === 'yes',
					needs_transportation: primary.needsTransportation,
					dietary_requirements: primary.dietaryRequirements.trim() || null,
					message: message.trim() || null,
					submitted_by: null,
					family_id: selectedFamilyId || null,
					is_primary_contact: true,
				})
				.select('id')
				.single();

			if (pErr) throw pErr;

			if (additionalGuests.length > 0) {
				const rows = additionalGuests.map((g) => ({
					name: g.name.trim(),
					surname: g.surname.trim(),
					email: g.email.trim() || null,
					phone: g.phone.trim() || null,
					attending: attending === 'yes',
					needs_transportation: g.needsTransportation,
					dietary_requirements: g.dietaryRequirements.trim() || null,
					message: message.trim() || null,
					submitted_by: pData.id,
					family_id: selectedFamilyId || null,
					is_primary_contact: false,
				}));
				const { error: aErr } = await supabase.from('rsvp').insert(rows);
				if (aErr) throw aErr;
			}

			setSubmitted(true);
			toast.success(
				attending === 'yes'
					? "Η απάντηση υποβλήθηκε! Χαιρόμαστε πολύ που θα γιορτάσουμε μαζί σας!"
					: "Η απάντηση υποβλήθηκε! Θα μας λείψετε, αλλά ευχαριστούμε που μας ενημερώσατε."
			);
			setTimeout(() => navigate('/'), 3000);
		} catch (err) {
			toast.error('Αποτυχία υποβολής απάντησης. Παρακαλώ δοκιμάστε ξανά.');
			console.error(err);
		} finally {
			setSubmitting(false);
		}
	};

	// ── Success ──
	if (submitted) {
		return (
			<div className="min-h-screen flex items-center justify-center px-6">
				<div className="text-center space-y-6 max-w-md mx-auto">
					<div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
						<CheckCircle2 className="w-12 h-12 text-green-600" />
					</div>
					<h2 className="text-3xl font-serif text-neutral-900">Ευχαριστούμε!</h2>
					<p className="text-lg text-neutral-600">
						{attending === 'yes'
							? "Χαιρόμαστε πολύ που θα γιορτάσουμε μαζί σας!"
							: "Θα μας λείψετε, αλλά ευχαριστούμε που μας ενημερώσατε."}
					</p>
					<p className="text-sm text-neutral-400">
						Ανακατεύθυνση στην αρχική σελίδα...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-neutral-50 pb-24">
			{/* Header */}
			<div className="py-12 px-6 text-center">
				<Heart className="w-10 h-10 text-amber-500 mx-auto mb-4" />
				<h1 className="text-4xl font-serif text-neutral-900">Απάντηση Πρόσκλησης</h1>
			</div>

			{/* Step indicator */}
			<div className="max-w-lg mx-auto px-6 mb-8">
				<div className="flex items-center gap-2">
					{[
						{ n: 1, label: 'Τα στοιχεία σας' },
						{ n: 2, label: 'Προσθήκη καλεσμένων' },
						{ n: 3, label: 'Έλεγχος' },
					].map(({ n, label }, i, arr) => (
						<React.Fragment key={n}>
							<div className="flex items-center gap-2">
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
										step === n
											? 'bg-amber-500 text-white'
											: step > n
												? 'bg-green-500 text-white'
												: 'bg-neutral-200 text-neutral-500'
									}`}
								>
									{step > n ? '✓' : n}
								</div>
								<span
									className={`text-sm font-medium hidden sm:block ${
										step === n ? 'text-neutral-900' : 'text-neutral-400'
									}`}
								>
									{label}
								</span>
							</div>
							{i < arr.length - 1 && (
								<div
									className={`flex-1 h-0.5 ${step > n ? 'bg-green-400' : 'bg-neutral-200'}`}
								/>
							)}
						</React.Fragment>
					))}
				</div>
			</div>

			<div className="max-w-lg mx-auto px-6 space-y-4">
				{/* ── STEP 1: Your details ─────────────────────────────── */}
				{step === 1 && (
					<div className="space-y-4 animate-fade-in">
						{/* Family Selection */}
						<div>
							<label className="block text-neutral-700 font-medium text-base mb-2 pl-1">
								Επιλέξτε την οικογένεια/ομάδα σας *
							</label>
							<select
								value={selectedFamilyId}
								onChange={(e) => {
									setSelectedFamilyId(e.target.value);
									setPrimaryErrors((prev) => {
										const n = { ...prev };
										delete n.family;
										return n;
									});
								}}
								className={primaryErrors.family ? errField : field}
								disabled={loadingFamilies}
							>
								<option value="">
									{loadingFamilies
										? 'Φόρτωση οικογενειών...'
										: 'Επιλέξτε την οικογένεια/ομάδα σας'}
								</option>
								{families.map((family) => (
									<option key={family.id} value={family.id}>
										{family.family_name} (Αναμένονται: {family.expected_guests}{' '}
										{family.expected_guests === 1 ? 'άτομο' : 'άτομα'})
									</option>
								))}
							</select>
							{primaryErrors.family && (
								<p className="text-red-500 text-sm mt-1 pl-2">
									{primaryErrors.family}
								</p>
							)}
							{selectedFamilyId && (
								<p className="text-sm text-neutral-500 mt-2 pl-2">
									ℹ️ Μπορείτε να προσθέσετε τα μέλη της οικογένειάς σας στο επόμενο βήμα
								</p>
							)}
						</div>

						{/* Attending */}
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => setAttending('yes')}
								className={`p-5 rounded-2xl border-2 text-center transition-all duration-200 ${
									attending === 'yes'
										? 'border-green-500 bg-green-50 text-green-900'
										: 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
								}`}
							>
								<p className="text-2xl mb-1">🥂</p>
								<p className="font-semibold text-lg">Ναι!</p>
								<p className="text-sm opacity-70">Θα είμαι εκεί</p>
							</button>
							<button
								type="button"
								onClick={() => setAttending('no')}
								className={`p-5 rounded-2xl border-2 text-center transition-all duration-200 ${
									attending === 'no'
										? 'border-red-400 bg-red-50 text-red-900'
										: 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
								}`}
							>
								<p className="text-2xl mb-1">😔</p>
								<p className="font-semibold text-lg">Λυπάμαι</p>
								<p className="text-sm opacity-70">Δεν μπορώ να έρθω</p>
							</button>
						</div>

						<input
							type="text"
							placeholder="Όνομα *"
							value={primary.name}
							onChange={(e) => {
								setPrimary((p) => ({ ...p, name: e.target.value }));
								setPrimaryErrors((prev) => {
									const n = { ...prev };
									delete n.name;
									return n;
								});
							}}
							className={primaryErrors.name ? errField : field}
						/>
						{primaryErrors.name && (
							<p className="text-red-500 text-sm -mt-2 pl-2">
								{primaryErrors.name}
							</p>
						)}

						<input
							type="text"
							placeholder="Επώνυμο *"
							value={primary.surname}
							onChange={(e) => {
								setPrimary((p) => ({ ...p, surname: e.target.value }));
								setPrimaryErrors((prev) => {
									const n = { ...prev };
									delete n.surname;
									return n;
								});
							}}
							className={primaryErrors.surname ? errField : field}
						/>
						{primaryErrors.surname && (
							<p className="text-red-500 text-sm -mt-2 pl-2">
								{primaryErrors.surname}
							</p>
						)}

						<input
							type="tel"
							placeholder="Τηλέφωνο"
							value={primary.phone}
							onChange={(e) =>
								setPrimary((p) => ({ ...p, phone: e.target.value }))
							}
							className={field}
						/>

						<input
							type="email"
							placeholder="Email (προαιρετικό)"
							value={primary.email}
							onChange={(e) => {
								setPrimary((p) => ({ ...p, email: e.target.value }));
								setPrimaryErrors((prev) => {
									const n = { ...prev };
									delete n.email;
									return n;
								});
							}}
							className={primaryErrors.email ? errField : field}
						/>
						{primaryErrors.email && (
							<p className="text-red-500 text-sm -mt-2 pl-2">
								{primaryErrors.email}
							</p>
						)}

						<input
							type="text"
							placeholder="Αλλεργίες ή διατροφικές ανάγκες"
							value={primary.dietaryRequirements}
							onChange={(e) =>
								setPrimary((p) => ({
									...p,
									dietaryRequirements: e.target.value,
								}))
							}
							className={field}
						/>

						{attending === 'yes' && (
							<TransportToggle
								value={primary.needsTransportation}
								onChange={(v) =>
									setPrimary((p) => ({ ...p, needsTransportation: v }))
								}
							/>
						)}

						<button
							type="button"
							onClick={goToStep2}
							className="w-full bg-neutral-900 text-white py-5 rounded-2xl text-xl font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
						>
							Συνέχεια <ChevronRight className="w-6 h-6" />
						</button>
					</div>
				)}

				{/* ── STEP 2: Add guests ───────────────────────────────── */}
				{step === 2 && (
					<div className="space-y-4 animate-fade-in">
						<p className="text-center text-neutral-500 text-lg">
							Φέρνετε κάποιον μαζί σας;
						</p>

						{/* Already-added guests */}
						{additionalGuests.map((g, i) => (
							<GuestCard
								key={i}
								guest={g}
								label={`Καλεσμένος ${i + 1}`}
								onEdit={() => startEditGuest(i)}
								onRemove={() => removeGuest(i)}
							/>
						))}

						{/* Draft guest form */}
						{showGuestForm ? (
							<div className="bg-white rounded-2xl border-2 border-amber-200 p-5 space-y-3">
								<p className="font-semibold text-neutral-700 text-lg">
									{editingIndex >= 0
										? `Επεξεργασία Καλεσμένου ${editingIndex + 1}`
										: 'Νέος Καλεσμένος'}
								</p>

								<input
									type="text"
									placeholder="Όνομα *"
									value={draftGuest.name}
									onChange={(e) => {
										setDraftGuest((d) => ({ ...d, name: e.target.value }));
										setDraftErrors((p) => {
											const n = { ...p };
											delete n.name;
											return n;
										});
									}}
									className={draftErrors.name ? errField : field}
								/>
								{draftErrors.name && (
									<p className="text-red-500 text-sm pl-2">
										{draftErrors.name}
									</p>
								)}

								<input
									type="text"
									placeholder="Επώνυμο *"
									value={draftGuest.surname}
									onChange={(e) => {
										setDraftGuest((d) => ({ ...d, surname: e.target.value }));
										setDraftErrors((p) => {
											const n = { ...p };
											delete n.surname;
											return n;
										});
									}}
									className={draftErrors.surname ? errField : field}
								/>
								{draftErrors.surname && (
									<p className="text-red-500 text-sm pl-2">
										{draftErrors.surname}
									</p>
								)}

								<input
									type="tel"
									placeholder="Τηλέφωνο"
									value={draftGuest.phone}
									onChange={(e) =>
										setDraftGuest((d) => ({ ...d, phone: e.target.value }))
									}
									className={field}
								/>
								<input
									type="email"
									placeholder="Email (προαιρετικό)"
									value={draftGuest.email}
									onChange={(e) => {
										setDraftGuest((d) => ({ ...d, email: e.target.value }));
										setDraftErrors((p) => {
											const n = { ...p };
											delete n.email;
											return n;
										});
									}}
									className={draftErrors.email ? errField : field}
								/>
								{draftErrors.email && (
									<p className="text-red-500 text-sm pl-2">
										{draftErrors.email}
									</p>
								)}

								<input
									type="text"
									placeholder="Αλλεργίες ή διατροφικές ανάγκες"
									value={draftGuest.dietaryRequirements}
									onChange={(e) =>
										setDraftGuest((d) => ({
											...d,
											dietaryRequirements: e.target.value,
										}))
									}
									className={field}
								/>
								<TransportToggle
									value={draftGuest.needsTransportation}
									onChange={(v) =>
										setDraftGuest((d) => ({ ...d, needsTransportation: v }))
									}
								/>

								<div className="flex gap-3 pt-1">
									<button
										type="button"
										onClick={() => {
											setShowGuestForm(false);
											setDraftGuest(emptyGuest());
											setDraftErrors({});
											setEditingIndex(-1);
										}}
										className="flex-1 py-4 rounded-2xl border-2 border-neutral-200 text-neutral-600 font-semibold text-lg hover:bg-neutral-50 transition-colors"
									>
										Ακύρωση
									</button>
									<button
										type="button"
										onClick={saveGuest}
										className="flex-1 py-4 rounded-2xl bg-amber-500 text-white font-semibold text-lg hover:bg-amber-600 transition-colors"
									>
										{editingIndex >= 0 ? 'Αποθήκευση Αλλαγών' : 'Προσθήκη Καλεσμένου'}
									</button>
								</div>
							</div>
						) : (
							<button
								type="button"
								onClick={() => {
									setDraftGuest(emptyGuest());
									setEditingIndex(-1);
									setDraftErrors({});
									setShowGuestForm(true);
								}}
								className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 text-lg font-medium hover:border-amber-400 hover:text-amber-600 transition-all"
							>
								<UserPlus className="w-6 h-6" />
								Προσθήκη καλεσμένου
							</button>
						)}

						<div className="flex gap-3 pt-2">
							<button
								type="button"
								onClick={() => setStep(1)}
								className="flex items-center gap-1 px-5 py-4 rounded-2xl border-2 border-neutral-200 text-neutral-600 font-semibold text-lg hover:bg-neutral-50 transition-colors"
							>
								<ChevronLeft className="w-5 h-5" /> Πίσω
							</button>
							<button
								type="button"
								onClick={() => setStep(3)}
								className="flex-1 bg-neutral-900 text-white py-4 rounded-2xl text-xl font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
							>
								Έλεγχος Απάντησης <ChevronRight className="w-6 h-6" />
							</button>
						</div>
					</div>
				)}

				{/* ── STEP 3: Review & confirm ─────────────────────────── */}
				{step === 3 && (
					<div className="space-y-4 animate-fade-in">
						<div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 text-center">
							<p className="text-amber-800 font-semibold text-lg">
								{attending === 'yes'
									? `🥂 Θα παρευρεθώ — ${1 + additionalGuests.length} ${1 + additionalGuests.length === 1 ? 'άτομο' : 'άτομα'}`
									: '😔 Δεν θα παρευρεθώ'}
							</p>
						</div>

						<GuestCard guest={primary} label="Εσείς" onEdit={() => setStep(1)} />

						{additionalGuests.map((g, i) => (
							<GuestCard
								key={i}
								guest={g}
								label={`Καλεσμένος ${i + 1}`}
								onEdit={() => {
									setStep(2);
									startEditGuest(i);
								}}
								onRemove={() => removeGuest(i)}
							/>
						))}

						{/* Message */}
						<div>
							<label className="block text-neutral-600 font-medium text-base mb-2 pl-1">
								Μήνυμα στο ζευγάρι (προαιρετικό)
							</label>
							<textarea
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								rows={3}
								placeholder="Μοιραστείτε τις ευχές σας..."
								className="w-full px-5 py-4 rounded-2xl border-2 border-neutral-200 bg-white text-neutral-900 text-lg placeholder:text-neutral-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all resize-none"
							/>
						</div>

						<div className="flex gap-3 pt-2">
							<button
								type="button"
								onClick={() => setStep(attending === 'yes' ? 2 : 1)}
								className="flex items-center gap-1 px-5 py-4 rounded-2xl border-2 border-neutral-200 text-neutral-600 font-semibold text-lg hover:bg-neutral-50 transition-colors"
							>
								<ChevronLeft className="w-5 h-5" /> Πίσω
							</button>
							<button
								type="button"
								onClick={handleSubmit}
								disabled={submitting}
								className="flex-1 bg-green-600 text-white py-4 rounded-2xl text-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-70"
							>
								{submitting ? 'Υποβολή...' : '✓ Επιβεβαίωση & Υποβολή'}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
