import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'
import Settings from './Settings'
import Editor from './Editor'

interface EditorData {
    text: string
    mode: string
    hasTranslation: boolean
    theme: 'dark' | 'light'
}

function App() {
    const { t } = useTranslation()
    const [mode, setMode] = useState<'overlay' | 'settings' | 'editor'>('overlay')
    const [editorData, setEditorData] = useState<EditorData | null>(null)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [selection, setSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null)
    const [isSelecting, setIsSelecting] = useState(false)
    const [mousePos, setMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
    const [showMagnifier, setShowMagnifier] = useState(false)
    const startPos = useRef<{ x: number, y: number } | null>(null)
    const imgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        console.log('Setting up IPC listener, ipcRenderer:', typeof window.ipcRenderer)

        const overlayHandler = (_event: any, dataUrl: string) => {
            console.log('Received show-overlay, dataUrl length:', dataUrl?.length)
            setMode('overlay')
            setImageSrc(dataUrl)
            setSelection(null)
            setIsSelecting(false)
        }

        const settingsHandler = () => {
            console.log('Received show-settings')
            setMode('settings')
            setImageSrc(null)
        }

        const editorHandler = (_event: any, data: EditorData) => {
            console.log('Received show-editor')
            setEditorData(data)
            setMode('editor')
            setImageSrc(null)
        }

        window.ipcRenderer.on('show-overlay', overlayHandler)
        window.ipcRenderer.on('show-settings', settingsHandler)
        window.ipcRenderer.on('show-editor', editorHandler)

        return () => {
            window.ipcRenderer.off('show-overlay', overlayHandler)
            window.ipcRenderer.off('show-settings', settingsHandler)
            window.ipcRenderer.off('show-editor', editorHandler)
        }
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                window.ipcRenderer.send('cancel-selection')
                setImageSrc(null)
                setSelection(null)
            }
            // M tuşu ile büyüteci aç/kapat
            if (e.key === 'm' || e.key === 'M') {
                setShowMagnifier(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return
        if (!imageSrc) return // Image yüklenmediyse tıklamayı yoksay
        setIsSelecting(true)
        startPos.current = { x: e.clientX, y: e.clientY }
        setSelection({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY })

        if (!isSelecting || !startPos.current) return
        setSelection({
            x: Math.min(e.clientX, startPos.current.x),
            y: Math.min(e.clientY, startPos.current.y),
            w: Math.abs(e.clientX - startPos.current.x),
            h: Math.abs(e.clientY - startPos.current.y)
        })
    }

    const handleMouseUp = () => {
        setIsSelecting(false)
        if (selection && selection.w > 5 && selection.h > 5) {
            console.log('Sending selection-complete:', selection)
            window.ipcRenderer.send('selection-complete', {
                x: selection.x,
                y: selection.y,
                width: selection.w,
                height: selection.h
            })
            setImageSrc(null)
        } else {
            console.log('Selection too small or null:', selection)
            setSelection(null)
        }
        startPos.current = null
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        window.ipcRenderer.send('cancel-selection')
        setImageSrc(null)
        setSelection(null)
    }

    // Ayarlar modundaysa Settings bileşenini göster
    if (mode === 'settings') {
        return <Settings />
    }

    // Editor modundaysa Editor bileşenini göster
    if (mode === 'editor' && editorData) {
        return (
            <Editor
                text={editorData.text}
                mode={editorData.mode}
                theme={editorData.theme}
                onCopy={(text, mode) => {
                    window.ipcRenderer.send('editor-copy', { text, mode })
                    setMode('overlay')
                    setEditorData(null)
                }}
                onClose={() => {
                    window.ipcRenderer.send('editor-close')
                    setMode('overlay')
                    setEditorData(null)
                }}
            />
        )
    }

    return (
        <div
            className={`w-screen h-screen overflow-hidden relative select-none ${imageSrc ? 'cursor-crosshair' : 'cursor-wait'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
        >
            {/* Frozen screenshot */}
            {imageSrc && (
                <img
                    ref={imgRef}
                    src={imageSrc}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ objectFit: 'fill' }}
                    alt={t('overlay.screenAlt')}
                    draggable={false}
                />
            )}

            {/* Screen capture border */}
            {imageSrc && (
                <div className="absolute inset-0 pointer-events-none z-[60]">
                    <div className="absolute inset-0 border-2 border-white/20" />
                </div>
            )}

            {/* Büyüteç */}
            {imageSrc && showMagnifier && !isSelecting && (
                <div
                    className="absolute pointer-events-none border-2 border-primary/50 rounded-none shadow-2xl overflow-hidden ring-4 ring-black/20"
                    style={{
                        width: 150,
                        height: 150,
                        left: mousePos.x - 75,
                        top: mousePos.y - 75,
                        zIndex: 100,
                    }}
                >
                    <div
                        style={{
                            width: 150,
                            height: 150,
                            backgroundImage: `url(${imageSrc})`,
                            backgroundPosition: `-${mousePos.x * 2 - 75}px -${mousePos.y * 2 - 75}px`,
                            backgroundSize: `${window.innerWidth * 2}px ${window.innerHeight * 2}px`,
                        }}
                    />
                    {/* Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-full h-0.5 bg-red-500 opacity-50" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="h-full w-0.5 bg-red-500 opacity-50" />
                    </div>
                </div>
            )}


            {/* Dim overlay: selection olmadığında tam ekran, olduğunda 4 parça */}
            {imageSrc && !selection && (
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            )}
            {imageSrc && selection && (
                <>
                    <div className="absolute bg-black/40 pointer-events-none"
                        style={{ left: 0, top: 0, right: 0, height: selection.y }} />
                    <div className="absolute bg-black/40 pointer-events-none"
                        style={{ left: 0, top: selection.y, width: selection.x, height: selection.h }} />
                    <div className="absolute bg-black/40 pointer-events-none"
                        style={{ left: selection.x + selection.w, top: selection.y, right: 0, height: selection.h }} />
                    <div className="absolute bg-black/40 pointer-events-none"
                        style={{ left: 0, top: selection.y + selection.h, right: 0, bottom: 0 }} />
                </>
            )}

            {/* Kısayol bilgisi */}
            {imageSrc && !isSelecting && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-full flex items-center gap-6 pointer-events-none animate-in">
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
                        <kbd className="bg-white/10 px-2 py-1 rounded text-white font-mono text-[10px]">ESC</kbd>
                        {t('overlay.cancel')}
                    </span>
                    <div className="w-px h-4 bg-white/10" />
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
                        <kbd className="bg-white/10 px-2 py-1 rounded text-white font-mono text-[10px]">M</kbd>
                        {t('overlay.magnifier')}
                    </span>
                </div>
            )}

            {/* Selection border + boyut etiketi */}
            {selection && selection.w > 0 && selection.h > 0 && (
                <div className="absolute z-50 pointer-events-none"
                    style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}>
                    {/* Simple border */}
                    <div className="absolute inset-0 border-2 border-white/80" />
                    {/* Size label */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                        <div className="bg-black/70 text-white text-[11px] px-3 py-1 rounded">
                            {Math.round(selection.w)} × {Math.round(selection.h)}
                        </div>
                    </div>
                    {/* Corner handles */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-gray-400" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-gray-400" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-gray-400" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-gray-400" />
                </div>
            )}
        </div>
    )
}

export default App
