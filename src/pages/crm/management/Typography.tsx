import { Type } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function TypographyPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Typography"
      description="Font families, sizes, weights and text transforms."
      icon={<Type size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="typography" data={data} />
    </ManagementLayout>
  );
}