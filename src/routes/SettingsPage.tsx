import { PageHeader } from '@/components/PageHeader';
import { SettingsPanel } from '@/features/account/SettingsPanel';

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Account, member mailboxes, and your capability link." />
      <SettingsPanel />
    </div>
  );
}
