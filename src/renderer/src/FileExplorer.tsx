import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

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
    }
  }
}

const fixedDrives = ['C:/', 'D:/', 'E:/']

const FileExplorer = (): React.JSX.Element => {
  const [currentDir, setCurrentDir] = useState<string>('C:/')
  // const [items, setItems] = useState<{ type: 'file' | 'folder'; name: string }[]>([])

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

  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

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

  useEffect(() => {
    fetchDirectory(currentDir)
  }, [])

  const handleItemClick = (item: { type: 'file' | 'folder'; name: string }): void => {
    if (item.type === 'folder') {
      // const newPath = join(currentDir, item.name)
      const newPath =
        currentDir.endsWith('/') || currentDir.endsWith('\\')
          ? `${currentDir}${item.name}`
          : `${currentDir}/${item.name}`

      fetchDirectory(newPath)
    }
  }

  const handleDriveClick = (drive: string): void => {
    fetchDirectory(drive)
  }

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
      <div className="flex-1 bg-white p-4 overflow-auto">
        <h2 className="text-xl font-semibold mb-4 text-black">Contents of {currentDir}</h2>
        <div className="grid grid-cols-[3fr_1fr_1fr_2fr] font-bold border-b border-gray-400 py-2 px-4 text-sm text-gray-700 bg-gray-200">
          <div>Name</div>
          <div>Type</div>
          <div>Size</div>
          <div>Last Modified</div>
        </div>
        {error && <p className="text-red-600 mb-4">Error: {error}</p>}
        {items.length === 0 ? (
          <p>No items found.</p>
        ) : (
          <ul>
            {items
              .filter((item) => !item.error)
              .map((item) => (
                <div
                  key={item.name}
                  onDoubleClick={() => handleItemClick(item)}
                  className={`grid grid-cols-[3fr_1fr_1fr_2fr] py-2 px-4 border-b text-sm items-center cursor-pointer hover:bg-gray-100 text-black ${
                    selectedFolder === item.name ? 'bg-gray-600 text-white' : ''
                  }`}
                >
                  <div className="truncate font-medium">
                    {item.type === 'folder' ? '📁' : '📄'} {item.name}
                  </div>
                  <div className="capitalize">{item.type}</div>
                  <div>{item.size !== null && item.type !== 'folder' ? `${item.size} B` : ''}</div>
                  <div>{item.modified ? new Date(item.modified).toLocaleString() : '-'}</div>
                </div>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default FileExplorer
