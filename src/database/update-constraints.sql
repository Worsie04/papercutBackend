-- Drop existing constraints first to avoid conflicts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT DISTINCT tc.table_name, tc.constraint_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.constraint_column_usage ccu 
              ON tc.constraint_name = ccu.constraint_name
              WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = current_schema())
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name) || ' CASCADE;';
    END LOOP;
END $$;

-- Add proper foreign key constraints with CASCADE behavior
ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_invited_by_fkey 
    FOREIGN KEY (invited_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

ALTER TABLE spaces
    ADD CONSTRAINT spaces_owner_id_fkey 
    FOREIGN KEY (owner_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE spaces
    ADD CONSTRAINT spaces_created_by_id_fkey 
    FOREIGN KEY (created_by_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE spaces
    ADD CONSTRAINT spaces_rejected_by_fkey 
    FOREIGN KEY (rejected_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

ALTER TABLE cabinets
    ADD CONSTRAINT cabinets_space_id_fkey 
    FOREIGN KEY (space_id) 
    REFERENCES spaces(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE cabinets
    ADD CONSTRAINT cabinets_parent_id_fkey 
    FOREIGN KEY (parent_id) 
    REFERENCES cabinets(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE cabinets
    ADD CONSTRAINT cabinets_created_by_id_fkey 
    FOREIGN KEY (created_by_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE records
    ADD CONSTRAINT records_cabinet_id_fkey 
    FOREIGN KEY (cabinet_id) 
    REFERENCES cabinets(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE records
    ADD CONSTRAINT records_creator_id_fkey 
    FOREIGN KEY (creator_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE records
    ADD CONSTRAINT records_last_modified_by_fkey 
    FOREIGN KEY (last_modified_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS spaces_owner_id_idx ON spaces(owner_id);
CREATE INDEX IF NOT EXISTS cabinets_space_id_idx ON cabinets(space_id);
CREATE INDEX IF NOT EXISTS cabinets_parent_id_idx ON cabinets(parent_id);
CREATE INDEX IF NOT EXISTS records_cabinet_id_idx ON records(cabinet_id);
CREATE INDEX IF NOT EXISTS records_creator_id_idx ON records(creator_id); 