import React, { useEffect, ReactNode } from 'react';

interface FormModalProps {
	open: boolean;
	title: string;
	onClose: () => void;
	onSubmit: (e: React.FormEvent) => void;
	children: ReactNode;
	/** Rendered in a footer that stays put while the body scrolls. */
	footer: ReactNode;
}

/**
 * Centered dialog on desktop, bottom sheet on phones (thumb-reachable).
 * Header and footer are pinned so the save button is never scrolled away.
 */
export function FormModal({
	open,
	title,
	onClose,
	onSubmit,
	children,
	footer,
}: FormModalProps) {
	useEffect(() => {
		if (!open) return;

		document.body.style.overflow = 'hidden';
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);

		return () => {
			document.body.style.overflow = '';
			window.removeEventListener('keydown', onKey);
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 !m-0"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in-fast" />

			<div
				className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-elevated overflow-hidden max-h-[92dvh] sm:max-h-[90dvh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Sheet grab handle — mobile only */}
				<div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
					<div className="w-10 h-1 rounded-full bg-secondary" />
				</div>

				<div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-secondary/60 shrink-0">
					<h2 className="text-base font-semibold text-text-primary">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="-mr-2 p-2 text-text-muted hover:text-text-primary transition-colors"
						aria-label="Κλείσιμο"
					>
						<svg
							className="w-5 h-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
						>
							<path d="M18 6 6 18M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
					<div className="p-5 overflow-y-auto flex-1">{children}</div>
					<div className="px-5 py-3.5 border-t border-secondary/60 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
						{footer}
					</div>
				</form>
			</div>
		</div>
	);
}
