import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import { router } from './routes/router';
import { Toaster } from './components/ui/sonner';

// One QueryClient for the app. Queries are keyed by the active account's
// capability link, so switching accounts re-scopes every query automatically.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors closeButton position="bottom-right" />
    </QueryClientProvider>
  );
}
