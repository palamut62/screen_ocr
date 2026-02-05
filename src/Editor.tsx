import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface EditorProps {
    text: string
    mode: string
    theme: 'dark' | 'light'
    onCopy: (text: string, mode: string) => void
    onClose: () => void
}

export default function Editor({ text, mode, theme, onCopy, onClose }: EditorProps) {
    const { t } = useTranslation()
    const [editedText, setEditedText] = useState(text)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const isDark = theme === 'dark'

    useEffect(() => {
        setEditedText(text)
        setTimeout(() => textareaRef.current?.focus(), 100)
    }, [text])

    const handleCopy = () => {
        onCopy(editedText, mode)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleCopy()
        }
        if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <div className={`h-screen w-screen flex flex-col drag ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            {/* Header */}
            <div className={`h-10 px-3 flex items-center justify-between no-drag ${isDark ? 'bg-[#252525]' : 'bg-gray-100'}`}>
                <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t('editor.title')}
                </span>
                <button
                    onClick={onClose}
                    className={`w-6 h-6 flex items-center justify-center rounded ${isDark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            {/* Textarea */}
            <div className="flex-1 no-drag">
                <textarea
                    ref={textareaRef}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`w-full h-full p-4 text-sm resize-none focus:outline-none ${isDark ? 'bg-[#1a1a1a] text-gray-300' : 'bg-white text-gray-800'}`}
                    placeholder={t('editor.placeholder')}
                    spellCheck={false}
                />
            </div>

            {/* Footer */}
            <div className={`h-12 px-3 flex items-center justify-end gap-2 no-drag ${isDark ? 'bg-[#252525]' : 'bg-gray-100'}`}>
                <button
                    onClick={onClose}
                    className={`px-3 py-1.5 text-xs rounded ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    {t('editor.cancel')}
                </button>
                <button
                    onClick={handleCopy}
                    className={`px-4 py-1.5 text-xs rounded ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}
                >
                    {t('editor.copy')}
                </button>
            </div>
        </div>
    )
}
