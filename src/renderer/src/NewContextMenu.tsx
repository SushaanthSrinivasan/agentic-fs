import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  //   ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

interface NewContextMenuProps {
  onCreateFile: () => void
  onCreateFolder: () => void
  onRefresh: () => void
  onPaste: () => void
  children: React.ReactNode
}

export function NewContextMenu({
  onCreateFile,
  onCreateFolder,
  onRefresh,
  onPaste,
  children
}: NewContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-white shadow-md rounded-md border">
        {/* <ContextMenuLabel inset>New</ContextMenuLabel> */}
        <ContextMenuItem inset onClick={onCreateFolder} className="text-black hover:bg-gray-100">
          New Folder
          <ContextMenuShortcut>⌘⇧F</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset onClick={onCreateFile} className="text-black hover:bg-gray-100">
          New File
          <ContextMenuShortcut>⌘⇧N</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem inset onClick={onRefresh} className="text-black hover:bg-gray-100">
          Refresh
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem inset onClick={onPaste} className="text-black hover:bg-gray-100">
          Paste
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
