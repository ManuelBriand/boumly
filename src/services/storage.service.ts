import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

// Les règles Storage plafonnent l'upload à 5 Mo (cf. storage.rules). Une photo
// prise au téléphone dépasse souvent cette limite → la règle refuse et Firebase
// renvoie un « storage/unauthorized » trompeur. On redimensionne donc côté client
// avant l'envoi : borne la plus grande dimension et ré-encode en JPEG.
async function compressImage(
  file: File,
  { maxDim = 1600, quality = 0.85 }: { maxDim?: number; quality?: number } = {}
): Promise<Blob> {
  // On ne touche qu'aux images matricielles. SVG/gif non gérés par canvas → passthrough.
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // décodage impossible → on tente l'upload tel quel
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  // Si la compression n'aide pas (rare), on garde le plus petit des deux.
  return blob && blob.size < file.size ? blob : file;
}

// Upload générique : compresse puis envoie, en propageant la progression.
function uploadImage(
  path: string,
  blob: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, blob, {
    contentType: blob.type || "image/jpeg",
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

export async function uploadProductImage(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const blob = await compressImage(file);
  const timestamp = Date.now();
  return uploadImage(`products/${userId}/${timestamp}_${file.name}`, blob, onProgress);
}

export async function uploadProductImages(
  userId: string,
  files: File[],
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadProductImage(userId, files[i], (p) => {
      const overall = ((i + p / 100) / files.length) * 100;
      onProgress?.(Math.round(overall));
    });
    urls.push(url);
  }
  return urls;
}

export async function uploadStorePhoto(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const timestamp = Date.now();
  return uploadImage(`stores/${userId}/${timestamp}_${file.name}`, blob);
}

export async function uploadEventPhoto(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const timestamp = Date.now();
  return uploadImage(`events/${userId}/${timestamp}_${file.name}`, blob);
}

export async function uploadPrestationImage(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const timestamp = Date.now();
  return uploadImage(`prestations/${userId}/${timestamp}_${file.name}`, blob);
}
