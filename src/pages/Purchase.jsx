import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { uploadEvidence } from '../lib/uploadEvidence'
import { useAuth } from '../contexts/AuthContext'
import { ApproveActions, StatusBadge } from '../components/StatusBadge'

const emptyForm = {
  product_name: '',
  category: '',
  department: '',
  unit_price: '',
  quantity: 1,
  fund_id: '',
  payment_method: 'โอนธนาคาร',
  note: '',
}

export default function Purchase() {
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [funds, setFunds] = useState([])
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState(new Set())
  const fileInputRef = useRef(null)

  async function loadAll() {
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from('funds').select('*').order('id'),
      supabase
        .from('purchases')
        .select('*, requester:requested_by(full_name)')
        .order('created_at', { ascending: false }),
    ])
    setFunds(f || [])
    setRows(p || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('purchases-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const evidence_url = await uploadEvidence(evidenceFile, 'purchases')
      const { error } = await supabase.from('purchases').insert({
        product_name: form.product_name,
        category: form.category,
        department: form.department,
        unit_price: Number(form.unit_price),
        quantity: Number(form.quantity),
        fund_id: Number(form.fund_id),
        payment_method: form.payment_method,
        evidence_url,
        note: form.note || null,
        requested_by: profile.id,
      })
      if (error) return alert(error.message)
      setForm(emptyForm)
      setEvidenceFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      alert('อัปโหลดรูปหลักฐานไม่สำเร็จ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Approving a purchase creates the matching expense in "การเงิน" (Finance) so money is only
  // ever deducted from one single place — the transactions ledger — then jumps there to show it.
  // The .eq('status', 'รออนุมัติ') guard below makes this atomic: if the row was already approved
  // by an earlier click (double-click, slow network, etc.), this update touches 0 rows and we
  // skip creating a duplicate transaction — this is what was causing the double deduction.
  async function setStatus(purchase, status) {
    if (processingIds.has(purchase.id)) return
    setProcessingIds((prev) => new Set(prev).add(purchase.id))
    try {
      const { data: updated, error } = await supabase
        .from('purchases')
        .update({ status, approved_by: profile.id })
        .eq('id', purchase.id)
        .eq('status', 'รออนุมัติ')
        .select()
      if (error) return alert(error.message)
      if (!updated || updated.length === 0) return // already processed elsewhere — do nothing more

      if (status === 'ผ่าน') {
        const { error: txError } = await supabase.from('transactions').insert({
          fund_id: purchase.fund_id,
          item: purchase.product_name,
          type: 'รายจ่าย',
          category: purchase.category,
          department: purchase.department,
          amount: Number(purchase.unit_price) * Number(purchase.quantity),
          payment_method: purchase.payment_method,
          requested_by: purchase.requested_by,
          approved_by: profile.id,
          status: 'ผ่าน',
          evidence_url: purchase.evidence_url,
          note: `จากรายการแจ้งเบิกพัสดุ: ${purchase.product_name}`,
        })
        if (txError) return alert('อนุมัติสำเร็จ แต่สร้างรายการในบัญชีไม่สำเร็จ: ' + txError.message)
        navigate('/finance')
      }
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(purchase.id)
        return next
      })
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">แจ้งเบิกพัสดุ</h1>
        <p className="text-sm text-gray-500">
          บันทึกของที่ต้องการซื้อ พออนุมัติแล้วระบบจะหักเงินและสร้างรายการในหน้า "บัญชี" ให้อัตโนมัติ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card grid grid-cols-1 md:grid-cols-3 gap-3">
        <input placeholder="ชื่อสินค้า" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required />
        <input placeholder="หมวดหมู่" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input placeholder="ฝ่าย" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <input type="number" step="0.01" placeholder="ราคาต่อชิ้น" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required />
        <input type="number" placeholder="จำนวน" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
        <select value={form.fund_id} onChange={(e) => setForm({ ...form, fund_id: e.target.value })} required>
          <option value="">หักจากก้อนเงิน (จำเป็นต้องเลือก)</option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
          <option>โอนธนาคาร</option>
          <option>เงินสด</option>
          <option>พร้อมเพย์</option>
          <option>เช็ค</option>
        </select>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setEvidenceFile(e.target.files[0] || null)}
            className="text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:text-sm hover:file:bg-gray-200"
          />
          {evidenceFile && <p className="text-xs text-gray-400 mt-1 truncate">แนบแล้ว: {evidenceFile.name}</p>}
        </div>
        <input placeholder="หมายเหตุ" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <p className="text-sm text-gray-500 self-center">
          ยอดรวม: {(Number(form.unit_price || 0) * Number(form.quantity || 0)).toLocaleString()} ฿
        </p>
        <button type="submit" disabled={saving} className="btn btn-primary md:col-span-3">
          {saving ? 'กำลังบันทึก...' : 'ยื่นแจ้งเบิกพัสดุ'}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>สินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
              <th>ผู้ซื้อ</th>
              <th>หลักฐาน</th>
              <th>หมายเหตุ</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('th-TH')}</td>
                <td>{r.product_name}</td>
                <td>{r.quantity}</td>
                <td>{(Number(r.unit_price) * Number(r.quantity)).toLocaleString()} ฿</td>
                <td>{r.requester?.full_name}</td>
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
                      disabled={processingIds.has(r.id)}
                      onApprove={() => setStatus(r, 'ผ่าน')}
                      onReject={() => setStatus(r, 'ไม่ผ่าน')}
                    />
                  ) : (
                    <StatusBadge status={r.status} />
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-6">ยังไม่มีรายการแจ้งเบิกพัสดุ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
