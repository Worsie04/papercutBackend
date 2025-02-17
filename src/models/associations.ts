import { User } from './user.model';
import { Role } from './role.model';
import { Space } from './space.model';
import { SpaceMember } from './space-member.model';
import { Record } from './record.model';
import { Cabinet } from './cabinet.model';
import { Organization } from './organization.model';
import { Admin } from './admin.model';
import { OrganizationMember } from './organization-member.model';

export function setupAssociations() {
  // Organization-User ownership associations
  Organization.belongsTo(User, {
    foreignKey: 'owner_id',
    as: 'userOwner',
    constraints: false
  });

  User.hasMany(Organization, {
    foreignKey: 'owner_id',
    as: 'ownedOrganizations',
    constraints: false
  });

  // Organization-Admin ownership associations
  Organization.belongsTo(Admin, {
    foreignKey: 'owner_id',
    as: 'adminOwner',
    constraints: false
  });

  Admin.hasMany(Organization, {
    foreignKey: 'owner_id',
    as: 'ownedOrganizations',
    constraints: false
  });

  // Organization-Member associations
  Organization.hasMany(OrganizationMember, {
    foreignKey: 'organization_id',
    as: 'organizationMembers'
  });

  OrganizationMember.belongsTo(Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
  });

  User.hasMany(OrganizationMember, {
    foreignKey: 'user_id',
    as: 'organizationMemberships'
  });

  OrganizationMember.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  User.hasMany(OrganizationMember, {
    foreignKey: 'invited_by',
    as: 'invitedMembers'
  });

  OrganizationMember.belongsTo(User, {
    foreignKey: 'invited_by',
    as: 'inviter'
  });

  // User-Role associations
  User.belongsToMany(Role, {
    through: 'user_roles',
    foreignKey: 'userId',
    otherKey: 'roleId',
  });

  Role.belongsToMany(User, {
    through: 'user_roles',
    foreignKey: 'roleId',
    otherKey: 'userId',
  });

  // Space-User associations
  Space.belongsTo(User, {
    foreignKey: 'ownerId',
    as: 'owner',
  });

  User.hasMany(Space, {
    foreignKey: 'ownerId',
    as: 'ownedSpaces',
  });

  Space.belongsToMany(User, {
    through: SpaceMember,
    foreignKey: 'spaceId',
    otherKey: 'userId',
    as: 'spaceMembers',
  });

  User.belongsToMany(Space, {
    through: SpaceMember,
    foreignKey: 'userId',
    otherKey: 'spaceId',
    as: 'memberSpaces',
  });

  // Record Associations
  Record.belongsTo(Cabinet, {
    foreignKey: 'cabinetId',
    as: 'cabinet'
  });

  Record.belongsTo(User, {
    foreignKey: 'creatorId',
    as: 'creator'
  });

  Record.belongsTo(User, {
    foreignKey: 'lastModifiedBy',
    as: 'modifier'
  });

  // Cabinet Associations
  Cabinet.hasMany(Record, {
    foreignKey: 'cabinetId',
    as: 'records'
  });

  Cabinet.belongsTo(Space, {
    foreignKey: 'spaceId',
    as: 'space'
  });

  Cabinet.belongsTo(Cabinet, {
    foreignKey: 'parentId',
    as: 'parent'
  });

  Cabinet.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });

  // Space Associations
  Space.hasMany(Cabinet, {
    foreignKey: 'spaceId',
    as: 'cabinets'
  });

  Space.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy'
  });
} 