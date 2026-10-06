import AdminHeader from '@/components/tent/AdminHeader'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <AdminHeader />
      {children}
    </div>
  )
}
