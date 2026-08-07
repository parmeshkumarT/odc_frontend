import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const PAGE_SIZE = 20;

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            setError(null);

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error } = await supabase
                .from("audit_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) {
                console.error("Error loading audit logs", error);
                setError("Failed to load audit logs");
            } else {
                setLogs(data || []);
            }

            setLoading(false);
        };

        fetchLogs();
    }, [page]);

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>Audit Logs</h1>
            <p style={{ marginBottom: 16, color: "#555" }}>
                Read-only trail of important actions across the ODC compliance system.
            </p>

            <div
                style={{
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    padding: 16
                }}
            >
                {loading && <p>Loading audit logs...</p>}
                {error && (
                    <p style={{ color: "#b91c1c", marginBottom: 8 }}>
                        {error}
                    </p>
                )}

                {!loading && !error && logs.length === 0 && (
                    <p style={{ color: "#6b7280" }}>No audit events found.</p>
                )}

                {logs.length > 0 && (
                    <>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                            <thead>
                                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                                    <th style={{ padding: "8px 4px" }}>Time</th>
                                    <th style={{ padding: "8px 4px" }}>Actor</th>
                                    <th style={{ padding: "8px 4px" }}>Action</th>
                                    <th style={{ padding: "8px 4px" }}>Target</th>
                                    <th style={{ padding: "8px 4px" }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, index) => (
                                    <tr
                                        key={log.id}
                                        style={{
                                            backgroundColor: index % 2 === 1 ? "#f9fafb" : "transparent"
                                        }}
                                    >
                                        <td style={{ padding: "8px 4px" }}>
                                            {log.created_at
                                                ? new Date(log.created_at).toLocaleString()
                                                : "-"}
                                        </td>
                                        <td style={{ padding: "8px 4px" }}>{log.actor_email || "-"}</td>
                                        <td style={{ padding: "8px 4px" }}>{log.action || "-"}</td>
                                        <td style={{ padding: "8px 4px" }}>{log.entity || "-"}</td>
                                        <td style={{ padding: "8px 4px" }}>{log.details || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 4,
                                    border: "1px solid #e5e7eb",
                                    backgroundColor: page === 0 ? "#f3f4f6" : "#fff",
                                    cursor: page === 0 ? "default" : "pointer"
                                }}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage((p) => p + 1)}
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 4,
                                    border: "1px solid #e5e7eb",
                                    backgroundColor: "#fff",
                                    cursor: "pointer"
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

