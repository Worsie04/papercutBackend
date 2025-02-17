import { Record, RecordStatus } from '../models/record.model';
import { User } from '../models/user.model';
import { Cabinet, CustomField, CabinetApprover } from '../models/cabinet.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { Op } from 'sequelize';
import { RecordVersion } from '../models/record-version.model';
import { sequelize } from '../infrastructure/database/sequelize';
import { CabinetMember } from '../models/cabinet-member.model';
import { RecordNoteComment } from '../models/record-note-comment.model';

interface CustomFieldValue {
  fieldId: number;
  value: any;
  type: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  filePath?: string;
  fileHash?: string;
}

interface ExtendedCustomField extends CustomField {
  characterLimit?: number;
}

export class RecordService {
  
  static async createRecord(data: {
    title: string;
    cabinetId: string;
    creatorId: string;
    customFields: { [key: string]: any };
    status: RecordStatus;
    isTemplate: boolean;
    isActive: boolean;
    tags: string[];
  }) {
    // Validate title
    if (!data.title || !data.title.trim()) {
      throw new AppError(400, 'Record title is required');
    }

    // Validate cabinet exists and get its custom fields configuration
    const cabinet = await Cabinet.findByPk(data.cabinetId);
    if (!cabinet) {
      throw new AppError(400, 'Cabinet not found');
    }

    // Validate creator exists
    const creator = await User.findByPk(data.creatorId);
    if (!creator) {
      throw new AppError(400, 'Creator not found');
    }

    // Validate custom fields against cabinet configuration
    const validatedFields = await RecordService.validateCustomFields(data.customFields, cabinet.customFields);

    // Find the first attachment field if any
    let fileInfo = null;
    for (const fieldId in validatedFields) {
      const field = validatedFields[fieldId];
      if (field.type === 'Attachment' && field.value) {
        fileInfo = field.value;
        break;
      }
    }

    // Create record with validated fields and file information
    const record = await Record.create({
      ...data,
      title: data.title.trim(),
      customFields: validatedFields,
      lastModifiedBy: data.creatorId,
      version: 1,
      // Add file information if present
      ...(fileInfo && {
        fileName: fileInfo.fileName,
        filePath: fileInfo.filePath,
        fileSize: fileInfo.fileSize,
        fileType: fileInfo.fileType,
        fileHash: fileInfo.fileHash,
      })
    });

    return record;
  }

  static async validateCustomFields(
    submittedFields: { [key: string]: any },
    cabinetFields: ExtendedCustomField[]
  ): Promise<{ [key: string]: CustomFieldValue }> {
    const validatedFields: { [key: string]: CustomFieldValue } = {};

    console.log('Submitted Fields:', JSON.stringify(submittedFields, null, 2));
    console.log('Cabinet Fields:', JSON.stringify(cabinetFields, null, 2));

    for (const field of cabinetFields) {
      console.log(`Processing field: ${field.name} (${field.type})`);
      
      const submittedField = submittedFields[field.id];
      console.log('Submitted field value:', submittedField);

      // Handle mandatory field validation
      if (field.isMandatory) {
        console.log(`Field ${field.name} is mandatory`);
        
        if (field.type === 'Attachment') {
          // For attachment fields, check if there's a valid value object
          const hasValidValue = submittedField && 
            ((submittedField.value && Object.keys(submittedField.value).length > 0) || 
             (typeof submittedField === 'object' && (submittedField.filePath || submittedField.fileName)));
          
          console.log('Attachment field validation:', {
            hasValidValue,
            submittedField: submittedField
          });

          if (!hasValidValue) {
            throw new AppError(400, `Field '${field.name}' is mandatory`);
          }
        } else {
          // For non-attachment fields
          const hasValue = submittedField !== undefined && submittedField !== null && submittedField !== '';
          
          console.log('Non-attachment field validation:', {
            hasValue,
            submittedField: submittedField
          });

          if (!hasValue) {
            throw new AppError(400, `Field '${field.name}' is mandatory`);
          }
        }
      }

      // Process the field based on its type
      if (field.type === 'Attachment') {
        if (submittedField) {
          validatedFields[field.id] = {
            fieldId: field.id,
            type: field.type,
            value: submittedField
          };
        }
      } else {
        if (submittedField !== undefined) {
          validatedFields[field.id] = {
            fieldId: field.id,
            type: field.type,
            value: await RecordService.validateFieldValue(submittedField, field)
          };
        }
      }

      console.log(`Validated field ${field.name}:`, validatedFields[field.id]);
    }

    return validatedFields;
  }

  private static async validateFieldValue(value: any, field: ExtendedCustomField): Promise<any> {
    if (value === undefined || value === null) {
      return null;
    }

    // Extract value from complex object if needed
    const actualValue = typeof value === 'object' && value !== null
      ? value.value !== undefined ? value.value : value
      : value;

    switch (field.type) {
      case 'Text/Number with Special Symbols':
        // Handle null, undefined, or empty string
        if (actualValue === null || actualValue === undefined || actualValue === '') {
          return null;
        }

        // Convert to string if it's a number
        const stringValue = typeof actualValue === 'number' ? actualValue.toString() : actualValue;

        // Check if it's a string
        if (typeof stringValue !== 'string') {
          throw new AppError(400, `Field '${field.name}' must be text, number or special symbols`);
        }

        // Check character limit if specified
        if (field.characterLimit && stringValue.length > field.characterLimit) {
          throw new AppError(400, `Field '${field.name}' exceeds character limit of ${field.characterLimit}`);
        }

        // Allow any combination of text, numbers and special symbols
        return stringValue;

      case 'Text Only':
        // Handle object with value property
        const textValue = typeof actualValue === 'object' && actualValue !== null && 'value' in actualValue 
          ? actualValue.value 
          : actualValue;

        if (typeof textValue !== 'string') {
          throw new AppError(400, `Field '${field.name}' must be text`);
        }
        if (field.characterLimit && textValue.length > field.characterLimit) {
          throw new AppError(400, `Field '${field.name}' exceeds character limit of ${field.characterLimit}`);
        }
        return textValue;

      case 'Number Only':
        // Handle null, undefined, or empty string
        if (actualValue === null || actualValue === undefined || actualValue === '') {
          return null;
        }

        // If value is already a number, use it directly
        if (typeof actualValue === 'number') {
          if (isNaN(actualValue)) {
            throw new AppError(400, `Field '${field.name}' must be a valid number`);
          }
          return actualValue;
        }

        // If value is a string, try to parse it
        if (typeof actualValue === 'string') {
          const num = parseFloat(actualValue.trim());
          if (isNaN(num)) {
            throw new AppError(400, `Field '${field.name}' must be a valid number`);
          }
          return num;
        }

        throw new AppError(400, `Field '${field.name}' must be a valid number`);

      case 'Currency':
        const amount = Number(actualValue);
        if (isNaN(amount)) {
          throw new AppError(400, `Field '${field.name}' must be a valid currency amount`);
        }
        return amount;

      case 'Date':
      case 'Time':
      case 'Time and Date':
        // If the value is already an ISO string, return it
        if (typeof actualValue === 'string' && !isNaN(new Date(actualValue).getTime())) {
          return actualValue;
        }

        const date = new Date(actualValue);
        if (isNaN(date.getTime())) {
          throw new AppError(400, `Field '${field.name}' must be a valid date/time`);
        }
        return date.toISOString();

      case 'Yes/No':
        if (typeof actualValue !== 'boolean') {
          throw new AppError(400, `Field '${field.name}' must be a boolean`);
        }
        return actualValue;

      case 'Tags/Labels':
        if (!Array.isArray(actualValue)) {
          throw new AppError(400, `Field '${field.name}' must be an array of tags`);
        }
        return actualValue;

      case 'Attachment':
        if (!actualValue || typeof actualValue !== 'object') {
          throw new AppError(400, `Field '${field.name}' must be a valid file upload`);
        }
        if (!actualValue.fileName || !actualValue.filePath) {
          throw new AppError(400, `Field '${field.name}' is missing required file information`);
        }
        return actualValue;

      default:
        return actualValue;
    }
  }

  static async getRecordById(id: string) {
    const record = await Record.findByPk(id, {
      include: [
        {
          model: Cabinet,
          as: 'cabinet'
        },
        {
          model: User,
          as: 'creator'
        },
        {
          model: RecordNoteComment,
          as: 'notes',
          where: { type: 'note' },
          required: false,
          include: [{
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName']
          }],
          order: [['createdAt', 'DESC']],
          limit: 1 // Get only the latest note
        },
        {
          model: RecordNoteComment,
          as: 'comments',
          where: { type: 'comment' },
          required: false,
          include: [{
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName']
          }],
          order: [['createdAt', 'DESC']]
        }
      ],
      attributes: {
        include: [
          'id', 'title', 'description', 'cabinetId', 'creatorId',
          'filePath', 'fileName', 'fileSize', 'fileType', 'fileHash',
          'version', 'status', 'metadata', 'customFields', 'tags',
          'isTemplate', 'isActive', 'lastModifiedBy', 'createdAt', 'updatedAt'
        ]
      }
    });

    if (!record) {
      throw new AppError(400,'Record not found');
    }

    // Process customFields to ensure file information is properly structured
    if (record.customFields) {
      for (const fieldId in record.customFields) {
        const field = record.customFields[fieldId];
        if (field.type === 'Attachment' && field.value) {
          // Ensure file information is properly structured in customFields
          field.value = {
            fileName: field.value.fileName || field.fileName,
            filePath: field.value.filePath || field.filePath,
            fileSize: field.value.fileSize || field.fileSize,
            fileType: field.value.fileType || field.fileType,
            fileHash: field.value.fileHash || field.fileHash
          };
        }
      }
    }

    return record;
  }

  static async updateRecord(id: string, data: Partial<Record> & { note?: string; comments?: string }, userId: string) {
    const transaction = await sequelize.transaction();

    try {
      const record = await Record.findByPk(id);
      if (!record) {
        throw new AppError(404, 'Record not found');
      }

      // Update record
      await record.update({
        ...data,
        lastModifiedBy: userId,
      }, { transaction });

      // Add note if provided
      if (data.note) {
        await RecordNoteComment.create({
          recordId: id,
          content: data.note,
          type: 'note',
          action: 'update',
          createdBy: userId
        }, { transaction });
      }

      // Add comment if provided
      if (data.comments) {
        await RecordNoteComment.create({
          recordId: id,
          content: data.comments,
          type: 'comment',
          createdBy: userId
        }, { transaction });
      }

      await transaction.commit();

      // Fetch updated record with notes and comments
      const updatedRecord = await Record.findByPk(id, {
        include: [
          {
            model: Cabinet,
            as: 'cabinet'
          },
          {
            model: User,
            as: 'creator'
          },
          {
            model: RecordNoteComment,
            as: 'notes',
            where: { type: 'note' },
            required: false,
            include: [{
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName']
            }],
            order: [['createdAt', 'DESC']]
          },
          {
            model: RecordNoteComment,
            as: 'comments',
            where: { type: 'comment' },
            required: false,
            include: [{
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName']
            }],
            order: [['createdAt', 'DESC']]
          }
        ],
        attributes: {
          include: [
            'id', 'title', 'description', 'cabinetId', 'creatorId',
            'filePath', 'fileName', 'fileSize', 'fileType', 'fileHash',
            'version', 'status', 'metadata', 'customFields', 'tags',
            'isTemplate', 'isActive', 'lastModifiedBy', 'createdAt', 'updatedAt'
          ]
        }
      });

      if (!updatedRecord) {
        throw new AppError(404, 'Updated record not found');
      }

      // Process customFields to ensure file information is properly structured
      if (updatedRecord.customFields) {
        for (const fieldId in updatedRecord.customFields) {
          const field = updatedRecord.customFields[fieldId];
          if (field.type === 'Attachment' && field.value) {
            field.value = {
              fileName: field.value.fileName || field.fileName,
              filePath: field.value.filePath || field.filePath,
              fileSize: field.value.fileSize || field.fileSize,
              fileType: field.value.fileType || field.fileType,
              fileHash: field.value.fileHash || field.fileHash
            };
          }
        }
      }

      return updatedRecord;
    } catch (error) {
      try {
        // Attempt to rollback the transaction
        await transaction.rollback();
      } catch (rollbackError) {
        // If rollback fails, it's likely because the transaction was already committed
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  static async deleteRecord(id: string, userId: string) {
    const record = await Record.findByPk(id, {
      include: [
        {
          model: RecordVersion,
          as: 'versions'
        },
        {
          model: Cabinet,
          as: 'cabinet',
          required: true
        }
      ]
    });
    
    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    if (!record.cabinet) {
      throw new AppError(404, 'Cabinet not found');
    }

    // Check if user has permission (creator, cabinet owner, approver, or member_full)
    const isCreator = record.creatorId === userId;
    const isCabinetOwner = record.cabinet.createdById === userId;
    const isApprover = record.cabinet.approvers?.some(
      (approver: CabinetApprover) => approver.userId === userId
    );

    // Check if user is a member_full
    const member = await CabinetMember.findOne({
      where: { 
        cabinetId: record.cabinet.id,
        userId: userId,
        role: 'member_full'
      }
    });

    const isMemberFull = !!member;

    if (!isCreator && !isCabinetOwner && !isApprover && !isMemberFull) {
      throw new AppError(403, 'You do not have permission to delete this record');
    }

    // Start a transaction to ensure all deletions are atomic
    const transaction = await sequelize.transaction();

    try {
      // Delete all versions first
      await RecordVersion.destroy({
        where: { recordId: id },
        transaction
      });

      // Then delete the record
      await record.destroy({ transaction });

      // If all operations are successful, commit the transaction
      await transaction.commit();

      return true;
    } catch (error) {
      // If any operation fails, rollback the transaction
      await transaction.rollback();
      throw error;
    }
  }

  static async getRecordsByStatus(status: string | string[], creatorId?: string) {
    const whereClause: any = {
      status: Array.isArray(status) ? { [Op.in]: status } : status
    };
    
    if (creatorId) {
      whereClause[Op.or] = [
        { creatorId },
        sequelize.literal(`"cabinet"."approvers" @> '[{"userId": "${creatorId}"}]'`),
        // Add check for cabinet_members with role 'member_full'
        sequelize.literal(`EXISTS (
          SELECT 1 FROM cabinet_members cm 
          WHERE cm.cabinet_id = "cabinet"."id" 
          AND cm.user_id = '${creatorId}'
          AND cm.role = 'member_full'
        )`)
      ];
    }

    return Record.findAll({
      where: whereClause,
      include: [
        {
          model: Cabinet,
          as: 'cabinet',
          attributes: ['id', 'name', 'description']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  static async createNewVersion(recordId: string, versionData: {
    fileName: string;
    fileSize: number;
    fileType: string;
    filePath: string;
    fileHash: string;
    uploadedBy: string;
    note?: string;
  }) {
    const record = await Record.findByPk(recordId);
    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    // Get the current version number and increment it
    const latestVersion = await RecordVersion.findOne({
      where: { recordId },
      order: [['version', 'DESC']],
    });

    const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Create new version
    const version = await RecordVersion.create({
      recordId,
      version: newVersionNumber,
      ...versionData,
    });

    // Update the record with the latest file info
    await record.update({
      filePath: versionData.filePath,
      fileName: versionData.fileName,
      fileSize: versionData.fileSize,
      fileType: versionData.fileType,
      fileHash: versionData.fileHash,
      version: newVersionNumber,
      lastModifiedBy: versionData.uploadedBy,
    });

    return version;
  }

  static async getRecordVersions(recordId: string) {
    const record = await Record.findByPk(recordId);
    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    const versions = await RecordVersion.findAll({
      where: { recordId },
      order: [['version', 'DESC']],
      include: [
        {
          model: Record,
          as: 'record',
          attributes: ['title'],
        },
      ],
    });

    return versions;
  }

  static async deleteVersion(recordId: string, versionId: string, userId: string) {
    const record = await Record.findByPk(recordId);
    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    // Check if user has permission (creator or cabinet owner)
    const cabinet = await Cabinet.findByPk(record.cabinetId);
    if (!cabinet) {
      throw new AppError(404, 'Cabinet not found');
    }

    if (record.creatorId !== userId && cabinet.createdById !== userId) {
      throw new AppError(403, 'You do not have permission to delete this version');
    }

    const version = await RecordVersion.findOne({
      where: { id: versionId, recordId }
    });

    if (!version) {
      throw new AppError(404, 'Version not found');
    }

    // Don't allow deletion of the only version
    const versionsCount = await RecordVersion.count({ where: { recordId } });
    if (versionsCount === 1) {
      throw new AppError(400, 'Cannot delete the only version of the record');
    }

    // If deleting the latest version, update record to point to the previous version
    if (version.version === record.version) {
      const previousVersion = await RecordVersion.findOne({
        where: { recordId, version: { [Op.lt]: version.version } },
        order: [['version', 'DESC']],
      });

      if (previousVersion) {
        await record.update({
          filePath: previousVersion.filePath,
          fileName: previousVersion.fileName,
          fileSize: previousVersion.fileSize,
          fileType: previousVersion.fileType,
          fileHash: previousVersion.fileHash,
          version: previousVersion.version,
          lastModifiedBy: userId,
        });
      }
    }

    // Delete the version
    await version.destroy();

    return true;
  }

  static async approveRecord(recordId: string, userId: string, note?: string, data?: Partial<Record>) {
    const transaction = await sequelize.transaction();

    try {
      const record = await Record.findByPk(recordId);
      if (!record) {
        throw new AppError(404, 'Record not found');
      }

      // Update record status and any additional data
      await record.update({
        ...data,
        status: RecordStatus.APPROVED,
        lastModifiedBy: userId,
      }, { transaction });

      // Add system note for approval
      await RecordNoteComment.create({
        recordId,
        content: note || 'Record approved',
        type: 'system',
        action: 'approve',
        createdBy: userId
      }, { transaction });

      await transaction.commit();

      // Fetch updated record with notes and comments
      const updatedRecord = await Record.findByPk(recordId, {
        include: [
          {
            model: RecordNoteComment,
            as: 'notes',
            where: { type: 'note' },
            required: false,
            include: [{
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName']
            }]
          },
          {
            model: RecordNoteComment,
            as: 'comments',
            where: { type: 'comment' },
            required: false,
            include: [{
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName']
            }]
          }
        ]
      });

      return updatedRecord;
    } catch (error) {
      try {
        // Attempt to rollback the transaction
        await transaction.rollback();
      } catch (rollbackError) {
        // If rollback fails, it's likely because the transaction was already committed
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  static async rejectRecord(recordId: string, userId: string, note?: string, comments?: string) {
    const transaction = await sequelize.transaction();

    try {
      // Get the record and validate it exists
      const record = await Record.findByPk(recordId, {
        include: [
          {
            model: Cabinet,
            as: 'cabinet'
          }
        ],
        transaction
      });

      if (!record || !record.cabinet) {
        throw new AppError(404, 'Record or cabinet not found');
      }

      // Get the cabinet with its full data
      const cabinet = await Cabinet.findByPk(record.cabinetId, { transaction });
      if (!cabinet) {
        throw new AppError(404, 'Cabinet not found');
      }

      // Check if the user is an approver
      const isApprover = cabinet.approvers?.some(approver => approver.userId === userId) ?? false;
      
      // If not an explicit approver, check if they are a member_full
      if (!isApprover) {
        const cabinetMember = await CabinetMember.findOne({
          where: {
            cabinetId: record.cabinetId,
            userId: userId,
            role: 'member_full'
          },
          transaction
        });

        if (!cabinetMember) {
          throw new AppError(403, 'User is not authorized to reject this record');
        }
      }

      // Check if the record is in a rejectable state
      if (record.status !== RecordStatus.PENDING) {
        throw new AppError(400, 'Only pending records can be rejected');
      }

      // Update record status
      await record.update({
        status: RecordStatus.REJECTED,
        lastModifiedBy: userId
      }, { transaction });

      // Add note if provided
      if (note) {
        await RecordNoteComment.create({
          recordId: recordId,
          content: note,
          type: 'note',
          action: 'reject',
          createdBy: userId
        }, { transaction });
      }

      // Add comment if provided
      if (comments) {
        await RecordNoteComment.create({
          recordId: recordId,
          content: comments,
          type: 'comment',
          action: 'reject',
          createdBy: userId
        }, { transaction });
      }

      // Return updated record with associations
      const updatedRecord = await Record.findByPk(recordId, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName']
          },
          {
            model: Cabinet,
            as: 'cabinet'
          },
          {
            model: RecordNoteComment,
            as: 'notes',
            where: { type: 'note' },
            required: false,
            include: [
              {
                model: User,
                as: 'creator',
                attributes: ['id', 'firstName', 'lastName']
              }
            ],
            order: [['createdAt', 'DESC']]
          },
          {
            model: RecordNoteComment,
            as: 'comments',
            where: { type: 'comment' },
            required: false,
            include: [
              {
                model: User,
                as: 'creator',
                attributes: ['id', 'firstName', 'lastName']
              }
            ],
            order: [['createdAt', 'DESC']]
          }
        ],
        transaction
      });

      // If everything is successful, commit the transaction
      await transaction.commit();
      
      return updatedRecord;
    } catch (error) {
      try {
        // Attempt to rollback the transaction
        await transaction.rollback();
      } catch (rollbackError) {
        // If rollback fails, it's likely because the transaction was already committed
        console.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  static async getCabinetRecords(cabinetId: string, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { rows: records, count } = await Record.findAndCountAll({
        where: {
          cabinetId,
          isActive: true,
          [Op.or]: [
            { deletedAt: null },
            { deletedAt: { [Op.gt]: new Date() } }
          ]
        },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'avatar']
          },
          {
            model: Cabinet,
            as: 'cabinet',
            attributes: ['id', 'name']
          },
          {
            model: RecordNoteComment,
            as: 'notes',
            where: { type: 'note' },
            required: false,
            limit: 1,
            order: [['createdAt', 'DESC']],
            include: [{
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName']
            }]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      // Transform records to match frontend interface
      const transformedRecords = records.map(record => {
        const creator = record.get('creator') as User;
        const cabinet = record.get('cabinet') as Cabinet;
        const notes = record.get('notes') as RecordNoteComment[];

        return {
          id: record.id,
          key: record.id,
          recordName: record.title,
          status: record.status,
          createdBy: {
            id: creator.id,
            firstName: creator.firstName,
            lastName: creator.lastName,
            avatar: creator.avatar
          },
          createdAt: record.createdAt,
          priority: (record.metadata as any)?.priority || 'Medium',
          cabinet: {
            id: cabinet.id,
            name: cabinet.name
          },
          latestNote: notes?.[0] || null
        };
      });

      return {
        records: transformedRecords,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };
    } catch (err) {
      console.error('Error in getCabinetRecords:', err);
      const error = err as Error;
      throw new AppError(error instanceof AppError ? error.statusCode : 500, error.message);
    }
  }

  async getRecord(id: string) {
    return await Record.findOne({
      where: {
        id,
        isActive: true
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'avatar']
        },
        {
          model: Cabinet,
          as: 'cabinet'
        }
      ]
    });
  }
}