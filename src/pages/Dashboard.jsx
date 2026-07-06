import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Landmark, PiggyBank, Fuel, Coins } from 'lucide-react'

const COLORS = ['#0F6E56', '#D85A30', '#534AB7', '#BA7517', '#185FA5']

// Pick an icon + accent color based on the fund name (falls back to a neutral wallet icon)
function fundStyle(name = '') {
  if (name.includes('สำรอง')) return { Icon: PiggyBank, bg: 'bg-pink-50', fg: 'text-pink-500' }
  if (name.includes('น้ำมัน')) return { Icon: Fuel, bg: 'bg-amber-50', fg: 'text-amber-600' }
  return { Icon: Landmark, bg: 'bg-blue-50', fg: 'text-blue-600' }
}

export default function Dashboard() {
  const [funds, setFunds] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: f }, { data: t }] = await Promise.all([
        supabase.from('funds').select('*'),
        supabase.from('transactions').select('*').eq('status', 'ผ่าน'),
      ])
      setFunds(f || [])
      setTransactions(t || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>

  function fundStats(fundId, budget) {
    const income = transactions
      .filter((t) => t.fund_id === fundId && t.type === 'รายรับ')
      .reduce((s, t) => s + Number(t.amount), 0)
    const expense = transactions
      .filter((t) => t.fund_id === fundId && t.type === 'รายจ่าย')
      .reduce((s, t) => s + Number(t.amount), 0)
    const remaining = budget + income - expense
    return { income, expense, remaining }
  }

  const byCategory = {}
  transactions
    .filter((t) => t.type === 'รายจ่าย')
    .forEach((row) => {
      const cat = row.category || 'ไม่ระบุหมวดหมู่'
      byCategory[cat] = (byCategory[cat] || 0) + Number(row.amount)
    })
  const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">ภาพรวมงบประมาณ</h1>
        <p className="text-sm text-gray-500">อัปเดตตามรายการที่อนุมัติแล้วเท่านั้น</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {funds.map((f) => {
          const s = fundStats(f.id, Number(f.budget))
          const { Icon, bg, fg } = fundStyle(f.name)
          return (
            <div key={f.id} className="card flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{f.name}</p>
                <p className="text-2xl font-semibold text-ink mt-1">{s.remaining.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">
                  จาก {Number(f.budget).toLocaleString()} ฿ · ใช้ไป {s.expense.toLocaleString()} ฿
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${bg} ${fg} flex items-center justify-center shrink-0`}>
                <Icon size={20} />
              </div>
            </div>
          )
        })}

        {(() => {
          const totalRemaining = funds.reduce((sum, f) => sum + fundStats(f.id, Number(f.budget)).remaining, 0)
          return (
            <div className="rounded-xl p-5 bg-danger text-white flex items-start justify-between">
              <div>
                <p className="text-sm text-white/80">งบคงเหลือรวมทั้งหมด</p>
                <p className="text-2xl font-semibold mt-1">{totalRemaining.toLocaleString()}</p>
                <p className="text-xs text-white/70 mt-1">ทุกก้อนเงินรวมกัน</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Coins size={20} />
              </div>
            </div>
          )
        })()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm font-medium text-ink mb-3">รายจ่ายตามหมวดหมู่</p>
          {categoryData.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีรายจ่ายที่อนุมัติ</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v.toLocaleString()} ฿`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <p className="text-sm font-medium text-ink mb-3">งบคงเหลือเทียบทั้งหมด</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funds.map((f) => ({ name: f.name, ...fundStats(f.id, Number(f.budget)) }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${Number(v).toLocaleString()} ฿`} />
              <Bar dataKey="remaining" fill="#0F6E56" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
ห