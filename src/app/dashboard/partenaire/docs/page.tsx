'use client'

import Link from 'next/link'

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Documentation</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-3">Introduction</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            L'API Xafearn vous permet d'intégrer nos services (tâches, séries, portefeuille) dans votre application.
          </p>
          <div className="bg-slate-900 rounded-xl p-3">
            <p className="text-[10px] text-slate-400 mb-1">Base URL</p>
            <p className="text-xs font-mono text-emerald-400">https://getagriculture.store/api/v1</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-3">Authentification</h2>
          <p className="text-sm text-slate-600 mb-3">Ajoutez votre clé API dans le header :</p>
          <div className="bg-slate-900 rounded-xl p-3">
            <p className="text-[10px] font-mono text-emerald-400">Authorization: Bearer VOTRE_CLE</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-3">Endpoints disponibles</h2>
          <div className="space-y-3">
            <div className="border-l-4 border-emerald-500 pl-3">
              <p className="text-xs font-bold text-slate-900">GET /tasks</p>
              <p className="text-xs text-slate-500">Liste des tâches (1 crédit)</p>
            </div>
            <div className="border-l-4 border-emerald-500 pl-3">
              <p className="text-xs font-bold text-slate-900">GET /series</p>
              <p className="text-xs text-slate-500">Catalogue des séries (1 crédit)</p>
            </div>
            <div className="border-l-4 border-amber-500 pl-3">
              <p className="text-xs font-bold text-slate-900">POST /tasks/submit</p>
              <p className="text-xs text-slate-500">Soumettre une preuve (2 crédits)</p>
            </div>
            <div className="border-l-4 border-emerald-500 pl-3">
              <p className="text-xs font-bold text-slate-900">GET /wallet</p>
              <p className="text-xs text-slate-500">Soldes utilisateurs (1 crédit)</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-bold text-amber-900 mb-2">Codes d'erreur</h2>
          <ul className="text-xs text-amber-800 space-y-1">
            <li><strong>401</strong> : Clé API invalide</li>
            <li><strong>402</strong> : Crédits insuffisants</li>
            <li><strong>403</strong> : Scope manquant</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
