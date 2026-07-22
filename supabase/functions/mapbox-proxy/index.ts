import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN') ?? Deno.env.get('VITE_MAPBOX_ACCESS_TOKEN');
const TURKEY_BBOX = '25.66,35.81,44.82,42.27';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!MAPBOX_TOKEN) {
    return new Response(JSON.stringify({ error: 'MAPBOX_ACCESS_TOKEN not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'geocode') {
      const { query, proximity, limit = 5 } = body;
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
      );
      url.searchParams.set('access_token', MAPBOX_TOKEN);
      url.searchParams.set('country', 'tr');
      url.searchParams.set('bbox', TURKEY_BBOX);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('language', 'tr');
      url.searchParams.set('types', 'poi,address,place,locality,neighborhood');
      if (proximity) {
        url.searchParams.set('proximity', `${proximity.longitude},${proximity.latitude}`);
      }
      const res = await fetch(url);
      const data = await res.json();
      return jsonResponse(data, res.status);
    }

    if (action === 'reverse') {
      const { longitude, latitude } = body;
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`
      );
      url.searchParams.set('access_token', MAPBOX_TOKEN);
      url.searchParams.set('language', 'tr');
      url.searchParams.set('limit', '1');
      const res = await fetch(url);
      const data = await res.json();
      return jsonResponse(data, res.status);
    }

    if (action === 'directions') {
      const { coordinates } = body;
      const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`);
      url.searchParams.set('access_token', MAPBOX_TOKEN);
      url.searchParams.set('geometries', 'geojson');
      url.searchParams.set('overview', 'full');
      url.searchParams.set('steps', 'false');
      url.searchParams.set('language', 'tr');
      const res = await fetch(url);
      const data = await res.json();
      return jsonResponse(data, res.status);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonResponse({ error: String(error) }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
