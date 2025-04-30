import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { NewContextMenu } from './NewContextMenu'
import { FileContextMenu } from './FileContextMenu'
import path from 'path'
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
    }
  }
}

const fixedDrives = ['C:/', 'D:/', 'E:/']

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
      handleOpen(`${currentDir}/${item.name}`)
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

  const handleOpen = async (path: string): Promise<void> => {
    console.log('open')
    try {
      window.api.openFile(path)
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
    <div className="flex h-screen bg-gray-100">
      {/* Fixed Drive Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4 overflow-auto">
        <div className="flex items-center mb-4 space-x-4">
          <Button onClick={goBack} className="cursor-pointer" variant="outline">
            ⬅ Back
          </Button>
        </div>

        <h2 className="text-xl font-semibold mb-4">Drives</h2>
        <ul>
          {fixedDrives.map((drive) => (
            <li
              key={drive}
              onClick={() => handleDriveClick(drive)}
              className="mb-2 cursor-pointer hover:bg-gray-700 p-2 rounded"
            >
              <Button className="text-left w-full">{drive}</Button>
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
        <div className="flex-1 bg-white p-4 overflow-auto">
          <h2 className="text-xl font-semibold mb-4 text-black">Contents of {currentDir}</h2>
          <div className="w-4/5 mx-auto">
            <div
              className="grid grid-cols-[3fr_1fr_1fr_2fr] font-bold border-b border-gray-400 py-2 px-4 text-sm text-gray-700 bg-gray-200"
              ref={containerRef}
            >
              <div>Name</div>
              <div>Type</div>
              <div>Size</div>
              <div>Last Modified</div>
            </div>

            {error && <p className="text-red-600 mb-4">Error: {error}</p>}

            <div>
              {items.length === 0 && !creatingFolder ? (
                <p>No items found.</p>
              ) : (
                <ul>
                  {creatingFolder && (
                    <div className="grid grid-cols-[3fr_1fr_1fr_2fr] py-2 px-4 border-b text-sm items-center bg-yellow-50 text-black">
                      <div className="truncate font-medium flex items-center gap-2">
                        📁
                        <input
                          autoFocus
                          type="text"
                          className="bg-white border border-gray-300 rounded px-2 py-1 w-full"
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
                      className="grid grid-cols-[3fr_1fr_1fr_2fr] py-2 px-4 border-b text-sm items-center bg-green-50 text-black"
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
                        onOpen={() => handleOpen(`${currentDir}/${item.name}`)}
                        onCut={() => handleCut(`${currentDir}/${item.name}`)}
                        onCopy={() => handleCopy(`${currentDir}/${item.name}`)}
                        onDelete={() => handleDelete(`${currentDir}/${item.name}`)}
                      >
                        <div
                          onDoubleClick={() => handleItemDoubleClick(item)}
                          className={`grid grid-cols-[3fr_1fr_1fr_2fr] py-2 px-4 border-b text-sm items-center cursor-pointer hover:bg-gray-100 text-black ${
                            selectedFolder === item.name ? 'bg-gray-600 text-white' : ''
                          }`}
                        >
                          <div className="truncate font-medium">
                            {item.type === 'folder' ? '📁' : '📄'} {item.name}
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
  )
}

export default FileExplorer
