
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Activity, Zap, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface GenerationsData {
  timestamp: string;
  user_tier: string;
  count: number;
}

interface ModelsUsageData {
  model: string;
  requests: number;
  failures: number;
  success_rate: number;
  avg_duration: number;
}

const Index = () => {
  const [selectedTier, setSelectedTier] = useState<string>("all");

  // Fetch time series data
  const { data: generationsData, isLoading: isLoadingGenerations, error: generationsError } = useQuery({
    queryKey: ['generations', selectedTier],
    queryFn: async () => {
      console.log('Fetching generations data for tier:', selectedTier);
      const response = await fetch(
        `https://api.eu-central-1.aws.tinybird.co/v0/pipes/gens_by_time_and_tier.json?token=${import.meta.env.VITE_TINYBIRD_TOKEN}&user_tier=${selectedTier}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch generations data');
      }
      const result = await response.json();
      console.log('Generations data received:', result);
      return result.data as GenerationsData[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch models usage data
  const { data: modelsData, isLoading: isLoadingModels, error: modelsError } = useQuery({
    queryKey: ['models-usage'],
    queryFn: async () => {
      console.log('Fetching models usage data');
      const response = await fetch(
        `https://api.eu-central-1.aws.tinybird.co/v0/pipes/models_usage.json?token=${import.meta.env.VITE_TINYBIRD_TOKEN}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch models usage data');
      }
      const result = await response.json();
      console.log('Models usage data received:', result);
      return result.data as ModelsUsageData[];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  useEffect(() => {
    if (generationsError) {
      console.error('Generations data error:', generationsError);
      toast.error("Failed to load generations data");
    }
    if (modelsError) {
      console.error('Models usage data error:', modelsError);
      toast.error("Failed to load models usage data");
    }
  }, [generationsError, modelsError]);

  // Calculate totals from models data
  const totalRequests = modelsData?.reduce((sum, model) => sum + model.requests, 0) || 0;
  const totalFailures = modelsData?.reduce((sum, model) => sum + model.failures, 0) || 0;
  const overallSuccessRate = totalRequests > 0 ? ((totalRequests - totalFailures) / totalRequests) * 100 : 0;
  const avgDuration = modelsData?.reduce((sum, model) => sum + model.avg_duration, 0) / (modelsData?.length || 1) || 0;

  // Prepare time series data for chart
  const timeSeriesData = generationsData?.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    count: item.count,
    tier: item.user_tier
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            OpenTelemetry Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Monitor your system performance and model usage in real-time
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingModels ? <Skeleton className="h-8 w-16 bg-blue-400" /> : totalRequests.toLocaleString()}
              </div>
              <p className="text-xs text-blue-100">
                Across all models
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingModels ? <Skeleton className="h-8 w-16 bg-green-400" /> : `${overallSuccessRate.toFixed(1)}%`}
              </div>
              <p className="text-xs text-green-100">
                Overall performance
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Zap className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingModels ? <Skeleton className="h-8 w-16 bg-purple-400" /> : `${avgDuration.toFixed(0)}ms`}
              </div>
              <p className="text-xs text-purple-100">
                Response time
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Failures</CardTitle>
              <AlertCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingModels ? <Skeleton className="h-8 w-16 bg-red-400" /> : totalFailures.toLocaleString()}
              </div>
              <p className="text-xs text-red-100">
                Error count
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Series Chart */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-800">
                  Code Generations Over Time
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Real-time monitoring of generation requests by user tier
                </CardDescription>
              </div>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue placeholder="Select user tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoadingGenerations ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Models Usage Chart */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Model Usage Statistics</CardTitle>
            <CardDescription className="text-gray-600">
              Request volume and performance metrics by model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoadingModels ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis 
                      dataKey="model" 
                      stroke="#64748b"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name) => {
                        if (name === 'success_rate') return [`${value}%`, 'Success Rate'];
                        if (name === 'avg_duration') return [`${value}ms`, 'Avg Duration'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="requests" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Models Detail Table */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Detailed Model Metrics</CardTitle>
            <CardDescription className="text-gray-600">
              Complete breakdown of model performance and reliability
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingModels ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Model</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Requests</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Failures</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Success Rate</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelsData?.map((model, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-800">{model.model}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{model.requests.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-red-600">{model.failures.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${model.success_rate >= 95 ? 'text-green-600' : model.success_rate >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {model.success_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">{model.avg_duration.toFixed(0)}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
