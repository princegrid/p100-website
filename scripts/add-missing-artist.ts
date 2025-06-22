#!/usr/bin/env ts-node

import { createArtist } from '../lib/artists-service';

/**
 * Add missing artist "davoodisatwat" to the Supabase artists database
 * This will resolve the Spirit character artwork linking issue
 */
async function addMissingArtist() {
  console.log('🎨 Adding missing artist "davoodisatwat" to the database...');
  
  try {
    const newArtist = await createArtist({
      name: 'davoodisatwat',
      url: 'https://x.com/davoodisatwat',
      platform: 'twitter'
    });
    
    console.log('✅ Successfully added artist:');
    console.log(`   Name: ${newArtist.name}`);
    console.log(`   URL: ${newArtist.url}`);
    console.log(`   Platform: ${newArtist.platform}`);
    console.log(`   ID: ${newArtist.id}`);
    
    console.log('\n🎯 The Spirit character artwork should now be properly linked!');
    
  } catch (error) {
    console.error('❌ Failed to add artist:', error);
    process.exit(1);
  }
}

addMissingArtist();
