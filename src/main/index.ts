import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import path from 'path'

let clipboardPath: string | null = null
let clipboardIsCut: boolean = false

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('get-directory-contents', async (_, dirPath: string) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })

    const enriched = items
      .map((item) => {
        const fullPath = path.join(dirPath, item.name)

        let stats
        try {
          stats = fs.statSync(fullPath)
        } catch (err) {
          return {
            name: item.name,
            type: item.isDirectory() ? 'folder' : 'file',
            size: null,
            modified: null,
            extension: item.isDirectory() ? null : path.extname(item.name),
            error: err instanceof Error ? err.message : String(err)
          }
        }

        // const stats = fs.statSync(fullPath)
        const ext = path.extname(item.name)

        return {
          name: item.name,
          type: item.isDirectory() ? 'folder' : 'file',
          size: item.isDirectory() ? 0 : stats.size,
          modified: stats.mtime.toISOString(),
          extension: item.isDirectory() ? null : ext
        }
      })
      .filter((entry) => !entry.error)

    return { items: enriched }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      items: []
    }
  }
})

ipcMain.handle('get-parent-dir', async (_, dirPath: string) => {
  try {
    const parent = path.dirname(dirPath)
    return parent
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`
  }
})

ipcMain.handle('create-folder', async (_, dirPath: string, folderName: string) => {
  try {
    const newFolderPath = path.join(dirPath, folderName)
    if (!fs.existsSync(newFolderPath)) {
      fs.mkdirSync(newFolderPath)
      return { success: true, message: 'Folder created successfully!' }
    }
    return { success: false, message: 'Folder already exists.' }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
})

ipcMain.handle('create-file', async (_, dirPath: string, fileName: string) => {
  try {
    const newFilePath = path.join(dirPath, fileName)
    if (!fs.existsSync(newFilePath)) {
      fs.writeFileSync(newFilePath, '') // Create an empty file
      return { success: true, message: 'File created successfully!' }
    }
    return { success: false, message: 'File already exists.' }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
})

ipcMain.handle('open-file', async (_, filePath: string) => {
  try {
    await shell.openPath(filePath)
    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
})

ipcMain.handle('delete-path', async (_, filePath: string) => {
  try {
    const stats = fs.statSync(filePath)
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
})

ipcMain.handle('copy-path', async (_, filePath: string) => {
  clipboardPath = filePath
  clipboardIsCut = false
  return { success: true }
})

ipcMain.handle('cut-path', async (_, filePath: string) => {
  clipboardPath = filePath
  clipboardIsCut = true
  return { success: true }
})

ipcMain.handle('paste-path', async (_, targetDir: string) => {
  if (!clipboardPath) {
    return { success: false, message: 'Nothing to paste.' }
  }

  const baseName = path.basename(clipboardPath)
  const destPath = path.join(targetDir, baseName)

  try {
    if (clipboardIsCut) {
      fs.renameSync(clipboardPath, destPath)
    } else {
      const stats = fs.statSync(clipboardPath)
      if (stats.isDirectory()) {
        // Recursively copy directory
        fs.cpSync(clipboardPath, destPath, { recursive: true })
      } else {
        fs.copyFileSync(clipboardPath, destPath)
      }
    }

    // Clear clipboard if it was a cut
    if (clipboardIsCut) {
      clipboardPath = null
      clipboardIsCut = false
    }

    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
})
