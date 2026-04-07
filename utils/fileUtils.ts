
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix e.g. "data:audio/mpeg;base64,"
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const fetchFileFromUrl = async (url: string): Promise<File> => {
    // Using allorigins as a CORS proxy to bypass browser restrictions
    const PROXY_BASE = 'https://api.allorigins.win/raw?url=';
    
    let targetUrl = url;
    const isInstagram = url.includes('instagram.com') || url.includes('instagr.am');

    if (isInstagram) {
        try {
            // 1. Fetch the HTML content via proxy
            const response = await fetch(`${PROXY_BASE}${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error('Failed to fetch page content');
            
            const html = await response.text();
            
            // 2. Look for og:video meta tag using regex for robustness
            const match = html.match(/meta\s+property="og:video"\s+content="([^"]+)"/);
            
            if (match && match[1]) {
                targetUrl = match[1];
                // Decode HTML entities if present (e.g. &amp;)
                targetUrl = targetUrl.replace(/&amp;/g, '&');
            } else {
                throw new Error('Could not find video on this Instagram page. The account might be private.');
            }
        } catch (error) {
            console.error(error);
            throw new Error('Failed to process Instagram link. Ensure the post is public and accessible.');
        }
    }

    // 3. Fetch the actual media file (Blob)
    try {
        let blobResponse: Response;
        
        // Try to fetch via proxy to avoid CORS issues on the media file itself
        // Note: Some CDNs might still block this, but it's the most reliable frontend-only method.
        blobResponse = await fetch(`${PROXY_BASE}${encodeURIComponent(targetUrl)}`);

        if (!blobResponse.ok) {
             throw new Error('Failed to download media data.');
        }

        const blob = await blobResponse.blob();
        
        // Determine mime type and name
        // Default to mp4 if unknown, as most IG videos are mp4
        const mimeType = blob.type || 'video/mp4'; 
        const extension = mimeType.split('/')[1] || 'mp4';
        const fileName = `downloaded_media.${extension}`;
        
        return new File([blob], fileName, { type: mimeType });

    } catch (error) {
        console.error(error);
        throw new Error('Failed to download the video file from the source.');
    }
};
