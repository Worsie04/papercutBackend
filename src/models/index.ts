import { User } from './user.model';
import { Role } from './role.model';
import { Space } from './space.model';
import { Cabinet } from './cabinet.model';
import { Record } from './record.model';
import { Setting } from './setting.model';
import { Config } from './config.model';
import { UserRole } from './user-role.model';
import { SpaceMember } from './space-member.model';
import { setupAssociations } from './associations';

// Set up associations
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'userId',
  otherKey: 'roleId',
  as: 'roles'
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'roleId',
  otherKey: 'userId',
  as: 'users'
});

// Space-User relationships
Space.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner',
});

User.hasMany(Space, {
  foreignKey: 'ownerId',
  as: 'ownedSpaces',
});

// Space-User Many-to-Many for members
Space.belongsToMany(User, {
  through: 'space_members',
  foreignKey: 'spaceId',
  otherKey: 'userId',
  as: 'members',
});

User.belongsToMany(Space, {
  through: 'space_members',
  foreignKey: 'userId',
  otherKey: 'spaceId',
  as: 'memberSpaces',
});

// Cabinet relationships
Cabinet.belongsTo(Space, {
  foreignKey: 'spaceId',
  as: 'space',
});

// Add createdBy association for Cabinet
Cabinet.belongsTo(User, {
  foreignKey: 'createdById',
  as: 'createdBy',
});

User.hasMany(Cabinet, {
  foreignKey: 'createdById',
  as: 'createdCabinets',
});

Space.hasMany(Cabinet, {
  foreignKey: 'spaceId',
  as: 'cabinets',
});

// Cabinet self-referential relationship for hierarchy
Cabinet.belongsTo(Cabinet, {
  foreignKey: 'parentId',
  as: 'parent',
});

Cabinet.hasMany(Cabinet, {
  foreignKey: 'parentId',
  as: 'children',
});

// Record relationships
Record.belongsTo(Cabinet, {
  foreignKey: 'cabinetId',
  as: 'cabinet',
});

Cabinet.hasMany(Record, {
  foreignKey: 'cabinetId',
  as: 'records',
});

Record.belongsTo(User, {
  foreignKey: 'creatorId',
  as: 'creator',
});

Record.belongsTo(User, {
  foreignKey: 'lastModifiedBy',
  as: 'modifier',
});

User.hasMany(Record, {
  foreignKey: 'creatorId',
  as: 'createdRecords',
});

User.hasMany(Record, {
  foreignKey: 'lastModifiedBy',
  as: 'modifiedRecords',
});

// Setting relationships
Setting.belongsTo(User, {
  foreignKey: 'lastModifiedBy',
  as: 'modifier',
});

User.hasMany(Setting, {
  foreignKey: 'lastModifiedBy',
  as: 'modifiedSettings',
});

// Config relationships
Config.belongsTo(User, {
  foreignKey: 'lastModifiedBy',
  as: 'modifier',
});

User.hasMany(Config, {
  foreignKey: 'lastModifiedBy',
  as: 'modifiedConfigs',
});

setupAssociations();

export {
  User,
  Role,
  Space,
  Cabinet,
  Record,
  Setting,
  Config,
  UserRole,
  SpaceMember
}; 