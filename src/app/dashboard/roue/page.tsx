'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const SEGMENTS = [
  { label: '10', color: '#0ea5e9' }, { label: 'Perdu', color: '#64748b' },
  { label: '25', color: '#3b82f6' }, { label: 'Perdu', color: '#64748b' },
  { label: '100', color: '#f59e0b' }, { label: 'Perdu', color: '#64748b' },
  { label: '10', color: '#0ea5e9' }, { label: '500', color: '#ef4444' },
]

export default function WheelPage() {
  const supabase = createClient()
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [canSpin, setCanSpin] = useState<any>(null)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      const { data: spinCheck } = await supabase.rpc('can_spin_wheel', { p_user_id: session.user.id })
      setCanSpin(spinCheck)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const size = 300, center = size / 2, radius = center - 10, anglePer = (2 * Math.PI) / SEGMENTS.length
    canvas.width = size; canvas.height = size
    ctx.clearRect(0, 0, size, size)
    SEGMENTS.forEach((seg, i) => {
      const start = i * anglePer, end = start + anglePer
      ctx.beginPath(); ctx.moveTo(center, center); ctx.arc(center, center, radius, start, end); ctx.closePath()
      ctx.fillStyle = seg.color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
      ctx.save(); ctx.translate(center, center); ctx.rotate(start + anglePer / 2)
      ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'
      ctx.fillText(seg.label, radius - 15, 5); ctx.restore()
    })
  }, [loading])

  const spin = async () => {
    if (!profile || spinning || !canSpin?.can_spin) return
    setSpinning(true); setResult(null)
    try {
      const { data, error } = await supabase.rpc('spin_wheel', { p_user_id: profile.id })
      if (error) throw error
      setRotation(rotation + 360 * 5 + Math.random() * 360)
      setTimeout(async () => {
        setResult(data); setSpinning(false)
        const { data: newProf } = await supabase.from('profiles').select('*').eq('id', profile.id).single()
        setProfile(newProf)
        const { data: spinCheck } = await supabase.rpc('can_spin_wheel', { p_user_id: profile.id })
        setCanSpin(spinCheck)
      }, 4000)
    } catch (err: any) { alert(err.message); setSpinning(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Roue de la Fortune</h1>
      </header>

      <div className="p-4 max-w-md mx-auto">
        <div className="bg-slate-900 rounded-2xl p-4 mb-6 text-white flex justify-between">
          <div><p className="text-[10px] text-slate-400 uppercase">Jetons</p><p className="text-xl font-black">{profile?.coins_balance || 0}</p></div>
          <div className="text-right"><p className="text-[10px] text-slate-400 uppercase">Crédits IA</p><p className="text-xl font-black">{profile?.credits_ia || 0}</p></div>
        </div>

        <div className="flex justify-center mb-6">
          <div style={{ transform: `rotate(${rotation}deg)`, transitionDuration: '4s', transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            <canvas ref={canvasRef} className="w-[300px] h-[300px]" />
          </div>
        </div>

        {result && !spinning && (
          <div className={`mb-4 p-4 rounded-xl text-center ${result.prize_type === 'nothing' ? 'bg-slate-100' : 'bg-emerald-50'}`}>
            {result.prize_type === 'coins' ? `+${result.prize_amount} Jetons !` : 'Perdu...'}
          </div>
        )}

        <button onClick={spin} disabled={spinning || !canSpin?.can_spin} className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-lg rounded-2xl shadow-lg active:scale-95 transition disabled:opacity-50">
          {spinning ? 'La roue tourne...' : canSpin?.free ? `TOURNER GRATUITEMENT (${canSpin.remaining_free})` : `TOURNER (${canSpin?.cost} jetons)`}
        </button>
      </div>
    </main>
  )
}
