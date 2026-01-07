import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
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

// Format duration in seconds to MM:SS or HH:MM:SS
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function formatClockTime(seconds: number | null | undefined): string {
  if (!seconds || Number.isNaN(seconds) || seconds < 0) {
    return '0:00'
  }
  const whole = Math.floor(seconds)
  const minutes = Math.floor(whole / 60)
  const secs = whole % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
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
  coverEmoji?: string
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
  selectedItemId?: string | null
}

type PlaylistAddFolderProps = {
  folder: FolderNode
  level: number
  playlist: Playlist
  onAddItem: (itemId: string) => void
  searchQuery: string
  expandedFolders: Set<string>
  onToggleFolder: (path: string) => void
  playlistItemIds: Set<string>
  onRemoveItem: (itemId: string) => void
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
  selectedItemId,
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
              selectedItemId={selectedItemId}
            />
          ))}

          {filteredFiles.map((item) => {
            const isFavorite = favorites.has(item.id)
            const isSelected = selectedItemId === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`media-card ${isSelected ? 'media-card-active' : ''}`}
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
                  {item.metadata?.album && (
                    <div className="media-album-description">
                      <span className="media-album">{item.metadata.album}</span>
                    </div>
                  )}
                  <div className="media-meta-row">
                    {item.metadata?.genre && (
                      <span className="media-genre">{item.metadata.genre}</span>
                    )}
                    {item.metadata?.year && (
                      <span className="media-year">{item.metadata.year}</span>
                    )}
                    {item.metadata?.duration && (
                      <span className="media-duration">⏱️ {formatDuration(item.metadata.duration)}</span>
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
  playlistItemIds,
  onRemoveItem,
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
              playlistItemIds={playlistItemIds}
              onRemoveItem={onRemoveItem}
            />
          ))}

          {filteredFiles.map((item: MediaItem) => {
            const isAlreadyInPlaylist = playlistItemIds.has(item.id)
            return (
              <button
                key={item.id}
                type="button"
                data-item-id={item.id}
                className={`playlist-add-item-button ${isAlreadyInPlaylist ? 'playlist-add-item-in-playlist' : ''}`}
                onClick={() => {
                  if (isAlreadyInPlaylist) {
                    onRemoveItem(item.id)
                  } else {
                    onAddItem(item.id)
                  }
                }}
                style={{
                  paddingLeft: level === 0 ? '0.5rem' : `${Math.min((level + 1) * 1.25 + 0.5, 3)}rem`,
                  maxWidth: '100%'
                }}
                title={isAlreadyInPlaylist ? `Remove "${item.title}" from playlist` : `Add "${item.title}" to playlist`}
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
                <span className={`playlist-add-item-action ${isAlreadyInPlaylist ? 'playlist-add-item-remove' : ''}`}>
                  {isAlreadyInPlaylist ? '−' : '+'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Generate a unique share ID
const generateShareId = (): string => {
  return `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const PLAYLIST_COVER_EMOJIS = ['🌅', '🌿', '🌀', '✨', '🔥', '💜', '🌊', '🌸']
const MORNING_COLLECTION = 'Inspire, Vol 2 – 10 More Tracks to Master the Breath'
const MORNING_PLAYLIST_ID = 'morning-breathwork'
const MORNING_PLAYLIST_NAME = 'Morning Breathwork'

function App() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'playlists' | 'favorites' | 'shared' | 'search'>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [sharedPlaylists, setSharedPlaylists] = useState<Playlist[]>([])
  const [sharedPlaylistsLoaded, setSharedPlaylistsLoaded] = useState(false)
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null)
  const [playlistIndex, setPlaylistIndex] = useState(0)
  const [playlistManagerTab, setPlaylistManagerTab] = useState<'my' | 'shared'>('my')
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState<VersionInfo | null>(null)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [showFeatureAnnouncement, setShowFeatureAnnouncement] = useState(false)
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [importData, setImportData] = useState('')
  const [playlistAddSearch, setPlaylistAddSearch] = useState('')
  const [playlistAddGenre, setPlaylistAddGenre] = useState<string>('')
  const [playlistAddExpandedFolders, setPlaylistAddExpandedFolders] = useState<Set<string>>(new Set())
  const [loopMode, setLoopMode] = useState<'none' | 'all' | 'one'>('none')
  const [isPlaying, setIsPlaying] = useState(false)
  const [playlistEditorStep, setPlaylistEditorStep] = useState<'overview' | 'items' | 'share'>('overview')
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false)
  const [hasEnsuredMorningPlaylist, setHasEnsuredMorningPlaylist] = useState(false)
  const playlistAddTreeRef = useRef<HTMLDivElement | null>(null)
  // Single media element for both audio + video (critical for iOS Safari stability)
  const mediaRef = useRef<HTMLVideoElement | null>(null)
  const versionCheckIntervalRef = useRef<number | null>(null)
  const currentVersionRef = useRef<string | null>(null)
  const playlistEditorSteps = [
    { id: 'overview', label: 'Overview', description: 'Set artwork & basics' },
    { id: 'items', label: 'Items', description: 'Sequence the tracks' },
    { id: 'share', label: 'Share', description: 'Visibility & Supabase' },
  ] as const
  const supabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_ANON_KEY
  )
  const ensuringMorningRef = useRef(false)

  // Fetch shared playlists from server
  const fetchSharedPlaylists = useCallback(async () => {
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
    } finally {
      setSharedPlaylistsLoaded(true)
    }
  }, [])

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
  }, [fetchSharedPlaylists])

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

  useEffect(() => {
    if (!selectedId) {
      setIsFullPlayerVisible(false)
    }
  }, [selectedId])

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
    setIsFullPlayerVisible(false)
    setShouldAutoPlay(true)
    // Find the first item and play it
    const firstItem = items.find((item) => item.id === playlist.items[0].itemId)
    if (firstItem) {
      setSelectedId(firstItem.id)
    }
  }

  const goToPlaylistIndex = (targetIndex: number) => {
    if (!currentPlaylist) return false
    if (targetIndex < 0 || targetIndex >= currentPlaylist.items.length) return false
    const targetItem = items.find((item) => item.id === currentPlaylist.items[targetIndex].itemId)
    if (!targetItem) return false
    setPlaylistIndex(targetIndex)
    setSelectedId(targetItem.id)
    setShouldAutoPlay(true)
    return true
  }

  const goToLibraryIndex = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return false
    const targetItem = orderedItems[targetIndex]
    if (!targetItem) return false
    setCurrentPlaylist(null)
    setPlaylistIndex(0)
    setSelectedId(targetItem.id)
    setShouldAutoPlay(true)
    return true
  }

  const handleSkipNext = () => {
    if (!selected) return
    if (currentPlaylist) {
      if (playlistIndex < currentPlaylist.items.length - 1) {
        goToPlaylistIndex(playlistIndex + 1)
      } else if (loopMode === 'all') {
        goToPlaylistIndex(0)
      }
    } else {
      if (libraryIndex < orderedItems.length - 1) {
        goToLibraryIndex(libraryIndex + 1)
      } else if (loopMode === 'all') {
        goToLibraryIndex(0)
      }
    }
  }

  const handleSkipPrevious = () => {
    if (!selected) return
    // If we're a few seconds in, restart instead of going to previous item
    if (mediaRef.current && mediaRef.current.currentTime > 3) {
      mediaRef.current.currentTime = 0
      mediaRef.current.play().catch((err) => console.error('Failed to restart media:', err))
      return
    }
    if (currentPlaylist) {
      if (playlistIndex > 0) {
        goToPlaylistIndex(playlistIndex - 1)
      } else if (loopMode === 'all') {
        goToPlaylistIndex(currentPlaylist.items.length - 1)
      }
    } else {
      if (libraryIndex > 0) {
        goToLibraryIndex(libraryIndex - 1)
      } else if (loopMode === 'all') {
        goToLibraryIndex(orderedItems.length - 1)
      }
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
    setPlaylistEditorStep('overview')
    setPlaylistAddSearch('')
    setPlaylistAddGenre('')
    setPlaylistAddExpandedFolders(new Set())
    setActiveTab('playlists')
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
        setShowImportPanel(false)
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
      mediaRef.current?.pause()
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
    setCurrentPlaylist(null)
    setPlaylistIndex(0)
    setIsFullPlayerVisible(false)
    setShouldAutoPlay(true)
  }

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => a.path.localeCompare(b.path)),
    [items],
  )

  const selected = useMemo(
    () => orderedItems.find((i) => i.id === selectedId) ?? null,
    [orderedItems, selectedId],
  )

  const libraryIndex = useMemo(() => {
    if (!selected) return -1
    return orderedItems.findIndex((item) => item.id === selected.id)
  }, [orderedItems, selected])

  const selectedMediaUrl = useMemo(() => {
    if (!selected || !MEDIA_BASE_URL) return ''
    return buildMediaUrl(selected.path)
  }, [selected?.id, selected?.path])

  const requestMediaFullscreen = useCallback(() => {
    const media = mediaRef.current
    if (!media) return
    const anyMedia = media as any

    // iOS Safari: native fullscreen API for <video> (requires user gesture)
    if (typeof anyMedia.webkitEnterFullscreen === 'function') {
      try {
        anyMedia.webkitEnterFullscreen()
      } catch {
        // ignore
      }
      return
    }

    // Standard fullscreen API
    const anyEl = media as any
    const req =
      media.requestFullscreen ||
      anyEl.webkitRequestFullscreen ||
      anyEl.mozRequestFullScreen ||
      anyEl.msRequestFullscreen

    if (typeof req === 'function') {
      try {
        req.call(media)
      } catch {
        // ignore
      }
    }
  }, [])

  // Best-effort: exit fullscreen when rotating back to portrait
  useEffect(() => {
    if (!(isFullPlayerVisible && selected?.type === 'video')) return

    const handleOrientationChange = () => {
      const isPortrait = window.matchMedia('(orientation: portrait)').matches
      if (!isPortrait) return

      const anyDoc = document as any
      const exit =
        document.exitFullscreen ||
        anyDoc.webkitExitFullscreen ||
        anyDoc.mozCancelFullScreen ||
        anyDoc.msExitFullscreen
      const fullscreenEl =
        document.fullscreenElement ||
        anyDoc.webkitFullscreenElement ||
        anyDoc.mozFullScreenElement ||
        anyDoc.msFullscreenElement

      if (fullscreenEl && typeof exit === 'function') {
        try {
          exit.call(document)
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [isFullPlayerVisible, selected?.type])

  // Keep the single media element in sync with selected item
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    if (!selectedMediaUrl) {
      // Stop and reset when nothing is selected (or no media base URL)
      if (media.src) {
        media.pause()
        media.removeAttribute('src')
        media.load()
      }
      setIsPlaying(false)
      setPlaybackPosition(0)
      setPlaybackDuration(0)
      setShouldAutoPlay(false)
      return
    }

    const srcChanged = media.src !== selectedMediaUrl
    if (srcChanged) {
      media.src = selectedMediaUrl
      media.load()
      media.currentTime = 0
      setPlaybackPosition(0)
      setPlaybackDuration(0)
    }

    if (shouldAutoPlay) {
      media.play().catch((err) => {
        console.debug('Auto-play failed:', err)
      })
      setShouldAutoPlay(false)
    }
  }, [selectedMediaUrl, shouldAutoPlay])

  // Centralized media event listeners (single source of truth)
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => setPlaybackPosition(media.currentTime || 0)
    const handleLoadedMetadata = () => {
      if (media.duration && !Number.isNaN(media.duration)) {
        setPlaybackDuration(media.duration)
      } else {
        setPlaybackDuration(0)
      }
    }
    const handleEnded = () => {
      // Repeat one
      if (loopMode === 'one') {
        media.currentTime = 0
        media.play().catch(() => {})
        return
      }

      // Playlist playback
      if (currentPlaylist) {
        const nextIndex = playlistIndex + 1
        if (nextIndex < currentPlaylist.items.length) {
          setPlaylistIndex(nextIndex)
          setSelectedId(currentPlaylist.items[nextIndex].itemId)
          setShouldAutoPlay(true)
          return
        }
        if (loopMode === 'all' && currentPlaylist.items.length > 0) {
          setPlaylistIndex(0)
          setSelectedId(currentPlaylist.items[0].itemId)
          setShouldAutoPlay(true)
          return
        }
        setIsPlaying(false)
        setCurrentPlaylist(null)
        setPlaylistIndex(0)
        return
      }

      // Library browsing
      if (!selected) {
        setIsPlaying(false)
        return
      }
      const currentIndex = orderedItems.findIndex((item) => item.id === selected.id)
      if (currentIndex >= 0 && currentIndex < orderedItems.length - 1) {
        goToLibraryIndex(currentIndex + 1)
        return
      }
      if (loopMode === 'all' && orderedItems.length > 0) {
        goToLibraryIndex(0)
        return
      }
      setIsPlaying(false)
    }

    media.addEventListener('play', handlePlay)
    media.addEventListener('pause', handlePause)
    media.addEventListener('timeupdate', handleTimeUpdate)
    media.addEventListener('loadedmetadata', handleLoadedMetadata)
    media.addEventListener('ended', handleEnded)

    return () => {
      media.removeEventListener('play', handlePlay)
      media.removeEventListener('pause', handlePause)
      media.removeEventListener('timeupdate', handleTimeUpdate)
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      media.removeEventListener('ended', handleEnded)
    }
  }, [loopMode, currentPlaylist, playlistIndex, orderedItems, selected, goToLibraryIndex])

  useEffect(() => {
    if (!selected?.path) return
    const folders = selected.path.split('/').slice(0, -1)
    if (folders.length === 0) return
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      let currentPath = ''
      let updated = false
      folders.forEach((segment) => {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment
        if (!next.has(currentPath)) {
          next.add(currentPath)
          updated = true
        }
      })
      return updated ? next : prev
    })
  }, [selected?.path])

  useEffect(() => {
    if (hasEnsuredMorningPlaylist || ensuringMorningRef.current) return
    if (!sharedPlaylistsLoaded || items.length === 0) return

    const existing = sharedPlaylists.find((p) => p.id === MORNING_PLAYLIST_ID)
    if (existing) {
      setHasEnsuredMorningPlaylist(true)
      return
    }

    const morningItems = items
      .filter(
        (item) =>
          item.collection === MORNING_COLLECTION &&
          item.type === 'audio' &&
          !(item.title || '').toLowerCase().includes('introduction'),
      )
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((item) => ({
        itemId: item.id,
        loop: false,
      }))

    if (morningItems.length === 0) return

    ensuringMorningRef.current = true
    ;(async () => {
      const playlist: Playlist = {
        id: MORNING_PLAYLIST_ID,
        name: MORNING_PLAYLIST_NAME,
        items: morningItems,
        shared: true,
        shareId: generateShareId(),
        coverEmoji: '🌅',
      }
      const success = await saveSharedPlaylist(playlist)
      if (success) {
        await fetchSharedPlaylists()
        setHasEnsuredMorningPlaylist(true)
      } else {
        console.error('Failed to create Morning Breathwork playlist')
      }
      ensuringMorningRef.current = false
    })()
  }, [
    items,
    sharedPlaylists,
    sharedPlaylistsLoaded,
    hasEnsuredMorningPlaylist,
    fetchSharedPlaylists,
  ])

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


  const resetPlaylistEditorState = () => {
    setEditingPlaylist(null)
    setDraggedItemIndex(null)
    setPlaylistAddSearch('')
    setPlaylistAddGenre('')
    setPlaylistAddExpandedFolders(new Set())
    setPlaylistEditorStep('overview')
  }

  // Auto-scroll to last playlist item in add section
  useEffect(() => {
    if (editingPlaylist && editingPlaylist.items.length > 0 && playlistAddTreeRef.current) {
      // Find the last item in the playlist
      const lastItemId = editingPlaylist.items[editingPlaylist.items.length - 1].itemId
      
      // Wait for DOM to update, then find and scroll to the item
      setTimeout(() => {
        const lastItemElement = playlistAddTreeRef.current?.querySelector(
          `[data-item-id="${lastItemId}"]`
        ) as HTMLElement
        
        if (lastItemElement) {
          // Expand parent folders if needed
          let parent = lastItemElement.parentElement
          const pathsToExpand = new Set<string>()
          while (parent && parent !== playlistAddTreeRef.current) {
            if (parent.classList.contains('folder-container')) {
              const folderPath = parent.getAttribute('data-folder-path')
              if (folderPath) {
                pathsToExpand.add(folderPath)
              }
            }
            parent = parent.parentElement
          }
          
          if (pathsToExpand.size > 0) {
            setPlaylistAddExpandedFolders((prev) => {
              const next = new Set(prev)
              pathsToExpand.forEach(path => next.add(path))
              return next
            })
          }
          
          // Scroll to the item after folders are expanded
          setTimeout(() => {
            const updatedElement = playlistAddTreeRef.current?.querySelector(
              `[data-item-id="${lastItemId}"]`
            ) as HTMLElement
            if (updatedElement) {
              updatedElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 200)
        }
      }, 300)
    }
  }, [editingPlaylist?.id, editingPlaylist?.items.length])

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
    resetPlaylistEditorState()
  }


  // Get all items (including those already in playlist) for the add section
  const getAllItemsForPlaylistEditor = () => {
    return items // Show all items, not just available ones
  }


  // Get unique genres from all items
  const getAvailableGenres = () => {
    const allItems = getAllItemsForPlaylistEditor()
    const genres = new Set<string>()
    allItems.forEach((item) => {
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

  const getPlaylistDuration = (playlist: Playlist): number => {
    return playlist.items.reduce((sum, playlistItem) => {
      const item = items.find((i) => i.id === playlistItem.itemId)
      if (item?.metadata?.duration) {
        return sum + item.metadata.duration
      }
      return sum
    }, 0)
  }

  const renderPlaylistCard = (playlist: Playlist) => {
    const duration = getPlaylistDuration(playlist)
    return (
      <button
        key={playlist.id}
        type="button"
        className="playlist-card"
        onClick={() => handlePlayPlaylist(playlist)}
        title={`Play ${playlist.name} (${playlist.items.length} items)`}
        disabled={playlist.items.length === 0}
      >
        <div className="playlist-card-body">
          <div className="playlist-card-icon">{playlist.coverEmoji ?? '🎧'}</div>
          <div className="playlist-card-text">
            <div className="playlist-card-head">
              <div className="playlist-card-name">{playlist.name}</div>
              {playlist.shared && (
                <span className="playlist-shared-badge" aria-label="Shared playlist">
                  🌐
                </span>
              )}
            </div>
            <div className="playlist-card-meta">
              {playlist.items.length} item{playlist.items.length !== 1 ? 's' : ''}
              {duration > 0 && (
                <span className="playlist-card-duration"> • {formatDuration(duration)}</span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  const renderCollectionTree = (folder: FolderNode) => {
    if (loading) {
      return <p className="empty-state-card">Loading catalog...</p>
    }
    return (
      <FolderComponent
        folder={folder}
        level={0}
        onSelectItem={handleSelectItem}
        searchQuery={query}
        expandedFolders={expandedFolders}
        onToggleFolder={handleToggleFolder}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onPlayPlaylist={handlePlayPlaylist}
      selectedItemId={selectedId}
      />
    )
  }

  const canLibraryPrevious = libraryIndex > 0
  const canLibraryNext = libraryIndex >= 0 && libraryIndex < orderedItems.length - 1

  const renderFavoritesTree = () => {
    if (favorites.size === 0) {
      return <p className="empty-state-card">No favorites yet. Tap ☆ on any item to save it.</p>
    }
    return renderCollectionTree(favoritesFolder)
  }

  const canGoPrevious = currentPlaylist
    ? loopMode === 'all' || playlistIndex > 0
    : loopMode === 'all' || canLibraryPrevious
  const canGoNext = currentPlaylist
    ? loopMode === 'all' || playlistIndex < (currentPlaylist?.items.length ?? 0) - 1
    : loopMode === 'all' || canLibraryNext

  const cycleLoopMode = () => {
    setLoopMode((prev) => {
      if (prev === 'none') return 'all'
      if (prev === 'all') return 'one'
      return 'none'
    })
  }

  const handleSeek = (value: number) => {
    if (Number.isNaN(value)) return
    if (mediaRef.current) {
      mediaRef.current.currentTime = value
    }
    setPlaybackPosition(value)
  }

  const renderPlaylistEditorView = () => {
    if (!editingPlaylist) return null
    const totalDuration = getPlaylistDuration(editingPlaylist)
    const coverEmoji = editingPlaylist.coverEmoji || '🎵'

    return (
      <div className="playlist-editor-panel">
        <div className="playlist-editor-head">
          <button type="button" className="ghost-button" onClick={resetPlaylistEditorState}>
            ← Back
          </button>
          <div className="playlist-editor-header-actions">
            <button
              type="button"
              className="icon-button destructive"
              onClick={() => {
                if (confirm(`Delete playlist "${editingPlaylist.name}"?`)) {
                  handleDeletePlaylist(editingPlaylist.id, editingPlaylist.shared)
                  resetPlaylistEditorState()
                }
              }}
              title="Delete playlist"
            >
              🗑️
            </button>
            <button type="button" className="pill-button primary" onClick={handleSavePlaylist}>
              Save
            </button>
          </div>
        </div>

        <div className="playlist-stepper">
          {playlistEditorSteps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={`playlist-step ${playlistEditorStep === step.id ? 'active' : ''}`}
              onClick={() => setPlaylistEditorStep(step.id)}
            >
              <span className="playlist-step-index">{index + 1}</span>
              <span className="playlist-step-copy">
                <span className="playlist-step-label">{step.label}</span>
                <span className="playlist-step-description">{step.description}</span>
              </span>
            </button>
          ))}
        </div>

        {playlistEditorStep === 'overview' && (
          <div className="playlist-step-card">
            <label className="playlist-field">
              <span className="playlist-field-label">Playlist name</span>
              <input
                type="text"
                className="playlist-name-input"
                value={editingPlaylist.name}
                onChange={(e) => setEditingPlaylist({ ...editingPlaylist, name: e.target.value })}
                placeholder="Morning Flow"
              />
            </label>

            <div className="cover-picker">
              <div className="cover-preview">
                <span className="cover-preview-emoji">{coverEmoji}</span>
                <div>
                  <p>{editingPlaylist.name || 'Untitled playlist'}</p>
                  <span className="cover-subline">{editingPlaylist.items.length} tracks</span>
                </div>
              </div>
              <div className="cover-options">
                {PLAYLIST_COVER_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`cover-pill ${editingPlaylist.coverEmoji === emoji ? 'active' : ''}`}
                    onClick={() => setEditingPlaylist({ ...editingPlaylist, coverEmoji: emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="visibility-toggle">
              <div>
                <p className="visibility-title">{editingPlaylist.shared ? 'Shared playlist' : 'Private playlist'}</p>
                <span className="visibility-sub">
                  {editingPlaylist.shared
                    ? 'Available to anyone with the share link.'
                    : 'Stored locally on this device.'}
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={editingPlaylist.shared}
                  onChange={(e) =>
                    setEditingPlaylist({
                      ...editingPlaylist,
                      shared: e.target.checked,
                      shareId: e.target.checked ? editingPlaylist.shareId ?? generateShareId() : editingPlaylist.shareId,
                    })
                  }
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        )}

        {playlistEditorStep === 'items' && (
          <div className="playlist-step-card">
            <div className="playlist-items-label">
              Items ({editingPlaylist.items.length})
              {totalDuration > 0 && (
                <span className="playlist-total-duration"> • {formatDuration(totalDuration)}</span>
              )}
            </div>

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
                        {item.metadata?.duration && (
                          <div className="playlist-item-duration">⏱️ {formatDuration(item.metadata.duration)}</div>
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
              <div className="playlist-items-empty">No items in this playlist. Add items below.</div>
            )}

            <div className="playlist-add-section">
              <div className="playlist-add-label">Add items</div>
              <div className="playlist-add-controls">
                <input
                  type="search"
                  className="playlist-add-search"
                  placeholder="Search by folder or item name..."
                  value={playlistAddSearch}
                  onChange={(e) => {
                    setPlaylistAddSearch(e.target.value)
                    if (e.target.value) {
                      const allPaths = new Set<string>()
                      const collectPaths = (node: FolderNode) => {
                        if (node.fullPath) allPaths.add(node.fullPath)
                        node.subfolders.forEach(collectPaths)
                      }
                      const allItems = getAllItemsForPlaylistEditor()
                      const filteredItems = filterItemsForPlaylist(allItems, e.target.value, playlistAddGenre)
                      const tree = buildFolderTree(filteredItems)
                      collectPaths(tree)
                      setPlaylistAddExpandedFolders(allPaths)
                    }
                  }}
                />
                {getAvailableGenres().length > 0 && (
                  <select
                    className="playlist-add-genre-filter"
                    value={playlistAddGenre}
                    onChange={(e) => setPlaylistAddGenre(e.target.value)}
                  >
                    <option value="">All Genres</option>
                    {getAvailableGenres().map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="playlist-add-items-tree" ref={playlistAddTreeRef}>
                {(() => {
                  const allItems = getAllItemsForPlaylistEditor()
                  const filteredItems = filterItemsForPlaylist(allItems, playlistAddSearch, playlistAddGenre)
                  const filteredTree = buildFolderTree(filteredItems)

                  if (filteredItems.length === 0) {
                    return <div className="playlist-add-empty">No items match your search or filter.</div>
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
                      playlistItemIds={new Set(editingPlaylist.items.map(item => item.itemId))}
                      onRemoveItem={(itemId: string) => {
                        const playlistItemIndex = editingPlaylist.items.findIndex(pi => pi.itemId === itemId)
                        if (playlistItemIndex >= 0) {
                          handleRemoveItemFromPlaylist(editingPlaylist.id, playlistItemIndex, editingPlaylist.shared)
                        }
                      }}
                    />
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {playlistEditorStep === 'share' && (
          <div className="playlist-step-card">
            <div className="share-status-card">
              <div>
                <p className="share-status-title">{editingPlaylist.shared ? 'This playlist will be shared' : 'This playlist stays private'}</p>
                <span className="share-status-sub">
                  {editingPlaylist.shared
                    ? 'When you save, the playlist will be synced via Supabase.'
                    : 'Only available on this device until you enable sharing.'}
                </span>
              </div>
              <button
                type="button"
                className="pill-button"
                onClick={() =>
                  setEditingPlaylist({
                    ...editingPlaylist,
                    shared: !editingPlaylist.shared,
                    shareId: !editingPlaylist.shared
                      ? editingPlaylist.shareId ?? generateShareId()
                      : editingPlaylist.shareId,
                  })
                }
              >
                {editingPlaylist.shared ? 'Mark as private' : 'Enable sharing'}
              </button>
            </div>
            <div className="share-details">
              <p className="share-detail-line">
                Supabase connection:{' '}
                <strong>{supabaseConfigured ? 'Configured' : 'Not detected'}</strong>
              </p>
              {editingPlaylist.shareId && (
                <p className="share-detail-line">
                  Share ID: <code>{editingPlaylist.shareId}</code>
                </p>
              )}
              <p className="share-note">
                Saving with sharing enabled will upload the playlist to Supabase so other users can find it under “Shared”.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPlaylistListView = () => {
    const currentList = playlistManagerTab === 'my' ? playlists : sharedPlaylists
    if (currentList.length === 0) {
      return (
        <div className="playlists-manager-empty">
          {playlistManagerTab === 'my'
            ? 'No playlists yet. Create one to get started!'
            : 'No shared playlists yet. Share a playlist or import one!'}
        </div>
      )
    }

    return (
      <div className="playlists-manager-items">
        {currentList.map((playlist) => {
          const duration = getPlaylistDuration(playlist)
          return (
            <div key={playlist.id} className="playlist-manager-item">
              <div className="playlist-manager-item-info">
                <div className="playlist-manager-item-name">
                  <span className="playlist-manager-item-title">{playlist.name}</span>
                  {playlist.shared && (
                    <span className="playlist-shared-badge" aria-label="Shared playlist">
                      🌐
                    </span>
                  )}
                </div>
                <div className="playlist-manager-item-count">
                  {playlist.items.length} item{playlist.items.length !== 1 ? 's' : ''}
                  {duration > 0 && <span className="playlist-manager-duration"> • {formatDuration(duration)}</span>}
                </div>
              </div>
              <div className="playlist-manager-item-actions">
                <button
                  type="button"
                  className="playlist-manager-play-button"
                  onClick={() => handlePlayPlaylist(playlist)}
                  disabled={playlist.items.length === 0}
                  title="Play playlist"
                >
                  ▶️
                </button>
                <button
                  type="button"
                  className="playlist-manager-edit-button"
                  onClick={() => {
                    setEditingPlaylist(playlist)
                    setPlaylistManagerTab(playlist.shared ? 'shared' : 'my')
                    setPlaylistEditorStep('overview')
                    setPlaylistAddSearch('')
                    setPlaylistAddGenre('')
                    setPlaylistAddExpandedFolders(new Set())
                  }}
                  title="Edit playlist"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="playlist-manager-share-button"
                  onClick={() => handleSharePlaylist(playlist)}
                  title={playlist.shared ? 'Unshare playlist' : 'Share playlist'}
                >
                  {playlist.shared ? '🔒' : '🌐'}
                </button>
                <button
                  type="button"
                  className="playlist-manager-delete-button"
                  onClick={() => {
                    if (confirm(`Delete playlist "${playlist.name}"?`)) {
                      handleDeletePlaylist(playlist.id, playlist.shared)
                    }
                  }}
                  title="Delete playlist"
                >
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderImportPanel = () => {
    if (playlistManagerTab !== 'shared') return null
    return (
      <div className="playlist-import-panel">
        <button
          type="button"
          className="pill-button"
          onClick={() => setShowImportPanel((prev) => !prev)}
        >
          {showImportPanel ? 'Hide Import' : '📥 Import Playlist'}
        </button>
        {showImportPanel && (
          <div className="playlist-import-body">
            <p className="playlist-import-description">
              Paste playlist JSON data to import a shared playlist.
            </p>
            <textarea
              className="playlist-import-textarea"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder='{"name": "Playlist Name", "items": [...]}'
              rows={8}
            />
            <div className="playlist-import-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setShowImportPanel(false)
                  setImportData('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pill-button primary"
                onClick={handleImportPlaylist}
              >
                Import
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderHomeScreen = () => (
    <div className="screen home-screen">
      <section className="hero-section">
        <div className="hero-card">
          <div className="hero-label">Morning focus</div>
          <div className="hero-title">Breathwork Blend</div>
          <p className="hero-subtitle">
            Flow through guided meditations without interruption.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="pill-button primary"
              onClick={() => {
                const targetPlaylist =
                  sharedPlaylists.find((p) => p.id === MORNING_PLAYLIST_ID) || null
                if (targetPlaylist) {
                  handlePlayPlaylist(targetPlaylist)
                  setActiveTab('home')
                }
              }}
              disabled={!sharedPlaylists.some((p) => p.id === MORNING_PLAYLIST_ID)}
            >
              ▶️ Play Morning Breathwork
            </button>
            <button
              type="button"
              className="pill-button ghost"
              onClick={() => setActiveTab('playlists')}
            >
              Browse playlists
            </button>
          </div>
        </div>
      </section>
      
      <section className="section-block">
        <div className="section-header">
          <div>
            <p className="eyebrow">Playlists</p>
            <h2>Featured mixes</h2>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setActiveTab('playlists')}
          >
            Manage
          </button>
        </div>
        {allPlaylists.length > 0 ? (
          <div className="playlist-rail">
            {allPlaylists.map((playlist) => renderPlaylistCard(playlist))}
          </div>
        ) : (
          <p className="empty-state-card">No playlists yet. Create one in the Playlists tab.</p>
        )}
      </section>

      <section className="section-block">
        <div className="section-header">
          <div>
            <p className="eyebrow">Collections</p>
            <h2>Library folders</h2>
          </div>
          <div className="section-actions">
            <input
              type="search"
              className="inline-search"
              placeholder="Search folders or tracks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="collection-stack">
          {renderCollectionTree(folderTree)}
        </div>
      </section>
    </div>
  )

  const renderPlaylistsScreen = () => (
    <div className="screen playlists-screen">
      <div className="section-header">
        <div>
          <p className="eyebrow">Playlists</p>
          <h2>Craft your flow</h2>
        </div>
        <button
          type="button"
          className="pill-button primary"
          onClick={handleCreatePlaylist}
        >
          + New Playlist
        </button>
      </div>

      <div className="segmented-control">
        <button
          type="button"
          className={playlistManagerTab === 'my' ? 'segment active' : 'segment'}
          onClick={() => {
            setPlaylistManagerTab('my')
            resetPlaylistEditorState()
          }}
        >
          My Playlists ({playlists.length})
        </button>
        <button
          type="button"
          className={playlistManagerTab === 'shared' ? 'segment active' : 'segment'}
          onClick={() => {
            setPlaylistManagerTab('shared')
            resetPlaylistEditorState()
          }}
        >
          Shared ({sharedPlaylists.length})
        </button>
      </div>

      {editingPlaylist ? renderPlaylistEditorView() : (
        <>
          {renderPlaylistListView()}
          {renderImportPanel()}
        </>
      )}
    </div>
  )

  const renderFavoritesScreen = () => (
    <div className="screen favorites-screen">
      <div className="section-header">
        <div>
          <p className="eyebrow">Favorites</p>
          <h2>Sacred saves</h2>
        </div>
        <p className="section-caption">{favorites.size} item{favorites.size !== 1 ? 's' : ''}</p>
      </div>
      <div className="collection-stack">
        {renderFavoritesTree()}
      </div>
    </div>
  )

  const renderSharedScreen = () => (
    <div className="screen shared-screen">
      <div className="section-header">
        <div>
          <p className="eyebrow">Shared</p>
          <h2>Community playlists</h2>
        </div>
        <div className="connection-pill">
          {sharedPlaylists.length ? 'Synced via Supabase' : 'Ready to sync'}
        </div>
      </div>
      {sharedPlaylists.length ? (
        <div className="shared-list">
          {sharedPlaylists.map((playlist) => (
            <div key={playlist.id} className="shared-card">
              <div>
                <div className="shared-card-name">{playlist.name}</div>
                <div className="shared-card-meta">
                  {playlist.items.length} item{playlist.items.length !== 1 ? 's' : ''}
                  {(() => {
                    const duration = getPlaylistDuration(playlist)
                    return duration > 0 ? <span> • {formatDuration(duration)}</span> : null
                  })()}
                </div>
              </div>
              <div className="shared-card-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => handlePlayPlaylist(playlist)}
                >
                  ▶️ Play
                </button>
                <button
                  type="button"
                  className="pill-button"
                  onClick={() => {
                    setActiveTab('playlists')
                    setEditingPlaylist(playlist)
                    setPlaylistEditorStep('overview')
                    setPlaylistManagerTab('shared')
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state-card">No shared playlists yet. Share one from the Playlists tab.</p>
      )}
    </div>
  )

  const renderSearchScreen = () => (
    <div className="screen search-screen">
      <div className="section-header">
        <div>
          <p className="eyebrow">Search</p>
          <h2>Find anything</h2>
        </div>
      </div>
      <div className="search-panel">
        <input
          type="search"
          className="search-large"
          placeholder="Track, folder, genre, year…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="collection-stack">
          {query ? renderCollectionTree(folderTree) : (
            <p className="empty-state-card">Start typing to search across the entire library.</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'playlists':
        return renderPlaylistsScreen()
      case 'favorites':
        return renderFavoritesScreen()
      case 'shared':
        return renderSharedScreen()
      case 'search':
        return renderSearchScreen()
      case 'home':
      default:
        return renderHomeScreen()
    }
  }

  const navItems: { id: typeof activeTab; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'playlists', label: 'Playlists', icon: '🎧' },
    { id: 'favorites', label: 'Favorites', icon: '⭐' },
    { id: 'shared', label: 'Shared', icon: '🌐' },
    { id: 'search', label: 'Search', icon: '🔍' },
  ]

  const renderMiniPlayer = () => {
    const hasSelection = Boolean(selected)
    const subtitle = !hasSelection
      ? 'Select a track to start'
      : currentPlaylist
        ? `${currentPlaylist.name} • ${playlistIndex + 1}/${currentPlaylist.items.length}`
        : selected?.metadata?.artist || selected?.collection || ''

    return (
      <div
        className="mini-player"
        onClick={() => {
          if (hasSelection) setIsFullPlayerVisible(true)
        }}
      >
        <div className="mini-art">{hasSelection ? (selected!.type === 'video' ? '🎬' : '🎵') : '🎧'}</div>
        <div className="mini-body">
          <div className="mini-text">
            <div className="mini-title">{hasSelection ? selected!.title : 'Nothing playing'}</div>
            <div className="mini-subtitle">{subtitle}</div>
          </div>
          {/* Time slider - for all items (audio and video) */}
          <div
            className="mini-progress"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <input
              type="range"
              min={0}
              max={playbackDuration || 0}
              step={0.1}
              value={playbackDuration ? playbackPosition : 0}
              onChange={(e) => handleSeek(Number(e.target.value))}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={playbackDuration === 0}
            />
            <div className="mini-times">
              <span>{formatClockTime(playbackPosition)}</span>
              <span>{formatClockTime(playbackDuration)}</span>
            </div>
          </div>
        </div>
        <div className="mini-controls" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="transport-button"
            onClick={handleSkipPrevious}
            disabled={!hasSelection || !canGoPrevious}
            aria-label="Previous track"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 5h2v14H4V5z" fill="currentColor" />
              <path d="M8 12l12-7v14L8 12z" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className="transport-button primary"
            onClick={() => {
              if (!hasSelection) return
              const media = mediaRef.current
              if (!media) return
              if (media.paused) {
                media.play().catch((err) => console.error('Failed to play:', err))
              } else {
                media.pause()
              }
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!hasSelection || !selectedMediaUrl}
          >
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 5h4v14H6V5z" fill="currentColor" />
                <path d="M14 5h4v14h-4V5z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 5v14l14-7L5 5z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="transport-button"
            onClick={handleSkipNext}
            disabled={!hasSelection || !canGoNext}
            aria-label="Next track"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 5v14l12-7L4 5z" fill="currentColor" />
              <path d="M18 5h2v14h-2V5z" fill="currentColor" />
            </svg>
          </button>
          {/* Loop button - for all items */}
          <button
            type="button"
            className={`transport-button ${loopMode !== 'none' ? 'loop-active' : ''}`}
            onClick={cycleLoopMode}
            title={loopMode === 'none' ? 'Enable repeat all' : loopMode === 'all' ? 'Enable repeat one' : 'Disable repeat'}
            aria-label="Loop toggle"
          >
              {loopMode === 'one' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 2l4 4-4 4V7H9c-2.76 0-5 2.24-5 5 0 .35.03.69.09 1H2.05c-.03-.33-.05-.66-.05-1 0-3.87 3.13-7 7-7h8V2zM7 22l-4-4 4-4v3h8c2.76 0 5-2.24 5-5 0-.35-.03-.69-.09-1h2.04c.03.33.05.66.05 1 0 3.87-3.13 7-7 7H7v3z" fill="currentColor" />
                  <text x="12" y="14" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">1</text>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 2l4 4-4 4V7H9c-2.76 0-5 2.24-5 5 0 .35.03.69.09 1H2.05c-.03-.33-.05-.66-.05-1 0-3.87 3.13-7 7-7h8V2zM7 22l-4-4 4-4v3h8c2.76 0 5-2.24 5-5 0-.35-.03-.69-.09-1h2.04c.03.33.05.66.05 1 0 3.87-3.13 7-7 7H7v3z" fill="currentColor" />
                </svg>
              )}
          </button>
          <button
            type="button"
            className="transport-button"
            onClick={() => {
              if (hasSelection) setIsFullPlayerVisible(true)
            }}
            disabled={!hasSelection}
            aria-label="Expand player"
            title="Expand player"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  const renderFullPlayer = () => {
    if (!isFullPlayerVisible) return null

    // Empty expanded state
    if (!selected) {
      return (
        <div className="player-layer visible" onClick={() => setIsFullPlayerVisible(false)}>
          <div className="player-sheet" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="player-collapse-handle"
              onClick={() => setIsFullPlayerVisible(false)}
              aria-label="Minimize player"
            >
              <svg width="32" height="4" viewBox="0 0 32 4" fill="none">
                <rect width="32" height="4" rx="2" fill="currentColor" opacity="0.4" />
              </svg>
            </button>
            <p className="empty-state-card">Select a track to start playing.</p>
          </div>
        </div>
      )
    }

    // Video expanded: full-screen video element with minimal overlay
    if (selected.type === 'video') {
      return (
        <>
          <div className="player-video-backdrop" />
          <button
            type="button"
            className="player-video-close"
            onClick={() => setIsFullPlayerVisible(false)}
            aria-label="Close video"
          >
            ✕
          </button>
          <button
            type="button"
            className="player-video-fullscreen"
            onClick={requestMediaFullscreen}
            aria-label="Full screen"
            title="Full screen"
          >
            ⛶
          </button>
        </>
      )
    }

    const subtitle = currentPlaylist
      ? `${currentPlaylist.name} • ${playlistIndex + 1}/${currentPlaylist.items.length}`
      : selected.metadata?.artist || selected.collection

    // Audio expanded: detail sheet
    return (
      <div className="player-layer visible" onClick={() => setIsFullPlayerVisible(false)}>
        <div className="player-sheet" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="player-collapse-handle"
            onClick={() => setIsFullPlayerVisible(false)}
            aria-label="Minimize player"
          >
            <svg width="32" height="4" viewBox="0 0 32 4" fill="none">
              <rect width="32" height="4" rx="2" fill="currentColor" opacity="0.4" />
            </svg>
          </button>

          <div className="player-artwork">
            <span className="player-artwork-emoji">🎵</span>
          </div>

          <div className="player-track-info">
            <h2 className="player-track-title">{selected.title}</h2>
            <p className="player-track-subtitle">{subtitle}</p>
          </div>

          <div className="player-progress-section">
            <input
              type="range"
              className="player-progress-bar"
              min={0}
              max={playbackDuration || 0}
              step={0.1}
              value={playbackDuration ? Math.min(playbackPosition, playbackDuration) : 0}
              onChange={(e) => handleSeek(Number(e.target.value))}
              disabled={playbackDuration === 0}
            />
            <div className="player-progress-times">
              <span>{formatClockTime(playbackPosition)}</span>
              <span>{formatClockTime(playbackDuration)}</span>
            </div>
          </div>

          <div className="player-transport-row">
            <button
              type="button"
              className="transport-btn"
              onClick={handleSkipPrevious}
              disabled={!canGoPrevious}
              aria-label="Previous"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 5h2v14H4V5z" fill="currentColor" />
                <path d="M8 12l12-7v14L8 12z" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              className="transport-btn transport-btn-primary"
              onClick={() => {
                const media = mediaRef.current
                if (!media) return
                if (media.paused) {
                  media.play().catch(() => {})
                } else {
                  media.pause()
                }
              }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M6 5h4v14H6V5z" fill="currentColor" />
                  <path d="M14 5h4v14h-4V5z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M5 5v14l14-7L5 5z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="transport-btn"
              onClick={handleSkipNext}
              disabled={!canGoNext}
              aria-label="Next"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 5v14l12-7L4 5z" fill="currentColor" />
                <path d="M18 5h2v14h-2V5z" fill="currentColor" />
              </svg>
            </button>
          </div>

          <div className="player-secondary-controls">
            <button
              type="button"
              className={`player-secondary-btn ${loopMode !== 'none' ? 'active' : ''}`}
              onClick={cycleLoopMode}
              aria-label="Loop"
            >
              <span>{loopMode === 'none' ? 'Repeat' : loopMode === 'all' ? 'Repeat all' : 'Repeat one'}</span>
            </button>
          </div>

          <div className="player-meta-section">
            {selected.metadata?.album && (
              <div className="player-meta-row">
                <span className="player-meta-label">Album</span>
                <span className="player-meta-value">{selected.metadata.album}</span>
              </div>
            )}
            {selected.metadata?.genre && (
              <div className="player-meta-row">
                <span className="player-meta-label">Genre</span>
                <span className="player-meta-value">{selected.metadata.genre}</span>
              </div>
            )}
            {selected.metadata?.year && (
              <div className="player-meta-row">
                <span className="player-meta-label">Year</span>
                <span className="player-meta-value">{selected.metadata.year}</span>
              </div>
            )}
            <div className="player-meta-row">
              <span className="player-meta-label">Collection</span>
              <span className="player-meta-value">{selected.collection}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-gradient" aria-hidden="true" />
      <div className="app-content">
        <header className="shell-header">
          <div>
            <p className="eyebrow">Dr. Joe Dispenza</p>
            <h1>Meditation &amp; Course Studio</h1>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setActiveTab('shared')}
          >
            Shared
          </button>
        </header>

        <div className="banner-stack">
          {showFeatureAnnouncement && (
            <div className="app-banner feature">
              <div>
                <p className="banner-title">New: Favorites & Playlists</p>
                <p>Tap ☆ to save tracks and manage seamless playlists inside the Playlists tab.</p>
              </div>
              <button type="button" className="pill-button" onClick={handleDismissFeatureAnnouncement}>
                Got it
              </button>
            </div>
          )}
          {updateAvailable && (
            <div className="app-banner update">
              <div>
                <p className="banner-title">Update {updateAvailable.version} ready</p>
                <ul className="banner-changelog">
                  {updateAvailable.changelog.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              </div>
              <div className="banner-actions">
                <button type="button" className="pill-button primary" onClick={handleUpdateRefresh}>
                  Refresh
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    localStorage.setItem('drjoe-version', updateAvailable.version)
                    setCurrentVersion(updateAvailable.version)
                    setUpdateAvailable(null)
                  }}
                >
                  Later
                </button>
              </div>
            </div>
          )}
        </div>

        {renderActiveTab()}
      </div>

      {/* Single media element (plays both audio + video). In mini-player it is visually hidden; in expanded video it becomes full-screen. */}
      <video
        ref={mediaRef}
        className={
          isFullPlayerVisible && selected?.type === 'video'
            ? 'media-engine media-engine-video'
            : 'media-engine media-engine-audio'
        }
        playsInline
        preload="metadata"
        controls={Boolean(isFullPlayerVisible && selected?.type === 'video')}
      />

      {renderMiniPlayer()}

      <nav className="bottom-nav">
        {navItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? 'bottom-nav-button active' : 'bottom-nav-button'}
            onClick={() => {
              setActiveTab(tab.id)
              if (tab.id !== 'playlists') {
                resetPlaylistEditorState()
              }
            }}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {renderFullPlayer()}
    </div>
  )
}

export default App

