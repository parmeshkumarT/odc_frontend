# Backend Implementation Guide for OCR and AI Validation

## Overview
This document outlines the backend implementation requirements for OCR extraction and AI validation of certificates.

## Database Schema

### Tables Used:
1. **uploads** - Stores file upload information
   - `id` (uuid)
   - `certificate_instance_id` (uuid)
   - `uploaded_by` (uuid)
   - `created_at` (timestamp)
   - `file_url` (text)
   - `file_type` (text)
   - `remarks` (text)

2. **ocr_data** - Stores OCR extraction results
   - `id` (uuid)
   - `upload_id` (uuid) - References uploads.id
   - `structured_data` (jsonb) - Extracted structured data
   - `created_at` (timestamp)
   - `extracted_text` (text) - Raw extracted text

3. **validation_results** - Stores AI validation results
   - `id` (uuid)
   - `upload_id` (uuid) - References uploads.id
   - `issues` (jsonb) - Array of issues found
   - `overall_score` (numeric) - Score 0-100
   - `created_at` (timestamp)
   - `validation_status` (text) - "passed", "failed", "pending"

## Implementation Options

### Option 1: Supabase Edge Functions (Recommended)

#### 1. OCR Extraction Function
Create a Supabase Edge Function: `extract-ocr`

```typescript
// supabase/functions/extract-ocr/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { uploadId, fileUrl } = await req.json()
  
  // Download file from storage
  // Use OCR library (Tesseract.js, Google Vision API, etc.)
  // Extract text and structured data
  // Update ocr_data table
  
  return new Response(JSON.stringify({ success: true }))
})
```

#### 2. AI Validation Function
Create a Supabase Edge Function: `validate-certificate`

```typescript
// supabase/functions/validate-certificate/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import OpenAI from "https://deno.land/x/openai@v4.0.0/mod.ts"

serve(async (req) => {
  const { uploadId, ocrDataId, certificateTypeId } = await req.json()
  
  // Get OCR data and certificate type requirements
  // Call OpenAI API for validation
  // Calculate score and identify issues
  // Update validation_results table
  
  return new Response(JSON.stringify({ success: true }))
})
```

#### 3. Database Triggers
Set up triggers to automatically call Edge Functions:

```sql
-- Trigger OCR extraction after upload
CREATE OR REPLACE FUNCTION trigger_ocr_extraction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/extract-ocr',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := json_build_object('uploadId', NEW.id, 'fileUrl', NEW.file_url)::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_upload_created
AFTER INSERT ON uploads
FOR EACH ROW
EXECUTE FUNCTION trigger_ocr_extraction();

-- Trigger AI validation after OCR completion
CREATE OR REPLACE FUNCTION trigger_ai_validation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/validate-certificate',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := json_build_object(
      'uploadId', (SELECT upload_id FROM ocr_data WHERE id = NEW.id),
      'ocrDataId', NEW.id,
      'certificateTypeId', (SELECT certificate_type_id FROM certificate_instances WHERE upload_id = (SELECT upload_id FROM ocr_data WHERE id = NEW.id))
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ocr_completed
AFTER INSERT ON ocr_data
FOR EACH ROW
EXECUTE FUNCTION trigger_ai_validation();
```

### Option 2: External Backend Service

Create a separate backend service (Node.js, Python, etc.) that:
1. Listens for new uploads via webhooks or polling
2. Processes OCR extraction
3. Performs AI validation
4. Updates database records

## OCR Implementation Details

### Recommended OCR Solutions:
1. **Tesseract.js** - Open source, works well for PDFs and images
2. **Google Cloud Vision API** - High accuracy, paid service
3. **AWS Textract** - Good for structured documents
4. **Azure Form Recognizer** - Good for forms and certificates

### Example with Tesseract.js:
```javascript
import Tesseract from 'tesseract.js';

async function extractText(fileBuffer) {
  const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng');
  return text;
}
```

## AI Validation Implementation

### OpenAI Integration:
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function validateCertificate(ocrText, requiredFields) {
  const prompt = `
    Analyze this certificate document and validate it:
    
    Required Fields: ${JSON.stringify(requiredFields)}
    Extracted Text: ${ocrText}
    
    Please:
    1. Verify all required fields are present
    2. Check data validity and format
    3. Calculate an overall score (0-100)
    4. List any issues found
    
    Return JSON with:
    {
      "score": number,
      "status": "passed" | "failed" | "pending",
      "issues": ["issue1", "issue2"]
    }
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}
```

## Environment Variables Needed

```env
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing

1. Upload a certificate via the frontend
2. Verify upload record is created
3. Check OCR extraction runs automatically
4. Verify OCR data is stored
5. Check AI validation runs automatically
6. Verify validation results are stored
7. Check notifications appear in admin dashboard

## Notes

- The frontend code is already set up to trigger these processes
- You need to implement the actual OCR and AI validation logic server-side
- Consider rate limiting for API calls
- Add error handling and retry logic
- Store API costs and usage metrics

