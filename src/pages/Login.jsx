import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        setNotice('สมัครสำเร็จ กรุณาเช็คอีเมลเพื่อยืนยันตัวตน (หรือถ้าปิด email confirm ไว้ ล็อกอินได้เลย)')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <img src="/mut-mark.png" alt="MUT logo" className="h-12 w-auto mb-4" />
        <h1 className="text-xl font-semibold text-ink mb-1">Exhibition 2569</h1>
        <p className="text-sm text-gray-500 mb-6">ระบบจัดการงบประมาณ สต๊อก และจัดซื้อ</p>

        <form onSubmit={handleSubmit} className="card space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ชื่อ-นามสกุล</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">อีเมล</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">รหัสผ่าน</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {notice && <p className="text-sm text-accent">{notice}</p>}

          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? 'กำลังดำเนินการ...' : mode === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>

        <button
          className="text-sm text-gray-500 mt-4 hover:text-ink"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
        </button>

        <p className="text-xs text-gray-400 mt-6">
          หมายเหตุ: สมาชิกใหม่จะได้สิทธิ์ "member" โดยอัตโนมัติ ถ้าต้องการสิทธิ์ "admin" (อนุมัติรายการได้)
          ให้อาจารย์/หัวหน้าฝ่ายไปแก้ role ในตาราง profiles ผ่าน Supabase dashboard
        </p>
      </div>
    </div>
  )
}
