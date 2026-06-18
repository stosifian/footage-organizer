interface Props {
  dateShot: string | null
}

export function DateCell({ dateShot }: Props) {
  if (!dateShot) {
    return <span className="text-[#666] text-xs">Unknown</span>
  }

  const d = new Date(dateShot)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="text-xs">
      <div className="text-[#e5e5e5]">{date}</div>
      <div className="text-[#999]">{time}</div>
    </div>
  )
}
