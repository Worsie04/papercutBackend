import { Record, RecordStatus } from '../models/record.model';
import { User } from '../models/user.model';
import { Cabinet, CustomField } from '../models/cabinet.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { Op } from 'sequelize';

interface CustomFieldValue {
  fieldId: number;
  value: any;
  type: string;
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

    // Create record with validated fields
    const record = await Record.create({
      ...data,
      title: data.title.trim(),
      customFields: validatedFields,
      lastModifiedBy: data.creatorId,
      version: 1
    });

    return record;
  }

  private static async validateCustomFields(
    submittedFields: { [key: string]: any },
    cabinetFields: ExtendedCustomField[]
  ): Promise<{ [key: string]: CustomFieldValue }> {
    const validatedFields: { [key: string]: CustomFieldValue } = {};

    for (const field of cabinetFields) {
      const submittedValue = submittedFields[field.id];

      // Check if mandatory field is missing
      if (field.isMandatory && (submittedValue === undefined || submittedValue === null || submittedValue === '')) {
        throw new AppError(400, `Field '${field.name}' is mandatory`);
      }

      // Validate field value based on type
      const validatedValue = await RecordService.validateFieldValue(submittedValue, field);

      // Store validated value
      if (submittedValue !== undefined) {
        validatedFields[field.id] = {
          fieldId: field.id,
          value: validatedValue,
          type: field.type
        };
      }
    }

    return validatedFields;
  }

  private static async validateFieldValue(value: any, field: ExtendedCustomField): Promise<any> {
    if (value === undefined || value === null) {
      return null;
    }

    switch (field.type) {
      case 'Text/Number with Special Symbols':
      case 'Text Only':
        if (typeof value !== 'string') {
          throw new AppError(400, `Field '${field.name}' must be text`);
        }
        if (field.characterLimit && value.length > field.characterLimit) {
          throw new AppError(400, `Field '${field.name}' exceeds character limit of ${field.characterLimit}`);
        }
        return value;

      case 'Number Only':
        const num = Number(value);
        if (isNaN(num)) {
          throw new AppError(400, `Field '${field.name}' must be a number`);
        }
        return num;

      case 'Currency':
        const amount = Number(value);
        if (isNaN(amount)) {
          throw new AppError(400, `Field '${field.name}' must be a valid currency amount`);
        }
        return amount;

      case 'Date':
      case 'Time':
      case 'Time and Date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new AppError(400, `Field '${field.name}' must be a valid date/time`);
        }
        return date.toISOString();

      case 'Yes/No':
        if (typeof value !== 'boolean') {
          throw new AppError(400, `Field '${field.name}' must be a boolean`);
        }
        return value;

      case 'Tags/Labels':
        if (!Array.isArray(value)) {
          throw new AppError(400, `Field '${field.name}' must be an array of tags`);
        }
        return value;

      default:
        return value;
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
        }
      ]
    });

    if (!record) {
      throw new AppError(400,'Record not found');
    }

    return record;
  }

  static async updateRecord(id: string, data: Partial<Record>, userId: string) {
    const record = await Record.findByPk(id);
    if (!record) {
      throw new AppError(400,'Record not found');
    }

    // Update record
    await record.update({
      ...data,
      lastModifiedBy: userId
    });

    return record;
  }

  static async deleteRecord(id: string) {
    const record = await Record.findByPk(id);
    if (!record) {
      throw new AppError(400,'Record not found');
    }

    await record.destroy();
    return true;
  }

  static async getRecordsByStatus(status: string | string[], creatorId?: string) {
    const whereClause: any = {
      status: Array.isArray(status) ? { [Op.in]: status } : status
    };

    if (creatorId) {
      whereClause.creatorId = creatorId;
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
} 