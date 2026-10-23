import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Auth Pages
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { WorkspaceSetupPage } from '../features/auth/WorkspaceSetupPage';

// App Pages
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { BrandKnowledgePage } from '../features/brand-knowledge/BrandKnowledgePage';
import { GuidelinesPage } from '../features/brand-knowledge/GuidelinesPage';
import { TerminologyPage } from '../features/brand-knowledge/TerminologyPage';
import { ProhibitedPhrasesPage } from '../features/brand-knowledge/ProhibitedPhrasesPage';
import { DisclaimersPage } from '../features/brand-knowledge/DisclaimersPage';
import { FactsPage } from '../features/brand-knowledge/FactsPage';
import { SubmissionsListPage } from '../features/submissions/SubmissionsListPage';
import { NewSubmissionPage } from '../features/submissions/NewSubmissionPage';
import { SubmissionDetailPage } from '../features/submissions/SubmissionDetailPage';
import { ReviewQueuePage } from '../features/reviews/ReviewQueuePage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { WorkspaceSettingsPage } from '../features/settings/WorkspaceSettingsPage';
import { ProfilePage } from '../features/settings/ProfilePage';
import { NotFoundPage } from '../features/common/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    ),
  },
  {
    path: '/register',
    element: (
      <AuthLayout>
        <RegisterPage />
      </AuthLayout>
    ),
  },
  {
    path: '/setup-workspace',
    element: (
      <ProtectedRoute>
        <AuthLayout>
          <WorkspaceSetupPage />
        </AuthLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'brand-knowledge',
        element: <BrandKnowledgePage />,
      },
      {
        path: 'brand-knowledge/guidelines',
        element: <GuidelinesPage />,
      },
      {
        path: 'brand-knowledge/terminology',
        element: <TerminologyPage />,
      },
      {
        path: 'brand-knowledge/prohibited-phrases',
        element: <ProhibitedPhrasesPage />,
      },
      {
        path: 'brand-knowledge/disclaimers',
        element: <DisclaimersPage />,
      },
      {
        path: 'brand-knowledge/facts',
        element: <FactsPage />,
      },
      {
        path: 'submissions',
        element: <SubmissionsListPage />,
      },
      {
        path: 'submissions/new',
        element: <NewSubmissionPage />,
      },
      {
        path: 'submissions/:id',
        element: <SubmissionDetailPage />,
      },
      {
        path: 'reviews',
        element: <ReviewQueuePage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
      {
        path: 'settings',
        element: <WorkspaceSettingsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
