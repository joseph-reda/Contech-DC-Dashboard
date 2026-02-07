import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';

const SystemToolsTab = () => {
  const [tools, setTools] = useState({
    dataMigration: { status: 'idle', progress: 0 },
    databaseBackup: { status: 'idle', progress: 0 },
    cacheClear: { status: 'idle', progress: 0 },
    logsCleanup: { status: 'idle', progress: 0 }
  });

  const [systemInfo, setSystemInfo] = useState({
    database: 'online',
    api: 'online',
    uptime: '0 days',
    memoryUsage: '0 MB',
    diskUsage: '0 GB'
  });

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    loadSystemInfo();
    loadRecentLogs();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(prev => ({
          ...prev,
          database: data.database === 'connected' ? 'online' : 'offline',
          api: data.api === 'online' ? 'online' : 'offline',
          uptime: data.timestamp ? 'Active' : 'Unknown'
        }));
      }
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  const loadRecentLogs = async () => {
    try {
      // This would be from your actual logs endpoint
      // For now, using mock data
      const mockLogs = [
        { id: 1, message: 'تم إنشاء مشروع جديد: D6-A1', type: 'info', timestamp: new Date().toISOString() },
        { id: 2, message: 'تم إنشاء IR: BADYA-CON-D6-A1-IR-ARCH-001', type: 'success', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, message: 'مستخدم قام بتسجيل الدخول: engineer1', type: 'info', timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id: 4, message: 'فشل محاولة دخول للمستخدم: unknown', type: 'warning', timestamp: new Date(Date.now() - 10800000).toISOString() },
        { id: 5, message: 'تم أرشفة IR: BADYA-CON-D1-A2-IR-ST-045', type: 'info', timestamp: new Date(Date.now() - 14400000).toISOString() }
      ];
      setLogs(mockLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const runTool = async (toolName) => {
    setTools(prev => ({
      ...prev,
      [toolName]: { ...prev[toolName], status: 'running', progress: 0 }
    }));

    setLoading(true);

    // Simulate tool execution
    const interval = setInterval(() => {
      setTools(prev => {
        const currentProgress = prev[toolName].progress;
        if (currentProgress >= 100) {
          clearInterval(interval);
          return {
            ...prev,
            [toolName]: { status: 'completed', progress: 100 }
          };
        }
        return {
          ...prev,
          [toolName]: { ...prev[toolName], progress: currentProgress + 10 }
        };
      });
    }, 200);

    // Simulate API call
    setTimeout(() => {
      clearInterval(interval);
      setTools(prev => ({
        ...prev,
        [toolName]: { status: 'completed', progress: 100 }
      }));
      setLoading(false);
      
      // Show appropriate message based on tool
      const messages = {
        dataMigration: 'تم ترحيل البيانات بنجاح',
        databaseBackup: 'تم إنشاء نسخة احتياطية',
        cacheClear: 'تم مسح الذاكرة المؤقتة',
        logsCleanup: 'تم تنظيف السجلات'
      };
      
      showToast(messages[toolName] || 'تم تنفيذ الأداة بنجاح');
      
      // Reset status after 5 seconds
      setTimeout(() => {
        setTools(prev => ({
          ...prev,
          [toolName]: { status: 'idle', progress: 0 }
        }));
      }, 5000);
    }, 2000);
  };

  const exportData = async (dataType) => {
    try {
      let endpoint = '';
      let filename = '';
      
      switch(dataType) {
        case 'users':
          endpoint = `${API_URL}/users`;
          filename = `users-export-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'projects':
          endpoint = `${API_URL}/projects`;
          filename = `projects-export-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'irs':
          endpoint = `${API_URL}/irs`;
          filename = `irs-export-${new Date().toISOString().split('T')[0]}.json`;
          break;
        default:
          return;
      }
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', filename);
        linkElement.click();
        
        showToast(`تم تصدير ${dataType}`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast('فشل تصدير البيانات', 'error');
    }
  };

  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    showToast('تم مسح الذاكرة المؤقتة بنجاح');
  };

  const restartServices = async () => {
    if (!window.confirm('هل أنت متأكد من إعادة تشغيل خدمات النظام؟\n\nهذا الإجراء قد يوقف النظام مؤقتاً.')) {
      return;
    }

    try {
      // This would be a call to your server restart endpoint
      showToast('تم طلب إعادة تشغيل الخدمات', 'info');
    } catch (error) {
      console.error('Error restarting services:', error);
      showToast('فشل إعادة تشغيل الخدمات', 'error');
    }
  };

  const toolConfigs = [
    {
      id: 'dataMigration',
      name: 'ترحيل البيانات',
      description: 'ترحيل البيانات من الهياكل القديمة إلى الجديدة',
      icon: '🔄',
      color: 'bg-blue-500',
      action: () => runTool('dataMigration')
    },
    {
      id: 'databaseBackup',
      name: 'نسخ احتياطي للقاعدة',
      description: 'إنشاء نسخة احتياطية كاملة للبيانات',
      icon: '💾',
      color: 'bg-green-500',
      action: () => runTool('databaseBackup')
    },
    {
      id: 'cacheClear',
      name: 'مسح الذاكرة المؤقتة',
      description: 'مسح جميع البيانات المخزنة مؤقتاً',
      icon: '🧹',
      color: 'bg-purple-500',
      action: () => runTool('cacheClear')
    },
    {
      id: 'logsCleanup',
      name: 'تنظيف السجلات',
      description: 'حذف السجلات القديمة وتنظيمها',
      icon: '📋',
      color: 'bg-amber-500',
      action: () => runTool('logsCleanup')
    }
  ];

  const exportConfigs = [
    {
      type: 'users',
      name: 'تصدير المستخدمين',
      icon: '👥',
      description: 'جميع بيانات المستخدمين',
      action: () => exportData('users')
    },
    {
      type: 'projects',
      name: 'تصدير المشاريع',
      icon: '📁',
      description: 'جميع بيانات المشاريع',
      action: () => exportData('projects')
    },
    {
      type: 'irs',
      name: 'تصدير IRs',
      icon: '📝',
      description: 'جميع طلبات التفتيش',
      action: () => exportData('irs')
    }
  ];

  const systemActions = [
    {
      name: 'مسح الذاكرة المؤقتة',
      icon: '🧹',
      description: 'مسح جميع بيانات المتصفح المخزنة مؤقتاً',
      action: clearCache,
      color: 'bg-purple-100 text-purple-700'
    },
    {
      name: 'إعادة تشغيل الخدمات',
      icon: '🔄',
      description: 'إعادة تشغيل خدمات النظام',
      action: restartServices,
      color: 'bg-red-100 text-red-700'
    },
    {
      name: 'تحقق من التحديثات',
      icon: '🔄',
      description: 'التحقق من وجود تحديثات للنظام',
      action: () => showToast('جاري التحقق من التحديثات...', 'info'),
      color: 'bg-blue-100 text-blue-700'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast.show && (
        <div className={`rounded-lg p-4 mb-4 ${toast.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? '❌' : '✅'}
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🔧 أدوات النظام</h2>
          <p className="text-gray-600">أدوات متقدمة لإدارة وصيانة النظام</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSystemInfo}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
          >
            تحديث الحالة
          </button>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
            أدوات إدارية
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 حالة النظام</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: 'قاعدة البيانات', value: systemInfo.database, color: systemInfo.database === 'online' ? 'text-green-600' : 'text-red-600', icon: '🗄️' },
            { label: 'API الخادم', value: systemInfo.api, color: systemInfo.api === 'online' ? 'text-green-600' : 'text-red-600', icon: '⚡' },
            { label: 'مدة التشغيل', value: systemInfo.uptime, color: 'text-blue-600', icon: '⏱️' },
            { label: 'استخدام الذاكرة', value: systemInfo.memoryUsage, color: 'text-purple-600', icon: '🧠' },
            { label: 'استخدام القرص', value: systemInfo.diskUsage, color: 'text-amber-600', icon: '💾' }
          ].map((item, index) => (
            <div key={index} className="border rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-sm text-gray-600 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Tools */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🛠️ أدوات النظام</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {toolConfigs.map(tool => {
            const toolStatus = tools[tool.id];
            
            return (
              <div key={tool.id} className="border rounded-lg p-4">
                <div className={`w-12 h-12 rounded-full ${tool.color} flex items-center justify-center text-white text-2xl mb-4`}>
                  {tool.icon}
                </div>
                
                <h4 className="font-bold text-gray-800 mb-2">{tool.name}</h4>
                <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
                
                {/* Progress Bar */}
                {toolStatus.status === 'running' && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${toolStatus.progress}%` }}
                    ></div>
                  </div>
                )}
                
                <button
                  onClick={tool.action}
                  disabled={loading || toolStatus.status === 'running'}
                  className={`w-full py-2 rounded-lg font-medium ${
                    toolStatus.status === 'running'
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : toolStatus.status === 'completed'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {toolStatus.status === 'idle' && 'تشغيل'}
                  {toolStatus.status === 'running' && `جاري التشغيل ${toolStatus.progress}%`}
                  {toolStatus.status === 'completed' && 'تم التشغيل ✓'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Tools */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📤 أدوات التصدير</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exportConfigs.map(config => (
            <div key={config.type} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">{config.icon}</div>
                <div>
                  <h4 className="font-bold text-gray-800">{config.name}</h4>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>
              </div>
              <button
                onClick={config.action}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                تصدير البيانات
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* System Actions */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ إجراءات النظام</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {systemActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`p-4 rounded-lg text-left transition ${action.color} hover:opacity-90`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">{action.icon}</div>
                <div>
                  <h4 className="font-bold">{action.name}</h4>
                  <p className="text-sm opacity-80">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">📋 سجلات النظام</h3>
          <button
            onClick={loadRecentLogs}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm"
          >
            تحديث السجلات
          </button>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد سجلات حالياً
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  log.type === 'success' ? 'bg-green-100 text-green-600' :
                  log.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {log.type === 'success' ? '✓' : log.type === 'warning' ? '⚠️' : 'ℹ️'}
                </div>
                <div className="flex-1">
                  <p className="text-gray-800">{log.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="text-amber-600 text-2xl">⚠️</div>
          <div>
            <h4 className="font-bold text-amber-800 mb-2">تحذير: أدوات متقدمة</h4>
            <p className="text-amber-700">
              هذه الأدوات للمسؤولين المتمرسين فقط. تأكد من فهمك لعواقب كل إجراء قبل تنفيذه.
              بعض الإجراءات قد تؤثر على عمل النظام وتتطلب تدخلاً يدوياً للإصلاح.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemToolsTab;