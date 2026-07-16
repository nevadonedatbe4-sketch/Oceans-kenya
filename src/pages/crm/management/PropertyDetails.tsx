import { Layers } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function PropertyDetailsPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Property Details"
      description="Control which sections appear on property detail pages and their order."
      icon={<Layers size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="property-details" data={data} />
    </ManagementLayout>
  );
}