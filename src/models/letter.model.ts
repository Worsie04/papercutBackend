import { DataTypes, Model, Optional, Sequelize, BelongsToGetAssociationMixin, HasManyGetAssociationsMixin, HasManyAddAssociationMixin, HasManyHasAssociationMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize'; // Adjust import path as needed
import { User } from './user.model'; // Adjust import path
import Template from './template.model'; // Adjust import path
import { LetterReviewer } from './letter-reviewer.model'; // Adjust import path
import { LetterActionLog } from './letter-action-log.model'; // Adjust import path

export interface LetterFormData {
  [key: string]: any;
}

export enum LetterWorkflowStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface LetterAttributes {
  id: string;
  userId: string;
  templateId?: string | null;
  originalPdfFileId?: string | null; // FK to files table if needed
  name?: string | null;
  formData?: LetterFormData | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  signedPdfUrl?: string | null; // Original signed PDF before final approval
  workflowStatus: LetterWorkflowStatus;
  currentStepIndex?: number | null;
  nextActionById?: string | null; // FK to users table
  qrCodeUrl?: string | null;
  publicLink?: string | null;
  finalSignedPdfUrl?: string | null; // PDF after final approval + QR
  createdAt?: Date;
  updatedAt?: Date;
  status?: string; // Compatibility if old status field exists
}

export interface LetterCreationAttributes extends Optional<LetterAttributes, 'id' | 'createdAt' | 'updatedAt' | 'templateId' | 'originalPdfFileId' | 'name' | 'formData' | 'logoUrl' | 'signatureUrl' | 'stampUrl' | 'signedPdfUrl' | 'workflowStatus' | 'currentStepIndex' | 'nextActionById' | 'qrCodeUrl' | 'publicLink' | 'finalSignedPdfUrl' | 'status'> {}

export class Letter extends Model<LetterAttributes, LetterCreationAttributes> implements LetterAttributes {
  public id!: string;
  public userId!: string;
  public templateId?: string | null;
  public originalPdfFileId?: string | null;
  public name?: string | null;
  public formData?: LetterFormData | null;
  public logoUrl?: string | null;
  public signatureUrl?: string | null;
  public stampUrl?: string | null;
  public signedPdfUrl?: string | null;
  public workflowStatus!: LetterWorkflowStatus;
  public currentStepIndex?: number | null;
  public nextActionById?: string | null;
  public qrCodeUrl?: string | null;
  public publicLink?: string | null;
  public finalSignedPdfUrl?: string | null;
  public status?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getUser!: BelongsToGetAssociationMixin<User>;
  public getTemplate!: BelongsToGetAssociationMixin<Template>;
  public getNextActionBy!: BelongsToGetAssociationMixin<User>;
  public getLetterReviewers!: HasManyGetAssociationsMixin<LetterReviewer>;
  public getLetterActionLogs!: HasManyGetAssociationsMixin<LetterActionLog>;

  public readonly user?: User;
  public readonly template?: Template;
  public readonly nextActionBy?: User;
  public readonly letterReviewers?: LetterReviewer[];
  public readonly letterActionLogs?: LetterActionLog[];

  public static associate(models: any) {
    Letter.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Letter.belongsTo(models.Template, {
      foreignKey: 'templateId',
      as: 'template',
      constraints: false // allowNull is defined in the attribute definition
    });
    Letter.belongsTo(models.User, {
        foreignKey: 'nextActionById',
        as: 'nextActionBy',
        constraints: false
    });
    Letter.hasMany(models.LetterReviewer, {
      foreignKey: 'letterId',
      as: 'letterReviewers'
    });
    Letter.hasMany(models.LetterActionLog, {
      foreignKey: 'letterId',
      as: 'letterActionLogs'
    });
    // Add association to File model if needed
    // Letter.belongsTo(models.File, { foreignKey: 'originalPdfFileId', as: 'originalFile' });
  }
}

Letter.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  templateId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'template_id',
     references: {
       model: 'templates',
       key: 'id'
     },
     onDelete: 'SET NULL'
  },
   originalPdfFileId: {
     type: DataTypes.UUID,
     allowNull: true,
     field: 'original_pdf_file_id',
     // Add FK reference if you have a 'files' table
     // references: { model: 'files', key: 'id' }
   },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  formData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'form_data'
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'logo_url'
  },
  signatureUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'signature_url'
  },
  stampUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stamp_url'
  },
   signedPdfUrl: {
     type: DataTypes.STRING,
     allowNull: true,
     field: 'signed_pdf_url'
   },
  workflowStatus: {
    type: DataTypes.ENUM(...Object.values(LetterWorkflowStatus)),
    allowNull: false,
    defaultValue: LetterWorkflowStatus.DRAFT,
    field: 'workflow_status'
  },
  currentStepIndex: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'current_step_index'
  },
  nextActionById: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'next_action_by_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  qrCodeUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'qr_code_url'
  },
  publicLink: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'public_link'
  },
  finalSignedPdfUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'final_signed_pdf_url'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  },
  status: {
      type: DataTypes.STRING, // Kept for potential backward compatibility if needed
      allowNull: true
  },
}, {
  sequelize,
  tableName: 'letters',
  timestamps: true,
  underscored: true,
  paranoid: false // Set to true if you want soft deletes
});