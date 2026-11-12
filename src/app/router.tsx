import { createBrowserRouter } from 'react-router';
import { ComingSoonPage } from '../features/home/ComingSoonPage';
import { AppLayout, PlaceholderPage } from './AppLayout';

export const router = createBrowserRouter([
  { path: '/', element: <ComingSoonPage /> },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <PlaceholderPage title="Dashboard" /> },
      { path: 'attendance', element: <PlaceholderPage title="Attendance" /> },
      { path: 'tasks', element: <PlaceholderPage title="Tasks" /> },
      { path: 'settings', element: <PlaceholderPage title="Settings" /> },
    ],
  },
  { path: '*', element: <ComingSoonPage /> },
]);
