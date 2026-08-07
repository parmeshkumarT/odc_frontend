import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Notifications() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
        
        // Set up real-time subscription for new uploads
        const subscription = supabase
            .channel('certificate-uploads')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'uploads' 
                }, 
                (payload) => {
                    console.log('New upload detected:', payload);
                    loadNotifications();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            // Get recent certificate uploads (last 24 hours)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            const { data: uploads, error: uploadsError } = await supabase
                .from("uploads")
                .select("id, created_at, file_url, file_type, certificate_instance_id")
                .gte("created_at", oneDayAgo)
                .order("created_at", { ascending: false })
                .limit(10);

            if (uploadsError) {
                console.error("Error loading notifications:", uploadsError);
                setLoading(false);
                return;
            }

            if (!uploads || uploads.length === 0) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            // Get certificate instance details
            const certInstanceIds = uploads.map(u => u.certificate_instance_id).filter(Boolean);
            const { data: certInstances } = await supabase
                .from("certificate_instances")
                .select("id, certificate_type_id, odc_id, vendor_id, status")
                .in("id", certInstanceIds);

            // Get certificate types
            const certTypeIds = [...new Set((certInstances || []).map(c => c.certificate_type_id).filter(Boolean))];
            const { data: certTypes } = certTypeIds.length > 0 ? await supabase
                .from("certificate_types")
                .select("id, name")
                .in("id", certTypeIds) : { data: [] };

            // Get ODCs
            const odcIds = [...new Set((certInstances || []).map(c => c.odc_id).filter(Boolean))];
            const { data: odcs } = odcIds.length > 0 ? await supabase
                .from("odc_locations")
                .select("id, name, location")
                .in("id", odcIds) : { data: [] };

            // Get vendors
            const vendorIds = [...new Set((certInstances || []).map(c => c.vendor_id).filter(Boolean))];
            const { data: vendors } = vendorIds.length > 0 ? await supabase
                .from("vendors")
                .select("id, name")
                .in("id", vendorIds) : { data: [] };

            // Create lookup maps
            const certTypeMap = {};
            (certTypes || []).forEach(t => { certTypeMap[t.id] = t.name; });

            const odcMap = {};
            (odcs || []).forEach(o => { odcMap[o.id] = { name: o.name, location: o.location }; });

            const vendorMap = {};
            (vendors || []).forEach(v => { vendorMap[v.id] = v.name; });

            const certInstanceMap = {};
            (certInstances || []).forEach(c => {
                certInstanceMap[c.id] = {
                    certType: certTypeMap[c.certificate_type_id] || 'Unknown',
                    odc: odcMap[c.odc_id] || { name: 'Unknown ODC', location: '' },
                    vendor: vendorMap[c.vendor_id] || 'Unknown Vendor',
                    status: c.status || 'pending'
                };
            });

            // Format notifications
            const formatted = uploads.map(upload => {
                const instance = certInstanceMap[upload.certificate_instance_id] || {};
                return {
                    id: upload.id,
                    type: "certificate_upload",
                    message: `New certificate uploaded: ${instance.certType || 'Unknown'} for ${instance.odc?.name || 'Unknown ODC'}`,
                    vendor: instance.vendor || 'Unknown Vendor',
                    odc: instance.odc?.name || 'Unknown ODC',
                    location: instance.odc?.location || '',
                    certificateType: instance.certType || 'Unknown',
                    status: instance.status || 'pending',
                    timestamp: upload.created_at,
                    certificateInstanceId: upload.certificate_instance_id
                };
            });

            setNotifications(formatted);
        } catch (err) {
            console.error("Error loading notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <div style={cardStyle}>
                <h3 style={titleStyle}>Recent Activity</h3>
                <p style={{ color: "#6b7280", fontSize: 14 }}>Loading...</p>
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div style={cardStyle}>
                <h3 style={titleStyle}>Recent Activity</h3>
                <p style={{ color: "#6b7280", fontSize: 14 }}>No recent certificate uploads.</p>
            </div>
        );
    }

    return (
        <div style={cardStyle}>
            <h3 style={titleStyle}>Recent Certificate Uploads</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        style={notificationItemStyle}
                        onClick={() => navigate("/admin/certificates")}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, marginBottom: 4, fontWeight: 500, fontSize: 14 }}>
                                    {notif.message}
                                </p>
                                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                                    {notif.vendor} • {notif.odc} ({notif.location})
                                </p>
                            </div>
                            <span
                                style={{
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    backgroundColor: notif.status === "pending" ? "#fef3c7" : "#d1fae5",
                                    color: notif.status === "pending" ? "#92400e" : "#065f46",
                                    fontSize: 11,
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    marginLeft: 12
                                }}
                            >
                                {notif.status}
                            </span>
                        </div>
                        <p style={{ margin: 0, marginTop: 4, fontSize: 11, color: "#9ca3af" }}>
                            {new Date(notif.timestamp).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

const cardStyle = {
    background: "#fff",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb"
};

const titleStyle = {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    marginTop: 0
};

const notificationItemStyle = {
    padding: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    backgroundColor: "#f9fafb",
    cursor: "pointer",
    transition: "all 0.2s"
};

