/**
 * TABLES MANAGEMENT PAGE
 * Create and manage table assignments for the event
 */

import React, { useState, useEffect } from 'react';
import {
	Table as TableIcon,
	Users,
	Plus,
	Trash2,
	Save,
	Download,
	Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface SeatingTable {
	id: string;
	table_number: number;
	table_name: string | null;
	capacity: number;
	location: string | null;
	notes: string | null;
}

interface RSVPGuest {
	id: string;
	name: string;
	surname: string;
	attending: boolean;
	family_id: string | null;
	family_name?: string;
}

interface TableAssignment {
	id: string;
	guest_id: string;
	table_number: number;
	guest_name: string;
	seat_number: number | null;
	notes: string | null;
}

const inputClass =
	'w-full px-4 py-2 rounded-lg border border-neutral-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all';

export function TablesManagement() {
	const [tables, setTables] = useState<SeatingTable[]>([]);
	const [guests, setGuests] = useState<RSVPGuest[]>([]);
	const [assignments, setAssignments] = useState<TableAssignment[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedTableFilter, setSelectedTableFilter] = useState<number | 'all'>(
		'all'
	);

	// Modal states
	const [showTableForm, setShowTableForm] = useState(false);
	const [showAssignmentModal, setShowAssignmentModal] = useState(false);
	const [selectedTable, setSelectedTable] = useState<number | null>(null);
	const [selectedGuest, setSelectedGuest] = useState<string>('');
	const [seatNumber, setSeatNumber] = useState<string>('');

	const [tableForm, setTableForm] = useState({
		table_number: 1,
		table_name: '',
		capacity: 8,
		location: '',
		notes: '',
	});

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		setLoading(true);
		try {
			// Fetch tables
			const { data: tablesData, error: tablesError } = await supabase
				.from('seating_tables')
				.select('*')
				.order('table_number');

			if (tablesError) throw tablesError;

			// Fetch attending guests with family info
			const { data: guestsData, error: guestsError } = await supabase
				.from('rsvp')
				.select(
					`
					id,
					name,
					surname,
					attending,
					family_id,
					invitation_families(family_name)
				`
				)
				.eq('attending', true);

			if (guestsError) throw guestsError;

			// Transform guests data
			const transformedGuests = (guestsData || []).map((g: any) => ({
				id: g.id,
				name: g.name,
				surname: g.surname,
				attending: g.attending,
				family_id: g.family_id,
				family_name: g.invitation_families?.family_name || 'Χωρίς οικογένεια',
			}));

			// Fetch assignments
			const { data: assignmentsData, error: assignmentsError } = await supabase
				.from('table_assignments')
				.select('*')
				.order('table_number');

			if (assignmentsError) throw assignmentsError;

			setTables(tablesData || []);
			setGuests(transformedGuests);
			setAssignments(assignmentsData || []);
		} catch (err) {
			console.error('Error fetching data:', err);
			toast.error('Αποτυχία φόρτωσης δεδομένων');
		} finally {
			setLoading(false);
		}
	};

	const handleCreateTable = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const { error } = await supabase.from('seating_tables').insert([tableForm]);

			if (error) throw error;
			toast.success('Το τραπέζι δημιουργήθηκε επιτυχώς!');
			fetchData();
			setShowTableForm(false);
			setTableForm({
				table_number: tables.length + 1,
				table_name: '',
				capacity: 8,
				location: '',
				notes: '',
			});
		} catch (err: any) {
			console.error('Error creating table:', err);
			if (err.code === '23505') {
				toast.error('Ο αριθμός τραπεζιού υπάρχει ήδη');
			} else {
				toast.error('Αποτυχία δημιουργίας τραπεζιού');
			}
		}
	};

	const handleDeleteTable = async (id: string) => {
		if (!confirm('Διαγραφή αυτού του τραπεζιού; Όλες οι αναθέσεις θα αφαιρεθούν.')) return;

		try {
			const { error } = await supabase
				.from('seating_tables')
				.delete()
				.eq('id', id);

			if (error) throw error;
			toast.success('Το τραπέζι διαγράφηκε');
			fetchData();
		} catch (err) {
			console.error('Error deleting table:', err);
			toast.error('Αποτυχία διαγραφής τραπεζιού');
		}
	};

	const handleAssignGuest = async () => {
		if (!selectedTable || !selectedGuest) {
			toast.error('Παρακαλώ επιλέξτε και τραπέζι και καλεσμένο');
			return;
		}

		// Check if guest is already assigned
		const existingAssignment = assignments.find(
			(a) => a.guest_id === selectedGuest
		);
		if (existingAssignment) {
			toast.error('Ο καλεσμένος έχει ήδη ανατεθεί σε τραπέζι');
			return;
		}

		const guest = guests.find((g) => g.id === selectedGuest);
		if (!guest) return;

		try {
			const { error } = await supabase.from('table_assignments').insert([
				{
					guest_id: selectedGuest,
					guest_name: `${guest.name} ${guest.surname}`,
					table_number: selectedTable,
					seat_number: seatNumber ? parseInt(seatNumber) : null,
					family_id: guest.family_id,
				},
			]);

			if (error) throw error;
			toast.success('Ο καλεσμένος ανατέθηκε επιτυχώς!');
			fetchData();
			setShowAssignmentModal(false);
			setSelectedGuest('');
			setSeatNumber('');
		} catch (err) {
			console.error('Error assigning guest:', err);
			toast.error('Αποτυχία ανάθεσης καλεσμένου');
		}
	};

	const handleUnassignGuest = async (assignmentId: string) => {
		if (!confirm('Αφαίρεση αυτού του καλεσμένου από το τραπέζι;')) return;

		try {
			const { error } = await supabase
				.from('table_assignments')
				.delete()
				.eq('id', assignmentId);

			if (error) throw error;
			toast.success('Η ανάθεση του καλεσμένου αφαιρέθηκε');
			fetchData();
		} catch (err) {
			console.error('Error unassigning guest:', err);
			toast.error('Αποτυχία αφαίρεσης ανάθεσης καλεσμένου');
		}
	};

	const getTableAssignments = (tableNumber: number) => {
		return assignments.filter((a) => a.table_number === tableNumber);
	};

	const getUnassignedGuests = () => {
		const assignedGuestIds = assignments.map((a) => a.guest_id);
		return guests.filter((g) => !assignedGuestIds.includes(g.id));
	};

	const exportTablePlan = () => {
		let csv = 'Αριθμός Τραπεζιού,Όνομα Τραπεζιού,Όνομα Καλεσμένου,Αριθμός Θέσης,Οικογένεια\n';

		tables.forEach((table) => {
			const tableAssignments = getTableAssignments(table.table_number);

			if (tableAssignments.length === 0) {
				const tableName = table.table_name || '';
				csv += `${table.table_number},"${tableName}","","",""\n`;
			} else {
				tableAssignments.forEach((assignment) => {
					const guest = guests.find((g) => g.id === assignment.guest_id);
					const tableName = table.table_name || '';
					const seatNum = assignment.seat_number || '';
					const familyName = guest?.family_name || '';
					csv += `${table.table_number},"${tableName}","${assignment.guest_name}",${seatNum},"${familyName}"\n`;
				});
			}
		});

		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'table-plan.csv';
		a.click();
		window.URL.revokeObjectURL(url);
		toast.success('Το πλάνο τραπεζιών εξήχθη!');
	};

	// Filter logic
	const filteredGuests = getUnassignedGuests().filter((guest) =>
		`${guest.name} ${guest.surname} ${guest.family_name}`
			.toLowerCase()
			.includes(searchQuery.toLowerCase())
	);

	const displayTables =
		selectedTableFilter === 'all'
			? tables
			: tables.filter((t) => t.table_number === selectedTableFilter);

	// Statistics
	const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
	const totalAssigned = assignments.length;
	const unassignedCount = guests.length - totalAssigned;

	return (
		<div className="min-h-screen bg-neutral-50 pb-24">
			{/* Header */}
			<div className="bg-white border-b border-neutral-200 py-6 px-6">
				<div className="max-w-7xl mx-auto">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<TableIcon className="w-8 h-8 text-amber-500" />
							<div>
								<h1 className="text-3xl font-serif text-neutral-900">
									Διαχείριση Τραπεζιών
								</h1>
								<p className="text-neutral-600 mt-1">
									Οργανώστε τις θέσεις για την εκδήλωσή σας
								</p>
							</div>
						</div>
						<div className="flex gap-3">
							<button
								onClick={exportTablePlan}
								className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
							>
								<Download className="w-5 h-5" />
								Εξαγωγή CSV
							</button>
							<button
								onClick={() => setShowTableForm(true)}
								className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
							>
								<Plus className="w-5 h-5" />
								Προσθήκη Τραπεζιού
							</button>
						</div>
					</div>

					{/* Statistics */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="bg-blue-50 rounded-lg p-4">
							<p className="text-sm text-blue-700 font-medium">Σύνολο Τραπέζιών</p>
							<p className="text-2xl font-bold text-blue-900 mt-1">
								{tables.length}
							</p>
						</div>
						<div className="bg-purple-50 rounded-lg p-4">
							<p className="text-sm text-purple-700 font-medium">Συνολική Χωρητικότητα</p>
							<p className="text-2xl font-bold text-purple-900 mt-1">
								{totalCapacity}
							</p>
						</div>
						<div className="bg-green-50 rounded-lg p-4">
							<p className="text-sm text-green-700 font-medium">Ανατεθειμένοι Καλεσμένοι</p>
							<p className="text-2xl font-bold text-green-900 mt-1">
								{totalAssigned}
							</p>
						</div>
						<div className="bg-amber-50 rounded-lg p-4">
							<p className="text-sm text-amber-700 font-medium">Μη Ανατεθειμένοι</p>
							<p className="text-2xl font-bold text-amber-900 mt-1">
								{unassignedCount}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-6 py-8">
				<div className="grid lg:grid-cols-3 gap-6">
					{/* Unassigned Guests */}
					<div className="lg:col-span-1">
						<div className="bg-white rounded-xl border border-neutral-200 p-5">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold text-neutral-900">
									Μη Ανατεθειμένοι Καλεσμένοι
								</h2>
								<span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-bold rounded-full">
									{unassignedCount}
								</span>
							</div>

							<div className="relative mb-4">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
								<input
									type="text"
									placeholder="Αναζήτηση καλεσμένων..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
								/>
							</div>

							<div className="space-y-2 max-h-[600px] overflow-y-auto">
								{filteredGuests.length === 0 ? (
									<p className="text-center text-neutral-500 py-8">
										{searchQuery
											? 'Δεν βρέθηκαν καλεσμένοι'
											: 'Όλοι οι καλεσμένοι έχουν ανατεθεί! 🎉'}
									</p>
								) : (
									filteredGuests.map((guest) => (
										<div
											key={guest.id}
											className="p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
											onClick={() => {
												setSelectedGuest(guest.id);
												setShowAssignmentModal(true);
											}}
										>
											<p className="font-medium text-neutral-900">
												{guest.name} {guest.surname}
											</p>
											<p className="text-sm text-neutral-500">
												{guest.family_name}
											</p>
										</div>
									))
								)}
							</div>
						</div>
					</div>

					{/* Tables Display */}
					<div className="lg:col-span-2">
						<div className="bg-white rounded-xl border border-neutral-200 p-5 mb-4">
							<label className="block text-sm font-medium text-neutral-700 mb-2">
								Φιλτράρισμα ανά τραπέζι
							</label>
							<select
								value={selectedTableFilter}
								onChange={(e) =>
									setSelectedTableFilter(
										e.target.value === 'all' ? 'all' : parseInt(e.target.value)
									)
								}
								className={inputClass}
							>
								<option value="all">Όλα τα Τραπέζια</option>
								{tables.map((table) => (
									<option key={table.id} value={table.table_number}>
										Τραπέζι {table.table_number}
										{table.table_name ? ` - ${table.table_name}` : ''}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-4">
							{displayTables.map((table) => {
								const tableAssignments = getTableAssignments(table.table_number);
								const availableSeats = table.capacity - tableAssignments.length;

								return (
									<div
										key={table.id}
										className="bg-white rounded-xl border border-neutral-200 p-5"
									>
										<div className="flex items-start justify-between mb-4">
											<div>
												<div className="flex items-center gap-3">
													<h3 className="text-2xl font-bold text-neutral-900">
														Τραπέζι {table.table_number}
													</h3>
													{table.table_name && (
														<span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded">
															{table.table_name}
														</span>
													)}
												</div>
												<div className="flex gap-4 text-sm text-neutral-600 mt-2">
													<p>
														Χωρητικότητα: {tableAssignments.length}/{table.capacity}
													</p>
													{table.location && <p>📍 {table.location}</p>}
												</div>
												{table.notes && (
													<p className="text-sm text-neutral-500 italic mt-2">
														{table.notes}
													</p>
												)}
											</div>

											<div className="flex gap-2">
												<button
													onClick={() => {
														setSelectedTable(table.table_number);
														setShowAssignmentModal(true);
													}}
													disabled={availableSeats === 0}
													className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
													title="Προσθήκη καλεσμένου"
												>
													<Plus className="w-5 h-5" />
												</button>
												<button
													onClick={() => handleDeleteTable(table.id)}
													className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
													title="Διαγραφή τραπεζιού"
												>
													<Trash2 className="w-5 h-5" />
												</button>
											</div>
										</div>

										{/* Assigned Guests */}
										<div className="space-y-2">
											{tableAssignments.length === 0 ? (
												<p className="text-neutral-400 text-center py-4">
													Δεν έχουν ανατεθεί καλεσμένοι ακόμα
												</p>
											) : (
												tableAssignments.map((assignment) => {
													const guest = guests.find(
														(g) => g.id === assignment.guest_id
													);
													return (
														<div
															key={assignment.id}
															className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg group"
														>
															<div className="flex items-center gap-3">
																{assignment.seat_number && (
																	<span className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-700 font-bold text-sm rounded-full">
																		{assignment.seat_number}
																	</span>
																)}
																<div>
																	<p className="font-medium text-neutral-900">
																		{assignment.guest_name}
																	</p>
																	{guest?.family_name && (
																		<p className="text-sm text-neutral-500">
																			{guest.family_name}
																		</p>
																	)}
																</div>
															</div>
															<button
																onClick={() =>
																	handleUnassignGuest(assignment.id)
																}
																className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>
													);
												})
											)}
										</div>

										{availableSeats > 0 && (
											<p className="text-center text-sm text-neutral-500 mt-3">
												{availableSeats} {availableSeats === 1 ? 'θέση' : 'θέσεις'} διαθέσιμες
											</p>
										)}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Create Table Modal */}
			{showTableForm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
					<div className="bg-white rounded-2xl p-6 max-w-md w-full">
						<h2 className="text-2xl font-bold text-neutral-900 mb-4">
							Δημιουργία Νέου Τραπεζιού
						</h2>

						<form onSubmit={handleCreateTable} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-neutral-700 mb-1">
									Αριθμός Τραπεζιού *
								</label>
								<input
									type="number"
									min="1"
									value={tableForm.table_number}
									onChange={(e) =>
										setTableForm({
											...tableForm,
											table_number: parseInt(e.target.value) || 1,
										})
									}
									className={inputClass}
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-neutral-700 mb-1">
									Όνομα Τραπεζιού (προαιρετικό)
								</label>
								<input
									type="text"
									placeholder="π.χ. Κεντρικό Τραπέζι, Τραπέζι Οικογένειας"
									value={tableForm.table_name}
									onChange={(e) =>
										setTableForm({ ...tableForm, table_name: e.target.value })
									}
									className={inputClass}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-neutral-700 mb-1">
									Χωρητικότητα *
								</label>
								<input
									type="number"
									min="1"
									value={tableForm.capacity}
									onChange={(e) =>
										setTableForm({
											...tableForm,
											capacity: parseInt(e.target.value) || 8,
										})
									}
									className={inputClass}
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-neutral-700 mb-1">
									Τοποθεσία (προαιρετικό)
								</label>
								<input
									type="text"
									placeholder="π.χ. Κεντρική Αίθουσα - Αριστερή Πλευρά"
									value={tableForm.location}
									onChange={(e) =>
										setTableForm({ ...tableForm, location: e.target.value })
									}
									className={inputClass}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-neutral-700 mb-1">
									Σημειώσεις (προαιρετικό)
								</label>
								<textarea
									placeholder="Οποιαδήποτε επιπλέον πληροφορία..."
									value={tableForm.notes}
									onChange={(e) =>
										setTableForm({ ...tableForm, notes: e.target.value })
									}
									rows={2}
									className={inputClass}
								/>
							</div>

							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={() => setShowTableForm(false)}
									className="flex-1 px-4 py-3 border-2 border-neutral-200 text-neutral-700 rounded-lg font-semibold hover:bg-neutral-50 transition-colors"
								>
									Ακύρωση
								</button>
								<button
									type="submit"
									className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
								>
									Δημιουργία Τραπεζιού
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Assign Guest Modal */}
			{showAssignmentModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
					<div className="bg-white rounded-2xl p-6 max-w-md w-full">
						<h2 className="text-2xl font-bold text-neutral-900 mb-4">
							Ανάθεση Καλεσμένου σε Τραπέζι
						</h2>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-neutral-700 mb-1">
									Τραπέζι *
								</label>
								<select
									value={selectedTable || ''}
									onChange={(e) =>
										setSelectedTable(
											e.target.value ? parseInt(e.target.value) : null
										)
									}
									className={inputClass}
									required
								>
									<option value="">Επιλέξτε τραπέζι</option>
									{tables.map((table) => {
										const assignments = getTableAssignments(table.table_number);
										const available = table.capacity - assignments.length;
										return (
											<option
												key={table.id}
												value={table.table_number}
												disabled={available === 0}
											>
												Τραπέζι {table.table_number}
												{table.table_name ? ` - ${table.table_name}` : ''} (
												{available} διαθέσιμες)
											</option>
										);
									})}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-neutral-700 mb-1">
									Καλεσμένος *
								</label>
								<select
									value={selectedGuest}
									onChange={(e) => setSelectedGuest(e.target.value)}
									className={inputClass}
									required
								>
									<option value="">Επιλέξτε καλεσμένο</option>
									{getUnassignedGuests().map((guest) => (
										<option key={guest.id} value={guest.id}>
											{guest.name} {guest.surname} ({guest.family_name})
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-neutral-700 mb-1">
									Αριθμός Θέσης (προαιρετικό)
								</label>
								<input
									type="number"
									min="1"
									placeholder="π.χ. 1, 2, 3..."
									value={seatNumber}
									onChange={(e) => setSeatNumber(e.target.value)}
									className={inputClass}
								/>
							</div>

							<div className="flex gap-3 pt-2">
								<button
									onClick={() => {
										setShowAssignmentModal(false);
										setSelectedTable(null);
										setSelectedGuest('');
										setSeatNumber('');
									}}
									className="flex-1 px-4 py-3 border-2 border-neutral-200 text-neutral-700 rounded-lg font-semibold hover:bg-neutral-50 transition-colors"
								>
									Ακύρωση
								</button>
								<button
									onClick={handleAssignGuest}
									className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
								>
									Ανάθεση
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
