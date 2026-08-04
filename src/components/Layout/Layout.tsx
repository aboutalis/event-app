import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const NAV = [
	{ path: '/admin', label: 'Προσκλήσεις' },
	{ path: '/costs', label: 'Έξοδα' },
];

interface LayoutProps {
	children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
	const location = useLocation();

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<nav className="bg-white border-b border-secondary/60 px-6">
				<div className="max-w-5xl mx-auto flex gap-1">
					{NAV.map((item) => {
						const isActive = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={cn(
									'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
									isActive
										? 'border-accent text-accent'
										: 'border-transparent text-text-muted hover:text-text-primary'
								)}
							>
								{item.label}
							</Link>
						);
					})}
				</div>
			</nav>
			<main className="flex-1 flex flex-col">{children}</main>
		</div>
	);
}
