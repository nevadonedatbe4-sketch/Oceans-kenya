import { DollarSign } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function CurrencyPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Price & Currency"
      description="Default currency, price format and display settings."
      icon={<DollarSign size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="currency" data={data} />
    </ManagementLayout>
  );
}