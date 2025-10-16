import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, CheckCircle, Clock, AlertCircle, TrendingUp, Users, Target, BookOpen, Award, Calendar, Filter, Download, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TrainingDevelopmentPage() {
  const [activeTab, setActiveTab] = useState('plans');
  const [staff, setStaff] = useState([]);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [mandatoryTraining, setMandatoryTraining] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showMandatoryModal, setShowMandatoryModal] = useState(false);

  const [newPlan, setNewPlan] = useState({
    staff_id: '',
    plan_name: '',
    plan_type: 'Cross-Training',
    priority: 'Medium',
    start_date: '',
    target_completion_date: '',
    description: ''
  });

  const [newOpportunity, setNewOpportunity] = useState({
    staff_id: '',
    recommended_station: '',
    opportunity_type: 'Skill Gap',
    priority: 'Medium',
    business_justification: ''
  });

  const [newMandatory, setNewMandatory] = useState({
    staff_id: '',
    training_name: '',
    training_category: 'Safety',
    due_date: '',
    is_recurring: false,
    recurrence_months: 12
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [staffRes, plansRes, opportunitiesRes, mandatoryRes] = await Promise.all([
        supabase.from('staff').select('*').order('name'),
        supabase.from('training_plans').select(`
          *,
          staff:staff_id (id, name),
          created_by_staff:created_by (name),
          items:training_plan_items (
            id,
            status,
            is_mandatory,
            completion_date
          )
        `).order('created_at', { ascending: false }),
        supabase.from('cross_training_opportunities').select(`
          *,
          staff:staff_id (id, name),
          identified_by_staff:identified_by (name)
        `).order('priority'),
        supabase.from('mandatory_training_assignments').select(`
          *,
          staff:staff_id (id, name),
          assigned_by_staff:assigned_by (name)
        `).order('due_date')
      ]);

      if (staffRes.data) setStaff(staffRes.data);
      if (plansRes.data) setTrainingPlans(plansRes.data);
      if (opportunitiesRes.data) setOpportunities(opportunitiesRes.data);
      if (mandatoryRes.data) setMandatoryTraining(mandatoryRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createTrainingPlan() {
    try {
      const { error } = await supabase
        .from('training_plans')
        .insert({
          ...newPlan,
          status: 'Active',
          created_by: staff[0]?.id
        });

      if (error) throw error;

      setShowPlanModal(false);
      setNewPlan({
        staff_id: '',
        plan_name: '',
        plan_type: 'Cross-Training',
        priority: 'Medium',
        start_date: '',
        target_completion_date: '',
        description: ''
      });
      await loadData();
    } catch (error) {
      console.error('Error creating training plan:', error);
      alert('Error creating training plan: ' + error.message);
    }
  }

  async function createOpportunity() {
    try {
      const { error } = await supabase
        .from('cross_training_opportunities')
        .insert({
          ...newOpportunity,
          identified_by: staff[0]?.id,
          status: 'Identified'
        });

      if (error) throw error;

      setShowOpportunityModal(false);
      setNewOpportunity({
        staff_id: '',
        recommended_station: '',
        opportunity_type: 'Skill Gap',
        priority: 'Medium',
        business_justification: ''
      });
      await loadData();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      alert('Error creating opportunity: ' + error.message);
    }
  }

  async function createMandatoryTraining() {
    try {
      const { error } = await supabase
        .from('mandatory_training_assignments')
        .insert({
          ...newMandatory,
          assigned_by: staff[0]?.id,
          status: 'Assigned'
        });

      if (error) throw error;

      setShowMandatoryModal(false);
      setNewMandatory({
        staff_id: '',
        training_name: '',
        training_category: 'Safety',
        due_date: '',
        is_recurring: false,
        recurrence_months: 12
      });
      await loadData();
    } catch (error) {
      console.error('Error creating mandatory training:', error);
      alert('Error creating mandatory training: ' + error.message);
    }
  }

  async function updateOpportunityStatus(id, newStatus) {
    try {
      const { error } = await supabase
        .from('cross_training_opportunities')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating opportunity:', error);
    }
  }

  async function updateMandatoryStatus(id, newStatus) {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'Completed') {
        updates.completion_date = new Date().toISOString().split('T')[0];
        updates.completion_verification_by = staff[0]?.id;
      }

      const { error } = await supabase
        .from('mandatory_training_assignments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating mandatory training:', error);
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Medium': return 'bg-blue-100 text-blue-700';
      case 'Low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Active': case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Overdue': return 'bg-red-100 text-red-700';
      case 'Draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const calculatePlanProgress = (plan) => {
    if (!plan.items || plan.items.length === 0) return 0;
    const completed = plan.items.filter(item => item.status === 'Completed').length;
    return Math.round((completed / plan.items.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-gray-900">Training & Development</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('plans')}
            className={`${
              activeTab === 'plans'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Target className="w-4 h-4" />
            Training Plans
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`${
              activeTab === 'opportunities'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <TrendingUp className="w-4 h-4" />
            Cross-Training Opportunities
          </button>
          <button
            onClick={() => setActiveTab('mandatory')}
            className={`${
              activeTab === 'mandatory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <AlertCircle className="w-4 h-4" />
            Mandatory Training
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Award className="w-4 h-4" />
            Dashboard
          </button>
        </nav>
      </div>

      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">Training Plans</h3>
            <button
              onClick={() => setShowPlanModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Plan
            </button>
          </div>

          <div className="grid gap-4">
            {trainingPlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{plan.plan_name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(plan.status)}`}>
                        {plan.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(plan.priority)}`}>
                        {plan.priority}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {plan.plan_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {plan.staff?.name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {plan.start_date} → {plan.target_completion_date}
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {plan.items?.length || 0} items
                      </div>
                    </div>
                    {plan.items && plan.items.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Progress</span>
                          <span className="text-sm font-medium text-gray-900">{calculatePlanProgress(plan)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${calculatePlanProgress(plan)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {trainingPlans.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border">
                <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No training plans created yet.</p>
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">Cross-Training Opportunities</h3>
            <button
              onClick={() => setShowOpportunityModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Opportunity
            </button>
          </div>

          <div className="grid gap-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{opp.recommended_station}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(opp.status)}`}>
                        {opp.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(opp.priority)}`}>
                        {opp.priority}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {opp.opportunity_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{opp.business_justification}</p>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {opp.staff?.name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Identified: {opp.identified_date}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {opp.status === 'Identified' && (
                      <button
                        onClick={() => updateOpportunityStatus(opp.id, 'Approved')}
                        className="text-green-600 hover:text-green-700 p-2"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    {opp.status === 'Approved' && (
                      <button
                        onClick={() => updateOpportunityStatus(opp.id, 'In Plan')}
                        className="text-blue-600 hover:text-blue-700 p-2"
                        title="Add to Plan"
                      >
                        <Target className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {opportunities.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No cross-training opportunities identified yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'mandatory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">Mandatory Training</h3>
            <button
              onClick={() => setShowMandatoryModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Assign Training
            </button>
          </div>

          <div className="grid gap-4">
            {mandatoryTraining.map((training) => (
              <div key={training.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{training.training_name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(training.status)}`}>
                        {training.status}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {training.training_category}
                      </span>
                      {training.is_recurring && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {training.staff?.name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Due: {training.due_date}
                      </div>
                      {training.completion_date && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Completed: {training.completion_date}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {training.status !== 'Completed' && (
                      <button
                        onClick={() => updateMandatoryStatus(training.id, 'Completed')}
                        className="text-green-600 hover:text-green-700 p-2"
                        title="Mark Complete"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {mandatoryTraining.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No mandatory training assigned yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">Training Overview Dashboard</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 text-blue-600" />
                <span className="text-3xl font-bold text-gray-900">{trainingPlans.length}</span>
              </div>
              <p className="text-sm text-gray-600">Total Training Plans</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <span className="text-3xl font-bold text-gray-900">{opportunities.length}</span>
              </div>
              <p className="text-sm text-gray-600">Cross-Training Opportunities</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-orange-600" />
                <span className="text-3xl font-bold text-gray-900">
                  {mandatoryTraining.filter(t => t.status === 'Overdue').length}
                </span>
              </div>
              <p className="text-sm text-gray-600">Overdue Training</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <span className="text-3xl font-bold text-gray-900">
                  {trainingPlans.filter(p => p.status === 'Completed').length}
                </span>
              </div>
              <p className="text-sm text-gray-600">Completed Plans</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Staff Training Summary</h4>
            <div className="space-y-3">
              {staff.map((member) => {
                const memberPlans = trainingPlans.filter(p => p.staff_id === member.id);
                const memberOpps = opportunities.filter(o => o.staff_id === member.id);
                const memberMandatory = mandatoryTraining.filter(t => t.staff_id === member.id);

                return (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{member.name}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-600">
                        <strong>{memberPlans.length}</strong> plans
                      </span>
                      <span className="text-gray-600">
                        <strong>{memberOpps.length}</strong> opportunities
                      </span>
                      <span className="text-gray-600">
                        <strong>{memberMandatory.filter(t => t.status !== 'Completed').length}</strong> pending
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create Training Plan</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                  <select
                    value={newPlan.staff_id}
                    onChange={(e) => setNewPlan({ ...newPlan, staff_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Staff</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={newPlan.plan_name}
                    onChange={(e) => setNewPlan({ ...newPlan, plan_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Q1 Leadership Development"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                    <select
                      value={newPlan.plan_type}
                      onChange={(e) => setNewPlan({ ...newPlan, plan_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Career Development">Career Development</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Cross-Training">Cross-Training</option>
                      <option value="Upskilling">Upskilling</option>
                      <option value="Onboarding">Onboarding</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newPlan.priority}
                      onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newPlan.start_date}
                      onChange={(e) => setNewPlan({ ...newPlan, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Completion</label>
                    <input
                      type="date"
                      value={newPlan.target_completion_date}
                      onChange={(e) => setNewPlan({ ...newPlan, target_completion_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Describe the training plan goals and objectives..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createTrainingPlan}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Create Plan
                </button>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Add Cross-Training Opportunity</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                  <select
                    value={newOpportunity.staff_id}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, staff_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Staff</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recommended Station</label>
                  <input
                    type="text"
                    value={newOpportunity.recommended_station}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, recommended_station: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., BOH Cook"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Type</label>
                    <select
                      value={newOpportunity.opportunity_type}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, opportunity_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Skill Gap">Skill Gap</option>
                      <option value="Coverage Need">Coverage Need</option>
                      <option value="Career Path">Career Path</option>
                      <option value="Succession Planning">Succession Planning</option>
                      <option value="Business Growth">Business Growth</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newOpportunity.priority}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Justification</label>
                  <textarea
                    value={newOpportunity.business_justification}
                    onChange={(e) => setNewOpportunity({ ...newOpportunity, business_justification: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Explain why this cross-training is needed..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createOpportunity}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Add Opportunity
                </button>
                <button
                  onClick={() => setShowOpportunityModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMandatoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Mandatory Training</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                  <select
                    value={newMandatory.staff_id}
                    onChange={(e) => setNewMandatory({ ...newMandatory, staff_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Staff</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Training Name</label>
                  <input
                    type="text"
                    value={newMandatory.training_name}
                    onChange={(e) => setNewMandatory({ ...newMandatory, training_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Food Safety Certification"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newMandatory.training_category}
                      onChange={(e) => setNewMandatory({ ...newMandatory, training_category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Safety">Safety</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Operations">Operations</option>
                      <option value="Customer Service">Customer Service</option>
                      <option value="Food Safety">Food Safety</option>
                      <option value="HR Policy">HR Policy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newMandatory.due_date}
                      onChange={(e) => setNewMandatory({ ...newMandatory, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newMandatory.is_recurring}
                      onChange={(e) => setNewMandatory({ ...newMandatory, is_recurring: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Recurring training</span>
                  </label>
                  {newMandatory.is_recurring && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence (months)</label>
                      <input
                        type="number"
                        value={newMandatory.recurrence_months}
                        onChange={(e) => setNewMandatory({ ...newMandatory, recurrence_months: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createMandatoryTraining}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Assign Training
                </button>
                <button
                  onClick={() => setShowMandatoryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
