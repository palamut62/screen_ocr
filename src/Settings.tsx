import { useState, useEffect } from 'react'

interface SettingsData {
    language: string
    shortcut: string
    autoSave: boolean
    saveDirectory: string
    autoStart: boolean
}

const languages = [
    { code: 'tur', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'eng', name: 'English', flag: '🇬🇧' },
    { code: 'deu', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fra', name: 'Français', flag: '🇫🇷' },
    { code: 'spa', name: 'Español', flag: '🇪🇸' },
    { code: 'rus', name: 'Русский', flag: '🇷🇺' },
    { code: 'eng+tur', name: 'English + Türkçe', flag: '🌐' },
]

const shortcuts = [
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
        autoStart: false
    })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        // Ayarları yükle
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

    const handleClose = () => {
        window.ipcRenderer.send('close-settings')
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <span className="text-3xl">⚙️</span>
                        Screen OCR Ayarları
                    </h1>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* OCR Dili */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        🌐 OCR Dili
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => setSettings({ ...settings, language: lang.code })}
                                className={`p-3 rounded-lg text-left transition ${
                                    settings.language === lang.code
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                <span className="mr-2">{lang.flag}</span>
                                {lang.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Klavye Kısayolu */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        ⌨️ Klavye Kısayolu (OCR)
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
                        {shortcuts.map(sc => (
                            <button
                                key={sc.value}
                                onClick={() => setSettings({ ...settings, shortcut: sc.value })}
                                className={`p-3 rounded-lg text-center transition ${
                                    settings.shortcut === sc.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                {sc.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-gray-400 text-sm mt-2">
                        💡 QR/Barkod için: <kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl+Shift+Q</kbd>
                    </p>
                </div>

                {/* Otomatik Kaydetme */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        💾 Dosyaya Kaydetme
                    </h2>

                    <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg mb-3 cursor-pointer">
                        <span>Sonuçları otomatik kaydet</span>
                        <input
                            type="checkbox"
                            checked={settings.autoSave}
                            onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
                            className="w-5 h-5 accent-blue-600"
                        />
                    </label>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={settings.saveDirectory}
                            readOnly
                            placeholder="Kayıt klasörü seçilmedi"
                            className="flex-1 p-3 bg-gray-700 rounded-lg text-gray-300"
                        />
                        <button
                            onClick={handleChooseDirectory}
                            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg"
                        >
                            📁 Seç
                        </button>
                    </div>
                </div>

                {/* Sistem Ayarları */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        🖥️ Sistem
                    </h2>

                    <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer">
                        <div>
                            <span>Sistem başlangıcında çalıştır</span>
                            <p className="text-gray-400 text-sm">Bilgisayar açıldığında otomatik başlat</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.autoStart}
                            onChange={(e) => setSettings({ ...settings, autoStart: e.target.checked })}
                            className="w-5 h-5 accent-blue-600"
                        />
                    </label>
                </div>

                {/* Kısayollar Bilgisi */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        📋 Kısayollar
                    </h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-gray-700 rounded">
                            <span>Text OCR</span>
                            <kbd className="bg-gray-600 px-2 py-1 rounded">{shortcuts.find(s => s.value === settings.shortcut)?.label}</kbd>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-700 rounded">
                            <span>QR/Barkod</span>
                            <kbd className="bg-gray-600 px-2 py-1 rounded">Ctrl+Shift+Q</kbd>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-700 rounded">
                            <span>Büyüteç Aç/Kapat</span>
                            <kbd className="bg-gray-600 px-2 py-1 rounded">M</kbd>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-700 rounded">
                            <span>İptal</span>
                            <kbd className="bg-gray-600 px-2 py-1 rounded">ESC</kbd>
                        </div>
                    </div>
                </div>

                {/* Kaydet Butonu */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        className={`flex-1 py-4 rounded-lg font-semibold text-lg transition ${
                            saved
                                ? 'bg-green-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {saved ? '✓ Kaydedildi!' : '💾 Kaydet'}
                    </button>
                    <button
                        onClick={handleClose}
                        className="px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold"
                    >
                        Kapat
                    </button>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    Screen OCR v1.0 • Ayarlar: ~/.config/screen-ocr/settings.json
                </p>
            </div>
        </div>
    )
}
