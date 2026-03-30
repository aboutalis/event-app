import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, Euro } from 'lucide-react';
import { supabase, EventCost } from '../lib/supabase';
import { toast } from 'sonner';

const defaultForm = {
	name: '',
	total_amount: 0,
	upfront_amount: 0,
	paid_amount: 0,
	is_paid: false,
	notes: '',
};

export function Costs() {
	const [costs, setCosts] = useState<EventCost[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [formData, setFormData] = useState(defaultForm);

	useEffect(() => { fetchCosts(); }, []);

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) {
			toast.error('Το όνομα είναι υποχρεωτικό');
			return;
		}
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
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Διαγραφή αυτού του εξόδου;')) return;
		try {
			const { error } = await supabase.from('event_costs').delete().eq('id', id);
			if (error) throw error;
			toast.success('Διαγράφηκε');
			fetchCosts();
		} catch {
			toast.error('Αποτυχία διαγραφής');
		}
	};

	const togglePaid = async (cost: EventCost) => {
		try {
			const { error } = await supabase
				.from('event_costs')
				.update({ is_paid: !cost.is_paid, updated_at: new Date().toISOString() })
				.eq('id', cost.id);
			if (error) throw error;
			fetchCosts();
		} catch {
			toast.error('Αποτυχία ενημέρωσης');
		}
	};

	const totals = {
		total: costs.reduce((s, c) => s + c.total_amount, 0),
		upfront: costs.reduce((s, c) => s + c.upfront_amount, 0),
		paid: costs.reduce((s, c) => s + c.paid_amount, 0),
		remaining: costs.reduce((s, c) => s + (c.total_amount - c.paid_amount), 0),
	};

	const fmt = (n: number) =>
		n.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' });

	const fieldClass =
		'w-full px-3 py-2.5 rounded-xl border border-secondary bg-white text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all';

	return (
		<div className="min-h-screen bg-background">
			{/* Top bar */}
			<div className="bg-white border-b border-secondary/60 px-6 py-5">
				<div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
							<Euro className="w-5 h-5 text-accent" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-text-primary leading-tight">
								Έξοδα
							</h1>
							<p className="text-xs text-text-muted">{costs.length} εγγραφές</p>
						</div>
					</div>
					<button
						onClick={() => { resetForm(); setShowForm(true); }}
						className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Προσθήκη
					</button>
				</div>
			</div>

			<div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
				{/* Summary */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{[
						{ label: 'Συνολικό Κόστος', value: fmt(totals.total), color: 'text-text-primary' },
						{ label: 'Προκαταβολές', value: fmt(totals.upfront), color: 'text-amber-600' },
						{ label: 'Πληρωμένα', value: fmt(totals.paid), color: 'text-emerald-600' },
						{ label: 'Υπόλοιπο', value: fmt(totals.remaining), color: 'text-red-500' },
					].map((s) => (
						<div key={s.label} className="bg-white rounded-2xl border border-secondary/60 px-4 py-3">
							<p className="text-xs text-text-muted font-medium">{s.label}</p>
							<p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
						</div>
					))}
				</div>

				{/* Form */}
				{showForm && (
					<div className="bg-white rounded-2xl border border-secondary/60 overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-secondary/60">
							<h2 className="text-base font-semibold text-text-primary">
								{editingId ? 'Επεξεργασία' : 'Νέο Έξοδο'}
							</h2>
							<button onClick={resetForm} className="text-text-muted hover:text-text-primary transition-colors">
								<X className="w-5 h-5" />
							</button>
						</div>
						<form onSubmit={handleSubmit} className="p-5 space-y-4">
							<div className="grid md:grid-cols-2 gap-4">
								<div className="md:col-span-2">
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Όνομα Εξόδου *
									</label>
									<input
										type="text"
										placeholder="π.χ. Catering, Φωτογράφος"
										value={formData.name}
										onChange={(e) => setFormData({ ...formData, name: e.target.value })}
										className={fieldClass}
										required
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Συνολικό Ποσό (€) *
									</label>
									<input
										type="number"
										min="0"
										step="0.01"
										placeholder="0.00"
										value={formData.total_amount || ''}
										onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
										className={fieldClass}
										required
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Προκαταβολή (€)
									</label>
									<input
										type="number"
										min="0"
										step="0.01"
										placeholder="0.00"
										value={formData.upfront_amount || ''}
										onChange={(e) => setFormData({ ...formData, upfront_amount: parseFloat(e.target.value) || 0 })}
										className={fieldClass}
									/>
								</div>

								<div>
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Πληρωμένο Ποσό (€)
									</label>
									<input
										type="number"
										min="0"
										step="0.01"
										placeholder="0.00"
										value={formData.paid_amount || ''}
										onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) || 0 })}
										className={fieldClass}
									/>
								</div>

								<div className="flex items-center gap-3">
									<label className="text-xs font-medium text-text-muted">
										Εξοφλήθηκε πλήρως
									</label>
									<button
										type="button"
										onClick={() => setFormData({ ...formData, is_paid: !formData.is_paid })}
										className={`relative w-10 h-6 rounded-full transition-colors ${formData.is_paid ? 'bg-emerald-500' : 'bg-secondary'}`}
									>
										<span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.is_paid ? 'translate-x-4' : 'translate-x-0'}`} />
									</button>
								</div>

								<div className="md:col-span-2">
									<label className="block text-xs font-medium text-text-muted mb-1.5">
										Σημειώσεις
									</label>
									<textarea
										placeholder="Πρόσθετες πληροφορίες..."
										value={formData.notes}
										onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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

				{/* List */}
				{loading ? (
					<div className="flex items-center justify-center py-16 text-text-muted text-sm">
						Φόρτωση...
					</div>
				) : costs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-text-muted">
						<Euro className="w-12 h-12 text-secondary mb-3" />
						<p className="text-sm">Δεν βρέθηκαν έξοδα</p>
					</div>
				) : (
					<div className="bg-white rounded-2xl border border-secondary/60 overflow-hidden">
						<div className="hidden md:grid grid-cols-[1fr_110px_110px_110px_110px_100px] px-5 py-3 border-b border-secondary/60 text-xs font-medium text-text-muted uppercase tracking-wide">
							<span>Όνομα</span>
							<span className="text-right">Σύνολο</span>
							<span className="text-right">Προκαταβολή</span>
							<span className="text-right">Πληρωμένο</span>
							<span className="text-right">Υπόλοιπο</span>
							<span className="text-center">Ενέργειες</span>
						</div>

						<div className="divide-y divide-secondary/40">
							{costs.map((cost) => {
								const remaining = cost.total_amount - cost.paid_amount;
								return (
									<div key={cost.id} className="px-5 py-4 hover:bg-secondary/10 transition-colors">
										{/* Mobile */}
										<div className="md:hidden">
											<div className="flex items-start justify-between gap-3">
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2 flex-wrap">
														<span className="font-medium text-text-primary">{cost.name}</span>
														{cost.is_paid && (
															<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full font-medium">
																<Check className="w-3 h-3" /> Εξοφλήθηκε
															</span>
														)}
													</div>
													<div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-text-muted">
														<span>Σύνολο: <span className="font-medium text-text-primary">{fmt(cost.total_amount)}</span></span>
														<span>Προκαταβολή: <span className="font-medium text-amber-600">{fmt(cost.upfront_amount)}</span></span>
														<span>Πληρωμένο: <span className="font-medium text-emerald-600">{fmt(cost.paid_amount)}</span></span>
														<span>Υπόλοιπο: <span className={`font-medium ${remaining > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(remaining)}</span></span>
													</div>
													{cost.notes && <p className="mt-1 text-xs text-text-muted italic">{cost.notes}</p>}
												</div>
												<div className="flex items-center gap-1 shrink-0">
													<button
														onClick={() => togglePaid(cost)}
														className={`p-2 rounded-xl transition-colors ${cost.is_paid ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-secondary/40 text-text-muted hover:bg-secondary'}`}
													>
														<Check className="w-4 h-4" />
													</button>
													<button onClick={() => handleEdit(cost)} className="p-2 rounded-xl bg-secondary/40 text-text-muted hover:bg-secondary transition-colors">
														<Edit2 className="w-4 h-4" />
													</button>
													<button onClick={() => handleDelete(cost.id)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors">
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</div>
										</div>

										{/* Desktop */}
										<div className="hidden md:grid grid-cols-[1fr_110px_110px_110px_110px_100px] items-center">
											<div className="min-w-0 pr-4">
												<div className="flex items-center gap-2">
													<span className="font-medium text-text-primary text-sm truncate">{cost.name}</span>
													{cost.is_paid && (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full font-medium shrink-0">
															<Check className="w-3 h-3" /> Εξοφλήθηκε
														</span>
													)}
												</div>
												{cost.notes && <p className="text-xs text-text-muted italic mt-0.5 truncate">{cost.notes}</p>}
											</div>
											<span className="text-sm text-text-primary font-medium text-right">{fmt(cost.total_amount)}</span>
											<span className="text-sm text-amber-600 text-right">{fmt(cost.upfront_amount)}</span>
											<span className="text-sm text-emerald-600 text-right">{fmt(cost.paid_amount)}</span>
											<span className={`text-sm font-medium text-right ${remaining > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
												{fmt(remaining)}
											</span>
											<div className="flex items-center justify-center gap-1">
												<button
													onClick={() => togglePaid(cost)}
													className={`p-2 rounded-xl transition-colors ${cost.is_paid ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-secondary/40 text-text-muted hover:bg-secondary'}`}
													title={cost.is_paid ? 'Αναίρεση' : 'Εξοφλήθηκε'}
												>
													<Check className="w-4 h-4" />
												</button>
												<button onClick={() => handleEdit(cost)} className="p-2 rounded-xl bg-secondary/40 text-text-muted hover:bg-secondary transition-colors">
													<Edit2 className="w-4 h-4" />
												</button>
												<button onClick={() => handleDelete(cost.id)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors">
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
