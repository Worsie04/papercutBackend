import { Request, Response } from 'express';
import multer from 'multer';
import fileService from '../../services/file.service';
import { JwtUtil } from '../../utils/jwt.util';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    // Accept PDF files only
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export class FileController {
  /**
   * Upload multiple files
   */
  async uploadFiles(req: Request, res: Response): Promise<void> {
    try {
      // Extract token from authorization header
      const authHeader = req.headers.authorization;
      let userId: string;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
          // Verify the token and extract user ID
          const decoded = JwtUtil.verifyToken(token);
          userId = decoded.id;
        } catch (tokenError) {
          console.error('Token verification failed:', tokenError);
          // Allow uploads even without valid authentication for now
          // We'll create temporary user uploads
          userId = 'anonymous';
        }
      } else {
        // No authentication token provided
        // Use anonymous user ID for temporary uploads
        userId = 'anonymous';
      }
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }
      
      const savedFiles = await fileService.saveMultipleFiles(req.files, userId);
      
      res.status(201).json({ 
        message: 'Files uploaded successfully',
        files: savedFiles
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  }

  /**
   * Get all unallocated files for the current user
   */
  async getUnallocatedFiles(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
          }
      const userId = req.user.id;
      const files = await fileService.getUnallocatedFiles(userId);
      
      res.status(200).json(files);
    } catch (error) {
      console.error('Error getting unallocated files:', error);
      res.status(500).json({ error: 'Failed to get unallocated files' });
    }
  }

  /**
   * Save files as unallocated
   */
  async saveToUnallocated(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
          }
      const userId = req.user.id;
      const { fileIds } = req.body;
      
      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        res.status(400).json({ error: 'No file IDs provided' });
        return;
      }
      
      await fileService.markAsUnallocated(fileIds, userId);
      
      res.status(200).json({ 
        message: 'Files saved to unallocated successfully',
        count: fileIds.length 
      });
    } catch (error) {
      console.error('Error saving files as unallocated:', error);
      res.status(500).json({ error: 'Failed to save files as unallocated' });
    }
  }

  /**
   * Extract fields from a file
   */
  async extractFields(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
          }
      const userId = req.user.id;
      const fileId = req.params.fileId;
      
      if (!fileId) {
        res.status(400).json({ error: 'No file ID provided' });
        return;
      }
      
      const extractionResult = await fileService.extractFields(fileId, userId);
      
      res.status(200).json(extractionResult);
    } catch (error) {
      console.error('Error extracting fields:', error);
      res.status(500).json({ error: 'Failed to extract fields' });
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
          }
      const userId = req.user.id;
      const fileId = req.params.id;
      
      if (!fileId) {
        res.status(400).json({ error: 'No file ID provided' });
        return;
      }
      
      const file = await fileService.getFileById(fileId, userId);
      
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      
      res.status(200).json(file);
    } catch (error) {
      console.error('Error getting file:', error);
      res.status(500).json({ error: 'Failed to get file' });
    }
  }

  /**
   * Delete file by ID
   */
  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
          }
      const userId = req.user.id;
      const fileId = req.params.id;
      
      if (!fileId) {
        res.status(400).json({ error: 'No file ID provided' });
        return;
      }
      
      await fileService.deleteFile(fileId, userId);
      
      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  }
}

export const configureMulter = () => {
  return {
    single: () => upload.single('file'),
    multiple: () => upload.array('files', 100) // Allow up to 100 files
  };
};

export default new FileController();