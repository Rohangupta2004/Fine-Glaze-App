/**
 * Fine Glaze COS — Core TypeScript types
 * Matches Supabase schema from PRD §5
 */

export type UserRole =
  | 'owner'
  | 'project_manager'
  | 'hr'
  | 'accounts'
  | 'supervisor'
  | 'worker'
  | 'client';

export type ProfileStatus = 'active' | 'on_leave' | 'on_hold' | 'inactive';

export type ProjectStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed';

export type ProjectStage = 'fabrication' | 'installation' | 'finishing';

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'half_day';

export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'done' | 'blocked';

export type DprStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type MaterialRequestStatus = 'pending' | 'approved' | 'rejected' | 'ordered';

export type DeliveryStatus = 'in_transit' | 'delivered';

export type PaymentStatus = 'paid' | 'pending';

export type ConversationType = 'project' | 'direct';

export type DprMediaType = 'photo' | 'video';

export type DocumentCategory =
  | 'drawings'
  | 'boq'
  | 'work_orders'
  | 'warranty'
  | 'safety'
  | 'invoices'
  | 'contracts'
  | 'quotation'
  | 'amc'
  | 'other';

/** Which UI experience the role maps to */
export type UIExperience = 'admin' | 'supervisor' | 'worker' | 'client';

export function getUIExperience(role: UserRole): UIExperience {
  switch (role) {
    case 'owner':
    case 'project_manager':
    case 'hr':
    case 'accounts':
      return 'admin';
    case 'supervisor':
      return 'supervisor';
    case 'worker':
      return 'worker';
    case 'client':
      return 'client';
  }
}

// ── Row types (matching Supabase tables) ──────────────

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  settings: Record<string, any>;
}

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  worker_id: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  joining_date: string | null;
  address: string | null;
  reporting_to: string | null;
  daily_rate: number | null;
  bank_details: Record<string, any> | null;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  type: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  geofence_radius_m: number;
  client_org_id: string | null;
  status: ProjectStatus;
  progress_pct: number;
  stage: ProjectStage | null;
  start_date: string | null;
  expected_end_date: string | null;
}

export interface Assignment {
  id: string;
  project_id: string;
  profile_id: string;
  role_on_site: string | null;
  level_zone: string | null;
  shift_start: string | null;
  shift_end: string | null;
  active: boolean;
}

export interface Attendance {
  id: string;
  profile_id: string;
  project_id: string;
  date: string;
  check_in_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_selfie_url: string | null;
  location_verified: boolean;
  check_out_at: string | null;
  work_duration_min: number | null;
  ot_min: number | null;
  status: AttendanceStatus;
  synced: boolean;
}

export interface Task {
  id: string;
  project_id: string;
  assigned_to: string | null;
  title: string;
  level_zone: string | null;
  priority: TaskPriority;
  window_start: string | null;
  window_end: string | null;
  status: TaskStatus;
  created_by: string;
  recurring_task_id: string | null;
}

export interface Dpr {
  id: string;
  project_id: string;
  submitted_by: string;
  date: string;
  work_type: string | null;
  level_zone: string | null;
  work_done: string;
  status: DprStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  synced: boolean;
}

export interface DprMedia {
  id: string;
  dpr_id: string;
  type: DprMediaType;
  storage_path: string;
  duration_s: number | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  profile_id: string;
  company_id: string;
  type: LeaveType;
  from_date: string;
  to_date: string;
  reason: string | null;
  attachment_path: string | null;
  status: RequestStatus;
  decided_by: string | null;
  decided_at: string | null;
}

export interface AdvanceRequest {
  id: string;
  profile_id: string;
  amount: number;
  reason: string | null;
  status: RequestStatus;
  decided_by: string | null;
  decided_at: string | null;
}

export interface Material {
  id: string;
  project_id: string;
  name: string;
  spec: string | null;
  unit: string | null;
  stock_qty: number;
}

export interface MaterialRequest {
  id: string;
  project_id: string;
  requested_by: string;
  material_name: string;
  spec: string | null;
  qty: number;
  needed_by: string | null;
  notes: string | null;
  photo_path: string | null;
  status: MaterialRequestStatus;
}

export interface Delivery {
  id: string;
  material_request_id: string;
  delivery_code: string | null;
  status: DeliveryStatus;
  delivered_at: string | null;
  photos: string[];
}

export interface DocumentRow {
  id: string;
  owner_type: 'profile' | 'project';
  owner_id: string;
  category: DocumentCategory;
  title: string;
  uploaded_by: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  rev_no: number;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  is_current: boolean;
}

export interface Expense {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  category: string | null;
  receipt_photo_path: string | null;
  entered_by: string;
  date: string;
}

export interface Payment {
  id: string;
  project_id: string;
  milestone_name: string;
  amount: number;
  status: PaymentStatus;
  due_date: string | null;
  paid_at: string | null;
}

export interface ClientApproval {
  id: string;
  project_id: string;
  request_code: string | null;
  title: string;
  details: Record<string, any> | null;
  photos: string[];
  requested_by: string;
  status: RequestStatus;
  decided_at: string | null;
}

export interface Conversation {
  id: string;
  company_id: string;
  type: ConversationType;
  project_id: string | null;
  created_at: string;
}

export interface SafetyCheck {
  id: string;
  profile_id: string;
  project_id: string;
  date: string;
  items: Record<string, boolean>;
  concern_reported: string | null;
}

export interface AuditLogEntry {
  id: string;
  company_id: string;
  actor_id: string;
  action: string;
  ref_table: string;
  ref_id: string;
  detail: Record<string, any> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  kind: string;
  title: string;
  body: string;
  ref_table: string | null;
  ref_id: string | null;
  read_at: string | null;
  important: boolean;
  created_at?: string;
}
