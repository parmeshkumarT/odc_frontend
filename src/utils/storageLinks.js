import { supabase } from "../lib/supabase";

const DEFAULT_BUCKET = "certificates";

export function extractStorageKey(bucket = DEFAULT_BUCKET, value) {
    if (!value || typeof value !== "string") return null;
    const v = value.trim();
    if (!v || v.startsWith("failed:") || v.startsWith("local:")) return null;

    // Already a key (e.g. odcId/typeId/123.pdf)
    if (!v.startsWith("http")) return v;

    // Try to extract from Supabase Storage URL
    // Formats we commonly see:
    // - .../storage/v1/object/public/<bucket>/<key>
    // - .../storage/v1/object/sign/<bucket>/<key>?token=...
    const publicMarker = `/storage/v1/object/public/${bucket}/`;
    const signMarker = `/storage/v1/object/sign/${bucket}/`;

    const idxPublic = v.indexOf(publicMarker);
    if (idxPublic !== -1) {
        const rest = v.slice(idxPublic + publicMarker.length);
        return rest.split("?")[0] || null;
    }

    const idxSign = v.indexOf(signMarker);
    if (idxSign !== -1) {
        const rest = v.slice(idxSign + signMarker.length);
        return rest.split("?")[0] || null;
    }

    // Fallback: if URL contains `/<bucket>/` somewhere
    const loose = `/${bucket}/`;
    const idxLoose = v.indexOf(loose);
    if (idxLoose !== -1) {
        const rest = v.slice(idxLoose + loose.length);
        return rest.split("?")[0] || null;
    }

    return null;
}

export async function getDownloadUrl({ bucket = DEFAULT_BUCKET, fileUrlOrKey, expiresIn = 60 * 10 }) {
    // If already a normal URL that isn't a supabase storage object, just use it
    if (typeof fileUrlOrKey === "string" && fileUrlOrKey.trim().startsWith("http")) {
        // We still prefer a signed URL if we can extract a key (private bucket case)
        const key = extractStorageKey(bucket, fileUrlOrKey);
        if (!key) return fileUrlOrKey;
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, expiresIn);
        if (!error && data?.signedUrl) return data.signedUrl;
        return fileUrlOrKey;
    }

    const key = extractStorageKey(bucket, fileUrlOrKey);
    if (!key) return null;

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, expiresIn);
    if (error) throw error;
    return data?.signedUrl || null;
}

