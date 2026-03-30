import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout/Layout';
import { TableFinder } from './pages/TableFinder';
import { Moments } from './pages/Moments';
import { Wishes } from './pages/Wishes';
import { RSVP } from './pages/RSVP';
import { Admin } from './pages/Admin';
import { TablesManagement } from './pages/TablesManagement';

function App() {
	return (
		<BrowserRouter>
			<Layout>
				<Routes>
					<Route path="/" element={<Navigate to="/admin" replace />} />
					<Route path="/table" element={<TableFinder />} />
					<Route path="/moments" element={<Moments />} />
					<Route path="/wishes" element={<Wishes />} />
					<Route path="/rsvp" element={<RSVP />} />
					<Route path="/admin" element={<Admin />} />
					<Route path="/tables-management" element={<TablesManagement />} />
				</Routes>
			</Layout>

			<Toaster
				position="top-center"
				style={{ zIndex: 9999 }}
				toastOptions={{
					style: {
						background: 'white',
						color: 'rgb(23, 23, 23)',
						border: '1px solid rgb(229, 229, 229)',
						borderRadius: '12px',
						padding: '16px',
						zIndex: 9999,
					},
				}}
			/>
		</BrowserRouter>
	);
}

export default App;
