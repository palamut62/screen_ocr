import { app, BrowserWindow, ipcMain, desktopCapturer, screen, clipboard, Tray, Menu, nativeImage, globalShortcut, dialog, shell } from 'electron'
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
// Development/Production ortamını belirle (app.isPackaged henüz kullanılamaz)
const isDev = !!(process.env.VITE_DEV_SERVER_URL || process.env.npm_lifecycle_event === 'dev')
process.env.VITE_PUBLIC = isDev ? path.join(__dirname, '../public') : process.env.DIST

// Ayarlar dosyası - Electron standart yollarını kullan
const getConfigDir = () => path.join(app.getPath('userData'), 'settings')
const getConfigFile = () => path.join(getConfigDir(), 'settings.json')

interface AppSettings {
    language: string
    uiLanguage: 'system' | 'en' | 'tr'
    shortcut: string
    autoSave: boolean
    saveDirectory: string
    showMagnifier: boolean
    autoDetectLanguage: boolean
    theme: 'dark' | 'light'
    translateEnabled: boolean
    translateTarget: string
    showEditWindow: boolean
}

const defaultSettings: AppSettings = {
    language: 'eng+tur',
    uiLanguage: 'system',
    shortcut: 'CommandOrControl+Shift+O',
    autoSave: false,
    saveDirectory: path.join(app.getPath('home'), 'OCR-Sonuclari'),
    showMagnifier: true,
    autoDetectLanguage: false,
    theme: 'dark',
    translateEnabled: false,
    translateTarget: 'tr',
    showEditWindow: false
}

// Ayarları yükle
function loadSettings(): AppSettings {
    const configFile = getConfigFile()
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
    const configDir = getConfigDir()
    const configFile = getConfigFile()
    try {
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true })
        }
        const settings: AppSettings = {
            language: currentLanguage,
            uiLanguage: uiLanguage,
            shortcut: currentShortcut,
            autoSave: autoSaveEnabled,
            saveDirectory: saveDirectory,
            showMagnifier: true,
            autoDetectLanguage: autoDetectLanguage,
            theme: currentTheme,
            translateEnabled: translateEnabled,
            translateTarget: translateTarget,
            showEditWindow: showEditWindow
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
let ocrHistory: HistoryItem[] = []
const MAX_HISTORY = 10

// Geçmişi yükle
const historyFile = path.join(app.getPath('userData'), 'history.json')
function loadHistory() {
    try {
        if (fs.existsSync(historyFile)) {
            const data = fs.readFileSync(historyFile, 'utf-8')
            ocrHistory = JSON.parse(data)
        }
    } catch (e) {
        console.log('Geçmiş yüklenemedi')
    }
}

// Geçmişi kaydet
function saveHistory() {
    try {
        fs.writeFileSync(historyFile, JSON.stringify(ocrHistory, null, 2))
    } catch (e) {
        console.log('Geçmiş kaydedilemedi')
    }
}

// Ayarları yükle
const settings = loadSettings()
loadHistory()
let currentLanguage = settings.language
let uiLanguage = settings.uiLanguage || 'system'
let currentShortcut = settings.shortcut
let captureMode: 'ocr' | 'qr' | 'table' | 'handwriting' = 'ocr'
let autoSaveEnabled = settings.autoSave
let saveDirectory = settings.saveDirectory
let autoDetectLanguage = settings.autoDetectLanguage
let currentTheme: 'dark' | 'light' = settings.theme
let translateEnabled = settings.translateEnabled
let translateTarget = settings.translateTarget
let showEditWindow = settings.showEditWindow

// Dosyaya kaydetme fonksiyonu
function saveToFile(text: string, mode: 'ocr' | 'qr' | 'table' | 'handwriting') {
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

// Kısayol seçenekleri


// Çeviri fonksiyonu (translate-shell kullanarak)
function translateText(text: string, targetLang: string): string | null {
    try {
        // translate-shell (trans) komutunu kullan
        const safeText = text.replace(/'/g, "'\\''").substring(0, 5000) // Max 5000 karakter
        const result = execSync(`trans -b -t ${targetLang} '${safeText}' 2>/dev/null`, {
            timeout: 30000,
            encoding: 'utf-8'
        })
        return result.toString().trim()
    } catch (e) {
        console.log('Translation failed:', e)
        // Alternatif: Google Translate API via curl
        try {
            const encoded = encodeURIComponent(text.substring(0, 5000))
            const result = execSync(`curl -s "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encoded}" 2>/dev/null`, {
                timeout: 10000,
                encoding: 'utf-8'
            })
            const json = JSON.parse(result)
            if (json && json[0]) {
                return json[0].map((item: any) => item[0]).join('')
            }
        } catch {
            console.log('Fallback translation also failed')
        }
        return null
    }
}

// Otomatik dil algılama fonksiyonu
function detectLanguage(imagePath: string): string {
    try {
        // Tesseract OSD ile script algılama
        const result = execSync(`tesseract "${imagePath}" stdout --psm 0 -l osd 2>/dev/null`, { timeout: 10000 })
        const output = result.toString()

        // Script tipini bul
        const scriptMatch = output.match(/Script:\s*(\w+)/i)
        if (scriptMatch) {
            const script = scriptMatch[1].toLowerCase()

            // Script'e göre dil eşleştirmesi
            const scriptToLang: Record<string, string> = {
                'latin': 'eng+tur+deu+fra+spa',
                'cyrillic': 'rus',
                'arabic': 'ara',
                'han': 'chi_sim',
                'hangul': 'kor',
                'japanese': 'jpn',
                'hebrew': 'heb',
                'greek': 'ell',
                'thai': 'tha',
                'devanagari': 'hin'
            }

            if (scriptToLang[script]) {
                console.log('Detected script:', script, '-> Language:', scriptToLang[script])
                return scriptToLang[script]
            }
        }
    } catch (e) {
        console.log('Language detection failed, using default')
    }

    // Varsayılan olarak seçili dili kullan
    return currentLanguage
}

// Tablo algılama fonksiyonu (TSV -> Markdown)
function extractTable(imagePath: string): string | null {
    try {
        // Tesseract TSV çıktısı al - PSM 4 (variable-size column) tablo için daha uygun
        // PSM 6 düz metin için, PSM 4 değişken boyutlu sütunlar için
        console.log('extractTable: Starting with language:', currentLanguage)

        let result: Buffer
        try {
            // Önce PSM 4 dene (variable-size text in a single column)
            result = execSync(`tesseract "${imagePath}" stdout -l ${currentLanguage} --psm 4 tsv`, { timeout: 30000 })
        } catch (psmError) {
            console.log('PSM 4 failed, trying PSM 6:', psmError)
            // PSM 4 başarısız olursa PSM 6 dene
            result = execSync(`tesseract "${imagePath}" stdout -l ${currentLanguage} --psm 6 tsv`, { timeout: 30000 })
        }

        const tsvData = result.toString().trim()
        console.log('extractTable: TSV data length:', tsvData.length)
        console.log('extractTable: TSV preview:', tsvData.substring(0, 500))

        if (!tsvData) {
            console.log('extractTable: No TSV data returned')
            return null
        }

        const lines = tsvData.split('\n')
        console.log('extractTable: Total lines:', lines.length)

        if (lines.length < 2) {
            console.log('extractTable: Not enough lines (need at least 2)')
            return null
        }

        // TSV parse et - Y koordinatına göre satırları grupla
        const words: { text: string, left: number, top: number, height: number, lineNum: number, blockNum: number }[] = []

        for (let i = 1; i < lines.length; i++) { // Skip header
            const cols = lines[i].split('\t')
            if (cols.length < 12) continue

            const conf = parseInt(cols[10]) // confidence
            if (conf < 0) continue // -1 confidence means empty/invalid

            const blockNum = parseInt(cols[2])
            const lineNum = parseInt(cols[4])
            const left = parseInt(cols[6])
            const top = parseInt(cols[7])
            const height = parseInt(cols[9])
            const text = cols[11]?.trim()

            if (!text || text === '' || isNaN(left) || isNaN(top)) continue

            words.push({ text, left, top, height, lineNum, blockNum })
        }

        console.log('extractTable: Valid words found:', words.length)

        if (words.length === 0) {
            console.log('extractTable: No valid words found')
            return null
        }

        // Y koordinatına göre satırları grupla (tolerans: ortalama yüksekliğin yarısı)
        const avgHeight = words.reduce((sum, w) => sum + w.height, 0) / words.length
        const rowTolerance = avgHeight * 0.6

        // Kelimeleri Y koordinatına göre sırala
        words.sort((a, b) => a.top - b.top)

        const rows: { text: string, left: number }[][] = []
        let currentRow: { text: string, left: number }[] = []
        let currentRowTop = words[0].top

        for (const word of words) {
            // Yeni satır mı? (Y koordinatı toleranstan fazla farklıysa)
            if (Math.abs(word.top - currentRowTop) > rowTolerance) {
                if (currentRow.length > 0) {
                    // Sırala ve ekle
                    currentRow.sort((a, b) => a.left - b.left)
                    rows.push(currentRow)
                }
                currentRow = []
                currentRowTop = word.top
            }

            currentRow.push({ text: word.text, left: word.left })
        }

        // Son satırı ekle
        if (currentRow.length > 0) {
            currentRow.sort((a, b) => a.left - b.left)
            rows.push(currentRow)
        }

        console.log('extractTable: Rows detected:', rows.length)

        if (rows.length === 0) {
            console.log('extractTable: No rows formed')
            return null
        }

        // X koordinatlarına göre sütunları belirle
        // Tüm kelimelerin X koordinatlarını topla ve kümele
        const allLeftPositions = words.map(w => w.left).sort((a, b) => a - b)

        // Sütun pozisyonlarını belirle (X koordinatları arasındaki boşluklara göre)
        const columnPositions: number[] = []
        const minColGap = avgHeight * 1.5 // Minimum sütun aralığı

        let lastPos = allLeftPositions[0]
        columnPositions.push(lastPos)

        for (const pos of allLeftPositions) {
            if (pos - lastPos > minColGap) {
                columnPositions.push(pos)
            }
            lastPos = pos
        }

        // Her satırdaki kelimeleri sütunlara yerleştir
        const tableRows: string[][] = rows.map(row => {
            const cells: string[] = new Array(Math.max(columnPositions.length, row.length)).fill('')

            for (const word of row) {
                // En yakın sütunu bul
                let bestCol = 0
                let bestDist = Math.abs(word.left - columnPositions[0])

                for (let c = 1; c < columnPositions.length; c++) {
                    const dist = Math.abs(word.left - columnPositions[c])
                    if (dist < bestDist) {
                        bestDist = dist
                        bestCol = c
                    }
                }

                // Hücreye ekle (varsa boşlukla ayır)
                if (cells[bestCol]) {
                    cells[bestCol] += ' ' + word.text
                } else {
                    cells[bestCol] = word.text
                }
            }

            return cells
        })

        // Boş sütunları temizle
        const maxCols = Math.max(...tableRows.map(r => r.length))
        const normalizedRows = tableRows.map(row => {
            while (row.length < maxCols) row.push('')
            return row.slice(0, maxCols)
        })

        // Tamamen boş sütunları kaldır
        const nonEmptyColIndices: number[] = []
        for (let c = 0; c < maxCols; c++) {
            const hasContent = normalizedRows.some(row => row[c] && row[c].trim() !== '')
            if (hasContent) nonEmptyColIndices.push(c)
        }

        const cleanedRows = normalizedRows.map(row =>
            nonEmptyColIndices.map(c => row[c] || '')
        )

        if (cleanedRows.length === 0 || cleanedRows[0].length === 0) {
            console.log('extractTable: No valid table structure')
            return null
        }

        console.log('extractTable: Final table size:', cleanedRows.length, 'x', cleanedRows[0].length)

        // Markdown oluştur
        let markdown = '| ' + cleanedRows[0].join(' | ') + ' |\n'
        markdown += '| ' + cleanedRows[0].map(() => '---').join(' | ') + ' |\n'

        for (let i = 1; i < cleanedRows.length; i++) {
            markdown += '| ' + cleanedRows[i].join(' | ') + ' |\n'
        }

        console.log('extractTable: Markdown generated successfully')
        return markdown.trim()
    } catch (e) {
        console.log('Table extraction failed:', e)
        return null
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

// Tablo modu ile yakalama başlat
function startTableCapture() {
    captureMode = 'table'
    startCapture()
}

// El yazısı modu ile yakalama başlat
function startHandwritingCapture() {
    captureMode = 'handwriting'
    startCapture()
}

// Autostart yönetimi
const getAutostartDir = () => path.join(app.getPath('home'), '.config/autostart')
const getAutostartFile = () => path.join(getAutostartDir(), 'screen-ocr.desktop')

function isAutostartEnabled(): boolean {
    return fs.existsSync(getAutostartFile())
}

function setAutostart(enabled: boolean) {
    const autostartDir = getAutostartDir()
    const autostartFile = getAutostartFile()
    if (enabled) {
        // Autostart klasörünü oluştur
        if (!fs.existsSync(autostartDir)) {
            fs.mkdirSync(autostartDir, { recursive: true })
        }

        // .desktop dosyası oluştur
        const appPath = app.isPackaged
            ? process.execPath
            : `${process.execPath} ${path.join(__dirname, '..')}`

        // İkon yolu - paketlenmiş uygulamada resourcesPath, development'ta public
        const iconPath = app.isPackaged
            ? path.join(process.resourcesPath, 'tray-icon.png')
            : path.join(__dirname, '../public/tray-icon.png')

        const desktopEntry = `[Desktop Entry]
Type=Application
Name=Screen OCR
Comment=Extract text from screen
Exec=${appPath}
Icon=${iconPath}
Terminal=false
Categories=Utility;Graphics;Scanning;OCR;
StartupNotify=false
X-GNOME-Autostart-enabled=true
`
        fs.writeFileSync(autostartFile, desktopEntry)
        console.log('Autostart enabled')
    } else {
        // .desktop dosyasını sil
        if (fs.existsSync(autostartFile)) {
            fs.unlinkSync(autostartFile)
        }
        console.log('Autostart disabled')
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
    saveHistory() // Kaydet
    updateTrayMenu() // Menüyü güncelle
}

// Basit çeviri haritası (Tray için)
const trayTranslations: Record<string, Record<string, string>> = {
    'en': {
        'capture': 'Capture Text',
        'handwriting': 'Handwriting',
        'table': 'Table',
        'qr': 'QR / Barcode',
        'history': 'History',
        'clearHistory': 'Clear History',
        'settings': 'Settings',
        'quit': 'Quit',
        'copied': 'Copied',
        'captureFailed': 'Capture Failed',
        'captureFailedBody': 'Could not capture screen.',
        'error': 'Error',
        'notFound': 'Not Found',
        'qrNotFound': 'QR code or barcode not found.',
        'tableNotFound': 'Table structure not detected.',
        'handwritingNotFound': 'Handwriting could not be read.',
        'ocrNotFound': 'No readable text in the selected area.',
        'translationTitle': 'Translation',
        'saved': 'Saved',
        'translated': 'Translated'
    },
    'tr': {
        'capture': 'Metin Yakala',
        'handwriting': 'El Yazısı',
        'table': 'Tablo',
        'qr': 'QR / Barkod',
        'history': 'Geçmiş',
        'clearHistory': 'Geçmişi Temizle',
        'settings': 'Ayarlar',
        'quit': 'Çıkış',
        'copied': 'Kopyalandı',
        'captureFailed': 'Yakalama Başarısız',
        'captureFailedBody': 'Ekran görüntüsü alınamadı.',
        'error': 'Hata',
        'notFound': 'Bulunamadı',
        'qrNotFound': 'QR kod veya barkod bulunamadı.',
        'tableNotFound': 'Tablo yapısı algılanamadı.',
        'handwritingNotFound': 'El yazısı okunamadı.',
        'ocrNotFound': 'Seçili alanda okunabilir metin bulunamadı.',
        'translationTitle': 'Çeviri',
        'saved': 'Kaydedildi',
        'translated': 'Çevrildi'
    }
}

function getTrayText(key: string): string {
    const lang = uiLanguage === 'system' ? app.getLocale().split('-')[0] : uiLanguage
    // Desteklenmeyen diller için İngilizce
    const targetLang = (lang === 'tr') ? 'tr' : 'en'
    return trayTranslations[targetLang][key] || trayTranslations['en'][key]
}

function updateTrayMenu() {
    if (!tray) return



    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
        { label: getTrayText('capture'), click: () => setTimeout(startOCRCapture, 150) },
        { label: getTrayText('handwriting'), click: () => setTimeout(startHandwritingCapture, 150) },
        { label: getTrayText('table'), click: () => setTimeout(startTableCapture, 150) },
        { label: getTrayText('qr'), click: () => setTimeout(startQRCapture, 150) },
        { type: 'separator' },
    ]

    // Geçmiş menüsü - alt menü olarak
    if (ocrHistory.length > 0) {
        const historySubmenu: Electron.MenuItemConstructorOptions[] = ocrHistory.map((item) => ({
            label: `📋 ${item.preview}`,
            sublabel: new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            click: () => {
                clipboard.writeText(item.text)
                showNotification(getTrayText('copied'), item.preview)
            }
        }))

        historySubmenu.push({ type: 'separator' })
        historySubmenu.push({
            label: getTrayText('clearHistory'),
            click: () => {
                ocrHistory.length = 0
                updateTrayMenu()
            }
        })

        menuTemplate.push({
            label: `${getTrayText('history')} (${ocrHistory.length})`,
            submenu: historySubmenu
        })
    }

    menuTemplate.push({ type: 'separator' })
    menuTemplate.push({ label: getTrayText('settings'), click: () => openSettings() })
    menuTemplate.push({ label: getTrayText('quit'), click: () => app.quit() })

    tray.setContextMenu(Menu.buildFromTemplate(menuTemplate))
}

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size

    win = new BrowserWindow({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
        transparent: true,
        frame: false,
        hasShadow: false,
        alwaysOnTop: true,
        show: false,
        skipTaskbar: true,
        width: width,
        height: height,
        x: 0,
        y: 0,
        enableLargerThanScreen: true,
        resizable: true,
        movable: true,
    })

    win.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'Escape' && input.type === 'keyDown') {
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
    const tmpFile = path.join(app.getPath('temp'), 'screen-ocr-capture.png')

    // Mevcut dosyayı sil
    try { fs.unlinkSync(tmpFile) } catch { }

    const tools = [
        `scrot -o "${tmpFile}"`,
        `import -window root "${tmpFile}"`,
        `spectacle -b -n -o "${tmpFile}"`,
        `grim "${tmpFile}"`,
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

            // Pencereyi tam ekran boyutunda göster (animasyonsuz)
            const primaryDisplay = screen.getPrimaryDisplay()
            const { width, height } = primaryDisplay.size
            win.setBounds({ x: 0, y: 0, width, height })
            win.setAlwaysOnTop(true, 'screen-saver')
            win.setVisibleOnAllWorkspaces(true)
            win.show()
            win.focus()

            // IPC gönder
            win.webContents.send('show-overlay', dataUrl)
            console.log('Window shown, IPC sent')
        } else {
            showNotification(getTrayText('captureFailed'), getTrayText('captureFailedBody'))
        }
    } catch (err) {
        console.error("Capture failed:", err)
        showNotification(getTrayText('error'), getTrayText('captureFailed'))
    }
}

// IPC Handler: Selection Complete
ipcMain.on('selection-complete', async (_event, bounds: { x: number, y: number, width: number, height: number }) => {
    console.log('=== SELECTION COMPLETE ===', bounds)

    if (!win || !lastcapturedImage) {
        console.log('ERROR: win or lastcapturedImage is null')
        return
    }

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
        const tmpImage = path.join(app.getPath('temp'), 'ocr-selection.png')
        const tmpOutput = path.join(app.getPath('temp'), 'ocr-output')
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
        } else if (captureMode === 'table') {
            // Tablo modu
            console.log('Trying table extraction...')
            const tableResult = extractTable(tmpImage)
            if (tableResult) {
                text = tableResult
                console.log('Table extracted:', text.substring(0, 100))
            }
        } else if (captureMode === 'handwriting') {
            // El yazısı modu - PSM 7 (single line) veya 13 (raw line) kullan
            console.log('Trying handwriting recognition...')
            try {
                // Önce görüntüyü ön işleme tabi tut (imagemagick ile kontrast artır)
                const processedImage = path.join(app.getPath('temp'), 'ocr-handwriting-processed.png')
                try {
                    execSync(`convert "${tmpImage}" -colorspace Gray -contrast-stretch 0.1x0.1% -sharpen 0x1 "${processedImage}" 2>/dev/null`, { timeout: 5000 })
                } catch {
                    // ImageMagick yoksa orijinal görüntüyü kullan
                    fs.copyFileSync(tmpImage, processedImage)
                }

                // El yazısı için PSM 6 (block) ve OEM 1 (LSTM) kullan
                execSync(`tesseract "${processedImage}" "${tmpOutput}" -l ${currentLanguage} --psm 6 --oem 1 2>/dev/null`, { timeout: 30000 })
                text = fs.readFileSync(tmpOutput + '.txt', 'utf-8').trim()
                console.log('Handwriting result:', text.length)
                try { fs.unlinkSync(processedImage) } catch { }
                try { fs.unlinkSync(tmpOutput + '.txt') } catch { }
            } catch (e) {
                console.log('Handwriting recognition failed:', e)
            }
        } else {
            // OCR modu
            let ocrLanguage = currentLanguage

            // Otomatik dil algılama aktifse
            if (autoDetectLanguage) {
                console.log('Auto-detecting language...')
                ocrLanguage = detectLanguage(tmpImage)
            }

            console.log('Starting OCR with tesseract CLI... Language:', ocrLanguage)
            execSync(`tesseract "${tmpImage}" "${tmpOutput}" -l ${ocrLanguage} 2>/dev/null`, { timeout: 30000 })
            text = fs.readFileSync(tmpOutput + '.txt', 'utf-8').trim()
            console.log('OCR result length:', text.length)
            try { fs.unlinkSync(tmpOutput + '.txt') } catch { }
        }

        // Temizlik
        try { fs.unlinkSync(tmpImage) } catch { }

        if (text) {
            let finalText = text
            let translatedText = ''

            // Çeviri aktifse ve OCR/el yazısı modundaysa çevir
            if (translateEnabled && (captureMode === 'ocr' || captureMode === 'handwriting')) {
                console.log('Translating to:', translateTarget)
                const translated = translateText(text, translateTarget)
                if (translated) {
                    translatedText = translated
                    // Hem orijinal hem çeviri kopyala
                    const transTitle = getTrayText('translationTitle')
                    finalText = `${text}\n\n--- ${transTitle} (${translateTarget.toUpperCase()}) ---\n${translated}`
                }
            }

            // Düzenleme penceresi aktifse göster
            if (showEditWindow && win) {
                win.setAlwaysOnTop(false)
                win.setVisibleOnAllWorkspaces(false)
                win.setSize(600, 500)
                win.center()
                win.show()
                win.webContents.send('show-editor', {
                    text: finalText,
                    mode: captureMode,
                    hasTranslation: !!translatedText,
                    theme: currentTheme
                })
            } else {
                // Direkt kopyala
                clipboard.writeText(finalText)
                addToHistory(finalText)
                saveToFile(finalText, captureMode)
                const saveInfo = autoSaveEnabled ? ` (${getTrayText('saved').toLowerCase()})` : ''
                const modeLabel = captureMode === 'table' ? `${getTrayText('table')} ` : ''
                const translateInfo = translatedText ? ` +${getTrayText('translated').toLowerCase()}` : ''
                showNotification(`${modeLabel}${getTrayText('copied')}!${saveInfo}${translateInfo}`, text.length > 80 ? text.substring(0, 80) + '...' : text)
            }
        } else {
            const messages: Record<string, string> = {
                'qr': getTrayText('qrNotFound'),
                'table': getTrayText('tableNotFound'),
                'handwriting': getTrayText('handwritingNotFound'),
                'ocr': getTrayText('ocrNotFound')
            }
            showNotification(getTrayText('notFound'), messages[captureMode])
        }

        // Modu sıfırla
        captureMode = 'ocr'

    } catch (error) {
        console.error('OCR Error:', error)
        showNotification(getTrayText('error'), (error as Error).message)
    }
    // Tray'da çalışmaya devam et (app.quit() yok)
})

// IPC Handler: Cancel Selection (user pressed ESC or right click)
ipcMain.on('cancel-selection', () => {
    if (win) {
        win.hide()
    }
})

// Ayarlar penceresi
let settingsOpen = false

function openSettings() {
    if (!win || settingsOpen) return

    settingsOpen = true
    win.setAlwaysOnTop(false)
    win.setVisibleOnAllWorkspaces(false)
    win.setSize(600, 750)
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
        uiLanguage: uiLanguage,
        shortcut: currentShortcut,
        autoSave: autoSaveEnabled,
        saveDirectory: saveDirectory,
        autoStart: isAutostartEnabled(),
        autoDetectLanguage: autoDetectLanguage,
        theme: currentTheme,
        translateEnabled: translateEnabled,
        translateTarget: translateTarget,
        showEditWindow: showEditWindow
    }
})

// IPC: Ayarları kaydet
ipcMain.on('save-settings', (_event, newSettings) => {
    // Dil değişti mi?
    if (newSettings.language !== currentLanguage) {
        currentLanguage = newSettings.language
    }

    // Arayüz dili değişti mi?
    if (newSettings.uiLanguage !== uiLanguage) {
        uiLanguage = newSettings.uiLanguage
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
    autoDetectLanguage = newSettings.autoDetectLanguage ?? false
    currentTheme = newSettings.theme ?? 'dark'
    translateEnabled = newSettings.translateEnabled ?? false
    translateTarget = newSettings.translateTarget ?? 'tr'
    showEditWindow = newSettings.showEditWindow ?? false

    // Autostart değişti mi?
    const currentAutostart = isAutostartEnabled()
    if (newSettings.autoStart !== currentAutostart) {
        setAutostart(newSettings.autoStart)
    }

    // Dosyaya kaydet
    saveSettings()
    updateTrayMenu()
    console.log('Settings saved from GUI')
})

// IPC: Klasör seç
ipcMain.handle('choose-directory', async () => {
    const result = await dialog.showOpenDialog({
        title: 'Select Save Folder',
        defaultPath: saveDirectory,
        properties: ['openDirectory', 'createDirectory']
    })

    if (!result.canceled && result.filePaths[0]) {
        return result.filePaths[0]
    }
    return null
})

// IPC: Klasör aç
ipcMain.on('open-directory', (_event, directory) => {
    if (directory && fs.existsSync(directory)) {
        shell.openPath(directory)
    }
})

// IPC: Ayarları kapat
ipcMain.on('close-settings', () => {
    closeSettings()
})

// IPC: Düzenleyiciden metin kopyala
ipcMain.on('editor-copy', (_event, data: { text: string, mode: string }) => {
    clipboard.writeText(data.text)
    addToHistory(data.text)
    saveToFile(data.text, data.mode as 'ocr' | 'qr' | 'table' | 'handwriting')
    showNotification('Kopyalandı!', data.text.length > 80 ? data.text.substring(0, 80) + '...' : data.text)
    if (win) {
        win.hide()
    }
})

// IPC: Düzenleyiciyi kapat
ipcMain.on('editor-close', () => {
    if (win) {
        win.hide()
    }
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

    // Klavye kısayolu: Ctrl+Shift+T ile Tablo
    globalShortcut.register('CommandOrControl+Shift+T', () => {
        console.log('Hotkey pressed: Ctrl+Shift+T (Table)')
        startTableCapture()
    })

    // Klavye kısayolu: Ctrl+Shift+H ile El Yazısı
    globalShortcut.register('CommandOrControl+Shift+H', () => {
        console.log('Hotkey pressed: Ctrl+Shift+H (Handwriting)')
        startHandwritingCapture()
    })

    // Tray icon - dosyadan yükle
    try {
        // Development ve production için farklı yollar
        const devIconPath = path.join(__dirname, '../public/tray-icon.png')
        const prodIconPath = path.join(process.resourcesPath, 'tray-icon.png')
        const iconPath = app.isPackaged ? prodIconPath : devIconPath
        console.log('Tray icon path:', iconPath, 'isPackaged:', app.isPackaged)

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
        tray.on('click', () => setTimeout(startCapture, 100))
        console.log('Tray icon created successfully')
    } catch (e) {
        console.log('Tray oluşturulamadı:', e)
    }

    console.log('=== App ready ===')
})
