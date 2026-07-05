import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import CRMPagination from '@/pages/crm/components/CRMPagination';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string | null;
  created_at: string;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchContacts = useCallback(async () => {
    setLoading(true);

    let countQuery = supabase.from('contacts').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search.trim()) {
      const term = search.trim();
      countQuery = countQuery.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
      dataQuery = dataQuery.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);

    if (error) {
      console.error('Error fetching contacts:', error);
      addToast('Failed to load contacts', 'error');
    } else {
      setContacts(data || []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    const first = parts[0]?.charAt(0) || '';
    const last = parts[1]?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8a99] text-sm" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-[#e8edf2] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
          />
        </div>
        <span className="text-xs font-roboto text-[#7a8a99]">{total} total contacts</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e8edf2] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8edf2]">
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider">Name</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden sm:table-cell">Contact</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden md:table-cell">Source</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#7a8a99] uppercase tracking-wider hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8edf2]/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 md:px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#f8fafc] animate-pulse" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-28 bg-[#f8fafc] rounded animate-pulse" />
                            <div className="h-3 w-20 bg-[#f8fafc] rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <div className="space-y-1.5">
                          <div className="h-3 w-24 bg-[#f8fafc] rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <div className="h-3 w-20 bg-[#f8fafc] rounded animate-pulse" />
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <div className="h-3 w-20 bg-[#f8fafc] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 md:px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
                          <i className="ri-mail-line text-[#0d5959] text-xl" />
                        </div>
                        <p className="text-sm font-roboto text-[#7a8a99]">
                          {total === 0 ? 'No contacts yet. Submissions will appear here.' : 'No contacts match your search.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={`hover:bg-[#f8fafc]/60 transition-colors cursor-pointer ${
                        selectedContact?.id === contact.id ? 'bg-[#0d5959]/5' : ''
                      }`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <td className="px-4 md:px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#0d5959] text-xs font-semibold">{getInitials(contact.name)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-roboto text-[#001731] font-medium">{contact.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <div className="space-y-1">
                          {contact.email && (
                            <div className="flex items-center gap-1.5 text-xs font-roboto text-[#7a8a99]">
                              <i className="ri-mail-line text-xs" />
                              <span className="truncate max-w-[140px]">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1.5 text-xs font-roboto text-[#7a8a99]">
                              <i className="ri-phone-line text-xs" />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <span className="text-xs font-roboto text-[#7a8a99]">{contact.source || '—'}</span>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <span className="text-xs font-roboto text-[#7a8a99]">
                          {new Date(contact.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && contacts.length > 0 && (
            <CRMPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border border-[#e8edf2] p-5">
          {selectedContact ? (
            <div className="space-y-5">
              <div>
                <div className="w-14 h-14 rounded-full bg-[#0d5959]/8 flex items-center justify-center mb-3">
                  <span className="text-[#0d5959] text-lg font-semibold">{getInitials(selectedContact.name)}</span>
                </div>
                <h3 className="font-jost text-base text-[#001731]">{selectedContact.name}</h3>
                <p className="text-xs font-roboto text-[#7a8a99]">
                  Submitted {new Date(selectedContact.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="space-y-3">
                {selectedContact.email && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f8fafc] flex items-center justify-center">
                      <i className="ri-mail-line text-[#7a8a99] text-sm" />
                    </div>
                    <div>
                      <p className="text-xs font-roboto text-[#7a8a99]">Email</p>
                      <p className="text-sm font-roboto text-[#001731]">{selectedContact.email}</p>
                    </div>
                  </div>
                )}
                {selectedContact.phone && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f8fafc] flex items-center justify-center">
                      <i className="ri-phone-line text-[#7a8a99] text-sm" />
                    </div>
                    <div>
                      <p className="text-xs font-roboto text-[#7a8a99]">Phone</p>
                      <p className="text-sm font-roboto text-[#001731]">{selectedContact.phone}</p>
                    </div>
                  </div>
                )}
                {selectedContact.source && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f8fafc] flex items-center justify-center">
                      <i className="ri-global-line text-[#7a8a99] text-sm" />
                    </div>
                    <div>
                      <p className="text-xs font-roboto text-[#7a8a99]">Source</p>
                      <p className="text-sm font-roboto text-[#001731]">{selectedContact.source}</p>
                    </div>
                  </div>
                )}
              </div>

              {selectedContact.message && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <i className="ri-message-3-line text-[#7a8a99] text-sm" />
                    <p className="text-xs font-roboto text-[#7a8a99] uppercase tracking-wider">Message</p>
                  </div>
                  <div className="bg-[#f8fafc] rounded-lg p-3">
                    <p className="text-sm font-roboto text-[#001731] leading-relaxed">{selectedContact.message}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center mx-auto mb-3">
                <i className="ri-mail-line text-[#0d5959] text-xl" />
              </div>
              <p className="text-sm font-roboto text-[#7a8a99]">Select a contact to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}