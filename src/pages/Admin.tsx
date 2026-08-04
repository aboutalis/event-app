import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import {
	Users,
	Plus,
	Trash2,
	Edit2,
	Send,
	Phone,
	SlidersHorizontal,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	Check,
} from 'lucide-react';
import { supabase, InvitationFamily } from '../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { FormModal } from '../components/ui/FormModal';
import {
	fieldClass,
	Label,
	Stepper,
	PillGroup,
	SearchInput,
	Select,
	Skeleton,
} from '../components/ui/FormControls';

const ADDED_BY_OPTIONS = [
	{ value: 'tasos', label: 'Τάσος' },
	{ value: 'katerina', label: 'Κατερίνα' },
	{ value: 'ntina', label: 'Ντίνα' },
	{ value: 'giannis', label: 'Γιάννης' },
	{ value: 'anna', label: 'Άννα' },
	{ value: 'maria_mp', label: 'Μαρία Μπ.' },
	{ value: 'emma', label: 'Έμμα' },
	{ value: 'pantelis', label: 'Παντελής' },
	{ value: 'maria_mand', label: 'Μαρία Μανδρ.' },
	{ value: 'spyros_ts', label: 'Σπύρος Τσ.' },
	{ value: 'sofia_mar', label: 'Σοφία Μαρ.' },
];

const RELATIONSHIP_OPTIONS = [
	{ value: 'family', label: 'Οικογένεια' },
	{ value: 'friends', label: 'Φίλοι' },
	{ value: 'colleagues', label: 'Συνάδελφοι' },
	{ value: 'sister friends', label: 'Φίλοι αδερφής' },
	{ value: 'parents friends', label: 'Φίλοι γονέων' },
	{ value: 'koumparos friends', label: 'Φίλοι κουμπάρου' },
	{ value: 'relatives', label: 'Συγγενείς' },
	{ value: 'neighbors', label: 'Γείτονες' },
	{ value: 'other', label: 'Άλλο' },
];

const defaultForm = {
	family_name: '',
	expected_guests: 1,
	relationship_type: RELATIONSHIP_OPTIONS[0].value,
	added_by: ADDED_BY_OPTIONS[0].value,
	contact_phone: '',
	notes: '',
};

type StatusFilter = 'all' | 'sent' | 'pending';

export function Admin() {
	const [families, setFamilies] = useState<InvitationFamily[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [filterBy, setFilterBy] = useState('all');
	const [filterRelationship, setFilterRelationship] = useState('all');
	const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
	const [showFilters, setShowFilters] = useState(false);
	const [formData, setFormData] = useState(defaultForm);
	const [sortCol, setSortCol] = useState<
		'family_name' | 'expected_guests' | 'relationship_type' | 'added_by' | null
	>('family_name');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

	useEffect(() => {
		fetchFamilies();
	}, []);

	const fetchFamilies = async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('invitation_families')
				.select('*')
				.order('created_at', { ascending: false });
			if (error) throw error;
			setFamilies(data || []);
		} catch {
			toast.error('Αποτυχία φόρτωσης');
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setFormData(defaultForm);
		setEditingId(null);
		setShowForm(false);
	};

	const openNewForm = () => {
		setFormData(defaultForm);
		setEditingId(null);
		setShowForm(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.family_name.trim()) {
			toast.error('Το όνομα είναι υποχρεωτικό');
			return;
		}
		setSaving(true);
		try {
			if (editingId) {
				const { error } = await supabase
					.from('invitation_families')
					.update({ ...formData, updated_at: new Date().toISOString() })
					.eq('id', editingId);
				if (error) throw error;
				toast.success('Ενημερώθηκε!');
			} else {
				const { error } = await supabase
					.from('invitation_families')
					.insert([formData]);
				if (error) throw error;
				toast.success('Προστέθηκε!');
			}
			fetchFamilies();
			resetForm();
		} catch {
			toast.error('Αποτυχία αποθήκευσης');
		} finally {
			setSaving(false);
		}
	};

	const handleEdit = (family: InvitationFamily) => {
		setFormData({
			family_name: family.family_name,
			expected_guests: family.expected_guests,
			relationship_type: family.relationship_type,
			added_by: family.added_by,
			contact_phone: family.contact_phone || '',
			notes: family.notes || '',
		});
		setEditingId(family.id);
		setShowForm(true);
	};

	const handleDelete = async (id: string, name: string) => {
		if (!confirm(`Διαγραφή «${name}»;`)) return;
		try {
			const { error } = await supabase
				.from('invitation_families')
				.delete()
				.eq('id', id);
			if (error) throw error;
			toast.success('Διαγράφηκε');
			fetchFamilies();
		} catch {
			toast.error('Αποτυχία διαγραφής');
		}
	};

	const markInvitationSent = async (id: string, sent: boolean) => {
		// optimistic — the toggle should feel instant on a phone
		setFamilies((prev) =>
			prev.map((f) => (f.id === id ? { ...f, invitation_sent: sent } : f))
		);
		try {
			const { error } = await supabase
				.from('invitation_families')
				.update({
					invitation_sent: sent,
					invitation_sent_date: sent ? new Date().toISOString() : null,
				})
				.eq('id', id);
			if (error) throw error;
		} catch {
			toast.error('Αποτυχία ενημέρωσης');
			fetchFamilies();
		}
	};

	const fuse = useMemo(
		() =>
			new Fuse(families, {
				keys: ['family_name', 'notes', 'contact_phone'],
				threshold: 0.35,
				ignoreLocation: true,
			}),
		[families]
	);

	const filteredFamilies = useMemo(() => {
		const searched = searchQuery.trim()
			? fuse.search(searchQuery).map((r) => r.item)
			: families;

		const filtered = searched.filter((f) => {
			const matchesAddedBy = filterBy === 'all' || f.added_by === filterBy;
			const matchesRel =
				filterRelationship === 'all' ||
				f.relationship_type === filterRelationship;
			const matchesStatus =
				filterStatus === 'all' ||
				(filterStatus === 'sent' ? f.invitation_sent : !f.invitation_sent);
			return matchesAddedBy && matchesRel && matchesStatus;
		});

		if (!sortCol) return filtered;

		return [...filtered].sort((a, b) => {
			const aVal = a[sortCol];
			const bVal = b[sortCol];
			const cmp =
				typeof aVal === 'number' && typeof bVal === 'number'
					? aVal - bVal
					: String(aVal).localeCompare(String(bVal), 'el');
			return sortDir === 'asc' ? cmp : -cmp;
		});
	}, [
		searchQuery,
		families,
		fuse,
		filterBy,
		filterRelationship,
		filterStatus,
		sortCol,
		sortDir,
	]);

	const handleSort = (col: typeof sortCol) => {
		if (sortCol === col) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortCol(col);
			setSortDir('asc');
		}
	};

	const SortIcon = ({ col }: { col: typeof sortCol }) => {
		if (sortCol !== col)
			return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
		return sortDir === 'asc' ? (
			<ChevronUp className="w-3 h-3" />
		) : (
			<ChevronDown className="w-3 h-3" />
		);
	};

	const stats = {
		total: families.length,
		sent: families.filter((f) => f.invitation_sent).length,
		pending: families.filter((f) => !f.invitation_sent).length,
		guests: families.reduce((sum, f) => sum + f.expected_guests, 0),
	};

	const getRelLabel = (v: string) =>
		RELATIONSHIP_OPTIONS.find((o) => o.value === v)?.label ?? v;
	const getAddedLabel = (v: string) =>
		ADDED_BY_OPTIONS.find((o) => o.value === v)?.label ?? v;

	const dropdownCount =
		(filterBy !== 'all' ? 1 : 0) + (filterRelationship !== 'all' ? 1 : 0);
	const hasFilters =
		dropdownCount > 0 || filterStatus !== 'all' || searchQuery.trim() !== '';

	const clearFilters = () => {
		setSearchQuery('');
		setFilterBy('all');
		setFilterRelationship('all');
		setFilterStatus('all');
	};

	const statCards = [
		{
			label: 'Σύνολο',
			value: stats.total,
			color: 'text-text-primary',
			status: 'all' as const,
		},
		{
			label: 'Εστάλησαν',
			value: stats.sent,
			color: 'text-emerald-600',
			status: 'sent' as const,
		},
		{
			label: 'Εκκρεμούν',
			value: stats.pending,
			color: 'text-amber-600',
			status: 'pending' as const,
		},
		{
			label: 'Καλεσμένοι',
			value: stats.guests,
			color: 'text-accent',
			status: null,
		},
	];

	const actionBtn =
		'w-10 h-10 flex items-center justify-center rounded-xl transition-colors active:scale-95 shrink-0';

	const rowActions = (family: InvitationFamily) => (
		<>
			<button
				onClick={() => markInvitationSent(family.id, !family.invitation_sent)}
				className={cn(
					actionBtn,
					family.invitation_sent
						? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
						: 'bg-secondary/40 text-text-muted hover:bg-secondary'
				)}
				title={
					family.invitation_sent
						? 'Σήμανση ως μη απεσταλμένο'
						: 'Σήμανση ως απεσταλμένο'
				}
			>
				<Send className="w-4 h-4" />
			</button>
			<button
				onClick={() => handleEdit(family)}
				className={cn(
					actionBtn,
					'bg-secondary/40 text-text-muted hover:bg-secondary'
				)}
				title="Επεξεργασία"
			>
				<Edit2 className="w-4 h-4" />
			</button>
			<button
				onClick={() => handleDelete(family.id, family.family_name)}
				className={cn(
					actionBtn,
					'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500'
				)}
				title="Διαγραφή"
			>
				<Trash2 className="w-4 h-4" />
			</button>
		</>
	);

	return (
		<div className="min-h-screen bg-background">
			{/* Top bar — sticky so "Προσθήκη" is always one tap away */}
			<div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-secondary/60 px-4 sm:px-6 py-3 sm:py-4">
				<div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
							<Users className="w-5 h-5 text-accent" />
						</div>
						<div className="min-w-0">
							<h1 className="text-lg sm:text-xl font-semibold text-text-primary leading-tight">
								Προσκλήσεις
							</h1>
							<p className="text-xs text-text-muted">
								{stats.total} εγγραφές · {stats.guests} άτομα
							</p>
						</div>
					</div>
					<button
						onClick={openNewForm}
						className="flex items-center gap-2 px-4 h-11 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 active:scale-95 transition shrink-0"
					>
						<Plus className="w-4 h-4" />
						Προσθήκη
					</button>
				</div>
			</div>

			<div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">
				{/* Stats — also act as status filters */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
					{statCards.map((s) => {
						const status = s.status;
						const active = status !== null && filterStatus === status;
						const className = cn(
							'bg-white rounded-2xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-left transition-colors',
							status !== null && 'hover:border-accent/50 active:scale-[0.98]',
							active
								? 'border-accent ring-2 ring-accent/20'
								: 'border-secondary/60'
						);
						const body = (
							<>
								<p className="text-xs text-text-muted font-medium truncate">
									{s.label}
								</p>
								<p
									className={cn(
										'text-xl sm:text-2xl font-bold mt-0.5 tabular-nums',
										s.color
									)}
								>
									{s.value}
								</p>
							</>
						);

						return status === null ? (
							<div key={s.label} className={className}>
								{body}
							</div>
						) : (
							<button
								key={s.label}
								type="button"
								onClick={() => setFilterStatus(status)}
								aria-pressed={active}
								className={className}
							>
								{body}
							</button>
						);
					})}
				</div>

				{/* Search & filters */}
				<div className="bg-white rounded-2xl border border-secondary/60 p-3 sm:p-4 space-y-2.5">
					<div className="flex gap-2">
						<SearchInput
							value={searchQuery}
							onChange={setSearchQuery}
							placeholder="Αναζήτηση ονόματος, τηλεφώνου..."
						/>
						<button
							type="button"
							onClick={() => setShowFilters((v) => !v)}
							className={cn(
								'md:hidden relative flex items-center justify-center w-11 h-11 rounded-xl border transition-colors shrink-0',
								showFilters || dropdownCount > 0
									? 'border-accent text-accent bg-accent/5'
									: 'border-secondary text-text-muted'
							)}
							aria-label="Φίλτρα"
						>
							<SlidersHorizontal className="w-4 h-4" />
							{dropdownCount > 0 && (
								<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center">
									{dropdownCount}
								</span>
							)}
						</button>
					</div>

					<div
						className={cn(
							'gap-2.5 md:grid md:grid-cols-2',
							showFilters ? 'grid' : 'hidden'
						)}
					>
						<Select value={filterBy} onChange={setFilterBy}>
							<option value="all">Όλα τα άτομα</option>
							{ADDED_BY_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									Από: {o.label}
								</option>
							))}
						</Select>
						<Select value={filterRelationship} onChange={setFilterRelationship}>
							<option value="all">Όλες οι σχέσεις</option>
							{RELATIONSHIP_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</Select>
					</div>
				</div>

				{/* Result count */}
				{!loading && (
					<div className="flex items-center justify-between px-1 -mb-1">
						<p className="text-xs text-text-muted">
							{hasFilters ? (
								<>
									<span className="font-medium text-text-primary">
										{filteredFamilies.length}
									</span>{' '}
									από {families.length} εγγραφές
								</>
							) : (
								<>{families.length} εγγραφές</>
							)}
						</p>
						{hasFilters && (
							<button
								onClick={clearFilters}
								className="text-xs font-medium text-accent hover:underline"
							>
								Καθαρισμός φίλτρων
							</button>
						)}
					</div>
				)}

				{/* List */}
				{loading ? (
					<Skeleton />
				) : filteredFamilies.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-white rounded-2xl border border-secondary/60">
						<Users className="w-11 h-11 text-secondary mb-3" />
						<p className="text-sm font-medium text-text-primary">
							{hasFilters ? 'Δεν βρέθηκαν εγγραφές' : 'Καμία πρόσκληση ακόμη'}
						</p>
						<p className="text-xs text-text-muted mt-1 mb-4">
							{hasFilters
								? 'Δοκιμάστε διαφορετικά φίλτρα'
								: 'Προσθέστε την πρώτη σας εγγραφή'}
						</p>
						{hasFilters ? (
							<button
								onClick={clearFilters}
								className="px-4 h-10 rounded-xl border border-secondary text-sm font-medium text-text-muted hover:bg-secondary/30 transition-colors"
							>
								Καθαρισμός φίλτρων
							</button>
						) : (
							<button
								onClick={openNewForm}
								className="flex items-center gap-2 px-4 h-10 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
							>
								<Plus className="w-4 h-4" />
								Προσθήκη
							</button>
						)}
					</div>
				) : (
					<div className="bg-white rounded-2xl border border-secondary/60 overflow-hidden">
						{/* Table header — desktop */}
						<div className="hidden md:grid grid-cols-[1fr_60px_140px_100px_140px] px-5 py-3 border-b border-secondary/60 text-xs font-medium text-text-muted uppercase tracking-wide">
							{(
								[
									{ col: 'family_name', label: 'Όνομα', align: 'left' },
									{ col: 'expected_guests', label: 'Άτομα', align: 'center' },
									{ col: 'relationship_type', label: 'Σχέση', align: 'left' },
									{ col: 'added_by', label: 'Από', align: 'left' },
								] as const
							).map(({ col, label, align }) => (
								<button
									key={col}
									onClick={() => handleSort(col)}
									className={cn(
										'flex items-center gap-1 hover:text-text-primary transition-colors',
										align === 'center' && 'justify-center',
										sortCol === col && 'text-accent'
									)}
								>
									{label}
									<SortIcon col={col} />
								</button>
							))}
							<span className="text-center">Ενέργειες</span>
						</div>

						<div className="divide-y divide-secondary/40">
							{filteredFamilies.map((family) => (
								<div
									key={family.id}
									className="px-4 sm:px-5 py-3.5 hover:bg-secondary/10 transition-colors"
								>
									{/* Mobile */}
									<div className="md:hidden">
										<div className="flex items-start justify-between gap-3">
											<button
												onClick={() => handleEdit(family)}
												className="flex-1 min-w-0 text-left"
											>
												<div className="flex items-center gap-2">
													<span className="font-medium text-text-primary truncate">
														{family.family_name}
													</span>
													{family.invitation_sent && (
														<Check className="w-4 h-4 text-emerald-600 shrink-0" />
													)}
												</div>
												<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
													<span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
														{family.expected_guests} άτομα
													</span>
													<span>{getRelLabel(family.relationship_type)}</span>
													<span className="text-text-muted/60">·</span>
													<span>{getAddedLabel(family.added_by)}</span>
												</div>
												{family.notes && (
													<p className="mt-1 text-xs text-text-muted italic line-clamp-1">
														{family.notes}
													</p>
												)}
											</button>
											<div className="flex items-center gap-1 shrink-0">
												{rowActions(family)}
											</div>
										</div>
										{family.contact_phone && (
											<a
												href={`tel:${family.contact_phone}`}
												className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent"
											>
												<Phone className="w-3.5 h-3.5" />
												{family.contact_phone}
											</a>
										)}
									</div>

									{/* Desktop */}
									<div className="hidden md:grid grid-cols-[1fr_60px_140px_100px_140px] items-center">
										<div className="min-w-0 pr-4">
											<div className="flex items-center gap-2">
												<span className="font-medium text-text-primary text-sm truncate">
													{family.family_name}
												</span>
												{family.invitation_sent && (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full font-medium shrink-0">
														<Check className="w-3 h-3" /> Εστάλη
													</span>
												)}
											</div>
											<div className="flex items-center gap-2 mt-0.5">
												{family.contact_phone && (
													<a
														href={`tel:${family.contact_phone}`}
														className="text-xs text-text-muted hover:text-accent transition-colors"
													>
														{family.contact_phone}
													</a>
												)}
												{family.notes && (
													<p className="text-xs text-text-muted italic truncate">
														{family.notes}
													</p>
												)}
											</div>
										</div>
										<span className="text-sm text-text-primary font-medium text-center tabular-nums">
											{family.expected_guests}
										</span>
										<span className="text-sm text-text-muted truncate pr-2">
											{getRelLabel(family.relationship_type)}
										</span>
										<span className="text-sm text-text-muted truncate pr-2">
											{getAddedLabel(family.added_by)}
										</span>
										<div className="flex items-center justify-center gap-1">
											{rowActions(family)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			<FormModal
				open={showForm}
				title={editingId ? 'Επεξεργασία' : 'Νέα Εγγραφή'}
				onClose={resetForm}
				onSubmit={handleSubmit}
				footer={
					<div className="flex gap-2">
						<button
							type="button"
							onClick={resetForm}
							className="px-4 h-11 text-sm font-medium text-text-muted border border-secondary rounded-xl hover:bg-secondary/30 transition-colors"
						>
							Ακύρωση
						</button>
						<button
							type="submit"
							disabled={saving || !formData.family_name.trim()}
							className="flex-1 h-11 text-sm font-medium bg-accent text-white rounded-xl hover:bg-accent/90 active:scale-[0.98] transition disabled:opacity-40 disabled:pointer-events-none"
						>
							{saving ? 'Αποθήκευση...' : editingId ? 'Αποθήκευση' : 'Προσθήκη'}
						</button>
					</div>
				}
			>
				<div className="space-y-4">
					<div>
						<Label>Όνομα Οικογένειας / Ομάδας *</Label>
						<input
							type="text"
							autoFocus
							placeholder="π.χ. Οικογένεια Παπαδόπουλου"
							value={formData.family_name}
							onChange={(e) =>
								setFormData({ ...formData, family_name: e.target.value })
							}
							className={fieldClass}
							required
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Αριθμός Ατόμων *</Label>
							<Stepper
								value={formData.expected_guests}
								onChange={(v) =>
									setFormData({ ...formData, expected_guests: v })
								}
							/>
						</div>
						<div>
							<Label>Τηλέφωνο</Label>
							<input
								type="tel"
								inputMode="tel"
								placeholder="Προαιρετικό"
								value={formData.contact_phone}
								onChange={(e) =>
									setFormData({ ...formData, contact_phone: e.target.value })
								}
								className={fieldClass}
							/>
						</div>
					</div>

					<div>
						<Label>Τύπος Σχέσης *</Label>
						<PillGroup
							options={RELATIONSHIP_OPTIONS}
							value={formData.relationship_type}
							onChange={(v) =>
								setFormData({ ...formData, relationship_type: v })
							}
						/>
					</div>

					<div>
						<Label>Προστέθηκε Από *</Label>
						<PillGroup
							options={ADDED_BY_OPTIONS}
							value={formData.added_by}
							onChange={(v) => setFormData({ ...formData, added_by: v })}
						/>
					</div>

					<div>
						<Label hint="προαιρετικό">Σημειώσεις</Label>
						<textarea
							placeholder="Πρόσθετες πληροφορίες..."
							value={formData.notes}
							onChange={(e) =>
								setFormData({ ...formData, notes: e.target.value })
							}
							rows={2}
							className={fieldClass}
						/>
					</div>
				</div>
			</FormModal>
		</div>
	);
}
