import { Layers } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function HomepageControlsPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Homepage Controls"
      description="Reorder and toggle homepage sections."
      icon={<Layers size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="homepage" data={data} />
    </ManagementLayout>
  );
}