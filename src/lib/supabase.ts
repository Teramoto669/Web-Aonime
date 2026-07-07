/**
 * Supabase Storage REST API Upload Utility
 * Uploads user avatars to Supabase Storage without requiring the heavy SDK bundle.
 * Includes client-side compression to protect database storage limits.
 */

/**
 * Resizes and compresses an image file using HTML Canvas.
 * Caps resolution at 256x256 and encodes to JPEG at 0.85 quality.
 */
export function compressImage(file: File, maxWidth = 256, maxHeight = 256, quality = 0.85): Promise<Blob> {
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

        // Calculate aspect-ratio scale
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
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas conversion to Blob failed."));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Deletes a file from Supabase Storage using its public URL.
 */
export async function deleteAvatarFromSupabase(fileUrl: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const bucketName = "avatars";

  if (!supabaseUrl || !supabaseKey || !fileUrl) return;

  const matchPrefix = `${supabaseUrl}/storage/v1/object/public/${bucketName}/`;
  if (!fileUrl.startsWith(matchPrefix)) {
    // Not a Supabase storage URL (could be Dicebear preset URL), skip deletion
    return;
  }

  // Extract the target file path, e.g. "profiles/userId/timestamp.jpg"
  const filePath = fileUrl.replace(matchPrefix, "");

  try {
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "apiKey": supabaseKey,
        },
      }
    );
    if (!response.ok) {
      console.warn("Could not delete old avatar file from Supabase:", await response.text());
    }
  } catch (error) {
    console.error("Error executing avatar deletion in Supabase:", error);
  }
}

/**
 * Uploads a file (already compressed) to Supabase Storage.
 */
export async function uploadAvatarToSupabase(file: File | Blob, userId: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const bucketName = "avatars";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Anon Key is missing in environment variables.");
  }

  // File structure: profiles/userId/timestamp.jpg
  const filePath = `profiles/${userId}/${Date.now()}.jpg`;

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apiKey": supabaseKey,
        "Content-Type": "image/jpeg",
      },
      body: file,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Unknown upload error" }));
    throw new Error(err.message || "Failed to upload file to Supabase Storage.");
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
}
