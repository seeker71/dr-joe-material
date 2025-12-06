// Netlify Function to handle shared playlists
// Uses Supabase for persistent storage (free tier available)
// To set up: Create a Supabase project and add SUPABASE_URL and SUPABASE_KEY to Netlify environment variables

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
} else {
  console.warn('Supabase not configured. Shared playlists will not persist.')
}

// Fallback: In-memory storage (for development/testing without Supabase)
let inMemoryStorage = []

// Helper to read playlists from Supabase
async function readPlaylists() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('shared_playlists')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error reading playlists from Supabase:', error)
        return inMemoryStorage
      }
      return data || []
    } catch (error) {
      console.error('Error reading playlists:', error)
      return inMemoryStorage
    }
  }
  return inMemoryStorage
}

// Helper to write playlists to Supabase
async function writePlaylist(playlist) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('shared_playlists')
        .upsert({
          id: playlist.id,
          name: playlist.name,
          items: playlist.items,
          share_id: playlist.shareId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })
      
      if (error) {
        console.error('Error writing playlist to Supabase:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error writing playlist:', error)
      return false
    }
  } else {
    // Fallback to in-memory
    const index = inMemoryStorage.findIndex((p) => p.id === playlist.id)
    if (index >= 0) {
      inMemoryStorage[index] = playlist
    } else {
      inMemoryStorage.push(playlist)
    }
    return true
  }
}

// Helper to delete playlist from Supabase
async function deletePlaylist(playlistId) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('shared_playlists')
        .delete()
        .eq('id', playlistId)
      
      if (error) {
        console.error('Error deleting playlist from Supabase:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting playlist:', error)
      return false
    }
  } else {
    // Fallback to in-memory
    inMemoryStorage = inMemoryStorage.filter((p) => p.id !== playlistId)
    return true
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    }
  }

  try {
    const { httpMethod, path: requestPath, body } = event

    // GET /api/shared-playlists/validate - Validate Supabase setup
    if (httpMethod === 'GET' && requestPath === '/api/shared-playlists/validate') {
      const validation = {
        supabaseConfigured: !!supabase,
        supabaseUrl: supabaseUrl || 'NOT SET',
        supabaseKeyPresent: !!supabaseKey,
        supabaseKeyLength: supabaseKey ? supabaseKey.length : 0,
        timestamp: new Date().toISOString(),
      }

      // Try to connect to Supabase if configured
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('shared_playlists')
            .select('count')
            .limit(1)
          
          validation.connectionTest = error ? 'FAILED' : 'SUCCESS'
          validation.connectionError = error ? error.message : null
          validation.tableExists = !error || error.code !== '42P01' // 42P01 = table does not exist
        } catch (err) {
          validation.connectionTest = 'ERROR'
          validation.connectionError = err.message
          validation.tableExists = false
        }
      } else {
        validation.connectionTest = 'SKIPPED'
        validation.connectionError = 'Supabase not configured'
        validation.tableExists = false
      }

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation, null, 2),
      }
    }

    // GET /api/shared-playlists - Get all shared playlists
    if (httpMethod === 'GET' && requestPath === '/api/shared-playlists') {
      const playlists = await readPlaylists()
      // Transform Supabase format to app format
      const formattedPlaylists = playlists.map((p) => ({
        id: p.id,
        name: p.name,
        items: p.items || [],
        shared: true,
        shareId: p.share_id || p.shareId,
      }))
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedPlaylists),
      }
    }

    // POST /api/shared-playlists - Create or update a shared playlist
    if (httpMethod === 'POST' && requestPath === '/api/shared-playlists') {
      if (!body) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Request body is required' }),
        }
      }

      const playlist = JSON.parse(body)
      
      // Validate playlist structure
      if (!playlist.id || !playlist.name || !Array.isArray(playlist.items)) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Invalid playlist format' }),
        }
      }

      // Ensure playlist is marked as shared
      playlist.shared = true
      if (!playlist.shareId) {
        playlist.shareId = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      if (await writePlaylist(playlist)) {
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(playlist),
        }
      } else {
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Failed to save playlist' }),
        }
      }
    }

    // DELETE /api/shared-playlists/:id - Delete a shared playlist
    if (httpMethod === 'DELETE' && requestPath.startsWith('/api/shared-playlists/')) {
      const playlistId = requestPath.split('/').pop()

      if (await deletePlaylist(playlistId)) {
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ success: true }),
        }
      } else {
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Failed to delete playlist' }),
        }
      }
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    console.error('Error in shared-playlists function:', error)
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    }
  }
}

