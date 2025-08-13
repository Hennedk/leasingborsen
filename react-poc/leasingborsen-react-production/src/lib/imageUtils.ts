export function getOptimizedImageUrl(
  url: string, 
  _options: { 
    width: number; 
    format?: 'avif' | 'webp' | 'jpg'; 
    quality?: number 
  }
): string {
  // This would integrate with your image CDN (Cloudinary, etc.)
  // For now, return original URL - implement based on your CDN
  return url
}

export function generateSrcSet(url: string, format: 'avif' | 'webp' | 'jpg') {
  const widths = [640, 768, 1024, 1280]
  return widths
    .map(w => `${getOptimizedImageUrl(url, { width: w, format })} ${w}w`)
    .join(', ')
}