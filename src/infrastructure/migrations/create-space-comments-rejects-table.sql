-- Create space_comments_rejects table
CREATE TABLE IF NOT EXISTS space_comments_rejects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'comment', 'rejection', 'approval', 'update', 'system'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_space_comments_rejects_space_id ON space_comments_rejects(space_id);
CREATE INDEX IF NOT EXISTS idx_space_comments_rejects_user_id ON space_comments_rejects(user_id);
CREATE INDEX IF NOT EXISTS idx_space_comments_rejects_created_at ON space_comments_rejects(created_at);

-- Add comment
COMMENT ON TABLE space_comments_rejects IS 'Stores comments and rejection reasons for spaces';
COMMENT ON COLUMN space_comments_rejects.id IS 'Unique identifier for the comment';
COMMENT ON COLUMN space_comments_rejects.space_id IS 'Reference to the space this comment belongs to';
COMMENT ON COLUMN space_comments_rejects.user_id IS 'Reference to the user who created this comment';
COMMENT ON COLUMN space_comments_rejects.message IS 'The content of the comment or rejection reason';
COMMENT ON COLUMN space_comments_rejects.type IS 'Type of the message: comment, rejection, approval, update, or system';
COMMENT ON COLUMN space_comments_rejects.created_at IS 'Timestamp when the comment was created'; 