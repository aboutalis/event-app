import React from 'react';

interface LayoutProps {
	children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
	return (
		<div className="min-h-screen flex flex-col overflow-hidden">
			<main className="flex-1 flex flex-col relative z-10 w-full max-w-7xl mx-auto">
				{children}
			</main>
		</div>
	);
}
