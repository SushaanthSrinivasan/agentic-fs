import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  //   ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger
} from '@/components/ui/context-menu'

interface FileContextMenuProps {
  onOpen: () => void
  onCut: () => void
  onCopy: () => void
  onDelete: () => void
  children: React.ReactNode
}

export function FileContextMenu({
  onOpen,
  onCut,
  onCopy,
  onDelete,
  children
}: FileContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-white shadow-md rounded-md border">
        {/* <ContextMenuLabel inset>New</ContextMenuLabel> */}
        <ContextMenuItem inset onClick={onOpen} className="text-black hover:bg-gray-100">
          Open
          <ContextMenuShortcut>⌘⇧F</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset onClick={onCut} className="text-black hover:bg-gray-100">
          Cut
          <ContextMenuShortcut>⌘⇧F</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset onClick={onCopy} className="text-black hover:bg-gray-100">
          Copy
          <ContextMenuShortcut>⌘⇧N</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem inset onClick={onDelete} className="text-black hover:bg-gray-100">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
