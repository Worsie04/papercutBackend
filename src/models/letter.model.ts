// src/models/letter.model.ts

import { DataTypes, Model, Optional, Association } from 'sequelize';
import { sequelize } from '../infrastructure/database/sequelize'; // Adjust path if needed
import { User } from './user.model'; // Import User model
import Template from './template.model'; // Import Template model
// Optional: If you want to link to the original file record
// import { File } from './file.model';

// Interface LetterFormData - No changes needed here
interface LetterFormData {
  company: string; date: string; customs: string; person: string;
  vendor: string; contract: string; value: string; mode: string;
  reference: string;
  invoiceNumber: string; cargoName: string; cargoDescription: string;
  documentType: string; importPurpose: string; requestPerson: string;
  requestDepartment: string; declarationNumber: string; quantityBillNumber: string;
  subContractorName: string; subContractNumber: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
}

export enum LetterStatus {
  DRAFT = 'draft', // Optional: If letters can be saved without submitting
  PENDING_REVIEW = 'pending_review',
  REVIEW_APPROVED = 'review_approved',
  REVIEW_REJECTED = 'review_rejected',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// --- UPDATED Attributes Interface ---
interface LetterAttributes {
  id: string;
  name?: string | null;
  templateId?: string | null; // <-- UPDATED: Made nullable
  userId: string;
  formData?: Omit<LetterFormData, 'logoUrl' | 'signatureUrl' | 'stampUrl'> | null; // <-- UPDATED: Made nullable
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  signedPdfUrl?: string | null; 
  originalPdfFileId?: string | null; 
  status: LetterStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LetterCreationAttributes extends Optional<LetterAttributes,
  'id' | 'createdAt' | 'updatedAt' | 'name' |
  'logoUrl' | 'signatureUrl' | 'stampUrl' |
  'templateId' | 'formData' | 
  'signedPdfUrl' | 'originalPdfFileId' | 'status'
> { }

class Letter extends Model<LetterAttributes, LetterCreationAttributes> implements LetterAttributes {
  public id!: string;
  public name!: string | null;
  public templateId!: string | null; 
  public userId!: string;
  public formData!: Omit<LetterFormData, 'logoUrl' | 'signatureUrl' | 'stampUrl'> | null; 
  public logoUrl!: string | null;
  public signatureUrl!: string | null;
  public stampUrl!: string | null;
  public signedPdfUrl!: string | null;
  public originalPdfFileId!: string | null;
  public status!: LetterStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly user?: User;
  public readonly template?: Template;

  public static associations: {
    user: Association<Letter, User>;
    template: Association<Letter, Template>;
    // Optional: originalFile: Association<Letter, File>;
  };
}

Letter.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    templateId: { // <-- UPDATED definition
      type: DataTypes.UUID,
      allowNull: true, // Allow null for PDF-based letters
      field: 'template_id',
      references: { model: 'templates', key: 'id' },
      onDelete: 'SET NULL', // Important: Define behavior if template is deleted
      onUpdate: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE', // Or restrict if needed
      onUpdate: 'CASCADE',
    },
    formData: { // <-- UPDATED definition
      type: DataTypes.JSONB,
      allowNull: true, // Allow null for PDF-based letters
      field: 'form_data',
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'logo_url',
    },
    signatureUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'signature_url',
    },
    stampUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stamp_url',
    },
    // --- NEW Field Definitions ---
    signedPdfUrl: {
        type: DataTypes.STRING, // Store R2 key or full URL
        allowNull: true,
        field: 'signed_pdf_url',
    },
    originalPdfFileId: {
        type: DataTypes.UUID, // Match the type of your File model's ID
        allowNull: true,
        field: 'original_pdf_file_id',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(LetterStatus)),
      allowNull: false,
      defaultValue: LetterStatus.PENDING_REVIEW, // Set default status
      field: 'status',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    }
  },
  {
    tableName: 'letters',
    sequelize,
    timestamps: true,
    underscored: true, // Keep using snake_case for database columns
  }
);

// --- Define Associations ---
// Ensure associations are defined after model initialization
Letter.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Letter.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });
// Optional: Define association to File model
// Assuming File model is imported and has a primary key 'id'
// Letter.belongsTo(File, { foreignKey: 'originalPdfFileId', as: 'originalFile' });


// Export the updated model and interfaces
export { Letter, LetterFormData, LetterAttributes, LetterCreationAttributes };