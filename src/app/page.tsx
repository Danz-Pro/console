'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot, Play, Square, RotateCcw, Plus, Trash2, Terminal,
  Activity, FileText, Settings, TrendingUp, AlertCircle,
  CheckCircle2, Clock, XCircle, Zap, Database, Eye,
  RefreshCw, ChevronRight, Code2
} from 'lucide-react';

// Types
interface BotItem {
  id: string;
  name: string;
  description: string | null;
  script: string;
  status: string;
  pid: string | null;
  command: string;
  args: string;
  envVars: string;
  autoRestart: boolean;
  restartCount: number;
  lastStarted: string | null;
  lastStopped: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { logs: number };
  logs?: BotLog[];
}

interface BotLog {
  id: string;
  botId: string;
  level: string;
  message: string;
  source: string;
  createdAt: string;
}

export default function Home() {
  const [bots, setBots] = useState<BotItem[]>([]);
  const [selectedBot, setSelectedBot] = useState<BotItem | null>(null);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const loadingRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    script: '',
    command: 'node',
    args: '',
    envVars: '{}',
    autoRestart: false,
  });

  const fetchBots = useCallback(async () => {
    try {
      const res = await fetch('/api/bots');
      const data = await res.json();
      setBots(data);
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    }
  }, []);

  const fetchLogs = useCallback(async (botId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/logs?limit=200`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchBots();
      if (loadingRef.current) {
        loadingRef.current = false;
      }
    };
    init();
  }, [fetchBots]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchBots();
      if (selectedBot) fetchLogs(selectedBot.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchBots, fetchLogs, selectedBot]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCreateBot = async () => {
    if (!form.name || !form.script) return;
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await fetchBots();
        setShowCreateDialog(false);
        resetForm();
      }
    } catch (err) {
      console.error('Failed to create bot:', err);
    }
  };

  const handleUpdateBot = async () => {
    if (!selectedBot || !form.name || !form.script) return;
    try {
      const res = await fetch(`/api/bots/${selectedBot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await fetchBots();
        setShowEditDialog(false);
        const updated = await res.json();
        setSelectedBot(updated);
      }
    } catch (err) {
      console.error('Failed to update bot:', err);
    }
  };

  const handleDeleteBot = async (id: string) => {
    try {
      const res = await fetch(`/api/bots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchBots();
        if (selectedBot?.id === id) {
          setSelectedBot(null);
          setLogs([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete bot:', err);
    }
  };

  const handleControl = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/bots/${id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchBots();
        if (selectedBot?.id === id) fetchLogs(id);
      }
    } catch (err) {
      console.error(`Failed to ${action} bot:`, err);
    }
  };

  const handleClearLogs = async (botId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/logs`, { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        fetchBots();
      }
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', script: '', command: 'node', args: '', envVars: '{}', autoRestart: false });
  };

  const openEditDialog = (bot: BotItem) => {
    setForm({
      name: bot.name,
      description: bot.description || '',
      script: bot.script,
      command: bot.command,
      args: bot.args,
      envVars: bot.envVars,
      autoRestart: bot.autoRestart,
    });
    setShowEditDialog(true);
  };

  const selectBotAndFetchLogs = (bot: BotItem) => {
    setSelectedBot(bot);
    fetchLogs(bot.id);
  };

  // Stats
  const totalBots = bots.length;
  const runningBots = bots.filter(b => b.status === 'running').length;
  const stoppedBots = bots.filter(b => b.status === 'stopped').length;
  const errorBots = bots.filter(b => b.status === 'error').length;
  const totalLogs = bots.reduce((sum, b) => sum + (b._count?.logs || 0), 0);

  const filteredLogs = logFilter === 'all' ? logs : logs.filter(l => l.level === logFilter);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/20"><Activity className="w-3 h-3 mr-1" />Running</Badge>;
      case 'stopped': return <Badge className="bg-gray-500/15 text-gray-600 border-gray-500/25 hover:bg-gray-500/20"><Square className="w-3 h-3 mr-1" />Stopped</Badge>;
      case 'error': return <Badge className="bg-red-500/15 text-red-600 border-red-500/25 hover:bg-red-500/20"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'info': return <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600">INFO</span>;
      case 'warn': return <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">WARN</span>;
      case 'error': return <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-600">ERROR</span>;
      case 'debug': return <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600">DEBUG</span>;
      default: return <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-600">{level.toUpperCase()}</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">WA Bot Console</h1>
                <p className="text-xs text-gray-500">WhatsApp Bot Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Auto-refresh</span>
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              </div>
              <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800/50 hover:bg-gray-700" onClick={fetchBots}>
                <RefreshCw className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">New Bot</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-gray-100">Add New Bot</DialogTitle>
                    <DialogDescription className="text-gray-400">Configure a new WhatsApp bot script to manage.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Bot Name *</Label>
                      <Input
                        placeholder="e.g. WA Marketing Bot"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Description</Label>
                      <Input
                        placeholder="Brief description of the bot"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Command *</Label>
                        <Select value={form.command} onValueChange={v => setForm(f => ({ ...f, command: v }))}>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="node">Node.js</SelectItem>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="python3">Python 3</SelectItem>
                            <SelectItem value="bun">Bun</SelectItem>
                            <SelectItem value="bash">Bash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Arguments</Label>
                        <Input
                          placeholder="Optional args"
                          value={form.args}
                          onChange={e => setForm(f => ({ ...f, args: e.target.value }))}
                          className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Script Path *</Label>
                      <Input
                        placeholder="e.g. ./bots/marketing-bot.js"
                        value={form.script}
                        onChange={e => setForm(f => ({ ...f, script: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Environment Variables (JSON)</Label>
                      <Textarea
                        placeholder='{"KEY": "value"}'
                        value={form.envVars}
                        onChange={e => setForm(f => ({ ...f, envVars: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 font-mono text-sm min-h-[80px]"
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-gray-700 p-3">
                      <div>
                        <Label className="text-gray-300">Auto-restart on error</Label>
                        <p className="text-xs text-gray-500">Automatically restart the bot when it crashes</p>
                      </div>
                      <Switch checked={form.autoRestart} onCheckedChange={v => setForm(f => ({ ...f, autoRestart: v }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }} className="border-gray-700 bg-gray-800 hover:bg-gray-700">Cancel</Button>
                    <Button onClick={handleCreateBot} className="bg-emerald-600 hover:bg-emerald-700" disabled={!form.name || !form.script}>Create Bot</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-900 border border-gray-800 p-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400">
              <Activity className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="bots" className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400">
              <Bot className="w-4 h-4 mr-2" />
              Bots
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400">
              <Terminal className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Bots</CardTitle>
                  <Bot className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalBots}</div>
                  <p className="text-xs text-gray-500 mt-1">Registered bot scripts</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Running</CardTitle>
                  <Activity className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-500">{runningBots}</div>
                  <p className="text-xs text-gray-500 mt-1">Active processes</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Errors</CardTitle>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">{errorBots}</div>
                  <p className="text-xs text-gray-500 mt-1">Need attention</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Logs</CardTitle>
                  <FileText className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalLogs}</div>
                  <p className="text-xs text-gray-500 mt-1">Log entries recorded</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Bot List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bot Status Overview */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-100 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-500" />
                    Bot Status
                  </CardTitle>
                  <CardDescription className="text-gray-400">Overview of all registered bots</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : bots.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">No bots registered yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-gray-700 text-gray-400 hover:bg-gray-800"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />Add First Bot
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-80">
                      <div className="space-y-2">
                        {bots.map(bot => (
                          <div
                            key={bot.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                            onClick={() => { selectBotAndFetchLogs(bot); setActiveTab('logs'); }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${bot.status === 'running' ? 'bg-emerald-500 animate-pulse' : bot.status === 'error' ? 'bg-red-500' : 'bg-gray-600'}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{bot.name}</p>
                                <p className="text-xs text-gray-500 truncate">{bot.script}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getStatusBadge(bot.status)}
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions & Info */}
              <div className="space-y-6">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-gray-100 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Stopped Bots</span>
                      <span className="text-sm font-medium">{stoppedBots}</span>
                    </div>
                    <Separator className="bg-gray-800" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Auto-restart Enabled</span>
                      <span className="text-sm font-medium">{bots.filter(b => b.autoRestart).length}</span>
                    </div>
                    <Separator className="bg-gray-800" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Total Restarts</span>
                      <span className="text-sm font-medium">{bots.reduce((s, b) => s + b.restartCount, 0)}</span>
                    </div>
                    <Separator className="bg-gray-800" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Uptime Rate</span>
                      <span className="text-sm font-medium text-emerald-500">
                        {totalBots > 0 ? Math.round((runningBots / totalBots) * 100) : 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-gray-100 flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-emerald-500" />
                      Quick Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">1.</span>
                      <p>Click <strong className="text-gray-300">&quot;New Bot&quot;</strong> to register a WhatsApp bot script with its path and settings.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">2.</span>
                      <p>Use the <strong className="text-gray-300">Bots tab</strong> to manage all your registered scripts, start/stop processes.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">3.</span>
                      <p>Monitor real-time output in the <strong className="text-gray-300">Logs tab</strong> with filtering by level.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">4.</span>
                      <p>Configure <strong className="text-gray-300">auto-restart</strong> to automatically recover from crashes.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Bots Tab */}
          <TabsContent value="bots" className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-800 rounded w-1/2 mb-4 animate-pulse" />
                      <div className="h-4 bg-gray-800 rounded w-3/4 mb-2 animate-pulse" />
                      <div className="h-4 bg-gray-800 rounded w-1/2 animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : bots.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="py-16 text-center">
                  <Bot className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No Bots Yet</h3>
                  <p className="text-gray-500 mb-4">Get started by adding your first WhatsApp bot script.</p>
                  <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />Add Bot
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bots.map(bot => (
                  <Card key={bot.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${bot.status === 'running' ? 'bg-emerald-500 animate-pulse' : bot.status === 'error' ? 'bg-red-500' : 'bg-gray-600'}`} />
                          <CardTitle className="text-gray-100 text-base">{bot.name}</CardTitle>
                        </div>
                        {getStatusBadge(bot.status)}
                      </div>
                      {bot.description && (
                        <CardDescription className="text-gray-400 text-sm mt-1">{bot.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="font-mono text-xs truncate">{bot.script}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Terminal className="w-3.5 h-3.5" />
                          <span className="font-mono text-xs">{bot.command}{bot.args ? ` ${bot.args}` : ''}</span>
                        </div>
                        {bot.pid && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Database className="w-3.5 h-3.5" />
                            <span className="font-mono text-xs">PID: {bot.pid}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs">{bot.lastStarted ? `Started: ${formatTime(bot.lastStarted)}` : 'Never started'}</span>
                        </div>
                        {bot.autoRestart && (
                          <div className="flex items-center gap-2 text-amber-400">
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="text-xs">Auto-restart ON ({bot.restartCount} restarts)</span>
                          </div>
                        )}
                      </div>

                      <Separator className="bg-gray-800" />

                      <div className="flex items-center gap-2">
                        {bot.status === 'running' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => handleControl(bot.id, 'stop')}
                            >
                              <Square className="w-3.5 h-3.5 mr-1" />Stop
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                              onClick={() => handleControl(bot.id, 'restart')}
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />Restart
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleControl(bot.id, 'start')}
                          >
                            <Play className="w-3.5 h-3.5 mr-1" />Start
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-700 text-gray-400 hover:bg-gray-800"
                          onClick={() => { selectBotAndFetchLogs(bot); setActiveTab('logs'); }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-700 text-gray-400 hover:bg-gray-800"
                          onClick={() => openEditDialog(bot)}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="border-gray-700 text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-gray-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-gray-100">Delete Bot</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to delete &quot;{bot.name}&quot;? This will also delete all associated logs. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-700 bg-gray-800 hover:bg-gray-700">Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteBot(bot.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Bot List Sidebar */}
              <Card className="bg-gray-900 border-gray-800 lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400">Select Bot</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-1">
                      {bots.map(bot => (
                        <button
                          key={bot.id}
                          onClick={() => selectBotAndFetchLogs(bot)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                            selectedBot?.id === bot.id
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : 'hover:bg-gray-800 text-gray-400 border border-transparent'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bot.status === 'running' ? 'bg-emerald-500' : bot.status === 'error' ? 'bg-red-500' : 'bg-gray-600'}`} />
                          <span className="truncate">{bot.name}</span>
                          <span className="ml-auto text-xs text-gray-600">{bot._count?.logs || 0}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Log Viewer */}
              <Card className="bg-gray-900 border-gray-800 lg:col-span-3">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-100 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-emerald-500" />
                        {selectedBot ? selectedBot.name : 'Log Output'}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {selectedBot ? `${filteredLogs.length} log entries` : 'Select a bot to view logs'}
                      </CardDescription>
                    </div>
                    {selectedBot && (
                      <div className="flex items-center gap-2">
                        <Select value={logFilter} onValueChange={setLogFilter}>
                          <SelectTrigger className="w-28 bg-gray-800 border-gray-700 text-gray-300 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warn">Warning</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                            <SelectItem value="debug">Debug</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 text-xs"
                          onClick={() => fetchLogs(selectedBot.id)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />Refresh
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs">
                              <Trash2 className="w-3 h-3 mr-1" />Clear
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-gray-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-gray-100">Clear Logs</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                Clear all logs for &quot;{selectedBot.name}&quot;? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-700 bg-gray-800 hover:bg-gray-700">Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleClearLogs(selectedBot.id)}>Clear</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedBot ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                      <Terminal className="w-12 h-12 mb-3" />
                      <p className="text-sm">Select a bot from the sidebar to view logs</p>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                      <CheckCircle2 className="w-12 h-12 mb-3" />
                      <p className="text-sm">No logs to display</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[500px] rounded-lg border border-gray-800 bg-gray-950">
                      <div className="p-4 font-mono text-xs space-y-1">
                        {filteredLogs.map(log => (
                          <div key={log.id} className="flex items-start gap-2 hover:bg-gray-800/30 rounded px-1 py-0.5">
                            <span className="text-gray-600 flex-shrink-0 w-[140px] hidden sm:inline">
                              {formatTime(log.createdAt)}
                            </span>
                            <span className="flex-shrink-0">{getLevelBadge(log.level)}</span>
                            <span className="text-gray-600 flex-shrink-0 hidden md:inline text-[10px] mt-0.5">
                              [{log.source}]
                            </span>
                            <span className={`break-all ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-gray-300'}`}>
                              {log.message}
                            </span>
                          </div>
                        ))}
                        <div ref={logEndRef} />
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="max-w-2xl space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-100 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-emerald-500" />
                    Console Settings
                  </CardTitle>
                  <CardDescription className="text-gray-400">Configure your WA Bot Console preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border border-gray-700 p-4">
                    <div>
                      <Label className="text-gray-200 font-medium">Auto-refresh Data</Label>
                      <p className="text-sm text-gray-500 mt-1">Automatically refresh bot status and logs every 3 seconds</p>
                    </div>
                    <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                  </div>
                  <Separator className="bg-gray-800" />
                  <div className="rounded-lg border border-gray-700 p-4">
                    <Label className="text-gray-200 font-medium">Refresh Interval</Label>
                    <p className="text-sm text-gray-500 mt-1">Current interval: <span className="text-emerald-400 font-mono">3 seconds</span></p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-100 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-500" />
                    System Information
                  </CardTitle>
                  <CardDescription className="text-gray-400">Current system status and database info</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Database</span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">SQLite Connected</Badge>
                  </div>
                  <Separator className="bg-gray-800" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Framework</span>
                    <span className="text-gray-300 font-mono text-xs">Next.js 16 + App Router</span>
                  </div>
                  <Separator className="bg-gray-800" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Runtime</span>
                    <span className="text-gray-300 font-mono text-xs">Bun</span>
                  </div>
                  <Separator className="bg-gray-800" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Deployment</span>
                    <Badge variant="outline" className="border-gray-600 text-gray-400">Railway Ready</Badge>
                  </div>
                  <Separator className="bg-gray-800" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Process Manager</span>
                    <span className="text-gray-300 font-mono text-xs">Node.js child_process</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    API Endpoints
                  </CardTitle>
                  <CardDescription className="text-gray-400">Available REST API endpoints for external integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-800/50">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">GET</Badge>
                    <span className="text-gray-300">/api/bots</span>
                    <span className="text-gray-600 ml-auto">List all bots</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-800/50">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">POST</Badge>
                    <span className="text-gray-300">/api/bots</span>
                    <span className="text-gray-600 ml-auto">Create bot</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-800/50">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">PUT</Badge>
                    <span className="text-gray-300">/api/bots/:id</span>
                    <span className="text-gray-600 ml-auto">Update bot</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-800/50">
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">DEL</Badge>
                    <span className="text-gray-300">/api/bots/:id</span>
                    <span className="text-gray-600 ml-auto">Delete bot</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-800/50">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">POST</Badge>
                    <span className="text-gray-300">/api/bots/:id/control</span>
                    <span className="text-gray-600 ml-auto">Start/Stop/Restart</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-800/50">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">GET</Badge>
                    <span className="text-gray-300">/api/bots/:id/logs</span>
                    <span className="text-gray-600 ml-auto">Get logs</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-gray-800/50">
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">DEL</Badge>
                    <span className="text-gray-300">/api/bots/:id/logs</span>
                    <span className="text-gray-600 ml-auto">Clear logs</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Edit Bot</DialogTitle>
            <DialogDescription className="text-gray-400">Update bot configuration settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-gray-300">Bot Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-100" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Command *</Label>
                <Select value={form.command} onValueChange={v => setForm(f => ({ ...f, command: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="node">Node.js</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="python3">Python 3</SelectItem>
                    <SelectItem value="bun">Bun</SelectItem>
                    <SelectItem value="bash">Bash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Arguments</Label>
                <Input value={form.args} onChange={e => setForm(f => ({ ...f, args: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-100" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Script Path *</Label>
              <Input value={form.script} onChange={e => setForm(f => ({ ...f, script: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-100 font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Environment Variables (JSON)</Label>
              <Textarea value={form.envVars} onChange={e => setForm(f => ({ ...f, envVars: e.target.value }))} className="bg-gray-800 border-gray-700 text-gray-100 font-mono text-sm min-h-[80px]" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-700 p-3">
              <div>
                <Label className="text-gray-300">Auto-restart on error</Label>
                <p className="text-xs text-gray-500">Automatically restart the bot when it crashes</p>
              </div>
              <Switch checked={form.autoRestart} onCheckedChange={v => setForm(f => ({ ...f, autoRestart: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-gray-700 bg-gray-800 hover:bg-gray-700">Cancel</Button>
            <Button onClick={handleUpdateBot} className="bg-emerald-600 hover:bg-emerald-700" disabled={!form.name || !form.script}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-gray-600">
          <span>WA Bot Console v1.0.0</span>
          <span>Railway Ready</span>
        </div>
      </footer>
    </div>
  );
}
