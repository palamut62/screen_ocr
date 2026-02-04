import { app, BrowserWindow, ipcMain, desktopCapturer, screen, clipboard, Tray, Menu, nativeImage, globalShortcut, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

// Linux'ta notify-send kullan
function showNotification(title: string, body: string) {
    const safeBody = body.replace(/"/g, "'").replace(/\n/g, ' ').substring(0, 200)
    try {
        execSync(`notify-send "${title}" "${safeBody}" -t 3000`)
    } catch {
        console.log('Notification:', title, body)
    }
}

// The built directory structure
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

// Ayarlar dosyası
const configDir = path.join(process.env.HOME || '', '.config', 'screen-ocr')
const configFile = path.join(configDir, 'settings.json')

interface AppSettings {
    language: string
    shortcut: string
    autoSave: boolean
    saveDirectory: string
    showMagnifier: boolean
}

const defaultSettings: AppSettings = {
    language: 'eng+tur',
    shortcut: 'CommandOrControl+Shift+O',
    autoSave: false,
    saveDirectory: path.join(process.env.HOME || '', 'OCR-Sonuclari'),
    showMagnifier: true
}

// Ayarları yükle
function loadSettings(): AppSettings {
    try {
        if (fs.existsSync(configFile)) {
            const data = fs.readFileSync(configFile, 'utf-8')
            const loaded = JSON.parse(data)
            return { ...defaultSettings, ...loaded }
        }
    } catch (e) {
        console.log('Ayarlar yüklenemedi, varsayılanlar kullanılıyor')
    }
    return defaultSettings
}

// Ayarları kaydet
function saveSettings() {
    try {
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true })
        }
        const settings: AppSettings = {
            language: currentLanguage,
            shortcut: currentShortcut,
            autoSave: autoSaveEnabled,
            saveDirectory: saveDirectory,
            showMagnifier: true
        }
        fs.writeFileSync(configFile, JSON.stringify(settings, null, 2))
        console.log('Ayarlar kaydedildi:', configFile)
    } catch (e) {
        console.log('Ayarlar kaydedilemedi:', e)
    }
}

let win: BrowserWindow | null
let tray: Tray | null = null
let lastcapturedImage: Electron.NativeImage | null = null

// OCR Geçmişi (son 10 sonuç)
interface HistoryItem {
    text: string
    timestamp: Date
    preview: string // İlk 30 karakter
}
const ocrHistory: HistoryItem[] = []
const MAX_HISTORY = 10

// Dil Seçenekleri
interface Language {
    code: string
    name: string
}
const languages: Language[] = [
    { code: 'tur', name: '🇹🇷 Türkçe' },
    { code: 'eng', name: '🇬🇧 English' },
    { code: 'deu', name: '🇩🇪 Deutsch' },
    { code: 'fra', name: '🇫🇷 Français' },
    { code: 'spa', name: '🇪🇸 Español' },
    { code: 'ita', name: '🇮🇹 Italiano' },
    { code: 'rus', name: '🇷🇺 Русский' },
    { code: 'ara', name: '🇸🇦 العربية' },
    { code: 'chi_sim', name: '🇨🇳 中文' },
    { code: 'jpn', name: '🇯🇵 日本語' },
    { code: 'kor', name: '🇰🇷 한국어' },
    { code: 'eng+tur', name: '🌐 English + Türkçe' },
]
// Ayarları yükle
const settings = loadSettings()
let currentLanguage = settings.language
let currentShortcut = settings.shortcut
let captureMode: 'ocr' | 'qr' = 'ocr'
let autoSaveEnabled = settings.autoSave
let saveDirectory = settings.saveDirectory

// Dosyaya kaydetme fonksiyonu
function saveToFile(text: string, mode: 'ocr' | 'qr') {
    if (!autoSaveEnabled) return

    // Klasör yoksa oluştur
    if (!fs.existsSync(saveDirectory)) {
        fs.mkdirSync(saveDirectory, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const prefix = mode === 'qr' ? 'QR' : 'OCR'

    // TXT olarak kaydet
    const txtFile = path.join(saveDirectory, `${prefix}_${timestamp}.txt`)
    fs.writeFileSync(txtFile, text)

    // JSON olarak da kaydet (metadata ile)
    const jsonFile = path.join(saveDirectory, `${prefix}_${timestamp}.json`)
    const jsonData = {
        type: mode,
        text: text,
        timestamp: new Date().toISOString(),
        language: mode === 'ocr' ? currentLanguage : 'N/A',
        charCount: text.length,
        wordCount: text.split(/\s+/).filter(w => w).length
    }
    fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2))

    console.log('Saved to:', txtFile)
}

// Kayıt klasörünü seç
async function chooseSaveDirectory() {
    const result = await dialog.showOpenDialog({
        title: 'OCR Kayıt Klasörü Seç',
        defaultPath: saveDirectory,
        properties: ['openDirectory', 'createDirectory']
    })

    if (!result.canceled && result.filePaths[0]) {
        saveDirectory = result.filePaths[0]
        saveSettings()
        showNotification('📁 Klasör Seçildi', saveDirectory)
        updateTrayMenu()
    }
}

// Kayıt klasörünü aç
function openSaveDirectory() {
    if (!fs.existsSync(saveDirectory)) {
        fs.mkdirSync(saveDirectory, { recursive: true })
    }
    execSync(`xdg-open "${saveDirectory}"`)
}

// Kısayol seçenekleri
const shortcutOptions = [
    { label: 'Ctrl+Shift+O', accelerator: 'CommandOrControl+Shift+O' },
    { label: 'Ctrl+Shift+S', accelerator: 'CommandOrControl+Shift+S' },
    { label: 'Ctrl+Shift+C', accelerator: 'CommandOrControl+Shift+C' },
    { label: 'Ctrl+Alt+O', accelerator: 'CommandOrControl+Alt+O' },
    { label: 'Ctrl+Alt+S', accelerator: 'CommandOrControl+Alt+S' },
    { label: 'Print Screen', accelerator: 'PrintScreen' },
    { label: 'Shift+Print Screen', accelerator: 'Shift+PrintScreen' },
]

function changeShortcut(newShortcut: string) {
    // Eski kısayolu kaldır
    globalShortcut.unregister(currentShortcut)

    // Yeni kısayolu kaydet
    const success = globalShortcut.register(newShortcut, () => {
        console.log('Hotkey pressed:', newShortcut)
        startCapture()
    })

    if (success) {
        currentShortcut = newShortcut
        saveSettings()
        const label = shortcutOptions.find(s => s.accelerator === newShortcut)?.label || newShortcut
        showNotification('⌨️ Kısayol Değişti', label)
        updateTrayMenu()
    } else {
        // Başarısız olduysa eskiyi geri yükle
        globalShortcut.register(currentShortcut, () => startCapture())
        showNotification('❌ Hata', 'Bu kısayol kullanılamıyor')
    }
}

// QR/Barkod okuma fonksiyonu
function readQRCode(imagePath: string): string | null {
    try {
        const result = execSync(`zbarimg -q --raw "${imagePath}" 2>/dev/null`, { timeout: 10000 })
        return result.toString().trim()
    } catch {
        return null
    }
}

// QR modu ile yakalama başlat
function startQRCapture() {
    captureMode = 'qr'
    startCapture()
}

// OCR modu ile yakalama başlat
function startOCRCapture() {
    captureMode = 'ocr'
    startCapture()
}

// Autostart yönetimi
const autostartDir = path.join(process.env.HOME || '', '.config/autostart')
const autostartFile = path.join(autostartDir, 'screen-ocr.desktop')

function isAutostartEnabled(): boolean {
    return fs.existsSync(autostartFile)
}

function setAutostart(enabled: boolean) {
    if (enabled) {
        // Autostart klasörünü oluştur
        if (!fs.existsSync(autostartDir)) {
            fs.mkdirSync(autostartDir, { recursive: true })
        }

        // .desktop dosyası oluştur
        const appPath = app.isPackaged
            ? process.execPath
            : `${process.execPath} ${path.join(__dirname, '..')}`

        const desktopEntry = `[Desktop Entry]
Type=Application
Name=Screen OCR
Comment=OCR ile ekrandan text kopyala
Exec=${appPath}
Icon=${path.join(__dirname, '../public/tray-icon.png')}
Terminal=false
Categories=Utility;
StartupNotify=false
X-GNOME-Autostart-enabled=true
`
        fs.writeFileSync(autostartFile, desktopEntry)
        showNotification('✓ Autostart Açık', 'Uygulama sistem başlangıcında çalışacak')
    } else {
        // .desktop dosyasını sil
        if (fs.existsSync(autostartFile)) {
            fs.unlinkSync(autostartFile)
        }
        showNotification('✗ Autostart Kapalı', 'Uygulama artık otomatik başlamayacak')
    }
    updateTrayMenu()
}

function addToHistory(text: string) {
    const item: HistoryItem = {
        text,
        timestamp: new Date(),
        preview: text.substring(0, 30).replace(/\n/g, ' ') + (text.length > 30 ? '...' : '')
    }
    ocrHistory.unshift(item) // Başa ekle
    if (ocrHistory.length > MAX_HISTORY) {
        ocrHistory.pop() // Eski olanı sil
    }
    updateTrayMenu() // Menüyü güncelle
}

function updateTrayMenu() {
    if (!tray) return

    const currentShortcutLabel = shortcutOptions.find(s => s.accelerator === currentShortcut)?.label || 'Ctrl+Shift+O'

    // Geçmiş menüsü
    const historyMenuItems: Electron.MenuItemConstructorOptions[] = ocrHistory.map((item, index) => ({
        label: `${index + 1}. ${item.preview}`,
        click: () => {
            clipboard.writeText(item.text)
            showNotification('📋 Kopyalandı', item.preview)
        }
    }))

    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
        { label: `📷 Text Yakala (${currentShortcutLabel})`, click: () => startOCRCapture() },
        { label: '📱 QR/Barkod Oku (Ctrl+Shift+Q)', click: () => startQRCapture() },
        { type: 'separator' },
    ]

    if (historyMenuItems.length > 0) {
        menuTemplate.push({ label: '📜 Son OCR Sonuçları', enabled: false })
        menuTemplate.push(...historyMenuItems)
        menuTemplate.push({ type: 'separator' })
        menuTemplate.push({
            label: '🗑️ Geçmişi Temizle',
            click: () => {
                ocrHistory.length = 0
                updateTrayMenu()
            }
        })
        menuTemplate.push({ type: 'separator' })
    }

    menuTemplate.push({ label: '⚙️ Ayarlar', click: () => openSettings() })
    menuTemplate.push({ type: 'separator' })
    menuTemplate.push({ label: '❌ Çıkış', click: () => app.quit() })

    tray.setContextMenu(Menu.buildFromTemplate(menuTemplate))
}

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    win = new BrowserWindow({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
        transparent: false,
        frame: false,
        hasShadow: false,
        alwaysOnTop: true,
        show: false,        // Başlangıçta gizli
        skipTaskbar: true,
        backgroundColor: '#000000',
        width: width,
        height: height,
        x: 0,
        y: 0,
    })

    win.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'Escape' && input.type === 'keyDown') {
            win?.setFullScreen(false)
            win?.hide()
            event.preventDefault()
        }
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(process.env.DIST || '', 'index.html'))
    }

    console.log('Window created (hidden)')
}

// Harici araç ile ekran yakala (Linux'ta daha güvenilir)
function captureWithExternalTool(): Electron.NativeImage | null {
    const tmpFile = '/tmp/screen-ocr-capture.png'

    // Mevcut dosyayı sil
    try { fs.unlinkSync(tmpFile) } catch { }

    const tools = [
        `gnome-screenshot -f "${tmpFile}"`,
        `spectacle -b -n -o "${tmpFile}"`,
        `scrot "${tmpFile}"`,
        `import -window root "${tmpFile}"`
    ]

    for (const cmd of tools) {
        try {
            console.log('Trying:', cmd)
            execSync(cmd, { stdio: 'ignore', timeout: 5000 })
            if (fs.existsSync(tmpFile)) {
                const image = nativeImage.createFromPath(tmpFile)
                fs.unlinkSync(tmpFile)
                if (!image.isEmpty()) {
                    console.log('SUCCESS with:', cmd.split(' ')[0])
                    return image
                }
            }
        } catch (e) {
            console.log('Failed:', cmd.split(' ')[0])
        }
    }
    return null
}

async function startCapture() {
    if (!win) return

    try {
        console.log('=== Starting capture ===')

        // Linux'ta önce harici araç dene (daha güvenilir)
        let capturedImage: Electron.NativeImage | null = null

        if (process.platform === 'linux') {
            capturedImage = captureWithExternalTool()
        }

        // Harici araç başarısızsa Electron desktopCapturer dene
        if (!capturedImage) {
            const primaryDisplay = screen.getPrimaryDisplay()
            console.log('Trying Electron desktopCapturer...')

            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: {
                    width: primaryDisplay.size.width * primaryDisplay.scaleFactor,
                    height: primaryDisplay.size.height * primaryDisplay.scaleFactor
                }
            })

            if (sources[0]) {
                capturedImage = sources[0].thumbnail
                if (capturedImage.isEmpty()) {
                    capturedImage = null
                }
            }
        }

        if (capturedImage && !capturedImage.isEmpty()) {
            lastcapturedImage = capturedImage
            const dataUrl = lastcapturedImage.toDataURL()
            console.log('Image captured! DataURL length:', dataUrl.length)

            // Pencereyi göster
            win.setFullScreen(true)
            win.show()
            win.focus()

            // IPC gönder ve renderer'ın işlemesini bekle
            win.webContents.send('show-overlay', dataUrl)
            console.log('Window shown, IPC sent')
        } else {
            showNotification('Ekran Yakalama Başarısız', 'Ekran yakalanamadı.')
        }
    } catch (err) {
        console.error("Capture failed:", err)
        showNotification('Hata', 'Ekran yakalama hatası')
    }
}

// IPC Handler: Selection Complete
ipcMain.on('selection-complete', async (event, bounds: { x: number, y: number, width: number, height: number }) => {
    console.log('=== SELECTION COMPLETE ===', bounds)

    if (!win || !lastcapturedImage) {
        console.log('ERROR: win or lastcapturedImage is null')
        return
    }

    win.setFullScreen(false)
    win.hide()

    if (bounds.width <= 0 || bounds.height <= 0) {
        console.log('ERROR: Invalid bounds')
        return
    }

    try {
        const scaleFactor = screen.getPrimaryDisplay().scaleFactor
        console.log('ScaleFactor:', scaleFactor)

        const cropRect = {
            x: Math.round(bounds.x * scaleFactor),
            y: Math.round(bounds.y * scaleFactor),
            width: Math.round(bounds.width * scaleFactor),
            height: Math.round(bounds.height * scaleFactor)
        }
        console.log('CropRect:', cropRect)

        const image = lastcapturedImage.crop(cropRect)
        const imageBuffer = image.toPNG()
        console.log('Image cropped, buffer size:', imageBuffer.length)

        // Geçici dosyaya kaydet
        const tmpImage = '/tmp/ocr-selection.png'
        const tmpOutput = '/tmp/ocr-output'
        fs.writeFileSync(tmpImage, imageBuffer)

        let text = ''

        if (captureMode === 'qr') {
            // QR/Barkod modu
            console.log('Trying QR/Barcode detection...')
            const qrResult = readQRCode(tmpImage)
            if (qrResult) {
                text = qrResult
                console.log('QR/Barcode found:', text)
            }
        } else {
            // OCR modu
            console.log('Starting OCR with tesseract CLI... Language:', currentLanguage)
            execSync(`tesseract "${tmpImage}" "${tmpOutput}" -l ${currentLanguage} 2>/dev/null`, { timeout: 30000 })
            text = fs.readFileSync(tmpOutput + '.txt', 'utf-8').trim()
            console.log('OCR result length:', text.length)
            try { fs.unlinkSync(tmpOutput + '.txt') } catch {}
        }

        // Temizlik
        try { fs.unlinkSync(tmpImage) } catch {}

        if (text) {
            clipboard.writeText(text)
            addToHistory(text)
            saveToFile(text, captureMode) // Dosyaya kaydet
            const icon = captureMode === 'qr' ? '📱' : '✓'
            const saveInfo = autoSaveEnabled ? ' (kaydedildi)' : ''
            showNotification(`${icon} Kopyalandı!${saveInfo}`, text.length > 80 ? text.substring(0, 80) + '...' : text)
        } else {
            const msg = captureMode === 'qr' ? 'QR kod veya barkod bulunamadı.' : 'Seçilen alanda okunabilir text yok.'
            showNotification('✗ Bulunamadı', msg)
        }

        // Modu sıfırla
        captureMode = 'ocr'

    } catch (error) {
        console.error('OCR Error:', error)
        showNotification('Hata', (error as Error).message)
    }
    // Tray'da çalışmaya devam et (app.quit() yok)
})

// IPC Handler: Cancel Selection (user pressed ESC or right click)
ipcMain.on('cancel-selection', () => {
    if (win) {
        win.setFullScreen(false)
        win.hide()
    }
})

// Ayarlar penceresi
let settingsOpen = false

function openSettings() {
    if (!win || settingsOpen) return

    settingsOpen = true
    win.setFullScreen(false)
    win.setSize(700, 800)
    win.center()
    win.show()
    win.webContents.send('show-settings')
}

function closeSettings() {
    if (!win) return
    settingsOpen = false
    win.hide()
}

// IPC: Ayarları getir
ipcMain.handle('get-settings', () => {
    return {
        language: currentLanguage,
        shortcut: currentShortcut,
        autoSave: autoSaveEnabled,
        saveDirectory: saveDirectory,
        autoStart: isAutostartEnabled()
    }
})

// IPC: Ayarları kaydet
ipcMain.on('save-settings', (event, newSettings) => {
    // Dil değişti mi?
    if (newSettings.language !== currentLanguage) {
        currentLanguage = newSettings.language
    }

    // Kısayol değişti mi?
    if (newSettings.shortcut !== currentShortcut) {
        globalShortcut.unregister(currentShortcut)
        globalShortcut.register(newSettings.shortcut, () => startOCRCapture())
        currentShortcut = newSettings.shortcut
    }

    // Diğer ayarlar
    autoSaveEnabled = newSettings.autoSave
    saveDirectory = newSettings.saveDirectory

    // Autostart değişti mi?
    const currentAutostart = isAutostartEnabled()
    if (newSettings.autoStart !== currentAutostart) {
        setAutostart(newSettings.autoStart)
    }

    // Dosyaya kaydet
    saveSettings()
    updateTrayMenu()

    showNotification('✓ Ayarlar Kaydedildi', 'Tüm değişiklikler uygulandı')
})

// IPC: Klasör seç
ipcMain.handle('choose-directory', async () => {
    const result = await dialog.showOpenDialog({
        title: 'OCR Kayıt Klasörü Seç',
        defaultPath: saveDirectory,
        properties: ['openDirectory', 'createDirectory']
    })

    if (!result.canceled && result.filePaths[0]) {
        return result.filePaths[0]
    }
    return null
})

// IPC: Ayarları kapat
ipcMain.on('close-settings', () => {
    closeSettings()
})


app.on('window-all-closed', () => {
    // Artık hep kapanabilir
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    createWindow()

    // Klavye kısayolu: Kayıtlı kısayol ile OCR
    globalShortcut.register(currentShortcut, () => {
        console.log('Hotkey pressed:', currentShortcut, '(OCR)')
        startOCRCapture()
    })

    // Klavye kısayolu: Ctrl+Shift+Q ile QR/Barkod
    globalShortcut.register('CommandOrControl+Shift+Q', () => {
        console.log('Hotkey pressed: Ctrl+Shift+Q (QR)')
        startQRCapture()
    })

    // Tray icon - dosyadan yükle
    try {
        const iconPath = path.join(__dirname, '../public/tray-icon.png')
        console.log('Tray icon path:', iconPath)

        let trayIcon: Electron.NativeImage

        if (fs.existsSync(iconPath)) {
            trayIcon = nativeImage.createFromPath(iconPath)
            console.log('Loaded icon from file')
        } else {
            // Fallback: programatik ikon
            trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABRSURBVDiNY2AYBaNgFIwC6gFGBgYGhv///zMwMDAwfP/+nZGRkZHh79+/jExMTAz//v1jZGZmZvj9+zcjCwsLw58/fxhZWVkZ/v79y8jGxsYwGAAALgYRF+XsKjQAAAAASUVORK5CYII=')
            console.log('Using fallback icon')
        }

        tray = new Tray(trayIcon)
        tray.setToolTip('Screen OCR - Ctrl+Shift+O ile yakala')
        updateTrayMenu() // Menüyü oluştur
        tray.on('click', () => startCapture())
        console.log('Tray icon created successfully')
    } catch (e) {
        console.log('Tray oluşturulamadı:', e)
    }

    showNotification('Screen OCR Hazır', 'Ctrl+Shift+O ile ekran yakala')
    console.log('=== App ready ===')
})
