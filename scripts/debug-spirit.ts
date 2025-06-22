#!/usr/bin/env ts-node

import { analyzeCharacterArtworks, logDetailedArtworkAnalysis } from '../lib/artist-analytics';

async function debugSpirit() {
  console.log('🔍 Debugging Spirit character analytics...\n');
  
  const spiritArtistUrls = [
    "https://ddejzyoxrbccpickqakz.supabase.co/storage/v1/object/public/artworks/spirit/Art%20by%20tori_si_ro.png",
    "https://ddejzyoxrbccpickqakz.supabase.co/storage/v1/object/public/artworks/spirit/art%20by%20davoodisatwat.png"
  ];
  
  const analytics = await analyzeCharacterArtworks(
    'spirit',
    'Spirit',
    'killer',
    spiritArtistUrls
  );
  
  logDetailedArtworkAnalysis(analytics);
  
  console.log('\n🐛 Manual checks:');
  
  // Import the actual functions used
  const { getArtistInfoFromUrl } = await import('../lib/artists-service');
  
  // Check each URL manually
  for (const url of spiritArtistUrls) {
    console.log(`\n🔍 Manual check for: ${url}`);
    const result = await getArtistInfoFromUrl(url, true);
    console.log(`Result: ${JSON.stringify(result, null, 2)}`);
  }
}

debugSpirit();
