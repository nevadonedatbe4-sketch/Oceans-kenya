import { Phone } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function ContactCompanyPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Contact & Company"
      description="Company information, contact details and page images."
      icon={<Phone size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="contact" data={data} />
    </ManagementLayout>
  );
}