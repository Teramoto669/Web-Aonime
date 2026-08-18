/**
 * Client-side Image Compression & Base64 Converter
 * Converts uploaded avatar files into lightweight Base64 JPEGs (~15-25 KB)
 * stored directly inside user profile data (Firebase Auth / Firestore).
 * Permanently eliminates the need for Supabase or external storage buckets that pause after inactivity.
 */

export function compressImageToBase64(
  file: File,
  maxWidth = 256,
  maxHeight = 256,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio scale
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to create canvas rendering context."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const base64Data = canvas.toDataURL("image/jpeg", quality);
        resolve(base64Data);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export const compressImage = compressImageToBase64;
