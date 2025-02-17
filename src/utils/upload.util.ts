import { uploadFileToR2 } from './r2.util';

export async function uploadFile(file: any, folder: string): Promise<string> {
  const filename = `${Date.now()}-${file.originalname}`;
  
  // Upload to R2
  await uploadFileToR2(
    file.buffer, 
    filename, 
    folder,
    file.mimetype || 'application/octet-stream'
  );
  
  // Return only the relative path
  return `${folder}/${filename}`;
} 