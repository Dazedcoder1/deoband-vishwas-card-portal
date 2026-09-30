import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import './index.css';
import { AuthProvider, RequireRole } from './lib/auth.jsx';
import Home from './pages/Home.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Apply = lazy(() => import('./pages/Apply.jsx'));
const Verify = lazy(() => import('./pages/Verify.jsx'));
const UserDashboard = lazy(() => import('./pages/UserDashboard.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));

const Loading = () => (
  <div className="min-h-screen grid place-items-center text-primary">
    <span className="icon animate-spin text-4xl">progress_activity</span>
  </div>
);

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-canvas text-center p-6">
      <div>
        <p className="text-6xl font-black text-gold">404</p>
        <h1 className="text-2xl font-extrabold text-primary-deep mt-2">Page not found</h1>
        <Link to="/" className="btn-primary mt-6">Back to Home</Link>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/apply" element={<Apply />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/verify/:cardId" element={<Verify />} />
            <Route path="/dashboard" element={<RequireRole role="user"><UserDashboard /></RequireRole>} />
            <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
