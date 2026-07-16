import { Search } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function SearchFiltersPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Search &amp; Filters"
      description="Control the visual style, active filters, field order, and default layout of the property search experience."
      icon={<Search size={20} className="text-[#1B4332]" />}
    >
      <ManagementTabContent activeTab="search" data={data} />
    </ManagementLayout>
  );
}