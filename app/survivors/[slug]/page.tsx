import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/ui/Navigation';
import BackgroundWrapper from '@/components/BackgroundWrapper';
import LensFlare from '@/components/LensFlare';
import CharacterNavigation from '@/components/CharacterNavigation';
import { createServerClient } from '@/lib/supabase-client';
import { getCharacterNavigation } from '@/lib/character-navigation';
// REMOVED: import { getArtistInfoFromUrl, preloadArtistInfo } from '@/lib/artists-compat';
import { analyzeCharacterArtworks, logDetailedArtworkAnalysis } from '@/lib/artist-analytics';

export const dynamic = 'force-dynamic';
export const revalidate = 0; 

// This helper is no longer needed with the new analytics function, but kept as requested
function getArtistFromLegacyUrl(url: string): string {
    return 'Artist'; // Placeholder
}

// This helper is no longer needed, but kept as requested
function getArtistUrlFromLegacyUrl(url: string): string | null {
    return null; // Placeholder
}

// Helper function to check if legacy header should be displayed
function shouldDisplayLegacyHeader(legacy_header_urls: (string | null)[] | null | undefined): boolean {
  return legacy_header_urls !== null && 
         legacy_header_urls !== undefined && 
         legacy_header_urls.length >= 2 &&
         !!legacy_header_urls[0] && 
         !!legacy_header_urls[1];
}

// Define types for our data
interface P100Player {
  id: string;
  username: string;
  added_at: string;
  p200: boolean | null;
}

interface SurvivorData {
  id: string;
  name: string;
  image_url: string;
  header_url?: string | null;
  artist_urls?: (string | null)[] | null;
  legacy_header_urls?: (string | null)[] | null;
  players: P100Player[];
  background_image_url?: string;
}

// Generate static params for all survivors
export async function generateStaticParams() {
  try {
    const supabase = createServerClient();
    const { data: survivors, error } = await supabase
      .from('survivors')
      .select('id')
      .order('order_num');
    
    if (error) {
      console.error('Error fetching survivors for static params:', error);
      return [];
    }
    
    if (!survivors || survivors.length === 0) {
      console.warn('No survivors found in database for static params');
      return [];
    }
    
    return survivors.map(survivor => ({
      slug: survivor.id
    }));
  } catch (error) {
    console.error('Unexpected error in generateStaticParams:', error);
    return [];
  }
}

// Fetch data for the specific survivor
async function getSurvivorData(slug: string): Promise<SurvivorData | null> {
  const supabase = createServerClient();
  
  // Get survivor data
  const { data: survivor, error: survivorError } = await supabase
    .from('survivors')
    .select('*')
    .eq('id', slug)
    .single();
  
  if (survivorError) {
    console.error('Error fetching survivor:', survivorError);
    return null;
  }
  
  if (!survivor) {
    console.log('No survivor found for slug:', slug);
    return null;
  }
  
  // Get P100 players for this survivor - try both the survivor.id and survivor.name.toLowerCase()
  let players: any[] = [];
  const { data: playersById, error: playersByIdError } = await supabase
    .from('p100_players')
    .select('*')
    .eq('survivor_id', survivor.id)
    .order('added_at', { ascending: true });

  if (playersByIdError) {
    console.error('Error fetching players by ID:', playersByIdError);
  } else if (playersById && playersById.length > 0) {
    players = playersById;
  } else {
    // Try with survivor name in lowercase as fallback
    const survivorNameLower = survivor.name.toLowerCase();
    
    const { data: playersByName, error: playersByNameError } = await supabase
      .from('p100_players')
      .select('*')
      .eq('survivor_id', survivorNameLower)
      .order('added_at', { ascending: true });
    
    if (playersByNameError) {
      console.error('Error fetching players by name:', playersByNameError);
    } else {
      players = playersByName || [];
    }
  }  
  // Artwork is now handled through artist_urls column in survivors table
  
  // Parse artist_urls if it's a JSON string
  let parsedArtistUrls = null;
  if (survivor.artist_urls) {
    try {
      parsedArtistUrls = typeof survivor.artist_urls === 'string' 
        ? JSON.parse(survivor.artist_urls) 
        : survivor.artist_urls;
      
      console.log('✓ Identified artist names:', parsedArtistUrls);
    } catch (error) {
      console.error('Error parsing artist_urls:', error);
    }
  }
  
  return {
    ...survivor,
    artist_urls: parsedArtistUrls,
    players: players || []
  };
}

export default async function SurvivorPage({ params }: { params: { slug: string } }) {
  const survivorData = await getSurvivorData(params.slug);
  
  if (!survivorData) {
    notFound();
  }
  
  // Get navigation data
  const navigation = await getCharacterNavigation(params.slug, 'survivor');
  
  // **NEW: Analyze artworks using the new efficient function**
  const analytics = await analyzeCharacterArtworks(
    survivorData.id,
    survivorData.name,
    'survivor',
    (survivorData.artist_urls as string[]) || [],
    survivorData.legacy_header_urls
  );

  // **NEW: Log the results on the server for debugging**
  logDetailedArtworkAnalysis(analytics);

  // **NEW: Create a lookup map to easily find artist info for a given URL**
  const artworkAnalyticsMap = new Map(analytics.artworkDetails.map(detail => [detail.artworkUrl, detail]));
  const galleryArtworkDetails = analytics.artworkDetails.filter(detail => survivorData.artist_urls?.includes(detail.artworkUrl));
  
  return (
    <>
      <BackgroundWrapper 
        characterId={survivorData.id}
        backgroundUrl={survivorData.background_image_url}
      >
        <LensFlare />
        <CharacterNavigation previous={navigation.previous} next={navigation.next} />
        
        <main className="container mx-auto px-4 py-8 pt-16 sm:pt-20">
          <Navigation />
          
          {/* Centered content wrapper with side artwork */}
          <div className="max-w-4xl mx-auto relative">
            
            {/* Legacy Header Layout - Two flanking images with welcome text */}
            {shouldDisplayLegacyHeader(survivorData.legacy_header_urls) ? (
              <div className="mb-12">
                {/* Desktop Layout */}
                <div className="hidden md:flex items-center justify-center gap-8 mb-8">
                  {/* Left Image - Artwork */}
                  <div className="flex-shrink-0">
                    {(() => {
                        const detail = artworkAnalyticsMap.get(survivorData.legacy_header_urls![0]!);
                        return (
                          <a href={detail?.artist?.url || '#'} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                            <div className="relative w-48 h-64 overflow-hidden rounded-lg shadow-lg">
                              <Image src={survivorData.legacy_header_urls![0]!} alt={`${survivorData.name} artwork`} fill className="object-contain" priority/>
                            </div>
                            <div className="mt-2 text-center">
                               <p className="text-sm text-gray-300">Art by {detail?.artist?.name || 'Unknown'}</p>
                            </div>
                          </a>
                        );
                    })()}
                  </div>

                  {/* Center Welcome Text */}
                  <div className="flex-1 max-w-md text-center">
                    <h1 className="text-3xl font-mono mb-6 underline">Welcome to the P100 {survivorData.name.toUpperCase()}</h1>
                    <div className="space-y-4 font-mono text-lg">
                      <p>
                        Welcome on the P100 {survivorData.name} page. Here, you will find the list, 
                        as well as multiple artwork/renders made by wonderful artists. 
                        Click on the image to go to the artist's page directly. 
                        You can also see their name below each fanart. Reminder that it isn't ordered! 
                        You can find links at the bottom of the page to contact me.
                      </p>
                      
                      {survivorData.id.includes('legendary') && (
                        <p>
                          Legendary cosmetics are considered the same as the base survivor. 
                          (i.e. : P100 Rain would be listed as P100 Ellen Ripley)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Image - Perks */}
                  <div className="flex-shrink-0">
                    {(() => {
                        const detail = artworkAnalyticsMap.get(survivorData.legacy_header_urls![1]!);
                        return (
                          <a href={detail?.artist?.url || '#'} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                            <div className="relative w-48 h-64 overflow-hidden rounded-lg shadow-lg">
                              <Image src={survivorData.legacy_header_urls![1]!} alt={`${survivorData.name} perks`} fill className="object-contain" priority/>
                            </div>
                            <div className="mt-2 text-center">
                               <p className="text-sm text-gray-300">Art by {detail?.artist?.name || 'Unknown'}</p>
                            </div>
                          </a>
                        );
                    })()}
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden space-y-6">
                  <h1 className="text-2xl font-mono mb-6 underline text-center">Welcome to the P100 {survivorData.name.toUpperCase()}</h1>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Image - Artwork */}
                    {(() => {
                        const detail = artworkAnalyticsMap.get(survivorData.legacy_header_urls![0]!);
                        return (
                            <div>
                                <a href={detail?.artist?.url || '#'} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-lg">
                                        <Image src={survivorData.legacy_header_urls![0]!} alt={`${survivorData.name} artwork`} fill className="object-contain" priority/>
                                    </div>
                                </a>
                                <div className="mt-2 text-center">
                                    <p className="text-xs text-gray-300">Art by {detail?.artist?.name || 'Unknown'}</p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Right Image - Perks */}
                    {(() => {
                        const detail = artworkAnalyticsMap.get(survivorData.legacy_header_urls![1]!);
                        return (
                            <div>
                                <a href={detail?.artist?.url || '#'} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-lg">
                                        <Image src={survivorData.legacy_header_urls![1]!} alt={`${survivorData.name} perks`} fill className="object-contain" priority/>
                                    </div>
                                </a>
                                <div className="mt-2 text-center">
                                    <p className="text-xs text-gray-300">Art by {detail?.artist?.name || 'Unknown'}</p>
                                </div>
                            </div>
                        );
                    })()}
                  </div>
                  
                  <div className="space-y-4 font-mono text-sm text-center">
                    <p>
                      Welcome on the P100 {survivorData.name} page. Here, you will find the list, 
                      as well as multiple artwork/renders made by wonderful artists. 
                      Click on the image to go to the artist's page directly. 
                      You can also see their name below each fanart. Reminder that it isn't ordered! 
                      You can find links at the bottom of the page to contact me.
                    </p>
                    
                    {survivorData.id.includes('legendary') && (
                      <p>
                        Legendary cosmetics are considered the same as the base survivor. 
                        (i.e. : P100 Rain would be listed as P100 Ellen Ripley)
                      </p>
                    )}
                  </div>
                </div>
              </div>            ) : (
              <>
                {/* Always show title */}
                <h1 className="text-3xl font-mono mb-6 underline text-center">P100 {survivorData.name.toUpperCase()}</h1>

                {/* Standard Header Image - Use header_url if available */}
                {survivorData.header_url && (
                  <div className="mb-8">
                    <div className="relative h-48 md:h-64 lg:h-80 w-full overflow-hidden rounded-lg">
                      <Image
                        src={survivorData.header_url}
                        alt={`${survivorData.name} header`}
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                )}
                
                {/* Welcome message - only show if no header */}
                {!survivorData.header_url && (
                  <div className="mb-12 space-y-4 font-mono text-xl text-center">
                    <p>
                      Welcome on the P100 {survivorData.name} page. Here, you will find the list, 
                      as well as multiple artwork/renders made by wonderful artists. 
                      Click on the image to go to the artist's page directly. 
                      You can also see their name below each fanart. Reminder that it isn't ordered! 
                      You can find links at the bottom of the page to contact me.
                    </p>
                    
                    {survivorData.id.includes('legendary') && (
                      <p>
                        Legendary cosmetics are considered the same as the base survivor. 
                        (i.e. : P100 Rain would be listed as P100 Ellen Ripley)
                      </p>
                    )}
                  </div>
                )}
              </>
            )}{/* P100 Players List with Side Artist Galleries */}
            <div className="mb-12 relative">
              {/* Left Side Artist Gallery */}
              <div className="hidden xl:block absolute -left-96 top-0 w-80 space-y-6">
                {galleryArtworkDetails.slice(0, Math.ceil(galleryArtworkDetails.length / 2)).map((detail, index) => (
                    <a key={`left-artist-url-${index}`} href={detail.artist?.url || '#'} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                        <div className="relative overflow-hidden rounded-lg shadow-lg">
                            <Image src={detail.artworkUrl} alt={`${survivorData.name} artwork by ${detail.artist?.name || 'Unknown'}`} width={1800} height={1800} className="w-full h-auto object-contain"/>
                        </div>
                        <div className="mt-2 text-center">
                            <p className="text-sm text-gray-300">Art by: {detail.artist?.name || 'Unknown'}</p>
                        </div>
                    </a>
                ))}
              </div>

              {/* Right Side Artist Gallery */}
              <div className="hidden xl:block absolute -right-96 top-0 w-80 space-y-6">
                {galleryArtworkDetails.slice(Math.ceil(galleryArtworkDetails.length / 2)).map((detail, index) => (
                    <a key={`right-artist-url-${index}`} href={detail.artist?.url || '#'} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
                        <div className="relative overflow-hidden rounded-lg shadow-lg">
                            <Image src={detail.artworkUrl} alt={`${survivorData.name} artwork by ${detail.artist?.name || 'Unknown'}`} width={1800} height={1800} className="w-full h-auto object-contain"/>
                        </div>
                        <div className="mt-2 text-center">
                            <p className="text-sm text-gray-300">Art by: {detail.artist?.name || 'Unknown'}</p>
                        </div>
                    </a>
                ))}
              </div>

              <h2 className="text-xl font-mono mb-6 text-center">The P100 {survivorData.name} list starts here:</h2>
              {survivorData.players.length === 0 ? (
                <div className="bg-black/40 border border-red-600/30 rounded-lg p-8 text-center">
                  <p className="font-mono text-lg text-gray-400">No P100 players found for this survivor yet.</p>
                  <p className="font-mono text-sm text-gray-500 mt-2">Be the first to submit your P100!</p>
                </div>
              ) : (
                <div className="bg-black/30 border border-red-600/20 rounded-lg p-6 backdrop-blur-sm">
                  <div className="mb-4 flex items-center justify-center gap-4 text-sm text-gray-400 font-mono">
                    <span>Total P100 Players: {survivorData.players.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {survivorData.players.map((player) => (
                      <div 
                        key={player.id} 
                        className="group relative bg-black/40 border border-red-600/20 rounded-md p-3 hover:border-red-500/40 hover:bg-black/60 transition-all duration-200"
                        role="listitem"
                        tabIndex={0}
                      >                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-sm text-gray-200 group-hover:text-white transition-colors">
                            {player.username}
                          </span>
                          {player.p200 && (
                            <div 
                              className="flex-shrink-0 w-6 h-6 relative ml-2"
                              title="P200 means a player reached P100 on the same character twice. This is a rare achievement and the players on this list deserve full credit for the time and dedication it takes to reach it."
                            >
                              <Image
                                src="/p200.png"
                                alt="P200 Achievement"
                                width={24}
                                height={24}
                                className="object-contain"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-red-600/20 text-center">
                    <p className="text-xs text-gray-500 font-mono">
                      Last updated: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile Artwork Gallery */}
            {galleryArtworkDetails.length > 0 && (
              <div className="mb-12 xl:hidden">
                <h2 className="text-xl font-mono mb-4 text-center">Artwork Gallery</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {galleryArtworkDetails.map((detail, index) => (
                    <a key={`mobile-artwork-${index}`} href={detail.artist?.url || '#'} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="relative overflow-hidden rounded-lg">
                        <Image
                          src={detail.artworkUrl}
                          alt={`${survivorData.name} artwork by ${detail.artist?.name || 'Unknown'}`}
                          width={0} height={0} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="w-full h-auto transition-transform hover:scale-105"
                          style={{ width: 'auto', height: 'auto' }} loading="lazy"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-center">
                          <p className="text-sm">Art by: {detail.artist?.name || 'Unknown'}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </BackgroundWrapper>
    </>
  );
}