# ODC Compliance System - Complete Flow Explanation

## What is ODC?

**ODC** stands for **Offshore Development Center**. In this context, it refers to a physical location or facility where a vendor operates their development/operations center. Each ODC is a separate location that needs to maintain various compliance certificates (like ISO certifications, security clearances, environmental permits, etc.).

## Why Do We Have an ODC Dashboard?

The ODC Dashboard exists because **ODC users** (staff working at a specific ODC location) need a dedicated interface to:

1. **Upload certificates** for their specific ODC location
2. **View certificate status** for their ODC
3. **Track validation progress** (pending, passed, failed)
4. **Monitor expiring certificates** (certificates expiring within 30 days)
5. **Manage compliance** at the operational level

This separation allows:
- **Vendors** to manage multiple ODCs from a central dashboard
- **ODC users** to focus only on their specific location's compliance
- **Clear accountability** - each ODC location has its own compliance status
- **Scalability** - vendors can have many ODCs, each with its own users

---

## System Architecture & User Roles

The system has **4 main user roles** with different responsibilities:

### 1. **Super Admin** (`super_admin`)
- **Purpose**: System-wide oversight and management
- **Responsibilities**:
  - Manage vendors (approve/reject vendor registrations)
  - Approve/reject ODC registrations
  - Configure certificate types (define what certificates are required)
  - View audit logs (track all system activities)
  - Monitor overall compliance across all vendors and ODCs

### 2. **Vendor Admin** (`vendor_admin`)
- **Purpose**: Manage their company's ODCs and compliance
- **Responsibilities**:
  - Register new ODC locations (requires admin approval)
  - View all ODCs under their vendor account
  - Upload certificates for any of their ODCs
  - View all certificates across all their ODCs
  - Manage ODC users (assign users to specific ODCs)
  - Monitor compliance status across all their locations

### 3. **ODC User** (`odc_user`)
- **Purpose**: Manage compliance for a specific ODC location
- **Responsibilities**:
  - Upload certificates for their assigned ODC
  - View certificates for their ODC only
  - Track validation status
  - Monitor expiring certificates
- **Limitation**: Can only see/manage certificates for their assigned ODC

### 4. **Auditor** (`auditor`)
- **Purpose**: Review and audit compliance
- **Responsibilities**:
  - View all vendors
  - Review certificates across all vendors/ODCs
  - Verify compliance status
  - No editing permissions (read-only access)

---

## Complete Workflow: From ODC Registration to Certificate Validation

### Phase 1: Vendor & ODC Setup

```
1. Super Admin creates/manages Vendors
   └─> Vendors are companies that operate ODCs

2. Vendor Admin registers a new ODC
   └─> Provides: ODC name, location, address
   └─> Status: "pending" (waiting for admin approval)

3. Super Admin reviews and approves ODC
   └─> Changes status: "pending" → "approved"
   └─> ODC can now accept certificate uploads

4. Vendor Admin assigns ODC Users
   └─> Creates user accounts with role "odc_user"
   └─> Links users to specific ODC via `odc_id` in profiles table
```

### Phase 2: Certificate Upload

There are **two ways** certificates can be uploaded:

#### Option A: Vendor Admin Uploads (Bulk Upload)
```
1. Vendor Admin navigates to: /vendor/certificates/upload/:odcId
2. Sees all certificate types (e.g., ISO 27001, SOC 2, etc.)
3. Can upload multiple certificates at once (one per type)
4. For each certificate:
   - Selects certificate type
   - Uploads file (PDF, JPG, PNG, DOC, DOCX)
   - Optionally sets period start/end dates
5. Submits all certificates
```

#### Option B: ODC User Uploads (Individual Upload)
```
1. ODC User navigates to: /odc/upload
2. Sees only their assigned ODC
3. Selects one certificate type
4. Uploads single certificate file
5. Optionally sets period start/end dates
6. Submits certificate
```

### Phase 3: Certificate Processing Pipeline

When a certificate is uploaded, the system automatically processes it:

```
Step 1: File Upload
├─> File saved to Supabase Storage
├─> Upload record created in `uploads` table
└─> Certificate instance created in `certificate_instances` table
    └─> Status: "pending"

Step 2: OCR Extraction (Automatic)
├─> OCR service extracts text from certificate image/PDF
├─> Extracted text stored in `ocr_data` table
├─> Structured data extracted (dates, names, numbers, etc.)
└─> OCR data linked to upload via `upload_id`

Step 3: AI Validation (Automatic)
├─> AI service receives:
│   ├─> OCR extracted text
│   ├─> Certificate type requirements
│   └─> Structured data
├─> AI validates certificate against requirements:
│   ├─> Checks required fields are present
│   ├─> Validates data format and consistency
│   ├─> Calculates overall score (0-100)
│   └─> Identifies issues/discrepancies
├─> Validation result stored in `validation_results` table
└─> Certificate status updated:
    ├─> "passed" (if score meets threshold)
    ├─> "failed" (if issues found)
    └─> "pending" (if validation incomplete)
```

### Phase 4: Certificate Status & Monitoring

```
Certificate Statuses:
├─> "pending" - Awaiting OCR/AI validation
├─> "passed" - Validation successful
├─> "failed" - Validation failed (issues found)
└─> "rejected" - Manually rejected by admin/auditor

Monitoring:
├─> Expiring certificates (expiring within 30 days) are flagged
├─> Dashboard shows statistics:
│   ├─> Total certificates
│   ├─> Pending validation count
│   ├─> Passed count
│   ├─> Failed count
│   └─> Expiring soon count
└─> Notifications sent for critical issues
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  Super Admin    │
│  (System Mgmt)  │
└────────┬────────┘
         │
         │ Approves
         ▼
┌─────────────────┐
│  Vendor Admin   │─── Registers ───► ┌──────────────┐
│  (Company Mgmt) │                    │  ODC Location│
└────────┬────────┘                    │  (Approved)  │
         │                              └──────┬───────┘
         │ Assigns Users                      │
         ▼                                    │
┌─────────────────┐                          │
│   ODC Users     │◄─────────────────────────┘
│  (Location Mgmt)│
└────────┬────────┘
         │
         │ Uploads Certificates
         ▼
┌─────────────────────────────────┐
│  Certificate Upload             │
│  (PDF/Image/DOC)                │
└────────┬────────────────────────┘
         │
         ├─► File Storage (Supabase Storage)
         │
         ├─► OCR Extraction
         │   └─► Extracted Text + Structured Data
         │
         └─► AI Validation
             ├─► Validates against requirements
             ├─► Calculates score
             └─► Identifies issues
                 │
                 ▼
         ┌───────────────────────┐
         │  Validation Result    │
         │  (passed/failed)      │
         └───────────────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │  Dashboard Updates    │
         │  (All Roles)          │
         └───────────────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │  Auditor Review       │
         │  (Optional)          │
         └───────────────────────┘
```

---

## Key Database Tables

### Core Tables:
1. **vendors** - Company information
2. **odc_locations** - ODC location details (name, location, address, status)
3. **profiles** - User profiles with role and ODC/vendor assignments
4. **certificate_types** - Types of certificates (ISO 27001, SOC 2, etc.)
5. **certificate_instances** - Individual certificate records
6. **uploads** - File upload records
7. **ocr_data** - OCR extraction results
8. **validation_results** - AI validation results

### Relationships:
```
vendors (1) ──< (many) odc_locations
odc_locations (1) ──< (many) certificate_instances
certificate_instances (1) ──< (1) uploads
uploads (1) ──< (1) ocr_data
uploads (1) ──< (1) validation_results
profiles (many) ──< (1) odc_locations (via odc_id)
profiles (many) ──< (1) vendors (via vendor_id)
```

---

## Why This Architecture?

### 1. **Separation of Concerns**
- **Vendors** manage multiple ODCs
- **ODC Users** focus on one location
- **Admins** oversee everything
- **Auditors** review without editing

### 2. **Scalability**
- A vendor can have 10, 50, or 100+ ODCs
- Each ODC can have multiple users
- System handles growth without complexity

### 3. **Compliance Tracking**
- Each ODC location has independent compliance status
- Certificates are tracked per location
- Expiration monitoring per ODC
- Clear audit trail

### 4. **Automation**
- OCR extraction eliminates manual data entry
- AI validation reduces human error
- Automatic status updates
- Real-time dashboard statistics

### 5. **Security & Access Control**
- Role-based access control (RBAC)
- ODC users can only see their location
- Vendor admins see all their ODCs
- Admins see everything
- Auditors have read-only access

---

## Typical User Journey Examples

### Example 1: New ODC Setup
```
1. Vendor Admin logs in → /vendor/dashboard
2. Navigates to "ODCs" → /vendor/odc
3. Clicks "Register New ODC"
4. Fills form: Name="Bangalore ODC-1", Location="Bangalore, India"
5. Submits → Status: "pending"
6. Super Admin reviews → Approves → Status: "approved"
7. Vendor Admin creates ODC user → Assigns to "Bangalore ODC-1"
8. ODC User logs in → Sees /odc/dashboard for their ODC
```

### Example 2: Certificate Upload & Validation
```
1. ODC User navigates to /odc/upload
2. Selects certificate type: "ISO 27001"
3. Uploads PDF file
4. Sets period: Start="2024-01-01", End="2024-12-31"
5. Submits → Certificate status: "pending"
6. System automatically:
   ├─> Saves file to storage
   ├─> Runs OCR extraction (extracts text from PDF)
   ├─> Runs AI validation (checks required fields, validates data)
   └─> Updates status: "passed" or "failed"
7. ODC User sees updated status in /odc/certificates
8. Dashboard shows: "Passed: 1" in statistics
```

### Example 3: Vendor Monitoring Multiple ODCs
```
1. Vendor Admin logs in → /vendor/dashboard
2. Sees statistics:
   ├─> Total ODCs: 5
   ├─> Approved ODCs: 4
   ├─> Pending ODCs: 1
   ├─> Total Certificates: 48
   └─> Expiring Soon: 3
3. Clicks on "ODCs" → Sees list of all 5 ODCs
4. Clicks on "Bangalore ODC-1" → Sees details
5. Clicks "Upload Certificates" → Bulk uploads for that ODC
6. All certificates go through OCR + AI validation
7. Dashboard updates with new statistics
```

---

## Technology Stack

- **Frontend**: React + Vite
- **Backend/Database**: Supabase (PostgreSQL + Storage)
- **Authentication**: Supabase Auth (magic links)
- **OCR**: Tesseract.js / Google Cloud Vision API (to be implemented)
- **AI Validation**: OpenAI GPT-4 (to be implemented via Edge Functions)
- **Routing**: React Router v6
- **State Management**: React Context API

---

## Current Implementation Status

✅ **Completed**:
- User authentication & role-based routing
- Vendor management
- ODC registration & approval workflow
- Certificate upload (both vendor and ODC user)
- Dashboard statistics
- Certificate listing & details view
- File storage integration

🔄 **In Progress / To Be Implemented**:
- OCR extraction (frontend triggers, backend needs implementation)
- AI validation (frontend triggers, backend needs implementation)
- Real-time notifications
- Email alerts for expiring certificates
- Advanced reporting

---

## Summary

The **ODC Dashboard** exists to give **ODC users** (staff at specific locations) a focused interface to manage compliance for their location. The system follows a hierarchical structure:

- **Super Admin** → Manages vendors and ODCs
- **Vendor Admin** → Manages their company's ODCs and can upload certificates
- **ODC User** → Manages certificates for their specific ODC location
- **Auditor** → Reviews compliance across all vendors

The workflow ensures that:
1. ODCs are properly registered and approved
2. Certificates are uploaded and validated automatically
3. Compliance status is tracked per location
4. All stakeholders have appropriate visibility
5. The system scales to handle many vendors and ODCs

This architecture provides clear accountability, scalability, and automation for managing compliance across multiple offshore development centers.
