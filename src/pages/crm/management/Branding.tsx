import { Palette } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function BrandingPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Logos & Branding"
      description="Upload logos, favicons and set brand colours."
      icon={<Palette size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="branding" data={data} />
    </ManagementLayout>
  );
}