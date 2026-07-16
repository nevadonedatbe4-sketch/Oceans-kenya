import { Settings } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function GeneralPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="General"
      description="Global site controls and default behaviour settings."
      icon={<Settings size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="general" data={data} />
    </ManagementLayout>
  );
}