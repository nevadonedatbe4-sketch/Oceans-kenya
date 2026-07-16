import { Menu } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function DashboardMenuPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Dashboard Menu"
      description="Manage admin sidebar navigation items, roles and order."
      icon={<Menu size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="dashboard-menu" data={data} />
    </ManagementLayout>
  );
}