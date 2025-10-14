import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, XCircle, Star, TrendingUp, Users, Target, Shield, AlertCircle } from 'lucide-react';
import {
  getAllTrainingStations,
  getAllStaffTrainingOverview,
  getStaffTrainingData,
  toggleStaffTraining,
  setPrimaryStation,
  addStaffRanking,
  getStaffRankings,
  addStaffSignOff,
  getStaffSignOffs,
  getStationCoverage
} from '../utils/trainingManager';
import { supabase } from '../lib/supabase';

export default function TrainingManagementPage() {
  const [stations, setStations] = useState([]);
  const [staffOverview, setStaffOverview] = useState([]);
  const [stationCoverage, setStationCoverage] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffTrainingData, setStaffTrainingData] = useState([]);
  const [staffRankings, setStaffRankings] = useState([]);
  const [staffSignOffs, setStaffSignOffs] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [rankingForm, setRankingForm] = useState({
    raterStaffId: '',
    stationName: '',
    rating: 5,
    notes: ''
  });

  const [signOffForm, setSignOffForm] = useState({
    managerStaffId: '',
    stationName: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      loadStaffDetails(selectedStaff.staff_id);
    }
  }, [selectedStaff]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setNeedsSetup(false);

    try {
      const [stationsRes, overviewRes, coverageRes, staffRes] = await Promise.all([
        getAllTrainingStations(),
        getAllStaffTrainingOverview(),
        getStationCoverage(),
        supabase.from('staff').select('*').order('name')
      ]);

      if (stationsRes.error && stationsRes.error.message.includes('relation') && stationsRes.error.message.includes('does not exist')) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }

      if (stationsRes.error) {
        throw stationsRes.error;
      }

      if (stationsRes.data) setStations(stationsRes.data);
      if (overviewRes.data) setStaffOverview(overviewRes.data);
      if (coverageRes.data) setStationCoverage(coverageRes.data);
      if (staffRes.data) setAllStaff(staffRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const loadStaffDetails = async (staffId) => {
    try {
      const [trainingRes, rankingsRes, signOffsRes] = await Promise.all([
        getStaffTrainingData(staffId),
        getStaffRankings(staffId),
        getStaffSignOffs(staffId)
      ]);

      if (trainingRes.data) setStaffTrainingData(trainingRes.data);
      if (rankingsRes.data) setStaffRankings(rankingsRes.data);
      if (signOffsRes.data) setStaffSignOffs(signOffsRes.data);
    } catch (error) {
      console.error('Error loading staff details:', error);
    }
  };

  const handleToggleTraining = async (stationName, currentStatus) => {
    if (!selectedStaff) return;

    const result = await toggleStaffTraining(
      selectedStaff.staff_id,
      stationName,
      !currentStatus,
      'Team Member'
    );

    if (result.data) {
      await loadStaffDetails(selectedStaff.staff_id);
      await loadData();
    }
  };

  const handleSetPrimaryStation = async (stationName) => {
    if (!selectedStaff) return;

    const result = await setPrimaryStation(selectedStaff.staff_id, stationName);

    if (result.data) {
      await loadStaffDetails(selectedStaff.staff_id);
    }
  };

  const handleSubmitRanking = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const result = await addStaffRanking(
      selectedStaff.staff_id,
      rankingForm.raterStaffId,
      rankingForm.stationName,
      rankingForm.rating,
      rankingForm.notes
    );

    if (result.data) {
      setRankingForm({
        raterStaffId: '',
        stationName: '',
        rating: 5,
        notes: ''
      });
      await loadStaffDetails(selectedStaff.staff_id);
      await loadData();
    }
  };

  const handleSubmitSignOff = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const result = await addStaffSignOff(
      selectedStaff.staff_id,
      signOffForm.managerStaffId,
      signOffForm.stationName,
      signOffForm.notes
    );

    if (result.data) {
      setSignOffForm({
        managerStaffId: '',
        stationName: '',
        notes: ''
      });
      await loadStaffDetails(selectedStaff.staff_id);
      await loadData();
    }
  };

  const getStationRating = (stationName) => {
    const stationRankings = staffRankings.filter(r => r.station_name === stationName);
    if (stationRankings.length === 0) return null;
    const avg = stationRankings.reduce((sum, r) => sum + r.rating, 0) / stationRankings.length;
    return avg.toFixed(1);
  };

  const hasSignOff = (stationName) => {
    return staffSignOffs.some(s => s.station_name === stationName);
  };

  const groupedStations = stations.reduce((acc, station) => {
    if (!acc[station.station_category]) {
      acc[station.station_category] = [];
    }
    acc[station.station_category].push(station);
    return acc;
  }, {});

  if (needsSetup) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-12 h-12 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Training System Setup Required</h2>
              <p className="text-gray-700 mb-6">
                The Training & Ranking system tables haven't been created yet. You need to apply the database migration to enable this feature.
              </p>

              <div className="bg-white rounded-lg p-6 mb-6 border border-yellow-200">
                <h3 className="font-semibold text-gray-900 mb-3">Setup Instructions:</h3>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="font-semibold text-red-600">1.</span>
                    <span>Log into your Supabase Dashboard</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-red-600">2.</span>
                    <span>Navigate to: SQL Editor</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-red-600">3.</span>
                    <span>Open the migration file: <code className="bg-gray-100 px-2 py-1 rounded">supabase/migrations/20251013000000_add_training_ranking_system.sql</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-red-600">4.</span>
                    <span>Copy the entire file contents and paste into SQL Editor</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-red-600">5.</span>
                    <span>Click "Run" to execute the migration</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-red-600">6.</span>
                    <span>Refresh this page</span>
                  </li>
                </ol>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">What gets created:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 19 KFC training stations (BOH, FOH, MOH)</li>
                  <li>• Staff training tracking tables</li>
                  <li>• Performance ranking system (1-10 scale)</li>
                  <li>• Manager sign-off functionality</li>
                  <li>• Helper views and functions</li>
                </ul>
              </div>

              <button
                onClick={() => loadData()}
                className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Check Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-8">
          <div className="flex items-start gap-4">
            <XCircle className="w-12 h-12 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Training Data</h2>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={() => loadData()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Training & Ranking System</h1>
        <p className="text-gray-600">Manage staff training, performance ratings, and station qualifications</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="inline-block w-4 h-4 mr-2" />
          Staff Overview
        </button>
        <button
          onClick={() => setActiveTab('stations')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'stations'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Target className="inline-block w-4 h-4 mr-2" />
          Station Coverage
        </button>
        {selectedStaff && (
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'details'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Award className="inline-block w-4 h-4 mr-2" />
            {selectedStaff.staff_name}
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Staff Training Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Primary Station
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stations Trained
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Rating
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sign-Offs
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staffOverview.map((staff) => (
                  <tr key={staff.staff_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{staff.staff_name}</div>
                        {staff.is_under_18 && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                            Under 18
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {staff.primary_station || 'Not set'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {staff.stations_trained}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">
                          {staff.avg_rating > 0 ? staff.avg_rating : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {staff.total_sign_offs}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedStaff(staff);
                          setActiveTab('details');
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stations' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Station Coverage</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Station
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trained Staff
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Rating
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sign-Offs
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stationCoverage.map((station) => (
                  <tr key={station.station_name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{station.display_name}</div>
                      <div className="text-xs text-gray-500">{station.station_name}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        station.station_category === 'BOH' ? 'bg-purple-100 text-purple-800' :
                        station.station_category === 'FOH' ? 'bg-blue-100 text-blue-800' :
                        station.station_category === 'MOH' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {station.station_category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        station.trained_staff_count === 0 ? 'bg-red-100 text-red-800' :
                        station.trained_staff_count < 3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {station.trained_staff_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">
                          {station.avg_station_rating > 0 ? station.avg_station_rating : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {station.signed_off_staff_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'details' && selectedStaff && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Training Status for {selectedStaff.staff_name}</h2>
            <p className="text-sm text-gray-600 mb-6">
              Click stations to toggle training status. Set primary station for optimal deployment suggestions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
