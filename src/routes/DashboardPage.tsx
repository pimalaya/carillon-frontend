import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { WatchesList } from '@/features/watches/WatchesList';
import { BalanceCard } from '@/features/billing/BalanceCard';
import { DeliveriesLog } from '@/features/deliveries/DeliveriesLog';

export function DashboardPage() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your watches and balance at a glance."
        action={
          <Button onClick={() => navigate('/onboarding')}>
            <Plus />
            Add mailbox
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold">Watches</h2>
            <WatchesList />
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold">Recent deliveries</h2>
            <DeliveriesLog showWatch limit={8} />
          </section>
        </div>
        <div className="space-y-6">
          <BalanceCard />
        </div>
      </div>
    </div>
  );
}
