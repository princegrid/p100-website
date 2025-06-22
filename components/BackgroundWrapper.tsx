"use client";

import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

interface BackgroundWrapperProps {
  children: ReactNode;
  characterId?: string; // For character-specific pages
  backgroundUrl?: string; // Direct background URL override
}

interface BackgroundData {
  image_url: string;
  fallback_url: string | null;
}

const defaultBackgrounds = {
  '/': 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3',
  '/killers': 'https://images.unsplash.com/photo-1520637836862-4d197d17c55a?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3',
  '/survivors': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?q=80&w=2125&auto=format&fit=crop&ixlib=rb-4.0.3',
  '/credits': 'https://images.unsplash.com/photo-1519638399535-1b036603ac77?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
  '/search': '/search.png',
};

export default function BackgroundWrapper({ children, characterId, backgroundUrl }: BackgroundWrapperProps) {
  const pathname = usePathname();
  const [background, setBackground] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    // If we have a direct background URL, use it immediately
    if (backgroundUrl) {
      setBackground(backgroundUrl);
      return;
    }    async function fetchBackground() {
      // Simplified background logic using only default backgrounds
      try {
        const basePath = pathname.startsWith('/killers') ? '/killers' : 
                        pathname.startsWith('/survivors') ? '/survivors' :
                        pathname === '/credits' ? '/credits' :
                        pathname === '/search' ? '/search' : '/';
        const backgroundUrl = defaultBackgrounds[basePath as keyof typeof defaultBackgrounds] || defaultBackgrounds['/'];
        setBackground(backgroundUrl);
      } catch (error) {
        console.error('Error setting background:', error);
        setBackground(defaultBackgrounds['/']);
      }
    }
    
    fetchBackground();
  }, [pathname, characterId, backgroundUrl]);
  
  const handleImageError = () => {
    setImageError(true);
    // Fallback to default background
    const basePath = pathname.startsWith('/killers') ? '/killers' : 
                    pathname.startsWith('/survivors') ? '/survivors' :
                    pathname === '/credits' ? '/credits' :
                    pathname === '/search' ? '/search' : '/';
    setBackground(defaultBackgrounds[basePath as keyof typeof defaultBackgrounds] || defaultBackgrounds['/']);
  };
  
  return (
    <div className="relative min-h-screen">      {/* Background image layer */}
      {background && (
        <div 
          className="fixed inset-0 z-[-1] bg-black bg-cover bg-center transition-opacity duration-500"          style={{ 
            backgroundImage: `url(${background})`,
            opacity: 0.5,
            backgroundPosition: "center center"
          }}
        />
      )}
      
      {/* Hidden image for error handling */}
      {background && !imageError && (
        <img
          src={background}
          alt=""
          onError={handleImageError}
          style={{ display: 'none' }}
        />
      )}
        {/* Dark overlay for better text readability */}
      <div className="fixed inset-0 z-[-1] bg-black/50" />
      
      {/* Content */}
      {children}
    </div>
  );
}
