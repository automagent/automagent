import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import Layout from './components/Layout';

const HomePage = lazy(() => import('./pages/HomePage'));
const AgentDetailPage = lazy(() => import('./pages/AgentDetailPage'));
const VersionsPage = lazy(() => import('./pages/VersionsPage'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={null}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="/:scope/:name"
          element={
            <Suspense fallback={null}>
              <AgentDetailPage />
            </Suspense>
          }
        />
        <Route
          path="/:scope/:name/versions"
          element={
            <Suspense fallback={null}>
              <VersionsPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
