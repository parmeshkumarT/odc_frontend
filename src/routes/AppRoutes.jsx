import { Routes, Route } from "react-router-dom";
import Login from "../pages/auth/Login";
import ResetPassword from "../pages/auth/ResetPassword";
import AdminDashboard from "../pages/admin/Dashboard";
import Vendors from "../pages/admin/Vendors";
import ODCList from "../pages/admin/ODCList";
import Certificatetypes from "../pages/admin/Certificatetypes";
import AuditLogs from "../pages/admin/AuditLogs";
import VendorDashboard from "../pages/vendor/Dashboard";
import VendorODCList from "../pages/vendor/ODCList";
import VendorODCRegister from "../pages/vendor/ODCRegister";
import VendorODCDetails from "../pages/vendor/ODCDetails";
import VendorCertificates from "../pages/vendor/Certificates";
import VendorCertificateUpload from "../pages/vendor/CertificateUpload";
import VendorCertificateList from "../pages/vendor/CertificateList";
import VendorUsers from "../pages/vendor/Users";
import CertificateDetails from "../pages/shared/CertificateDetails";
import AuditorDashboard from "../pages/auditor/Dashboard";
import AuditorVendors from "../pages/auditor/Vendors";
import AuditorCertificateView from "../pages/auditor/CertificateView";
import AuditorVendorDetails from "../pages/auditor/VendorDetails";
import AuditorODCCertificates from "../pages/auditor/ODCCertificates";
import ProtectedRoute from "./ProtectedRoute";
import RoleRedirect from "./RoleRedirect";
import AdminLayout from "../layouts/AdminLayout";
import VendorLayout from "../layouts/VendorLayout";
import AuditorLayout from "../layouts/AuditorLayout";
import { useAuth } from "../context/AuthContext";

// Root route: if user is logged in, send them to the correct dashboard
// based on their role; otherwise show the login screen.
const RootRoute = () => {
    const { user, loading } = useAuth();

    // Show loading only while actually loading
    if (loading) {
        return (
            <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                minHeight: "100vh",
                flexDirection: "column",
                gap: "12px"
            }}>
                <div>Loading...</div>
            </div>
        );
    }

    // If no user, show login
    if (!user) {
        return <Login />;
    }

    // User is logged in, redirect based on role
    return <RoleRedirect />;
};

export default function AppRoutes() {
    return (
        <Routes>
            {/* Magic-link redirects here; we route based on role */}
            <Route path="/" element={<RootRoute />} />

            {/* Explicit login route (optional direct access) */}
            <Route path="/login" element={<Login />} />
            <Route
                path="/reset-password"
                element={
                    <ProtectedRoute>
                        <ResetPassword />
                    </ProtectedRoute>
                }
            />

            {/* Super Admin dashboard */}
            <Route
                path="/admin/dashboard"
                element={
                    <ProtectedRoute allowedRoles={["super_admin"]}>
                        <AdminLayout>
                            <AdminDashboard />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/vendors"
                element={
                    <ProtectedRoute allowedRoles={["super_admin"]}>
                        <AdminLayout>
                            <Vendors />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/odc"
                element={
                    <ProtectedRoute allowedRoles={["super_admin"]}>
                        <AdminLayout>
                            <ODCList />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/certificates/types"
                element={
                    <ProtectedRoute allowedRoles={["super_admin"]}>
                        <AdminLayout>
                            <Certificatetypes />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/logs"
                element={
                    <ProtectedRoute allowedRoles={["super_admin"]}>
                        <AdminLayout>
                            <AuditLogs />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />

            {/* Vendor Admin dashboard */}
            <Route
                path="/vendor/dashboard"
                element={
                    <ProtectedRoute allowedRoles={["vendor_admin"]}>
                        <VendorLayout>
                            <VendorDashboard />
                        </VendorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vendor/odc"
                element={
                    <ProtectedRoute allowedRoles={["vendor_admin"]}>
                        <VendorLayout>
                            <VendorODCList />
                        </VendorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vendor/odc/register"
                element={
                    <ProtectedRoute allowedRoles={["vendor_admin"]}>
                        <VendorLayout>
                            <VendorODCRegister />
                        </VendorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vendor/odc/:id"
                element={
                    <ProtectedRoute allowedRoles={["vendor_admin"]}>
                        <VendorLayout>
                            <VendorODCDetails />
                        </VendorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vendor/certificates"
                element={
                    <ProtectedRoute allowedRoles={["vendor_admin"]}>
                        <VendorLayout>
                            <VendorCertificates />
                        </VendorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vendor/certificates/upload/:id"
                element={
                    <ProtectedRoute allowedRoles={["vendor_admin"]}>
                        <VendorLayout>
                            <VendorCertificateUpload />
                        </VendorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vendor/certificates/list/:id"
                element={
                    <ProtectedRoute allowedRoles={["vendor_admin"]}>
                        <VendorLayout>
                            <VendorCertificateList />
                        </VendorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vendor/certificates/view/:id"
                element={
                    <ProtectedRoute allowedRoles={["vendor_admin"]}>
                        <VendorLayout>
                            <CertificateDetails />
                        </VendorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vendor/users"
                element={
                    <ProtectedRoute allowedRoles={["vendor_admin"]}>
                        <VendorLayout>
                            <VendorUsers />
                        </VendorLayout>
                    </ProtectedRoute>
                }
            />

            {/* Auditor dashboard */}
            <Route
                path="/auditor/dashboard"
                element={
                    <ProtectedRoute allowedRoles={["auditor"]}>
                        <AuditorLayout>
                            <AuditorDashboard />
                        </AuditorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/auditor/vendors"
                element={
                    <ProtectedRoute allowedRoles={["auditor", "client"]}>
                        <AuditorLayout>
                            <AuditorVendors />
                        </AuditorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/auditor/vendors/:id"
                element={
                    <ProtectedRoute allowedRoles={["auditor", "client"]}>
                        <AuditorLayout>
                            <AuditorVendorDetails />
                        </AuditorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/auditor/vendors/:vendorId/odc/:odcId/certificates"
                element={
                    <ProtectedRoute allowedRoles={["auditor", "client"]}>
                        <AuditorLayout>
                            <AuditorODCCertificates />
                        </AuditorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/auditor/certificates/:id"
                element={
                    <ProtectedRoute allowedRoles={["auditor", "client"]}>
                        <AuditorLayout>
                            <CertificateDetails />
                        </AuditorLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/auditor/review/:id"
                element={
                    <ProtectedRoute allowedRoles={["auditor"]}>
                        <AuditorLayout>
                            <AuditorCertificateView />
                        </AuditorLayout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

