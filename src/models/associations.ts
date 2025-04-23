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
import { Letter } from './letter.model';
import { LetterReviewer } from './letter-reviewer.model';
import { LetterActionLog } from './letter-action-log.model';


export function setupAssociations() {
  // --- Existing associations ---

  Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

  Organization.belongsTo(User, { foreignKey: 'owner_id', as: 'organizationOwner' });
  User.hasMany(Organization, { foreignKey: 'owner_id', as: 'ownedOrganizations' });

  Organization.belongsTo(Admin, { foreignKey: 'owner_id', as: 'adminOwner' });
  Admin.hasMany(Organization, { foreignKey: 'owner_id', as: 'ownedAdminOrganizations' });

  Organization.hasMany(OrganizationMember, { foreignKey: 'organization_id', as: 'members' });
  OrganizationMember.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
  User.hasMany(OrganizationMember, { foreignKey: 'user_id', as: 'organizationMemberships' });
  OrganizationMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(OrganizationMember, { foreignKey: 'invited_by', as: 'invitedMembers' });
  OrganizationMember.belongsTo(User, { foreignKey: 'invited_by', as: 'inviter' });

  User.belongsToMany(Role, { through: 'user_roles', foreignKey: 'user_id', otherKey: 'role_id', as: 'Roles' });
  Role.belongsToMany(User, { through: 'user_roles', foreignKey: 'role_id', otherKey: 'user_id', as: 'Users' });

  Space.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
  User.hasMany(Space, { foreignKey: 'owner_id', as: 'ownedSpaces' });
  Space.belongsToMany(User, { through: SpaceMember, foreignKey: 'space_id', otherKey: 'user_id', as: 'members' });
  User.belongsToMany(Space, { through: SpaceMember, foreignKey: 'user_id', otherKey: 'space_id', as: 'spaces' });

  Space.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator' });
  User.hasMany(Space, { foreignKey: 'created_by_id', as: 'createdSpaces' });

  Space.belongsTo(User, { foreignKey: 'rejected_by', as: 'rejector' });
  User.hasMany(Space, { foreignKey: 'rejected_by', as: 'rejectedSpaces' });

  Cabinet.belongsTo(Space, { foreignKey: 'space_id', as: 'space' });
  Space.hasMany(Cabinet, { foreignKey: 'space_id', as: 'cabinets' });
  Cabinet.belongsTo(Cabinet, { foreignKey: 'parent_id', as: 'parent' });
  Cabinet.hasMany(Cabinet, { foreignKey: 'parent_id', as: 'children' });

  Cabinet.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator' });
  User.hasMany(Cabinet, { foreignKey: 'created_by_id', as: 'createdCabinets' });
  Cabinet.belongsToMany(User, { through: CabinetMember, foreignKey: 'cabinet_id', otherKey: 'user_id', as: 'members' });
  User.belongsToMany(Cabinet, { through: CabinetMember, foreignKey: 'user_id', otherKey: 'cabinet_id', as: 'memberCabinets' });

  Record.belongsTo(Cabinet, { foreignKey: 'cabinet_id', as: 'cabinet' });
  Cabinet.hasMany(Record, { foreignKey: 'cabinet_id', as: 'records' });
  Record.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });
  User.hasMany(Record, { foreignKey: 'creator_id', as: 'createdRecords' });
  Record.belongsTo(User, { foreignKey: 'last_modified_by', as: 'modifier' });
  User.hasMany(Record, { foreignKey: 'last_modified_by', as: 'modifiedRecords' });

  Cabinet.hasMany(CabinetMember, { foreignKey: 'cabinet_id', as: 'cabinetMembers' });
  CabinetMember.belongsTo(Cabinet, { foreignKey: 'cabinet_id', as: 'cabinet' });
  User.hasMany(CabinetMember, { foreignKey: 'user_id', as: 'cabinetMemberships' });
  CabinetMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  CabinetMember.hasOne(CabinetMemberPermission, { foreignKey: 'cabinet_member_id', as: 'memberPermissions' });
  CabinetMemberPermission.belongsTo(CabinetMember, { foreignKey: 'cabinet_member_id', as: 'cabinetMember' });
  CabinetMemberPermission.belongsTo(User, { foreignKey: 'user_id', as: 'userPermission' }); // Renamed alias
  CabinetMemberPermission.belongsTo(Cabinet, { foreignKey: 'cabinet_id', as: 'cabinetPermission' }); // Renamed alias

  Record.belongsToMany(File, { through: RecordFile, foreignKey: 'record_id', otherKey: 'file_id', as: 'files' });
  File.belongsToMany(Record, { through: RecordFile, foreignKey: 'file_id', otherKey: 'record_id', as: 'records' });

  File.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });
  User.hasMany(File, { foreignKey: 'user_id', as: 'files' });

  ChatMessage.belongsTo(Record, { foreignKey: 'recordId', as: 'record' });
  Record.hasMany(ChatMessage, { foreignKey: 'recordId', as: 'chatMessages' });
  ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'chatMessages' });

  User.belongsToMany(Group, { through: 'group_members', foreignKey: 'user_id', otherKey: 'group_id', as: 'groups' });
  Group.belongsToMany(User, { through: 'group_members', foreignKey: 'group_id', otherKey: 'user_id', as: 'members' });
  Group.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  Cabinet.hasMany(CabinetReassignment, { foreignKey: 'cabinetId', as: 'reassignments' });
  CabinetReassignment.belongsTo(Cabinet, { foreignKey: 'cabinetId', as: 'cabinet' });
  CabinetReassignment.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' });
  CabinetReassignment.belongsTo(User, { foreignKey: 'toUserId', as: 'toUser' });

  TemplateShare.belongsTo(User, { foreignKey: 'sharedByUserId', targetKey: 'id', as: 'sharedByUser' });
  TemplateShare.belongsTo(User, { foreignKey: 'sharedWithUserId', targetKey: 'id', as: 'sharedWithUser' });
  TemplateShare.belongsTo(Template, { foreignKey: 'templateId', targetKey: 'id', as: 'template' });
  User.hasMany(TemplateShare, { sourceKey: 'id', foreignKey: 'sharedByUserId', as: 'initiatedShares' });
  User.hasMany(TemplateShare, { sourceKey: 'id', foreignKey: 'sharedWithUserId', as: 'receivedShares' });
  Template.hasMany(TemplateShare, { sourceKey: 'id', foreignKey: 'templateId', as: 'shares' });

  Template.belongsTo(User, { foreignKey: 'userId', targetKey: 'id', as: 'user' });
  User.hasMany(Template, { sourceKey: 'id', foreignKey: 'userId', as: 'createdTemplates' });


  // --- LETTER ASSOCIATIONS (with fix) ---

  Letter.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(Letter, { foreignKey: 'userId', as: 'createdLetters' });

  Letter.belongsTo(Template, { foreignKey: 'templateId', as: 'template', constraints: false });
  Template.hasMany(Letter, { foreignKey: 'templateId', as: 'lettersFromTemplate' });

  Letter.belongsTo(User, { foreignKey: 'nextActionById', as: 'nextActionBy', constraints: false });

  Letter.hasMany(LetterReviewer, { foreignKey: 'letterId', as: 'letterReviewers' });
  LetterReviewer.belongsTo(Letter, { foreignKey: 'letterId', as: 'letter' });

  LetterReviewer.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  // --- ALIAS FIXED HERE ---
  User.hasMany(LetterReviewer, { foreignKey: 'userId', as: 'letterReviewerAssignments' }); // Changed alias

  LetterReviewer.belongsTo(User, { foreignKey: 'reassignedFromUserId', as: 'reassignedFromUser', constraints: false });

  Letter.hasMany(LetterActionLog, { foreignKey: 'letterId', as: 'letterActionLogs' });
  LetterActionLog.belongsTo(Letter, { foreignKey: 'letterId', as: 'letter' });

  LetterActionLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(LetterActionLog, { foreignKey: 'userId', as: 'letterActions' });

  // --- END LETTER ASSOCIATIONS ---

}

export const initializeAssociations = setupAssociations;