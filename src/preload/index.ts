import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import os from 'os'

// Custom APIs for renderer
const api = {
  getDirectoryContents: (dirPath: string) => ipcRenderer.invoke('get-directory-contents', dirPath),
  getHomeDir: () => os.homedir(),
  getParentDir: (dirPath: string) => ipcRenderer.invoke('get-parent-dir', dirPath),
  createFolder: (dirPath: string, folderName: string) =>
    ipcRenderer.invoke('create-folder', dirPath, folderName),
  createFile: (dirPath: string, fileName: string) =>
    ipcRenderer.invoke('create-file', dirPath, fileName),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  deletePath: (filePath: string) => ipcRenderer.invoke('delete-path', filePath),
  copyPath: (filePath: string) => ipcRenderer.invoke('copy-path', filePath),
  cutPath: (filePath: string) => ipcRenderer.invoke('cut-path', filePath),
  pastePath: (targetDir: string) => ipcRenderer.invoke('paste-path', targetDir)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
