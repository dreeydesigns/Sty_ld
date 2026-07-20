"use client";

import { create } from "zustand";

import { bookingDates, bookingTimes } from "@/lib/site-data";

type TargetType = "salons" | "professionals";
export const BOOKING_DRAFT_CACHE_KEY = "mobile-salon.booking-draft.v1";

interface ContactDetails {
  fullName: string;
  phone: string;
  email: string;
  note: string;
}

interface NotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  text: boolean;
}

export interface BookingDraft {
  targetType: TargetType;
  targetId: string | null;
  selectedServiceIds: string[];
  selectedDate: string;
  selectedTime: string;
  contact: ContactDetails;
  notifications: NotificationPreferences;
  savedAt: string;
}

interface BookingState {
  step: number;
  targetType: TargetType;
  targetId: string | null;
  selectedServiceIds: string[];
  selectedDate: string;
  selectedTime: string;
  contact: ContactDetails;
  notifications: NotificationPreferences;
  status: "idle" | "processing" | "done";
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setTarget: (targetType: TargetType, targetId?: string | null) => void;
  toggleService: (serviceId: string) => void;
  setSelectedServices: (serviceIds: string[]) => void;
  setDate: (date: string) => void;
  setTime: (time: string) => void;
  setContact: (field: keyof ContactDetails, value: string) => void;
  toggleNotification: (field: keyof NotificationPreferences) => void;
  setStatus: (status: BookingState["status"]) => void;
  saveBookingDraft: () => void;
  restoreBookingDraft: () => boolean;
  reset: () => void;
}

const initialState = {
  step: 1,
  targetType: "salons" as TargetType,
  targetId: null,
  selectedServiceIds: [] as string[],
  selectedDate: bookingDates[1]?.date ?? "17 Apr",
  selectedTime: bookingTimes[2] ?? "11:00 AM",
  contact: {
    fullName: "",
    phone: "",
    email: "",
    note: "",
  },
  notifications: {
    email: true,
    whatsapp: true,
    text: false,
  },
  status: "idle" as const,
};

function canUseSessionStorage() {
  return typeof window !== "undefined" && "sessionStorage" in window;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  nextStep: () =>
    set((state) => ({
      step: Math.min(state.step + 1, 5),
    })),
  previousStep: () =>
    set((state) => ({
      step: Math.max(state.step - 1, 1),
    })),
  setTarget: (targetType, targetId = null) =>
    set({
      targetType,
      targetId,
    }),
  toggleService: (serviceId) =>
    set((state) => ({
      selectedServiceIds: state.selectedServiceIds.includes(serviceId)
        ? state.selectedServiceIds.filter((id) => id !== serviceId)
        : [...state.selectedServiceIds, serviceId],
    })),
  setSelectedServices: (serviceIds) => set({ selectedServiceIds: serviceIds }),
  setDate: (selectedDate) => set({ selectedDate }),
  setTime: (selectedTime) => set({ selectedTime }),
  setContact: (field, value) =>
    set((state) => ({
      contact: {
        ...state.contact,
        [field]: value,
      },
    })),
  toggleNotification: (field) =>
    set((state) => ({
      notifications: {
        ...state.notifications,
        [field]: !state.notifications[field],
      },
    })),
  setStatus: (status) => set({ status }),
  saveBookingDraft: () => {
    if (!canUseSessionStorage()) {
      return;
    }

    const state = get();
    const draft: BookingDraft = {
      targetType: state.targetType,
      targetId: state.targetId,
      selectedServiceIds: state.selectedServiceIds,
      selectedDate: state.selectedDate,
      selectedTime: state.selectedTime,
      contact: state.contact,
      notifications: state.notifications,
      savedAt: new Date().toISOString(),
    };

    window.sessionStorage.setItem(BOOKING_DRAFT_CACHE_KEY, JSON.stringify(draft));
  },
  restoreBookingDraft: () => {
    if (!canUseSessionStorage()) {
      return false;
    }

    const rawDraft = window.sessionStorage.getItem(BOOKING_DRAFT_CACHE_KEY);

    if (!rawDraft) {
      return false;
    }

    try {
      const draft = JSON.parse(rawDraft) as BookingDraft;

      set({
        targetType: draft.targetType,
        targetId: draft.targetId,
        selectedServiceIds: draft.selectedServiceIds,
        selectedDate: draft.selectedDate,
        selectedTime: draft.selectedTime,
        contact: draft.contact,
        notifications: draft.notifications,
      });

      return true;
    } catch {
      window.sessionStorage.removeItem(BOOKING_DRAFT_CACHE_KEY);
      return false;
    }
  },
  reset: () => {
    if (canUseSessionStorage()) {
      window.sessionStorage.removeItem(BOOKING_DRAFT_CACHE_KEY);
    }

    set(initialState);
  },
}));
