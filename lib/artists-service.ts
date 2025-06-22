import { createClient, createAdminClient } from './supabase-client';

export interface Artist {
  id: string;
  name: string;
  url: string;
  platform: 'twitter' | 'instagram' | 'youtube';
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface ArtistInsert {
  name: string;
  url: string;
  platform: 'twitter' | 'instagram' | 'youtube';
}

// Cache for artists to avoid repeated database calls
let artistsCache: Artist[] | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get all artists from the database
export const getArtists = async (forceRefresh: boolean = false): Promise<Artist[]> => {
  const now = Date.now();
  
  // Return cached data if available and not expired
  if (!forceRefresh && artistsCache && now < cacheExpiry) {
    return artistsCache;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching artists:', error);
      throw error;
    }

    // Update cache
    artistsCache = data || [];
    cacheExpiry = now + CACHE_DURATION;
    
    return artistsCache;
  } catch (error) {
    console.error('Failed to fetch artists:', error);
    // Return empty array if fetch fails
    return [];
  }
};

// Get artist by name
export const getArtistByName = async (name: string): Promise<Artist | undefined> => {
  const artists = await getArtists();
  return artists.find(artist => artist.name.toLowerCase() === name.toLowerCase());
};

// Get artists by platform
export const getArtistsByPlatform = async (platform: Artist['platform']): Promise<Artist[]> => {
  const artists = await getArtists();
  return artists.filter(artist => artist.platform === platform);
};

// Get total artist count
export const getTotalArtistCount = async (): Promise<number> => {
  const artists = await getArtists();
  return artists.length;
};

// Create a new artist (admin only)
export const createArtist = async (artistData: ArtistInsert): Promise<Artist> => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('artists')
      .insert(artistData)
      .select()
      .single();

    if (error) {
      console.error('Error creating artist:', error);
      throw error;
    }

    // Clear cache to force refresh
    artistsCache = null;
    cacheExpiry = 0;

    return data;
  } catch (error) {
    console.error('Failed to create artist:', error);
    throw error;
  }
};

// Update an existing artist (admin only)
export const updateArtist = async (id: string, updates: Partial<ArtistInsert>): Promise<Artist> => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('artists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating artist:', error);
      throw error;
    }

    // Clear cache to force refresh
    artistsCache = null;
    cacheExpiry = 0;

    return data;
  } catch (error) {
    console.error('Failed to update artist:', error);
    throw error;
  }
};

// Delete an artist (admin only)
export const deleteArtist = async (id: string): Promise<void> => {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('artists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting artist:', error);
      throw error;
    }

    // Clear cache to force refresh
    artistsCache = null;
    cacheExpiry = 0;
  } catch (error) {
    console.error('Failed to delete artist:', error);
    throw error;
  }
};

// Artist URL extraction utilities with detailed logging
export const extractArtistFromFilename = async (url: string, enableLogging: boolean = false): Promise<{ artistName: string; artist: Artist | undefined }> => {
  try {
    if (enableLogging) {
      console.log(`    🔍 Extracting artist from URL: ${url}`);
    }
    
    // Extract filename from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    if (enableLogging) {
      console.log(`    📁 Extracted filename: ${filename}`);
    }
    
    // Decode URL encoding
    const decodedFilename = decodeURIComponent(filename);
    
    if (enableLogging && decodedFilename !== filename) {
      console.log(`    🔓 Decoded filename: ${decodedFilename}`);
    }
    
    // Remove file extension
    const nameWithoutExtension = decodedFilename.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
    
    if (enableLogging) {
      console.log(`    ✂️ Without extension: ${nameWithoutExtension}`);
    }
    
    // Extract artist name - look for patterns like "art by {artist}" or "by {artist}"
    const patterns = [
      { regex: /art\s+by\s+(.+)$/i, name: '"art by artist_name"' },
      { regex: /by\s+(.+)$/i, name: '"by artist_name"' },
      { regex: /(.+)$/, name: 'fallback - whole name' }
    ];
    
    let extractedName = '';
    let usedPattern = '';
    
    for (const pattern of patterns) {
      const match = nameWithoutExtension.match(pattern.regex);
      if (match) {
        extractedName = match[1].trim();
        usedPattern = pattern.name;
        break;
      }
    }
    
    if (enableLogging) {
      console.log(`    🎯 Pattern matched: ${usedPattern}`);
      console.log(`    📝 Raw extracted name: "${extractedName}"`);
    }
    
    // Clean up the extracted name (remove common prefixes/suffixes)
    const originalExtracted = extractedName;
    extractedName = extractedName
      .replace(/^(art\s+by\s+|by\s+)/i, '')  // Remove "art by" or "by" prefixes
      .replace(/[_-]/g, ' ')                  // Replace underscores and hyphens with spaces
      .trim();
    
    if (enableLogging && originalExtracted !== extractedName) {
      console.log(`    🧹 Cleaned name: "${extractedName}"`);
    }
    
    // Try to find the artist in our database
    const artist = await getArtistByName(extractedName);
    
    if (enableLogging) {
      console.log(`    🔍 Database lookup result: ${artist ? `FOUND (${artist.name} -> ${artist.url})` : 'NOT FOUND'}`);
    }
    
    return {
      artistName: extractedName,
      artist: artist
    };
  } catch (error) {
    console.error('Error extracting artist from filename:', error);
    return {
      artistName: 'Unknown Artist',
      artist: undefined
    };
  }
};

// Get artist info from artwork URL with optional detailed logging
export const getArtistInfoFromUrl = async (url: string, enableLogging: boolean = false): Promise<{
  artistName: string;
  artistUrl: string | null;
  platform: Artist['platform'] | null;
}> => {
  const { artistName, artist } = await extractArtistFromFilename(url, enableLogging);
  
  return {
    artistName: artistName,
    artistUrl: artist?.url || null,
    platform: artist?.platform || null
  };
};

// Utility function for debugging artist extraction
export const debugArtistExtraction = async (urls: string[]): Promise<void> => {
  console.log('\n🔧 DEBUGGING ARTIST EXTRACTION');
  console.log('='.repeat(50));
  
  for (let index = 0; index < urls.length; index++) {
    const url = urls[index];
    console.log(`\n${index + 1}. Testing URL: ${url}`);
    console.log('-'.repeat(40));
    const result = await getArtistInfoFromUrl(url, true);
    console.log(`Final result: "${result.artistName}" -> ${result.artistUrl || 'NOT LINKED'}`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('END DEBUGGING\n');
};

// Get all artists as a formatted list for debugging
export const getArtistsList = async (): Promise<string> => {
  const artists = await getArtists();
  return artists.map((artist, index) => 
    `${index + 1}. ${artist.name} (${artist.platform}) -> ${artist.url}`
  ).join('\n');
};

// Refresh artists cache
export const refreshArtistsCache = async (): Promise<void> => {
  await getArtists(true);
};

// Check if an artist exists by name
export const artistExists = async (name: string): Promise<boolean> => {
  const artist = await getArtistByName(name);
  return !!artist;
};

// Get artist by slug
export const getArtistBySlug = async (slug: string): Promise<Artist | undefined> => {
  const artists = await getArtists();
  return artists.find(artist => artist.slug === slug);
};
