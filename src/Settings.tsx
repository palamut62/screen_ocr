import { useState, useEffect } from 'react'

interface SettingsData {
    language: string
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

export default function Settings() {
    const [settings, setSettings] = useState<SettingsData>({
        language: 'eng+tur',
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
    const [activeTab, setActiveTab] = useState<'general' | 'shortcuts'>('general')

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
        if (dir) {
            setSettings({ ...settings, saveDirectory: dir })
        }
    }

    const handleOpenDirectory = () => {
        window.ipcRenderer.send('open-directory', settings.saveDirectory)
    }

    const handleClose = () => {
        window.ipcRenderer.send('close-settings')
    }

    const isDark = settings.theme === 'dark'

    return (
        <div className={`h-screen w-screen p-6 font-sans selection:bg-indigo-500/30 overflow-y-auto overflow-x-hidden drag transition-colors ${isDark ? 'bg-[#0f172a] text-slate-200' : 'bg-gray-100 text-gray-800'}`}>
            <div className="max-w-xl mx-auto animate-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className={`text-xl font-black tracking-tight mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Screen <span className="text-indigo-500">OCR</span>
                        </h1>
                        <p className={`text-[10px] font-medium uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Arayüz Ayarları</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className={`w-8 h-8 flex items-center justify-center rounded-none border transition-all group no-drag ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-200 hover:bg-gray-300 border-gray-300'}`}
                    >
                        <span className={`group-hover:scale-110 transition-transform text-xs ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'}`}>✕</span>
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className={`flex backdrop-blur-xl rounded-none border mb-4 no-drag ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-gray-200'}`}>
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-2 text-xs font-bold rounded-none transition-all ${activeTab === 'general'
                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                            : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        GENEL
                    </button>
                    <button
                        onClick={() => setActiveTab('shortcuts')}
                        className={`flex-1 py-2 text-xs font-bold rounded-none transition-all ${activeTab === 'shortcuts'
                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                            : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        KISAYOLLAR
                    </button>
                </div>

                {activeTab === 'general' ? (
                    <div className="space-y-6">
                        {/* Dil Seçimi */}
                        <div className="no-drag">
                            <div className="flex items-center justify-between mb-1.5 px-0.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">OCR DİLİ</label>
                                {/* Otomatik Algılama Toggle */}
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${settings.autoDetectLanguage ? 'text-indigo-400' : 'text-slate-500'}`}>
                                        OTOMATİK ALGI
                                    </span>
                                    <div className={`w-7 h-4 rounded-none transition-colors relative ${settings.autoDetectLanguage ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={settings.autoDetectLanguage}
                                            onChange={(e) => setSettings({ ...settings, autoDetectLanguage: e.target.checked })}
                                        />
                                        <div className={`absolute top-0.5 w-3 h-3 rounded-none bg-white transition-all ${settings.autoDetectLanguage ? 'left-3.5' : 'left-0.5'}`} />
                                    </div>
                                </label>
                            </div>
                            <div className={`grid grid-cols-2 gap-1.5 transition-opacity ${settings.autoDetectLanguage ? 'opacity-40 pointer-events-none' : ''}`}>
                                {languages.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setSettings({ ...settings, language: lang.code })}
                                        className={`flex items-center gap-1.5 p-2 rounded-none border transition-all ${settings.language === lang.code
                                            ? 'bg-indigo-500/10 border-indigo-500 text-white ring-1 ring-indigo-500'
                                            : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-sm grayscale-0">{lang.flag}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-tight">{lang.name}</span>
                                        {settings.language === lang.code && <span className="ml-auto text-indigo-500 font-black text-[10px]">✓</span>}
                                    </button>
                                ))}
                            </div>
                            {settings.autoDetectLanguage && (
                                <p className="text-[8px] text-indigo-400 font-bold uppercase mt-1.5 px-0.5">
                                    ✨ Dil otomatik algılanacak (Tesseract OSD)
                                </p>
                            )}
                        </div>

                        {/* Çeviri Ayarları */}
                        <div className="space-y-1.5 no-drag">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block px-0.5">ÇEVİRİ</label>
                            <div className="premium-card p-2 rounded-none space-y-2">
                                {/* Çeviri Toggle */}
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="space-y-0">
                                        <span className="text-[10px] font-bold text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">Otomatik Çeviri</span>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase">OCR SONUCUNU ÇEVİR</p>
                                    </div>
                                    <div className={`w-8 h-5 rounded-none transition-colors relative ${settings.translateEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={settings.translateEnabled}
                                            onChange={(e) => setSettings({ ...settings, translateEnabled: e.target.checked })}
                                        />
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-none bg-white transition-all ${settings.translateEnabled ? 'left-3.5' : 'left-0.5'}`} />
                                    </div>
                                </label>

                                {settings.translateEnabled && (
                                    <>
                                        <div className="h-px bg-white/5" />
                                        <div className="space-y-1">
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-0.5">HEDEF DİL</span>
                                            <div className="grid grid-cols-3 gap-1">
                                                {translateLanguages.map(lang => (
                                                    <button
                                                        key={lang.code}
                                                        onClick={() => setSettings({ ...settings, translateTarget: lang.code })}
                                                        className={`flex items-center gap-1 p-1.5 rounded-none border transition-all ${settings.translateTarget === lang.code
                                                            ? 'bg-indigo-500/10 border-indigo-500 text-white'
                                                            : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <span className="text-xs">{lang.flag}</span>
                                                        <span className="text-[8px] font-bold uppercase">{lang.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Dosya İşlemleri */}
                        <div className="space-y-1.5 no-drag">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block px-0.5">DOSYA İŞLEMLERİ</label>
                            <div className="premium-card p-2 rounded-none space-y-2">
                                {/* Otomatik Kaydetme Toggle */}
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="space-y-0">
                                        <span className="text-[10px] font-bold text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">Otomatik Kaydet</span>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase">SONUÇLAR YEDEKLENSİN</p>
                                    </div>
                                    <div className={`w-8 h-5 rounded-none transition-colors relative ${settings.autoSave ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={settings.autoSave}
                                            onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
                                        />
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-none bg-white transition-all ${settings.autoSave ? 'left-3.5' : 'left-0.5'}`} />
                                    </div>
                                </label>

                                <div className="h-px bg-white/5" />

                                {/* Klasör Seçimi ve Açma */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between px-0.5">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">KAYIT DİZİNİ</span>
                                        <button
                                            onClick={handleOpenDirectory}
                                            className="text-[8px] font-black text-indigo-400 hover:text-indigo-300 uppercase underline underline-offset-2 tracking-widest"
                                        >
                                            KLASÖRÜ AÇ
                                        </button>
                                    </div>
                                    <div className="flex gap-1 animate-in">
                                        <div className="flex-1 px-2 py-1.5 bg-white/5 rounded-none border border-white/5 text-[9px] text-slate-400 truncate font-mono">
                                            {settings.saveDirectory || "Klasör Seçilmedi"}
                                        </div>
                                        <button
                                            onClick={handleChooseDirectory}
                                            className="px-2 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-none text-[8px] font-black text-indigo-400 uppercase tracking-widest transition-all"
                                        >
                                            SEÇ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sistem Ayarları */}
                        <div className="space-y-1.5 no-drag">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block px-0.5">SİSTEM AYARLARI</label>
                            <div className="premium-card p-2 rounded-none space-y-2">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="space-y-0">
                                        <span className="text-[10px] font-bold text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">BAŞLANGIÇTA ÇALIŞTIR</span>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase">SİSTEMLE BERABER AÇILSIN</p>
                                    </div>
                                    <div className={`w-8 h-5 rounded-none transition-colors relative ${settings.autoStart ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={settings.autoStart}
                                            onChange={(e) => setSettings({ ...settings, autoStart: e.target.checked })}
                                        />
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-none bg-white transition-all ${settings.autoStart ? 'left-3.5' : 'left-0.5'}`} />
                                    </div>
                                </label>

                                <div className="h-px bg-white/5" />

                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="space-y-0">
                                        <span className="text-[10px] font-bold text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">DÜZENLEME PENCERESİ</span>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase">KOPYALAMADAN ÖNCE DÜZENLE</p>
                                    </div>
                                    <div className={`w-8 h-5 rounded-none transition-colors relative ${settings.showEditWindow ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={settings.showEditWindow}
                                            onChange={(e) => setSettings({ ...settings, showEditWindow: e.target.checked })}
                                        />
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-none bg-white transition-all ${settings.showEditWindow ? 'left-3.5' : 'left-0.5'}`} />
                                    </div>
                                </label>

                                <div className="h-px bg-white/5" />

                                {/* Tema Seçimi */}
                                <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-0.5">TEMA</span>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => setSettings({ ...settings, theme: 'dark' })}
                                            className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-none border transition-all ${settings.theme === 'dark'
                                                ? 'bg-indigo-500/10 border-indigo-500 text-white'
                                                : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20'
                                                }`}
                                        >
                                            <span>🌙</span>
                                            <span className="text-[9px] font-bold uppercase">Koyu</span>
                                        </button>
                                        <button
                                            onClick={() => setSettings({ ...settings, theme: 'light' })}
                                            className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-none border transition-all ${settings.theme === 'light'
                                                ? 'bg-indigo-500/10 border-indigo-500 text-white'
                                                : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20'
                                                }`}
                                        >
                                            <span>☀️</span>
                                            <span className="text-[9px] font-bold uppercase">Açık</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in">
                        {/* Kısayol Seçimi */}
                        <div className="no-drag">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block px-1">Ana OCR Kısayolu</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {shortcutsList.map(sc => (
                                    <button
                                        key={sc.value}
                                        onClick={() => setSettings({ ...settings, shortcut: sc.value })}
                                        className={`p-2 rounded-none border text-[10px] font-black uppercase tracking-widest transition-all ${settings.shortcut === sc.value
                                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                                            : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20'
                                            }`}
                                    >
                                        {sc.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Diğer Kısayollar Bilgilendirme */}
                        <div className="premium-card p-2 rounded-none space-y-1.5 no-drag">
                            <h3 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-0.5">SABİT KISAYOLLAR</h3>
                            <div className="space-y-1">
                                {[
                                    { label: 'QR / BARKOD OKU', key: 'CTRL+SHIFT+Q' },
                                    { label: 'TABLO YAKALA', key: 'CTRL+SHIFT+T' },
                                    { label: 'EL YAZISI OKU', key: 'CTRL+SHIFT+H' },
                                    { label: 'BÜYÜTEÇ AÇ/KAPAT', key: 'M' },
                                    { label: 'YAKALAMA MODUNDAN ÇIK', key: 'ESC' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-none">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">{item.label}</span>
                                        <kbd className="px-1.5 py-0.5 bg-black/30 border border-white/10 rounded-none text-[8px] text-white font-mono">{item.key}</kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer / Buttons */}
                <div className="mt-4 flex gap-2 no-drag">
                    <button
                        onClick={handleSave}
                        className={`flex-1 py-3 rounded-none font-black text-[10px] uppercase tracking-[3px] transition-all ${saved
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10 px-6'
                            : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/10 active:scale-[0.98]'
                            }`}
                    >
                        {saved ? '✓ AYARLAR GÜNCELLENDİ' : 'DEĞİŞİKLİKLERİ KAYDET'}
                    </button>
                </div>

                <p className="text-center text-[8px] font-black text-slate-600 uppercase tracking-[4px] mt-6">
                    V1.2.0 • BUILD 2024.02.05
                </p>
            </div>
        </div>
    )
}
