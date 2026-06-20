import { create } from 'zustand'
import { sessionUser } from '@/api/authSession'

export const useAppStore = create((set) => ({
  user: sessionUser(),
  selectedDeviceId: null,
  sidebarOpen: false,
  modalOpen: false,
  setUser: (user) => set({ user }),
  selectDevice: (selectedDeviceId) => set({ selectedDeviceId }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setModalOpen: (modalOpen) => set({ modalOpen }),
}))
