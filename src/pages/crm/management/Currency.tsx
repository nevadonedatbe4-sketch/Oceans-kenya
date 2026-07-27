import { DollarSign } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import CurrencyManager from '../components/CurrencyManager';

export default function CurrencyPage() {
  return (
    <ManagementLayout
      title="Price & Currency"
      description="Manage currencies, exchange rates, and display settings. KES is the default website currency."
      icon={<DollarSign size={20} className="text-[#0d5959]" />}
    >
      <CurrencyManager />
    </ManagementLayout>
  );
}