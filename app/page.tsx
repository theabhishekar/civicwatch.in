/**
 * Main Page Component - Civic Issue Reporting App
 * 
 * @author Chandravijay Agrawal
 * @twitter @Mehonestperson
 * @url https://twitter.com/Mehonestperson
 */

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLanguage } from "@/lib/language-context"
// Header navigation and language/counters are rendered globally in app/navigation.tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CertificateData } from "@/components/certificate-canvas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { LeaderPhotoInput } from "@/components/leader-photo-input"
import { ImageInput } from "@/components/image-input"
import { getLocationFromImageOrDevice, reverseGeocode } from "@/lib/location"
import { CertificateCanvas } from "@/components/certificate-canvas"
import { saveReport } from "@/lib/storage"
import { SocialShare } from "@/components/social-share"
import { EmailRTIOptions } from "@/components/email-rti-options"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { githubStorage } from "@/lib/github-storage"
import { HeaderCounters } from "@/components/header-counters"
import { MapPin, Loader2 } from "lucide-react"

// Utility function to generate UUID that works in all browsers
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type IssueType = "Pothole" | "Garbage" | "Broken Streetlight" | "Illegal Dumping" | "Waterlogging" | "Bad Infrastructure" | "Infrastructure/Design" | "Other"

type LeaderOption = {
  key: string
  label: string
  imageUrl: string
}

const LEADER_OPTIONS: LeaderOption[] = [
  { key: "modi", label: "Hon' PM Narendra Modi", imageUrl: "https://pbs.twimg.com/media/Gz6Wnu1XsAANe07?format=jpg&name=large" },
  { key: "gadkari", label: "Hon' Nitin Gadkari", imageUrl: "/images/nitin-gadkari.jpg" },
  { key: "cm", label: "Hon' State/UT CM", imageUrl: "/images/leader-default.png" }, // can be replaced with actual CM image
  { key: "custom", label: "Add Custom Leader/Officer", imageUrl: "/images/leader-default.png" },
]

export default function HomePage() {
  const [issueImage, setIssueImage] = useState<File | null>(null)
  const [issuePreview, setIssuePreview] = useState<string | null>(null)
  const [leaderImage, setLeaderImage] = useState<File | null>(null)
  const [leaderPreview, setLeaderPreview] = useState<string | null>("/images/leader-default.png")
  const [issueType, setIssueType] = useState<IssueType>("Pothole")
  const [issueNote, setIssueNote] = useState<string>("")
  const [creditName, setCreditName] = useState<string>("") // new optional field
  const [locText, setLocText] = useState<string>("")
  const [locationMapUrl, setLocationMapUrl] = useState<string>("")
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })
  const [dateTime, setDateTime] = useState<Date | null>(null) // Initialize with null to prevent hydration mismatch
  const [localDateTime, setLocalDateTime] = useState<string>("")
  const [isLocLoading, setIsLocLoading] = useState(false)
  const [isClient, setIsClient] = useState(false) // Add client-side flag
  const [isGeoLoading, setIsGeoLoading] = useState(false)
  // For top right leaders
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([]) // Start with no leaders selected
  // For CM custom image
  const [cmImage, setCmImage] = useState<string>("/images/leader-default.png")
  const [selectedCMName, setSelectedCMName] = useState<string>("")
  // For custom leader/image (top-right custom entry)
  const [customImage, setCustomImage] = useState<string>("/images/leader-default.png")
  const [customName, setCustomName] = useState<string>("")
  // Control whether to include Modi photo
  const [includeModiPhoto, setIncludeModiPhoto] = useState<boolean>(true) // Default to true
  // Track if user has manually set a time
  const [userSetTime, setUserSetTime] = useState<boolean>(false)
  const [certData, setCertData] = useState<CertificateData | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null) // data URL of canvas
  const [reportUrl, setReportUrl] = useState<string | null>(null) // app link used for QR / tweet
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentLanguage: t } = useLanguage()



  // Fix hydration: only run on client
  useEffect(() => {
    setIsClient(true)
  }, [])



  useEffect(() => {
    if (!issueImage) return
      ; (async () => {
        setIsLocLoading(true)
        const meta = await getLocationFromImageOrDevice(issueImage)
        if (meta?.coords) setCoords(meta.coords)
        // Only set date from image if user hasn't manually set one
        if (meta?.date && !userSetTime) setDateTime(meta.date)
        if (meta?.pretty) setLocText(meta.pretty)
        setIsLocLoading(false)
      })()
  }, [issueImage, userSetTime])

  // Fix hydration error: set local date/time only on client
  useEffect(() => {
    if (isClient) {
      const currentTime = dateTime ?? new Date()
      setLocalDateTime(currentTime.toLocaleString())
    }
  }, [dateTime, isClient])

  // Initialize with a stable date to prevent hydration mismatch
  useEffect(() => {
    if (isClient && !dateTime) {
      const now = new Date()
      setDateTime(now)
      setLocalDateTime(now.toLocaleString())
    }
  }, [isClient, dateTime])

  const canGenerate = useMemo(() => {
    return Boolean(issueImage && leaderPreview)
  }, [issueImage, leaderPreview, locText, coords])

  const handleGenerate = async () => {
    if (!issueImage) return;

    // Debug logging for issue image
    console.log('Generating certificate with issue image:', {
      name: issueImage.name,
      size: issueImage.size,
      type: issueImage.type,
      lastModified: issueImage.lastModified,
      exists: !!issueImage
    });

    const id = generateUUID();
    const url = `/report/${id}` // Just the path, domain handled in SocialShare;

    // Build top leaders array
    const topLeaders = selectedLeaders
      .filter((key) => key !== "modi") // exclude Modi from top, always at bottom
      .map((key) => {
        if (key === "cm") return { url: cmImage, name: selectedCMName || "Hon' Selected State/UT CM" };
        if (key === "custom") return { url: customImage, name: customName || "Hon' Selected Leader" };
        const found = LEADER_OPTIONS.find((opt) => opt.key === key);
        return found ? { url: found.imageUrl, name: found.label } : null;
      })
      .filter((leader): leader is { url: string; name: string } => Boolean(leader));

    // Conditionally include Modi at bottom left
    const modiImage = includeModiPhoto
      ? (LEADER_OPTIONS.find((opt) => opt.key === "modi")?.imageUrl || "/images/pm-modi.png")
      : "/images/leader-default.png"; // Use placeholder if Modi photo is disabled

    const data = {
      id: id,
      issueType: issueType,
      note: issueNote,
      locationText:
        (locText && locText.trim()) ||
        (coords.lat && coords.lng ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "Not provided"),
      coords: coords.lat && coords.lng ? { lat: coords.lat, lng: coords.lng } : undefined,
      capturedAt: (dateTime ?? new Date()).toISOString(),
      issueImageFile: issueImage,
      topLeaderImageUrls: topLeaders.map(l => l.url),
      topLeaderNames: topLeaders.map(l => l.name),
      modiImageUrl: modiImage,
      reportUrl: url,
      locationMapUrl: locationMapUrl || undefined,
      footerCreditName: creditName || undefined,
    };
    setCertData(data);
    setReportUrl(url);

    // Store report in GitHub Issues database
    try {
      const report = {
        id: id,
        issueType: issueType,
        note: issueNote,
        locationText:
          (locText && locText.trim()) ||
          (coords.lat && coords.lng ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "Not provided"),
        coords: coords.lat && coords.lng ? { lat: coords.lat, lng: coords.lng } : undefined,
        capturedAt: (dateTime ?? new Date()).toISOString(),
        issueImageUrl: issueImage ? URL.createObjectURL(issueImage) : undefined,
        certificateUrl: url,
        userId: 'anonymous',
        reportUrl: url,
        locationMapUrl: locationMapUrl || undefined,
        footerCreditName: creditName || undefined
      }

      const result = await githubStorage.storeReport(report)
      if (result.success) {
        console.log('Report stored successfully:', result)
      } else {
        console.warn('GitHub storage skipped (optional):', result.error)
      }
    } catch (error) {
      console.warn('GitHub storage skipped (optional feature):', error)
      // Completely swallow the error so it doesn't show up as a "runtime error" to the user
      // This is optional storage, not critical path
    }
  }

  // Capture the canvas image once drawn
  const handleCanvasRendered = async (dataUrl: string | null) => {
    if (!dataUrl || !certData) return
    setGeneratedUrl(dataUrl)
    setGeneratedUrl(dataUrl)
    // persist a copy to localStorage for simple "admin/report" usage
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
      const { sendCertificateEmailAction } = await import('@/app/actions/email')
      await sendCertificateEmailAction(dataUrl, certData.issueType, certData.capturedAt, certData.locationText)
      console.log('Certificate email sent successfully')
    } catch (error) {
      console.error('Failed to send certificate email:', error)
    }
  }

  return (
    <main className="min-h-dvh bg-white text-gray-900" suppressHydrationWarning>
      {/* Flashy New Feature Banner */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-200 p-3">
        <div className="mx-auto max-w-xl flex items-center justify-center gap-3">
          <div className="bg-pink-100 text-pink-800 px-3 py-1.5 rounded-full text-sm font-medium animate-bounce">
            ✨ New Feature!
          </div>
          <a href="/company" className="bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg animate-pulse hover:shadow-xl transition-all duration-300">
            🏢 Swachhata Against Bad Service — Try Now
          </a>
        </div>
      </div>



      {/* Global header is used; local header removed to avoid duplication */}

      {/* Minimal inline disclaimer (compact, non-blocking) */}
      <div className="mx-auto max-w-xl px-4 pt-3">
        <p className="text-xs text-gray-500 text-center">
          Use for civic infrastructure only. Be responsible. <a href="/terms" className="underline">Terms</a>
        </p>
      </div>

      <div className="mx-auto max-w-xl px-4 py-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1) {t.translations.uploadPhoto}</CardTitle>
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
                src={issuePreview || "/placeholder.svg"}
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
            <CardTitle className="text-base">2) {t.translations.selectIssueType}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="issue-type">{t.translations.issueLabel}</Label>
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
                <option>Bad Infrastructure</option>
                <option>Infrastructure/Design</option>
                <option>Other</option>
              </select>
              <p className="text-xs text-gray-600">Auto-tagging coming soon; choose a type for now.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">{t.translations.noteLabel}</Label>
              <Input
                id="note"
                placeholder="Short description"
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location-text">{t.translations.locationLabel}</Label>
              <div className="relative flex items-center gap-2">
                <Input
                  id="location-text"
                  placeholder="e.g., MG Road, Bengaluru"
                  value={locText}
                  onChange={(e) => setLocText(e.target.value)}
                />
                <button
                  type="button"
                  aria-label="Detect my location"
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700"
                  onClick={async () => {
                    if (!navigator.geolocation) {
                      alert('Geolocation is not supported by your browser.');
                      return;
                    }
                    setIsGeoLoading(true);
                    navigator.geolocation.getCurrentPosition(async (pos) => {
                      const { latitude, longitude } = pos.coords;
                      setCoords({ lat: latitude, lng: longitude });
                      // Reverse geocode to a human-readable place
                      try {
                        const pretty = await reverseGeocode(latitude, longitude)
                        setLocText(pretty)
                      } catch {
                        setLocText(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
                      }
                      setIsGeoLoading(false);
                    }, (err) => {
                      console.error('Geolocation error', err);
                      setIsGeoLoading(false);
                      alert('Could not detect your location. Please allow location access or enter it manually.');
                    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                  }}
                >
                  {isGeoLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-600">
                Optional. We try to read GPS from the photo’s EXIF; you can refine or click the pin to auto-detect.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maps-url">Google Maps Location (Optional)</Label>
              <Input
                id="maps-url"
                type="url"
                placeholder="Paste Google Maps URL"
                value={locationMapUrl}
                onChange={(e) => setLocationMapUrl(e.target.value)}
              />
              <p className="text-xs text-gray-600">
                If provided, the QR code will point to this Google Maps location instead of the dummy report URL.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Capture Time</Label>
              {isClient && dateTime ? (
                <div className="space-y-2">
                  <Input
                    key="datetime-input"
                    type="datetime-local"
                    value={dateTime.toISOString().slice(0, 16)}
                    onChange={(e) => {
                      if (e.target.value) {
                        const newDateTime = new Date(e.target.value)
                        setDateTime(newDateTime)
                        setLocalDateTime(newDateTime.toLocaleString())
                        setUserSetTime(true) // Mark that user has set the time
                      }
                    }}
                    className="text-sm"
                  />
                  <div className="text-xs text-gray-600">
                    Current time: <span suppressHydrationWarning>{localDateTime}</span>
                    {userSetTime && (
                      <span className="ml-2 text-blue-600 font-medium">(User set)</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  {isClient ? "Loading time..." : "Loading..."}
                </div>
              )}
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
            <CardTitle className="text-base">3) {t.translations.chooseLeaders}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Select Leaders (Top Right)</Label>
              <div className="grid grid-cols-1 gap-2">
                {LEADER_OPTIONS.map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={selectedLeaders.includes(opt.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeaders((prev) => [...prev, opt.key]);
                        } else if (opt.key !== "modi") { // Don't unselect Modi
                          setSelectedLeaders((prev) => prev.filter((k) => k !== opt.key));
                        }
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                    <div className="flex flex-col items-center ml-2">
                      <img
                        src={opt.imageUrl}
                        alt={opt.label}
                        className="h-8 w-8 rounded-full object-cover border"
                      />
                      {opt.key === "gadkari" && (
                        <span className="text-xs text-red-600 font-medium">Nitin Gadkari</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {selectedLeaders.includes("cm") && (
              <div className="space-y-2">
                <Label className="text-sm">Select State/UT CM Photo</Label>
                <LeaderPhotoInput
                  defaultUrl="/images/leader-default.png"
                  onChange={(_: File | null, preview: string | null, name?: string) => {
                    setCmImage(preview || "/images/leader-default.png");
                    if (name) setSelectedCMName(name);
                  }}
                />
                {cmImage && (
                  <div className="space-y-1">
                    <img
                      src={cmImage}
                      alt="CM preview"
                      className="h-24 w-24 rounded object-cover border"
                    />
                    <div className="text-sm text-red-600 font-medium">Selected State/UT CM</div>
                  </div>
                )}
              </div>
            )}

            {/* Modi Photo Control */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={includeModiPhoto}
                  onChange={(e) => setIncludeModiPhoto(e.target.checked)}
                />
                <span>Include PM Modi's Photo (Bottom Left)</span>
              </Label>
              <p className="text-xs text-gray-600">
                PM Modi's photo will appear at the bottom left of the certificate if enabled.
                Select additional leaders to appear at the top right.
              </p>
            </div>

            {/* Legal Disclaimer */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium mb-1">⚠️ IMPORTANT DISCLAIMER</p>
              <p className="text-xs text-amber-700">
                This is <strong>NOT an official government document</strong>. This is a citizen-generated report for civic awareness purposes only.
                The use of leader photos does not imply official endorsement or government affiliation.
                No official action is guaranteed from this report.
              </p>
            </div>

            {selectedLeaders.includes("custom") && (
              <div className="space-y-2">
                <Label className="text-sm">Custom Leader / Officer</Label>
                <LeaderPhotoInput
                  defaultUrl="/images/leader-default.png"
                  onChange={(file: File | null, preview: string | null, name?: string) => {
                    setCustomImage(preview || "/images/leader-default.png");
                    if (name) setCustomName(name);
                  }}
                />
                {customImage && (
                  <div className="space-y-1">
                    <img
                      src={customImage}
                      alt="Custom leader preview"
                      className="h-24 w-24 rounded object-cover border"
                    />
                    <div className="text-sm text-red-600 font-medium">Custom Leader / Officer</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={!canGenerate} onClick={handleGenerate}>
            {t.translations.generateCertificate}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIssueImage(null)
              setIssuePreview(null)
              setLeaderImage(null)
              setLeaderPreview("/images/leader-default.png")
              setIssueType("Pothole")
              setIssueNote("")
              setCreditName("") // reset credit name
              setLocText("")
              setLocationMapUrl("")
              setCoords({ lat: null, lng: null })
              const now = new Date()
              setDateTime(now)
              setLocalDateTime(now.toLocaleString())
              setSelectedLeaders([]) // reset selected leaders
              setCmImage("/images/leader-default.png") // reset CM image
              setSelectedCMName("") // reset CM name
              setCustomImage("/images/leader-default.png") // reset custom image
              setCustomName("") // reset custom name
              setIncludeModiPhoto(true) // reset to default (enabled)
              setUserSetTime(false) // reset user time flag
              setCertData(null)
              setGeneratedUrl(null)
              setReportUrl(null)
              // Note: isClient should not be reset as it's needed for hydration
            }}
          >
            Reset
          </Button>
        </div>

        {certData && (
          <>
            <Separator />
            <section className="space-y-3">
              <h2 className="text-base font-semibold">{t.translations.title}</h2>
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
                {generatedUrl && reportUrl && certData && (
                  <SocialShare
                    imageDataUrl={generatedUrl}
                    issueType={certData.issueType}
                    location={certData.locationText}
                    url={reportUrl}
                  />
                )}
              </div>
              {(reportUrl || locationMapUrl) && (
                <p className="text-xs text-gray-600">
                  QR links to:{" "}
                  {locationMapUrl ? (
                    <a className="text-blue-600 underline" href={locationMapUrl}>
                      Google Maps Location
                    </a>
                  ) : (
                    <a className="text-blue-600 underline" href={reportUrl || '#'}>
                      {reportUrl}
                    </a>
                  )}{" "}
                  — demo only, no backend yet.
                </p>
              )}

              {/* Email and RTI Options */}
              {certData && (
                <EmailRTIOptions
                  issueType={certData.issueType}
                  location={certData.locationText}
                />
              )}
            </section>
          </>
        )}
      </div>

      {/* Footer: support & contribute links removed per request */}


      {/* Community Insights removed per request */}

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-gray-600 border-t">
        <div className="mb-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="mb-2">
            <strong>Legal Notice:</strong> This platform is for civic infrastructure reporting only.
            Users are responsible for their content. We do not verify reports or endorse claims.
          </p>
          <p>
            <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> •
            Platform operated under IT Act 2000, Section 79
          </p>
        </div>
        {/* Removed credit line per request */}
      </footer>
    </main>
  )
}
