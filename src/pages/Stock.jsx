import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { ApproveActions, StatusBadge } from '../components/StatusBadge'

export default function Stock() {
  const { profile, isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState({ name: '', category: '', unit: 'ชิ้น', quantity: '' })
  const [withdraw, setWithdraw] = useState({ item_id: '', change_qty: '', department: '', note: '' })

  async function loadAll() {
    const [{ data: i }, { data: l }] = await Promise.all([
      supabase.from('stock_items').select('*').order('name'),
      supabase
        .from('stock_logs')
        .select('*, item:item_id(name), requester:requested_by(full_name)')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    setItems(i || [])
    setLogs(l || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('stock-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_logs' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function addItem(e) {
    e.preventDefault()
    const { error } = await supabase.from('stock_items').insert({
      name: newItem.name,
      category: newItem.category,
      unit: newItem.unit,
      quantity: Number(newItem.quantity) || 0,
    })
    if (error) return alert(error.message)
    setNewItem({ name: '', category: '', unit: 'ชิ้น', quantity: '' })
  }

  async function requestWithdraw(e) {
    e.preventDefault()
    const { error } = await supabase.from('stock_logs').insert({
      item_id: withdraw.item_id,
      change_qty: -Math.abs(Number(withdraw.change_qty)),
      department: withdraw.department,
      note: withdraw.note || null,
      requested_by: profile.id,
    })
    if (error) return alert(error.message)
    setWithdraw({ item_id: '', change_qty: '', department: '', note: '' })
  }

  async function setLogStatus(log, status) {
    const { error } = await supabase
      .from('stock_logs')
      .update({ status, approved_by: profile.id })
      .eq('id', log.id)
    if (error) return alert(error.message)
    if (status === 'ผ่าน') {
      const item = items.find((i) => i.id === log.item_id)
      if (item) {
        await supabase
          .from('stock_items')
          .update({ quantity: Number(item.quantity) + Number(log.change_qty) })
          .eq('id', item.id)
      }
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">สต๊อกอุปกรณ์และของ</h1>
        <p className="text-sm text-gray-500">เบิกของจะหักสต๊อกอัตโนมัติเมื่ออนุมัติแล้ว</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.id} className="card">
            <p className="font-medium text-ink">{it.name}</p>
            <p className="text-xs text-gray-500">{it.category}</p>
            <p className="text-xl font-semibold mt-2">
              {it.quantity} <span className="text-sm font-normal text-gray-400">{it.unit}</span>
            </p>
            {Number(it.quantity) <= Number(it.low_stock_threshold) && (
              <span className="badge badge-rejected mt-2">ใกล้หมด</span>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีของในสต๊อก</p>}
      </div>

      {isAdmin && (
        <form onSubmit={addItem} className="card grid grid-cols-1 md:grid-cols-4 gap-3">
          <input placeholder="ชื่อของ" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required />
          <input placeholder="หมวดหมู่" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} />
          <input placeholder="หน่วย (ชิ้น/แพ็ค)" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
          <input type="number" placeholder="จำนวนเริ่มต้น" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
          <button type="submit" className="btn btn-primary md:col-span-4">เพิ่มของเข้าสต๊อก</button>
        </form>
      )}

      <form onSubmit={requestWithdraw} className="card grid grid-cols-1 md:grid-cols-4 gap-3">
        <select value={withdraw.item_id} onChange={(e) => setWithdraw({ ...withdraw, item_id: e.target.value })} required>
          <option value="">เลือกของที่จะเบิก</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <input type="number" placeholder="จำนวนที่เบิก" value={withdraw.change_qty} onChange={(e) => setWithdraw({ ...withdraw, change_qty: e.target.value })} required />
        <input placeholder="ฝ่ายที่เบิก" value={withdraw.department} onChange={(e) => setWithdraw({ ...withdraw, department: e.target.value })} />
        <input placeholder="หมายเหตุ" value={withdraw.note} onChange={(e) => setWithdraw({ ...withdraw, note: e.target.value })} />
        <button type="submit" className="btn btn-primary md:col-span-4">ยื่นขอเบิกของ</button>
      </form>

      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>ของ</th>
              <th>จำนวน</th>
              <th>ฝ่าย</th>
              <th>ผู้เบิก</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{new Date(l.created_at).toLocaleDateString('th-TH')}</td>
                <td>{l.item?.name}</td>
                <td>{l.change_qty}</td>
                <td>{l.department}</td>
                <td>{l.requester?.full_name}</td>
                <td>
                  {isAdmin ? (
                    <ApproveActions status={l.status} onApprove={() => setLogStatus(l, 'ผ่าน')} onReject={() => setLogStatus(l, 'ไม่ผ่าน')} />
                  ) : (
                    <StatusBadge status={l.status} />
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-6">ยังไม่มีการเบิกของ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
