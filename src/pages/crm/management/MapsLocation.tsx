import { MapPin } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import ManagementTabContent from '../components/ManagementTabContent';
import { useManagementData } from '@/hooks/useManagementData';

export default function MapsLocationPage() {
  const data = useManagementData();
  return (
    <ManagementLayout
      title="Maps & Location"
      description="Google Maps API, default map center, zoom and property pin settings."
      icon={<MapPin size={20} className="text-[#0d5959]" />}
    >
      <ManagementTabContent activeTab="maps" data={data} />
    </ManagementLayout>
  );
}