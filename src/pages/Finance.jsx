import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { ApproveActions } from '../components/StatusBadge'

const emptyForm = {
  fund_id: '',
  item: '',
  type: 'รายจ่าย',
  category: '',
  department: '',
  amount: '',
  payment_method: 'โอนธนาคาร',
  evidence_url: '',
  note: '',
}

export default function Finance() {
  const { profile, isAdmin } = useAuth()
  const [funds, setFunds] = useState([])
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    const [{ data: f }, { data: t }] = await Promise.all([
      supabase.from('funds').select('*').order('id'),
      supabase
        .from('transactions')
        .select('*, requester:requested_by(full_name), approver:approved_by(full_name)')
        .order('created_at', { ascending: false }),
    ])
    setFunds(f || [])
    setRows(t || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('transactions').insert({
      fund_id: Number(form.fund_id),
      item: form.item,
      type: form.type,
      category: form.category,
      department: form.department,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      evidence_url: form.evidence_url || null,
      note: form.note || null,
      requested_by: profile.id,
    })
    setSaving(false)
    if (error) return alert(error.message)
    setForm(emptyForm)
  }

  async function setStatus(id, status) {
    const { error } = await supabase
      .from('transactions')
      .update({ status, approved_by: profile.id })
      .eq('id', id)
    if (error) alert(error.message)
  }

  if (loading) return <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">รายการการเงิน</h1>
        <p className="text-sm text-gray-500">บันทึกรายรับ-รายจ่าย และติดตามสถานะอนุมัติ</p>
      </div>

      <form onSubmit={handleSubmit} className="card grid grid-cols-1 md:grid-cols-3 gap-3">
        <select value={form.fund_id} onChange={(e) => setForm({ ...form, fund_id: e.target.value })} required>
          <option value="">เลือกก้อนเงิน</option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <input
          placeholder="รายการ"
          value={form.item}
          onChange={(e) => setForm({ ...form, item: e.target.value })}
          required
        />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="รายจ่าย">รายจ่าย</option>
          <option value="รายรับ">รายรับ</option>
        </select>
        <input
          placeholder="หมวดหมู่ (เช่น ค่าอาหาร)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <input
          placeholder="ฝ่าย"
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
        />
        <input
          type="number"
          step="0.01"
          placeholder="จำนวนเงิน"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
          <option>โอนธนาคาร</option>
          <option>เงินสด</option>
          <option>พร้อมเพย์</option>
          <option>เช็ค</option>
        </select>
        <input
          placeholder="ลิงก์หลักฐาน (ถ้ามี)"
          value={form.evidence_url}
          onChange={(e) => setForm({ ...form, evidence_url: e.target.value })}
        />
        <input placeholder="หมายเหตุ" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button type="submit" disabled={saving} className="btn btn-primary md:col-span-3">
          {saving ? 'กำลังบันทึก...' : 'ยื่นขอเบิก/บันทึกรายการ'}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>รายการ</th>
              <th>ก้อนเงิน</th>
              <th>ประเภท</th>
              <th>จำนวนเงิน</th>
              <th>ฝ่าย</th>
              <th>ผู้ขอเบิก</th>
              <th>ผู้อนุมัติ</th>
              <th>หลักฐาน</th>
              <th>หมายเหตุ</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('th-TH')}</td>
                <td>{r.item}</td>
                <td>{funds.find((f) => f.id === r.fund_id)?.name}</td>
                <td>{r.type}</td>
                <td>{Number(r.amount).toLocaleString()} ฿</td>
                <td>{r.department || '-'}</td>
                <td>{r.requester?.full_name}</td>
                <td>{r.approver?.full_name || '-'}</td>
                <td>
                  {r.evidence_url ? (
                    <a
                      href={r.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline hover:text-emerald-800"
                    >
                      เปิดดู
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="max-w-[160px] truncate" title={r.note || ''}>{r.note || '-'}</td>
                <td>
                  {isAdmin ? (
                    <ApproveActions
                      status={r.status}
                      onApprove={() => setStatus(r.id, 'ผ่าน')}
                      onReject={() => setStatus(r.id, 'ไม่ผ่าน')}
                    />
                  ) : (
                    <span className={`badge ${r.status === 'ผ่าน' ? 'badge-approved' : r.status === 'ไม่ผ่าน' ? 'badge-rejected' : 'badge-pending'}`}>
                      {r.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center text-gray-400 py-6">
                  ยังไม่มีรายการ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
