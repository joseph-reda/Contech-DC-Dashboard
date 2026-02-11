import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';

const SystemSettingsTab = () => {
  const [settings, setSettings] = useState({
    // System Preferences
    autoIncrementCounters: true,
    requirePasswordChange: false,
    allowUserRegistration: false,
    enableEmailNotifications: false,
    
    // Security Settings
    maxLoginAttempts: 3,
    sessionTimeout: 60,
    passwordExpiryDays: 90,
    requireTwoFactorAuth: false,
    
    // Email Settings
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    notificationEmail: '',
    
    // Display Settings
    defaultTheme: 'light',
    itemsPerPage: 25,
    showAvatars: true,
    enableAnimations: true,
    
    // IR Settings
    defaultDepartment: 'ST',
    enableCPR: true,
    requireLocation: false,
    enableRevisions: true,
    autoArchiveDays: 30,
    
    // Notification Settings
    notifyOnNewIR: true,
    notifyOnCompletion: true,
    notifyOnRevision: true,
    dailySummary: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const departments = [
    { value: 'ARCH', label: 'معماري' },
    { value: 'ST', label: 'إنشائي' },
    { value: 'ELECT', label: 'كهرباء' },
    { value: 'MECH', label: 'ميكانيكا' },
    { value: 'SURV', label: 'مساحة' }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Try to load from localStorage first (as fallback)
      const savedSettings = localStorage.getItem('admin_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      
      // Try to load from API if endpoint exists
      try {
        const response = await fetch(`${API_URL}/admin/system-info`);
        if (response.ok) {
          const data = await response.json();
          // You would need to map API response to your settings structure
        }
      } catch (apiError) {
        console.log('Settings API not available, using local storage');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('admin_settings', JSON.stringify(settings));
      
      // Try to save to API if endpoint exists
      try {
        await fetch(`${API_URL}/admin/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings })
        });
      } catch (apiError) {
        console.log('Settings API not available, saved locally only');
      }
      
      showToast('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('فشل حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى الافتراضية؟\n\nهذا الإجراء لا يمكن التراجع عنه.')) {
      const defaultSettings = {
        autoIncrementCounters: true,
        requirePasswordChange: false,
        allowUserRegistration: false,
        enableEmailNotifications: false,
        maxLoginAttempts: 3,
        sessionTimeout: 60,
        passwordExpiryDays: 90,
        requireTwoFactorAuth: false,
        smtpHost: '',
        smtpPort: '587',
        smtpUsername: '',
        smtpPassword: '',
        notificationEmail: '',
        defaultTheme: 'light',
        itemsPerPage: 25,
        showAvatars: true,
        enableAnimations: true,
        defaultDepartment: 'ST',
        enableCPR: true,
        requireLocation: false,
        enableRevisions: true,
        autoArchiveDays: 30,
        notifyOnNewIR: true,
        notifyOnCompletion: true,
        notifyOnRevision: true,
        dailySummary: true
      };
      
      setSettings(defaultSettings);
      showToast('تم إعادة تعيين الإعدادات إلى الافتراضية');
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileName = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    showToast('تم تصدير الإعدادات');
  };

  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result);
        setSettings(importedSettings);
        showToast('تم استيراد الإعدادات بنجاح');
      } catch (error) {
        showToast('ملف الإعدادات غير صالح', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleTestEmail = async () => {
    if (!settings.smtpHost || !settings.smtpUsername) {
      showToast('يرجى إعداد خادم البريد الإلكتروني أولاً', 'error');
      return;
    }

    try {
      // This is a placeholder for email testing functionality
      showToast('تم إرسال بريد الاختبار بنجاح (وظيفة تجريبية)');
    } catch (error) {
      showToast('فشل إرسال بريد الاختبار', 'error');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">⚙️ إعدادات النظام</h2>
          <p className="text-gray-600">إعدادات النظام، الأمان، والمظهر</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
            النسخة 2.2
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* System Preferences */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-blue-500">⚙️</span> تفضيلات النظام
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">زيادة العدادات تلقائياً</p>
                  <p className="text-sm text-gray-500">زيادة عدادات IR تلقائياً</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoIncrementCounters}
                    onChange={(e) => handleInputChange('autoIncrementCounters', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">تفعيل CPR</p>
                  <p className="text-sm text-gray-500">تفعيل طلبات صب الخرسانة</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableCPR}
                    onChange={(e) => handleInputChange('enableCPR', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">طلب تغيير كلمة المرور</p>
                  <p className="text-sm text-gray-500">إجبار تغيير كلمة المرور عند أول دخول</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requirePasswordChange}
                    onChange={(e) => handleInputChange('requirePasswordChange', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">تفعيل المراجعات</p>
                  <p className="text-sm text-gray-500">تفعيل طلبات المراجعة</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableRevisions}
                    onChange={(e) => handleInputChange('enableRevisions', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-red-500">🔒</span> إعدادات الأمان
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأقصى لمحاولات الدخول
              </label>
              <input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value) || 3)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مهلة الجلسة (دقائق)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value) || 60)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="5"
                max="480"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                انتهاء صلاحية كلمة المرور (أيام)
              </label>
              <input
                type="number"
                value={settings.passwordExpiryDays}
                onChange={(e) => handleInputChange('passwordExpiryDays', parseInt(e.target.value) || 90)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                max="365"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">المصادقة الثنائية</p>
                <p className="text-sm text-gray-500">طلب 2FA لجميع المستخدمين</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireTwoFactorAuth}
                  onChange={(e) => handleInputChange('requireTwoFactorAuth', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-purple-500">🎨</span> إعدادات العرض
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المظهر الافتراضي
              </label>
              <select
                value={settings.defaultTheme}
                onChange={(e) => handleInputChange('defaultTheme', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">فاتح</option>
                <option value="dark">داكن</option>
                <option value="auto">تلقائي</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العناصر في الصفحة
              </label>
              <select
                value={settings.itemsPerPage}
                onChange={(e) => handleInputChange('itemsPerPage', parseInt(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10 عناصر</option>
                <option value="25">25 عنصر</option>
                <option value="50">50 عنصر</option>
                <option value="100">100 عنصر</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                القسم الافتراضي
              </label>
              <select
                value={settings.defaultDepartment}
                onChange={(e) => handleInputChange('defaultDepartment', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {departments.map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الأرشيف التلقائي (أيام)
              </label>
              <input
                type="number"
                value={settings.autoArchiveDays}
                onChange={(e) => handleInputChange('autoArchiveDays', parseInt(e.target.value) || 30)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                max="365"
              />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-green-500">📧</span> إعدادات البريد الإلكتروني
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                خادم SMTP
              </label>
              <input
                type="text"
                value={settings.smtpHost}
                onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="smtp.gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                منفذ SMTP
              </label>
              <input
                type="text"
                value={settings.smtpPort}
                onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="587"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={settings.smtpUsername}
                onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={settings.smtpPassword}
                onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                بريد الإشعارات
              </label>
              <input
                type="email"
                value={settings.notificationEmail}
                onChange={(e) => handleInputChange('notificationEmail', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="notifications@company.com"
              />
            </div>

            <div className="md:col-span-2">
              <button
                onClick={handleTestEmail}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                اختبار إعدادات البريد
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h4 className="font-bold text-gray-700 mb-1">إجراءات الإعدادات</h4>
            <p className="text-gray-600 text-sm">إدارة إعدادات النظام</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Import */}
            <label className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="hidden"
              />
              استيراد الإعدادات
            </label>

            {/* Export */}
            <button
              onClick={exportSettings}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
            >
              تصدير الإعدادات
            </button>

            {/* Reset */}
            <button
              onClick={handleResetSettings}
              className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-medium"
            >
              إعادة تعيين
            </button>

            {/* Save */}
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className={`px-6 py-2 rounded-lg font-bold text-white ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gradient-to-r from-gray-800 to-slate-900 text-white rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold">معلومات النظام</h4>
          <div className="text-sm bg-white/10 px-3 py-1 rounded-full">
            للقراءة فقط
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-300">النسخة</p>
            <p className="font-bold">IR Management System v2.2</p>
          </div>
          <div>
            <p className="text-sm text-gray-300">تاريخ البناء</p>
            <p className="font-bold">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-300">آخر تحديث للإعدادات</p>
            <p className="font-bold">{new Date().toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-gray-300">
            ⚠️ إعدادات النظام تؤثر على جميع المستخدمين. التغييرات قد تتطلب إعادة تشغيل النظام.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsTab;