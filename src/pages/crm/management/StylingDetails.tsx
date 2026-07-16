import { Monitor } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function StylingDetailsPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Property Detail Style"
      description="Gallery layout, sidebar position, color fields and display toggles for property detail pages."
      icon={<Monitor size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="styling-details" data={data} />
    </ManagementLayout>
  );
}