import { Sequelize } from 'sequelize';
import { User } from './user.model';
import { Admin } from './admin.model';
import { Organization } from './organization.model';
import { OrganizationMember } from './organization-member.model';
import { Role } from './role.model';
import { Space } from './space.model';
import { Cabinet } from './cabinet.model';
import { Record } from './record.model';
import { Setting } from './setting.model';
import { Config } from './config.model';
import { UserRole } from './user-role.model';
import { SpaceMember } from './space-member.model';
import { SpaceCommentReject } from './space-comment-reject.model';
import { SpaceReassignment } from './space-reassignment.model';
import { CabinetMember } from './cabinet-member.model';
import { CabinetMemberPermission } from './cabinet-member-permission.model';
import File from './file.model';
import RecordFile from './record-file.model';
import { Activity } from './activity.model';
import { Signature } from './signature.model';
import { Stamp } from './stamp.model';
import Template from './template.model';
import TemplateFavorite from './template-favorite.model';

export const initializeModels = (sequelize: Sequelize) => {
  // Initialize all models first
  const models = {
    User,
    Admin,
    Organization,
    OrganizationMember,
    Role,
    Space,
    Cabinet,
    CabinetMember,
    CabinetMemberPermission,
    Record,
    Setting,
    Config,
    UserRole,
    SpaceMember,
    SpaceCommentReject,
    SpaceReassignment,
    File,
    RecordFile,
    Activity,
    Signature,
    Stamp,
    Template,
    TemplateFavorite
  };

  return models;
};

// Export all models for direct import
export {
  User,
  Admin,
  Organization,
  OrganizationMember,
  Role,
  Space,
  Cabinet,
  CabinetMember,
  CabinetMemberPermission,
  Record,
  Setting,
  Config,
  UserRole,
  SpaceMember,
  SpaceCommentReject,
  SpaceReassignment,
  File,
  RecordFile,
  Activity,
  Signature,
  Stamp,
  Template,
  TemplateFavorite
};

export * from './cabinet.model';
export * from './cabinet-member.model';
export * from './cabinet-member-permission.model';
export * from './signature.model';
export * from './stamp.model';
export * from './template.model';
export * from './template-favorite.model';