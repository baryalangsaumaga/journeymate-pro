import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Download, Printer, Database, RefreshCw,
  CheckCircle2, AlertCircle, BarChart3, Table2,
  FileSpreadsheet, FileDown, Shield
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { generatePDF, downloadCSV, downloadJSON } from "@/lib/pdf";
import { storage, repo } from "@/lib/storage";
import { mockTrips, mockExpenses } from "@/data/mockData";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

const reportTypes = [
  { id: "trip-summary", label: "Trip Summary", icon: FileText, desc: "Complete overview with stops & expenses", format: ["PDF", "Excel"] },
  { id: "expense", label: "Expense Report", icon: BarChart3, desc: "Detailed spending breakdown", format: ["PDF", "CSV"] },
  { id: "itinerary", label: "Itinerary Export", icon: Table2, desc: "Full itinerary with transit info", format: ["PDF", "Excel", "Print"] },
  { id: "analytics", label: "Travel Analytics", icon: BarChart3, desc: "Statistics & travel patterns", format: ["PDF"] },
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
  const [genProgress, setGenProgress] = useState(0);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [autoSchedule, setAutoSchedule] = useState("12h");
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);

  const generateReport = (reportId: string, format: string) => {
    setGenerating(reportId);
    setGenProgress(0);
    toast({ title: `📄 Generating ${format}...`, description: "Building your report." });
    const interval = setInterval(() => {
      setGenProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // Actually emit a file based on format.
          const trip = mockTrips[0];
          const baseName = `${reportId}-${new Date().toISOString().slice(0, 10)}`;
          if (format === "PDF") {
            const doc = generatePDF({
              title: reportId === "trip-summary" ? `Trip Summary — ${trip.title}`
                   : reportId === "expense" ? `Expense Report — ${trip.title}`
                   : reportId === "itinerary" ? `Itinerary — ${trip.title}`
                   : "Travel Analytics",
              subtitle: `${trip.startDate} → ${trip.endDate}`,
              sections: reportId === "expense" ? [{
                title: "Expenses",
                rows: mockExpenses.map(e => [e.description, `${e.currency} ${e.amount.toLocaleString()} (${e.category})`]),
              }, {
                title: "Summary",
                rows: [["Total", `PHP ${mockExpenses.reduce((a, e) => a + e.amount, 0).toLocaleString()}`], ["Entries", String(mockExpenses.length)]],
              }] : reportId === "itinerary" ? [{
                title: "Stops",
                rows: trip.stops.map(s => [`${s.arrivalTime} · ${s.location.name}`, `${s.transitType} · ${s.notes}`]),
              }] : [{
                title: "Overview",
                rows: [["Trip", trip.title], ["Stops", String(trip.stops.length)], ["Collaborators", String(trip.collaborators.length)], ["Status", trip.status]],
              }, {
                title: "Highlights",
                rows: trip.stops.map(s => [s.location.name, s.notes]),
              }],
            });
            doc.save(`${baseName}.pdf`);
          } else if (format === "Excel" || format === "CSV") {
            const rows: string[][] = reportId === "expense"
              ? [["Description", "Amount", "Currency", "Category", "Date"], ...mockExpenses.map(e => [e.description, String(e.amount), e.currency, e.category, e.date])]
              : [["Stop", "Time", "Transit", "Notes"], ...trip.stops.map(s => [s.location.name, s.arrivalTime, s.transitType, s.notes])];
            downloadCSV(`${baseName}.${format === "Excel" ? "csv" : "csv"}`, rows);
          } else if (format === "Print") {
            window.print();
          }
          setGenerating(null);
          setGenProgress(0);
          toast({ title: "✅ Report Ready!", description: `${format} saved to your device.` });
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const triggerBackup = () => {
    setBackingUp(true);
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          const payload = storage.exportAll();
          const sizeKB = (JSON.stringify(payload).length / 1024).toFixed(1);
          const entry = { id: `b-${Date.now()}`, date: new Date().toLocaleString(), type: "Manual", size: `${sizeKB} KB`, status: "success" };
          repo.backups.add(entry);
          downloadJSON(`trailsync-backup-${new Date().toISOString().slice(0, 10)}.json`, payload);
          setBackingUp(false);
          toast({ title: "✅ Backup Complete!", description: `${sizeKB} KB exported and downloaded.` });
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const handleDownloadRecent = (name: string) => {
    setDownloadedFiles(prev => [...prev, name]);
    const doc = generatePDF({ title: name.replace(/\.[a-z]+$/, ""), sections: [{ title: "Note", rows: [["Source", "Recent reports cache"]] }] });
    doc.save(name.endsWith(".pdf") ? name : `${name}.pdf`);
    toast({ title: "📥 Downloaded!", description: `${name} saved.` });
  };

  const handlePrintRecent = (_name: string) => {
    window.print();
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="px-4 py-4 pb-6 space-y-4">
      <motion.div variants={item}>
        <h2 className="font-display font-bold text-xl tracking-tight">Reports & Backup</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Generate reports and manage backups</p>
      </motion.div>

      <Tabs defaultValue="reports">
        <TabsList className="w-full h-10 p-1 rounded-xl bg-muted">
          <TabsTrigger value="reports" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Reports</TabsTrigger>
          <TabsTrigger value="backup" className="flex-1 text-xs rounded-lg font-semibold data-[state=active]:shadow-sm">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-3 mt-3">
          {reportTypes.map(report => (
            <motion.div key={report.id} variants={item}>
              <Card className="border-0 card-interactive">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                      <report.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[13px]">{report.label}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{report.desc}</p>
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {report.format.map(fmt => (
                          <Button
                            key={fmt}
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1 rounded-lg font-semibold"
                            disabled={generating === report.id}
                            onClick={() => generateReport(report.id, fmt)}
                          >
                            {fmt === "Print" ? <Printer className="w-3 h-3" /> : fmt === "PDF" ? <FileDown className="w-3 h-3" /> : <FileSpreadsheet className="w-3 h-3" />}
                            {fmt}
                          </Button>
                        ))}
                      </div>
                      {generating === report.id && (
                        <div className="mt-2.5">
                          <Progress value={genProgress} className="h-1.5" />
                          <p className="text-[9px] text-muted-foreground mt-1">{genProgress}% generating...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <motion.div variants={item}>
            <h3 className="section-header mb-2.5">Recent Reports</h3>
            <div className="space-y-2">
              {[
                { name: "Manila Heritage Walk - Summary.pdf", date: "Mar 9, 2026", size: "1.2 MB" },
                { name: "March Expenses.xlsx", date: "Mar 8, 2026", size: "340 KB" },
                { name: "Itinerary - Tagaytay.pdf", date: "Mar 7, 2026", size: "890 KB" },
              ].map((file) => (
                <Card key={file.name} className={`border-0 card-interactive ${downloadedFiles.includes(file.name) ? "opacity-60" : ""}`}>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <FileDown className="w-5 h-5 text-destructive flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{file.date} · {file.size}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleDownloadRecent(file.name)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handlePrintRecent(file.name)}>
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4 mt-3">
          <motion.div variants={item}>
            <Card className="border-0 card-elevated bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[13px]">Database Status</h4>
                    <p className="text-[10px] text-muted-foreground">Last backup: 2 hours ago</p>
                  </div>
                  <Badge className="bg-success/10 text-success text-[9px] h-5 font-semibold border-0">Protected</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "DB Size", value: "2.4 MB" },
                    { label: "Backups", value: "5" },
                    { label: "Interval", value: autoSchedule },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2.5 bg-muted rounded-xl">
                      <p className="font-display font-bold text-sm">{s.value}</p>
                      <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-0 card-elevated">
              <CardContent className="p-4">
                <h4 className="font-semibold text-[13px] mb-1">Manual Backup</h4>
                <p className="text-[10px] text-muted-foreground mb-3">Trigger an immediate backup of your travel data</p>
                {backingUp ? (
                  <div className="space-y-2">
                    <Progress value={backupProgress} className="h-2" />
                    <p className="text-[10px] text-muted-foreground text-center font-medium">{backupProgress}% complete</p>
                  </div>
                ) : (
                  <Button className="w-full h-10 gap-2 rounded-xl shadow-travel font-semibold" onClick={triggerBackup}>
                    <Database className="w-4 h-4" /> Backup Now
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-0 card-elevated">
              <CardContent className="p-4">
                <h4 className="font-semibold text-[13px] mb-2.5">Auto Backup Schedule</h4>
                <div className="space-y-1.5">
                  {[
                    { label: "Every 12 hours", value: "12h" },
                    { label: "Every 24 hours", value: "24h" },
                    { label: "Weekly", value: "weekly" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setAutoSchedule(opt.value); toast({ title: `⏰ Backup Schedule: ${opt.label}` }); }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium transition-all tap-highlight ${
                        autoSchedule === opt.value ? "bg-primary/8 text-primary border border-primary/15" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {autoSchedule === opt.value && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <h3 className="section-header mb-2.5">Backup History</h3>
            <div className="space-y-2">
              {backupHistory.map(backup => (
                <Card key={backup.id} className="border-0 card-interactive">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    {backup.status === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold">{backup.date}</p>
                      <p className="text-[10px] text-muted-foreground">{backup.type} · {backup.size}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] h-[18px] font-semibold ${
                      backup.status === "success" ? "text-success border-success/20" : "text-destructive border-destructive/20"
                    }`}>
                      {backup.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
