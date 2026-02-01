// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = JSON.parse(localStorage.getItem("user") || "null");
        setUser(savedUser);
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-gray-600 text-sm">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // If no user, redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If allowedRoles is specified, check if user has required role
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Redirect based on user role
        if (user.role === "admin") {
            return <Navigate to="/admin" replace />;
        } else if (user.role === "dc") {
            return <Navigate to="/dc" replace />;
        } else if (user.role === "engineer" || user.role === "head") {
            return <Navigate to="/engineer" replace />;
        } else {
            // Unknown role, logout
            localStorage.removeItem("user");
            return <Navigate to="/login" replace />;
        }
    }

    // Check if user session is expired (24 hours)
    const lastActivity = localStorage.getItem("last_activity");
    const currentTime = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (lastActivity && (currentTime - parseInt(lastActivity)) > TWENTY_FOUR_HOURS) {
        // Session expired
        localStorage.removeItem("user");
        localStorage.removeItem("last_activity");
        return <Navigate to="/login" replace />;
    }

    // Update last activity time
    localStorage.setItem("last_activity", currentTime.toString());

    return children;
}