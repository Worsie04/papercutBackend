import { Organization } from './organization.model';
import { User } from './user.model';
import { OrganizationMember } from './organization-member.model';
import { setupOrganizationMemberAssociations } from './organization-member.model';

export const setupAssociations = () => {
  // Set up associations for OrganizationMember
  setupOrganizationMemberAssociations({ Organization, User });
}; 