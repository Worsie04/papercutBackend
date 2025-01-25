import path from 'path';
import fs from 'fs/promises';

export async function uploadFile(file: any, folder: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), '..', 'client', 'public', 'uploads', folder);
  await fs.mkdir(uploadDir, { recursive: true });
  
  const filename = `${Date.now()}-${file.originalname}`;
  const filepath = path.join(uploadDir, filename);
  
  await fs.writeFile(filepath, file.buffer);
  return path.join('/uploads', folder, filename).replace(/\\/g, '/');
} 