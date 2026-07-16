import { Grid3X3 } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function PropertySettingsPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Property Settings"
      description="Control listing defaults, field requirements, price labelling, and card display behaviour."
      icon={<Grid3X3 size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="property" data={data} />
    </ManagementLayout>
  );
}