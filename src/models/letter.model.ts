import { DataTypes, Model, Optional, Sequelize, BelongsToGetAssociationMixin, HasManyGetAssociationsMixin } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize';
import { User } from './user.model';
import Template from './template.model';
import { LetterReviewer } from './letter-reviewer.model';
import { LetterActionLog } from './letter-action-log.model';

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

export interface PlacementInfo {
  type: 'signature' | 'stamp' | 'qrcode';
  url?: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LetterAttributes {
  id: string;
  userId: string;
  templateId?: string | null;
  originalPdfFileId?: string | null;
  name?: string | null;
  formData?: LetterFormData | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  signedPdfUrl?: string | null;
  workflowStatus: LetterWorkflowStatus;
  currentStepIndex?: number | null;
  nextActionById?: string | null;
  qrCodeUrl?: string | null;
  publicLink?: string | null;
  finalSignedPdfUrl?: string | null;
  placements?: PlacementInfo[] | null;
  createdAt?: Date;
  updatedAt?: Date;
  status?: string;
}

export interface LetterCreationAttributes extends Optional<LetterAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'templateId' | 'originalPdfFileId' | 'name' |
  'formData' | 'logoUrl' | 'signatureUrl' | 'stampUrl' | 'signedPdfUrl' |
  'workflowStatus' | 'currentStepIndex' | 'nextActionById' | 'qrCodeUrl' |
  'publicLink' | 'finalSignedPdfUrl' | 'placements' | 'status'> {}

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
  public placements?: PlacementInfo[] | null;
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
      constraints: false
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
  placements: {
    type: DataTypes.JSONB,
    allowNull: true,
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
      type: DataTypes.STRING,
      allowNull: true
  },
}, {
  sequelize,
  tableName: 'letters',
  timestamps: true,
  underscored: true,
  paranoid: false
});