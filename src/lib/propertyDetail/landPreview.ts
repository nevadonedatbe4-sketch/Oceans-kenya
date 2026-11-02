// Staff preview of an unpublished LAND listing.
//
// Published land reaches the property page through the `all_listings` view,
// which maps `land_listings` columns onto the shared listing shape. Drafts are
// not in that view, so this mirrors the same mapping for a raw `land_listings`
// row (read through RLS, which only returns unpublished rows to signed-in
// staff) so the page can render the preview with its normal mapper.

type Row = Record<string, unknown>;

export function landRowToListingRow(land: Row): Row {
  const plotUnit = land.plot_size_unit ?? land.land_size_unit ?? null;
  return {
    id: land.id,
    slug: land.slug,
    title: land.title,
    description: land.description,
    currency: land.currency,
    images: land.images,
    main_image: land.main_image,
    agent_id: land.agent_id,
    agent_ids: land.agent_ids,
    country: land.country,
    created_at: land.created_at,
    documents: land.documents,
    custom_fields: land.custom_fields,
    is_featured: land.is_featured,
    is_published: land.is_published,
    latitude: land.latitude,
    longitude: land.longitude,
    address: land.address,
    neighbourhood: land.neighbourhood,
    location: land.location,
    // The view files the land record's city under state_region.
    city: '',
    state_region: land.city,
    status: land.status,
    sub_type: land.sub_type,
    property_id: land.property_id,
    land_type: land.land_type,
    land_size: land.land_size ?? land.plot_size ?? null,
    size: land.plot_size ?? land.land_size ?? null,
    land_unit: plotUnit,
    size_unit: plotUnit,
    price: land.asking_price,
    seo_title: land.seo_title,
    seo_description: land.seo_description,
    seo_image: land.seo_image,
    // Fixed for every land record, exactly as the public view sets them.
    property_type: 'land',
    property_category: 'land',
    purpose: 'sale',
  };
}
