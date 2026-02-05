import { useState, useRef, useEffect } from 'react'
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
    const [mode, setMode] = useState<'overlay' | 'settings' | 'editor'>('overlay')
    const [editorData, setEditorData] = useState<EditorData | null>(null)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [selection, setSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null)
    const [isSelecting, setIsSelecting] = useState(false)
    const [mousePos, setMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
    const [showMagnifier, setShowMagnifier] = useState(true)
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
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    alt="Screen"
                    draggable={false}
                />
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

            {/* Loading state */}
            {!imageSrc && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                    <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-white text-lg">Yükleniyor...</p>
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
                <div className="absolute bottom-6 left-6 premium-card text-white/90 text-[10px] uppercase tracking-wider font-semibold px-4 py-2.5 rounded-none pointer-events-none animate-in">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded">ESC</kbd> İptal</span>
                        <div className="w-px h-3 bg-white/20" />
                        <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded">M</kbd> Büyüteç {showMagnifier ? 'Kapat' : 'Aç'}</span>
                    </div>
                </div>
            )}

            {/* Selection border + boyut etiketi */}
            {selection && selection.w > 0 && selection.h > 0 && (
                <div className="absolute z-50 pointer-events-none transition-all duration-75"
                    style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}>
                    <div className="w-full h-full border-2 border-primary shadow-[0_0_15px_rgba(99,102,241,0.3)]" />
                    <div className="absolute -bottom-7 left-0 premium-card text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap border-primary/30">
                        {Math.round(selection.w)} × {Math.round(selection.h)} PX
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
