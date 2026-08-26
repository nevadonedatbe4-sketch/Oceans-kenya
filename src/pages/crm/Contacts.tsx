import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { addToast } from '@/pages/crm/components/CRMToast';
import CRMPagination from '@/pages/crm/components/CRMPagination';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: string | null;
  tags: string[] | null;
  notes: string | null;
  source: string | null;
  created_at: string;
}

const CONTACT_TYPES = [
  { value: 'client', label: 'Client', icon: 'ri-user-line', color: '#6b7280' },
  { value: 'landlord', label: 'Landlord', icon: 'ri-home-2-line', color: '#0d5959' },
  { value: 'buyer', label: 'Buyer', icon: 'ri-shopping-bag-3-line', color: '#088135' },
  { value: 'seller', label: 'Seller', icon: 'ri-funds-line', color: '#f58300' },
  { value: 'partner', label: 'Partner / Investor', icon: 'ri-user-star-line', color: '#0ea5e9' },
  { value: 'vendor', label: 'Vendor / Developer', icon: 'ri-tools-line', color: '#ec4899' },
];

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState('all');

  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [bulkContactDeleteConfirm, setBulkContactDeleteConfirm] = useState(false);

  // Add Contact modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<'type' | 'details'>('type');
  const [newContactType, setNewContactType] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notes: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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
      countQuery = countQuery.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      dataQuery = dataQuery.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    if (filterType !== 'all') {
      countQuery = countQuery.eq('type', filterType);
      dataQuery = dataQuery.eq('type', filterType);
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
  }, [page, pageSize, search, filterType]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    const first = parts[0]?.charAt(0) || '';
    const last = parts[1]?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const getTypeInfo = (type: string | null) => {
    return CONTACT_TYPES.find((t) => t.value === type) || CONTACT_TYPES[CONTACT_TYPES.length - 1];
  };

  const openAddModal = () => {
    setAddStep('type');
    setNewContactType('');
    setFormData({ name: '', email: '', phone: '', notes: '' });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleTypeSelect = (typeValue: string) => {
    setNewContactType(typeValue);
    setAddStep('details');
  };

  const handleBackToType = () => {
    setAddStep('type');
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email address';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const { error } = await supabase.from('contacts').insert({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      type: newContactType,
      notes: formData.notes.trim() || null,
      source: 'manual',
      tags: [newContactType],
    });

    if (error) {
      addToast('Failed to add contact', 'error');
    } else {
      addToast('Contact added successfully', 'success');
      setShowAddModal(false);
      fetchContacts();
    }
    setSubmitting(false);
  };

  const toggleContactSelect = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllContacts = () => {
    if (selectedContactIds.size === contacts.length && contacts.length > 0) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleBulkDeleteContacts = async () => {
    if (selectedContactIds.size === 0) {
      addToast('No contacts selected', 'error');
      setBulkContactDeleteConfirm(false);
      return;
    }
    const ids = Array.from(selectedContactIds);
    try {
      const { error } = await supabase.from('contacts').delete().in('id', ids);
      if (error) {
        addToast('Failed to delete contacts', 'error');
        setBulkContactDeleteConfirm(false);
        return;
      }
      addToast(`${selectedContactIds.size} contacts deleted`, 'success');
      setSelectedContactIds(new Set());
      if (selectedContact && selectedContactIds.has(selectedContact.id)) setSelectedContact(null);
      fetchContacts();
    } catch (err) {
      console.error('Bulk delete contacts error:', err);
      addToast('Failed to delete contacts', 'error');
    }
    setBulkContactDeleteConfirm(false);
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) {
        addToast('Failed to delete contact', 'error');
        return;
      }
      addToast('Contact deleted', 'success');
      if (selectedContact?.id === id) setSelectedContact(null);
      fetchContacts();
    } catch (err) {
      console.error('Delete contact error:', err);
      addToast('Failed to delete contact', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setShowAddModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#636363] text-sm" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] bg-white cursor-pointer"
          >
            <option value="all">All Types</option>
            {CONTACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-roboto text-[#636363] whitespace-nowrap">{total} total contacts</span>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            style={{ backgroundColor: '#0d5959', color: '#ffffff' }}
          >
            <i className="ri-user-add-line text-sm" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedContactIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm font-semibold text-red-700">{selectedContactIds.size} selected</span>
          <button
            onClick={() => setBulkContactDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-line" />
            Delete Selected
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact List */}
        <div className="lg:col-span-2 bg-[#012144] border border-[#1c3a5e] lg:bg-white lg:border-transparent rounded-xl overflow-hidden">
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-0">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-[#1c3a5e]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#012a52] animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-28 bg-[#012a52] rounded animate-pulse" />
                      <div className="h-3 w-20 bg-[#012a52] rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : contacts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-[#0d5959]/20 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-contacts-line text-[#5eead4] text-xl" />
                </div>
                <p className="text-sm font-roboto text-[#6b7280]">
                  {total === 0 ? 'No contacts yet' : 'No contacts match your filters'}
                </p>
                {total === 0 && (
                  <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 mt-3 rounded-lg text-sm font-semibold text-white bg-[#0d5959] cursor-pointer"
                  >
                    <i className="ri-user-add-line text-sm" />
                    Add Your First Contact
                  </button>
                )}
              </div>
            ) : (
              contacts.map((contact) => {
                const typeInfo = getTypeInfo(contact.type);
                return (
                  <div
                    key={contact.id}
                    className={`px-4 py-3 border-b border-[#1c3a5e] cursor-pointer ${
                      selectedContact?.id === contact.id ? 'bg-[#0d5959]/10' : ''
                    }`}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#0d5959]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#5eead4] text-xs font-semibold">{getInitials(contact.name)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-roboto text-white font-medium truncate">{contact.name}</p>
                          <p className="text-xs font-roboto text-[#6b7280] truncate">{contact.email}</p>
                        </div>
                      </div>
                      {contact.type && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ml-2"
                          style={{ backgroundColor: `${typeInfo.color}25`, color: typeInfo.color }}
                        >
                          <i className={`${typeInfo.icon} text-[9px]`} />
                          {typeInfo.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f0f0f0]">
                  <th className="px-2 md:px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedContactIds.size === contacts.length && contacts.length > 0}
                      onChange={toggleSelectAllContacts}
                      className="w-4 h-4 rounded border-gray-300 text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#636363] uppercase tracking-wider">Name</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#636363] uppercase tracking-wider hidden sm:table-cell">Contact</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#636363] uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="px-4 md:px-5 py-3 text-left text-xs font-roboto font-medium text-[#636363] uppercase tracking-wider hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 md:px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#f7f8fa] animate-pulse" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-28 bg-[#f7f8fa] rounded animate-pulse" />
                            <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <div className="space-y-1.5">
                          <div className="h-3 w-24 bg-[#f7f8fa] rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                        <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                      </td>
                      <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                        <div className="h-3 w-20 bg-[#f7f8fa] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 md:px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-[#0d5959]/8 flex items-center justify-center">
                          <i className="ri-contacts-line text-[#0d5959] text-2xl" />
                        </div>
                        <div>
                          <p className="text-sm font-roboto font-medium text-[#001731]">
                            {total === 0 ? 'No contacts yet' : 'No contacts match your filters'}
                          </p>
                          <p className="text-xs font-roboto text-[#636363] mt-0.5">
                            {total === 0 ? 'Form submissions and manually added contacts will appear here.' : 'Try adjusting your search or type filter.'}
                          </p>
                        </div>
                        {total === 0 && (
                          <button
                            onClick={openAddModal}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0d5959] hover:bg-[#0b4a4a] transition-colors cursor-pointer"
                          >
                            <i className="ri-user-add-line text-sm" />
                            Add Your First Contact
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => {
                    const typeInfo = getTypeInfo(contact.type);
                    return (
                      <tr
                        key={contact.id}
                        className={`hover:bg-[#f7f8fa]/60 transition-colors cursor-pointer ${
                          selectedContact?.id === contact.id ? 'bg-[#0d5959]/5' : ''
                        }`}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <td className="px-2 md:px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedContactIds.has(contact.id)}
                            onChange={() => toggleContactSelect(contact.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#0d5959] focus:ring-[#0d5959] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 md:px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#0d5959]/8 flex items-center justify-center flex-shrink-0">
                              <span className="text-[#0d5959] text-xs font-semibold">{getInitials(contact.name)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-roboto text-[#001731] font-medium truncate">{contact.name}</p>
                              {contact.type && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] font-semibold mt-0.5"
                                  style={{ backgroundColor: `${typeInfo.color}12`, color: typeInfo.color }}
                                >
                                  <i className={`${typeInfo.icon} text-[9px]`} />
                                  {typeInfo.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-1.5 text-xs font-roboto text-[#636363]">
                                <i className="ri-mail-line text-xs" />
                                <span className="truncate max-w-[140px]">{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1.5 text-xs font-roboto text-[#636363]">
                                <i className="ri-phone-line text-xs" />
                                {contact.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 md:px-5 py-3 hidden md:table-cell">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{ backgroundColor: `${typeInfo.color}12`, color: typeInfo.color }}
                          >
                            <i className={`${typeInfo.icon} text-[9px]`} />
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-4 md:px-5 py-3 hidden sm:table-cell">
                          <span className="text-xs font-roboto text-[#636363]">
                            {new Date(contact.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                      </tr>
                    );
                  })
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
        <div className="bg-white rounded-xl p-5 flex flex-col h-fit">
          {selectedContact ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-14 h-14 rounded-full bg-[#0d5959]/8 flex items-center justify-center mb-3">
                    <span className="text-[#0d5959] text-lg font-semibold">{getInitials(selectedContact.name)}</span>
                  </div>
                  <h3 className="font-jost text-base text-[#001731]">{selectedContact.name}</h3>
                  {selectedContact.type && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold mt-1"
                      style={{ backgroundColor: `${getTypeInfo(selectedContact.type).color}12`, color: getTypeInfo(selectedContact.type).color }}
                    >
                      <i className={`${getTypeInfo(selectedContact.type).icon} text-[9px]`} />
                      {getTypeInfo(selectedContact.type).label}
                    </span>
                  )}
                  <p className="text-xs font-roboto text-[#636363] mt-1">
                    Added {new Date(selectedContact.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteContact(selectedContact.id); }}
                  className="p-1.5 rounded-md text-[#636363] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors cursor-pointer"
                  title="Delete contact"
                >
                  <i className="ri-delete-bin-line text-sm" />
                </button>
              </div>

              <div className="space-y-3">
                {selectedContact.email && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f7f8fa] flex items-center justify-center flex-shrink-0">
                      <i className="ri-mail-line text-[#636363] text-sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-roboto text-[#636363]">Email</p>
                      <a href={`mailto:${selectedContact.email}`} className="text-sm font-roboto text-[#001731] hover:text-[#0d5959] truncate block">{selectedContact.email}</a>
                    </div>
                  </div>
                )}
                {selectedContact.phone && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f7f8fa] flex items-center justify-center flex-shrink-0">
                      <i className="ri-phone-line text-[#636363] text-sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-roboto text-[#636363]">Phone</p>
                      <a href={`tel:${selectedContact.phone}`} className="text-sm font-roboto text-[#001731] hover:text-[#0d5959] block">{selectedContact.phone}</a>
                    </div>
                  </div>
                )}
                {selectedContact.source && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f7f8fa] flex items-center justify-center flex-shrink-0">
                      <i className="ri-global-line text-[#636363] text-sm" />
                    </div>
                    <div>
                      <p className="text-xs font-roboto text-[#636363]">Source</p>
                      <p className="text-sm font-roboto text-[#001731] capitalize">{selectedContact.source}</p>
                    </div>
                  </div>
                )}
              </div>

              {selectedContact.notes && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <i className="ri-sticky-note-line text-[#636363] text-sm" />
                    <p className="text-xs font-roboto text-[#636363] uppercase tracking-wider">Notes</p>
                  </div>
                  <div className="bg-[#f7f8fa] rounded-lg p-3">
                    <p className="text-sm font-roboto text-[#001731] leading-relaxed whitespace-pre-wrap">{selectedContact.notes}</p>
                  </div>
                </div>
              )}

              {selectedContact.tags && selectedContact.tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <i className="ri-price-tag-3-line text-[#636363] text-sm" />
                    <p className="text-xs font-roboto text-[#636363] uppercase tracking-wider">Tags</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContact.tags.map((tag) => (
                      <span key={tag} className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-[#f7f8fa] text-[#636363] capitalize">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-[#0d5959]/8 flex items-center justify-center mx-auto mb-3">
                <i className="ri-contacts-line text-[#0d5959] text-xl" />
              </div>
              <p className="text-sm font-roboto text-[#636363]">Select a contact to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKeyDown}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <div className="flex items-center gap-2">
                <i className="ri-user-add-line text-[#0d5959] text-lg" />
                <h2 className="text-base font-jost font-semibold text-[#001731]">
                  {addStep === 'type' ? 'Add New Contact' : 'Contact Details'}
                </h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-md text-[#636363] hover:text-[#001731] hover:bg-[#f7f8fa] transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-[#f0f0f0] bg-[#f7f8fa]/50">
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${addStep === 'type' ? 'text-[#001731]' : 'text-[#0d5959]'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${addStep === 'type' ? 'bg-[#001731] text-white' : 'bg-[#0d5959] text-white'}`}>
                  {addStep === 'details' ? <i className="ri-check-line text-[10px]" /> : '1'}
                </span>
                Contact Type
              </div>
              <div className="flex-1 h-px bg-[#e5e7eb]" />
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${addStep === 'details' ? 'text-[#001731]' : 'text-[#9ca3af]'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${addStep === 'details' ? 'bg-[#001731] text-white' : 'bg-[#e5e7eb] text-[#9ca3af]'}`}>2</span>
                Details
              </div>
            </div>

            {/* Step 1: Type selection */}
            {addStep === 'type' && (
              <div className="p-6">
                <p className="text-sm font-roboto text-[#636363] mb-4">Select the type of contact you want to add:</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {CONTACT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => handleTypeSelect(t.value)}
                      className="flex items-center gap-3 p-3.5 rounded-lg border border-[#f0f0f0] hover:border-[#0d5959]/30 hover:bg-[#0d5959]/3 transition-all cursor-pointer text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${t.color}15` }}
                      >
                        <i className={`${t.icon} text-sm`} style={{ color: t.color }} />
                      </div>
                      <span className="text-sm font-roboto font-medium text-[#001731]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Details form */}
            {addStep === 'details' && (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Selected type badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-roboto text-[#636363]">Type:</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: `${getTypeInfo(newContactType).color}15`, color: getTypeInfo(newContactType).color }}
                  >
                    <i className={`${getTypeInfo(newContactType).icon} text-[11px]`} />
                    {getTypeInfo(newContactType).label}
                  </span>
                  <button
                    type="button"
                    onClick={handleBackToType}
                    className="ml-auto text-xs font-roboto text-[#0d5959] hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-roboto font-medium text-[#001731] mb-1.5">
                    Full Name <span className="text-[#dc2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormErrors({ ...formErrors, name: '' }); }}
                    placeholder="e.g. Jane Muthoni"
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm font-roboto focus:outline-none focus:ring-1 bg-white ${formErrors.name ? 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/20' : 'border-[#f0f0f0] focus:border-[#0d5959] focus:ring-[#0d5959]/20'}`}
                  />
                  {formErrors.name && <p className="text-xs text-[#dc2626] mt-1">{formErrors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-roboto font-medium text-[#001731] mb-1.5">
                    Email Address <span className="text-[#dc2626]">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFormErrors({ ...formErrors, email: '' }); }}
                    placeholder="e.g. jane@example.com"
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm font-roboto focus:outline-none focus:ring-1 bg-white ${formErrors.email ? 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/20' : 'border-[#f0f0f0] focus:border-[#0d5959] focus:ring-[#0d5959]/20'}`}
                  />
                  {formErrors.email && <p className="text-xs text-[#dc2626] mt-1">{formErrors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-roboto font-medium text-[#001731] mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +254 700 123 456"
                    className="w-full px-3.5 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-roboto font-medium text-[#001731] mb-1.5">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any relevant notes about this contact..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-3.5 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto focus:outline-none focus:border-[#0d5959] focus:ring-1 focus:ring-[#0d5959]/20 bg-white resize-none"
                  />
                  <p className="text-[10px] text-[#9ca3af] mt-1 text-right">{formData.notes.length}/500</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBackToType}
                    className="px-4 py-2.5 rounded-lg text-sm font-roboto font-medium text-[#636363] hover:text-[#001731] hover:bg-[#f7f8fa] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                    style={{ backgroundColor: '#0d5959' }}
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <i className="ri-check-line text-sm" />
                        Add Contact
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {bulkContactDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBulkContactDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-roboto text-base font-semibold text-[#001731] mb-2">Delete {selectedContactIds.size} Contacts?</h3>
            <p className="text-sm font-roboto text-[#636363] mb-5">This will permanently remove all {selectedContactIds.size} selected contacts. This cannot be undone.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setBulkContactDeleteConfirm(false)} className="flex-1 px-4 py-2.5 border border-[#f0f0f0] rounded-lg text-sm font-roboto text-[#636363] hover:bg-[#f7f8fa] transition-all cursor-pointer">Cancel</button>
              <button onClick={handleBulkDeleteContacts} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-roboto transition-all cursor-pointer">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}