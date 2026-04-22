'use client'

import { useEffect, useState } from 'react'

function pickGreeting(hour: number) {
  if (hour < 5) return 'Boa noite'
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function Greeting({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [text, setText] = useState<string>('Olá')

  useEffect(() => {
    setText(pickGreeting(new Date().getHours()))
  }, [])

  return (
    <span className={className} style={style}>
      {text}
    </span>
  )
}
