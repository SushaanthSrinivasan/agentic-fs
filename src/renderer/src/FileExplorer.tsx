import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { NewContextMenu } from './NewContextMenu'
import { FileContextMenu } from './FileContextMenu'
import { BreadcrumbNav } from './BreadcrumbNav'
import './FileExplorer.css'
import { FileTextIcon } from './components/ui/file-text'
import { FileStackIcon } from './components/ui/file-stack'
import { Input } from './components/ui/input'
import { ArchiveIcon } from './components/ui/archive'
import { DownloadIcon } from './components/ui/download'
import { AudioLinesIcon } from './components/ui/audio-lines'
import { GalleryThumbnailsIcon } from './components/ui/gallery-thumbnails'
import { ClapIcon } from './components/ui/clap'
import { FileCheckIcon } from './components/ui/file-check'
import { MonitorCheckIcon } from './components/ui/monitor-check'
import { BoxesIcon } from './components/ui/boxes'

declare global {
  interface Window {
    api: {
      getDirectoryContents: (dirPath: string) => Promise<{
        items: {
          name: string
          type: 'file' | 'folder'
          size: number | null
          modified: string | null
          extension: string | null
          error?: string
        }[]
        error?: string
      }>
      getParentDir: (dirPath: string) => Promise<string>
      createFolder: (
        dirPath: string,
        folderName: string
      ) => Promise<{ success: boolean; message: string }>
      createFile: (
        dirPath: string,
        fileName: string
      ) => Promise<{ success: boolean; message: string }>
      openFile: (filePath: string) => Promise<void>
      deletePath: (filePath: string) => Promise<{ success: boolean }>
      copyPath: (filePath: string) => Promise<{ success: boolean }>
      cutPath: (filePath: string) => Promise<{ success: boolean }>
      pastePath: (targetDir: string) => Promise<{ success: boolean }>
      getHomeDir: () => Promise<string>
      askAgent: (userQuery: string) => Promise<string>
    }
  }
}

const fixedDrives = [
  {
    name: '3D Objects',
    path: `${window.api.getHomeDir()}/3D Objects`,
    icon: <BoxesIcon size={20} />
  },
  {
    name: 'Desktop',
    path: `${window.api.getHomeDir()}/Desktop`,
    icon: <MonitorCheckIcon size={20} />
  },
  {
    name: 'Documents',
    path: `${window.api.getHomeDir()}/Documents`,
    icon: <FileCheckIcon size={20} />
  },
  {
    name: 'Downloads',
    path: `${window.api.getHomeDir()}/Downloads`,
    icon: <DownloadIcon size={20} />
  },
  { name: 'Music', path: `${window.api.getHomeDir()}/Music`, icon: <AudioLinesIcon size={20} /> },
  {
    name: 'Pictures',
    path: `${window.api.getHomeDir()}/Pictures`,
    icon: <GalleryThumbnailsIcon size={20} />
  },
  { name: 'Videos', path: `${window.api.getHomeDir()}/Videos`, icon: <ClapIcon size={20} /> },
  { name: 'OS (C:)', path: 'C:/', icon: <ArchiveIcon size={20} /> },
  { name: 'New Volume (D:)', path: 'D:/', icon: <ArchiveIcon size={20} /> },
  { name: 'New Volume (E:)', path: 'E:/', icon: <ArchiveIcon size={20} /> }
]

const FileExplorer = (): React.JSX.Element => {
  const [currentDir, setCurrentDir] = useState<string>('C:/')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFile, setCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [chatInput, setChatInput] = useState('')
  const [msgArray, setMsgArray] = useState(['Hi, how can I help you?'])
  const [items, setItems] = useState<
    {
      name: string
      type: 'file' | 'folder'
      size: number | null
      modified: string | null
      extension: string | null
      error?: string
    }[]
  >([])

  const handleNewFolderSubmit = async (): Promise<void> => {
    const trimmedName = newFolderName.trim()
    if (!trimmedName) {
      setCreatingFolder(false)
      return
    }

    try {
      await window.api.createFolder(currentDir, trimmedName)
      await fetchDirectory(currentDir)
    } catch (err) {
      setError(`Failed to create folder: ${(err as Error).message}`)
    } finally {
      setCreatingFolder(false)
      setNewFolderName('')
    }
  }

  const handleNewFileSubmit = async (): Promise<void> => {
    const trimmedName = newFileName.trim()
    if (!trimmedName) {
      setCreatingFile(false)
      return
    }

    try {
      await window.api.createFile(currentDir, trimmedName)
      await fetchDirectory(currentDir)
    } catch (err) {
      setError(`Failed to create file: ${(err as Error).message}`)
    } finally {
      setCreatingFile(false)
      setNewFileName('')
    }
  }

  const fetchDirectory = async (dir: string): Promise<void> => {
    try {
      const { items: fetchedItems, error } = await window.api.getDirectoryContents(dir)
      if (error) {
        setError(error)
        setItems([])
      } else {
        setError(null)
        setCurrentDir(dir)
        setItems(fetchedItems)
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const goBack = async (): Promise<void> => {
    try {
      const parentDir = await window.api.getParentDir(currentDir)

      if (parentDir.startsWith('Error:')) {
        setError(parentDir)
      } else if (parentDir !== currentDir) {
        fetchDirectory(parentDir)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    }
  }

  const handleItemDoubleClick = (item: { type: 'file' | 'folder'; name: string }): void => {
    if (item.type === 'folder') {
      const newPath =
        currentDir.endsWith('/') || currentDir.endsWith('\\')
          ? `${currentDir}${item.name}`
          : `${currentDir}/${item.name}`

      fetchDirectory(newPath)
    } else {
      handleOpen(`${currentDir}/${item.name}`, item.type)
    }
  }

  const handleDriveClick = (drive: string): void => {
    fetchDirectory(drive)
  }

  const handleDelete = async (path: string): Promise<void> => {
    try {
      const { success } = await window.api.deletePath(path)
      if (success) {
        await fetchDirectory(currentDir)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    }
  }

  const handleOpen = async (path: string, type: string): Promise<void> => {
    console.log('open')
    try {
      if (type === 'folder') {
        fetchDirectory(path)
      } else {
        window.api.openFile(path)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    }
  }

  const handleCut = async (path: string): Promise<void> => {
    console.log('cut')
    try {
      const { success } = await window.api.cutPath(path)
      if (success) {
        fetchDirectory(currentDir)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    }
  }

  const handleCopy = async (path: string): Promise<void> => {
    console.log('copy')
    try {
      const { success } = await window.api.copyPath(path)
      if (success) {
        fetchDirectory(currentDir)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    }
  }

  const handlePaste = async (targetDir: string): Promise<void> => {
    console.log('paste')
    try {
      const { success } = await window.api.pastePath(targetDir)
      if (success) {
        fetchDirectory(currentDir)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    }
  }

  const sendMessage = async (): Promise<void> => {
    console.log(`chat input: ${chatInput}`)

    setMsgArray([...msgArray, chatInput])

    const prompt = `You are an agentic file assistant who can do file operations. Help the user with what they need.
User: ${chatInput}
Current folder: ${currentDir}
Parent folder of current folder: ${await window.api.getParentDir(currentDir)} 
Operating system: Windows
Context:
Always keep in mind:
- If the user is asking you to do something which requires you to run a CLI command, first cd into the current folder and then run the command with the flags which dont require user input. Eg: cd <current-folder-path> && npx create-next-app@latest <edit-name-here> --yes
- If the user is asking you to remember a file, it means the file is in the current folder.
- If the user is asking you to remind them about a file saved earlier, then open the file.
`

    const response = await window.api.askAgent(prompt)

    if (response) {
      setMsgArray([...msgArray, response])
    }

    setChatInput('')
    fetchDirectory(currentDir)
  }

  useEffect(() => {
    fetchDirectory(currentDir)
  }, [])

  return (
    <div className="overflow-hidden">
      {/* top bar */}
      <div className="w-full h-10 overflow-hidden topbar">
        <div className="flex items-center space-x-4">
          <Button onClick={goBack} className="cursor-pointer" variant="ghost">
            ⬅
          </Button>
          <BreadcrumbNav currentDir={currentDir} fetchDirectory={fetchDirectory} />
        </div>
      </div>

      <div className="flex h-screen">
        {/* Fixed Drive Sidebar */}
        <div className="w-64 p-4 overflow-auto sidebar">
          {/* <h2 className="text-xl font-semibold mb-4">Drives</h2> */}
          <ul>
            {fixedDrives.map((drive) => (
              <li
                key={drive.name}
                onClick={() => handleDriveClick(drive.path)}
                className="mb-1 cursor-pointer p-1 rounded drive-item"
              >
                <div className="flex items-center">
                  {drive.icon}
                  <Button className="text-left w-full justify-start h-0.5">{drive.name}</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Main Panel */}

        <NewContextMenu
          onCreateFile={() => {
            setCreatingFile(true)
            setNewFileName('newfile.txt')
            if (containerRef.current) {
              containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
          onCreateFolder={() => {
            setCreatingFolder(true)
            setNewFolderName('New Folder')
            if (containerRef.current) {
              containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
          onRefresh={() => {
            setItems([])
            setTimeout(() => {
              fetchDirectory(currentDir)
            }, 75)
          }}
          onPaste={() => {
            handlePaste(currentDir)
          }}
        >
          <div className="flex-1 p-4 overflow-auto mainpanel">
            <div className="w-4/5">
              <div
                className="grid grid-cols-[4fr_1fr_1fr_2fr] font-bold py-2 px-4 text-sm"
                ref={containerRef}
              >
                <div className="border-r mr-2">Name</div>
                <div className="border-r mr-2">Type</div>
                <div className="border-r mr-2">Size</div>
                <div className="mr-2">Last Modified</div>
              </div>

              {error && <p className="text-red-600 mb-4">Error: {error}</p>}

              <div>
                {items.length === 0 && !creatingFolder ? (
                  <p className="text-gray-500 font-semibold text-sm text-center pt-30">
                    No items found.
                  </p>
                ) : (
                  <ul>
                    {creatingFolder && (
                      <div className="grid grid-cols-[4fr_1fr_1fr_2fr] py-2 px-4 text-sm items-center bg-yellow-50 text-black">
                        <div className="truncate font-medium flex items-center gap-2">
                          📁
                          <input
                            autoFocus
                            type="text"
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onBlur={() => setCreatingFolder(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleNewFolderSubmit()
                              if (e.key === 'Escape') setCreatingFolder(false)
                            }}
                          />
                        </div>
                        <div className="capitalize">folder</div>
                        <div></div>
                        <div>{new Date().toLocaleString()}</div>
                      </div>
                    )}

                    {creatingFile && (
                      <div
                        className="grid grid-cols-[4fr_1fr_1fr_2fr] py-2 px-4 text-sm items-center bg-green-50 text-black"
                        ref={(ref) => {
                          if (ref) {
                            ref.scrollIntoView({ block: 'start', behavior: 'smooth' })
                          }
                        }}
                      >
                        <div className="truncate font-medium flex items-center gap-2">
                          📄
                          <input
                            autoFocus
                            type="text"
                            className="bg-white border border-gray-300 rounded px-2 py-1 w-full"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onBlur={() => setCreatingFile(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleNewFileSubmit()
                              if (e.key === 'Escape') setCreatingFile(false)
                            }}
                          />
                        </div>
                        <div className="capitalize">file</div>
                        <div></div>
                        <div>{new Date().toLocaleString()}</div>
                      </div>
                    )}

                    {items
                      .filter((item) => !item.error)
                      .map((item) => (
                        <FileContextMenu
                          key={item.name}
                          onOpen={() => handleOpen(`${currentDir}/${item.name}`, item.type)}
                          onCut={() => handleCut(`${currentDir}/${item.name}`)}
                          onCopy={() => handleCopy(`${currentDir}/${item.name}`)}
                          onDelete={() => handleDelete(`${currentDir}/${item.name}`)}
                        >
                          <div
                            onDoubleClick={() => handleItemDoubleClick(item)}
                            className={`grid grid-cols-[4fr_1fr_1fr_2fr] py-2 px-4 text-sm items-center cursor-pointer file-item`}
                          >
                            <div className="truncate font-medium">
                              {/* {item.type === 'folder' ? '📁' : '📄'} {item.name} */}
                              <div className="flex gap-1 items-center">
                                {item.type === 'folder' ? (
                                  <FileStackIcon size={20} className="text-yellow-600" />
                                ) : (
                                  <FileTextIcon size={16} />
                                )}
                                {item.name}
                              </div>
                            </div>
                            <div className="capitalize">{item.type}</div>
                            <div>
                              {item.size !== null && item.type !== 'folder' ? `${item.size} B` : ''}
                            </div>
                            <div>
                              {item.modified ? new Date(item.modified).toLocaleString() : '-'}
                            </div>
                          </div>
                        </FileContextMenu>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </NewContextMenu>

        {/* Right Panel */}
        <div className="w-80 p-4 rightpanel flex flex-col h-full">
          <div className="flex-1 overflow-auto mb-2 space-y-2">
            {/* Example messages */}
            {msgArray.map((msg, index) => (
              <div
                key={index}
                className="p-2 rounded self-start"
                style={{ backgroundColor: `var(--sidebar-hover-bg-color)` }}
              >
                {msg}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mb-10">
            <Input
              type="text"
              className="flex-1 p-2 border rounded"
              placeholder="Type a message..."
              onChange={(e) => setChatInput(e.target.value)}
              value={chatInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim() !== '') {
                  sendMessage()
                }
              }}
            />
            {/* <Button onClick={() => sendMessage()}>Send</Button> */}
          </div>
        </div>

        {/* <div className="w-80 p-4 rightpanel">
          <div className="flex-1 overflow-auto mb-2 space-y-2">
            <div className="p-2 bg-gray-200 rounded self-start">Hi, how can I help?</div>
            <div className="p-2 bg-blue-200 rounded self-end">Open Documents folder</div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-2 border rounded"
              placeholder="Type a message..."
              onChange={(e) => setChatInput(e.target.value)}
            />
            <Button onClick={() => sendMessage()}>Send</Button>
          </div>
        </div> */}
      </div>
    </div>
  )
}

export default FileExplorer
