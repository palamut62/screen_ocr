import { useState, useRef, useEffect } from 'react'
import './App.css'
import Settings from './Settings'

function App() {
    const [mode, setMode] = useState<'overlay' | 'settings'>('overlay')
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

        window.ipcRenderer.on('show-overlay', overlayHandler)
        window.ipcRenderer.on('show-settings', settingsHandler)

        return () => {
            window.ipcRenderer.off('show-overlay', overlayHandler)
            window.ipcRenderer.off('show-settings', settingsHandler)
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
                    className="absolute pointer-events-none border-2 border-white rounded-full shadow-lg overflow-hidden"
                    style={{
                        width: 120,
                        height: 120,
                        left: mousePos.x + 20,
                        top: mousePos.y + 20,
                        zIndex: 100,
                    }}
                >
                    <div
                        style={{
                            width: 120,
                            height: 120,
                            backgroundImage: `url(${imageSrc})`,
                            backgroundPosition: `-${mousePos.x * 2 - 60}px -${mousePos.y * 2 - 60}px`,
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
                <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg pointer-events-none">
                    <div>ESC: İptal | M: Büyüteç {showMagnifier ? 'Kapat' : 'Aç'}</div>
                </div>
            )}

            {/* Selection border + boyut etiketi */}
            {selection && selection.w > 0 && selection.h > 0 && (
                <div className="absolute z-50 pointer-events-none"
                    style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}>
                    <div className="w-full h-full border-2 border-blue-400" />
                    <div className="absolute -bottom-5 left-0 bg-black/70 text-blue-300 text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                        {Math.round(selection.w)} × {Math.round(selection.h)}
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
