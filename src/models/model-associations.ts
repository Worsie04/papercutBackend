import { Organization } from './organization.model';
import { User } from './user.model';
import { OrganizationMember } from './organization-member.model';
import { setupSpaceReassignmentAssociations } from './space-reassignment.model';
import { initPdfFileAssociations } from './pdf-file.model';
import { Record } from './record.model';
import File from './file.model';
import RecordFile from './record-file.model';

export const setupAssociations = () => {
  // Set up associations for OrganizationMember
  OrganizationMember.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  OrganizationMember.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization'
  });

  OrganizationMember.belongsTo(User, {
    foreignKey: 'invitedBy',
    as: 'inviter'
  });

  Organization.hasMany(OrganizationMember, {
    foreignKey: 'organizationId',
    as: 'members'
  });

  User.hasMany(OrganizationMember, {
    foreignKey: 'userId',
    as: 'organizationMemberships'
  });
  
  // Set up associations for Record and File (many-to-many)
  Record.belongsToMany(File, { 
    through: RecordFile,
    foreignKey: 'recordId',
    as: 'files'
  });
  
  File.belongsToMany(Record, { 
    through: RecordFile,
    foreignKey: 'fileId',
    as: 'records'
  });
  
  // File belongs to a user
  File.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  User.hasMany(File, {
    foreignKey: 'userId',
    as: 'files'
  });
  
  // Set up associations for SpaceReassignment
  setupSpaceReassignmentAssociations();
  initPdfFileAssociations();
};