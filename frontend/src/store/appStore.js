import { create } from 'zustand'

export const useAppStore = create((set) => ({
  user: { id: 'demo-user', name: 'Hackathon debel' },
  selectedDeviceId: null,
  sidebarOpen: false,
  modalOpen: false,
  setUser: (user) => set({ user }),
  selectDevice: (selectedDeviceId) => set({ selectedDeviceId }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setModalOpen: (modalOpen) => set({ modalOpen }),
}))
