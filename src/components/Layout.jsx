import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/finance', label: 'บัญชี' },
  { to: '/stock', label: 'เช็คสต๊อก' },
  { to: '/team', label: 'ทีมงาน' },
  { to: '/', label: 'สรุปภาพรวม', end: true },
  { to: '/purchase', label: 'แจ้งเบิกพัสดุ' },
]

export default function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const today = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src="/mut-mark.png" alt="MUT logo" className="h-11 w-auto shrink-0" />
            <div>
              <p className="font-semibold text-ink leading-tight">MUT Exhibition 2569</p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">
                ระบบบริหารจัดการบัญชี คลังสต๊อก และสมาชิกร่วมโครงการ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="badge bg-gray-100 text-gray-600">
              {profile?.full_name || '—'}
            </span>
            <span className={`badge ${isAdmin ? 'badge-approved' : 'badge-pending'}`}>
              {isAdmin ? 'ผู้อนุมัติ' : 'สมาชิก'}
            </span>
            <span className="badge bg-gray-100 text-gray-500">{today}</span>
            <button
              onClick={signOut}
              title="ออกจากระบบ"
              className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-danger flex items-center justify-center transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <nav className="max-w-6xl mx-auto px-6 pb-4 flex items-center gap-2 flex-wrap">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  isActive
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-accent/40 hover:text-accent'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto w-full px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
