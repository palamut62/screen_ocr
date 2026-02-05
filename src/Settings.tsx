import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface SettingsData {
    language: string
    uiLanguage: 'system' | 'en' | 'tr'
    shortcut: string
    autoSave: boolean
    saveDirectory: string
    autoStart: boolean
    autoDetectLanguage: boolean
    theme: 'dark' | 'light'
    translateEnabled: boolean
    translateTarget: string
    showEditWindow: boolean
}

const translateLanguages = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
]

const languages = [
    { code: 'tur', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'eng', name: 'English', flag: '🇬🇧' },
    { code: 'deu', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fra', name: 'Français', flag: '🇫🇷' },
    { code: 'spa', name: 'Español', flag: '🇪🇸' },
    { code: 'rus', name: 'Русский', flag: '🇷🇺' },
    { code: 'eng+tur', name: 'English + Türkçe', flag: '🌐' },
]

const shortcutsList = [
    { label: 'Ctrl+Shift+O', value: 'CommandOrControl+Shift+O' },
    { label: 'Ctrl+Shift+S', value: 'CommandOrControl+Shift+S' },
    { label: 'Ctrl+Shift+C', value: 'CommandOrControl+Shift+C' },
    { label: 'Ctrl+Alt+O', value: 'CommandOrControl+Alt+O' },
    { label: 'Ctrl+Alt+S', value: 'CommandOrControl+Alt+S' },
    { label: 'Print Screen', value: 'PrintScreen' },
]

// Comfortable Toggle
const Toggle = ({ checked, onChange, label, subLabel, isDark }: { checked: boolean, onChange: (val: boolean) => void, label: string, subLabel?: string, isDark: boolean }) => (
    <div className="flex items-center justify-between py-3 group cursor-pointer" onClick={() => onChange(!checked)}>
        <div className="flex flex-col">
            <span className={`text-xs font-medium transition-colors ${isDark ? 'text-white/90 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>{label}</span>
            {subLabel && <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-0.5">{subLabel}</span>}
        </div>
        <div className={`w-10 h-6 rounded-full transition-all duration-300 relative ${checked ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : (isDark ? 'bg-white/10' : 'bg-slate-200')}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
        </div>
    </div>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 mt-4 px-1">{children}</h3>
)

export default function Settings() {
    const { t, i18n } = useTranslation()
    const [settings, setSettings] = useState<SettingsData>({
        language: 'eng+tur',
        uiLanguage: 'system',
        shortcut: 'CommandOrControl+Shift+O',
        autoSave: false,
        saveDirectory: '',
        autoStart: false,
        autoDetectLanguage: false,
        theme: 'dark',
        translateEnabled: false,
        translateTarget: 'tr',
        showEditWindow: false
    })
    const [saved, setSaved] = useState(false)
    const [activeTab, setActiveTab] = useState<'ocr' | 'general' | 'shortcuts'>('ocr')

    const isDark = settings.theme === 'dark'

    useEffect(() => {
        // Change language when settings change
        if (settings.uiLanguage === 'system') {
            i18n.changeLanguage(navigator.language)
        } else {
            i18n.changeLanguage(settings.uiLanguage)
        }
    }, [settings.uiLanguage, i18n])

    useEffect(() => {
        window.ipcRenderer.invoke('get-settings').then((data: SettingsData) => {
            setSettings(data)
        })
    }, [])

    const handleSave = () => {
        window.ipcRenderer.send('save-settings', settings)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const handleChooseDirectory = async () => {
        const dir = await window.ipcRenderer.invoke('choose-directory')
        if (dir) setSettings({ ...settings, saveDirectory: dir })
    }

    const handleOpenDirectory = () => {
        window.ipcRenderer.send('open-directory', settings.saveDirectory)
    }

    const handleClose = () => {
        window.ipcRenderer.send('close-settings')
    }

    return (
        <div className={`w-screen h-screen font-sans overflow-hidden flex flex-col drag transition-colors duration-300 ${isDark ? 'bg-[#1e1e1e] text-slate-200' : 'bg-[#ffffff] text-slate-800'}`}>
            {/* Minimal Header */}
            <div className={`h-12 px-6 flex items-center justify-between border-b backdrop-blur-xl z-20 shrink-0 ${isDark ? 'border-[#2b2b2b] bg-[#252526]' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                    <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white/90' : 'text-slate-900'}`}>{t('settings.title')}<span className="text-indigo-400 font-normal opacity-80">OCR</span></span>
                </div>
                <button
                    onClick={handleClose}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors no-drag ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-y-auto overflow-x-hidden no-drag ${isDark ? 'bg-[#1e1e1e]' : 'bg-gradient-to-b from-white to-slate-50'}`}>
                <div className="max-w-xl mx-auto p-6 pb-20 animate-in">

                    {/* Comfortable Tabs */}
                    <div className={`flex gap-8 border-b mb-6 ${isDark ? 'border-[#3e3e3e]' : 'border-slate-200'}`}>
                        {['ocr', 'general', 'shortcuts'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`pb-3 text-[11px] font-bold uppercase tracking-widest transition-all relative ${activeTab === tab
                                    ? (isDark ? 'text-white' : 'text-indigo-600')
                                    : 'text-slate-500 hover:text-slate-400'
                                    }`}
                            >
                                {t(`settings.tabs.${tab}`)}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'ocr' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {languages.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setSettings({ ...settings, language: lang.code })}
                                        disabled={settings.autoDetectLanguage}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left group ${settings.language === lang.code && !settings.autoDetectLanguage
                                            ? (isDark ? 'bg-indigo-500/10 border-indigo-500/50 text-white' : 'bg-indigo-50 border-indigo-200 text-indigo-900')
                                            : (isDark ? 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04] hover:border-white/10' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50')
                                            } ${settings.autoDetectLanguage ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="text-xl filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">{lang.flag}</span>
                                        <span className={`text-xs font-semibold ${isDark || settings.language === lang.code ? '' : 'text-slate-600'}`}>{lang.name}</span>
                                    </button>
                                ))}
                            </div>

                            <Toggle
                                label={t('settings.labels.autoDetect')}
                                subLabel={t('settings.labels.autoDetectSub')}
                                checked={settings.autoDetectLanguage}
                                onChange={(c) => setSettings({ ...settings, autoDetectLanguage: c })}
                                isDark={isDark}
                            />

                            <SectionTitle>{t('settings.sections.translation')}</SectionTitle>

                            <Toggle
                                label={t('settings.labels.autoTranslate')}
                                subLabel={t('settings.labels.autoTranslateSub')}
                                checked={settings.translateEnabled}
                                onChange={(c) => setSettings({ ...settings, translateEnabled: c })}
                                isDark={isDark}
                            />

                            {settings.translateEnabled && (
                                <div className="mt-4 mb-6 pl-4 border-l-2 border-indigo-500/30 animate-in">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">{t('settings.labels.targetLanguage')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {translateLanguages.map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => setSettings({ ...settings, translateTarget: lang.code })}
                                                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide border transition-all ${settings.translateTarget === lang.code
                                                    ? 'bg-indigo-500 text-white border-indigo-500'
                                                    : (isDark ? 'bg-transparent text-slate-400 border-white/10 hover:border-white/30' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')
                                                    }`}
                                            >
                                                {lang.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'general' && (
                        <div className="space-y-2">
                            {/* Theme Toggle Button */}
                            <div className={`flex items-center justify-between p-1 rounded-full mb-6 relative w-32 mx-auto ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>
                                <button
                                    onClick={() => setSettings({ ...settings, theme: 'light' })}
                                    className={`flex-1 p-2 rounded-full flex items-center justify-center transition-all ${settings.theme === 'light' ? 'bg-white shadow text-indigo-500' : 'text-slate-400 hover:text-slate-500'}`}
                                >
                                    <span className="text-sm">☀️</span>
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, theme: 'dark' })}
                                    className={`flex-1 p-2 rounded-full flex items-center justify-center transition-all ${settings.theme === 'dark' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-slate-500'}`}
                                >
                                    <span className="text-sm">🌙</span>
                                </button>
                            </div>

                            <SectionTitle>{t('settings.sections.application')}</SectionTitle>

                            {/* Interface Language Selector */}
                            <div className={`mt-2 mb-4 p-4 rounded-lg border flex items-center justify-between group transition-all ${isDark ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                <div className="flex-1 truncate mr-4">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">{t('settings.labels.interfaceLanguage')}</div>
                                    <div className={`text-xs font-mono truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {t(`languages.${settings.uiLanguage}`)}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {['system', 'en', 'tr'].map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setSettings({ ...settings, uiLanguage: lang as any })}
                                            className={`px-3 py-2 rounded text-[10px] font-bold transition-colors ${settings.uiLanguage === lang
                                                ? 'bg-indigo-500 text-white'
                                                : (isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600')
                                                }`}
                                        >
                                            {lang === 'system' ? 'AUTO' : lang.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Toggle
                                label={t('settings.labels.editWindow')}
                                subLabel={t('settings.labels.editWindowSub')}
                                checked={settings.showEditWindow}
                                onChange={(c) => setSettings({ ...settings, showEditWindow: c })}
                                isDark={isDark}
                            />

                            <Toggle
                                label={t('settings.labels.autoSave')}
                                subLabel={t('settings.labels.autoSaveSub')}
                                checked={settings.autoSave}
                                onChange={(c) => setSettings({ ...settings, autoSave: c })}
                                isDark={isDark}
                            />

                            {settings.autoSave && (
                                <div className={`mt-2 mb-4 p-4 rounded-lg border flex items-center justify-between group transition-all ${isDark ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                    <div className="flex-1 truncate mr-4">
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">{t('settings.labels.saveLocation')}</div>
                                        <div className={`text-xs font-mono truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{settings.saveDirectory || t('settings.actions.notSelected')}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleOpenDirectory} className={`px-3 py-2 rounded text-[10px] font-bold transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{t('settings.actions.open')}</button>
                                        <button onClick={handleChooseDirectory} className={`px-3 py-2 rounded text-[10px] font-bold transition-colors ${isDark ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600'}`}>{t('settings.actions.change')}</button>
                                    </div>
                                </div>
                            )}

                            <SectionTitle>{t('settings.sections.system')}</SectionTitle>
                            <Toggle
                                label={t('settings.labels.runAtStartup')}
                                subLabel={t('settings.labels.runAtStartupSub')}
                                checked={settings.autoStart}
                                onChange={(c) => setSettings({ ...settings, autoStart: c })}
                                isDark={isDark}
                            />
                        </div>
                    )}

                    {activeTab === 'shortcuts' && (
                        <div className="space-y-6">
                            <SectionTitle>{t('settings.sections.captureShortcut')}</SectionTitle>
                            <div className="grid grid-cols-1 gap-3">
                                {shortcutsList.map(sc => (
                                    <button
                                        key={sc.value}
                                        onClick={() => setSettings({ ...settings, shortcut: sc.value })}
                                        className={`flex items-center justify-between p-4 rounded-lg border transition-all group ${settings.shortcut === sc.value
                                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                                            : (isDark ? 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04] hover:border-white/10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')
                                            }`}
                                    >
                                        <span className="text-sm font-bold tracking-wider">{sc.label}</span>
                                        {settings.shortcut === sc.value && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
                                    </button>
                                ))}
                            </div>

                            <SectionTitle>{t('settings.sections.otherShortcuts')}</SectionTitle>
                            <div className="space-y-0.5">
                                {[
                                    { label: t('settings.shortcuts.readQr'), key: 'CTRL+SHIFT+Q' },
                                    { label: t('settings.shortcuts.captureTable'), key: 'CTRL+SHIFT+T' },
                                    { label: t('settings.shortcuts.readHandwriting'), key: 'CTRL+SHIFT+H' },
                                    { label: t('settings.shortcuts.magnifier'), key: 'M' },
                                    { label: t('settings.shortcuts.exit'), key: 'ESC' }
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center justify-between py-3 border-b last:border-0 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                        <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.label}</span>
                                        <kbd className={`px-2 py-1 rounded text-[10px] font-mono border ${isDark ? 'bg-white/5 text-indigo-300 border-white/10' : 'bg-slate-50 text-indigo-600 border-slate-200'}`}>{item.key}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Footer */}
            <div className={`p-4 border-t flex items-center justify-between no-drag transition-all duration-500 ${isDark ? 'bg-[#1e1e1e] border-[#2b2b2b]' : 'bg-white border-slate-200'} ${saved ? (isDark ? 'bg-emerald-950/30' : 'bg-emerald-50') : ''}`}>
                <div className={`text-[10px] font-medium ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    {saved ? <span className="text-emerald-500 animate-pulse">✓ {t('settings.actions.saved')}</span> : t('settings.actions.waiting')}
                </div>
                <button
                    onClick={handleSave}
                    className={`px-8 py-3 rounded text-xs font-bold tracking-widest uppercase transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${saved
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                        : (isDark ? 'bg-white text-black hover:bg-indigo-50 shadow-white/10' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10')
                        }`}
                >
                    {saved ? t('settings.actions.saved') : t('settings.actions.save')}
                </button>
            </div>
        </div>
    )
}
