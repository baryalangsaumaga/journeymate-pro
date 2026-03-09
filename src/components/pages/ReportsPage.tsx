import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Download, Printer, Database, Clock, RefreshCw,
  CheckCircle2, AlertCircle, Calendar, BarChart3, Table2,
  FileSpreadsheet, FileDown, Shield, HardDrive, Cloud
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const reportTypes = [
  { id: "trip-summary", label: "Trip Summary", icon: FileText, desc: "Complete trip overview with stops & expenses", format: ["PDF", "Excel"] },
  { id: "expense", label: "Expense Report", icon: BarChart3, desc: "Detailed breakdown of trip spending", format: ["PDF", "CSV"] },
  { id: "itinerary", label: "Itinerary Export", icon: Table2, desc: "Full itinerary with times & transit info", format: ["PDF", "Excel", "Print"] },
  { id: "analytics", label: "Travel Analytics", icon: BarChart3, desc: "Statistics, heatmaps, and travel patterns", format: ["PDF"] },
];

const backupHistory = [
  { id: "b1", date: "2026-03-09 10:30", type: "Automatic", size: "2.4 MB", status: "success" },
  { id: "b2", date: "2026-03-08 22:00", type: "Automatic", size: "2.3 MB", status: "success" },
  { id: "b3", date: "2026-03-08 10:00", type: "Manual", size: "2.3 MB", status: "success" },
  { id: "b4", date: "2026-03-07 22:00", type: "Automatic", size: "2.1 MB", status: "success" },
  { id: "b5", date: "2026-03-06 22:00", type: "Automatic", size: "2.0 MB", status: "failed" },
];

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const generateReport = (reportId: string, format: string) => {
    setGenerating(reportId);
    toast({
      title: `Generating ${format} Report...`,
      description: "Your report will be ready to download shortly.",
    });
    setTimeout(() => {
      setGenerating(null);
      toast({
        title: "Report Ready! 📄",
        description: `Your ${format} report has been generated and is ready for download.`,
      });
    }, 2000);
  };

  const printReport = (reportId: string) => {
    toast({
      title: "Preparing for Print... 🖨️",
      description: "Opening print dialog...",
    });
  };

  const triggerBackup = () => {
    setBackingUp(true);
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setBackingUp(false);
          toast({ title: "Backup Complete! ✅", description: "Your database has been backed up successfully." });
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-4">
      <div>
        <h2 className="font-display font-bold text-xl">Reports & Backup</h2>
        <p className="text-xs text-muted-foreground">Generate reports and manage database backups</p>
      </div>

      <Tabs defaultValue="reports">
        <TabsList className="w-full">
          <TabsTrigger value="reports" className="flex-1 text-xs">Reports</TabsTrigger>
          <TabsTrigger value="backup" className="flex-1 text-xs">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-3 mt-3">
          {reportTypes.map(report => (
            <Card key={report.id} className="border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-muted flex items-center justify-center flex-shrink-0">
                    <report.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{report.label}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{report.desc}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {report.format.map(fmt => (
                        <Button
                          key={fmt}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          disabled={generating === report.id}
                          onClick={() => fmt === "Print" ? printReport(report.id) : generateReport(report.id, fmt)}
                        >
                          {fmt === "Print" ? (
                            <Printer className="w-3 h-3" />
                          ) : fmt === "PDF" ? (
                            <FileDown className="w-3 h-3" />
                          ) : (
                            <FileSpreadsheet className="w-3 h-3" />
                          )}
                          {fmt}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1"
                        disabled={generating === report.id}
                        onClick={() => generateReport(report.id, "download")}
                      >
                        <Download className="w-3 h-3" /> Download
                      </Button>
                    </div>
                    {generating === report.id && (
                      <div className="mt-2">
                        <Progress value={65} className="h-1.5" />
                        <p className="text-[9px] text-muted-foreground mt-1">Generating report...</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Recent Reports */}
          <h3 className="font-display font-semibold text-sm">Recent Reports</h3>
          <div className="space-y-2">
            {[
              { name: "Manila Heritage Walk - Summary.pdf", date: "Mar 9, 2026", size: "1.2 MB" },
              { name: "March Expenses.xlsx", date: "Mar 8, 2026", size: "340 KB" },
              { name: "Itinerary - Tagaytay.pdf", date: "Mar 7, 2026", size: "890 KB" },
            ].map((file, i) => (
              <Card key={i} className="border-0 shadow-card">
                <CardContent className="p-3 flex items-center gap-3">
                  <FileDown className="w-5 h-5 text-destructive flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{file.date} · {file.size}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Printer className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="backup" className="space-y-3 mt-3">
          {/* Backup Status */}
          <Card className="border-0 shadow-card bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">Database Status</h4>
                  <p className="text-[10px] text-muted-foreground">Last backup: 2 hours ago</p>
                </div>
                <Badge className="bg-success text-success-foreground text-[10px] h-5">Protected</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-muted rounded-lg">
                  <p className="font-display font-bold text-sm">2.4 MB</p>
                  <p className="text-[9px] text-muted-foreground">DB Size</p>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <p className="font-display font-bold text-sm">5</p>
                  <p className="text-[9px] text-muted-foreground">Backups</p>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <p className="font-display font-bold text-sm">12h</p>
                  <p className="text-[9px] text-muted-foreground">Interval</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Backup */}
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-2">Manual Backup</h4>
              <p className="text-[10px] text-muted-foreground mb-3">Trigger an immediate backup of your travel data</p>
              {backingUp ? (
                <div className="space-y-2">
                  <Progress value={backupProgress} className="h-2" />
                  <p className="text-[10px] text-muted-foreground text-center">{backupProgress}% complete</p>
                </div>
              ) : (
                <Button className="w-full h-9 gap-2 rounded-xl shadow-travel" onClick={triggerBackup}>
                  <Database className="w-4 h-4" /> Backup Now
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Auto Backup Settings */}
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-2">Automatic Backup Schedule</h4>
              <div className="space-y-2">
                {[
                  { label: "Every 12 hours", active: true },
                  { label: "Every 24 hours", active: false },
                  { label: "Weekly", active: false },
                ].map(opt => (
                  <button
                    key={opt.label}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-all ${
                      opt.active ? "bg-brand-muted text-primary border border-primary/20" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.active && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Backup History */}
          <h3 className="font-display font-semibold text-sm">Backup History</h3>
          <div className="space-y-2">
            {backupHistory.map(backup => (
              <Card key={backup.id} className="border-0 shadow-card">
                <CardContent className="p-3 flex items-center gap-3">
                  {backup.status === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{backup.date}</p>
                    <p className="text-[10px] text-muted-foreground">{backup.type} · {backup.size}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] h-4 ${
                    backup.status === "success" ? "text-success border-success/30" : "text-destructive border-destructive/30"
                  }`}>
                    {backup.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
