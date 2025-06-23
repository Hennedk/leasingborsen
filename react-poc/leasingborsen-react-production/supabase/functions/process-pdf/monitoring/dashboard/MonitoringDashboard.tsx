import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  HardDrive, 
  Memory, 
  Server, 
  TrendingUp, 
  TrendingDown, 
  Users,
  Zap,
  RefreshCw,
  Download
} from 'lucide-react';

import { SystemMetrics, ComponentHealth } from '../ProductionMonitor';
import { Alert as AlertType } from '../AlertManager';
import { SLAReport } from '../SLAMonitor';

interface MonitoringDashboardProps {
  onRefresh?: () => void;
  onExportData?: () => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  onRefresh,
  onExportData
}) => {
  const [systemStatus, setSystemStatus] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [slaReport, setSlaReport] = useState<SLAReport | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, these would be API calls
      const [statusData, alertsData, slaData, historicalData] = await Promise.all([
        fetchSystemStatus(),
        fetchActiveAlerts(),
        fetchSLAReport(),
        fetchHistoricalMetrics()
      ]);

      setSystemStatus(statusData);
      setAlerts(alertsData);
      setSlaReport(slaData);
      setHistoricalData(historicalData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
    onRefresh?.();
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'default';
    }
  };

  if (loading && !systemStatus) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onExportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          title="System Health"
          value={systemStatus?.health.overall || 'unknown'}
          icon={getHealthStatusIcon(systemStatus?.health.overall || 'unknown')}
          className={getHealthStatusColor(systemStatus?.health.overall || 'unknown')}
        />
        <OverviewCard
          title="Active Alerts"
          value={alerts.length.toString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          className={alerts.length > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <OverviewCard
          title="API Response Time"
          value={`${systemStatus?.performance.apiResponseTime || 0}ms`}
          icon={<Clock className="h-5 w-5" />}
          trend={systemStatus?.performance.apiResponseTime ? 'stable' : undefined}
        />
        <OverviewCard
          title="Throughput"
          value={`${systemStatus?.performance.throughput || 0}/min`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map(alert => (
                <Alert key={alert.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.component}</span>
                    <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    {alert.message}
                    <span className="text-xs text-muted-foreground ml-2">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
              {alerts.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  +{alerts.length - 5} more alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="sla">SLA Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Component Health */}
            <Card>
              <CardHeader>
                <CardTitle>Component Health</CardTitle>
              </CardHeader>
              <CardContent>
                <ComponentHealthGrid components={systemStatus?.health.components || {}} />
              </CardContent>
            </Card>

            {/* System Usage */}
            <Card>
              <CardHeader>
                <CardTitle>System Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Active Users
                    </span>
                    <span className="font-medium">{systemStatus?.usage.activeUsers || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Requests/Min
                    </span>
                    <span className="font-medium">{systemStatus?.usage.requestsPerMinute || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Documents Processed
                    </span>
                    <span className="font-medium">{systemStatus?.usage.documentsProcessed || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="errorRate" 
                      stroke="#ff7300" 
                      fill="#ff7300" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceMetrics 
            metrics={systemStatus?.performance}
            historicalData={historicalData}
          />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <ResourceMetrics 
            metrics={systemStatus?.resources}
            historicalData={historicalData}
          />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ErrorAnalysis 
            errorMetrics={systemStatus?.errors}
            alerts={alerts}
          />
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <SLACompliance report={slaReport} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Sub-components
const OverviewCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
  trend?: 'up' | 'down' | 'stable';
}> = ({ title, value, icon, className, trend }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${className}`}>{value}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {icon}
          {trend && (
            <div className="flex items-center text-xs">
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
              {trend === 'stable' && <div className="h-3 w-3 rounded-full bg-blue-600" />}
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ComponentHealthGrid: React.FC<{
  components: Record<string, ComponentHealth>;
}> = ({ components }) => (
  <div className="grid grid-cols-2 gap-4">
    {Object.entries(components).map(([name, health]) => (
      <div key={name} className="flex items-center justify-between p-3 rounded-lg border">
        <div>
          <p className="font-medium capitalize">{name.replace('_', ' ')}</p>
          <p className="text-xs text-muted-foreground">
            {health.responseTime}ms avg
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getHealthStatusIcon(health.status)}
          <Badge variant="outline" className="text-xs">
            {health.status}
          </Badge>
        </div>
      </div>
    ))}
  </div>
);

const PerformanceMetrics: React.FC<{
  metrics?: any;
  historicalData: any[];
}> = ({ metrics, historicalData }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Card>
      <CardHeader>
        <CardTitle>Response Time Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="responseTime" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Throughput Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="throughput" stroke="#82ca9d" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">API Response</p>
            <p className="text-2xl font-bold">{metrics?.apiResponseTime || 0}ms</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Processing Time</p>
            <p className="text-2xl font-bold">{metrics?.processingTime || 0}s</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Throughput</p>
            <p className="text-2xl font-bold">{metrics?.throughput || 0}/min</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Queue Length</p>
            <p className="text-2xl font-bold">{metrics?.queueLength || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const ResourceMetrics: React.FC<{
  metrics?: any;
  historicalData: any[];
}> = ({ metrics, historicalData }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Card>
      <CardHeader>
        <CardTitle>Resource Utilization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU Usage
            </span>
            <span>{metrics?.cpuUsage || 0}%</span>
          </div>
          <Progress value={metrics?.cpuUsage || 0} className="h-2" />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <Memory className="h-4 w-4" />
              Memory Usage
            </span>
            <span>{metrics?.memoryUsage || 0}%</span>
          </div>
          <Progress value={metrics?.memoryUsage || 0} className="h-2" />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Disk Usage
            </span>
            <span>{metrics?.diskUsage || 0}%</span>
          </div>
          <Progress value={metrics?.diskUsage || 0} className="h-2" />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              DB Connections
            </span>
            <span>{metrics?.databaseConnections || 0}</span>
          </div>
          <Progress value={(metrics?.databaseConnections || 0) * 2} className="h-2" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Resource Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="cpuUsage" stroke="#8884d8" name="CPU" />
            <Line type="monotone" dataKey="memoryUsage" stroke="#82ca9d" name="Memory" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  </div>
);

const ErrorAnalysis: React.FC<{
  errorMetrics?: any;
  alerts: AlertType[];
}> = ({ errorMetrics, alerts }) => {
  const errorTypeData = errorMetrics?.types ? 
    Object.entries(errorMetrics.types).map(([type, count]) => ({ type, count })) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Error Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{errorMetrics?.rate || 0}%</p>
            <p className="text-sm text-muted-foreground">Current error rate</p>
            <p className="text-lg font-semibold mt-4">{errorMetrics?.count || 0}</p>
            <p className="text-sm text-muted-foreground">Total errors (24h)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Types</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={errorTypeData}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {errorTypeData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

const SLACompliance: React.FC<{
  report?: SLAReport | null;
}> = ({ report }) => {
  if (!report) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">SLA report not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>SLA Compliance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <p className="text-3xl font-bold">{report.overallCompliance.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">Overall Compliance</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(report.compliance).map(([metric, data]) => (
              <div key={metric} className="text-center p-3 rounded-lg border">
                <p className="font-medium capitalize">{metric.replace(/([A-Z])/g, ' $1')}</p>
                <p className={`text-lg font-bold ${data.compliant ? 'text-green-600' : 'text-red-600'}`}>
                  {data.actual.toFixed(metric === 'uptime' ? 2 : 0)}
                  {metric === 'uptime' ? '%' : metric.includes('Time') ? 'ms' : '%'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Target: {data.target.toFixed(0)}
                  {metric === 'uptime' ? '%' : metric.includes('Time') ? 'ms' : '%'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {report.violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent SLA Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.violations.slice(0, 5).map((violation, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{violation.metric}</p>
                    <p className="text-sm text-muted-foreground">
                      {violation.actual.toFixed(2)} vs {violation.target.toFixed(2)}
                    </p>
                  </div>
                  <Badge variant={getSeverityBadgeVariant(violation.severity)}>
                    {violation.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Mock data functions (replace with actual API calls)
const fetchSystemStatus = async (): Promise<SystemMetrics> => {
  // Mock implementation
  return {
    timestamp: new Date(),
    health: {
      overall: 'healthy',
      components: {
        database: { status: 'healthy', lastCheck: new Date(), responseTime: 150, errorCount: 0 },
        api: { status: 'healthy', lastCheck: new Date(), responseTime: 200, errorCount: 0 },
        processing: { status: 'degraded', lastCheck: new Date(), responseTime: 300, errorCount: 2 }
      }
    },
    performance: {
      apiResponseTime: 250,
      processingTime: 15,
      throughput: 45,
      queueLength: 3
    },
    resources: {
      cpuUsage: 65,
      memoryUsage: 78,
      databaseConnections: 25,
      diskUsage: 45
    },
    errors: {
      rate: 2.5,
      count: 15,
      types: {
        'processing_error': 8,
        'validation_error': 4,
        'network_error': 3
      }
    },
    usage: {
      activeUsers: 42,
      requestsPerMinute: 128,
      documentsProcessed: 1247
    }
  };
};

const fetchActiveAlerts = async (): Promise<AlertType[]> => {
  // Mock implementation
  return [
    {
      id: '1',
      type: 'performance_degradation',
      severity: 'warning',
      component: 'PDF Processing',
      message: 'Processing time exceeding normal thresholds',
      details: {},
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      notificationsSent: []
    }
  ];
};

const fetchSLAReport = async (): Promise<SLAReport> => {
  // Mock implementation
  return {
    period: '24 hours',
    compliance: {
      uptime: { target: 99.9, actual: 99.95, compliant: true },
      responseTime: { target: 2000, actual: 1850, compliant: true },
      errorRate: { target: 1, actual: 2.5, compliant: false },
      processingTime: { target: 30, actual: 25, compliant: true }
    },
    violations: [],
    overallCompliance: 92.5,
    recommendations: []
  };
};

const fetchHistoricalMetrics = async (): Promise<any[]> => {
  // Mock implementation
  const data = [];
  for (let i = 0; i < 24; i++) {
    data.push({
      timestamp: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toLocaleTimeString(),
      responseTime: 200 + Math.random() * 300,
      errorRate: Math.random() * 5,
      throughput: 40 + Math.random() * 20,
      cpuUsage: 60 + Math.random() * 20,
      memoryUsage: 70 + Math.random() * 15
    });
  }
  return data;
};

// Helper function to get icon for health status
const getHealthStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
    default: return <Activity className="h-5 w-5 text-gray-600" />;
  }
};

// Helper function to get severity badge variant
const getSeverityBadgeVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'error': return 'destructive';
    case 'warning': return 'secondary';
    case 'info': return 'outline';
    default: return 'default';
  }
};