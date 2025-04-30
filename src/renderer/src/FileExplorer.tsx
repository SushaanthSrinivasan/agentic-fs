import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { NewContextMenu } from './NewContextMenu'
import { FileContextMenu } from './FileContextMenu'
import { BreadcrumbNav } from './BreadcrumbNav'
import './FileExplorer.css'
import { FileTextIcon } from './components/ui/file-text'
import { FileStackIcon } from './components/ui/file-stack'

// Type declaration for the exposed API
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
      getParentDir: (dirPath: string) => Promise<string> // Just return a string (parent dir or error message)
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
    }
  }
}

// const fixedDrives = ['3D Objects', 'Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Videos', 'C:/', 'D:/', 'E:/']

const fixedDrives = [
  { name: '3D Objects', path: `${window.api.getHomeDir()}/3D Objects` },
  { name: 'Desktop', path: `${window.api.getHomeDir()}/Desktop` },
  { name: 'Documents', path: `${window.api.getHomeDir()}/Documents` },
  { name: 'Downloads', path: `${window.api.getHomeDir()}/Downloads` },
  { name: 'Music', path: `${window.api.getHomeDir()}/Music` },
  { name: 'Pictures', path: `${window.api.getHomeDir()}/Pictures` },
  { name: 'Videos', path: `${window.api.getHomeDir()}/Videos` },
  { name: 'OS (C:)', path: 'C:/' },
  { name: 'New Volume (D:)', path: 'D:/' },
  { name: 'New Volume (E:)', path: 'E:/' }
]

const FileExplorer = (): React.JSX.Element => {
  const [currentDir, setCurrentDir] = useState<string>('C:/')
  // const [items, setItems] = useState<{ type: 'file' | 'folder'; name: string }[]>([])
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFile, setCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
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

  // console.log(`currentDir: ${currentDir}`)

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
        // If it's an error string
        setError(parentDir) // Display the error message
      } else if (parentDir !== currentDir) {
        fetchDirectory(parentDir) // Proceed with the parent directory if it's valid
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    }
  }

  const handleItemDoubleClick = (item: { type: 'file' | 'folder'; name: string }): void => {
    if (item.type === 'folder') {
      // const newPath = join(currentDir, item.name)
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

      <div className="flex h-screen bg-gray-100">
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
                <Button className="text-left w-full justify-start h-0.5">{drive.name}</Button>
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
              // setTimeout(() => {
              // containerRef.current?.scrollTo(0, 0)
              containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
              // }, 50)
            }
          }}
          onCreateFolder={() => {
            setCreatingFolder(true)
            setNewFolderName('New Folder')
            if (containerRef.current) {
              // setTimeout(() => {
              // containerRef.current?.scrollTo(0, 0)
              containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })

              // }, 50)
            }
          }}
          onRefresh={() => {
            setItems([])
            setTimeout(() => {
              fetchDirectory(currentDir)
            }, 75) // 1000 ms = 1 second
            // fetchDirectory(currentDir)
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
      </div>
    </div>
  )
}

export default FileExplorer
