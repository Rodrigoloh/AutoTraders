import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './styles/themeContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute';

const PublicCatalogPage = lazy(() =>
  import('./pages/PublicCatalogPage').then((module) => ({
    default: module.PublicCatalogPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import('./pages/AdminLoginPage').then((module) => ({
    default: module.AdminLoginPage,
  })),
);

function TenantLayout() {
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="app-shell"><div className="container loading-state">Cargando interfaz...</div></div>}>
      <Routes>
        <Route path="/:slug" element={<TenantLayout />}>
          <Route index element={<PublicCatalogPage />} />
          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/demo" replace />} />
      </Routes>
    </Suspense>
  );
}
