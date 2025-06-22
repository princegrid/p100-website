import { getArtistInfoFromUrl as getArtistInfoFromUrlAsync } from './artists-service';

// Cache for artist info to avoid repeated database calls during page rendering
const artistInfoCache = new Map<string, { artistName: string; artistUrl: string | null; platform: string | null }>();

// This is a compatibility layer to maintain the synchronous interface while using the async service
// For server-side rendering, we'll need to preload the artist data
export function getArtistInfoFromUrl(url: string, enableLogging?: boolean): { artistName: string; artistUrl: string | null; platform: string | null } {
  // Check cache first
  if (artistInfoCache.has(url)) {
    return artistInfoCache.get(url)!;
  }
  
  // For now, return a placeholder that will be replaced by the actual data
  // In a real implementation, this would need to be handled differently
  const placeholder = {
    artistName: 'Loading...',
    artistUrl: null,
    platform: null
  };
  
  // Store placeholder in cache
  artistInfoCache.set(url, placeholder);
  
  // Asynchronously load the real data and update cache
  getArtistInfoFromUrlAsync(url, enableLogging).then(result => {
    artistInfoCache.set(url, result);
  }).catch(error => {
    console.error('Error loading artist info:', error);
    artistInfoCache.set(url, {
      artistName: 'Unknown Artist',
      artistUrl: null,
      platform: null
    });
  });
  
  return placeholder;
}

// Preload artist info for a batch of URLs
export async function preloadArtistInfo(urls: string[]): Promise<void> {
  const promises = urls.map(async (url) => {
    if (!artistInfoCache.has(url)) {
      try {
        const result = await getArtistInfoFromUrlAsync(url);
        artistInfoCache.set(url, result);
      } catch (error) {
        console.error('Error preloading artist info for', url, error);
        artistInfoCache.set(url, {
          artistName: 'Unknown Artist',
          artistUrl: null,
          platform: null
        });
      }
    }
  });
  
  await Promise.all(promises);
}

// Clear the cache
export function clearArtistInfoCache(): void {
  artistInfoCache.clear();
}

// Get cached artist info
export function getCachedArtistInfo(url: string): { artistName: string; artistUrl: string | null; platform: string | null } | null {
  return artistInfoCache.get(url) || null;
}
