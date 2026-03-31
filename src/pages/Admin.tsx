import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import {
	Users,
	Plus,
	Trash2,
	Edit2,
	Send,
	Search,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	X,
	Check,
} from 'lucide-react';
import { supabase, InvitationFamily } from '../lib/supabase';
import { toast } from 'sonner';

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

export function Admin() {
	const [families, setFamilies] = useState<InvitationFamily[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [filterBy, setFilterBy] = useState('all');
	const [filterRelationship, setFilterRelationship] = useState('all');
	const [formData, setFormData] = useState(defaultForm);
	const [sortCol, setSortCol] = useState<'family_name' | 'expected_guests' | 'relationship_type' | 'added_by' | null>('family_name');
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.family_name.trim()) {
			toast.error('Το όνομα είναι υποχρεωτικό');
			return;
		}
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
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Διαγραφή αυτής της εγγραφής;')) return;
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
		try {
			const { error } = await supabase
				.from('invitation_families')
				.update({
					invitation_sent: sent,
					invitation_sent_date: sent ? new Date().toISOString() : null,
				})
				.eq('id', id);
			if (error) throw error;
			fetchFamilies();
		} catch {
			toast.error('Αποτυχία ενημέρωσης');
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
			return matchesAddedBy && matchesRel;
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
	}, [searchQuery, families, fuse, filterBy, filterRelationship, sortCol, sortDir]);

	const handleSort = (col: typeof sortCol) => {
		if (sortCol === col) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortCol(col);
			setSortDir('asc');
		}
	};

	const SortIcon = ({ col }: { col: typeof sortCol }) => {
		if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
		return sortDir === 'asc'
			? <ChevronUp className="w-3 h-3" />
			: <ChevronDown className="w-3 h-3" />;
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

	const fieldClass =
		'w-full px-3 py-2.5 rounded-xl border border-secondary bg-white text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all';

	return (
		<div className="min-h-screen bg-background">
			{/* Top bar */}
			<div className="bg-white border-b border-secondary/60 px-6 py-5">
				<div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
							<Users className="w-5 h-5 text-accent" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-text-primary leading-tight">
								Προσκλήσεις
							</h1>
							<p className="text-xs text-text-muted">{stats.total} εγγραφές</p>
						</div>
					</div>
					<button
						onClick={() => {
							resetForm();
							setShowForm(true);
						}}
						className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Προσθήκη
					</button>
				</div>
			</div>

			<div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
				{/* Stats */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{[
						{ label: 'Σύνολο', value: stats.total, color: 'text-text-primary' },
						{
							label: 'Εστάλησαν',
							value: stats.sent,
							color: 'text-emerald-600',
						},
						{
							label: 'Εκκρεμούν',
							value: stats.pending,
							color: 'text-amber-600',
						},
						{ label: 'Καλεσμένοι', value: stats.guests, color: 'text-accent' },
					].map((s) => (
						<div
							key={s.label}
							className="bg-white rounded-2xl border border-secondary/60 px-4 py-3"
						>
							<p className="text-xs text-text-muted font-medium">{s.label}</p>
							<p className={`text-2xl font-bold mt-0.5 ${s.color}`}>
								{s.value}
							</p>
						</div>
					))}
				</div>

				{/* Form */}
				{showForm && (
					<div className="bg-white rounded-2xl border border-secondary/60 overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-secondary/60">
							<h2 className="text-base font-semibold text-text-primary">
								{editingId ? 'Επεξεργασία' : 'Νέα Εγγραφή'}
							</h2>
							<button
								onClick={resetForm}
								className="text-text-muted hover:text-text-primary transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<form onSubmit={handleSubmit} className="p-5 space-y-4">
							<div className="grid md:grid-cols-2 gap-4">
								<div className="md:col-span-2">
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Όνομα Οικογένειας / Ομάδας *
									</label>
									<input
										type="text"
										placeholder="π.χ. Οικογένεια Παπαδόπουλου"
										value={formData.family_name}
										onChange={(e) =>
											setFormData({ ...formData, family_name: e.target.value })
										}
										className={fieldClass}
										required
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Αριθμός Ατόμων *
									</label>
									<div className="relative">
										<select
											value={formData.expected_guests}
											onChange={(e) =>
												setFormData({
													...formData,
													expected_guests: parseInt(e.target.value, 10),
												})
											}
											className={`${fieldClass} appearance-none pr-8`}
											required
										>
											{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
												<option key={n} value={n}>
													{n}
												</option>
											))}
										</select>
										<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
									</div>
								</div>

								<div>
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Προστέθηκε Από *
									</label>
									<div className="relative">
										<select
											value={formData.added_by}
											onChange={(e) =>
												setFormData({ ...formData, added_by: e.target.value })
											}
											className={`${fieldClass} appearance-none pr-8`}
										>
											{ADDED_BY_OPTIONS.map((o) => (
												<option key={o.value} value={o.value}>
													{o.label}
												</option>
											))}
										</select>
										<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
									</div>
								</div>

								<div>
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Τύπος Σχέσης *
									</label>
									<div className="relative">
										<select
											value={formData.relationship_type}
											onChange={(e) =>
												setFormData({
													...formData,
													relationship_type: e.target.value,
												})
											}
											className={`${fieldClass} appearance-none pr-8`}
										>
											{RELATIONSHIP_OPTIONS.map((o) => (
												<option key={o.value} value={o.value}>
													{o.label}
												</option>
											))}
										</select>
										<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
									</div>
								</div>

								<div>
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Τηλέφωνο
									</label>
									<input
										type="tel"
										placeholder="Προαιρετικό"
										value={formData.contact_phone}
										onChange={(e) =>
											setFormData({
												...formData,
												contact_phone: e.target.value,
											})
										}
										className={fieldClass}
									/>
								</div>

								<div className="md:col-span-2">
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Σημειώσεις
									</label>
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

							<div className="flex gap-2 pt-1">
								<button
									type="button"
									onClick={resetForm}
									className="px-4 py-2.5 text-sm font-medium text-text-muted border border-secondary rounded-xl hover:bg-secondary/30 transition-colors"
								>
									Ακύρωση
								</button>
								<button
									type="submit"
									className="flex-1 px-4 py-2.5 text-sm font-medium bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
								>
									{editingId ? 'Αποθήκευση' : 'Προσθήκη'}
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Search & Filters */}
				<div className="bg-white rounded-2xl border border-secondary/60 p-4">
					<div className="grid md:grid-cols-3 gap-3">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
							<input
								type="text"
								placeholder="Αναζήτηση..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className={`${fieldClass} pl-9`}
							/>
						</div>
						<div className="relative">
							<select
								value={filterBy}
								onChange={(e) => setFilterBy(e.target.value)}
								className={`${fieldClass} appearance-none pr-8`}
							>
								<option value="all">Όλα τα άτομα</option>
								{ADDED_BY_OPTIONS.map((o) => (
									<option key={o.value} value={o.value}>
										Από: {o.label}
									</option>
								))}
							</select>
							<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
						</div>
						<div className="relative">
							<select
								value={filterRelationship}
								onChange={(e) => setFilterRelationship(e.target.value)}
								className={`${fieldClass} appearance-none pr-8`}
							>
								<option value="all">Όλες οι σχέσεις</option>
								{RELATIONSHIP_OPTIONS.map((o) => (
									<option key={o.value} value={o.value}>
										{o.label}
									</option>
								))}
							</select>
							<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
						</div>
					</div>
				</div>

				{/* List */}
				{loading ? (
					<div className="flex items-center justify-center py-16 text-text-muted text-sm">
						Φόρτωση...
					</div>
				) : filteredFamilies.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-text-muted">
						<Users className="w-12 h-12 text-secondary mb-3" />
						<p className="text-sm">Δεν βρέθηκαν εγγραφές</p>
					</div>
				) : (
					<div className="bg-white rounded-2xl border border-secondary/60 overflow-hidden">
						{/* Table header — desktop */}
						<div className="hidden md:grid grid-cols-[1fr_60px_140px_100px_116px] px-5 py-3 border-b border-secondary/60 text-xs font-medium text-text-muted uppercase tracking-wide">
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
									className={`flex items-center gap-1 hover:text-text-primary transition-colors ${align === 'center' ? 'justify-center' : ''} ${sortCol === col ? 'text-accent' : ''}`}
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
									className="px-5 py-4 hover:bg-secondary/10 transition-colors"
								>
									{/* Mobile layout */}
									<div className="flex items-start justify-between gap-3 md:hidden">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="font-medium text-text-primary truncate">
													{family.family_name}
												</span>
												{family.invitation_sent && (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full font-medium">
														<Check className="w-3 h-3" /> Εστάλη
													</span>
												)}
											</div>
											<div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted">
												<span>{family.expected_guests} άτομα</span>
												<span>{getRelLabel(family.relationship_type)}</span>
												<span>{getAddedLabel(family.added_by)}</span>
												{family.contact_phone && (
													<span>{family.contact_phone}</span>
												)}
											</div>
											{family.notes && (
												<p className="mt-1 text-xs text-text-muted italic truncate">
													{family.notes}
												</p>
											)}
										</div>
										<div className="flex items-center gap-1 shrink-0">
											<button
												onClick={() =>
													markInvitationSent(family.id, !family.invitation_sent)
												}
												className={`p-2 rounded-xl transition-colors ${family.invitation_sent ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-secondary/40 text-text-muted hover:bg-secondary'}`}
												title={family.invitation_sent ? 'Αναίρεση' : 'Εστάλη'}
											>
												<Send className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleEdit(family)}
												className="p-2 rounded-xl bg-secondary/40 text-text-muted hover:bg-secondary transition-colors"
											>
												<Edit2 className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleDelete(family.id)}
												className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</div>

									{/* Desktop layout */}
									<div className="hidden md:grid grid-cols-[1fr_60px_140px_100px_116px] items-center">
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
											{family.notes && (
												<p className="text-xs text-text-muted italic mt-0.5 truncate">
													{family.notes}
												</p>
											)}
										</div>
										<span className="text-sm text-text-muted text-center">
											{family.expected_guests}
										</span>
										<span className="text-sm text-text-muted truncate">
											{getRelLabel(family.relationship_type)}
										</span>
										<span className="text-sm text-text-muted truncate">
											{getAddedLabel(family.added_by)}
										</span>
										<div className="flex items-center gap-1">
											<button
												onClick={() =>
													markInvitationSent(family.id, !family.invitation_sent)
												}
												className={`p-2 rounded-xl transition-colors ${family.invitation_sent ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-secondary/40 text-text-muted hover:bg-secondary'}`}
												title={family.invitation_sent ? 'Αναίρεση' : 'Εστάλη'}
											>
												<Send className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleEdit(family)}
												className="p-2 rounded-xl bg-secondary/40 text-text-muted hover:bg-secondary transition-colors"
											>
												<Edit2 className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleDelete(family.id)}
												className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
