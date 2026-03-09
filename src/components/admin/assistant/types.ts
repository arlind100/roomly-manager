export interface AssistantMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  results?: ReservationResult[];
  availabilityResults?: AvailabilityResult[];
}

export interface ReservationResult {
  id: string;
  guest_name: string;
  room_type_name?: string;
  check_in: string;
  check_out: string;
  status: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  external_platform?: string | null;
}

export interface AvailabilityResult {
  room_type_id: string;
  name: string;
  available_units: number;
  booked_units: number;
  free_units: number;
}

export type AssistantStepType = 'idle' | 'awaiting-text' | 'awaiting-dates' | 'awaiting-room-type' | 'awaiting-date';

export interface AssistantState {
  step: AssistantStepType;
  actionId: string | null;
  collectedInput: Record<string, string>;
}

export interface AssistantAction {
  id: string;
  label: string;
  icon: string;
  steps: AssistantStep[];
}

export interface AssistantStep {
  type: AssistantStepType;
  prompt: string;
  inputKey?: string;
  placeholder?: string;
}
