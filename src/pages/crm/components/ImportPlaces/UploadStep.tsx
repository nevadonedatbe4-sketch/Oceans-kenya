import { useRef, useState } from 'react';
import { downloadPublicFile } from '@/lib/importPlaces';

interface UploadStepProps {
  onFile: (file: File) => void;
  busy: boolean;
  error: string | null;
}

const ACCEPT = '.csv,.txt,.xlsx,.xls';

/** Ready-made starter files shipped with the app, offered as one-click downloads. */
const STARTER_FILES = [
  {
    file: 'nairobi-schools.csv',
    title: 'Nairobi Schools',
    desc: '97 real schools across all 20 zones, ready to import.',
  },
  {
    file: 'nairobi-nightlife-places.csv',
    title: 'Nairobi Nightlife & Places',
    desc: '40 real venues — clubs, bars, lounges, casinos and late-night spots across 12 zones, with verified website links for the real photo fetch.',
  },
];

export default function UploadStep({ onFile, busy, error }: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (file: string) => {
    setDownloading(file);
    setDownloadError(null);
    try {
      await downloadPublicFile(file);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed. Please try again.');
    }
    setDownloading(null);
  };

  const handleFiles = (files: FileList | null) => {
    const file = files && files[0];
    if (file) onFile(file);
  };

  return (
    <div className="p-6 md:p-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-6 py-14 flex flex-col items-center justify-center text-center transition-colors ${
          dragging ? 'border-[#0d5959] bg-[#eef7f5]' : 'border-[#d7e0e6] bg-[#fafcfd]'
        }`}
      >
        <div className="w-16 h-16 rounded-xl bg-[#0d5959]/10 flex items-center justify-center mb-4">
          <i className={`${busy ? 'ri-loader-4-line animate-spin' : 'ri-upload-cloud-2-line'} text-[#0d5959] text-3xl`} />
        </div>
        <h3 className="font-jost text-lg font-semibold text-[#001731] mb-1">Upload a spreadsheet</h3>
        <p className="text-base text-[#7a8a99] max-w-md mb-6">
          Choose a CSV or Excel file containing your places, or drag and drop it here.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-[#0d5959] hover:bg-[#0d5959]/90 text-white px-5 py-2.5 rounded-lg text-base font-roboto font-medium cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <i className={busy ? 'ri-loader-4-line animate-spin' : 'ri-file-upload-line'} />
          {busy ? 'Reading file…' : 'Choose file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="absolute w-px h-px opacity-0 overflow-hidden -z-10"
          tabIndex={-1}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <p className="mt-4 text-sm font-roboto text-[#7a8a99]">
          Supported formats: <span className="font-semibold text-[#33414f]">.csv</span>,{' '}
          <span className="font-semibold text-[#33414f]">.txt</span>,{' '}
          <span className="font-semibold text-[#33414f]">.xlsx</span>,{' '}
          <span className="font-semibold text-[#33414f]">.xls</span>
        </p>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <i className="ri-error-warning-line text-red-600 text-lg mt-0.5" />
          <p className="text-base font-roboto text-red-700">{error}</p>
        </div>
      )}

      {downloadError && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <i className="ri-error-warning-line text-red-600 text-lg mt-0.5" />
          <p className="text-base font-roboto text-red-700">{downloadError}</p>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <i className="ri-download-2-line text-[#0d5959] text-lg" />
          <h4 className="font-jost text-base font-semibold text-[#001731]">
            Don&rsquo;t have a file yet? Grab a ready-made one
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STARTER_FILES.map((item) => (
            <div
              key={item.file}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#e8edf2] bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-roboto font-semibold text-[#001731]">{item.title}</p>
                <p className="text-xs font-roboto text-[#7a8a99] mt-0.5">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(item.file)}
                disabled={downloading === item.file}
                className="shrink-0 inline-flex items-center gap-1.5 border border-[#0d5959] text-[#0d5959] hover:bg-[#0d5959]/5 px-3.5 py-2 rounded-md text-sm font-roboto font-medium cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <i className={downloading === item.file ? 'ri-loader-4-line animate-spin' : 'ri-download-line'} />
                {downloading === item.file ? 'Saving\u2026' : 'Download'}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs font-roboto text-[#7a8a99]">
          Save the file, then use <span className="font-semibold text-[#33414f]">Choose file</span> above to upload it.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-[#e8edf2] bg-[#f7f8fa] px-4 py-3">
        <p className="text-sm font-roboto text-[#7a8a99]">
          <span className="font-semibold text-[#33414f]">Tip:</span> the system detects columns automatically
          (Name, Category, Area, Phone, Website and more). Nothing is saved until you confirm the import.
        </p>
      </div>
    </div>
  );
}