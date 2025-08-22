export type Enriched = {
  ip?: string | null;
  device?: string | null;
  geoCountry?: string | null;
  geoCity?: string | null;
  mcc?: string | null;
  channel?: string | null;
};

export async function enrich(record: any): Promise<Enriched> {
  // Hook up MaxMind, UA parsing, MCC lookup, FX normalization here.
  // Return minimal structure for now.
  return {
    ip: record.ip || null,
    device: record.device || null,
    geoCountry: record.geoCountry || null,
    geoCity: record.geoCity || null,
    mcc: record.mcc || null,
    channel: record.channel || null,
  };
}
