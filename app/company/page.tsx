"use client"

import { useRef, useState } from "react"
import { CompanyCertificateCanvas } from "@/components/company-certificate-canvas"

export default function CompanyGeneratorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [companyName, setCompanyName] = useState("")
  const [issueType, setIssueType] = useState("")
  const [issueInfo, setIssueInfo] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [postUrl, setPostUrl] = useState("")

  return (
    <main className="min-h-dvh bg-white text-gray-900">
      <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-semibold">Swachhata Against Bad Service</h1>
        <p className="text-sm text-gray-600">Generate a simple awareness certificate for a company you faced issues with. No database is used; image downloads locally.</p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., ACME Services Pvt Ltd" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Issue Type</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={issueType} onChange={(e) => setIssueType(e.target.value)} placeholder="e.g., Poor Service / Billing / Warranty" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Issue Details</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={4} value={issueInfo} onChange={(e) => setIssueInfo(e.target.value)} placeholder="Write a brief description..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Logo</label>
            <input type="file" accept="image/*" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const url = URL.createObjectURL(file)
              setLogoUrl(url)
            }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Optional Post URL (Twitter/Instagram/etc.)</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://twitter.com/..." />
          </div>
        </div>

        <CompanyCertificateCanvas ref={canvasRef} data={{ companyName, issueType, issueInfo, companyLogoUrl: logoUrl, postUrl }} />

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={async () => {
            const c = canvasRef.current
            if (!c) return
            const dataUrl = c.toDataURL('image/png')

            // Download
            const a = document.createElement('a')
            a.download = `company-certificate.png`
            a.href = dataUrl
            a.click()

            // Send email
            try {
              const { sendCertificateEmailAction } = await import('@/app/actions/email')
              await sendCertificateEmailAction(dataUrl, issueType || "Company Issue", new Date().toISOString(), companyName)
              console.log('Certificate email sent successfully')
            } catch (error) {
              console.error('Failed to send certificate email:', error)
            }
          }}>Download PNG</button>
        </div>
      </div>
    </main>
  )
}


