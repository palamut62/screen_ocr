import { useState, useEffect, useRef } from 'react'

interface EditorProps {
    text: string
    mode: string
    theme: 'dark' | 'light'
    onCopy: (text: string, mode: string) => void
    onClose: () => void
}

export default function Editor({ text, mode, theme, onCopy, onClose }: EditorProps) {
    const isDark = theme === 'dark'
    const [editedText, setEditedText] = useState(text)
    const [charCount, setCharCount] = useState(text.length)
    const [wordCount, setWordCount] = useState(0)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        setEditedText(text)
        setCharCount(text.length)
        setWordCount(text.split(/\s+/).filter(w => w).length)
        // Focus textarea
        setTimeout(() => textareaRef.current?.focus(), 100)
    }, [text])

    useEffect(() => {
        setCharCount(editedText.length)
        setWordCount(editedText.split(/\s+/).filter(w => w).length)
    }, [editedText])

    const handleCopy = () => {
        onCopy(editedText, mode)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl+Enter to copy
        if (e.ctrlKey && e.key === 'Enter') {
            handleCopy()
        }
        // Escape to close
        if (e.key === 'Escape') {
            onClose()
        }
    }

    const modeLabels: Record<string, string> = {
        'ocr': 'OCR Sonucu',
        'qr': 'QR/Barkod',
        'table': 'Tablo',
        'handwriting': 'El Yazısı'
    }

    return (
        <div className={`h-screen w-screen p-4 font-sans flex flex-col drag transition-colors ${isDark ? 'bg-[#0f172a] text-slate-200' : 'bg-gray-100 text-gray-800'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3 no-drag">
                <div>
                    <h1 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {modeLabels[mode] || 'Metin'} <span className="text-indigo-500">Düzenle</span>
                    </h1>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                        {charCount} karakter • {wordCount} kelime
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className={`w-8 h-8 flex items-center justify-center rounded-none border transition-all group ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-200 hover:bg-gray-300 border-gray-300'}`}
                >
                    <span className={`text-xs ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'}`}>✕</span>
                </button>
            </div>

            {/* Textarea */}
            <div className="flex-1 mb-3 no-drag">
                <textarea
                    ref={textareaRef}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`w-full h-full border rounded-none p-3 text-sm font-mono resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 ${isDark ? 'bg-slate-800/50 border-white/10 text-slate-200' : 'bg-white border-gray-300 text-gray-800'}`}
                    placeholder="Metin burada görünecek..."
                    spellCheck={false}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-2 no-drag">
                <button
                    onClick={onClose}
                    className={`px-4 py-2.5 border rounded-none text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-400' : 'bg-gray-200 hover:bg-gray-300 border-gray-300 text-gray-600'}`}
                >
                    İptal
                </button>
                <button
                    onClick={handleCopy}
                    className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-none text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                >
                    Kopyala (Ctrl+Enter)
                </button>
            </div>

            <p className={`text-center text-[8px] font-bold uppercase tracking-widest mt-3 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                ESC ile kapat • CTRL+ENTER ile kopyala
            </p>
        </div>
    )
}
