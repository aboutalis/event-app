import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Home } from 'lucide-react';

const NotFound = () => {
	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center">
			<main className="text-center px-4">
				<p className="font-serif text-[8rem] md:text-[12rem] leading-none font-medium text-slate-200 select-none mb-4">
					404
				</p>
				<h1 className="text-3xl md:text-4xl lg:text-5xl font-medium text-slate-800 leading-tight mb-6">
					Page Not Found
				</h1>
				<p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-md mx-auto mb-10">
					The page you are looking for does not exist or has been moved.
				</p>
				<Button size="lg" className="group" asChild>
					<Link to="/">
						<Home className="w-4 h-4 mr-2" />
						Return Home
						<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
					</Link>
				</Button>
			</main>
		</div>
	);
};

export default NotFound;
