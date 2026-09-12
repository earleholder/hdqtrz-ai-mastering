import { StudioBookingInquiry } from '../types';

const STORAGE_KEY = 'hdqtrz_studio_inquiries';

export function getStoredInquiries(): StudioBookingInquiry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load studio inquiries:', err);
    return [];
  }
}

export function saveInquiry(inquiry: Omit<StudioBookingInquiry, 'id' | 'createdAt' | 'status'>): StudioBookingInquiry {
  const existing = getStoredInquiries();
  const newInquiry: StudioBookingInquiry = {
    ...inquiry,
    id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: 'new',
    clientEmailDispatched: true
  };

  const updated = [newInquiry, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save studio inquiry:', err);
  }

  return newInquiry;
}

export function updateInquiryStatus(id: string, status: StudioBookingInquiry['status']): void {
  const existing = getStoredInquiries();
  const updated = existing.map(item => item.id === id ? { ...item, status } : item);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update inquiry status:', err);
  }
}

export function deleteInquiry(id: string): void {
  const existing = getStoredInquiries();
  const updated = existing.filter(item => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete inquiry:', err);
  }
}
