// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        users: 0,
        projects: 0,
        activeIRs: 0,
        pendingRevisions: 0,
        completedIRs: 0,
        pendingIRs: 0,
        archiveTotal: 0,
        cprCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [recentActivity, setRecentActivity] = useState([]);
    const [systemStatus, setSystemStatus] = useState({
        database: "online",
        api: "online",
        uptime: "0 days"
    });

    // Auth check - Admin only access
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user) {
            navigate("/login");
            return;
        }
        
        // Allow admin access to all pages
        if (user.role !== "admin") {
            // Redirect to appropriate dashboard based on role
            if (user.role === "dc") {
                navigate("/dc");
            } else {
                navigate("/engineer");
            }
        }
    }, [navigate]);

    useEffect(() => {
        loadStats();
        loadRecentActivity();
        checkSystemStatus();
        
        const interval = setInterval(() => {
            loadStats();
        }, 30000); // Refresh every 30 seconds
        
        return () => clearInterval(interval);
    }, []);

    async function loadStats() {
        try {
            const [usersRes, projectsRes, irsRes, revsRes, archiveRes, dcArchiveRes] = await Promise.all([
                fetch(`${API_URL}/users`),
                fetch(`${API_URL}/projects`),
                fetch(`${API_URL}/irs`),
                fetch(`${API_URL}/revs`),
                fetch(`${API_URL}/archive/engineer?user=admin`).catch(() => ({ ok: false })),
                fetch(`${API_URL}/archive/dc`).catch(() => ({ ok: false }))
            ]);
            
            if (!usersRes.ok || !projectsRes.ok || !irsRes.ok || !revsRes.ok) {
                throw new Error("Failed to fetch system data");
            }

            const usersData = await usersRes.json();
            const projectsData = await projectsRes.json();
            const irsData = await irsRes.json();
            const revsData = await revsRes.json();

            const projectsCount = Object.keys(projectsData.projects || {}).length;
            const activeIRs = irsData.irs?.length || 0;
            const pendingRevisions = revsData.revs?.filter(rev => !rev.isDone)?.length || 0;
            const completedIRs = irsData.irs?.filter(ir => ir.isDone)?.length || 0;
            const pendingIRs = activeIRs - completedIRs;

            // Calculate CPR count
            const cprCount = irsData.irs?.filter(ir => ir.requestType === "CPR")?.length || 0;

            // Calculate archive stats
            let archiveTotal = 0;
            if (archiveRes.ok) {
                const archiveData = await archiveRes.json();
                archiveTotal += archiveData.archive?.length || 0;
            }
            if (dcArchiveRes.ok) {
                const dcArchiveData = await dcArchiveRes.json();
                archiveTotal += dcArchiveData.archive?.length || 0;
            }

            setStats({
                users: usersData.users?.length || 0,
                projects: projectsCount,
                activeIRs,
                pendingRevisions,
                completedIRs,
                pendingIRs,
                archiveTotal,
                cprCount
            });
            setError("");
        } catch (err) {
            console.error("Error loading stats:", err);
            setError("Failed to load dashboard statistics");
        } finally {
            setLoading(false);
        }
    }

    async function loadRecentActivity() {
        try {
            const [irsRes, revsRes] = await Promise.all([
                fetch(`${API_URL}/irs`),
                fetch(`${API_URL}/revs`)
            ]);

            const irsData = await irsRes.json();
            const revsData = await revsRes.json();

            // Combine and sort by date
            const allItems = [
                ...(irsData.irs || []).map(item => ({ ...item, type: 'IR', date: item.sentAt })),
                ...(revsData.revs || []).map(item => ({ ...item, type: 'REV', date: item.sentAt }))
            ];

            // Sort by date (newest first) and take top 10
            const sorted = allItems.sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            ).slice(0, 10);

            setRecentActivity(sorted);
        } catch (err) {
            console.error("Error loading recent activity:", err);
        }
    }

    async function checkSystemStatus() {
        try {
            // Check database connection
            const dbCheck = await fetch(`${API_URL}/users`);
            const dbStatus = dbCheck.ok ? "online" : "offline";
            
            // Check API status
            const apiCheck = await fetch(`${API_URL}/projects`);
            const apiStatus = apiCheck.ok ? "online" : "offline";
            
            // Calculate uptime (simplified)
            const startTime = localStorage.getItem('system_start_time');
            let uptime = "0 days";
            if (startTime) {
                const diff = Date.now() - parseInt(startTime);
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                uptime = `${days} days`;
            }

            setSystemStatus({
                database: dbStatus,
                api: apiStatus,
                uptime
            });
        } catch (err) {
            setSystemStatus({
                database: "offline",
                api: "offline",
                uptime: "0 days"
            });
        }
    }

    const handleQuickAction = (action) => {
        switch(action) {
            case 'add_user':
                navigate('/admin/users');
                break;
            case 'add_project':
                navigate('/admin/projects');
                break;
            case 'view_reports':
                navigate('/engineer-records');
                break;
            case 'system_settings':
                // Navigate to system settings page when created
                alert('System settings page coming soon!');
                break;
        }
    };

    const cards = [
        {
            id: "users",
            title: "👥 Users Management",
            description: "Full control over users, roles, and permissions",
            stats: `${stats.users} users`,
            link: "/admin/users",
            gradient: "from-blue-600 to-indigo-600",
            icon: "👥",
            badgeColor: "bg-blue-100 text-blue-800",
            permissions: ["admin"]
        },
        {
            id: "projects",
            title: "📁 Projects Management",
            description: "Create, edit, delete projects and manage counters",
            stats: `${stats.projects} projects`,
            link: "/admin/projects",
            gradient: "from-emerald-600 to-green-600",
            icon: "📁",
            badgeColor: "bg-emerald-100 text-emerald-800",
            permissions: ["admin"]
        },
        {
            id: "engineer",
            title: "👷 Engineer Dashboard",
            description: "Submit and track inspection requests",
            stats: `${stats.pendingIRs} pending IRs`,
            link: "/engineer",
            gradient: "from-purple-600 to-violet-600",
            icon: "👷",
            badgeColor: "bg-purple-100 text-purple-800",
            permissions: ["admin", "engineer", "head", "dc"]
        },
        {
            id: "dc",
            title: "📋 Document Controller",
            description: "Review, archive, and manage all requests",
            stats: `${stats.pendingRevisions} pending revisions`,
            link: "/dc",
            gradient: "from-amber-600 to-orange-600",
            icon: "📋",
            badgeColor: "bg-amber-100 text-amber-800",
            permissions: ["admin", "dc"]
        },
        {
            id: "records",
            title: "📊 System Records",
            description: "View all IRs, CPRs, and revisions across system",
            stats: `${stats.activeIRs} active requests`,
            link: "/engineer-records",
            gradient: "from-slate-700 to-gray-700",
            icon: "📊",
            badgeColor: "bg-gray-100 text-gray-800",
            permissions: ["admin", "head", "dc"]
        },
        {
            id: "archive",
            title: "🗄️ Archive Management",
            description: "Access and restore archived items",
            stats: `${stats.archiveTotal} archived items`,
            link: "/dc-archive",
            gradient: "from-rose-600 to-pink-600",
            icon: "🗄️",
            badgeColor: "bg-rose-100 text-rose-800",
            permissions: ["admin", "dc"]
        }
    ];

    const quickStats = [
        {
            label: "Total Users",
            value: stats.users,
            icon: "👥",
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            change: "+2 this week"
        },
        {
            label: "Active Projects",
            value: stats.projects,
            icon: "📁",
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            change: "All active"
        },
        {
            label: "Pending IRs",
            value: stats.pendingIRs,
            icon: "⏳",
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            change: "Requires attention"
        },
        {
            label: "Completed IRs",
            value: stats.completedIRs,
            icon: "✅",
            color: "text-green-600",
            bgColor: "bg-green-50",
            change: `${Math.round((stats.completedIRs / (stats.activeIRs || 1)) * 100)}% completion`
        },
        {
            label: "CPR Requests",
            value: stats.cprCount,
            icon: "🏗️",
            color: "text-teal-600",
            bgColor: "bg-teal-50",
            change: "Concrete pouring"
        },
        {
            label: "In Archive",
            value: stats.archiveTotal,
            icon: "🗄️",
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            change: "Completed items"
        }
    ];

    const quickActions = [
        {
            id: 'add_user',
            title: 'Add New User',
            description: 'Create a new system user',
            icon: '👤',
            color: 'bg-blue-500',
            action: () => handleQuickAction('add_user')
        },
        {
            id: 'add_project',
            title: 'Add Project',
            description: 'Create a new construction project',
            icon: '🏗️',
            color: 'bg-emerald-500',
            action: () => handleQuickAction('add_project')
        },
        {
            id: 'view_reports',
            title: 'View Reports',
            description: 'System performance reports',
            icon: '📈',
            color: 'bg-purple-500',
            action: () => handleQuickAction('view_reports')
        },
        {
            id: 'system_settings',
            title: 'System Settings',
            description: 'Configure system preferences',
            icon: '⚙️',
            color: 'bg-gray-500',
            action: () => handleQuickAction('system_settings')
        }
    ];

    const systemHealthItems = [
        {
            label: "Database",
            status: systemStatus.database,
            color: systemStatus.database === "online" ? "text-green-600" : "text-red-600",
            icon: systemStatus.database === "online" ? "🟢" : "🔴"
        },
        {
            label: "API Server",
            status: systemStatus.api,
            color: systemStatus.api === "online" ? "text-green-600" : "text-red-600",
            icon: systemStatus.api === "online" ? "🟢" : "🔴"
        },
        {
            label: "System Uptime",
            status: systemStatus.uptime,
            color: "text-blue-600",
            icon: "⏱️"
        }
    ];

    if (loading) {
        return (
            <>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading Admin Dashboard...</p>
                        <p className="text-gray-400 text-sm mt-2">Fetching system statistics</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>            
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl">
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                    👑 Admin Dashboard
                                </h1>
                                <p className="text-slate-300 text-lg">
                                    Complete system administration and management console
                                </p>
                                <div className="flex items-center gap-4 mt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-sm text-slate-300">Full Administrative Access</span>
                                    </div>
                                    <div className="text-sm bg-white/10 px-3 py-1 rounded-full">
                                        All Modules Available
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={loadStats}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
                                >
                                    <span className="text-lg">🔄</span>
                                    Refresh Data
                                </button>
                                <div className="text-sm bg-white/10 px-3 py-1 rounded-full">
                                    Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-red-500 text-xl">⚠️</div>
                                <div>
                                    <p className="font-medium text-red-700">{error}</p>
                                    <p className="text-red-600 text-sm">Check your connection and try again</p>
                                </div>
                            </div>
                            <button
                                onClick={loadStats}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* System Health */}
                    <div className="mb-10">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-green-500">🏥</span> System Health
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {systemHealthItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-2xl">{item.icon}</div>
                                        <div className={`text-lg font-bold ${item.color}`}>
                                            {item.status}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 font-medium">{item.label}</p>
                                    <p className="text-gray-500 text-sm mt-1">
                                        {item.label === "System Uptime" ? "Continuous operation" : 
                                         item.status === "online" ? "Connected and operational" : 
                                         "Connection issues"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="mb-10">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-blue-500">📈</span> System Overview
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            {quickStats.map((stat, index) => (
                                <div
                                    key={index}
                                    className={`${stat.bgColor} rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-2xl">{stat.icon}</div>
                                        <div className={`text-2xl font-bold ${stat.color}`}>
                                            {stat.value}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 font-medium">{stat.label}</p>
                                    <p className="text-gray-500 text-xs mt-1">
                                        {stat.change}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="text-purple-500">⚡</span> Quick Actions
                            </h2>
                            <p className="text-gray-500 text-sm">
                                Administrative shortcuts
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {quickActions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={action.action}
                                    className="group bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left"
                                >
                                    <div className="p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center text-white text-xl`}>
                                                {action.icon}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 mb-2">{action.title}</h3>
                                        <p className="text-gray-600 text-sm mb-3">
                                            {action.description}
                                        </p>
                                        
                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-blue-600 text-sm group-hover:text-blue-700 transition-colors">
                                                Click to open →
                                            </span>
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                <span className="text-gray-400 group-hover:text-blue-600 transition-colors">
                                                    →
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Cards */}
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="text-indigo-500">🚀</span> System Modules
                            </h2>
                            <p className="text-gray-500 text-sm">
                                {cards.length} management modules available
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {cards.map((card) => (
                                <Link
                                    key={card.id}
                                    to={card.link}
                                    className="group block"
                                >
                                    <div className="h-full bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                        {/* Card Header */}
                                        <div className={`bg-gradient-to-r ${card.gradient} p-6 text-white`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-3xl">{card.icon}</div>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${card.badgeColor}`}>
                                                    {card.stats}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                                        </div>
                                        
                                        {/* Card Body */}
                                        <div className="p-6">
                                            <p className="text-gray-600 mb-4">
                                                {card.description}
                                            </p>
                                            
                                            <div className="flex items-center gap-2 mb-3">
                                                {card.permissions?.map(perm => (
                                                    <span key={perm} className={`px-2 py-1 text-xs rounded ${
                                                        perm === "admin" ? "bg-red-100 text-red-800" :
                                                        perm === "dc" ? "bg-amber-100 text-amber-800" :
                                                        perm === "engineer" ? "bg-blue-100 text-blue-800" :
                                                        "bg-gray-100 text-gray-800"
                                                    }`}>
                                                        {perm}
                                                    </span>
                                                ))}
                                            </div>
                                            
                                            <div className="flex items-center justify-between mt-4">
                                                <span className="text-gray-500 text-sm group-hover:text-blue-600 transition-colors">
                                                    Click to open →
                                                </span>
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                    <span className="text-gray-400 group-hover:text-blue-600 transition-colors">
                                                        →
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity & System Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Activity */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="text-amber-500">📋</span> Recent Activity
                            </h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {recentActivity.length > 0 ? (
                                    recentActivity.map((item, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                item.type === 'IR' ? 'bg-blue-100 text-blue-600' :
                                                'bg-amber-100 text-amber-600'
                                            }`}>
                                                {item.type === 'IR' ? '📝' : '🔄'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800">
                                                    {item.irNo || item.revNo}
                                                </div>
                                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                                    <span>{item.project}</span>
                                                    <span>•</span>
                                                    <span>{item.user}</span>
                                                    <span>•</span>
                                                    <span>{item.department}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <div className="text-4xl mb-2">📭</div>
                                        No recent activity
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* System Info */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <span>ℹ️</span> System Information
                                </h3>
                                <div className="text-sm bg-white/10 px-3 py-1 rounded-full">
                                    v2.1.0
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-slate-300 mb-1">IR Management System</p>
                                    <p className="text-sm text-slate-400">Built with React & Flask • Firebase Backend</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                    <div>
                                        <div className="text-sm text-slate-300">Total Requests</div>
                                        <div className="text-2xl font-bold">
                                            {stats.activeIRs + stats.completedIRs}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-300">Completion Rate</div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {stats.activeIRs + stats.completedIRs > 0 
                                                ? Math.round((stats.completedIRs / (stats.activeIRs + stats.completedIRs)) * 100) 
                                                : 0}%
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-white/10">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300">Server Time</span>
                                        <span>{new Date().toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-2">
                                        <span className="text-slate-300">Today's Date</span>
                                        <span>{new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>
                                
                                <div className="pt-4">
                                    <p className="text-sm text-slate-400">
                                        ⚠️ All administrative actions are logged for security auditing.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
                        <div className="flex items-start gap-4">
                            <div className="text-blue-500 text-2xl">💡</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-blue-800 mb-2">Administrator Notes</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-blue-700 text-sm font-medium">User Management</p>
                                        <p className="text-blue-600 text-xs mt-1">
                                            • Create, edit, and delete users<br/>
                                            • Assign roles and departments<br/>
                                            • Reset passwords
                                        </p>
                                    </div>
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-emerald-700 text-sm font-medium">Project Management</p>
                                        <p className="text-emerald-600 text-xs mt-1">
                                            • Add/remove projects<br/>
                                            • Manage IR counters<br/>
                                            • Configure locations and descriptions
                                        </p>
                                    </div>
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-purple-700 text-sm font-medium">System Monitoring</p>
                                        <p className="text-purple-600 text-xs mt-1">
                                            • View all system activities<br/>
                                            • Monitor performance metrics<br/>
                                            • Access all user dashboards
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}