import { Organization } from './organization.model';
import { User } from './user.model';
import { OrganizationMember } from './organization-member.model';
import { setupSpaceReassignmentAssociations } from './space-reassignment.model';
import { initPdfFileAssociations } from './pdf-file.model';

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
  
  // Set up associations for SpaceReassignment
  setupSpaceReassignmentAssociations();
  initPdfFileAssociations();
};