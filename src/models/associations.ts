import { User } from './user.model';
import { Role } from './role.model';
import { Space } from './space.model';
import { SpaceMember } from './space-member.model';
import { Record } from './record.model';
import { Cabinet } from './cabinet.model';
import { Organization } from './organization.model';
import { Admin } from './admin.model';
import { OrganizationMember } from './organization-member.model';
import { CabinetMember } from './cabinet-member.model';
import { CabinetMemberPermission } from './cabinet-member-permission.model';
import File from './file.model';
import RecordFile from './record-file.model';
import { Notification } from './notification.model';
import ChatMessage from './chat-message.model';
import { Group } from './group.model';
import { CabinetReassignment } from './cabinet-reassignment.model';
import TemplateShare from './template-share.model';
import Template from './template.model';

export function setupAssociations() {
  // Notification-User associations
  Notification.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(Notification, {
    foreignKey: 'userId',
    as: 'notifications',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Organization-User ownership associations
  Organization.belongsTo(User, {
    foreignKey: 'owner_id',
    as: 'organizationOwner',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(Organization, {
    foreignKey: 'owner_id',
    as: 'ownedOrganizations',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Organization-Admin ownership associations
  Organization.belongsTo(Admin, {
    foreignKey: 'owner_id',
    as: 'adminOwner',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Admin.hasMany(Organization, {
    foreignKey: 'owner_id',
    as: 'ownedAdminOrganizations',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Organization-Member associations
  Organization.hasMany(OrganizationMember, {
    foreignKey: 'organization_id',
    as: 'members',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  OrganizationMember.belongsTo(Organization, {
    foreignKey: 'organization_id',
    as: 'organization',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(OrganizationMember, {
    foreignKey: 'user_id',
    as: 'organizationMemberships',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  OrganizationMember.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(OrganizationMember, {
    foreignKey: 'invited_by',
    as: 'invitedMembers',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  OrganizationMember.belongsTo(User, {
    foreignKey: 'invited_by',
    as: 'inviter',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  // User-Role associations
  User.belongsToMany(Role, {
    through: 'user_roles',
    foreignKey: 'user_id',
    otherKey: 'role_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Role.belongsToMany(User, {
    through: 'user_roles',
    foreignKey: 'role_id',
    otherKey: 'user_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Space-User associations
  Space.belongsTo(User, {
    foreignKey: 'owner_id',
    as: 'owner',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(Space, {
    foreignKey: 'owner_id',
    as: 'ownedSpaces',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Space.belongsToMany(User, {
    through: SpaceMember,
    foreignKey: 'space_id',
    otherKey: 'user_id',
    as: 'members',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.belongsToMany(Space, {
    through: SpaceMember,
    foreignKey: 'user_id',
    otherKey: 'space_id',
    as: 'spaces',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Space-Creator association
  Space.belongsTo(User, {
    foreignKey: 'created_by_id',
    as: 'creator',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(Space, {
    foreignKey: 'created_by_id',
    as: 'createdSpaces',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Space-Rejector association
  Space.belongsTo(User, {
    foreignKey: 'rejected_by',
    as: 'rejector',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  User.hasMany(Space, {
    foreignKey: 'rejected_by',
    as: 'rejectedSpaces',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  // Cabinet associations
  Cabinet.belongsTo(Space, {
    foreignKey: 'space_id',
    as: 'space',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Space.hasMany(Cabinet, {
    foreignKey: 'space_id',
    as: 'cabinets',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Cabinet.belongsTo(Cabinet, {
    foreignKey: 'parent_id',
    as: 'parent',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Cabinet.hasMany(Cabinet, {
    foreignKey: 'parent_id',
    as: 'children',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Cabinet-User associations
  Cabinet.belongsTo(User, {
    foreignKey: 'created_by_id',
    as: 'creator',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(Cabinet, {
    foreignKey: 'created_by_id',
    as: 'createdCabinets',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Cabinet.belongsToMany(User, {
    through: CabinetMember,
    foreignKey: 'cabinet_id',
    otherKey: 'user_id',
    as: 'members',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.belongsToMany(Cabinet, {
    through: CabinetMember,
    foreignKey: 'user_id',
    otherKey: 'cabinet_id',
    as: 'memberCabinets',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Record associations
  Record.belongsTo(Cabinet, {
    foreignKey: 'cabinet_id',
    as: 'cabinet',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Cabinet.hasMany(Record, {
    foreignKey: 'cabinet_id',
    as: 'records',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Record.belongsTo(User, {
    foreignKey: 'creator_id',
    as: 'creator',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(Record, {
    foreignKey: 'creator_id',
    as: 'createdRecords',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Record.belongsTo(User, {
    foreignKey: 'last_modified_by',
    as: 'modifier',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  User.hasMany(Record, {
    foreignKey: 'last_modified_by',
    as: 'modifiedRecords',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  // Cabinet Member associations
  Cabinet.hasMany(CabinetMember, {
    foreignKey: 'cabinet_id',
    as: 'cabinetMembers',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CabinetMember.belongsTo(Cabinet, {
    foreignKey: 'cabinet_id',
    as: 'cabinet',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(CabinetMember, {
    foreignKey: 'user_id',
    as: 'cabinetMemberships',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CabinetMember.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Cabinet Member Permission associations
  CabinetMember.hasOne(CabinetMemberPermission, {
    foreignKey: 'cabinet_member_id',
    as: 'memberPermissions',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CabinetMemberPermission.belongsTo(CabinetMember, {
    foreignKey: 'cabinet_member_id',
    as: 'cabinetMember',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CabinetMemberPermission.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  CabinetMemberPermission.belongsTo(Cabinet, {
    foreignKey: 'cabinet_id',
    as: 'cabinet',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Record and File associations
  Record.belongsToMany(File, { 
    through: RecordFile,
    foreignKey: 'record_id',
    otherKey: 'file_id',
    as: 'files',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  
  File.belongsToMany(Record, { 
    through: RecordFile,
    foreignKey: 'file_id',
    otherKey: 'record_id',
    as: 'records',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  
  // File-User associations
  File.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  
  User.hasMany(File, {
    foreignKey: 'user_id',
    as: 'files',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Chat message associations
  ChatMessage.belongsTo(Record, {
    foreignKey: 'recordId',
    as: 'record',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  
  Record.hasMany(ChatMessage, {
    foreignKey: 'recordId',
    as: 'chatMessages',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  
  ChatMessage.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  
  User.hasMany(ChatMessage, {
    foreignKey: 'userId',
    as: 'chatMessages',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // User-Group associations
  User.belongsToMany(Group, {
    through: 'group_members',
    foreignKey: 'user_id',
    otherKey: 'group_id',
    as: 'groups'
  });

  Group.belongsToMany(User, {
    through: 'group_members',
    foreignKey: 'group_id',
    otherKey: 'user_id',
    as: 'members'
  });

  Group.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });

  Cabinet.hasMany(CabinetReassignment, {
    foreignKey: 'cabinetId',
    as: 'reassignments'
  });
  
  CabinetReassignment.belongsTo(Cabinet, {
    foreignKey: 'cabinetId',
    as: 'cabinet'
  });

  CabinetReassignment.belongsTo(User, {
    foreignKey: 'fromUserId',
    as: 'fromUser',
  });
  CabinetReassignment.belongsTo(User, {
    foreignKey: 'toUserId',
    as: 'toUser',
  });


  TemplateShare.belongsTo(User, {
    foreignKey: 'sharedByUserId', 
    targetKey: 'id',  
    as: 'sharedByUser' 
  });


  TemplateShare.belongsTo(User, {
      foreignKey: 'sharedWithUserId', 
      targetKey: 'id', 
      as: 'sharedWithUser'  
  });

  // Define the relationship to the Template
  TemplateShare.belongsTo(Template, {
      foreignKey: 'templateId', 
      targetKey: 'id', 
      as: 'template'
  });

  User.hasMany(TemplateShare, {
    sourceKey: 'id',
    foreignKey: 'sharedByUserId', 
    as: 'initiatedShares'  
  });


  User.hasMany(TemplateShare, {
    sourceKey: 'id', 
    foreignKey: 'sharedWithUserId',
    as: 'receivedShares'  
  });

  Template.hasMany(TemplateShare, {
    sourceKey: 'id', 
    foreignKey: 'templateId',
    as: 'shares' 
  });

  Template.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id', 
    as: 'user'         
  });

  User.hasMany(Template, {
    sourceKey: 'id', 
    foreignKey: 'userId',
    as: 'createdTemplates'
  });





}

// Export the function with both names for backward compatibility
export const initializeAssociations = setupAssociations;