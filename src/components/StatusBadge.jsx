export function StatusBadge({ status }) {
  const cls =
    status === 'ผ่าน' ? 'badge-approved' : status === 'ไม่ผ่าน' ? 'badge-rejected' : 'badge-pending'
  return <span className={`badge ${cls}`}>{status}</span>
}

export function ApproveActions({ status, onApprove, onReject }) {
  if (status !== 'รออนุมัติ') return <StatusBadge status={status} />
  return (
    <div className="flex gap-2">
      <button onClick={onApprove} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
        อนุมัติ
      </button>
      <button onClick={onReject} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200">
        ไม่อนุมัติ
      </button>
    </div>
  )
}
