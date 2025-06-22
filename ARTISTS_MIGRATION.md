# Artists Database Migration

This document describes the migration from the hardcoded `artists.ts` file to a dynamic Supabase database table.

## Overview

The artists system has been refactored to use a Supabase database table instead of a hardcoded TypeScript file. This allows for dynamic management of artists through the admin panel.

## Files Changed

### New Files
- `lib/artists-service.ts` - Main service for interacting with the artists database
- `lib/artists-compat.ts` - Compatibility layer for existing components
- `migrations/create_artists_table.sql` - Database migration script
- `scripts/migrate-artists.ts` - Data migration script

### Modified Files
- `lib/supabase-client.ts` - Added artists table types
- `lib/artist-analytics.ts` - Updated to use new async service
- `app/admin-panel-x8k2m9p7/page.tsx` - Added artist management interface
- `app/killers/[slug]/page.tsx` - Updated to use compatibility layer
- `app/survivors/[slug]/page.tsx` - Updated to use compatibility layer

## Database Schema

The artists table includes:
- `id` (UUID, Primary Key)
- `name` (TEXT, Unique)
- `url` (TEXT)
- `platform` (TEXT, CHECK constraint for 'twitter', 'instagram', 'youtube')
- `slug` (TEXT, Auto-generated from name)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Migration Steps

1. **Run the database migration:**
   ```sql
   -- Execute the contents of migrations/create_artists_table.sql in your Supabase SQL editor
   ```

2. **Migrate existing data:**
   ```bash
   # Option 1: The SQL migration script already includes INSERT statements
   # Option 2: Run the TypeScript migration script
   npx ts-node scripts/migrate-artists.ts
   ```

3. **Admin Panel Access:**
   - Navigate to `/admin-panel-x8k2m9p7?key=YOUR_SECRET_KEY`
   - Use the "Manage Artists" tab to add/remove artists

## API Changes

### Old (artists.ts)
```typescript
import { getArtistByName, artists } from '@/lib/artists';

const artist = getArtistByName('ArtistName'); // Synchronous
const allArtists = artists; // Static array
```

### New (artists-service.ts)
```typescript
import { getArtistByName, getArtists } from '@/lib/artists-service';

const artist = await getArtistByName('ArtistName'); // Async
const allArtists = await getArtists(); // Dynamic from database
```

### Compatibility Layer (artists-compat.ts)
For components that can't easily be converted to async:
```typescript
import { getArtistInfoFromUrl, preloadArtistInfo } from '@/lib/artists-compat';

// In server components, preload data first
await preloadArtistInfo(urls);

// Then use synchronously
const artistInfo = getArtistInfoFromUrl(url); // Works synchronously after preload
```

## Features

### Admin Panel
- Add new artists with name, URL, and platform
- View all artists in a searchable/sortable table
- Delete artists (with confirmation)
- Real-time artist count display

### Performance
- Artist data is cached for 5 minutes
- Preloading support for server-side rendering
- Automatic slug generation for SEO

### Analytics
- Artist analytics system updated to work with database
- Detailed logging for artwork analysis
- Platform-based statistics

## Security

- Row Level Security (RLS) enabled
- Public read access for artist data
- Admin-only write access
- Input sanitization and validation

## Future Improvements

1. **Full Async Migration**: Convert remaining components to fully async
2. **Image Upload**: Add support for artist profile images
3. **Bulk Import**: CSV/JSON import functionality
4. **Search/Filter**: Enhanced search and filtering in admin panel
5. **API Endpoints**: REST/GraphQL endpoints for external access
