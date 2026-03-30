/**
 * INPUT COMPONENT
 * Form input with elegant styling
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, InputProps>(
	({ label, error, className, ...props }, ref) => {
		return (
			<div className="w-full">
				{label && (
					<label className="block text-sm font-medium text-neutral-700 mb-2">
						{label}
					</label>
				)}
				<input
					ref={ref}
					className={cn(
						'w-full px-4 py-3 rounded-xl border border-neutral-200',
						'bg-white text-neutral-900 placeholder:text-neutral-400',
						'focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent',
						'transition-all duration-200',
						'disabled:opacity-50 disabled:cursor-not-allowed',
						error && 'border-red-500 focus:ring-red-500',
						className
					)}
					{...props}
				/>
				{error && <p className="mt-1 text-sm text-red-600">{error}</p>}
			</div>
		);
	}
);

FormInput.displayName = 'FormInput';
