import { Request, Response, NextFunction } from 'express';
import { uploadFile } from '../../utils/upload.util'; // Adjust path to your util
import { AuthenticatedRequest } from '../../types/express'; // Adjust path
import { AppError } from '../middlewares/errorHandler';

export class UploadController {

  /**
   * Handles POST /uploads/image - Uploads a single image file to R2.
   */
  static async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const user = authenticatedReq.user; // Get authenticated user info if needed

      if (!req.file) {
        return next(new AppError(400, 'No image file provided.'));
      }

      const type = req.query.type as string;
      let folder = 'others'; // Default folder

      if (type === 'logo') {
          folder = 'logos';
      } else if (type === 'signature') {
          folder = 'signatures';
      } else if (type === 'stamp') {
          folder = 'stamps';
      } else {
          // Optional: disallow upload if type is not specified or invalid
           return next(new AppError(400, 'Invalid or missing upload type specified in query parameter (e.g., ?type=logo).'));
      }


      const fileKey = await uploadFile(req.file, folder);

       const publicUrl = `https://${process.env.R2_PUB_URL}/${fileKey}`; 
       const result = {
           key: fileKey,
           url: publicUrl
       };


      console.log(`File uploaded successfully. Key: ${fileKey}, URL: ${publicUrl}`);

      // Send the R2 key/URL back to the client
      res.status(200).json(result);

    } catch (error: any) {
        // Handle specific errors like file type validation from multer
        if (error.message === 'Invalid file type. Only images are allowed.') {
             next(new AppError(400, error.message));
        } else {
             console.error("Upload error:", error);
             next(error); // Pass other errors to the main error handler
        }
    }
  }
}
