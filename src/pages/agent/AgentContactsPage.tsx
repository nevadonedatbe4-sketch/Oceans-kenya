import AgentContacts from '@/pages/agent/components/AgentContacts';

export default function AgentContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-roboto font-semibold text-xl md:text-2xl text-white leading-tight">My Contact Book</h2>
        <p className="text-sm text-[#8b98ab] font-roboto mt-1">Your personal database of clients, buyers and sellers.</p>
      </div>
      <AgentContacts />
    </div>
  );
}