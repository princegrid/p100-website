import { createClient } from '../lib/supabase-client';

// This is the original artists data from artists.ts
const originalArtists = [
  {
    name: 'Emilu',
    url: 'https://x.com/HavesomePotat0',
    platform: 'twitter'
  },
  {
    name: 'Enigma',
    url: 'https://x.com/enigma_system',
    platform: 'twitter'
  },
  {
    name: 'DECO',
    url: 'https://x.com/you_blender3d',
    platform: 'twitter'
  },
  {
    name: 'Verihihi',
    url: 'https://x.com/HiiriVeri',
    platform: 'twitter'
  },
  {
    name: 'tori si ro',
    url: 'https://x.com/tori_si_ro',
    platform: 'twitter'
  },
  {
    name: 'Vivi',
    url: 'https://x.com/vivi_llain',
    platform: 'twitter'
  },
  {
    name: 'Davood',
    url: 'https://x.com/davoodisatwat',
    platform: 'twitter'
  },
  {
    name: 'CIII',
    url: 'https://x.com/C3_laTooth',
    platform: 'twitter'
  },
  {
    name: 'Polina Butterfly',
    url: 'https://x.com/LePapillonPo',
    platform: 'twitter'
  },
  {
    name: 'RAZZ',
    url: 'https://www.instagram.com/razz_pazazz/',
    platform: 'instagram'
  },
  {
    name: 'あなご',
    url: 'https://x.com/yuzukan02',
    platform: 'twitter'
  },
  {
    name: 'ZozosDarkRoom',
    url: 'https://x.com/ZozosDarkRoom',
    platform: 'twitter'
  },
  {
    name: 'Riversknife',
    url: 'https://x.com/riversknife',
    platform: 'twitter'
  },
  {
    name: 'Horceror',
    url: 'https://x.com/horceror',
    platform: 'twitter'
  },
  {
    name: 'Angelolo',
    url: 'https://x.com/angelolooTW',
    platform: 'twitter'
  },
  {
    name: 'eefernal',
    url: 'https://x.com/eefernal',
    platform: 'twitter'
  },
  {
    name: 'ZMPixie',
    url: 'https://x.com/zmpixie',
    platform: 'twitter'
  },
  {
    name: 'SadakosPuppy',
    url: 'https://x.com/SadakosPuppy',
    platform: 'twitter'
  },
  {
    name: 'BUMBLEBI!',
    url: 'https://x.com/bumblebi713',
    platform: 'twitter'
  },
  {
    name: 'Genpac',
    url: 'https://x.com/Genn_pacc',
    platform: 'twitter'
  },
  {
    name: 'koi boi',
    url: 'https://x.com/itkoi',
    platform: 'twitter'
  },
  {
    name: 'Rohguu',
    url: 'https://x.com/Rohguu',
    platform: 'twitter'
  },
  {
    name: 'Julcanda',
    url: 'https://x.com/julcanda',
    platform: 'twitter'
  },
  {
    name: 'Dessa',
    url: 'https://x.com/Dessa_nya',
    platform: 'twitter'
  },
  {
    name: 'YM',
    url: 'https://x.com/_kabo66',
    platform: 'twitter'
  },
  {
    name: 'AKA',
    url: 'https://x.com/akanothere',
    platform: 'twitter'
  },
  {
    name: 'DATA',
    url: 'https://x.com/data_key00',
    platform: 'twitter'
  },
  {
    name: 'Luds',
    url: 'https://x.com/SplendidSneb',
    platform: 'twitter'
  },
  {
    name: 'Esskay',
    url: 'https://x.com/EsskayAU',
    platform: 'twitter'
  },
  {
    name: 'Diet Soda',
    url: 'https://x.com/diet_soda13',
    platform: 'twitter'
  },
  {
    name: 'FeverDBD',
    url: 'https://x.com/FeverDBD',
    platform: 'twitter'
  },
  {
    name: 'Kayaya',
    url: 'https://x.com/kayadesu_yo',
    platform: 'twitter'
  },
  {
    name: 'YoCyanide',
    url: 'https://x.com/YoCyanide_',
    platform: 'twitter'
  },
  {
    name: 'YoichiBear',
    url: 'https://x.com/yoichibear',
    platform: 'twitter'
  },
  {
    name: 'Kingsleykys',
    url: 'https://x.com/kingsleykys',
    platform: 'twitter'
  },
  {
    name: 'RatLivers',
    url: 'https://x.com/RatLivers',
    platform: 'twitter'
  },
  {
    name: 'Bubba Dreemurr',
    url: 'https://x.com/BubbaDreemurr/media',
    platform: 'twitter'
  },
  {
    name: 'Shaggy',
    url: 'https://x.com/HaddieTh3Baddie',
    platform: 'twitter'
  },
  {
    name: 'RaspberryRipley',
    url: 'https://www.instagram.com/RaspberryRipley/',
    platform: 'instagram'
  },
  {
    name: 'AVA',
    url: 'https://youtube.com/@cupidbirds?si=6j71WgiOg6sJJRyJ',
    platform: 'youtube'
  }
];

export async function migrateArtistsToDatabase(): Promise<void> {
  console.log('🚀 Starting artist migration to Supabase...');
  
  const supabase = createClient();
  
  // Check if artists table exists and has data
  const { data: existingArtists, error: fetchError } = await supabase
    .from('artists')
    .select('name')
    .limit(1);
  
  if (fetchError) {
    console.error('❌ Error checking existing artists:', fetchError);
    throw fetchError;
  }
  
  if (existingArtists && existingArtists.length > 0) {
    console.log('ℹ️ Artists table already has data. Checking for duplicates...');
    
    // Get all existing artist names
    const { data: allExisting } = await supabase
      .from('artists')
      .select('name');
    
    const existingNames = allExisting?.map(a => a.name.toLowerCase()) || [];
    
    // Filter out artists that already exist
    const newArtists = originalArtists.filter(
      artist => !existingNames.includes(artist.name.toLowerCase())
    );
    
    if (newArtists.length === 0) {
      console.log('✅ All artists already exist in the database. No migration needed.');
      return;
    }
    
    console.log(`📝 Found ${newArtists.length} new artists to add...`);
    
    // Insert only new artists
    const { error: insertError } = await supabase
      .from('artists')
      .insert(newArtists);
    
    if (insertError) {
      console.error('❌ Error inserting new artists:', insertError);
      throw insertError;
    }
    
    console.log(`✅ Successfully added ${newArtists.length} new artists!`);
  } else {
    console.log('📝 Artists table is empty. Inserting all artists...');
    
    // Insert all artists
    const { error: insertError } = await supabase
      .from('artists')
      .insert(originalArtists);
    
    if (insertError) {
      console.error('❌ Error inserting artists:', insertError);
      throw insertError;
    }
    
    console.log(`✅ Successfully migrated ${originalArtists.length} artists to the database!`);
  }
  
  // Verify the migration
  const { data: finalCount, error: countError } = await supabase
    .from('artists')
    .select('id', { count: 'exact' });
  
  if (countError) {
    console.error('❌ Error verifying migration:', countError);
  } else {
    console.log(`🎉 Migration complete! Total artists in database: ${finalCount?.length || 0}`);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateArtistsToDatabase()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
