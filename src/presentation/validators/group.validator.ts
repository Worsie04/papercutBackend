import { z } from 'zod';

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    organizationId: z.string().min(1, 'Organization ID is required')
  })
});

export const updateGroupSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid group ID'),
  }),
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional()
  })
});

// Schema for /assign endpoint
export const addUsersToGroupSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().uuid('Invalid user ID')),
    groupIds: z.array(z.string().uuid('Invalid group ID')),
    organizationId: z.string().uuid('Invalid organization ID')
  }).strict()
});

// Separate schema for /:groupId/members endpoint
export const addUsersToSingleGroupSchema = z.object({
  params: z.object({
    groupId: z.string().uuid('Invalid group ID')
  }),
  body: z.object({
    userIds: z.array(z.string().uuid('Invalid user ID'))
  }).strict()
}); 