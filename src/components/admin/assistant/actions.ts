import { AssistantAction } from './types';

export const assistantActions: AssistantAction[] = [
  {
    id: 'find-by-name',
    label: 'Find reservation by guest name',
    icon: '🔍',
    steps: [
      { type: 'awaiting-text', prompt: 'Enter the guest name to search for:', inputKey: 'guestName', placeholder: 'Guest name...' },
    ],
  },
  {
    id: 'check-availability',
    label: 'Check availability for specific dates',
    icon: '📅',
    steps: [
      { type: 'awaiting-dates', prompt: 'Select check-in and check-out dates:', inputKey: 'dates' },
    ],
  },
  {
    id: 'reservations-by-room',
    label: 'Show reservations for a room type',
    icon: '🛏️',
    steps: [
      { type: 'awaiting-room-type', prompt: 'Select a room type:', inputKey: 'roomTypeId' },
    ],
  },
  {
    id: 'reservations-between-dates',
    label: 'Find reservations between two dates',
    icon: '📆',
    steps: [
      { type: 'awaiting-dates', prompt: 'Select start and end dates:', inputKey: 'dates' },
    ],
  },
  {
    id: 'external-reservations',
    label: 'Show reservations from external platforms',
    icon: '🌐',
    steps: [],
  },
  {
    id: 'long-stays',
    label: 'Show reservations longer than 3 nights',
    icon: '🌙',
    steps: [],
  },
  {
    id: 'current-guests',
    label: 'Show guests currently staying',
    icon: '🏨',
    steps: [],
  },
  {
    id: 'missing-contact',
    label: 'Find reservations with missing contact info',
    icon: '⚠️',
    steps: [],
  },
  {
    id: 'search-contact',
    label: 'Search reservations by phone or email',
    icon: '📧',
    steps: [
      { type: 'awaiting-text', prompt: 'Enter phone number or email to search:', inputKey: 'contact', placeholder: 'Phone or email...' },
    ],
  },
  {
    id: 'overlapping-date',
    label: 'Show reservations overlapping with a date',
    icon: '📌',
    steps: [
      { type: 'awaiting-date', prompt: 'Select a date to check for overlapping reservations:', inputKey: 'date' },
    ],
  },
];
