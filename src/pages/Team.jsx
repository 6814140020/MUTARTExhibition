import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function Team() {
  const { isAdmin } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function updateField(id, field, value) {
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  if (loading) return <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">ทีมงาน</h1>
        <p className="text-sm text-gray-500">
          {isAdmin ? 'แก้ไขฝ่าย ตำแหน่ง และสิทธิ์ผู้อนุมัติได้ที่นี่' : 'รายชื่อทีมงานทั้งหมดในโปรเจกต์'}
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>รหัสนักศึกษา</th>
              <th>ฝ่าย</th>
              <th>ตำแหน่ง</th>
              <th>สิทธิ์</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.full_name}</td>
                <td>{m.student_id || '-'}</td>
                <td>
                  {isAdmin ? (
                    <input defaultValue={m.team || ''} onBlur={(e) => updateField(m.id, 'team', e.target.value)} />
                  ) : (
                    m.team || '-'
                  )}
                </td>
                <td>
                  {isAdmin ? (
                    <input defaultValue={m.position || ''} onBlur={(e) => updateField(m.id, 'position', e.target.value)} />
                  ) : (
                    m.position || '-'
                  )}
                </td>
                <td>
                  {isAdmin ? (
                    <select value={m.role} onChange={(e) => updateField(m.id, 'role', e.target.value)}>
                      <option value="member">สมาชิก</option>
                      <option value="admin">ผู้อนุมัติ</option>
                    </select>
                  ) : m.role === 'admin' ? (
                    'ผู้อนุมัติ'
                  ) : (
                    'สมาชิก'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
