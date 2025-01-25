import { User } from './user.model';
import { Role } from './role.model';
import { Space } from './space.model';
import { SpaceMember } from './space-member.model';
import { Record } from './record.model';
import { Cabinet } from './cabinet.model';

export function setupAssociations() {
  User.belongsToMany(Role, {
    through: 'user_roles',
    as: 'roles',
    foreignKey: 'userId'
  });

  Role.belongsToMany(User, {
    through: 'user_roles',
    as: 'users',
    foreignKey: 'roleId'
  });

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
    as: 'members',
  });

  User.belongsToMany(Space, {
    through: SpaceMember,
    foreignKey: 'userId',
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

export function initializeAssociations() {
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