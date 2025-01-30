import { uploadFileToR2 } from './r2.util';

export async function uploadFile(file: any, folder: string): Promise<string> {
  const filename = `${Date.now()}-${file.originalname}`;
  
  // Upload to R2 and get the public URL
  const publicUrl = await uploadFileToR2(file.buffer, filename, folder);
  
  return publicUrl;
} 