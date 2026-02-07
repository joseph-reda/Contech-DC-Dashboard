import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

// Components
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Pages
import LoginPage from "./pages/LoginPage.jsx";
import EngineerPage from "./pages/EngineerPage.jsx";
import EngineerRecords from "./pages/EngineerRecords.jsx";
import DcPage from "./pages/DcPage.jsx";
import DcArchive from "./pages/DcArchive.jsx";

// NEW: Super Admin Panel (Replaces old admin pages)
import SuperAdminPanel from "./pages/SuperAdminPanel.jsx";

// OLD ADMIN PAGES (Kept for reference/backup - remove from imports if not needed)
// import AdminDashboard from "./pages/AdminDashboard.jsx";
// import ProjectsAdmin from "./pages/ProjectsAdmin.jsx";
// import UsersAdminPage from "./pages/UsersAdminPage.jsx";
// import AdminSettings from "./pages/AdminSettings.jsx";

// Components
import Navbar from "./components/Navbar.jsx";

export default function App() {
    const [user, setUser] = useState(undefined);
    const [loading, setLoading] = useState(true);

    // Global error handler
    window.onerror = function (message, source, lineno, colno, error) {
        console.log("Global error:", message, source);
        return false;
    };

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("user") || "null");
        setUser(saved);
        setLoading(false);

        // Set system start time for uptime calculation
        if (!localStorage.getItem('system_start_time')) {
            localStorage.setItem('system_start_time', Date.now().toString());
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading Application...</p>
                </div>
            </div>
        );
    }

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
    };

    // Handle login
    const handleLogin = (userData) => {
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
    };

    return (
        <>
            {/* Navbar - Show only when user is logged in and not on login page */}
            {user && <Navbar user={user} onLogout={handleLogout} />}

            <Routes>
                {/* ============================
                    LOGIN ROUTE - PUBLIC
                ============================= */}
                <Route
                    path="/login"
                    element={<LoginPage setUser={handleLogin} />}
                />

                {/* ============================
                    SUPER ADMIN PANEL - NEW SYSTEM (Replaces all old admin routes)
                ============================= */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <SuperAdminPanel />
                        </ProtectedRoute>
                    }
                />

                {/* ============================
                    OLD ADMIN ROUTES - REDIRECTED TO SUPER ADMIN PANEL
                    (Comment out or remove these if you want to redirect all admin traffic)
                ============================= */}
                {/* 
                <Route
                    path="/admin-old"  // Changed from /admin to /admin-old for backup
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin-old/users"  // Changed from /admin/users
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <UsersAdminPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin-old/projects"  // Changed from /admin/projects
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <ProjectsAdmin />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin-old/settings"  // Changed from /admin/settings
                    element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <AdminSettings />
                        </ProtectedRoute>
                    }
                />
                */}

                {/* ============================
                    ENGINEER ROUTES
                ============================= */}
                <Route
                    path="/engineer"
                    element={
                        <ProtectedRoute allowedRoles={["engineer", "head", "admin"]}>
                            <EngineerPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/engineer-records"
                    element={
                        <ProtectedRoute allowedRoles={["engineer", "head", "admin", "dc"]}>
                            <EngineerRecords />
                        </ProtectedRoute>
                    }
                />

                {/* ============================
                    DC ROUTES
                ============================= */}
                <Route
                    path="/dc"
                    element={
                        <ProtectedRoute allowedRoles={["dc", "admin"]}>
                            <DcPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/dc-archive"
                    element={
                        <ProtectedRoute allowedRoles={["dc", "admin"]}>
                            <DcArchive />
                        </ProtectedRoute>
                    }
                />

                {/* ============================
                    DEFAULT ROUTE - Redirect based on role
                    All admins now go to SuperAdminPanel
                ============================= */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            {user ? (
                                user.role === "admin" ? (
                                    <SuperAdminPanel /> // New admin panel
                                ) :
                                user.role === "dc" ? <DcPage /> :
                                user.role === "engineer" || user.role === "head" ? <EngineerPage /> :
                                <LoginPage setUser={handleLogin} />
                            ) : (
                                <LoginPage setUser={handleLogin} />
                            )}
                        </ProtectedRoute>
                    }
                />

                {/* ============================
                    404 Route - Redirect to appropriate dashboard
                    All admins now go to SuperAdminPanel
                ============================= */}
                <Route
                    path="*"
                    element={
                        <ProtectedRoute>
                            {user ? (
                                user.role === "admin" ? (
                                    <SuperAdminPanel /> // New admin panel for all admin 404s
                                ) :
                                user.role === "dc" ? <DcPage /> :
                                user.role === "engineer" || user.role === "head" ? <EngineerPage /> :
                                <LoginPage setUser={handleLogin} />
                            ) : (
                                <LoginPage setUser={handleLogin} />
                            )}
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </>
    );
}