-- Add title & created_by column to conversations for Group Chats
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Update check constraint to allow 'group' type
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_type_check CHECK (type IN ('direct', 'project', 'group'));
