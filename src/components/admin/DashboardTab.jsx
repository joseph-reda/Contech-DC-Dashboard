// src/components/admin/DashboardTab.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../../config";

export default function DashboardTab({ stats: initialStats }) {
    const [stats, setStats] = useState({
        users: 0,
        projects: 0,
        activeIRs: 0,
        pendingRevisions: 0,
        completedIRs: 0,
        pendingIRs: 0,
        archiveTotal: 0,
        cprCount: 0,
        totalRevs: 0,
        completedRevs: 0,
        ...initialStats
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [recentActivity, setRecentActivity] = useState([]);
    const [systemStatus, setSystemStatus] = useState({
        database: "online",
        api: "online",
        uptime: "0 days"
    });
    const [userCounts, setUserCounts] = useState({
        engineers: 0,
        dc: 0,
        heads: 0,
        admins: 0
    });

    // Load dashboard data
    useEffect(() => {
        loadDashboardData();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadDashboardData();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    async function loadDashboardData() {
        setLoading(true);
        try {
            // Load multiple data sources in parallel
            const [
                usersRes, 
                projectsRes, 
                irsRes, 
                revsRes,
                archiveRes
            ] = await Promise.all([
                fetch(`${API_URL}/users`).catch(() => ({ ok: false })),
                fetch(`${API_URL}/projects`).catch(() => ({ ok: false })),
                fetch(`${API_URL}/irs`).catch(() => ({ ok: false })),
                fetch(`${API_URL}/revs`).catch(() => ({ ok: false })),
                fetch(`${API_URL}/archive/dc`).catch(() => ({ ok: false }))
            ]);

            // Parse responses
            let usersData = { users: [] };
            let projectsData = { projects: {} };
            let irsData = { irs: [] };
            let revsData = { revs: [] };
            let archiveData = { archive: [] };

            if (usersRes.ok) {
                try {
                    const data = await usersRes.json();
                    usersData = data || { users: [] };
                    
                    // Calculate user counts by role
                    const counts = { engineers: 0, dc: 0, heads: 0, admins: 0 };
                    usersData.users.forEach(user => {
                        if (user.role === "engineer") counts.engineers++;
                        else if (user.role === "dc") counts.dc++;
                        else if (user.role === "head") counts.heads++;
                        else if (user.role === "admin") counts.admins++;
                    });
                    setUserCounts(counts);
                } catch (e) {
                    console.error("Failed to parse users:", e);
                }
            }

            if (projectsRes.ok) {
                try {
                    projectsData = await projectsRes.json();
                } catch (e) {
                    console.error("Failed to parse projects:", e);
                }
            }

            if (irsRes.ok) {
                try {
                    irsData = await irsRes.json();
                } catch (e) {
                    console.error("Failed to parse IRS:", e);
                }
            }

            if (revsRes.ok) {
                try {
                    revsData = await revsRes.json();
                } catch (e) {
                    console.error("Failed to parse revisions:", e);
                }
            }

            if (archiveRes.ok) {
                try {
                    archiveData = await archiveRes.json();
                } catch (e) {
                    console.error("Failed to parse archive:", e);
                }
            }

            // Calculate stats
            const projectsCount = Object.keys(projectsData.projects || {}).length;
            const activeIRs = irsData.irs?.length || 0;
            const completedIRs = irsData.irs?.filter(ir => ir.isDone)?.length || 0;
            const pendingIRs = activeIRs - completedIRs;
            const pendingRevisions = revsData.revs?.filter(rev => !rev.isDone)?.length || 0;
            const cprCount = irsData.irs?.filter(ir => ir.requestType === "CPR")?.length || 0;
            const totalRevs = revsData.revs?.length || 0;
            const completedRevs = revsData.revs?.filter(rev => rev.isDone)?.length || 0;
            const archiveTotal = archiveData.archive?.length || 0;

            setStats({
                users: usersData.users?.length || 0,
                projects: projectsCount,
                activeIRs,
                pendingRevisions,
                completedIRs,
                pendingIRs,
                archiveTotal,
                cprCount,
                totalRevs,
                completedRevs
            });

            // Load recent activity
            await loadRecentActivity(irsData, revsData);
            
            // Check system status
            await checkSystemStatus();
            
            setError("");
        } catch (err) {
            console.error("Error loading dashboard data:", err);
            setError("فشل في تحميل بيانات لوحة التحكم");
        } finally {
            setLoading(false);
        }
    }

    async function loadRecentActivity(irsData, revsData) {
        try {
            // If data not provided, fetch it
            if (!irsData || !revsData) {
                const [irsRes, revsRes] = await Promise.all([
                    fetch(`${API_URL}/irs`).catch(() => ({ ok: false })),
                    fetch(`${API_URL}/revs`).catch(() => ({ ok: false }))
                ]);

                if (irsRes.ok) irsData = await irsRes.json();
                if (revsRes.ok) revsData = await revsRes.json();
            }

            const allItems = [
                ...(irsData.irs || []).map(item => ({ 
                    ...item, 
                    type: 'IR', 
                    date: item.sentAt || item.createdAt || item.updatedAt,
                    shortId: item.irNo ? item.irNo.split('-').pop() : '',
                    user: item.user || 'Unknown',
                    project: item.project || 'Unknown',
                    department: item.department || 'Unknown',
                    title: `IR: ${item.irNo || ''}`
                })),
                ...(revsData.revs || []).map(item => ({ 
                    ...item, 
                    type: 'REV', 
                    date: item.sentAt || item.createdAt || item.updatedAt,
                    shortId: item.revNo ? item.revNo.split('-').pop() : '',
                    user: item.user || 'Unknown',
                    project: item.project || 'Unknown',
                    department: item.department || 'Unknown',
                    title: `Revision: ${item.revNo || ''}`
                }))
            ];

            // Sort by date (newest first) and take top 8
            const sorted = allItems
                .filter(item => item.date)
                .sort((a, b) => {
                    try {
                        return new Date(b.date).getTime() - new Date(a.date).getTime();
                    } catch {
                        return 0;
                    }
                })
                .slice(0, 8);

            setRecentActivity(sorted);
        } catch (err) {
            console.error("Error loading recent activity:", err);
        }
    }

    async function checkSystemStatus() {
        try {
            // Check database connection
            const dbCheck = await fetch(`${API_URL}/health`).catch(() => ({ ok: false }));
            const dbStatus = dbCheck.ok ? "online" : "offline";
            
            // Check API status
            const apiCheck = await fetch(`${API_URL}/projects`).catch(() => ({ ok: false }));
            const apiStatus = apiCheck.ok ? "online" : "offline";
            
            // Calculate uptime
            const startTime = localStorage.getItem('system_start_time') || Date.now();
            localStorage.setItem('system_start_time', startTime);
            
            const diff = Date.now() - parseInt(startTime);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const uptime = days > 0 ? `${days} يوم` : `${hours} ساعة`;

            setSystemStatus({
                database: dbStatus,
                api: apiStatus,
                uptime
            });
        } catch (err) {
            setSystemStatus({
                database: "offline",
                api: "offline",
                uptime: "0 يوم"
            });
        }
    }

    const quickStats = [
        {
            label: "إجمالي المستخدمين",
            value: stats.users,
            icon: "👥",
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            change: `مهندسين: ${userCounts.engineers}, DC: ${userCounts.dc}`,
            link: "#users"
        },
        {
            label: "المشاريع النشطة",
            value: stats.projects,
            icon: "📁",
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            change: "جميع المشاريع",
            link: "#projects"
        },
        {
            label: "طلبات IR معلقة",
            value: stats.pendingIRs,
            icon: "⏳",
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            change: `نسبة الإنجاز: ${stats.activeIRs > 0 ? Math.round((stats.completedIRs / stats.activeIRs) * 100) : 0}%`,
            link: "#dc"
        },
        {
            label: "مراجعات معلقة",
            value: stats.pendingRevisions,
            icon: "🔄",
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            change: `إجمالي المراجعات: ${stats.totalRevs}`,
            link: "#dc"
        },
        {
            label: "طلبات CPR",
            value: stats.cprCount,
            icon: "🏗️",
            color: "text-teal-600",
            bgColor: "bg-teal-50",
            change: "صب الخرسانة",
            link: "#engineer"
        },
        {
            label: "الأرشيف",
            value: stats.archiveTotal,
            icon: "🗄️",
            color: "text-indigo-600",
            bgColor: "bg-indigo-50",
            change: "العناصر المكتملة",
            link: "#dc"
        }
    ];

    const systemHealthItems = [
        {
            label: "قاعدة البيانات",
            status: systemStatus.database === "online" ? "متصل" : "غير متصل",
            color: systemStatus.database === "online" ? "text-green-600" : "text-red-600",
            icon: systemStatus.database === "online" ? "🟢" : "🔴",
            description: systemStatus.database === "online" ? "متصل ويعمل" : "مشاكل في الاتصال"
        },
        {
            label: "خادم API",
            status: systemStatus.api === "online" ? "متصل" : "غير متصل",
            color: systemStatus.api === "online" ? "text-green-600" : "text-red-600",
            icon: systemStatus.api === "online" ? "🟢" : "🔴",
            description: systemStatus.api === "online" ? "جميع النقاط الطرفية متاحة" : "بعض الخدمات غير متاحة"
        },
        {
            label: "وقت التشغيل",
            status: systemStatus.uptime,
            color: "text-blue-600",
            icon: "⏱️",
            description: "التشغيل المستمر"
        }
    ];

    const userDistribution = [
        {
            role: "مهندسين",
            count: userCounts.engineers,
            color: "bg-blue-500",
            percentage: stats.users > 0 ? Math.round((userCounts.engineers / stats.users) * 100) : 0
        },
        {
            role: "متحكم وثائق",
            count: userCounts.dc,
            color: "bg-amber-500",
            percentage: stats.users > 0 ? Math.round((userCounts.dc / stats.users) * 100) : 0
        },
        {
            role: "رؤساء أقسام",
            count: userCounts.heads,
            color: "bg-purple-500",
            percentage: stats.users > 0 ? Math.round((userCounts.heads / stats.users) * 100) : 0
        },
        {
            role: "مسؤولين",
            count: userCounts.admins,
            color: "bg-red-500",
            percentage: stats.users > 0 ? Math.round((userCounts.admins / stats.users) * 100) : 0
        }
    ];

    const departmentStats = [
        {
            dept: "إنشائي",
            count: stats.cprCount,
            icon: "🏗️",
            color: "bg-green-100 text-green-800"
        },
        {
            dept: "معماري",
            count: 0, // سيتم تحديثه من البيانات
            icon: "🏛️",
            color: "bg-blue-100 text-blue-800"
        },
        {
            dept: "كهرباء",
            count: 0,
            icon: "⚡",
            color: "bg-purple-100 text-purple-800"
        },
        {
            dept: "ميكانيكا",
            count: 0,
            icon: "🔧",
            color: "bg-amber-100 text-amber-800"
        }
    ];

    return (
        <div className="p-6">
            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-red-500 text-xl">⚠️</div>
                        <div>
                            <p className="font-medium text-red-700">{error}</p>
                            <p className="text-red-600 text-sm">تحقق من اتصالك وحاول مرة أخرى</p>
                        </div>
                    </div>
                    <button
                        onClick={loadDashboardData}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            )}

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">📊 نظرة عامة على النظام</h2>
                    <p className="text-gray-600">إحصائيات وأداء النظام في الوقت الفعلي</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadDashboardData}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className={`${loading ? 'animate-spin' : ''}`}>🔄</span>
                        {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
                    </button>
                    <div className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                        آخر تحديث: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {quickStats.map((stat, index) => (
                    <div
                        key={index}
                        className={`${stat.bgColor} rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-2xl">{stat.icon}</div>
                            <div className={`text-2xl font-bold ${stat.color}`}>
                                {stat.value}
                            </div>
                        </div>
                        <p className="text-gray-700 font-medium text-sm">{stat.label}</p>
                        <p className="text-gray-500 text-xs mt-1">
                            {stat.change}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* System Health */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-green-500">🏥</span> حالة النظام
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {systemHealthItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-2xl">{item.icon}</div>
                                        <div className={`text-lg font-bold ${item.color}`}>
                                            {item.status}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 font-medium text-sm">{item.label}</p>
                                    <p className="text-gray-500 text-xs mt-1">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                        
                        {/* Performance Metrics */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">مقاييس الأداء</h4>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>معدل إنجاز IR</span>
                                        <span>{stats.activeIRs > 0 ? Math.round((stats.completedIRs / stats.activeIRs) * 100) : 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-green-500 h-2 rounded-full" 
                                            style={{ width: `${stats.activeIRs > 0 ? Math.round((stats.completedIRs / stats.activeIRs) * 100) : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>معدل إنجاز المراجعات</span>
                                        <span>{stats.totalRevs > 0 ? Math.round((stats.completedRevs / stats.totalRevs) * 100) : 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-blue-500 h-2 rounded-full" 
                                            style={{ width: `${stats.totalRevs > 0 ? Math.round((stats.completedRevs / stats.totalRevs) * 100) : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Distribution */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-blue-500">👥</span> توزيع المستخدمين
                    </h3>
                    <div className="space-y-4">
                        {userDistribution.map((item, index) => (
                            <div key={index}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-700">{item.role}</span>
                                    <span className="text-sm font-medium text-gray-800">{item.count} ({item.percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className={`${item.color} h-2 rounded-full`}
                                        style={{ width: `${item.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Total Users */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-gray-800">{stats.users}</div>
                            <div className="text-sm text-gray-600">إجمالي المستخدمين</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity & Quick Links */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-amber-500">📋</span> النشاط الحديث
                        </h3>
                        <span className="text-sm text-gray-500">آخر 8 أنشطة</span>
                    </div>
                    
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((item, index) => (
                                <div 
                                    key={index} 
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        item.type === 'IR' ? 'bg-blue-100 text-blue-600' :
                                        'bg-amber-100 text-amber-600'
                                    }`}>
                                        {item.type === 'IR' ? '📝' : '🔄'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-800 truncate">
                                            {item.title}
                                        </div>
                                        <div className="text-sm text-gray-500 truncate">
                                            {item.project} • {item.user} • {item.department}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 whitespace-nowrap">
                                        {item.date ? new Date(item.date).toLocaleTimeString('ar-EG', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        }) : 'N/A'}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-2">📭</div>
                                لا يوجد نشاط حديث
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl p-5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold">⚡ روابط سريعة</h3>
                        <div className="text-sm bg-white/10 px-3 py-1 rounded-full">
                            أدوات المسؤول
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <Link 
                            to="#users" 
                            className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                👥
                            </div>
                            <div>
                                <p className="font-medium">إدارة المستخدمين</p>
                                <p className="text-sm text-slate-300">إضافة، تعديل، حذف المستخدمين</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="#projects" 
                            className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                📁
                            </div>
                            <div>
                                <p className="font-medium">إدارة المشاريع</p>
                                <p className="text-sm text-slate-300">التحكم في المشاريع والعدادات</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="#data" 
                            className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                🗃️
                            </div>
                            <div>
                                <p className="font-medium">إدارة البيانات</p>
                                <p className="text-sm text-slate-300">تعديل location_rules و general_descriptions</p>
                            </div>
                        </Link>
                        
                        <Link 
                            to="#tools" 
                            className="block p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                🛠️
                            </div>
                            <div>
                                <p className="font-medium">أدوات النظام</p>
                                <p className="text-sm text-slate-300">نسخ احتياطي، إصلاح بيانات، إحصائيات متقدمة</p>
                            </div>
                        </Link>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="text-center">
                            <p className="text-sm text-slate-300">وقت الخادم</p>
                            <p className="font-bold text-lg">{new Date().toLocaleTimeString('ar-EG')}</p>
                            <p className="text-sm text-slate-400 mt-1">{new Date().toLocaleDateString('ar-EG')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="text-blue-600 text-2xl">📈</div>
                        <div>
                            <p className="text-sm text-blue-700 font-medium">نشاط اليوم</p>
                            <p className="text-2xl font-bold text-blue-800">
                                {recentActivity.filter(item => {
                                    const itemDate = new Date(item.date);
                                    const today = new Date();
                                    return itemDate.toDateString() === today.toDateString();
                                }).length}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="text-green-600 text-2xl">✅</div>
                        <div>
                            <p className="text-sm text-green-700 font-medium">مكتمل هذا الشهر</p>
                            <p className="text-2xl font-bold text-green-800">
                                {stats.completedIRs + stats.completedRevs}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="text-purple-600 text-2xl">⏳</div>
                        <div>
                            <p className="text-sm text-purple-700 font-medium">قيد الانتظار</p>
                            <p className="text-2xl font-bold text-purple-800">
                                {stats.pendingIRs + stats.pendingRevisions}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}