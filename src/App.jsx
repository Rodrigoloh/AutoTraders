import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './styles/themeContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PlatformProtectedRoute } from './components/PlatformProtectedRoute';

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
const PlatformLoginPage = lazy(() =>
  import('./pages/PlatformLoginPage').then((module) => ({
    default: module.PlatformLoginPage,
  })),
);
const PlatformDashboardPage = lazy(() =>
  import('./pages/PlatformDashboardPage').then((module) => ({
    default: module.PlatformDashboardPage,
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
        <Route path="/platform/login" element={<PlatformLoginPage />} />
        <Route
          path="/platform"
          element={
            <PlatformProtectedRoute>
              <PlatformDashboardPage />
            </PlatformProtectedRoute>
          }
        />
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
        <Route path="*" element={<Navigate to="/demo-lote-norte" replace />} />
      </Routes>
    </Suspense>
  );
}
