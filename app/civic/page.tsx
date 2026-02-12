"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { LeaderPhotoInput } from "@/components/leader-photo-input"
import { ImageInput } from "@/components/image-input"
import { getLocationFromImageOrDevice } from "@/lib/location"
import { CertificateCanvas, type CertificateData } from "@/components/certificate-canvas"
import { saveReport } from "@/lib/storage"
import { TweetButton } from "@/components/tweet-button"

type IssueType = "Pothole" | "Garbage" | "Broken Streetlight" | "Illegal Dumping" | "Waterlogging" | "Other"

export default function CivicHomePage() {
  const [issueImage, setIssueImage] = useState<File | null>(null)
  const [issuePreview, setIssuePreview] = useState<string | null>(null)
  const [leaderImage, setLeaderImage] = useState<File | null>(null)
  const [leaderPreview, setLeaderPreview] = useState<string | null>("/images/pm-modi.png")
  // custom leader support
  const [customLeaderImage, setCustomLeaderImage] = useState<string>("/images/leader-default.png")
  const [customLeaderName, setCustomLeaderName] = useState<string>("")
  const [issueType, setIssueType] = useState<IssueType>("Pothole")
  const [issueNote, setIssueNote] = useState<string>("")
  const [creditName, setCreditName] = useState<string | "">("") // new optional field
  const [locText, setLocText] = useState<string>("")
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })
  const [dateTime, setDateTime] = useState<Date | null>(null)
  const [isLocLoading, setIsLocLoading] = useState(false)
  const [certData, setCertData] = useState<CertificateData | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!issueImage) return
      ; (async () => {
        setIsLocLoading(true)
        const meta = await getLocationFromImageOrDevice(issueImage)
        if (meta?.coords) setCoords(meta.coords)
        if (meta?.date) setDateTime(meta.date)
        if (meta?.pretty) setLocText(meta.pretty)
        setIsLocLoading(false)
      })()
  }, [issueImage])

  const canGenerate = useMemo(() => {
    // allow generation without location; only require issue image and a leader preview
    return Boolean(issueImage && leaderPreview)
  }, [issueImage, leaderPreview, locText, coords])

  const handleGenerate = async () => {
    if (!issueImage) return
    const id = crypto.randomUUID()
    const url = `${window.location.origin}/report/${id}`

    const data: CertificateData = {
      id,
      issueType,
      note: issueNote,
      // provide a safe default when no location is supplied
      locationText:
        (locText && locText.trim()) ||
        (coords.lat && coords.lng ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "Not provided"),
      coords: coords.lat && coords.lng ? { lat: coords.lat, lng: coords.lng } : undefined,
      capturedAt: (dateTime ?? new Date()).toISOString(),
      issueImageFile: issueImage,
      topLeaderImageUrls: [leaderPreview || "/images/pm-modi.png"],
      topLeaderNames: [], // Add empty array or appropriate names if available
      modiImageUrl: "/images/leader-default.png", // Default or handle appropriately
      reportUrl: url,
      footerCreditName: creditName || undefined, //
    }
    setCertData(data)
    setReportUrl(url)
  }

  const handleCanvasRendered = async (dataUrl: string | null) => {
    if (!dataUrl || !certData) return
    setGeneratedUrl(dataUrl)
    setGeneratedUrl(dataUrl)
    try {
      saveReport({
        ...certData,
        imageDataUrl: dataUrl,
      })
    } catch (e) {
      console.warn("Local storage full, skipping saveReport", e)
    }

    // Send email with certificate
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificateDataUrl: dataUrl,
          issueType: certData.issueType,
          capturedAt: certData.capturedAt,
          locationText: certData.locationText
        })
      });
      console.log('Certificate email sent successfully');
    } catch (error) {
      console.error('Failed to send certificate email:', error)
    }
  }

  return (
    <main className="min-h-dvh bg-white text-gray-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-balance">Civic Issue Reporter</h1>
          <nav className="flex items-center gap-3">
            <a className="text-sm text-blue-600 hover:underline" href="/analytics">
              Analytics
            </a>
            <a className="text-sm text-blue-600 hover:underline" href="/">
              Home
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1) Add Issue Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageInput
              label="Capture or Upload"
              onChange={(file, preview) => {
                setIssueImage(file)
                setIssuePreview(preview)
              }}
            />
            {issuePreview && (
              <img
                src={issuePreview || "/placeholder.svg?height=300&width=600&query=issue%20preview%20placeholder"}
                alt="Issue preview"
                className="w-full h-auto rounded border"
              />
            )}
            <div className="text-sm text-gray-700">
              {isLocLoading
                ? "Extracting GPS from photo EXIF..."
                : locText
                  ? `Detected location: ${locText}`
                  : "Location not detected from photo metadata. You can still proceed."}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2) Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="issue-type">Issue Type</Label>
              <select
                id="issue-type"
                className={cn("border rounded px-3 py-2 text-sm")}
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as IssueType)}
              >
                <option>Pothole</option>
                <option>Garbage</option>
                <option>Broken Streetlight</option>
                <option>Illegal Dumping</option>
                <option>Waterlogging</option>
                <option>Other</option>
              </select>
              <p className="text-xs text-gray-600">Auto-tagging coming soon; choose a type for now.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                placeholder="Short description"
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location-text">Location (optional)</Label>
              <Input
                id="location-text"
                placeholder="e.g., MG Road, Bengaluru"
                value={locText}
                onChange={(e) => setLocText(e.target.value)}
              />
              <p className="text-xs text-gray-600">
                Optional. We try to read GPS from the photo’s EXIF; you can refine or leave blank.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Capture Time</Label>
              <div className="text-sm">
                {mounted ? (dateTime ?? new Date()).toLocaleString() : 'Loading...'}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="credit-name">Credit name (optional)</Label>
              <Input
                id="credit-name"
                placeholder="e.g., PM Narendra Modi or Nitin Gadkari"
                value={creditName}
                onChange={(e) => setCreditName(e.target.value)}
              />
              <p className="text-xs text-gray-600">If provided, the certificate footer will credit this person.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3) Leader Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LeaderPhotoInput
              defaultUrl="/images/pm-modi.png"
              onChange={(file, preview, name) => {
                setLeaderImage(file)
                setLeaderPreview(preview || "/images/pm-modi.png")
                if (name) {
                  setCustomLeaderImage(preview || "/images/leader-default.png")
                  setCustomLeaderName(name)
                }
              }}
            />
            {leaderPreview && (
              <img
                src={leaderPreview || "/placeholder.svg?height=96&width=96&query=leader%20preview"}
                alt="Leader preview"
                className="h-24 w-24 rounded object-cover border"
              />
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={!canGenerate} onClick={handleGenerate}>
            Generate Certificate
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIssueImage(null)
              setIssuePreview(null)
              setLeaderImage(null)
              setLeaderPreview("/images/pm-modi.png")
              setIssueType("Pothole")
              setIssueNote("")
              setCreditName("") // reset credit name
              setLocText("")
              setCoords({ lat: null, lng: null })
              setDateTime(null)
              setCertData(null)
              setGeneratedUrl(null)
              setReportUrl(null)
            }}
          >
            Reset
          </Button>
        </div>

        {certData && (
          <>
            <Separator />
            <section className="space-y-3">
              <h2 className="text-base font-semibold">Certificate Preview</h2>
              <CertificateCanvas ref={canvasRef} data={certData} onRendered={handleCanvasRendered} />
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-amber-500 hover:bg-amber-600"
                  onClick={() => {
                    const canvas = canvasRef.current
                    if (!canvas) return
                    const link = document.createElement("a")
                    link.download = `civic-certificate-${certData.id}.png`
                    link.href = canvas.toDataURL("image/png")
                    link.click()
                  }}
                >
                  Download PNG
                </Button>
                {generatedUrl && reportUrl && (
                  <TweetButton
                    imageDataUrl={generatedUrl}
                    text={`Together, we highlight India's challenges too. Location: ${certData.locationText}. #Accountability #CivicIssues`}
                    url={reportUrl}
                  />
                )}
              </div>
              {reportUrl && (
                <p className="text-xs text-gray-600">
                  QR links to:{" "}
                  <a className="text-blue-600 underline" href={reportUrl}>
                    {reportUrl}
                  </a>{" "}
                  — demo only, no backend yet.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
