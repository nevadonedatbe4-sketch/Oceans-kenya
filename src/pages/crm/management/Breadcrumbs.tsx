import { ChevronRight } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function BreadcrumbsPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Breadcrumbs"
      description="Breadcrumb navigation controls."
      icon={<ChevronRight size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="breadcrumbs" data={data} />
    </ManagementLayout>
  );
}