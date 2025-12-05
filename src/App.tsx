import { useEffect, useMemo, useState, useRef } from 'react'
import './App.css'

type MediaType = 'video' | 'audio'

type MediaItem = {
  id: string
  title: string
  path: string
  collection: string
  type: MediaType
  description?: string | null
  metadata?: {
    artist?: string | null
    album?: string | null
    description?: string | null
    duration?: number | null
    year?: number | null
    genre?: string | null
  } | null
}

type FolderNode = {
  name: string
  fullPath: string
  files: MediaItem[]
  subfolders: Map<string, FolderNode>
}

const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || ''

function buildMediaUrl(relPath: string): string {
  if (!MEDIA_BASE_URL) return ''
  const segments = relPath.split('/').map((s) => encodeURIComponent(s))
  return `${MEDIA_BASE_URL.replace(/\/+$/, '')}/${segments.join('/')}`
}

function buildFolderTree(items: MediaItem[]): FolderNode {
  const root: FolderNode = {
    name: '',
    fullPath: '',
    files: [],
    subfolders: new Map(),
  }

  for (const item of items) {
    const parts = item.path.split('/')
    const folderParts = parts.slice(0, -1)

    let current = root
    let currentPath = ''

    // Navigate/create folder structure
    for (const folderName of folderParts) {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName

      if (!current.subfolders.has(folderName)) {
        current.subfolders.set(folderName, {
          name: folderName,
          fullPath: currentPath,
          files: [],
          subfolders: new Map(),
        })
      }
      current = current.subfolders.get(folderName)!
    }

    // Add file to current folder
    current.files.push(item)
  }

  return root
}

type PlaylistItem = {
  itemId: string
  loop: boolean // Loop this item forever
}

type Playlist = {
  id: string
  name: string
  items: PlaylistItem[] // Array of playlist items with loop option
  shared: boolean // Whether this playlist is shared
  shareId?: string // Unique ID for sharing (generated when shared)
  ownerId?: string // ID of the user who created/shared this (for shared playlists)
}

type VersionInfo = {
  version: string
  updated: string
  changelog: string[]
}

type FolderProps = {
  folder: FolderNode
  level: number
  onSelectItem: (item: MediaItem) => void
  searchQuery: string
  expandedFolders: Set<string>
  onToggleFolder: (path: string) => void
  favorites: Set<string>
  onToggleFavorite: (itemId: string) => void
  onPlayPlaylist?: (playlist: Playlist) => void
}

type PlaylistAddFolderProps = {
  folder: FolderNode
  level: number
  playlist: Playlist
  onAddItem: (itemId: string) => void
  searchQuery: string
  expandedFolders: Set<string>
  onToggleFolder: (path: string) => void
}

function FolderComponent({
  folder,
  level,
  onSelectItem,
  searchQuery,
  expandedFolders,
  onToggleFolder,
  favorites,
  onToggleFavorite,
  onPlayPlaylist,
}: FolderProps) {
  const hasContent = folder.files.length > 0 || folder.subfolders.size > 0
  const isExpanded = expandedFolders.has(folder.fullPath) || level === 0
  const shouldShow = searchQuery === '' || isExpanded

  // Filter files and subfolders based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return folder.files
    const q = searchQuery.toLowerCase()
    return folder.files.filter((item) => {
      const searchableText = [
        item.title,
        item.path,
        item.collection,
        item.description || '',
        item.metadata?.artist || '',
        item.metadata?.album || '',
        item.metadata?.genre || '',
        item.metadata?.year?.toString() || '',
        item.metadata?.description || '',
      ]
        .join(' ')
        .toLowerCase()
      return searchableText.includes(q)
    })
  }, [folder.files, searchQuery])

  const filteredSubfolders = useMemo(() => {
    if (!searchQuery) return Array.from(folder.subfolders.values())
    const q = searchQuery.toLowerCase()
    return Array.from(folder.subfolders.values()).filter((subfolder) => {
      // Check if folder name matches or contains matching files
      if (subfolder.name.toLowerCase().includes(q)) return true
      // Check if any file in this folder tree matches
      const hasMatchingFile = (node: FolderNode): boolean => {
        if (
          node.files.some((f) => {
            const searchableText = [
              f.title,
              f.path,
              f.description || '',
              f.metadata?.artist || '',
              f.metadata?.album || '',
              f.metadata?.genre || '',
              f.metadata?.year?.toString() || '',
            ]
              .join(' ')
              .toLowerCase()
            return searchableText.includes(q)
          })
        ) {
          return true
        }
        return Array.from(node.subfolders.values()).some(hasMatchingFile)
      }
      return hasMatchingFile(subfolder)
    })
  }, [folder.subfolders, searchQuery])

  // Calculate total items in folder (for count display)
  const totalItems = useMemo(() => {
    const countInFolder = (node: FolderNode): number => {
      let count = node.files.length
      node.subfolders.forEach((sub) => {
        count += countInFolder(sub)
      })
      return count
    }
    return countInFolder(folder)
  }, [folder])

  if (!hasContent && level > 0) return null

  return (
    <div className="folder-container">
      {level > 0 && (
        <button
          type="button"
          className="folder-header"
          onClick={() => onToggleFolder(folder.fullPath)}
          style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
        >
          <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
          <span className="folder-name">{folder.name}</span>
          <span className="folder-count">({totalItems})</span>
        </button>
      )}

      {isExpanded && shouldShow && (
        <div className={level === 0 ? 'folder-content root-content' : 'folder-content'}>
          {filteredSubfolders.map((subfolder) => (
            <FolderComponent
              key={subfolder.fullPath}
              folder={subfolder}
              level={level + 1}
              onSelectItem={onSelectItem}
              searchQuery={searchQuery}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onPlayPlaylist={onPlayPlaylist}
            />
          ))}

          {filteredFiles.map((item) => {
            const isFavorite = favorites.has(item.id)
            return (
              <button
                key={item.id}
                type="button"
                className="media-card"
                onClick={() => onSelectItem(item)}
                style={{ 
                  paddingLeft: level === 0 ? '0.5rem' : `${Math.min((level + 1) * 1.25 + 0.5, 3)}rem`,
                  maxWidth: '100%'
                }}
              >
                <div className="media-badge">
                  {item.type === 'video' ? '🎬' : '🎵'}
                </div>
                <div className="media-content">
                  <div className="media-title">
                    {item.title}
                  </div>
                  {(item.metadata?.album || item.description) && (
                    <div className="media-album-description">
                      {item.metadata?.album && (
                        <span className="media-album">{item.metadata.album}</span>
                      )}
                      {item.description && !item.metadata?.album && (
                        <span className="media-description">{item.description}</span>
                      )}
                    </div>
                  )}
                  <div className="media-meta-row">
                    {item.metadata?.genre && (
                      <span className="media-genre">{item.metadata.genre}</span>
                    )}
                    {item.metadata?.year && (
                      <span className="media-year">{item.metadata.year}</span>
                    )}
                  </div>
                </div>
                <div className="media-card-actions">
                  <button
                    type="button"
                    className={`favorite-button ${isFavorite ? 'favorite-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(item.id)
                    }}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite ? '⭐' : '☆'}
                  </button>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Component for adding items to playlist (tree view)
function PlaylistAddFolderComponent({
  folder,
  level,
  playlist,
  onAddItem,
  searchQuery,
  expandedFolders,
  onToggleFolder,
}: PlaylistAddFolderProps) {
  const hasContent = folder.files.length > 0 || folder.subfolders.size > 0
  const isExpanded = expandedFolders.has(folder.fullPath) || level === 0
  const shouldShow = searchQuery === '' || isExpanded

  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return folder.files
    const q = searchQuery.toLowerCase()
    return folder.files.filter((item: MediaItem) => {
      const searchableText = [
        item.title,
        item.path,
        item.description || '',
        item.metadata?.album || '',
      ]
        .join(' ')
        .toLowerCase()
      return searchableText.includes(q)
    })
  }, [folder.files, searchQuery])

  const filteredSubfolders = useMemo(() => {
    if (!searchQuery) return Array.from(folder.subfolders.values())
    const q = searchQuery.toLowerCase()
    return Array.from(folder.subfolders.values()).filter((subfolder) => {
      if (subfolder.name.toLowerCase().includes(q)) return true
      const hasMatchingFile = (node: FolderNode): boolean => {
        if (
          node.files.some((f) => {
            const searchableText = [
              f.title,
              f.path,
              f.description || '',
            ]
              .join(' ')
              .toLowerCase()
            return searchableText.includes(q)
          })
        ) {
          return true
        }
        return Array.from(node.subfolders.values()).some(hasMatchingFile)
      }
      return hasMatchingFile(subfolder)
    })
  }, [folder.subfolders, searchQuery])

  const totalItems = useMemo(() => {
    const countInFolder = (node: FolderNode): number => {
      let count = node.files.length
      node.subfolders.forEach((sub) => {
        count += countInFolder(sub)
      })
      return count
    }
    return countInFolder(folder)
  }, [folder])

  if (!hasContent && level > 0) return null

  return (
    <div className="folder-container">
      {level > 0 && (
        <button
          type="button"
          className="folder-header"
          onClick={() => onToggleFolder(folder.fullPath)}
          style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
        >
          <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
          <span className="folder-name">{folder.name}</span>
          <span className="folder-count">({totalItems})</span>
        </button>
      )}

      {isExpanded && shouldShow && (
        <div className={level === 0 ? 'folder-content root-content' : 'folder-content'}>
          {filteredSubfolders.map((subfolder) => (
            <PlaylistAddFolderComponent
              key={subfolder.fullPath}
              folder={subfolder}
              level={level + 1}
              playlist={playlist}
              onAddItem={onAddItem}
              searchQuery={searchQuery}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          ))}

          {filteredFiles.map((item) => {
            return (
              <button
                key={item.id}
                type="button"
                className="playlist-add-item-button"
                onClick={() => onAddItem(item.id)}
                style={{
                  paddingLeft: level === 0 ? '0.5rem' : `${Math.min((level + 1) * 1.25 + 0.5, 3)}rem`,
                  maxWidth: '100%'
                }}
                title={`Add "${item.title}" to playlist`}
              >
                <span className="playlist-add-item-icon">
                  {item.type === 'video' ? '🎬' : '🎵'}
                </span>
                <div className="playlist-add-item-info">
                  <span className="playlist-add-item-title">{item.title}</span>
                  {item.metadata?.album && (
                    <span className="playlist-add-item-album">{item.metadata.album}</span>
                  )}
                  {item.metadata?.genre && (
                    <span className="playlist-add-item-genre">{item.metadata.genre}</span>
                  )}
                </div>
                <span className="playlist-add-item-action">+</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Default playlist (will be migrated to localStorage)
const DEFAULT_PLAYLIST: Playlist = {
  id: 'morning-breathwork',
  name: 'Morning Breathwork',
  items: [
    {
      itemId: 'inspire-vol-2-10-more-tracks-to-master-the-breath-02-eng-inspire-v2-warmth-of-the-suns-rays-1-mp3',
      loop: false,
    },
    {
      itemId: 'inspire-vol-2-10-more-tracks-to-master-the-breath-03-eng-inspire-v2-olorum-1-mp3',
      loop: false,
    },
    {
      itemId: 'inspire-vol-2-10-more-tracks-to-master-the-breath-04-eng-inspire-v2-riding-through-1-mp3',
      loop: false,
    },
  ],
  shared: false,
}

// Generate a unique share ID
const generateShareId = (): string => {
  return `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function App() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [sharedPlaylists, setSharedPlaylists] = useState<Playlist[]>([])
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null)
  const [playlistIndex, setPlaylistIndex] = useState(0)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showPlaylistManager, setShowPlaylistManager] = useState(false)
  const [playlistManagerTab, setPlaylistManagerTab] = useState<'my' | 'shared'>('my')
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState<VersionInfo | null>(null)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [showFeatureAnnouncement, setShowFeatureAnnouncement] = useState(false)
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState('')
  const [playlistAddSearch, setPlaylistAddSearch] = useState('')
  const [playlistAddGenre, setPlaylistAddGenre] = useState<string>('')
  const [playlistAddExpandedFolders, setPlaylistAddExpandedFolders] = useState<Set<string>>(new Set())
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const versionCheckIntervalRef = useRef<number | null>(null)
  const currentVersionRef = useRef<string | null>(null)

  // Load favorites, playlists, current version, and feature announcement status from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('drjoe-favorites')
      if (saved) {
        const favoriteIds = JSON.parse(saved) as string[]
        setFavorites(new Set(favoriteIds))
      }
      
      // Load private playlists from localStorage
      const savedPlaylists = localStorage.getItem('drjoe-playlists')
      if (savedPlaylists) {
        const parsed = JSON.parse(savedPlaylists) as Playlist[]
        // Ensure all playlists have shared field
        const migrated = parsed.map((p) => ({
          ...p,
          shared: p.shared ?? false,
        }))
        setPlaylists(migrated)
      } else {
        // Migrate default playlist to localStorage
        setPlaylists([DEFAULT_PLAYLIST])
        localStorage.setItem('drjoe-playlists', JSON.stringify([DEFAULT_PLAYLIST]))
      }

      // Load shared playlists from server API
      fetchSharedPlaylists()
      
      const savedVersion = localStorage.getItem('drjoe-version')
      if (savedVersion) {
        setCurrentVersion(savedVersion)
      }
      // Check if user has seen the feature announcement
      const hasSeenFeatures = localStorage.getItem('drjoe-seen-features')
      if (!hasSeenFeatures) {
        // Show after a short delay to let the app load
        setTimeout(() => {
          setShowFeatureAnnouncement(true)
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to load favorites/playlists/version', err)
    }
  }, [])

  // Update ref when currentVersion changes
  useEffect(() => {
    currentVersionRef.current = currentVersion
  }, [currentVersion])

  // Check for app updates
  const checkForUpdates = async () => {
    try {
      // Add cache-busting query parameter to ensure we get the latest version
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-cache',
      })
      if (!response.ok) return

      const versionInfo: VersionInfo = await response.json()
      const storedVersion = currentVersionRef.current
      
      // If we have a stored version and it's different, show update
      if (storedVersion && storedVersion !== versionInfo.version) {
        setUpdateAvailable(versionInfo)
      } else if (!storedVersion) {
        // First time - just store the version
        setCurrentVersion(versionInfo.version)
        localStorage.setItem('drjoe-version', versionInfo.version)
      }
    } catch (err) {
      // Silently fail - don't spam console
      console.debug('Version check failed:', err)
    }
  }

  // Poll for updates every 5 minutes
  useEffect(() => {
    // Initial check after 10 seconds (give app time to load)
    const initialTimer = setTimeout(() => {
      checkForUpdates()
    }, 10000)

    // Then check every 5 minutes
    const interval = setInterval(() => {
      checkForUpdates()
    }, 5 * 60 * 1000) // 5 minutes

    versionCheckIntervalRef.current = interval

    return () => {
      clearTimeout(initialTimer)
      if (versionCheckIntervalRef.current) {
        clearInterval(versionCheckIntervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Handle update refresh
  const handleUpdateRefresh = () => {
    if (updateAvailable) {
      // Store new version
      localStorage.setItem('drjoe-version', updateAvailable.version)
      // Reload the page
      window.location.reload()
    }
  }

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('drjoe-favorites', JSON.stringify(Array.from(favorites)))
    } catch (err) {
      console.error('Failed to save favorites', err)
    }
  }, [favorites])

  // Save playlists to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('drjoe-playlists', JSON.stringify(playlists))
    } catch (err) {
      console.error('Failed to save playlists', err)
    }
  }, [playlists])

  // Fetch shared playlists from server
  const fetchSharedPlaylists = async () => {
    try {
      const response = await fetch('/api/shared-playlists')
      if (response.ok) {
        const data = await response.json()
        setSharedPlaylists(data)
      } else {
        console.error('Failed to fetch shared playlists')
      }
    } catch (err) {
      console.error('Error fetching shared playlists:', err)
    }
  }

  // Save shared playlist to server
  const saveSharedPlaylist = async (playlist: Playlist): Promise<boolean> => {
    try {
      const response = await fetch('/api/shared-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playlist),
      })
      if (response.ok) {
        await fetchSharedPlaylists() // Refresh the list
        return true
      } else {
        console.error('Failed to save shared playlist')
        return false
      }
    } catch (err) {
      console.error('Error saving shared playlist:', err)
      return false
    }
  }

  // Delete shared playlist from server
  const deleteSharedPlaylist = async (playlistId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/shared-playlists/${playlistId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchSharedPlaylists() // Refresh the list
        return true
      } else {
        console.error('Failed to delete shared playlist')
        return false
      }
    } catch (err) {
      console.error('Error deleting shared playlist:', err)
      return false
    }
  }

  useEffect(() => {
    setLoading(true)
    fetch('/catalog.json')
      .then((res) => res.json())
      .then((data: MediaItem[]) => {
        setItems(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load catalog.json', err)
        setLoading(false)
      })
  }, [])

  const folderTree = useMemo(() => buildFolderTree(items), [items])

  // Build favorites folder
  const favoritesFolder = useMemo(() => {
    const favoriteItems = items.filter((item) => favorites.has(item.id))
    return {
      name: '⭐ Favorites',
      fullPath: '__favorites__',
      files: favoriteItems,
      subfolders: new Map<string, FolderNode>(),
    } as FolderNode
  }, [items, favorites])

  const handleToggleFavorite = (itemId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.items.length === 0) return
    setCurrentPlaylist(playlist)
    setPlaylistIndex(0)
    // Find the first item and play it
    const firstItem = items.find((item) => item.id === playlist.items[0].itemId)
    if (firstItem) {
      setSelectedId(firstItem.id)
    }
  }

  const handleCreatePlaylist = () => {
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}`,
      name: 'New Playlist',
      items: [],
      shared: false,
    }
    setPlaylists([...playlists, newPlaylist])
    setEditingPlaylist(newPlaylist)
    setPlaylistManagerTab('my')
    setPlaylistAddSearch('')
    setPlaylistAddGenre('')
    setPlaylistAddExpandedFolders(new Set())
    setShowPlaylistManager(true)
  }

  const handleSharePlaylist = async (playlist: Playlist) => {
    if (playlist.shared) {
      // Unshare: delete from server and move to private
      await deleteSharedPlaylist(playlist.id)
      const unsharedPlaylist: Playlist = {
        ...playlist,
        shared: false,
        shareId: undefined,
      }
      setPlaylists([...playlists, unsharedPlaylist])
    } else {
      // Share: save to server and remove from private
      const sharedPlaylist: Playlist = {
        ...playlist,
        shared: true,
        shareId: playlist.shareId || generateShareId(),
      }
      const success = await saveSharedPlaylist(sharedPlaylist)
      if (success) {
        setPlaylists(playlists.filter((p) => p.id !== playlist.id))
      } else {
        alert('Failed to share playlist. Please try again.')
      }
    }
  }


  const handleImportPlaylist = async () => {
    try {
      const data = JSON.parse(importData)
      if (!data.name || !Array.isArray(data.items)) {
        alert('Invalid playlist format')
        return
      }

      // Convert imported data to Playlist format
      const importedPlaylist: Playlist = {
        id: `imported-${Date.now()}`,
        name: data.name,
        items: data.items.map((item: any) => ({
          itemId: typeof item === 'string' ? item : item.itemId,
          loop: typeof item === 'object' && item.loop ? item.loop : false,
        })),
        shared: true, // Imported playlists are shared by default
        shareId: generateShareId(),
      }

      // Check if items exist in catalog
      const missingItems = importedPlaylist.items.filter(
        (item) => !items.some((i) => i.id === item.itemId)
      )
      if (missingItems.length > 0) {
        const confirm = window.confirm(
          `${missingItems.length} item(s) in this playlist are not available in your library. Add anyway?`
        )
        if (!confirm) return
      }

      const success = await saveSharedPlaylist(importedPlaylist)
      if (success) {
        setImportData('')
        setShowImportModal(false)
        setPlaylistManagerTab('shared')
        alert('Playlist imported successfully!')
      } else {
        alert('Failed to import playlist. Please try again.')
      }
    } catch (err) {
      console.error('Failed to import playlist', err)
      alert('Invalid JSON format. Please check your playlist data.')
    }
  }

  const handleDeletePlaylist = async (playlistId: string, isShared: boolean) => {
    if (currentPlaylist?.id === playlistId) {
      setCurrentPlaylist(null)
      setPlaylistIndex(0)
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
    if (isShared) {
      const success = await deleteSharedPlaylist(playlistId)
      if (!success) {
        alert('Failed to delete shared playlist. Please try again.')
      }
    } else {
      setPlaylists(playlists.filter((p) => p.id !== playlistId))
    }
  }

  const handleAddItemToPlaylist = (playlistId: string, itemId: string, isShared: boolean) => {
    const updatePlaylist = (p: Playlist) => {
      if (p.id === playlistId) {
        // Check if item already exists
        if (p.items.some((item) => item.itemId === itemId)) {
          return p
        }
        return {
          ...p,
          items: [...p.items, { itemId, loop: false }],
        }
      }
      return p
    }

    if (isShared) {
      setSharedPlaylists(sharedPlaylists.map(updatePlaylist))
    } else {
      setPlaylists(playlists.map(updatePlaylist))
    }

    if (editingPlaylist?.id === playlistId) {
      const item = items.find((i) => i.id === itemId)
      if (item && !editingPlaylist.items.some((i) => i.itemId === itemId)) {
        setEditingPlaylist({
          ...editingPlaylist,
          items: [...editingPlaylist.items, { itemId, loop: false }],
        })
      }
    }
  }

  const handleRemoveItemFromPlaylist = (playlistId: string, index: number, isShared: boolean) => {
    const updatePlaylist = (p: Playlist) => {
      if (p.id === playlistId) {
        const newItems = [...p.items]
        newItems.splice(index, 1)
        return { ...p, items: newItems }
      }
      return p
    }

    if (isShared) {
      setSharedPlaylists(sharedPlaylists.map(updatePlaylist))
    } else {
      setPlaylists(playlists.map(updatePlaylist))
    }

    if (editingPlaylist?.id === playlistId) {
      const newItems = [...editingPlaylist.items]
      newItems.splice(index, 1)
      setEditingPlaylist({ ...editingPlaylist, items: newItems })
    }
  }

  const handleToggleLoopItem = (playlistId: string, index: number, isShared: boolean) => {
    const updatePlaylist = (p: Playlist) => {
      if (p.id === playlistId) {
        const newItems = [...p.items]
        newItems[index] = { ...newItems[index], loop: !newItems[index].loop }
        return { ...p, items: newItems }
      }
      return p
    }

    if (isShared) {
      setSharedPlaylists(sharedPlaylists.map(updatePlaylist))
    } else {
      setPlaylists(playlists.map(updatePlaylist))
    }

    if (editingPlaylist?.id === playlistId) {
      const newItems = [...editingPlaylist.items]
      newItems[index] = { ...newItems[index], loop: !newItems[index].loop }
      setEditingPlaylist({ ...editingPlaylist, items: newItems })
    }
  }

  const handleReorderPlaylistItems = (playlistId: string, fromIndex: number, toIndex: number, isShared: boolean) => {
    const updatePlaylist = (p: Playlist) => {
      if (p.id === playlistId) {
        const newItems = [...p.items]
        const [removed] = newItems.splice(fromIndex, 1)
        newItems.splice(toIndex, 0, removed)
        return { ...p, items: newItems }
      }
      return p
    }

    if (isShared) {
      setSharedPlaylists(sharedPlaylists.map(updatePlaylist))
    } else {
      setPlaylists(playlists.map(updatePlaylist))
    }

    if (editingPlaylist?.id === playlistId) {
      const newItems = [...editingPlaylist.items]
      const [removed] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, removed)
      setEditingPlaylist({ ...editingPlaylist, items: newItems })
    }
  }

  // Handle seamless playlist playback with loop support
  useEffect(() => {
    if (!currentPlaylist || !audioRef.current) return

    const audio = audioRef.current
    const handleEnded = () => {
      const currentItem = currentPlaylist.items[playlistIndex]
      
      // If current item has loop enabled, restart it
      if (currentItem?.loop) {
        audio.currentTime = 0
        audio.play().catch((err) => {
          console.error('Loop play failed:', err)
        })
        return
      }

      // Otherwise, move to next item
      const nextIndex = playlistIndex + 1
      if (nextIndex < currentPlaylist.items.length) {
        const nextItem = items.find((item) => item.id === currentPlaylist.items[nextIndex].itemId)
        if (nextItem) {
          setPlaylistIndex(nextIndex)
          setSelectedId(nextItem.id)
        }
      } else {
        // Playlist finished
        setCurrentPlaylist(null)
        setPlaylistIndex(0)
      }
    }

    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentPlaylist, playlistIndex, items])

  const handleToggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleSelectItem = (item: MediaItem) => {
    setSelectedId(item.id)
  }

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  )

  // Update audio src when playlist index changes and auto-play next track
  useEffect(() => {
    if (currentPlaylist && audioRef.current && selected) {
      const currentPlaylistItem = currentPlaylist.items[playlistIndex]
      if (currentPlaylistItem && currentPlaylistItem.itemId === selected.id) {
        const url = buildMediaUrl(selected.path)
        if (url) {
          // Only update if src has changed
          if (audioRef.current.src !== url) {
            audioRef.current.src = url
            audioRef.current.load()
            // Auto-play the next track in playlist
            audioRef.current.play().catch((err) => {
              console.error('Auto-play failed (may require user interaction):', err)
            })
          }
        }
      }
    }
  }, [currentPlaylist, playlistIndex, selected])

  // Expand all folders when searching
  useEffect(() => {
    if (query) {
      const allPaths = new Set<string>()
      const collectPaths = (node: FolderNode) => {
        if (node.fullPath) allPaths.add(node.fullPath)
        node.subfolders.forEach(collectPaths)
      }
      collectPaths(folderTree)
      setExpandedFolders(allPaths)
    }
  }, [query, folderTree])

  const handleDismissFeatureAnnouncement = () => {
    localStorage.setItem('drjoe-seen-features', 'true')
    setShowFeatureAnnouncement(false)
  }


  const handleClosePlaylistManager = () => {
    setShowPlaylistManager(false)
    setEditingPlaylist(null)
    setDraggedItemIndex(null)
    setPlaylistAddSearch('')
    setPlaylistAddGenre('')
    setPlaylistAddExpandedFolders(new Set())
  }

  const handleSavePlaylist = async () => {
    if (editingPlaylist) {
      if (editingPlaylist.shared) {
        const success = await saveSharedPlaylist(editingPlaylist)
        if (!success) {
          alert('Failed to save shared playlist. Please try again.')
          return
        }
      } else {
        setPlaylists(
          playlists.map((p) => (p.id === editingPlaylist.id ? editingPlaylist : p))
        )
      }
    }
    handleClosePlaylistManager()
  }


  // Get available items for adding to playlist (items not already in the playlist)
  const getAvailableItemsForPlaylist = (playlist: Playlist) => {
    const playlistItemIds = new Set(playlist.items.map((item) => item.itemId))
    return items.filter((item) => !playlistItemIds.has(item.id))
  }


  // Get unique genres from available items
  const getAvailableGenres = (playlist: Playlist) => {
    const availableItems = getAvailableItemsForPlaylist(playlist)
    const genres = new Set<string>()
    availableItems.forEach((item) => {
      if (item.metadata?.genre) {
        genres.add(item.metadata.genre)
      }
    })
    return Array.from(genres).sort()
  }

  // Filter items by search and genre
  const filterItemsForPlaylist = (items: MediaItem[], searchQuery: string, genre: string) => {
    return items.filter((item) => {
      // Genre filter
      if (genre && item.metadata?.genre !== genre) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const searchableText = [
          item.title,
          item.path,
          item.description || '',
          item.metadata?.album || '',
          item.metadata?.genre || '',
        ].join(' ')
        return searchableText.toLowerCase().includes(q)
      }

      return true
    })
  }

  // Get all playlists (my + shared) for display
  const allPlaylists = useMemo(() => {
    return [...playlists, ...sharedPlaylists]
  }, [playlists, sharedPlaylists])

  return (
    <div className="app-root">
      {showFeatureAnnouncement && (
        <div className="update-modal-overlay">
          <div className="update-modal feature-announcement-modal">
            <div className="update-modal-header">
              <h2>✨ New Features Available!</h2>
            </div>
            <div className="update-modal-body">
              <p className="update-message">
                We've added some exciting new features to make your meditation experience even better:
              </p>
              
              <div className="feature-section">
                <div className="feature-item">
                  <div className="feature-icon">⭐</div>
                  <div className="feature-content">
                    <h3>Favorites</h3>
                    <p>Tap the star icon (☆) on any meditation or track to save it to your favorites. Click the ⭐ button in the header to view all your favorite items in one place.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">🎵</div>
                  <div className="feature-content">
                    <h3>Playlists</h3>
                    <p>Try our "Morning Breathwork" playlist! It plays three guided breathwork tracks seamlessly, one after another. More playlists coming soon!</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="update-modal-footer">
              <button
                type="button"
                className="update-refresh-button"
                onClick={handleDismissFeatureAnnouncement}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Manager Modal */}
      {showPlaylistManager && (
        <div className="update-modal-overlay">
          <div className="update-modal playlist-manager-modal">
            <div className="update-modal-header">
              <h2>🎵 Manage Playlists</h2>
            </div>
            <div className="update-modal-body">
              {editingPlaylist ? (
                <div className="playlist-editor">
                  <div className="playlist-editor-header">
                    <input
                      type="text"
                      className="playlist-name-input"
                      value={editingPlaylist.name}
                      onChange={(e) =>
                        setEditingPlaylist({ ...editingPlaylist, name: e.target.value })
                      }
                      placeholder="Playlist name"
                    />
                    <button
                      type="button"
                      className="playlist-delete-button"
                      onClick={() => {
                        if (confirm(`Delete playlist "${editingPlaylist.name}"?`)) {
                          handleDeletePlaylist(editingPlaylist.id, editingPlaylist.shared)
                          handleClosePlaylistManager()
                        }
                      }}
                      title="Delete playlist"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Action Buttons - Moved Above Content */}
                  <div className="playlist-editor-actions">
                    <button
                      type="button"
                      className="update-dismiss-button"
                      onClick={handleClosePlaylistManager}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="update-refresh-button"
                      onClick={handleSavePlaylist}
                    >
                      Save
                    </button>
                  </div>

                  <div className="playlist-items-section">
                    <div className="playlist-items-label">Items ({editingPlaylist.items.length}):</div>
                    {editingPlaylist.items.length > 0 ? (
                      <div className="playlist-items-list">
                        {editingPlaylist.items.map((playlistItem, index) => {
                          const item = items.find((i) => i.id === playlistItem.itemId)
                          if (!item) return null
                          return (
                            <div
                              key={`${playlistItem.itemId}-${index}`}
                              className={`playlist-item-row ${draggedItemIndex === index ? 'dragging' : ''}`}
                              draggable
                              onDragStart={() => setDraggedItemIndex(index)}
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.add('drag-over')
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove('drag-over')
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.remove('drag-over')
                                  if (draggedItemIndex !== null && draggedItemIndex !== index) {
                                  handleReorderPlaylistItems(
                                    editingPlaylist.id,
                                    draggedItemIndex,
                                    index,
                                    editingPlaylist.shared
                                  )
                                }
                                setDraggedItemIndex(null)
                              }}
                              onDragEnd={() => {
                                setDraggedItemIndex(null)
                                document
                                  .querySelectorAll('.playlist-item-row')
                                  .forEach((el) => el.classList.remove('drag-over'))
                              }}
                            >
                              <div className="playlist-item-drag-handle">☰</div>
                              <div className="playlist-item-info">
                                <div className="playlist-item-title">{item.title}</div>
                                {item.metadata?.album && (
                                  <div className="playlist-item-album">{item.metadata.album}</div>
                                )}
                              </div>
                              <div className="playlist-item-actions">
                                <button
                                  type="button"
                                  className={`loop-toggle-button ${playlistItem.loop ? 'active' : ''}`}
                                  onClick={() => handleToggleLoopItem(editingPlaylist.id, index, editingPlaylist.shared)}
                                  title={playlistItem.loop ? 'Disable loop' : 'Loop forever'}
                                >
                                  {playlistItem.loop ? '🔄' : '▶️'}
                                </button>
                                <button
                                  type="button"
                                  className="playlist-item-remove-button"
                                  onClick={() =>
                                    handleRemoveItemFromPlaylist(editingPlaylist.id, index, editingPlaylist.shared)
                                  }
                                  title="Remove from playlist"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="playlist-items-empty">
                        No items in this playlist. Add items below.
                      </div>
                    )}

                    <div className="playlist-add-section">
                      <div className="playlist-add-label">Add items:</div>
                      
                      {/* Search and Filter Controls */}
                      <div className="playlist-add-controls">
                        <input
                          type="search"
                          className="playlist-add-search"
                          placeholder="Search by folder or item name..."
                          value={playlistAddSearch}
                          onChange={(e) => {
                            setPlaylistAddSearch(e.target.value)
                            // Auto-expand folders when searching
                            if (e.target.value) {
                              const allPaths = new Set<string>()
                              const collectPaths = (node: FolderNode) => {
                                if (node.fullPath) allPaths.add(node.fullPath)
                                node.subfolders.forEach(collectPaths)
                              }
                              const availableItems = getAvailableItemsForPlaylist(editingPlaylist)
                              const filteredItems = filterItemsForPlaylist(availableItems, e.target.value, playlistAddGenre)
                              const tree = buildFolderTree(filteredItems)
                              collectPaths(tree)
                              setPlaylistAddExpandedFolders(allPaths)
                            }
                          }}
                        />
                        {getAvailableGenres(editingPlaylist).length > 0 && (
                          <select
                            className="playlist-add-genre-filter"
                            value={playlistAddGenre}
                            onChange={(e) => setPlaylistAddGenre(e.target.value)}
                          >
                            <option value="">All Genres</option>
                            {getAvailableGenres(editingPlaylist).map((genre) => (
                              <option key={genre} value={genre}>
                                {genre}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Tree View of Available Items */}
                      <div className="playlist-add-items-tree">
                        {(() => {
                          const availableItems = getAvailableItemsForPlaylist(editingPlaylist)
                          const filteredItems = filterItemsForPlaylist(availableItems, playlistAddSearch, playlistAddGenre)
                          const filteredTree = buildFolderTree(filteredItems)
                          
                          if (filteredItems.length === 0) {
                            return (
                              <div className="playlist-add-empty">
                                {availableItems.length === 0
                                  ? 'All available items are already in this playlist.'
                                  : 'No items match your search or filter.'}
                              </div>
                            )
                          }

                          return (
                            <PlaylistAddFolderComponent
                              folder={filteredTree}
                              level={0}
                              playlist={editingPlaylist}
                              onAddItem={(itemId: string) => handleAddItemToPlaylist(editingPlaylist.id, itemId, editingPlaylist.shared)}
                              searchQuery={playlistAddSearch}
                              expandedFolders={playlistAddExpandedFolders}
                              onToggleFolder={(path: string) => {
                                setPlaylistAddExpandedFolders((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(path)) {
                                    next.delete(path)
                                  } else {
                                    next.add(path)
                                  }
                                  return next
                                })
                              }}
                            />
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="playlists-manager-list">
                  {/* Tabs */}
                  <div className="playlist-manager-tabs">
                    <button
                      type="button"
                      className={`playlist-manager-tab ${playlistManagerTab === 'my' ? 'active' : ''}`}
                      onClick={() => setPlaylistManagerTab('my')}
                    >
                      My Playlists ({playlists.length})
                    </button>
                    <button
                      type="button"
                      className={`playlist-manager-tab ${playlistManagerTab === 'shared' ? 'active' : ''}`}
                      onClick={() => setPlaylistManagerTab('shared')}
                    >
                      Shared Playlists ({sharedPlaylists.length})
                    </button>
                  </div>

                  {/* Playlists List */}
                  {playlistManagerTab === 'my' ? (
                    playlists.length > 0 ? (
                      <div className="playlists-manager-items">
                        {playlists.map((playlist) => (
                          <div key={playlist.id} className="playlist-manager-item">
                            <div className="playlist-manager-item-info">
                              <div className="playlist-manager-item-name">{playlist.name}</div>
                              <div className="playlist-manager-item-count">
                                {playlist.items.length} item{playlist.items.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="playlist-manager-item-actions">
                              <button
                                type="button"
                                className="playlist-manager-share-button"
                                onClick={() => handleSharePlaylist(playlist)}
                                title="Share playlist"
                              >
                                🌐 Share
                              </button>
                              <button
                                type="button"
                                className="playlist-manager-edit-button"
                                onClick={() => {
                                  setEditingPlaylist(playlist)
                                  setPlaylistManagerTab('my')
                                  setPlaylistAddSearch('')
                                  setPlaylistAddGenre('')
                                  setPlaylistAddExpandedFolders(new Set())
                                }}
                                title="Edit playlist"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                className="playlist-manager-delete-button"
                                onClick={() => {
                                  if (confirm(`Delete playlist "${playlist.name}"?`)) {
                                    handleDeletePlaylist(playlist.id, false)
                                  }
                                }}
                                title="Delete playlist"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="playlists-manager-empty">No playlists yet. Create one to get started!</div>
                    )
                  ) : (
                    sharedPlaylists.length > 0 ? (
                      <div className="playlists-manager-items">
                        {sharedPlaylists.map((playlist) => (
                          <div key={playlist.id} className="playlist-manager-item">
                            <div className="playlist-manager-item-info">
                              <div className="playlist-manager-item-name">
                                {playlist.name}
                                <span className="playlist-shared-badge">🌐</span>
                              </div>
                              <div className="playlist-manager-item-count">
                                {playlist.items.length} item{playlist.items.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="playlist-manager-item-actions">
                              <button
                                type="button"
                                className="playlist-manager-share-button"
                                onClick={() => handleSharePlaylist(playlist)}
                                title="Unshare playlist"
                              >
                                🔒 Unshare
                              </button>
                              <button
                                type="button"
                                className="playlist-manager-edit-button"
                                onClick={() => {
                                  setEditingPlaylist(playlist)
                                  setPlaylistManagerTab('shared')
                                  setPlaylistAddSearch('')
                                  setPlaylistAddGenre('')
                                  setPlaylistAddExpandedFolders(new Set())
                                }}
                                title="Edit playlist"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                className="playlist-manager-delete-button"
                                onClick={() => {
                                  if (confirm(`Delete shared playlist "${playlist.name}"?`)) {
                                    handleDeletePlaylist(playlist.id, true)
                                  }
                                }}
                                title="Delete playlist"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="playlists-manager-empty">
                        No shared playlists yet. Share a playlist or import one!
                      </div>
                    )
                  )}

                  {/* Import Section */}
                  {playlistManagerTab === 'shared' && (
                    <div className="playlist-import-section">
                      <button
                        type="button"
                        className="playlist-import-button"
                        onClick={() => setShowImportModal(true)}
                      >
                        📥 Import Playlist
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="update-modal-footer">
              {!editingPlaylist && (
                <>
                  <button
                    type="button"
                    className="update-dismiss-button"
                    onClick={handleClosePlaylistManager}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="update-refresh-button"
                    onClick={handleCreatePlaylist}
                  >
                    + New Playlist
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Playlist Modal */}
      {showImportModal && (
        <div className="update-modal-overlay">
          <div className="update-modal">
            <div className="update-modal-header">
              <h2>📥 Import Playlist</h2>
            </div>
            <div className="update-modal-body">
              <p className="update-message">
                Paste the playlist JSON data below to import a shared playlist:
              </p>
              <textarea
                className="playlist-import-textarea"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder='{"name": "Playlist Name", "items": [...]}'
                rows={10}
              />
            </div>
            <div className="update-modal-footer">
              <button
                type="button"
                className="update-dismiss-button"
                onClick={() => {
                  setShowImportModal(false)
                  setImportData('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="update-refresh-button"
                onClick={handleImportPlaylist}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {updateAvailable && (
        <div className="update-modal-overlay">
          <div className="update-modal">
            <div className="update-modal-header">
              <h2>🔄 New Version Available</h2>
            </div>
            <div className="update-modal-body">
              <p className="update-version">Version {updateAvailable.version}</p>
              <p className="update-message">The app has been updated with the following changes:</p>
              <ul className="update-changelog">
                {updateAvailable.changelog.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            </div>
            <div className="update-modal-footer">
              <button
                type="button"
                className="update-refresh-button"
                onClick={handleUpdateRefresh}
              >
                Refresh Now
              </button>
              <button
                type="button"
                className="update-dismiss-button"
                onClick={() => {
                  // Store the new version but don't refresh yet
                  localStorage.setItem('drjoe-version', updateAvailable.version)
                  setCurrentVersion(updateAvailable.version)
                  setUpdateAvailable(null)
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        <h1 className="app-title">Dr Joe Library</h1>
        <p className="app-subtitle">Browse by folder structure</p>
      </header>

      <section className="controls">
        <div className="controls-row">
          <input
            type="search"
            className="search-input"
            placeholder="Search by title, course, or file…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className={`view-toggle-button ${showFavorites ? 'active' : ''}`}
            onClick={() => setShowFavorites(!showFavorites)}
            title={showFavorites ? 'Show all items' : 'Show favorites'}
          >
            {showFavorites ? '📁' : '⭐'}
          </button>
        </div>
        <div className="playlists-section">
          <div className="playlists-header">
            <div className="playlists-label">Playlists:</div>
            <div className="playlists-actions">
              <button
                type="button"
                className="playlist-manage-button"
                onClick={() => setShowPlaylistManager(true)}
                title="Manage playlists"
              >
                ⚙️ Manage
              </button>
            </div>
          </div>
          {allPlaylists.length > 0 ? (
            <div className="playlists-list">
              {allPlaylists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  className="playlist-button"
                  onClick={() => handlePlayPlaylist(playlist)}
                  title={`Play ${playlist.name} (${playlist.items.length} items)`}
                  disabled={playlist.items.length === 0}
                >
                  ▶️ {playlist.name} ({playlist.items.length})
                  {playlist.shared && <span className="playlist-shared-badge">🌐</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="playlists-empty">No playlists yet. Click "Manage" to create one.</div>
          )}
        </div>
      </section>

      <main className="media-list">
        {loading ? (
          <p className="empty-state">Loading catalog...</p>
        ) : showFavorites ? (
          favorites.size > 0 ? (
            <FolderComponent
              folder={favoritesFolder}
              level={0}
              onSelectItem={handleSelectItem}
              searchQuery={query}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onPlayPlaylist={handlePlayPlaylist}
            />
          ) : (
            <p className="empty-state">No favorites yet. Click the star icon on any item to add it to favorites.</p>
          )
        ) : (
          <FolderComponent
            folder={folderTree}
            level={0}
            onSelectItem={handleSelectItem}
            searchQuery={query}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onPlayPlaylist={handlePlayPlaylist}
          />
        )}
      </main>

      {selected && (
        <div className="player-sheet">
          <div className="player-header">
            <div>
              <div className="player-collection">{selected.collection}</div>
              <div className="player-title">{selected.title}</div>
            </div>
            <button
              type="button"
              className="close-button"
              onClick={() => setSelectedId(null)}
            >
              Close
            </button>
          </div>

          <div className="player-body">
            {MEDIA_BASE_URL ? (
              <>
                {selected.type === 'video' ? (
                  <video
                    ref={videoRef}
                    className="player-media"
                    src={buildMediaUrl(selected.path)}
                    controls
                    playsInline
                    onError={(e) => {
                      console.error('Video playback error:', e)
                      const target = e.target as HTMLVideoElement
                      console.error('Video src:', target.src)
                      console.error('Error details:', target.error)
                    }}
                    onPlay={() => {
                      // Enter fullscreen when user starts playing (requires user interaction)
                      if (videoRef.current) {
                        const video = videoRef.current
                        const enterFullscreen = async () => {
                          try {
                            if (video.requestFullscreen) {
                              await video.requestFullscreen()
                            } else if ((video as any).webkitRequestFullscreen) {
                              await (video as any).webkitRequestFullscreen()
                            } else if ((video as any).webkitEnterFullscreen) {
                              // iOS Safari
                              await (video as any).webkitEnterFullscreen()
                            } else if ((video as any).mozRequestFullScreen) {
                              await (video as any).mozRequestFullScreen()
                            } else if ((video as any).msRequestFullscreen) {
                              await (video as any).msRequestFullscreen()
                            }
                          } catch (error) {
                            console.log('Fullscreen not available:', error)
                          }
                        }
                        enterFullscreen()
                      }
                    }}
                  />
                ) : (
                  <>
                    <audio
                      ref={audioRef}
                      className="player-media"
                      src={buildMediaUrl(selected.path)}
                      controls
                      autoPlay={currentPlaylist !== null}
                      onError={(e) => {
                        console.error('Audio playback error:', e)
                        const target = e.target as HTMLAudioElement
                        console.error('Audio src:', target.src)
                        console.error('Error details:', target.error)
                      }}
                    />
                    {currentPlaylist && (
                      <div className="playlist-info">
                        <div className="playlist-name">
                          📋 {currentPlaylist.name} ({playlistIndex + 1} / {currentPlaylist.items.length})
                          {currentPlaylist.items[playlistIndex]?.loop && (
                            <span className="loop-indicator"> 🔄 Looping</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="playlist-stop-button"
                          onClick={() => {
                            setCurrentPlaylist(null)
                            setPlaylistIndex(0)
                            if (audioRef.current) {
                              audioRef.current.pause()
                            }
                          }}
                        >
                          Stop Playlist
                        </button>
                      </div>
                    )}
                  </>
                )}
                <div className="player-url-debug">
                  <details style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    <summary style={{ cursor: 'pointer', marginBottom: '0.25rem' }}>Debug Info</summary>
                    <div style={{ wordBreak: 'break-all', fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div><strong>URL:</strong> {buildMediaUrl(selected.path)}</div>
                      <div><strong>Path:</strong> {selected.path}</div>
                      <div><strong>Base URL:</strong> {MEDIA_BASE_URL || 'NOT SET'}</div>
                      <a 
                        href={buildMediaUrl(selected.path)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#818cf8', textDecoration: 'underline', marginTop: '0.25rem' }}
                      >
                        Test URL directly ↗
                      </a>
                    </div>
                  </details>
                </div>
              </>
            ) : (
              <p className="empty-state">
                Set <code>VITE_MEDIA_BASE_URL</code> in a <code>.env</code> file to stream from
                your storage bucket.
              </p>
            )}

            {selected.description && (
              <div className="player-description">
                <div className="player-description-label">Description:</div>
                <div className="player-description-text">{selected.description}</div>
              </div>
            )}
            {selected.metadata && (
              <div className="player-metadata">
                {selected.metadata.artist && (
                  <div><strong>Artist:</strong> {selected.metadata.artist}</div>
                )}
                {selected.metadata.album && (
                  <div><strong>Album:</strong> {selected.metadata.album}</div>
                )}
                {selected.metadata.year && (
                  <div><strong>Year:</strong> {selected.metadata.year}</div>
                )}
                {selected.metadata.genre && (
                  <div><strong>Genre:</strong> {selected.metadata.genre}</div>
                )}
                {selected.metadata.duration && (
                  <div>
                    <strong>Duration:</strong>{' '}
                    {Math.floor(selected.metadata.duration / 60)}:
                    {Math.floor(selected.metadata.duration % 60)
                      .toString()
                      .padStart(2, '0')}
                  </div>
                )}
              </div>
            )}
            <div className="player-footer-path">
              <span>File:</span>
              <code>{selected.path}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
