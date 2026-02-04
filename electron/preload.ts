import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
    on(channel: string, listener: (...args: any[]) => void) {
        ipcRenderer.on(channel, listener as any)
    },
    off(channel: string, listener: (...args: any[]) => void) {
        ipcRenderer.off(channel, listener as any)
    },
    send(channel: string, ...args: any[]) {
        ipcRenderer.send(channel, ...args)
    },
    invoke(channel: string, ...args: any[]) {
        return ipcRenderer.invoke(channel, ...args)
    },
})
