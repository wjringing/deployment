import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  RefreshCw,
  Target,
  AlertTriangle
} from 'lucide-react';

export default function LaborSalesCalculatorPage() {
  const [snapshots, setSnapshots] = useState([]);
  const [targets, setTargets] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [currentSales, setCurrentSales] = useState('');
  const [shiftType, setShiftType] = useState('mid');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentSnapshot, setCurrentSnapshot] = useState(null);

  useEffect(() => {
    loadData();
    const interval = autoRefresh ? setInterval(loadData, 60000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [snapshotsRes, targetsRes, deploymentsRes] = await Promise.all([
        supabase
          .from('labor_sales_snapshots')
          .select('*')
          .eq('shift_date', today)
          .order('snapshot_time', { ascending: false })
          .limit(10),
        supabase.from('labor_sales_targets').select('*'),
        supabase
          .from('deployments')
          .select(`
            *,
            staff:staff_id (
              id,
              name,
              hourly_rate
            )
          `)
          .eq('date', today)
      ]);

      if (snapshotsRes.error) throw snapshotsRes.error;
      if (targetsRes.error) throw targetsRes.error;
      if (deploymentsRes.error) throw deploymentsRes.error;

      setSnapshots(snapshotsRes.data || []);
      setTargets(targetsRes.data || []);
      setDeployments(deploymentsRes.data || []);

      if (snapshotsRes.data && snapshotsRes.data.length > 0) {
        setCurrentSnapshot(snapshotsRes.data[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load calculator data');
    }
  };

  const calculateLaborHours = () => {
    const now = new Date();
    let totalHours = 0;

    deployments.forEach(deployment => {
      const startTime = new Date(`${deployment.date}T${deployment.start_time}`);
      const endTime = new Date(`${deployment.date}T${deployment.end_time}`);

      const effectiveStart = startTime < now ? startTime : now;
      const effectiveEnd = endTime < now ? endTime : now;

      if (effectiveEnd > effectiveStart) {
        const hours = (effectiveEnd - effectiveStart) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });

    return totalHours;
  };

  const getTargetForShift = () => {
    const dayOfWeek = new Date().getDay();
    const target = targets.find(
      t => t.shift_type === shiftType && t.day_of_week === dayOfWeek
    );
    return target || { target_labor_percentage: 18.0, min_labor_percentage: 15.0, max_labor_percentage: 22.0 };
  };

  const handleTakeSnapshot = async () => {
    if (!currentSales || parseFloat(currentSales) <= 0) {
      toast.error('Please enter current sales amount');
      return;
    }

    setLoading(true);
    try {
      const totalLaborHours = calculateLaborHours();
      const sales = parseFloat(currentSales);
      const target = getTargetForShift();

      const avgHourlyRate = deployments.length > 0
        ? deployments.reduce((sum, d) => sum + (d.staff?.hourly_rate || 12.0), 0) / deployments.length
        : 12.0;

      const laborCost = totalLaborHours * avgHourlyRate;
      const laborPercentage = sales > 0 ? (laborCost / sales) * 100 : 0;
      const variance = laborPercentage - target.target_labor_percentage;

      const snapshot = {
        shift_date: new Date().toISOString().split('T')[0],
        shift_type: shiftType,
        snapshot_time: new Date().toISOString(),
        total_labor_hours: totalLaborHours.toFixed(2),
        total_sales: sales.toFixed(2),
        labor_percentage: laborPercentage.toFixed(2),
        target_labor_percentage: target.target_labor_percentage,
        variance: variance.toFixed(2),
        staff_count: deployments.length
      };

      const { error } = await supabase
        .from('labor_sales_snapshots')
        .insert([snapshot]);

      if (error) throw error;

      toast.success('Snapshot taken successfully');
      loadData();
    } catch (error) {
      console.error('Error taking snapshot:', error);
      toast.error('Failed to take snapshot');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (variance) => {
    const target = getTargetForShift();
    const percentage = currentSnapshot?.labor_percentage || 0;

    if (percentage < target.min_labor_percentage) return 'text-red-600';
    if (percentage > target.max_labor_percentage) return 'text-red-600';
    if (Math.abs(variance) <= 1) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = (variance) => {
    if (variance < -1) return <TrendingDown className="h-5 w-5" />;
    if (variance > 1) return <TrendingUp className="h-5 w-5" />;
    return <Target className="h-5 w-5" />;
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const target = getTargetForShift();
  const totalLaborHours = calculateLaborHours();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Labor vs. Sales Calculator
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time labor cost tracking and optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Labor Hours</p>
              <p className="text-2xl font-bold">{totalLaborHours.toFixed(1)}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Staff Count</p>
              <p className="text-2xl font-bold">{deployments.length}</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Target Labor %</p>
              <p className="text-2xl font-bold">{target.target_labor_percentage}%</p>
            </div>
            <Target className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Labor %</p>
              <p className={`text-2xl font-bold ${currentSnapshot ? getStatusColor(currentSnapshot.variance) : ''}`}>
                {currentSnapshot ? `${currentSnapshot.labor_percentage}%` : '--'}
              </p>
            </div>
            {currentSnapshot && getStatusIcon(parseFloat(currentSnapshot.variance))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Take New Snapshot</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="shift-type">Shift Type</Label>
            <select
              id="shift-type"
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="opening">Opening</option>
              <option value="mid">Mid</option>
              <option value="closing">Closing</option>
            </select>
          </div>

          <div>
            <Label htmlFor="current-sales">Current Sales (£)</Label>
            <Input
              id="current-sales"
              type="number"
              step="0.01"
              value={currentSales}
              onChange={(e) => setCurrentSales(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleTakeSnapshot}
              disabled={loading}
              className="w-full"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {loading ? 'Taking Snapshot...' : 'Take Snapshot'}
            </Button>
          </div>
        </div>

        {currentSnapshot && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Labor Cost</p>
                <p className="font-bold">
                  £{(parseFloat(currentSnapshot.total_labor_hours) * 12).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Sales</p>
                <p className="font-bold">£{parseFloat(currentSnapshot.total_sales).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Variance</p>
                <p className={`font-bold ${getStatusColor(currentSnapshot.variance)}`}>
                  {parseFloat(currentSnapshot.variance) > 0 ? '+' : ''}
                  {currentSnapshot.variance}%
                </p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className={`font-bold ${getStatusColor(currentSnapshot.variance)}`}>
                  {Math.abs(parseFloat(currentSnapshot.variance)) <= 1
                    ? 'On Target'
                    : parseFloat(currentSnapshot.variance) > 0
                    ? 'Over Target'
                    : 'Under Target'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Snapshot History (Today)</h2>
        {snapshots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No snapshots taken today. Take your first snapshot above.
          </p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getStatusColor(snapshot.variance)}`}>
                      {getStatusIcon(parseFloat(snapshot.variance))}
                    </div>
                    <div>
                      <p className="font-bold">{formatTime(snapshot.snapshot_time)}</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {snapshot.shift_type} Shift
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-gray-600">Sales</p>
                      <p className="font-bold">£{parseFloat(snapshot.total_sales).toFixed(0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Labor Hours</p>
                      <p className="font-bold">{parseFloat(snapshot.total_labor_hours).toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Staff</p>
                      <p className="font-bold">{snapshot.staff_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Labor %</p>
                      <p className={`font-bold ${getStatusColor(snapshot.variance)}`}>
                        {parseFloat(snapshot.labor_percentage).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Variance</p>
                      <p className={`font-bold ${getStatusColor(snapshot.variance)}`}>
                        {parseFloat(snapshot.variance) > 0 ? '+' : ''}
                        {parseFloat(snapshot.variance).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Target Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-bold mb-2">Opening Shift</h3>
            <div className="space-y-1 text-sm">
              <p>Target: 18.0%</p>
              <p>Min: 15.0%</p>
              <p>Max: 22.0%</p>
            </div>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-bold mb-2">Mid Shift</h3>
            <div className="space-y-1 text-sm">
              <p>Target: 16.0%</p>
              <p>Min: 14.0%</p>
              <p>Max: 20.0%</p>
            </div>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-bold mb-2">Closing Shift</h3>
            <div className="space-y-1 text-sm">
              <p>Target: 19.0%</p>
              <p>Min: 16.0%</p>
              <p>Max: 23.0%</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}