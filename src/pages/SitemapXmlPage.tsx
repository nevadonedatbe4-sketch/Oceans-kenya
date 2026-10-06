import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * SitemapXmlPage - exposes `/sitemap.xml` as a reachable surface that renders
 * the live XML sitemap produced by the deployed `sitemap` Edge Function.
 *
 * The site is a static SPA (no Node server), so this page fetches the
 * engine-generated sitemap and displays it in full so the URL is verifiable in
 * the browser. The canonical machine-readable sitemap is served by the Edge
 * Function and referenced from /robots.txt.
 */
export default function SitemapXmlPage() {
  const [xml, setXml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // functions.invoke returns { data, error }, not a fetch Response.
        // The sitemap function returns XML; data arrives as a string or Blob.
        const { data, error: fnError } = await supabase.functions.invoke('sitemap');
        if (!mounted) return;
        if (fnError) {
          setError(`Sitemap request failed: ${fnError.message}`);
        } else {
          const text = typeof data === 'string'
            ? data
            : data instanceof Blob
              ? await data.text()
              : String(data ?? '');
          setXml(text);
        }
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load sitemap');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="font-roboto font-bold text-2xl text-primary mb-6">Sitemap</h1>
        {error ? (
          <p className="font-roboto text-stone-500">{error}</p>
        ) : xml ? (
          <pre className="text-xs text-stone-600 whitespace-pre-wrap bg-[#F7F9F9] p-6 rounded-lg overflow-auto max-h-[80vh]">
            {xml}
          </pre>
        ) : (
          <p className="font-roboto text-stone-500">Loading sitemap…</p>
        )}
      </div>
    </div>
  );
}