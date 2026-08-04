import React from 'react';
import { ChevronDown, Minus, Plus, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/** `text-base` below md keeps iOS Safari from zooming the viewport on focus. */
export const fieldClass =
	'w-full px-3 py-2.5 rounded-xl border border-secondary bg-white text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all';

export function Label({
	children,
	hint,
}: {
	children: React.ReactNode;
	hint?: string;
}) {
	return (
		<div className="flex items-baseline justify-between mb-1.5">
			<label className="block text-xs font-medium text-text-muted">
				{children}
			</label>
			{hint && <span className="text-xs text-text-muted/70">{hint}</span>}
		</div>
	);
}

/** Big +/− targets beat a dropdown for small counts on a phone. */
export function Stepper({
	value,
	onChange,
	min = 1,
	max = 30,
}: {
	value: number;
	onChange: (v: number) => void;
	min?: number;
	max?: number;
}) {
	const btn =
		'w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:bg-secondary/40 hover:text-text-primary active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none';

	return (
		<div className="flex items-center rounded-xl border border-secondary bg-white p-0.5">
			<button
				type="button"
				onClick={() => onChange(Math.max(min, value - 1))}
				disabled={value <= min}
				className={btn}
				aria-label="Μείωση"
			>
				<Minus className="w-4 h-4" />
			</button>
			<span className="flex-1 text-center text-base font-semibold text-text-primary tabular-nums">
				{value}
			</span>
			<button
				type="button"
				onClick={() => onChange(Math.min(max, value + 1))}
				disabled={value >= max}
				className={btn}
				aria-label="Αύξηση"
			>
				<Plus className="w-4 h-4" />
			</button>
		</div>
	);
}

/** One-tap picker — replaces a select when the options are few and known. */
export function PillGroup({
	options,
	value,
	onChange,
}: {
	options: { value: string; label: string }[];
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					onClick={() => onChange(o.value)}
					className={cn(
						'px-3 py-2 rounded-xl text-sm border transition-colors active:scale-95',
						value === o.value
							? 'bg-accent text-white border-accent font-medium'
							: 'bg-white text-text-muted border-secondary hover:border-accent/60 hover:text-text-primary'
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

export function SearchInput({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
}) {
	return (
		<div className="relative flex-1">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
			<input
				type="search"
				inputMode="search"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={cn(
					fieldClass,
					'pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden'
				)}
			/>
			{value && (
				<button
					type="button"
					onClick={() => onChange('')}
					className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-text-primary transition-colors"
					aria-label="Καθαρισμός"
				>
					<X className="w-4 h-4" />
				</button>
			)}
		</div>
	);
}

export function Select({
	value,
	onChange,
	children,
}: {
	value: string;
	onChange: (v: string) => void;
	children: React.ReactNode;
}) {
	return (
		<div className="relative">
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={cn(fieldClass, 'appearance-none pr-8')}
			>
				{children}
			</select>
			<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
		</div>
	);
}

/** Amount input with a € adornment and a numeric keypad on mobile. */
export function MoneyInput({
	value,
	onChange,
	placeholder = '0.00',
	required,
	action,
}: {
	value: number;
	onChange: (v: number) => void;
	placeholder?: string;
	required?: boolean;
	action?: { label: string; onClick: () => void };
}) {
	return (
		<div className="relative">
			<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">
				€
			</span>
			<input
				type="number"
				inputMode="decimal"
				min="0"
				step="0.01"
				placeholder={placeholder}
				value={value || ''}
				onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
				className={cn(fieldClass, 'pl-7', action && 'pr-20')}
				required={required}
			/>
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
				>
					{action.label}
				</button>
			)}
		</div>
	);
}

export function Skeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="bg-white rounded-2xl border border-secondary/60 divide-y divide-secondary/40 overflow-hidden">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="px-5 py-4 flex items-center gap-4">
					<div className="flex-1 space-y-2">
						<div
							className="h-3.5 rounded bg-secondary/70 animate-pulse"
							style={{ width: `${45 + ((i * 13) % 35)}%` }}
						/>
						<div className="h-2.5 w-1/3 rounded bg-secondary/40 animate-pulse" />
					</div>
					<div className="w-24 h-8 rounded-xl bg-secondary/40 animate-pulse shrink-0" />
				</div>
			))}
		</div>
	);
}
