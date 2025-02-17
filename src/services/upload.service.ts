import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../presentation/middlewares/errorHandler';
import pdf from 'pdf-parse';

export class UploadService {
  private static s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });

  private static async getPageCount(buffer: Buffer, mimeType: string): Promise<number | null> {
    try {
      if (mimeType === 'application/pdf') {
        const data = await pdf(buffer);
        return data.numpages;
      }
      return null;
    } catch (error) {
      console.error('Error getting page count:', error);
      return null;
    }
  }

  static async uploadFile(file: Express.Multer.File): Promise<{
    fileName: string;
    fileSize: number;
    fileType: string;
    filePath: string;
    fileHash: string;
    pageCount: number | null;
  }> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      
      // Get page count before upload
      const pageCount = await this.getPageCount(file.buffer, file.mimetype);

      const uploadParams = {
        Bucket: process.env.R2_BUCKET_NAME || '',
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));

      return {
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        filePath: uniqueFileName,
        fileHash: uniqueFileName, // Using the unique filename as hash for simplicity
        pageCount,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new AppError(500, 'Failed to upload file');
    }
  }

  static async getFileDownloadUrl(filePath: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || '',
        Key: filePath,
      });

      // URL expires in 1 hour
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      return signedUrl;
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw new AppError(500, 'Failed to generate download URL');
    }
  }

  static async getFileViewUrl(filePath: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || '',
        Key: filePath,
      });

      // URL expires in 5 minutes for viewing
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
      return signedUrl;
    } catch (error) {
      console.error('Error generating view URL:', error);
      throw new AppError(500, 'Failed to generate view URL');
    }
  }
} 