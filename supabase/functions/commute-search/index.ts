import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ListingInput {
  id: string;
  lat: number;
  lng: number;
}

interface CommuteResult {
  id: string;
  distance_km: number;
  commute_time_min: number | null;
  commute_time_text: string | null;
  commute_available: boolean;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function modeToGoogle(mode: string): string {
  switch (mode.toLowerCase()) {
    case "walking": return "walking";
    case "public transit": return "transit";
    case "cycling": return "bicycling";
    default: return "driving";
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { destinationLat, destinationLng, transportMode, listings } = body as {
      destinationLat: number;
      destinationLng: number;
      transportMode: string;
      listings: ListingInput[];
    };

    if (
      typeof destinationLat !== "number" ||
      typeof destinationLng !== "number" ||
      !Array.isArray(listings)
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: destinationLat, destinationLng, listings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Always calculate straight-line distances first
    const results: CommuteResult[] = listings.map((listing) => ({
      id: listing.id,
      distance_km: haversineKm(listing.lat, listing.lng, destinationLat, destinationLng),
      commute_time_min: null,
      commute_time_text: null,
      commute_available: false,
    }));

    // Try Google Maps Distance Matrix if API key is configured
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (apiKey && listings.length > 0) {
      const validListings = listings.filter(
        (l) => typeof l.lat === "number" && typeof l.lng === "number"
      );

      if (validListings.length > 0) {
        const origins = validListings.map((l) => `${l.lat},${l.lng}`).join("|");
        const dest = `${destinationLat},${destinationLng}`;
        const gmMode = modeToGoogle(transportMode || "driving");

        const gmUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(dest)}&mode=${gmMode}&key=${apiKey}`;

        try {
          const gmRes = await fetch(gmUrl);
          const gmData = await gmRes.json();

          if (gmData.status === "OK" && gmData.rows) {
            gmData.rows.forEach((row: { elements: Array<{ status: string; duration: { value: number; text: string }; distance: { value: number; text: string } }> }, i: number) => {
              const element = row.elements?.[0];
              if (element?.status === "OK") {
                results[i].commute_time_min = Math.round(element.duration.value / 60);
                results[i].commute_time_text = element.duration.text;
                results[i].distance_km = Math.round((element.distance.value / 1000) * 10) / 10;
                results[i].commute_available = true;
              }
            });
          }
        } catch (_err) {
          // Google API call failed — fall back to straight-line distances
          console.error("Google Distance Matrix API error:", _err);
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});