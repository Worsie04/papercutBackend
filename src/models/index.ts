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
    Record,
    Setting,
    Config,
    UserRole,
    SpaceMember,
    SpaceCommentReject,
    SpaceReassignment
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
  Record,
  Setting,
  Config,
  UserRole,
  SpaceMember,
  SpaceCommentReject,
  SpaceReassignment
};