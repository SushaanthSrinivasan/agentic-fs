import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import path from 'path'
import { OpenAI } from 'openai'
import { exec } from 'child_process'

import dotenv from 'dotenv'
import { get } from 'http'
dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

let clipboardPath: string | null = null
let clipboardIsCut: boolean = false
const memory: { fileName: string; filePath: string }[] = []

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_directory_contents',
      description: 'List files and folders in a given directory path',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'Absolute path to list' }
        },
        required: ['dirPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_parent_dir',
      description: 'Get the parent directory of a given path',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'Path to extract parent directory from' }
        },
        required: ['dirPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_folder',
      description: 'Create a new folder in a directory',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'Directory to create the folder in' },
          folderName: { type: 'string', description: 'Name of the folder to create' }
        },
        required: ['dirPath', 'folderName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_file',
      description: 'Create a new file in a directory',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'Directory to create the file in' },
          fileName: { type: 'string', description: 'Name of the file to create' }
        },
        required: ['dirPath', 'fileName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_file',
      description: 'Open a file with the default system application',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file to open' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_path',
      description: 'Delete a file or folder at the specified path',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file or folder to delete' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'copy_path',
      description: 'Copy a file or folder to the clipboard',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file or folder to copy' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cut_path',
      description: 'Cut a file or folder to the clipboard',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file or folder to cut' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'paste_path',
      description: 'Paste the copied or cut file/folder into a target directory',
      parameters: {
        type: 'object',
        properties: {
          targetDir: { type: 'string', description: 'Directory to paste into' }
        },
        required: ['targetDir']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'move_file',
      description: 'Move a file from one directory to another',
      parameters: {
        type: 'object',
        properties: {
          srcDir: { type: 'string', description: 'Directory to move the file from' },
          targetDir: { type: 'string', description: 'Directory to move the file into' },
          fileName: { type: 'string', description: 'Name of the file to move' }
        },
        required: ['sourcePath', 'targetDir', 'fileName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file. Can create file automatically if it does not exist',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file to write to' },
          content: { type: 'string', description: 'Content to write to the file' }
        },
        required: ['filePath', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_cli',
      description: 'Run a command line interface command, no need any shell prefixes',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to run' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remember',
      description: 'Store a file name and its absolute path in memory for later retrieval',
      parameters: {
        type: 'object',
        properties: {
          fileName: {
            type: 'string',
            description: 'The name or label of the file to remember'
          },
          filePath: {
            type: 'string',
            description: 'The absolute path to the file'
          }
        },
        required: ['fileName', 'filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remind',
      description:
        'Return the full list of remembered files (fileName + filePath) so the assistant can decide which to open or navigate to',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
]

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
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

async function runCustomAgent(userQuery: string): Promise<string> {
  const messages: Array<any> = [{ role: 'user', content: userQuery }]

  try {
    while (true) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages,
        tools,
        tool_choice: 'auto'
      })

      const msg = response.choices[0].message!
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const call of msg.tool_calls) {
          console.log(JSON.stringify(call, null, 2))
          console.log('-------------------------------------')

          const toolName = call.function.name
          const args = JSON.parse(call.function.arguments!)
          const result = await executeTool(toolName, args)

          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [call]
          })
          messages.push({
            role: 'tool',
            name: toolName,
            content: JSON.stringify(result),
            tool_call_id: call.id
          })

          console.log(JSON.stringify(messages, null, 2))
          console.log('-------------------------------------------------------------------------')
        }
        continue
      }

      return msg.content!
    }
  } catch (error) {
    console.error(error)
    console.log(JSON.stringify(messages, null, 2))
  }
}

async function getDirectoryContents(dirPath: string) {
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
}
ipcMain.handle('get-directory-contents', async (_, dirPath: string) => {
  return await getDirectoryContents(dirPath)
})

async function getParentDir(dirPath: string) {
  try {
    const parent = path.dirname(dirPath)
    return parent
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`
  }
}
ipcMain.handle('get-parent-dir', async (_, dirPath: string) => {
  return await getParentDir(dirPath)
})

async function createFolder(dirPath: string, folderName: string) {
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
}
ipcMain.handle('create-folder', async (_, dirPath: string, folderName: string) => {
  return await createFolder(dirPath, folderName)
})

async function createFile(dirPath: string, fileName: string) {
  try {
    const newFilePath = path.join(dirPath, fileName)
    if (!fs.existsSync(newFilePath)) {
      fs.writeFileSync(newFilePath, '')
      return { success: true, message: 'File created successfully!' }
    }
    return { success: false, message: 'File already exists.' }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}
ipcMain.handle('create-file', async (_, dirPath: string, fileName: string) => {
  return await createFile(dirPath, fileName)
})

async function openFile(filePath: string) {
  try {
    await shell.openPath(filePath)
    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}
ipcMain.handle('open-file', async (_, filePath: string) => {
  return await openFile(filePath)
})

async function deletePath(filePath: string) {
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
}
ipcMain.handle('delete-path', async (_, filePath: string) => {
  return await deletePath(filePath)
})

async function copyPath(filePath: string) {
  clipboardPath = filePath
  clipboardIsCut = false
  return { success: true }
}
ipcMain.handle('copy-path', async (_, filePath: string) => {
  return await copyPath(filePath)
})

async function cutPath(filePath: string) {
  clipboardPath = filePath
  clipboardIsCut = true
  return { success: true }
}
ipcMain.handle('cut-path', async (_, filePath: string) => {
  return await cutPath(filePath)
})

async function pastePath(targetDir: string) {
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
        fs.cpSync(clipboardPath, destPath, { recursive: true })
      } else {
        fs.copyFileSync(clipboardPath, destPath)
      }
    }

    if (clipboardIsCut) {
      clipboardPath = null
      clipboardIsCut = false
    }

    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}
ipcMain.handle('paste-path', async (_, targetDir: string) => {
  return await pastePath(targetDir)
})

async function moveFile(srcDir: string, destDir: string, fileName: string) {
  try {
    const srcPath = path.join(srcDir, fileName)
    const destPath = path.join(destDir, fileName)
    fs.renameSync(srcPath, destPath)
    return { success: true }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}
ipcMain.handle('move-file', async (_, srcDir: string, destDir: string, fileName: string) => {
  return await moveFile(srcDir, destDir, fileName)
})

async function writeFile(filePath: string, content: string) {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    fs.writeFileSync(filePath, content, 'utf8')
    return { success: true }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err)
    }
  }
}
ipcMain.handle(
  'write-file',
  async (
    _event,
    filePath: string,
    content: string
  ): Promise<{ success: boolean; message?: string }> => {
    return await writeFile(filePath, content)
  }
)

async function runCli(commandLine: string) {
  try {
    return new Promise((resolve) => {
      exec(commandLine, { cwd: process.cwd(), shell: 'cmd.exe' }, (err, stdout, stderr) => {
        resolve({
          success: err == null,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        })
      })
    })
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err)
    }
  }
}
ipcMain.handle(
  'run-cli',
  async (
    _event,
    commandLine: string
  ): Promise<{
    success: boolean
    stdout: string
    stderr: string
  }> => {
    return await runCli(commandLine)
  }
)

async function rememberItem(
  item: string,
  filePath: string
): Promise<{ success: boolean; message: string }> {
  memory.push({ fileName: item, filePath: filePath })
  return { success: true, message: `Remembered "${item}"` }
}
ipcMain.handle('remember', async (_, item: string) => {
  return await rememberItem(item)
})

async function remindItem(): Promise<{ fileName: string; filePath: string }[]> {
  return memory
}
ipcMain.handle('remind', async () => {
  return remindItem()
})

async function executeTool(name: string, args: Record<string, string>): Promise<unknown> {
  switch (name) {
    case 'get_directory_contents': {
      const { dirPath } = args as { dirPath: string }
      return await getDirectoryContents(dirPath)
    }
    case 'get_parent_dir': {
      const { dirPath } = args as { dirPath: string }
      return await getParentDir(dirPath)
    }
    case 'create_folder': {
      const { dirPath, folderName } = args as {
        dirPath: string
        folderName: string
      }
      return await createFolder(dirPath, folderName)
    }
    case 'create_file': {
      const { dirPath, fileName } = args as {
        dirPath: string
        fileName: string
      }
      return await createFile(dirPath, fileName)
    }
    case 'delete_path': {
      const { filePath } = args as { filePath: string }
      return await deletePath(filePath)
    }
    case 'open_file': {
      const { filePath } = args as { filePath: string }
      return await openFile(filePath)
    }
    case 'copy_path': {
      const { filePath } = args as { filePath: string }
      return await copyPath(filePath)
    }
    case 'cut_path': {
      const { filePath } = args as { filePath: string }
      return await cutPath(filePath)
    }
    case 'paste_path': {
      const { targetDir } = args as { targetDir: string }
      return await pastePath(targetDir)
    }
    case 'move_file': {
      const { srcDir, destDir, fileName } = args as {
        srcDir: string
        destDir: string
        fileName: string
      }
      return await moveFile(srcDir, destDir, fileName)
    }
    case 'write_file': {
      const { filePath, content } = args as {
        filePath: string
        content: string
      }
      return await writeFile(filePath, content)
    }
    case 'run_cli': {
      const { command } = args as { command: string }
      return await runCli(command)
    }
    case 'remember': {
      const { fileName, filePath } = args as {
        fileName: string
        filePath: string
      }
      memory.push({ fileName, filePath })
      return { success: true, message: `Remembered "${fileName}" → ${filePath}` }
    }

    case 'remind': {
      return memory.map((m) => ({
        fileName: m.fileName,
        filePath: m.filePath
      }))
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

ipcMain.handle('ai-agent', async (_, userQuery: string) => {
  return await runCustomAgent(userQuery)
})
