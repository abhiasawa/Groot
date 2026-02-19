"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cachedFetch } from "@/lib/garden/fetch-cache";
import PageHeader from "@/components/garden/page-header";
import ThemeToggle from "@/components/garden/theme-toggle";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Trash2 } from "lucide-react";

interface Preferences {
  morning_checkin: boolean;
  evening_journal: boolean;
  weekly_report: boolean;
  feature_tips: boolean;
}

export default function SettingsPage() {
  const { user } = useCurrentUser();
  const [prefs, setPrefs] = useState<Preferences>({
    morning_checkin: true,
    evening_journal: true,
    weekly_report: true,
    feature_tips: true,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    cachedFetch<{ preferences?: Preferences }>("/api/settings")
      .then((data) => {
        if (data.preferences) setPrefs(data.preferences);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePref = useCallback(
    (key: keyof Preferences, value: boolean) => {
      if (!user) return;
      setPrefs((prev) => ({ ...prev, [key]: value }));

      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      }).catch(() => {
        setPrefs((prev) => ({ ...prev, [key]: !value }));
      });
    },
    [user],
  );

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `groot-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your preferences" />

      {/* Quick Links */}
      <Card>
        <CardContent className="flex flex-wrap gap-4">
          <Button variant="link" asChild className="h-auto p-0">
            <Link href="/garden/profile">View Profile &rarr;</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Morning check-in"
            description="Daily at 8 AM (your timezone)"
            value={prefs.morning_checkin}
            onChange={(v) => updatePref("morning_checkin", v)}
          />
          <ToggleRow
            label="Evening journal"
            description="Daily at 9 PM (your timezone)"
            value={prefs.evening_journal}
            onChange={(v) => updatePref("evening_journal", v)}
          />
          <ToggleRow
            label="Weekly report"
            description="Sunday at 10 AM (your timezone)"
            value={prefs.weekly_report}
            onChange={(v) => updatePref("weekly_report", v)}
          />
          <ToggleRow
            label="Feature tips"
            description="Occasional tips about new features"
            value={prefs.feature_tips}
            onChange={(v) => updatePref("feature_tips", v)}
          />
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={exporting}
            onClick={handleExport}
          >
            <Download />
            {exporting ? "Exporting..." : "Export my data (JSON)"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full justify-start">
                <Trash2 />
                Delete all my data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your data including memories,
                  habits, tasks, and reports. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled
                  title="Contact support to delete your account"
                >
                  Delete (contact support)
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">About Groot</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Groot is your AI Second Brain on WhatsApp. Version 0.1.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}
