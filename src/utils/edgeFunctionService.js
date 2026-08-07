import { supabase } from "../lib/supabase";

/**
 * Trigger the Edge Function for OCR and validation processing
 * @param {string} uploadId - The upload record ID
 * @param {string} bucket - Storage bucket name (default: "certificates")
 * @param {string} key - File path/key in storage
 * @returns {Promise<Object>} Edge Function response
 */
/**
 * Trigger the Edge Function for OCR and validation processing
 * @param {string} uploadId - The upload record ID
 * @param {string} bucket - Storage bucket name (default: "certificates")
 * @param {string} key - File path/key in storage
 * @returns {Promise<Object>} Edge Function response
 */
export const triggerOCRAndValidation = async (uploadId, bucket = "certificates", key) => {
    try {
        if (!uploadId || !key) {
            throw new Error("uploadId and key are required");
        }

        console.log(`🚀 Triggering Edge Function: process_uploads`);
        console.log(`   - upload_id: ${uploadId}`);
        console.log(`   - bucket: ${bucket}`);
        console.log(`   - key: ${key}`);

        const { data, error } = await supabase.functions.invoke("process_uploads", {
            body: {
                bucket,
                key,
                upload_id: uploadId
            }
        });

        if (error) {
            console.error("❌ Edge Function error:", error);
            throw error;
        }

        console.log("✅ Edge Function response:", data);
        return data;
    } catch (err) {
        console.error("❌ Failed to trigger Edge Function:", err);
        // Don't throw - let the upload succeed even if Edge Function fails
        // The Edge Function can be retried later
        return null;
    }
};
