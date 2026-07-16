import { Share2 } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function SocialMediaPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Social Media"
      description="Configure social media links and where they appear."
      icon={<Share2 size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="social" data={data} />
    </ManagementLayout>
  );
}