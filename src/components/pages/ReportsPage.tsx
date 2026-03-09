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
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const generateReport = (reportId: string, format: string) => {
    setGenerating(reportId);
    toast({ title: `Generating ${format} Report...`, description: "Your report will be ready shortly." });
    setTimeout(() => {
      setGenerating(null);
      toast({ title: "Report Ready! 📄", description: `Your ${format} report is ready for download.` });
    }, 2000);
  };

  const triggerBackup = () => {
    setBackingUp(true);
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setBackingUp(false);
          toast({ title: "Backup Complete! ✅", description: "Database backed up successfully." });
          return 100;
        }
        return prev + 10;
      });
    }, 300);
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1 rounded-lg font-semibold"
                          disabled={generating === report.id}
                          onClick={() => generateReport(report.id, "download")}
                        >
                          <Download className="w-3 h-3" /> Download
                        </Button>
                      </div>
                      {generating === report.id && (
                        <div className="mt-2.5">
                          <Progress value={65} className="h-1.5" />
                          <p className="text-[9px] text-muted-foreground mt-1">Generating...</p>
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
              ].map((file, i) => (
                <Card key={i} className="border-0 card-interactive">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <FileDown className="w-5 h-5 text-destructive flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{file.date} · {file.size}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"><Download className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"><Printer className="w-3.5 h-3.5" /></Button>
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
                    { label: "Interval", value: "12h" },
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
                    { label: "Every 12 hours", active: true },
                    { label: "Every 24 hours", active: false },
                    { label: "Weekly", active: false },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium transition-all tap-highlight ${
                        opt.active ? "bg-primary/8 text-primary border border-primary/15" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.active && <CheckCircle2 className="w-4 h-4" />}
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
