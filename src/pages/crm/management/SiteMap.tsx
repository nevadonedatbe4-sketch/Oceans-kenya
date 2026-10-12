import { useCallback, useEffect, useState } from 'react';
import { Network, RefreshCw, ExternalLink, Loader2, ShieldCheck, Ban, Database, Link2 } from 'lucide-react';
import ManagementLayout from '../ManagementLayout';
import { supabase } from '@/lib/supabase';
import {
  getStaticSitemapGroups,
  EXCLUDED_FROM_SITEMAP,
  DYNAMIC_SITEMAP_SOURCES,
} from '@/lib/sitemapRoutes';

const SUPABASE_URL = (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined) ?? '';
const ENDPOINT = `${SUPABASE_URL}/functions/v1/sitemap`;

/**
 * SiteMap (admin) - PRIVATE management surface for the site map.
 *
 * Renders the live XML produced by the `sitemap` Edge Function, plus the route
 * registry and inclusion/exclusion rules. It is reachable ONLY inside the admin
 * portal (/admin/management/sitemap) and is never linked from any public page.
 *
 * The machine-readable sitemap is served at the standard `/sitemap.xml` endpoint
 * (see vercel.json) and by the Edge Function URL below.
 */
export default function SiteMap() {
  const [xml, setXml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [showXml, setShowXml] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('sitemap');
      if (fnError) throw new Error(fnError.message);
      const text = typeof data === 'string'
        ? data
        : data instanceof Blob
          ? await data.text()
          : String(data ?? '');
      setXml(text);
      setGeneratedAt(new Date().toLocaleString());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate the sitemap');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const locCount = (xml.match(/<loc>/g) || []).length;
  const groups = getStaticSitemapGroups();
  const staticCount = groups.reduce((n, g) => n + g.paths.length, 0);

  return (
    <ManagementLayout
      title="Site Map"
      description="The private site map console. Review, regenerate and understand exactly which URLs search engines are offered — never shown in public navigation."
      icon={<Network size={20} className="text-[#0d5959]" />}
    >
      <div className="space-y-5">
        {/* Endpoint + regenerate */}
        <div className="bg-white rounded-xl border border-stone-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Link2 size={15} className="text-[#0d5959]" />
                <h3 className="font-jost text-[13px] font-semibold text-stone-800 uppercase tracking-[0.12em]">
                  Public XML endpoint
                </h3>
              </div>
              <a
                href={ENDPOINT}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-roboto text-[#0d5959] hover:underline break-all cursor-pointer"
              >
                {ENDPOINT}
                <ExternalLink size={13} className="shrink-0" />
              </a>
              <p className="text-xs text-stone-400 font-roboto mt-1.5">
                Also exposed at the standard <span className="font-semibold">/sitemap.xml</span> endpoint and referenced from robots.txt.
                {generatedAt && <> &middot; Generated {generatedAt}</>}
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#15382A] text-white px-4 py-2.5 rounded-lg text-[13px] font-roboto transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 shrink-0"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><RefreshCw size={15} /> Regenerate</>}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-stone-100 p-5">
            <p className="text-xs font-roboto text-stone-400 uppercase tracking-wider mb-1">URLs in sitemap</p>
            <p className="text-2xl font-prata text-stone-800">{loading ? '—' : locCount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-100 p-5">
            <p className="text-xs font-roboto text-stone-400 uppercase tracking-wider mb-1">Static routes</p>
            <p className="text-2xl font-prata text-stone-800">{staticCount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-100 p-5">
            <p className="text-xs font-roboto text-stone-400 uppercase tracking-wider mb-1">Dynamic sources</p>
            <p className="text-2xl font-prata text-stone-800">{DYNAMIC_SITEMAP_SOURCES.length}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <Ban size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-roboto font-semibold text-red-700">Couldn&apos;t load the sitemap</p>
              <p className="text-xs font-roboto text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Dynamic (DB) sources */}
          <div className="bg-white rounded-xl border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Database size={15} className="text-[#0d5959]" />
              <h3 className="font-jost text-[13px] font-semibold text-stone-800 uppercase tracking-[0.12em]">
                Regenerated live from the database
              </h3>
            </div>
            <p className="text-xs text-stone-400 font-roboto mb-3">
              These update automatically as content is published, edited or removed — nothing is hardcoded.
            </p>
            <div className="space-y-2">
              {DYNAMIC_SITEMAP_SOURCES.map((s) => (
                <div key={s.label} className="flex items-start justify-between gap-3 py-2 border-b border-stone-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-roboto font-medium text-stone-800">{s.label}</p>
                    <p className="text-xs font-mono text-stone-400 truncate">{s.route}</p>
                  </div>
                  <span className="text-[11px] font-roboto text-stone-500 bg-stone-50 rounded-md px-2 py-1 whitespace-nowrap shrink-0">
                    {s.rule}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Exclusion rules */}
          <div className="bg-white rounded-xl border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={15} className="text-[#0d5959]" />
              <h3 className="font-jost text-[13px] font-semibold text-stone-800 uppercase tracking-[0.12em]">
                Never included
              </h3>
            </div>
            <ul className="space-y-2">
              {EXCLUDED_FROM_SITEMAP.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm font-roboto text-stone-600">
                  <Ban size={13} className="text-red-400 mt-1 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Static route registry */}
        <div className="bg-white rounded-xl border border-stone-100 p-5">
          <h3 className="font-jost text-[13px] font-semibold text-stone-800 uppercase tracking-[0.12em] mb-3">
            Static route registry
          </h3>
          <p className="text-xs text-stone-400 font-roboto mb-4">
            Derived from the real page registries (seoPages / seoClusters / areaGuides), so it never goes stale.
          </p>
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-roboto font-semibold text-stone-700">{g.label}</span>
                  <span className="text-[11px] font-roboto text-stone-400">{g.paths.length} routes</span>
                </div>
                <p className="text-xs text-stone-400 font-roboto mb-2">{g.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.paths.slice(0, 24).map((p) => (
                    <span key={p} className="text-[11px] font-mono text-stone-600 bg-stone-50 rounded px-2 py-1">{p}</span>
                  ))}
                  {g.paths.length > 24 && (
                    <span className="text-[11px] font-roboto text-stone-400 px-2 py-1">+{g.paths.length - 24} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* XML preview */}
        <div className="bg-white rounded-xl border border-stone-100 p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-jost text-[13px] font-semibold text-stone-800 uppercase tracking-[0.12em]">
              Live sitemap XML
            </h3>
            <button
              onClick={() => setShowXml((v) => !v)}
              className="text-[13px] font-roboto text-[#0d5959] hover:underline cursor-pointer whitespace-nowrap"
            >
              {showXml ? 'Hide' : 'Preview'}
            </button>
          </div>
          {commercialPlaceholder(loading, error)}
          {showXml && !loading && !error && (
            <pre className="text-[11px] font-mono text-stone-600 whitespace-pre-wrap bg-stone-50 p-4 rounded-lg overflow-auto max-h-[60vh]">
              {xml}
            </pre>
          )}
        </div>
      </div>
    </ManagementLayout>
  );
}

function commercialPlaceholder(loading: boolean, error: string | null) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm font-roboto text-stone-400">
        <Loader2 size={14} className="animate-spin" /> Generating the sitemap…
      </div>
    );
  }
  if (error) {
    return <p className="text-sm font-roboto text-stone-400">Preview unavailable until the endpoint responds.</p>;
  }
  return null;
}