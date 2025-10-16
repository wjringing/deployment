import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from '../lib/toast';
import {
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  Target,
  BarChart3,
  Calendar,
  Save,
  Eye,
  Edit,
  Trash2,
  Settings
} from 'lucide-react';

export default function PerformanceScorecardPage() {
  const [scorecards, setScorecards] = useState([]);
  const [selectedScorecard, setSelectedScorecard] = useState(null);
  const [mode, setMode] = useState('view');
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState([]);
  const [showKpiEditor, setShowKpiEditor] = useState(false);

  const [formData, setFormData] = useState({
    shift_date: new Date().toISOString().split('T')[0],
    shift_type: 'mid',
    sales_target: '',
    actual_sales: '',
    sales_score: 0,
    labor_efficiency_score: 0,
    speed_of_service_score: 0,
    quality_score: 0,
    checklist_completion_score: 0,
    overall_score: 0,
    shift_manager: '',
    notes: ''
  });

  useEffect(() => {
    loadScorecards();
    loadKpis();
  }, []);

  useEffect(() => {
    calculateOverallScore();
  }, [
    formData.sales_score,
    formData.labor_efficiency_score,
    formData.speed_of_service_score,
    formData.quality_score,
    formData.checklist_completion_score
  ]);

  const loadScorecards = async () => {
    try {
      const { data, error } = await supabase
        .from('shift_performance_scorecards')
        .select('*')
        .order('shift_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setScorecards(data || []);
    } catch (error) {
      console.error('Error loading scorecards:', error);
      toast.error('Failed to load performance scorecards');
    }
  };

  const loadKpis = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_kpis')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setKpis(data || []);
    } catch (error) {
      console.error('Error loading KPIs:', error);
      toast.error('Failed to load KPIs');
    }
  };

  const handleUpdateKpi = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('performance_kpis')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('KPI updated successfully');
      loadKpis();
    } catch (error) {
      console.error('Error updating KPI:', error);
      toast.error('Failed to update KPI');
    }
  };

  const calculateOverallScore = () => {
    const scores = [
      parseFloat(formData.sales_score) || 0,
      parseFloat(formData.labor_efficiency_score) || 0,
      parseFloat(formData.speed_of_service_score) || 0,
      parseFloat(formData.quality_score) || 0,
      parseFloat(formData.checklist_completion_score) || 0
    ];

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    setFormData(prev => ({ ...prev, overall_score: Math.round(average) }));
  };

  const calculateSalesScore = () => {
    const target = parseFloat(formData.sales_target) || 0;
    const actual = parseFloat(formData.actual_sales) || 0;

    if (target === 0) return 0;

    const percentage = (actual / target) * 100;

    if (percentage >= 100) return 100;
    if (percentage >= 95) return 90;
    if (percentage >= 90) return 80;
    if (percentage >= 85) return 70;
    if (percentage >= 80) return 60;
    return Math.max(0, Math.round(percentage * 0.5));
  };

  const handleAutoCalculateSales = () => {
    const score = calculateSalesScore();
    setFormData(prev => ({ ...prev, sales_score: score }));
    toast.success(`Sales score calculated: ${score}%`);
  };

  const handleSave = async () => {
    if (!formData.shift_date || !formData.shift_manager) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const scorecardData = {
        ...formData,
        sales_target: parseFloat(formData.sales_target) || 0,
        actual_sales: parseFloat(formData.actual_sales) || 0
      };

      if (selectedScorecard) {
        const { error } = await supabase
          .from('shift_performance_scorecards')
          .update(scorecardData)
          .eq('id', selectedScorecard.id);

        if (error) throw error;
        toast.success('Scorecard updated successfully');
      } else {
        const { error } = await supabase
          .from('shift_performance_scorecards')
          .insert([scorecardData]);

        if (error) throw error;
        toast.success('Scorecard created successfully');
      }

      loadScorecards();
      handleCancelEdit();
    } catch (error) {
      console.error('Error saving scorecard:', error);
      toast.error('Failed to save scorecard');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (scorecard) => {
    setSelectedScorecard(scorecard);
    setFormData({
      shift_date: scorecard.shift_date,
      shift_type: scorecard.shift_type,
      sales_target: scorecard.sales_target,
      actual_sales: scorecard.actual_sales,
      sales_score: scorecard.sales_score,
      labor_efficiency_score: scorecard.labor_efficiency_score,
      speed_of_service_score: scorecard.speed_of_service_score,
      quality_score: scorecard.quality_score,
      checklist_completion_score: scorecard.checklist_completion_score,
      overall_score: scorecard.overall_score,
      shift_manager: scorecard.shift_manager,
      notes: scorecard.notes
    });
    setMode('edit');
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this scorecard?')) return;

    try {
      const { error } = await supabase
        .from('shift_performance_scorecards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Scorecard deleted successfully');
      loadScorecards();
    } catch (error) {
      console.error('Error deleting scorecard:', error);
      toast.error('Failed to delete scorecard');
    }
  };

  const handleCancelEdit = () => {
    setSelectedScorecard(null);
    setFormData({
      shift_date: new Date().toISOString().split('T')[0],
      shift_type: 'mid',
      sales_target: '',
      actual_sales: '',
      sales_score: 0,
      labor_efficiency_score: 0,
      speed_of_service_score: 0,
      quality_score: 0,
      checklist_completion_score: 0,
      overall_score: 0,
      shift_manager: '',
      notes: ''
    });
    setMode('view');
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-blue-600 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const ScoreInput = ({ label, icon: Icon, value, onChange, name }) => (
    <div>
      <Label className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Label>
      <Input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange({ target: { name, value: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) } })}
        placeholder="0-100"
      />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8" />
            Shift Performance Scorecard
          </h1>
          <p className="text-gray-600 mt-1">
            Track and evaluate shift performance across key metrics
          </p>
        </div>
        {mode === 'view' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowKpiEditor(!showKpiEditor)}>
              <Settings className="h-4 w-4 mr-2" />
              {showKpiEditor ? 'Hide' : 'Configure'} KPIs
            </Button>
            <Button onClick={() => setMode('create')}>
              <Star className="h-4 w-4 mr-2" />
              Create Scorecard
            </Button>
          </div>
        )}
      </div>

      {showKpiEditor && mode === 'view' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure KPI Weights
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Adjust the weight (importance) of each KPI. Total should equal 100%.
          </p>

          <div className="space-y-4">
            {kpis.map((kpi) => (
              <div key={kpi.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{kpi.kpi_name}</div>
                  <div className="text-sm text-gray-600">{kpi.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={kpi.weight}
                    onChange={(e) => {
                      const newWeight = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                      handleUpdateKpi(kpi.id, { weight: newWeight });
                    }}
                    className="w-20"
                  />
                  <span className="text-sm font-medium text-gray-700">%</span>
                </div>
              </div>
            ))}

            {kpis.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <span className="font-semibold text-gray-900">Total Weight:</span>
                <span className={`text-lg font-bold ${
                  kpis.reduce((sum, kpi) => sum + parseFloat(kpi.weight), 0) === 100
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {kpis.reduce((sum, kpi) => sum + parseFloat(kpi.weight), 0).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {mode !== 'view' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {selectedScorecard ? 'Edit Scorecard' : 'Create New Scorecard'}
          </h2>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Shift Date</Label>
                <Input
                  type="date"
                  value={formData.shift_date}
                  onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Shift Type</Label>
                <select
                  value={formData.shift_type}
                  onChange={(e) => setFormData({ ...formData, shift_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="opening">Opening</option>
                  <option value="mid">Mid</option>
                  <option value="closing">Closing</option>
                </select>
              </div>

              <div>
                <Label>Shift Manager</Label>
                <Input
                  value={formData.shift_manager}
                  onChange={(e) => setFormData({ ...formData, shift_manager: e.target.value })}
                  placeholder="Manager name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Sales Target (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sales_target}
                  onChange={(e) => setFormData({ ...formData, sales_target: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Actual Sales (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.actual_sales}
                  onChange={(e) => setFormData({ ...formData, actual_sales: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleAutoCalculateSales} variant="outline" className="w-full">
                  <Target className="h-4 w-4 mr-2" />
                  Auto-Calculate Sales Score
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-bold mb-4">Performance Scores (0-100)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ScoreInput
                  label="Sales Performance"
                  icon={TrendingUp}
                  value={formData.sales_score}
                  onChange={(e) => setFormData({ ...formData, sales_score: e.target.value })}
                  name="sales_score"
                />
                <ScoreInput
                  label="Labor Efficiency"
                  icon={Clock}
                  value={formData.labor_efficiency_score}
                  onChange={(e) => setFormData({ ...formData, labor_efficiency_score: e.target.value })}
                  name="labor_efficiency_score"
                />
                <ScoreInput
                  label="Speed of Service"
                  icon={Target}
                  value={formData.speed_of_service_score}
                  onChange={(e) => setFormData({ ...formData, speed_of_service_score: e.target.value })}
                  name="speed_of_service_score"
                />
                <ScoreInput
                  label="Quality Score"
                  icon={Star}
                  value={formData.quality_score}
                  onChange={(e) => setFormData({ ...formData, quality_score: e.target.value })}
                  name="quality_score"
                />
                <ScoreInput
                  label="Checklist Completion"
                  icon={CheckCircle}
                  value={formData.checklist_completion_score}
                  onChange={(e) => setFormData({ ...formData, checklist_completion_score: e.target.value })}
                  name="checklist_completion_score"
                />
                <div className="flex items-end">
                  <div className="w-full p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Overall Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(formData.overall_score)}`}>
                      {formData.overall_score}
                    </p>
                    <p className="text-sm mt-1">{getScoreBadge(formData.overall_score)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Performance Notes</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                placeholder="Add notes about shift performance..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Scorecard'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {mode === 'view' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Performance History</h2>

          {scorecards.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No scorecards created yet</p>
              <Button onClick={() => setMode('create')} className="mt-4">
                Create Your First Scorecard
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {scorecards.map((scorecard) => (
                <div
                  key={scorecard.id}
                  className="p-6 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-5 w-5 text-gray-600" />
                        <h3 className="font-bold text-lg">
                          {new Date(scorecard.shift_date).toLocaleDateString('en-GB')} - {scorecard.shift_type.charAt(0).toUpperCase() + scorecard.shift_type.slice(1)} Shift
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">Manager: {scorecard.shift_manager}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-4 py-2 rounded-lg ${getScoreColor(scorecard.overall_score)}`}>
                        <p className="text-3xl font-bold">{scorecard.overall_score}</p>
                        <p className="text-xs">{getScoreBadge(scorecard.overall_score)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(scorecard)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(scorecard.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600 mb-1">Sales</p>
                      <p className="font-bold">{scorecard.sales_score}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600 mb-1">Labor</p>
                      <p className="font-bold">{scorecard.labor_efficiency_score}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600 mb-1">Speed</p>
                      <p className="font-bold">{scorecard.speed_of_service_score}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600 mb-1">Quality</p>
                      <p className="font-bold">{scorecard.quality_score}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600 mb-1">Checklist</p>
                      <p className="font-bold">{scorecard.checklist_completion_score}</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="text-gray-600">
                      Sales: £{parseFloat(scorecard.actual_sales).toFixed(2)} / £{parseFloat(scorecard.sales_target).toFixed(2)}
                      {' '}({((scorecard.actual_sales / scorecard.sales_target) * 100).toFixed(1)}%)
                    </p>
                    {scorecard.notes && (
                      <p className="text-gray-700 mt-2 p-3 bg-gray-50 rounded">
                        {scorecard.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}