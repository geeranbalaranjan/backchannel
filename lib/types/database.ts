export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CourseRole = "instructor" | "student";
export type MessageKind = "chat" | "question";
export type ModerationActionType = "mute" | "ban" | "warn" | "alias_reset";

export interface Course {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface CourseMember {
  id: string;
  course_id: string;
  user_id: string;
  role: CourseRole;
  alias: string | null;
  alias_locked: boolean;
  alias_changed_count: number;
  muted_until: string | null;
  created_at: string;
}

export interface LectureSession {
  id: string;
  course_id: string;
  created_by: string;
  starts_at: string;
  ends_at: string | null;
  join_secret: string;
  is_active: boolean;
  is_locked: boolean;
  current_slide_index: number | null;
  created_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  course_id: string;
  user_id: string;
  alias_snapshot: string;
  body: string;
  kind: MessageKind;
  slide_index: number | null;
  t_offset_ms: number;
  is_hidden: boolean;
  pinned_at: string | null;
  pinned_by: string | null;
  created_at: string;
}

export interface MessageVote {
  id: string;
  message_id: string;
  course_id: string;
  user_id: string;
  value: number;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  course_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface ModerationAction {
  id: string;
  course_id: string;
  session_id: string | null;
  target_user_id: string;
  action: ModerationActionType;
  reason: string | null;
  created_by: string;
  created_at: string;
}

export interface Report {
  id: string;
  course_id: string;
  session_id: string;
  message_id: string;
  reporter_user_id: string;
  reason: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      courses: { Row: Course; Insert: Omit<Course, "id">; Update: Partial<Course> };
      course_members: { Row: CourseMember; Insert: Omit<CourseMember, "id">; Update: Partial<CourseMember> };
      lecture_sessions: { Row: LectureSession; Insert: Omit<LectureSession, "id">; Update: Partial<LectureSession> };
      messages: { Row: Message; Insert: Omit<Message, "id">; Update: Partial<Message> };
      message_votes: { Row: MessageVote; Insert: Omit<MessageVote, "id">; Update: Partial<MessageVote> };
      message_reactions: { Row: MessageReaction; Insert: Omit<MessageReaction, "id">; Update: Partial<MessageReaction> };
      moderation_actions: { Row: ModerationAction; Insert: Omit<ModerationAction, "id">; Update: Partial<ModerationAction> };
      reports: { Row: Report; Insert: Omit<Report, "id">; Update: Partial<Report> };
    };
  };
}
