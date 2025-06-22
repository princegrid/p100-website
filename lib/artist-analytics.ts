import { getArtistInfoFromUrl, getArtists } from './artists-service';

export interface ArtworkAnalytics {
  characterId: string;
  characterName: string;
  characterType: 'killer' | 'survivor';
  totalArtistUrls: number;
  linkedArtistUrls: number;
  unlinkedArtistUrls: number;
  linkingRate: number;
  artworkDetails: ArtworkDetails[];
  unlinkedArtistNames: string[];
  missingArtists: string[];
}

export interface ArtworkDetails {
  source: 'artist_urls';
  index: number;
  originalUrl?: string;
  imageUrl: string;
  filename: string;
  extractedArtistName: string;
  mappedArtistUrl: string | null;
  platform: string | null;
  isLinked: boolean;
}

export async function analyzeCharacterArtworks(
  characterId: string,
  characterName: string,
  characterType: 'killer' | 'survivor',
  artistUrls: string[] = []
): Promise<ArtworkAnalytics> {
  
  const artworkDetails: ArtworkDetails[] = [];
  
  // Process artist_urls from database
  for (let index = 0; index < artistUrls.length; index++) {
    const url = artistUrls[index];
    const artistInfo = await getArtistInfoFromUrl(url, false);
    const filename = url.split('/').pop()?.split('?')[0] || 'unknown';
    
    artworkDetails.push({
      source: 'artist_urls',
      index: index + 1,
      originalUrl: url,
      imageUrl: url,
      filename,
      extractedArtistName: artistInfo.artistName,
      mappedArtistUrl: artistInfo.artistUrl,
      platform: artistInfo.platform,
      isLinked: !!artistInfo.artistUrl
    });
  }
  
  const totalArtistUrls = artworkDetails.length;
  const linkedArtistUrls = artworkDetails.filter(detail => detail.isLinked).length;
  const unlinkedArtistUrls = totalArtistUrls - linkedArtistUrls;
  const linkingRate = totalArtistUrls > 0 ? Math.round(linkedArtistUrls / totalArtistUrls * 100) : 0;
  
  // Get list of unlinked artist names
  const unlinkedArtistNames = artworkDetails
    .filter(detail => !detail.isLinked)
    .map(detail => detail.extractedArtistName);
    
  // Find which artists are completely missing from our database
  const allArtists = await getArtists();
  const knownArtistNames = allArtists.map(artist => artist.name.toLowerCase());
  const uniqueUnlinkedNames = Array.from(new Set(unlinkedArtistNames));
  const missingArtists = uniqueUnlinkedNames
    .filter(name => !knownArtistNames.includes(name.toLowerCase()));
    
  return {
    characterId,
    characterName,
    characterType,
    totalArtistUrls,
    linkedArtistUrls,
    unlinkedArtistUrls,
    linkingRate,
    artworkDetails,
    unlinkedArtistNames,
    missingArtists
  };
}

export function logDetailedArtworkAnalysis(analytics: ArtworkAnalytics): void {
  console.log(`\n🎨 DETAILED ARTWORK ANALYSIS FOR ${analytics.characterName.toUpperCase()}`);
  console.log('='.repeat(80));
    // Process artist_urls from database
  const artistUrlsDetails = analytics.artworkDetails.filter(detail => detail.source === 'artist_urls');
  if (artistUrlsDetails.length > 0) {
    console.log(`\n📁 ARTIST_URLS FROM DATABASE (${artistUrlsDetails.length} items):`);
    artistUrlsDetails.forEach((detail) => {
      console.log(`\n  🖼️ Processing artwork ${detail.index}/${artistUrlsDetails.length}:`);
      console.log(`    🔍 Extracting artist from URL: ${detail.originalUrl}`);
      console.log(`    📁 Extracted filename: ${detail.filename}`);
      console.log(`    📝 Extracted artist name: "${detail.extractedArtistName}"`);
      console.log(`    🔍 Database lookup result: ${detail.isLinked ? `FOUND (${detail.extractedArtistName} -> ${detail.mappedArtistUrl})` : 'NOT FOUND'}`);
      console.log(`  ${detail.index}. ${detail.isLinked ? '✅' : '❌'} "${detail.extractedArtistName}"`);
      console.log(`     📝 Original URL: ${detail.originalUrl}`);
      console.log(`     📄 Filename: ${detail.filename}`);
      console.log(`     🔗 Mapped URL: ${detail.mappedArtistUrl || 'NOT FOUND'}`);
      console.log(`     🌐 Platform: ${detail.platform || 'N/A'}`);
    });
  } else {
    console.log('\n📁 ARTIST_URLS FROM DATABASE: None found');
  }

  // Summary statistics
  console.log('\n📊 SUMMARY STATISTICS:');  console.log(`  📈 Total Artist URLs: ${analytics.totalArtistUrls}`);
  console.log(`  🔗 Linked Artists: ${analytics.linkedArtistUrls}`);
  console.log(`  ❌ Unlinked Artists: ${analytics.unlinkedArtistUrls}`);
  console.log(`  📊 Linking Rate: ${analytics.linkingRate}%`);  console.log(`  📁 From artist_urls: ${artistUrlsDetails.length}`);
  
  // Log unlinked artists for debugging
  if (analytics.unlinkedArtistUrls > 0) {
    console.log('\n⚠️ UNLINKED ARTISTS (need to be added to the artists database):');
    analytics.unlinkedArtistNames.forEach((name, index) => {
      console.log(`  ${index + 1}. "${name}"`);
    });
  }
  
  // Log missing artists specifically
  if (analytics.missingArtists.length > 0) {
    console.log('\n🚨 COMPLETELY MISSING ARTISTS (priority for adding to the artists database):');
    analytics.missingArtists.forEach((name, index) => {
      console.log(`  ${index + 1}. "${name}"`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`END ANALYSIS FOR ${analytics.characterName.toUpperCase()}\n`);
}

export async function generateArtistStatistics(): Promise<void> {
  console.log('\n📊 GLOBAL ARTIST DATABASE STATISTICS');
  console.log('='.repeat(50));
  
  const allArtists = await getArtists();
  console.log(`Total artists in database: ${allArtists.length}`);
  
  const platformCounts = allArtists.reduce((acc: Record<string, number>, artist) => {
    acc[artist.platform] = (acc[artist.platform] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nBy platform:');
  Object.entries(platformCounts).forEach(([platform, count]) => {
    console.log(`  ${platform}: ${count}`);
  });
  
  console.log('\n' + '='.repeat(50));
}
