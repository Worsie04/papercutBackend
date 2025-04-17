import { v4 as uuidv4 } from 'uuid';
import File from '../models/file.model';
import RecordFile from '../models/record-file.model';
import { Record } from '../models/record.model';
import { uploadFileToR2 } from '../utils/r2.util';
import { UploadService } from './upload.service';
import path from 'path';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../presentation/middlewares/errorHandler'; 

const s3Client = new S3Client({
  region: 'auto', // R2 üçün adətən 'auto'
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
// --------------------------------

export class FileService {
  /**
   * Save uploaded file to Cloudflare R2 and database
   */
  async saveFile(file: any, userId: string): Promise<any> {
    try {
      const originalName = file.originalname;

      const fileExtension = path.extname(originalName);
      const baseName = path.basename(originalName, fileExtension);
      const shortId = uuidv4().slice(0, 3);
      const uniqueFilename = `${baseName}-${shortId}${fileExtension}`;
      


      //const fileExtension = file.originalname.split('.').pop();
      //const uniqueFilename = `${file.originalname}.${uuidv4()}.${fileExtension}`;
      const folder = 'uploads'; // You can organize files in folders

      // Upload to Cloudflare R2
      await uploadFileToR2(
        file.buffer,
        uniqueFilename,
        folder,
        file.mimetype
      );

      // Create file record in the database
      const fileRecord = await File.create({
        name: uniqueFilename,
        originalName: file.originalname,
        path: `${folder}/${uniqueFilename}`,
        type: file.mimetype,
        size: file.size,
        isAllocated: false,
        userId
      });

      return fileRecord;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  /**
   * Save multiple files to Cloudflare R2 and database
   */
  async saveMultipleFiles(files: Express.Multer.File[], userId: string): Promise<any[]> {
    try {
      const savedFiles = await Promise.all(
        files.map(file => this.saveFile(file, userId))
      );
      return savedFiles;
    } catch (error) {
      console.error('Error saving multiple files:', error);
      throw error;
    }
  }


  async getUnallocatedFiles(userId: string): Promise<any[]> {
    try {
      const filesFromDb = await File.findAll({
        where: {
          userId,
          isAllocated: false
        },
        // `path`-ı da seçdiyinizə əmin olun
        attributes: ['id', 'name', 'path', 'size', 'userId', 'isAllocated', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']],
        raw: true // Nəticələri sadə obyektlər kimi almaq üçün (Sequelize istifadə edirsinizsə)
      });
  
      if (!filesFromDb || filesFromDb.length === 0) {
          return [];
      }
  
      // Hər bir fayl üçün imzalanmış URL almaq üçün Promises massivi yaradırıq
      const filesWithUrlsPromises = filesFromDb.map(async (file) => {
        if (file.path) { // path varsa URL yaratmağa çalışırıq
          try {
            // getFileViewUrl funksiyasını çağırırıq (statik və ya instance üzərindən)
            const signedUrl = await UploadService.getFileViewUrl(file.path);
            // Orijinal fayl obyektinə 'url' xüsusiyyətini əlavə edirik
            return {
              ...file, // Faylın digər bütün xüsusiyyətləri
              url: signedUrl // Əlavə edilmiş imzalanmış URL
            };
          } catch (urlError) {
              console.error(`Error generating URL for path ${file.path}:`, urlError);
              // URL yaradıla bilmədisə, url-i null olaraq təyin edirik və ya səhvi başqa cür idarə edirik
              return { ...file, url: null };
          }
        } else {
           // Path yoxdursa, url null olacaq
           return { ...file, url: null };
        }
      });
  
      // Bütün URL generasiya proseslərinin bitməsini gözləyirik
      const filesWithUrls = await Promise.all(filesWithUrlsPromises);
  
      return filesWithUrls; // URL-ləri əlavə edilmiş fayl siyahısını qaytarırıq
  
    } catch (error) {
      console.error('Error getting unallocated files with URLs:', error);
      throw error; // Və ya daha spesifik səhv idarəetməsi
    }
  }


  async markAsUnallocated(fileIds: string[], userId: string): Promise<boolean> {
    try {
      await File.update(
        { isAllocated: false },
        {
          where: {
            id: fileIds,
            userId
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error marking files as unallocated:', error);
      throw error;
    }
  }

  async associateFilesWithRecord(fileIds: string[], recordId: string): Promise<any> {
    try {
      // Create entries in the join table
      const recordFiles = fileIds.map(fileId => ({
        id: uuidv4(),
        recordId,
        fileId
      }));
      
      await RecordFile.bulkCreate(recordFiles);
      
      // Mark files as allocated
      await File.update(
        { isAllocated: true },
        {
          where: {
            id: fileIds
          }
        }
      );
      
      return { success: true, count: fileIds.length };
    } catch (error) {
      console.error('Error associating files with record:', error);
      throw error;
    }
  }


  async extractFields(fileId: string, userId: string): Promise<any> {
    try {
      // Get the file
      const file = await File.findOne({
        where: { id: fileId, userId }
      });
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // In a real implementation, you would use a PDF extraction library here
      // For demonstration purposes, we'll return some mock extracted fields
      // This would be replaced with actual extraction logic based on your requirements
      
      // Mock extracted fields
      const extractedFields = [
        { name: 'Invoice Number', value: 'INV-12345' },
        { name: 'Date', value: new Date().toISOString().split('T')[0] },
        { name: 'Customer Name', value: 'ACME Corporation' },
        { name: 'Amount', value: '$1,234.56' },
        { name: 'Due Date', value: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] }
      ];
      
      return { extractedFields, fileId };
    } catch (error) {
      console.error('Error extracting fields:', error);
      throw error;
    }
  }


  async getFileById(fileId: string, userId: string): Promise<any> {
    try {
      return await File.findOne({
        where: { id: fileId, userId }
      });
    } catch (error) {
      console.error('Error getting file by ID:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const file = await File.findOne({
        where: { id: fileId, userId }
      });
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Delete from database
      await file.destroy();
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }



// --- NEW STATIC METHOD: Get file content as Buffer from R2 ---
static async getFileBuffer(r2Key: string): Promise<Buffer> {
  console.log(`FileService: Attempting to download file buffer for key: ${r2Key}`);
  if (!R2_BUCKET_NAME) {
      throw new AppError(500, 'R2_BUCKET_NAME is not configured.');
  }
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
  });

  try {
    const { Body } = await s3Client.send(command);
    if (!Body) {
        throw new AppError(404, `File not found or empty body in R2 for key: ${r2Key}`);
    }
    // Body is a ReadableStream | Readable | Blob | Uint8Array
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    // Assuming Body is a ReadableStream (Node.js environment)
    // Adjust if using different environment (e.g., browser ReadableStream)
    if (typeof (Body as any).on === 'function') { // Check if it behaves like a Node stream
       const stream = Body as NodeJS.ReadableStream;
       for await (const chunk of stream) {
           chunks.push(Buffer.from(chunk));
       }
       const buffer = Buffer.concat(chunks);
       console.log(`FileService: Successfully downloaded buffer (${buffer.length} bytes) for key: ${r2Key}`);
       return buffer;
    } else if (Body instanceof Uint8Array) {
        const buffer = Buffer.from(Body);
        console.log(`FileService: Successfully obtained buffer directly (${buffer.length} bytes) for key: ${r2Key}`);
        return buffer;
    } else {
        // Handle other Body types if necessary (e.g., Blob in browser)
         throw new AppError(500, `Unsupported R2 response body type for key: ${r2Key}`);
    }

  } catch (error: any) {
    console.error(`FileService: Error downloading file from R2 (key: ${r2Key}):`, error);
    // Check for specific S3 errors like NoSuchKey
    if (error.name === 'NoSuchKey') {
        throw new AppError(404, `File not found in R2 for key: ${r2Key}`);
    }
    throw new AppError(500, `Could not download file from R2: ${error.message}`);
  }
}

// --- NEW STATIC METHOD: Upload a Buffer to R2 ---
static async uploadBuffer(buffer: Buffer, r2Key: string, mimetype: string): Promise<{ success: boolean, key: string, url?: string }> {
  console.log(`FileService: Attempting to upload buffer (${buffer.length} bytes) to key: ${r2Key} with type: ${mimetype}`);
  if (!R2_BUCKET_NAME) {
    throw new AppError(500, 'R2_BUCKET_NAME is not configured.');
  }
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    Body: buffer,
    ContentType: mimetype,
    // ACL: 'public-read', // IMPORTANT: Set ACL if needed for public access, BUT R2 recommends using Bucket Policies or Signed URLs instead
  });

  try {
    await s3Client.send(command);
    console.log(`FileService: Successfully uploaded buffer to R2 key: ${r2Key}`);
    // Optionally generate a public or signed URL to return
    // For simplicity, returning success and the key for now
    // const url = await UploadService.getFileViewUrl(r2Key); // Generate signed URL if needed
    // Construct public URL if bucket is public and using R2_PUB_URL convention
    const publicUrl = process.env.R2_PUB_URL ? `https://${process.env.R2_PUB_URL}/${r2Key}` : undefined;

    return { success: true, key: r2Key, url: publicUrl }; // Return key and potentially public URL
  } catch (error: any) {
    console.error(`FileService: Error uploading buffer to R2 (key: ${r2Key}):`, error);
    throw new AppError(500, `Could not upload buffer to R2: ${error.message}`);
  }
}




}

export default new FileService();