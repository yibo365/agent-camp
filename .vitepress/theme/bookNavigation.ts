import type { DefaultTheme } from 'vitepress/theme'

type NavEntry = {
  text?: string
  link?: string
  items?: NavEntry[]
}

export type BookChapter = {
  order: number
  title: string
  root: string
  groups: DefaultTheme.SidebarItem[]
}

export type BookPart = {
  title: string
  chapters: BookChapter[]
}

export type BookArticle = {
  text: string
  link: string
  chapter: string
}

export function normalizeBookPath(path: string) {
  const cleanPath = path.split(/[?#]/, 1)[0].replace(/\.html$/, '')
  return cleanPath.length > 1 ? cleanPath.replace(/\/$/, '') : cleanPath
}

function findSidebarGroups(
  sidebar: Record<string, DefaultTheme.SidebarItem[]>,
  link: string,
) {
  const target = normalizeBookPath(link)
  const key = Object.keys(sidebar).find(
    (candidate) => normalizeBookPath(candidate) === target,
  )

  return key ? sidebar[key] : []
}

export function buildBookParts(theme: DefaultTheme.Config): BookPart[] {
  if (!theme.sidebar || Array.isArray(theme.sidebar)) return []

  const sidebar = theme.sidebar as Record<string, DefaultTheme.SidebarItem[]>
  const nav = (Array.isArray(theme.nav) ? theme.nav : []) as NavEntry[]
  let chapterOrder = 0

  const parts = nav.flatMap((part) => {
    if (!part.items?.length) return []

    const chapters = part.items.flatMap((entry) => {
      if (!entry.link) return []

      const groups = findSidebarGroups(sidebar, entry.link)
      if (!groups.length) return []

      chapterOrder += 1
      return [{
        order: chapterOrder,
        title: entry.text || groups[0]?.text || entry.link,
        root: entry.link,
        groups,
      }]
    })

    return chapters.length
      ? [{ title: part.text || '学习章节', chapters }]
      : []
  })

  if (parts.length) return parts

  return [{
    title: '全部章节',
    chapters: Object.entries(sidebar).map(([root, groups], index) => ({
      order: index + 1,
      title: groups[0]?.text || root,
      root,
      groups,
    })),
  }]
}

function collectSidebarLinks(
  items: DefaultTheme.SidebarItem[],
  chapter: string,
  articles: BookArticle[],
  seen: Set<string>,
) {
  for (const item of items) {
    if (item.link) {
      const key = normalizeBookPath(item.link)
      if (!seen.has(key)) {
        seen.add(key)
        articles.push({ text: item.text || item.link, link: item.link, chapter })
      }
    }

    if (item.items?.length) {
      collectSidebarLinks(item.items, chapter, articles, seen)
    }
  }
}

export function flattenBookArticles(parts: BookPart[]) {
  const articles: BookArticle[] = []
  const seen = new Set<string>()

  for (const part of parts) {
    for (const chapter of part.chapters) {
      collectSidebarLinks(chapter.groups, chapter.title, articles, seen)
    }
  }

  return articles
}

export function isPathInChapter(path: string, root: string) {
  const current = normalizeBookPath(path)
  const chapterRoot = normalizeBookPath(root)
  return current === chapterRoot || current.startsWith(`${chapterRoot}/`)
}
