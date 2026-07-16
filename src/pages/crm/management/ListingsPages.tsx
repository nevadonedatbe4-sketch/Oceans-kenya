import { Building2 } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function ListingsPagesPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Properties Pages"
      description="Hero banners, CTA controls and page-specific settings."
      icon={<Building2 size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="listings-pages" data={data} />
    </ManagementLayout>
  );
}