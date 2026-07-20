import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl font-semibold tracking-tight text-muted-foreground">404</p>
      <p className="text-muted-foreground">This page doesn’t exist.</p>
      <Button onClick={() => navigate('/')}>Back to dashboard</Button>
    </div>
  );
}
