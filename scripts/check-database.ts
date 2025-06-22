#!/usr/bin/env ts-node

import { getArtists, getArtistByName } from '../lib/artists-service';

async function checkDatabase() {
  console.log('🔍 Checking Supabase artists database...\n');
  
  try {
    const artists = await getArtists();
    console.log(`📊 Total artists in database: ${artists.length}\n`);
    
    // Check for davoodisatwat
    const davoodisatwat = await getArtistByName('davoodisatwat');
    console.log(`🔍 Searching for "davoodisatwat": ${davoodisatwat ? '✅ FOUND' : '❌ NOT FOUND'}`);
    if (davoodisatwat) {
      console.log(`   - Name: ${davoodisatwat.name}`);
      console.log(`   - URL: ${davoodisatwat.url}`);
      console.log(`   - Platform: ${davoodisatwat.platform}`);
    }
    
    // Check for Davood
    const davood = await getArtistByName('Davood');
    console.log(`🔍 Searching for "Davood": ${davood ? '✅ FOUND' : '❌ NOT FOUND'}`);
    if (davood) {
      console.log(`   - Name: ${davood.name}`);
      console.log(`   - URL: ${davood.url}`);
      console.log(`   - Platform: ${davood.platform}`);
    }
    
    // Show all artists containing "davood" (case-insensitive)
    const davoodVariants = artists.filter(a => a.name.toLowerCase().includes('davood'));
    console.log(`\n🔍 Artists containing "davood": ${davoodVariants.length}`);
    davoodVariants.forEach(artist => {
      console.log(`   - "${artist.name}" -> ${artist.url}`);
    });
    
    // Show first 20 artist names
    console.log(`\n📝 First 20 artist names in database:`);
    artists.slice(0, 20).forEach((artist, index) => {
      console.log(`   ${index + 1}. "${artist.name}"`);
    });
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabase();
