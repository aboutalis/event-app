import React, { useState, useEffect, useMemo } from 'react';
import {
	Plus,
	Trash2,
	Edit2,
	Check,
	Euro,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
} from 'lucide-react';
import { supabase, EventCost } from '../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { FormModal } from '../components/ui/FormModal';
import {
	fieldClass,
	Label,
	MoneyInput,
	SearchInput,
	Skeleton,
} from '../components/ui/FormControls';

const defaultForm = {
	name: '',
	total_amount: 0,
	upfront_amount: 0,
	paid_amount: 0,
	is_paid: false,
	notes: '',
};

type StatusFilter = 'all' | 'paid' | 'pending';
type SortCol = 'name' | 'total_amount' | 'paid_amount' | 'remaining' | null;

const isSettled = (c: EventCost) =>
	c.is_paid || c.total_amount - c.paid_amount <= 0;

/**
 * Share of the total that has actually been paid — turns four numbers into
 * something readable at a glance.
 * Module scope so the width transition isn't reset on every parent render.
 */
function ProgressBar({ cost }: { cost: EventCost }) {
	const settled = isSettled(cost);
	const pct =
		cost.total_amount > 0
			? Math.min(100, (cost.paid_amount / cost.total_amount) * 100)
			: 0;
	return (
		<div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
			<div
				className={cn(
					'h-full rounded-full transition-all duration-500',
					settled ? 'bg-emerald-500' : 'bg-accent'
				)}
				style={{ width: `${settled ? 100 : pct}%` }}
			/>
		</div>
	);
}

export function Costs() {
	const [costs, setCosts] = useState<EventCost[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [formData, setFormData] = useState(defaultForm);
	const [searchQuery, setSearchQuery] = useState('');
	const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
	const [sortCol, setSortCol] = useState<SortCol>(null);
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

	useEffect(() => {
		fetchCosts();
	}, []);

	const fetchCosts = async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('event_costs')
				.select('*')
				.order('created_at', { ascending: false });
			if (error) throw error;
			setCosts(data || []);
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
		if (!formData.name.trim()) {
			toast.error('Το όνομα είναι υποχρεωτικό');
			return;
		}
		setSaving(true);
		try {
			if (editingId) {
				const { error } = await supabase
					.from('event_costs')
					.update({ ...formData, updated_at: new Date().toISOString() })
					.eq('id', editingId);
				if (error) throw error;
				toast.success('Ενημερώθηκε!');
			} else {
				const { error } = await supabase.from('event_costs').insert([formData]);
				if (error) throw error;
				toast.success('Προστέθηκε!');
			}
			fetchCosts();
			resetForm();
		} catch {
			toast.error('Αποτυχία αποθήκευσης');
		} finally {
			setSaving(false);
		}
	};

	const handleEdit = (cost: EventCost) => {
		setFormData({
			name: cost.name,
			total_amount: cost.total_amount,
			upfront_amount: cost.upfront_amount,
			paid_amount: cost.paid_amount,
			is_paid: cost.is_paid,
			notes: cost.notes || '',
		});
		setEditingId(cost.id);
		setShowForm(true);
	};

	const handleDelete = async (id: string, name: string) => {
		if (!confirm(`Διαγραφή «${name}»;`)) return;
		try {
			const { error } = await supabase
				.from('event_costs')
				.delete()
				.eq('id', id);
			if (error) throw error;
			toast.success('Διαγράφηκε');
			fetchCosts();
		} catch {
			toast.error('Αποτυχία διαγραφής');
		}
	};

	const togglePaid = async (cost: EventCost) => {
		// optimistic — the toggle should feel instant on a phone
		setCosts((prev) =>
			prev.map((c) => (c.id === cost.id ? { ...c, is_paid: !c.is_paid } : c))
		);
		try {
			const { error } = await supabase
				.from('event_costs')
				.update({
					is_paid: !cost.is_paid,
					updated_at: new Date().toISOString(),
				})
				.eq('id', cost.id);
			if (error) throw error;
		} catch {
			toast.error('Αποτυχία ενημέρωσης');
			fetchCosts();
		}
	};

	const totals = {
		total: costs.reduce((s, c) => s + c.total_amount, 0),
		upfront: costs.reduce((s, c) => s + c.upfront_amount, 0),
		paid: costs.reduce((s, c) => s + c.paid_amount, 0),
		remaining: costs.reduce((s, c) => s + (c.total_amount - c.paid_amount), 0),
	};

	const paidPct =
		totals.total > 0 ? Math.min(100, (totals.paid / totals.total) * 100) : 0;

	const visibleCosts = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		const filtered = costs.filter((c) => {
			const matchesSearch =
				!q ||
				c.name.toLowerCase().includes(q) ||
				(c.notes || '').toLowerCase().includes(q);
			const settled = isSettled(c);
			const matchesStatus =
				filterStatus === 'all' ||
				(filterStatus === 'paid' ? settled : !settled);
			return matchesSearch && matchesStatus;
		});

		if (!sortCol) return filtered;

		return [...filtered].sort((a, b) => {
			let cmp: number;
			if (sortCol === 'name') {
				cmp = a.name.localeCompare(b.name, 'el');
			} else if (sortCol === 'remaining') {
				cmp = a.total_amount - a.paid_amount - (b.total_amount - b.paid_amount);
			} else {
				cmp = a[sortCol] - b[sortCol];
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
	}, [costs, searchQuery, filterStatus, sortCol, sortDir]);

	const handleSort = (col: SortCol) => {
		if (sortCol === col) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortCol(col);
			setSortDir('asc');
		}
	};

	const SortIcon = ({ col }: { col: SortCol }) => {
		if (sortCol !== col)
			return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
		return sortDir === 'asc' ? (
			<ChevronUp className="w-3 h-3" />
		) : (
			<ChevronDown className="w-3 h-3" />
		);
	};

	// Round amounts lose the ",00" so columns stay scannable; cents still show.
	const fmt = (n: number) =>
		n.toLocaleString('el-GR', {
			style: 'currency',
			currency: 'EUR',
			minimumFractionDigits: n % 1 === 0 ? 0 : 2,
			maximumFractionDigits: 2,
		});

	const hasFilters = filterStatus !== 'all' || searchQuery.trim() !== '';
	const clearFilters = () => {
		setSearchQuery('');
		setFilterStatus('all');
	};

	const summaryCards = [
		{
			label: 'Συνολικό Κόστος',
			value: totals.total,
			color: 'text-text-primary',
			status: 'all' as const,
		},
		{
			label: 'Προκαταβολές',
			value: totals.upfront,
			color: 'text-amber-600',
			status: null,
		},
		{
			label: 'Πληρωμένα',
			value: totals.paid,
			color: 'text-emerald-600',
			status: 'paid' as const,
		},
		{
			label: 'Υπόλοιπο',
			value: totals.remaining,
			color: 'text-red-500',
			status: 'pending' as const,
		},
	];

	const actionBtn =
		'w-10 h-10 flex items-center justify-center rounded-xl transition-colors active:scale-95 shrink-0';

	const rowActions = (cost: EventCost) => (
		<>
			<button
				onClick={() => togglePaid(cost)}
				className={cn(
					actionBtn,
					cost.is_paid
						? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
						: 'bg-secondary/40 text-text-muted hover:bg-secondary'
				)}
				title={cost.is_paid ? 'Αναίρεση εξόφλησης' : 'Σήμανση ως εξοφλημένο'}
			>
				<Check className="w-4 h-4" />
			</button>
			<button
				onClick={() => handleEdit(cost)}
				className={cn(
					actionBtn,
					'bg-secondary/40 text-text-muted hover:bg-secondary'
				)}
				title="Επεξεργασία"
			>
				<Edit2 className="w-4 h-4" />
			</button>
			<button
				onClick={() => handleDelete(cost.id, cost.name)}
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
							<Euro className="w-5 h-5 text-accent" />
						</div>
						<div className="min-w-0">
							<h1 className="text-lg sm:text-xl font-semibold text-text-primary leading-tight">
								Έξοδα
							</h1>
							<p className="text-xs text-text-muted truncate">
								{costs.length} εγγραφές · υπόλοιπο {fmt(totals.remaining)}
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
				{/* Summary — also act as status filters */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
					{summaryCards.map((s) => {
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
										'text-base sm:text-lg font-bold mt-0.5 tabular-nums truncate',
										s.color
									)}
								>
									{fmt(s.value)}
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

				{/* Overall progress */}
				{costs.length > 0 && (
					<div className="bg-white rounded-2xl border border-secondary/60 px-4 py-3">
						<div className="flex items-baseline justify-between mb-2">
							<span className="text-xs font-medium text-text-muted">
								Πρόοδος πληρωμών
							</span>
							<span className="text-xs font-semibold text-text-primary tabular-nums">
								{Math.round(paidPct)}%
							</span>
						</div>
						<div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
							<div
								className="h-full rounded-full bg-accent transition-all duration-500"
								style={{ width: `${paidPct}%` }}
							/>
						</div>
						<div className="flex justify-between mt-1.5 text-xs text-text-muted tabular-nums">
							<span>{fmt(totals.paid)}</span>
							<span>{fmt(totals.total)}</span>
						</div>
					</div>
				)}

				{/* Search */}
				<div className="flex">
					<SearchInput
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Αναζήτηση εξόδου..."
					/>
				</div>

				{/* Result count */}
				{!loading && (
					<div className="flex items-center justify-between px-1 -mb-1">
						<p className="text-xs text-text-muted">
							{hasFilters ? (
								<>
									<span className="font-medium text-text-primary">
										{visibleCosts.length}
									</span>{' '}
									από {costs.length} έξοδα
								</>
							) : (
								<>{costs.length} έξοδα</>
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
				) : visibleCosts.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-white rounded-2xl border border-secondary/60">
						<Euro className="w-11 h-11 text-secondary mb-3" />
						<p className="text-sm font-medium text-text-primary">
							{hasFilters ? 'Δεν βρέθηκαν έξοδα' : 'Κανένα έξοδο ακόμη'}
						</p>
						<p className="text-xs text-text-muted mt-1 mb-4">
							{hasFilters
								? 'Δοκιμάστε διαφορετική αναζήτηση'
								: 'Προσθέστε το πρώτο σας έξοδο'}
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
						<div className="hidden md:grid grid-cols-[1fr_110px_110px_110px_140px] px-5 py-3 border-b border-secondary/60 text-xs font-medium text-text-muted uppercase tracking-wide">
							{(
								[
									{ col: 'name', label: 'Όνομα', align: 'left' },
									{ col: 'total_amount', label: 'Σύνολο', align: 'right' },
									{ col: 'paid_amount', label: 'Πληρωμένο', align: 'right' },
									{ col: 'remaining', label: 'Υπόλοιπο', align: 'right' },
								] as const
							).map(({ col, label, align }) => (
								<button
									key={col}
									onClick={() => handleSort(col)}
									className={cn(
										'flex items-center gap-1 hover:text-text-primary transition-colors',
										align === 'right' && 'justify-end',
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
							{visibleCosts.map((cost) => {
								const remaining = cost.total_amount - cost.paid_amount;
								const settled = isSettled(cost);
								return (
									<div
										key={cost.id}
										className="px-4 sm:px-5 py-3.5 hover:bg-secondary/10 transition-colors"
									>
										{/* Mobile */}
										<div className="md:hidden">
											<div className="flex items-start justify-between gap-3">
												<button
													onClick={() => handleEdit(cost)}
													className="flex-1 min-w-0 text-left"
												>
													<div className="flex items-center gap-2">
														<span className="font-medium text-text-primary truncate">
															{cost.name}
														</span>
														{settled && (
															<Check className="w-4 h-4 text-emerald-600 shrink-0" />
														)}
													</div>
													<div className="mt-1 flex items-baseline gap-2 text-sm tabular-nums">
														<span className="font-semibold text-text-primary">
															{fmt(cost.total_amount)}
														</span>
														{!settled && remaining > 0 && (
															<span className="text-xs text-red-500 font-medium">
																υπόλοιπο {fmt(remaining)}
															</span>
														)}
													</div>
												</button>
												<div className="flex items-center gap-1 shrink-0">
													{rowActions(cost)}
												</div>
											</div>

											<div className="mt-2.5">
												<ProgressBar cost={cost} />
												<div className="flex justify-between mt-1 text-xs text-text-muted tabular-nums">
													<span>
														Πληρωμένο{' '}
														<span className="text-emerald-600 font-medium">
															{fmt(cost.paid_amount)}
														</span>
													</span>
													{cost.upfront_amount > 0 && (
														<span>
															Προκαταβολή{' '}
															<span className="text-amber-600 font-medium">
																{fmt(cost.upfront_amount)}
															</span>
														</span>
													)}
												</div>
											</div>

											{cost.notes && (
												<p className="mt-1.5 text-xs text-text-muted italic line-clamp-1">
													{cost.notes}
												</p>
											)}
										</div>

										{/* Desktop */}
										<div className="hidden md:grid grid-cols-[1fr_110px_110px_110px_140px] items-center">
											<div className="min-w-0 pr-4">
												<div className="flex items-center gap-2">
													<span className="font-medium text-text-primary text-sm truncate">
														{cost.name}
													</span>
													{settled && (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full font-medium shrink-0">
															<Check className="w-3 h-3" /> Εξοφλήθηκε
														</span>
													)}
												</div>
												<div className="mt-1.5 max-w-[240px]">
													<ProgressBar cost={cost} />
												</div>
												{cost.notes && (
													<p className="text-xs text-text-muted italic mt-1 truncate">
														{cost.notes}
													</p>
												)}
											</div>
											<span className="text-sm text-text-primary font-medium text-right tabular-nums">
												{fmt(cost.total_amount)}
											</span>
											<span className="text-sm text-emerald-600 text-right tabular-nums">
												{fmt(cost.paid_amount)}
											</span>
											<span
												className={cn(
													'text-sm font-medium text-right tabular-nums',
													remaining > 0 ? 'text-red-500' : 'text-emerald-600'
												)}
											>
												{fmt(remaining)}
											</span>
											<div className="flex items-center justify-center gap-1">
												{rowActions(cost)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			<FormModal
				open={showForm}
				title={editingId ? 'Επεξεργασία' : 'Νέο Έξοδο'}
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
							disabled={saving || !formData.name.trim()}
							className="flex-1 h-11 text-sm font-medium bg-accent text-white rounded-xl hover:bg-accent/90 active:scale-[0.98] transition disabled:opacity-40 disabled:pointer-events-none"
						>
							{saving ? 'Αποθήκευση...' : editingId ? 'Αποθήκευση' : 'Προσθήκη'}
						</button>
					</div>
				}
			>
				<div className="space-y-4">
					<div>
						<Label>Όνομα Εξόδου *</Label>
						<input
							type="text"
							autoFocus
							placeholder="π.χ. Catering, Φωτογράφος"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className={fieldClass}
							required
						/>
					</div>

					<div>
						<Label>Συνολικό Ποσό *</Label>
						<MoneyInput
							value={formData.total_amount}
							onChange={(v) => setFormData({ ...formData, total_amount: v })}
							required
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Προκαταβολή</Label>
							<MoneyInput
								value={formData.upfront_amount}
								onChange={(v) =>
									setFormData({ ...formData, upfront_amount: v })
								}
							/>
						</div>
						<div>
							<Label>Πληρωμένο</Label>
							<MoneyInput
								value={formData.paid_amount}
								onChange={(v) => setFormData({ ...formData, paid_amount: v })}
								action={
									formData.total_amount > 0 &&
									formData.paid_amount !== formData.total_amount
										? {
												label: 'Όλο',
												onClick: () =>
													setFormData((f) => ({
														...f,
														paid_amount: f.total_amount,
													})),
											}
										: undefined
								}
							/>
						</div>
					</div>

					{/* Live remaining, so the numbers make sense while typing */}
					<div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-background border border-secondary/60">
						<span className="text-xs font-medium text-text-muted">
							Υπόλοιπο
						</span>
						<span
							className={cn(
								'text-sm font-bold tabular-nums',
								formData.total_amount - formData.paid_amount > 0
									? 'text-red-500'
									: 'text-emerald-600'
							)}
						>
							{fmt(formData.total_amount - formData.paid_amount)}
						</span>
					</div>

					<button
						type="button"
						onClick={() =>
							setFormData({ ...formData, is_paid: !formData.is_paid })
						}
						className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl border border-secondary hover:border-accent/50 transition-colors"
					>
						<span className="text-sm text-text-primary">Εξοφλήθηκε πλήρως</span>
						<span
							className={cn(
								'relative w-11 h-6 rounded-full transition-colors shrink-0',
								formData.is_paid ? 'bg-emerald-500' : 'bg-secondary'
							)}
						>
							<span
								className={cn(
									'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
									formData.is_paid ? 'translate-x-5' : 'translate-x-0'
								)}
							/>
						</span>
					</button>

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
