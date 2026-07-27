import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Search,
  Upload,
  Trash2,
  Edit3,
  Image,
  X,
  Check,
  Link,
  Grid3X3,
  List,
  Folder,
  AlertCircle,
  Loader2,
  FileText,
  Video,
  Copy,
  Eye,
  RefreshCw as Replace,
  LayoutGrid as Layout,
} from 'lucide-react';

interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  alt_text: string;
  caption: string;
  folder: string;
  linked_module: string;
  linked_record_id: string;
  created_at: string;
  updated_at: string;
}

interface ListingItem {
  id: string;
  title: string;
  slug: string;
}

const FILE_TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'video', label: 'Videos' },
  { value: 'document', label: 'Documents' },
  { value: 'floorplan', label: 'Floor Plans' },
  { value: 'brochure', label: 'Brochures' },
];

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [editItem, setEditItem] = useState<MediaItem | null>(null);
  const [attachModal, setAttachModal] = useState<MediaItem | null>(null);
  const [attachSearch, setAttachSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState('');
  const [storageReady, setStorageReady] = useState<boolean | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [linkedUsage, setLinkedUsage] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folders = Array.from(new Set(media.map((m) => m.folder || 'Uncategorized').filter(Boolean)));

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_library')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching media:', error);
      showNotification('Failed to load media library');
    } else {
      setMedia(data || []);
    }
    setLoading(false);
  }, []);

  const fetchListings = useCallback(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, slug')
      .order('title', { ascending: true });
    if (error) {
      console.error('Error fetching listings:', error);
    } else {
      setListings(data || []);
    }
  }, []);

  const fetchLinkedUsage = useCallback(async () => {
    const { data } = await supabase
      .from('media_library')
      .select('linked_module, linked_record_id')
      .not('linked_module', 'is', null);
    const usage: Record<string, number> = {};
    (data || []).forEach((item) => {
      if (item.linked_module) {
        usage[item.linked_module] = (usage[item.linked_module] || 0) + 1;
      }
    });
    setLinkedUsage(usage);
  }, []);

  useEffect(() => {
    fetchMedia();
    fetchListings();
    fetchLinkedUsage();
  }, [fetchMedia, fetchListings, fetchLinkedUsage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { error: listError } = await supabase.storage.from('images').list('', { limit: 1 });
        if (!cancelled) setStorageReady(!listError || !listError.message.toLowerCase().includes('not found'));
      } catch {
        if (!cancelled) setStorageReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const total = files.length;
    let completed = 0;
    let failed = 0;

    for (const file of files) {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const folderPath = folderFilter || 'general';
      const filePath = `${folderPath}/${fileName}`;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', filePath);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-image`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }
        const { url } = await response.json();

        const fileType = file.type.startsWith('image/') ? 'image' :
          file.type === 'application/pdf' ? 'pdf' :
          file.type.startsWith('video/') ? 'video' :
          file.name.toLowerCase().includes('floor') || file.name.toLowerCase().includes('plan') ? 'floorplan' :
          file.name.toLowerCase().includes('brochure') ? 'brochure' :
          'document';

        const { error: dbError } = await supabase.from('media_library').insert({
          file_name: file.name,
          file_url: url,
          file_type: fileType,
          file_size: file.size,
          folder: folderPath,
          alt_text: file.name.split('.')[0].replace(/[-_]/g, ' '),
          caption: '',
        });

        if (dbError) {
          console.error('DB insert error:', dbError);
          showNotification(`Failed to save ${file.name}`);
          failed++;
        } else {
          completed++;
        }
        setUploadProgress(Math.round((completed / total) * 100));
      } catch (err: any) {
        console.error('Upload error:', err);
        showNotification(err.message || `Failed to upload ${file.name}`);
        failed++;
      }
    }

    setUploading(false);
    setUploadProgress(0);
    if (failed > 0) {
      showNotification(`${completed} of ${total} uploaded, ${failed} failed`);
    } else {
      showNotification(`${completed} of ${total} files uploaded successfully`);
    }
    fetchMedia();

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    const item = media.find((m) => m.id === id);
    if (!item) return;

    const { error: dbError } = await supabase.from('media_library').delete().eq('id', id);
    if (dbError) {
      console.error('Delete error:', dbError);
      showNotification('Failed to delete item');
      return;
    }

    if (item.file_url) {
      try {
        const url = new URL(item.file_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.indexOf('images');
        if (bucketIndex !== -1 && pathParts.length > bucketIndex + 1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          await supabase.storage.from('images').remove([filePath]);
        }
      } catch {
        // ignore
      }
    }

    setDeleteConfirm(null);
    showNotification('Item deleted successfully');
    fetchMedia();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const { error: dbError } = await supabase.from('media_library').delete().in('id', ids);
    if (dbError) {
      console.error('Bulk delete error:', dbError);
      showNotification('Failed to delete selected items');
      return;
    }

    setBulkDeleteConfirm(false);
    setSelectedIds(new Set());
    showNotification(`${ids.length} items deleted successfully`);
    fetchMedia();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const { error } = await supabase
      .from('media_library')
      .update({
        file_name: editItem.file_name,
        alt_text: editItem.alt_text,
        caption: editItem.caption,
        folder: editItem.folder,
      })
      .eq('id', editItem.id);

    if (error) {
      console.error('Update error:', error);
      showNotification('Failed to update item');
    } else {
      showNotification('Item updated successfully');
      setEditItem(null);
      fetchMedia();
    }
  };

  const handleAttachToListing = async (listingId: string) => {
    if (!attachModal) return;

    const { error: updateError } = await supabase
      .from('media_library')
      .update({
        linked_module: 'listings',
        linked_record_id: listingId,
      })
      .eq('id', attachModal.id);

    if (updateError) {
      console.error('Attach error:', updateError);
      showNotification('Failed to attach image to listing');
      return;
    }

    const { error: imageError } = await supabase.from('listing_images').insert({
      listing_id: listingId,
      url: attachModal.file_url,
      sort_order: 0,
    });

    if (imageError) {
      console.error('Listing image insert error:', imageError);
      showNotification('Failed to add image to listing gallery');
      return;
    }

    showNotification('Image attached to listing successfully');
    setAttachModal(null);
    setAttachSearch('');
    fetchMedia();
    fetchLinkedUsage();
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showNotification('URL copied to clipboard');
  };

  const handleReplaceGlobal = async (item: MediaItem) => {
    const newUrl = prompt('Enter new image URL to replace globally:', item.file_url);
    if (!newUrl || newUrl === item.file_url) return;

    // Update all listing_images that reference this URL
    const { error: liError } = await supabase
      .from('listing_images')
      .update({ url: newUrl })
      .eq('url', item.file_url);

    if (liError) {
      console.error('Replace error:', liError);
      showNotification('Failed to replace globally');
      return;
    }

    // Update media_library
    const { error: mlError } = await supabase
      .from('media_library')
      .update({ file_url: newUrl })
      .eq('id', item.id);

    if (mlError) {
      showNotification('Failed to update media record');
    } else {
      showNotification('Image replaced globally');
      fetchMedia();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map((m) => m.id)));
    }
  };

  const filteredMedia = media.filter((m) => {
    const matchesSearch =
      m.file_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.alt_text || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.caption || '').toLowerCase().includes(search.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || (m.folder || 'Uncategorized') === selectedFolder;
    const matchesType = fileTypeFilter === 'all' || m.file_type === fileTypeFilter;
    return matchesSearch && matchesFolder && matchesType;
  });

  const filteredListings = listings.filter((l) =>
    l.title.toLowerCase().includes(attachSearch.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText size={16} className="text-red-500" />;
      case 'video': return <Video size={16} className="text-purple-500" />;
      case 'document': return <FileText size={16} className="text-blue-500" />;
      case 'floorplan': return <Layout size={16} className="text-green-500" />;
      case 'brochure': return <FileText size={16} className="text-orange-500" />;
      default: return <Image size={16} className="text-[#9ca3af]" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-lg shadow-lg text-sm font-roboto">
          <Check size={16} />
          {notification}
        </div>
      )}

      {/* Storage warning */}
      {storageReady === false && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-sm text-amber-800 font-roboto">
          <AlertCircle size={16} />
          Storage bucket not ready. Uploads may fail. Please refresh.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex items-center gap-3 flex-1 w-full lg:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search by name, alt text, caption..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-[#e5e7eb] rounded-md text-sm font-roboto focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="relative">
            <Folder size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-[#e5e7eb] rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white appearance-none cursor-pointer"
            >
              <option value="all">All Folders</option>
              {folders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="px-3 py-2.5 border border-[#e5e7eb] rounded-md text-sm font-roboto focus:outline-none focus:border-primary bg-white cursor-pointer"
            >
              {FILE_TYPE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#e5e7eb] rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 cursor-pointer ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-[#9ca3af] hover:bg-[#f7f8fa]'}`}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 cursor-pointer ${viewMode === 'list' ? 'bg-primary text-white' : 'text-[#9ca3af] hover:bg-[#f7f8fa]'}`}
            >
              <List size={16} />
            </button>
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-[#dc2626] rounded-md text-sm font-roboto hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
              Delete ({selectedIds.size})
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="relative">
            <input
              type="text"
              placeholder="Upload folder"
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              className="w-32 px-3 py-2.5 border border-[#e5e7eb] rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || storageReady === false}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-md text-sm font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-[#9ca3af] font-roboto">
        <span>{media.length} total items</span>
        <span>&middot;</span>
        <span>{filteredMedia.length} filtered</span>
        <span>&middot;</span>
        <span>{selectedIds.size} selected</span>
        {Object.entries(linkedUsage).length > 0 && (
          <>
            <span>&middot;</span>
            <span>{Object.entries(linkedUsage).map(([k, v]) => `${k}: ${v}`).join(', ')} linked</span>
          </>
        )}
        {filteredMedia.length > 0 && (
          <button
            onClick={selectAll}
            className="text-primary hover:underline cursor-pointer"
          >
            {selectedIds.size === filteredMedia.length ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 size={32} className="mx-auto text-gray-300 animate-spin mb-3" />
          <p className="text-sm text-[#9ca3af] font-roboto">Loading media library...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="bg-[#012144] lg:bg-white rounded-lg py-16 text-center">
          <Image size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-[#9ca3af] font-roboto mb-1">
            {media.length === 0 ? 'No media yet. Upload your first file.' : 'No media matches your search.'}
          </p>
          {media.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-primary text-sm font-roboto hover:underline cursor-pointer mt-2"
            >
              Click to upload
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMedia.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`group bg-[#012144] lg:bg-white rounded-lg border overflow-hidden transition-all hover:shadow-md ${
                  isSelected ? 'border-[#5eead4] ring-1 ring-[#5eead4] lg:border-primary lg:ring-primary' : 'border-[#1c3a5e] lg:border-[#f0f0f0]'
                }`}
              >
                <div className="relative aspect-square bg-[#f7f8fa]">
                  {item.file_type === 'image' ? (
                    <img
                      src={item.file_url}
                      alt={item.alt_text || item.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      {getFileIcon(item.file_type)}
                      <span className="text-xs text-[#9ca3af] font-roboto uppercase">{item.file_type}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />

                  {/* Selection checkbox */}
                  <div className="absolute top-2 left-2">
                    <button
                      onClick={() => toggleSelect(item.id)}
                      className={`w-6 h-6 rounded border flex items-center justify-center cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary border-primary text-white'
                          : 'bg-white/80 border-gray-300 text-transparent hover:text-[#9ca3af]'
                      }`}
                    >
                      <Check size={14} />
                    </button>
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="w-8 h-8 flex items-center justify-center bg-white/90 rounded-md hover:bg-white cursor-pointer text-[#636363] transition-colors"
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => setEditItem(item)}
                      className="w-8 h-8 flex items-center justify-center bg-white/90 rounded-md hover:bg-white cursor-pointer text-[#636363] transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleCopyUrl(item.file_url)}
                      className="w-8 h-8 flex items-center justify-center bg-white/90 rounded-md hover:bg-white cursor-pointer text-[#636363] transition-colors"
                      title="Copy URL"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleReplaceGlobal(item)}
                      className="w-8 h-8 flex items-center justify-center bg-white/90 rounded-md hover:bg-white cursor-pointer text-[#636363] transition-colors"
                      title="Replace Globally"
                    >
                      <Replace size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="w-8 h-8 flex items-center justify-center bg-white/90 rounded-md hover:bg-red-50 cursor-pointer text-[#636363] hover:text-[#dc2626] transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* File type badge */}
                  <div className="absolute bottom-2 left-2">
                    <span className="text-[10px] font-roboto font-medium text-white bg-black/50 px-2 py-0.5 rounded uppercase">
                      {item.file_type}
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-xs font-roboto text-[#9ca3af] lg:text-[#636363] truncate" title={item.file_name}>
                    {item.file_name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-[#6b7280] lg:text-[#9ca3af] font-roboto">
                      {formatFileSize(item.file_size)}
                    </span>
                    <span className="text-[10px] text-[#6b7280] lg:text-[#9ca3af] font-roboto">
                      {item.folder || 'General'}
                    </span>
                  </div>
                  {item.linked_module && (
                    <span className="inline-block mt-1 text-[10px] text-primary font-roboto bg-primary/5 px-1.5 py-0.5 rounded">
                      Linked to {item.linked_module}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#012144] lg:bg-white rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f7f8fa]">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button
                      onClick={selectAll}
                      className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${
                        selectedIds.size === filteredMedia.length && filteredMedia.length > 0
                          ? 'bg-primary border-primary text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedIds.size === filteredMedia.length && filteredMedia.length > 0 && (
                        <Check size={12} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider">Preview</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider hidden sm:table-cell">Alt / Caption</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider hidden md:table-cell">Folder</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider hidden sm:table-cell">Linked</th>
                  <th className="px-4 py-3 text-left text-xs font-roboto text-[#9ca3af] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMedia.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#f7f8fa]/50 transition-colors ${
                      selectedIds.has(item.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${
                          selectedIds.has(item.id)
                            ? 'bg-primary border-primary text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedIds.has(item.id) && <Check size={12} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {item.file_type === 'image' ? (
                        <img
                          src={item.file_url}
                          alt={item.alt_text || ''}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-[#f7f8fa] flex items-center justify-center">
                          {getFileIcon(item.file_type)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-roboto text-[#1a1a1a] truncate max-w-[200px]">
                        {item.file_name}
                      </p>
                      <p className="text-[10px] text-[#9ca3af] font-roboto">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-xs text-[#9ca3af] font-roboto truncate max-w-[200px]">{item.alt_text || '—'}</p>
                      <p className="text-[10px] text-[#9ca3af] font-roboto truncate max-w-[200px]">{item.caption || '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-[#9ca3af] font-roboto">{item.folder || 'General'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#9ca3af] font-roboto">{formatFileSize(item.file_size)}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {item.linked_module ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-roboto bg-primary/10 text-primary">
                          {item.linked_module}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9ca3af] font-roboto">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyUrl(item.file_url)}
                          className="p-1.5 hover:bg-[#f7f8fa] rounded-md cursor-pointer text-[#9ca3af] hover:text-primary transition-colors"
                          title="Copy URL"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => setEditItem(item)}
                          className="p-1.5 hover:bg-[#f7f8fa] rounded-md cursor-pointer text-[#9ca3af] hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setAttachModal(item)}
                          className="p-1.5 hover:bg-[#f7f8fa] rounded-md cursor-pointer text-[#9ca3af] hover:text-primary transition-colors"
                          title="Attach to listing"
                        >
                          <Link size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded-md cursor-pointer text-[#9ca3af] hover:text-[#dc2626] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreviewItem(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-jost text-lg text-[#1a1a1a] truncate">{previewItem.file_name}</h2>
              <button onClick={() => setPreviewItem(null)} className="p-1 hover:bg-[#f7f8fa] rounded-md cursor-pointer">
                <X size={18} className="text-[#9ca3af]" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-[#f7f8fa]">
              {previewItem.file_type === 'image' ? (
                <img src={previewItem.file_url} alt={previewItem.alt_text || ''} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
              ) : previewItem.file_type === 'video' ? (
                <video src={previewItem.file_url} controls className="max-w-full max-h-[60vh] rounded-lg" />
              ) : (
                <div className="flex flex-col items-center gap-3 py-12">
                  {getFileIcon(previewItem.file_type)}
                  <p className="text-sm text-[#9ca3af] font-roboto">Preview not available for this file type</p>
                  <a href={previewItem.file_url} target="_blank" rel="noreferrer" className="text-primary text-sm font-roboto hover:underline">
                    Download file
                  </a>
                </div>
              )}
            </div>
            <div className="p-6 space-y-2">
              <p className="text-xs text-[#9ca3af] font-roboto"><span className="font-semibold">Type:</span> {previewItem.file_type}</p>
              <p className="text-xs text-[#9ca3af] font-roboto"><span className="font-semibold">Size:</span> {formatFileSize(previewItem.file_size)}</p>
              <p className="text-xs text-[#9ca3af] font-roboto"><span className="font-semibold">Alt:</span> {previewItem.alt_text || '—'}</p>
              <p className="text-xs text-[#9ca3af] font-roboto"><span className="font-semibold">Caption:</span> {previewItem.caption || '—'}</p>
              <p className="text-xs text-[#9ca3af] font-roboto"><span className="font-semibold">Folder:</span> {previewItem.folder || 'General'}</p>
              <p className="text-xs text-[#9ca3af] font-roboto"><span className="font-semibold">Linked:</span> {previewItem.linked_module || 'None'}</p>
              <div className="pt-2">
                <button
                  onClick={() => handleCopyUrl(previewItem.file_url)}
                  className="flex items-center gap-2 text-primary text-sm font-roboto hover:underline cursor-pointer"
                >
                  <Copy size={14} />
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditItem(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-jost text-lg text-[#1a1a1a]">Edit Media</h2>
              <button onClick={() => setEditItem(null)} className="p-1 hover:bg-[#f7f8fa] rounded-md cursor-pointer">
                <X size={18} className="text-[#9ca3af]" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-lg bg-[#f7f8fa] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {editItem.file_type === 'image' ? (
                    <img src={editItem.file_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getFileIcon(editItem.file_type)
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">File Name</label>
                    <input
                      type="text"
                      value={editItem.file_name}
                      onChange={(e) => setEditItem({ ...editItem, file_name: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">Folder</label>
                    <input
                      type="text"
                      value={editItem.folder || ''}
                      onChange={(e) => setEditItem({ ...editItem, folder: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">Alt Text</label>
                <input
                  type="text"
                  value={editItem.alt_text || ''}
                  onChange={(e) => setEditItem({ ...editItem, alt_text: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                  placeholder="Describe the image for accessibility"
                />
              </div>
              <div>
                <label className="block text-xs font-roboto text-[#9ca3af] uppercase tracking-wider mb-1.5">Caption</label>
                <textarea
                  value={editItem.caption || ''}
                  onChange={(e) => setEditItem({ ...editItem, caption: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-md text-sm font-roboto focus:outline-none focus:border-primary min-h-[60px] resize-none"
                  placeholder="Optional caption"
                  maxLength={500}
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="flex-1 px-4 py-2.5 border border-[#e5e7eb] rounded-md text-sm font-roboto text-[#636363] hover:bg-[#f7f8fa] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-roboto cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Modal */}
      {attachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAttachModal(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-jost text-lg text-[#1a1a1a]">Attach to Listing</h2>
              <button onClick={() => setAttachModal(null)} className="p-1 hover:bg-[#f7f8fa] rounded-md cursor-pointer">
                <X size={18} className="text-[#9ca3af]" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-16 h-16 rounded-lg bg-[#f7f8fa] flex items-center justify-center overflow-hidden">
                  {attachModal.file_type === 'image' ? (
                    <img src={attachModal.file_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getFileIcon(attachModal.file_type)
                  )}
                </div>
                <div>
                  <p className="text-sm font-roboto text-[#1a1a1a]">{attachModal.file_name}</p>
                  <p className="text-xs text-[#9ca3af] font-roboto">{formatFileSize(attachModal.file_size)}</p>
                </div>
              </div>

              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={attachSearch}
                  onChange={(e) => setAttachSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-[#e5e7eb] rounded-md text-sm font-roboto focus:outline-none focus:border-primary"
                />
              </div>

              <div className="max-h-60 overflow-y-auto border border-[#f0f0f0] rounded-md">
                {filteredListings.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#9ca3af] font-roboto">No listings found</div>
                ) : (
                  filteredListings.map((listing) => (
                    <button
                      key={listing.id}
                      onClick={() => handleAttachToListing(listing.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f7f8fa] transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-roboto text-[#1a1a1a]">{listing.title}</p>
                        <p className="text-xs text-[#9ca3af] font-roboto">/{listing.slug}</p>
                      </div>
                      <Link size={14} className="text-[#9ca3af]" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-lg w-full max-w-sm shadow-xl p-6 text-center">
            <AlertCircle size={28} className="mx-auto text-red-500 mb-3" />
            <h3 className="font-jost text-lg text-[#1a1a1a] mb-1">Delete this item?</h3>
            <p className="text-sm text-[#9ca3af] font-roboto mb-6">
              This will remove the file from the library and storage. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-[#e5e7eb] rounded-md text-sm font-roboto text-[#636363] hover:bg-[#f7f8fa] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-[#dc2626] hover:bg-red-700 text-white rounded-md text-sm font-roboto cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBulkDeleteConfirm(false)} />
          <div className="relative bg-white rounded-lg w-full max-w-sm shadow-xl p-6 text-center">
            <AlertCircle size={28} className="mx-auto text-red-500 mb-3" />
            <h3 className="font-jost text-lg text-[#1a1a1a] mb-1">Delete {selectedIds.size} items?</h3>
            <p className="text-sm text-[#9ca3af] font-roboto mb-6">
              This will remove all selected files from the library. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-[#e5e7eb] rounded-md text-sm font-roboto text-[#636363] hover:bg-[#f7f8fa] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 px-4 py-2.5 bg-[#dc2626] hover:bg-red-700 text-white rounded-md text-sm font-roboto cursor-pointer"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}