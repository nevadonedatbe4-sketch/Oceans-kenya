import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function RequiredFieldsPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Required Fields"
      description="Define which fields must be filled before a listing or inquiry can be submitted."
      icon={<i className="ri-checkbox-circle-line text-[#1B4332] text-lg"></i>}
    >
      <ManagementTabContent activeTab="required" data={data} />
    </ManagementLayout>
  );
}