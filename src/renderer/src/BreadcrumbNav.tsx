import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import React from 'react'

type BreadcrumbProps = {
  currentDir: string
  fetchDirectory: (dir: string) => Promise<void>
}

export function BreadcrumbNav({ currentDir, fetchDirectory }: BreadcrumbProps): React.JSX.Element {
  const normalized = currentDir.replaceAll('\\', '/')

  const match = normalized.match(/^([A-Za-z]:)(\/.*)?$/)
  const drive = match?.[1] ?? ''
  const rest = match?.[2]?.split('/').filter(Boolean) ?? []

  const breadcrumbData: { label: string; path: string }[] = []
  if (drive) {
    breadcrumbData.push({ label: drive, path: `${drive}/` })
  }

  rest.forEach((part, index) => {
    const fullPath = `${drive}/${rest.slice(0, index + 1).join('/')}`
    breadcrumbData.push({ label: part, path: fullPath })
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbData.map((item, index) => (
          <React.Fragment key={item.path}>
            <BreadcrumbItem>
              {index === breadcrumbData.length - 1 ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => fetchDirectory(item.path)}
                >
                  {item.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbData.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
