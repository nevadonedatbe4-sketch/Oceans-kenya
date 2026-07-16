import { Home } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function HeroSectionPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Hero Section"
      description="Full control over the homepage hero — background, overlay, text, typography, buttons, logo, layout and visibility."
      icon={<Home size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="hero" data={data} />
    </ManagementLayout>
  );
}