import { Request, Response, NextFunction } from 'express';
import { TemplateService } from '../../services/template.service';
import { AuthenticatedRequest } from '../../types/express';
import { TemplateReviewerService } from '../../services/template-reviewer.service';

export class TemplateController {

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id; 

      if (!userId) {
        return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
      }

      const { sections, name } = req.body;

      if (!sections || !Array.isArray(sections)) {
        return res.status(400).json({ error: 'Şablon bölmələri (sections) göndərilməyib və ya düzgün formatda deyil.' });
      }

      const cleanedSections = sections.map(({ id, title, content }) => ({
        id,
        title, 
        content
      }));
      
      const newTemplate = await TemplateService.create({
        sections: cleanedSections,
        userId,
        name
      });

      res.status(201).json(newTemplate);

    } catch (error) {
      next(error);
    }
  }

  static async getAllByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
      }

      const templates = await TemplateService.getAllByUserId(userId);
      res.status(200).json(templates);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      const templateId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
      }
      console.log('User ID:', userId);
      console.log('Template ID:', templateId);
      const template = await TemplateService.findById(templateId, userId);
      
      if (!template) {
        return res.status(404).json({ error: 'Şablon tapılmadı.' });
      }

      res.status(200).json(template);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      const templateId = req.params.id;
      const { sections, name } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
      }

      if (!sections || !Array.isArray(sections)) {
        return res.status(400).json({ error: 'Şablon bölmələri (sections) göndərilməyib və ya düzgün formatda deyil.' });
      }

      const cleanedSections = sections.map(({ id, title, content }) => ({
        id,
        title,
        content
      }));

      const updatedTemplate = await TemplateService.update(templateId, userId, {
        sections: cleanedSections,
        name
      });

      if (!updatedTemplate) {
        return res.status(404).json({ error: 'Şablon tapılmadı və ya yeniləmək üçün icazəniz yoxdur.' });
      }

      res.status(200).json(updatedTemplate);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      const templateId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
      }

      const success = await TemplateService.delete(templateId, userId);

      if (!success) {
        return res.status(404).json({ error: 'Şablon tapılmadı və ya silmək üçün icazəniz yoxdur.' });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getReviewers(req: Request, res: Response, next: NextFunction) {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      const templateId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
      }

      const reviewers = await TemplateReviewerService.getReviewersForTemplate(templateId);
      res.status(200).json(reviewers);

    } catch (error) {
      next(error);
    }
  }

  static async updateReviewers(req: Request, res: Response, next: NextFunction) {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userId = authenticatedReq.user?.id;
      const templateId = req.params.id;
      const { reviewerUserIds } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
      }

      if (!Array.isArray(reviewerUserIds)) {
        return res.status(400).json({ error: 'reviewerUserIds göndərilməli və array formatında olmalıdır.' });
      }

      await TemplateReviewerService.updateReviewersForTemplate(templateId, reviewerUserIds, userId);

      // Uğurlu cavab (məzmunsuz)
      res.status(204).send();

    } catch (error: any) {
       if (error.message === 'Şablon tapılmadı.') {
            return res.status(404).json({ error: error.message });
       }
       if (error.message === 'Bu əməliyyat üçün icazəniz yoxdur.') {
            return res.status(403).json({ error: error.message });
       }
       if (error.message.includes('maksimum 5 reviewer') || error.message.includes('tapılmadı') || error.message.includes('yalnız bir dəfə')) {
            return res.status(400).json({ error: error.message });
       }
      next(error);
    }
  }

  static async share(req: Request, res: Response, next: NextFunction) {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const requestingUserId = authenticatedReq.user?.id;
      const templateId = req.params.id;
      const { userIds } = req.body;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
      }

      if (!templateId) {
         return res.status(400).json({ error: 'Şablon ID-si tələb olunur.' });
      }

      if (!Array.isArray(userIds)) {
        return res.status(400).json({ error: 'Paylaşılacaq istifadəçi ID-ləri (userIds) array formatında göndərilməlidir.' });
      }

      if (userIds.some(id => typeof id !== 'string')) {
           return res.status(400).json({ error: 'Göndərilən istifadəçi ID-ləri düzgün formatda deyil.' });
      }

      await TemplateService.share(templateId, userIds, requestingUserId);

      res.status(200).json({ message: 'Şablon uğurla paylaşıldı.' });

    } catch (error: any) {
       if (error.message === 'Şablon tapılmadı və ya paylaşmaq üçün icazəniz yoxdur.') {
            return res.status(403).json({ error: error.message }); // Use 403 for permission denied
       }
       if (error.message === 'Şablon tapılmadı.') { // More specific not found case
            return res.status(404).json({ error: error.message });
       }
      next(error);
    }
  }

  static async getShareHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const requestingUserId = authenticatedReq.user?.id;
        const templateId = req.params.id;

        if (!requestingUserId) {
            return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
        }
        if (!templateId) {
           return res.status(400).json({ error: 'Şablon ID-si tələb olunur.' });
        }

        const history = await TemplateService.getShareHistory(templateId, requestingUserId);

        res.status(200).json(history);

    } catch (error: any) {
        if (error.message.includes('icazəniz yoxdur')) {
             return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('tapılmadı')) {
             return res.status(404).json({ error: error.message });
        }
        next(error);
    }
  }

  static async getSharedWithMe(req: Request, res: Response, next: NextFunction) {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const requestingUserId = authenticatedReq.user?.id;

        if (!requestingUserId) {
            return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
        }

        // Call the new service method
        const sharedTemplates = await TemplateService.getSharedWithUser(requestingUserId);

        res.status(200).json(sharedTemplates);

    } catch (error: any) {
        console.error("Error in getSharedWithMe controller:", error);
        next(error);
    }
  }

  static async getByIdShared(req: Request, res: Response, next: NextFunction) {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const requestingUserId = authenticatedReq.user?.id;
        const templateId = req.params.id;

        if (!requestingUserId) {
            return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
        }
        if (!templateId) {
           return res.status(400).json({ error: 'Şablon ID-si tələb olunur.' });
        }

        // Call the new service method
        const template = await TemplateService.findByIdShared(templateId, requestingUserId);

        // Service method throws errors if not found or no permission
        res.status(200).json(template);

    } catch (error: any) {
        // Handle specific errors thrown by the service
        if (error.message === 'Şablon tapılmadı.') {
             return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Bu şablona baxmaq üçün icazəniz yoxdur.') {
             return res.status(403).json({ error: error.message });
        }
        // Pass other errors to the generic handler
        console.error("Error in getByIdShared controller:", error);
        next(error);
    }
  }

  static async deleteShare(req: Request, res: Response, next: NextFunction) {
    try {
        const authenticatedReq = req as AuthenticatedRequest;
        const requestingUserId = authenticatedReq.user?.id;
        const shareId = req.params.shareId; // Get share record ID from URL

        if (!requestingUserId) {
            return res.status(401).json({ error: 'İstifadəçi autentifikasiya olunmayıb.' });
        }
        if (!shareId) {
           return res.status(400).json({ error: 'Silinəcək paylaşma qeydinin ID-si tələb olunur.' });
        }

        // Call the service method to perform deletion with permission check
        await TemplateService.deleteShare(shareId, requestingUserId);

        res.status(204).send(); // Success, No Content

    } catch (error: any) {
        if (error.message === 'Paylaşma qeydi tapılmadı.') {
             return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Bu paylaşmanı silmək üçün icazəniz yoxdur.') {
             return res.status(403).json({ error: error.message });
        }
        console.error("Error in deleteShare controller:", error);
        next(error);
    }
  }

}
