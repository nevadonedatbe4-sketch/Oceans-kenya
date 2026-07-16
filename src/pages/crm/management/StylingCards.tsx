import { CreditCard } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function StylingCardsPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Property Cards Style"
      description="Badge colors, card layout, button style and hover effects for property cards."
      icon={<CreditCard size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="styling-cards" data={data} />
    </ManagementLayout>
  );
}