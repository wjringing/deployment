import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import Papa from 'papaparse';
import {
  Upload, Download, RefreshCw, Shield, Star, LogOut, User, Filter
} from 'lucide-react';

const STATIONS = [
  { name: 'BOH Cook', category: 'BOH' },
  { name: 'FOH Cashier', category: 'FOH' },
  { name: 'FOH Guest Host', category: 'FOH' },
  { name: 'FOH Pack', category: 'FOH' },
  { name: 'FOH Present', category: 'FOH' },
  { name: 'MOH Burgers', category: 'MOH' },
  { name: 'MOH Chicken Pack', category: 'MOH' },
  { name: 'Freezer to Fryer', category: 'MOH' },
  { name: 'MOH Sides', category: 'MOH' },
];

function getRelevantStations(jobCode) {
  if (jobCode === 'FOH TM') return STATIONS.filter(s => s.category === 'FOH');
  if (jobCode === 'MOH TM') return STATIONS.filter(s => s.category === 'MOH');
  if (jobCode === 'BOH TM') return STATIONS.filter(s => s.category === 'BOH');
  return STATIONS;
}

export default function Training({ embedded = false }) {
  const [staff, setStaff] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [signOffs, setSignOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showRelevantOnly, setShowRelevantOnly] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [rankingStaff, setRankingStaff] = useState(null);
  const [rankingStation, setRankingStation] = useState(null);
  const [rating, setRating] = useState(3);
  const [signOffStation, setSignOffStation] = useState(null);

  useEffect(() => {
    loadData();
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, trainingsRes, rankingsRes, signOffsRes] = await Promise.all([
        supabase.from('staff').select('*').order('name'),
        supabase.from('staff_training_stations').select('*'),
        supabase.from('staff_rankings').select('*'),
        supabase.from('staff_sign_offs').select('*')
      ]);

      if (staffRes.error) throw staffRes.error;
      setStaff(staffRes.data || []);
      setTrainings(trainingsRes.data || []);
      setRankings(rankingsRes.data || []);
      setSignOffs(signOffsRes.data || []);
    } catch (error) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const data = results.data.filter(row => row['Employee Name'] && row['Gem ID']);

          for (const row of data) {
            const { data: existing } = await supabase
              .from('staff')
              .select('id')
              .eq('gem_id', row['Gem ID'])
              .maybeSingle();

            let staffId;
            if (existing) {
              staffId = existing.id;
            } else {
              const { data: newStaff, error } = await supabase
                .from('staff')
                .insert({
                  gem_id: row['Gem ID'],
                  name: row['Employee Name'],
                  position: row['Job Code'] || 'Team Member'
                })
                .select()
                .single();

              if (error) throw error;
              staffId = newStaff.id;
            }

            for (const station of STATIONS) {
              const trainedValue = parseFloat(row[station.name] || '0');
              if (trainedValue > 0) {
                await supabase.from('staff_training_stations').upsert({
                  staff_id: staffId,
                  station_name: station.name,
                  is_trained: true,
                  trained_date: new Date().toISOString(),
                  job_code: row['Job Code'] || 'Team Member'
                }, { onConflict: 'staff_id,station_name' });

                const { data: existingSignOff } = await supabase
                  .from('staff_sign_offs')
                  .select('id')
                  .eq('staff_id', staffId)
                  .eq('station_name', station.name)
                  .maybeSingle();

                if (!existingSignOff) {
                  await supabase.from('staff_sign_offs').insert({
                    staff_id: staffId,
                    station_name: station.name,
                    manager_staff_id: staffId,
                    sign_off_notes: 'Auto-generated from CSV import'
                  });
                }
              }
            }
          }

          toast.success(`Imported ${data.length} employees successfully`);
          await loadData();
        } catch (error) {
          toast.error('Import failed: ' + error.message);
        }
      }
    });
  };

  const handleAddRanking = async () => {
    if (!rankingStaff || !rankingStation) return;

    try {
      await supabase.from('staff_rankings').insert({
        staff_id: rankingStaff,
        rater_staff_id: selectedStaff?.id || rankingStaff,
        station_name: rankingStation,
        rating: rating
      });

      toast.success('Ranking added successfully');
      setRankingStaff(null);
      setRankingStation(null);
      setRating(3);
      await loadData();
    } catch (error) {
      toast.error('Failed to add ranking: ' + error.message);
    }
  };

  const handleAddSignOff = async (staffId, station) => {
    try {
      await supabase.from('staff_sign_offs').insert({
        staff_id: staffId,
        station_name: station,
        manager_staff_id: selectedStaff?.id || staffId,
        sign_off_notes: 'Manager sign-off'
      });

      toast.success('Sign-off added successfully');
      await loadData();
    } catch (error) {
      toast.error('Failed to add sign-off: ' + error.message);
    }
  };

  const getStaffTrainings = (staffId) => {
    return trainings.filter(t => t.staff_id === staffId);
  };

  const getStaffRankings = (staffId, station) => {
    const staffRankings = rankings.filter(
      r => r.staff_id === staffId && r.station_name === station
    );
    if (staffRankings.length === 0) return null;
    const avg = staffRankings.reduce((sum, r) => sum + r.rating, 0) / staffRankings.length;
    return avg.toFixed(1);
  };

  const hasSignOff = (staffId, station) => {
    return signOffs.some(s => s.staff_id === staffId && s.station_name === station);
  };

  const filteredStations = filterCategory === 'ALL'
    ? STATIONS
    : STATIONS.filter(s => s.category === filterCategory);

  const displayStations = selectedStaff && showRelevantOnly
    ? getRelevantStations(selectedStaff.position).filter(s =>
        filterCategory === 'ALL' || s.category === filterCategory
      )
    : filteredStations;

  if (loading) {
    return (
      <div className={embedded ? "flex items-center justify-center p-12" : "min-h-screen flex items-center justify-center"}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-background p-6"}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}>
        {!embedded && (
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Training & Ranking System</h1>
              <p className="text-muted-foreground">Manage staff training, rankings, and sign-offs</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        )}

        <Card className="p-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Import Staff CSV</label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
              />
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Staff</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {staff.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStaff(s)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedStaff?.id === s.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm opacity-80">{s.position}</div>
                  <div className="text-xs opacity-60">Gem ID: {s.gem_id}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            {selectedStaff ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedStaff.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedStaff.position}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={showRelevantOnly ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowRelevantOnly(!showRelevantOnly)}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      {showRelevantOnly ? 'Relevant' : 'All'}
                    </Button>
                    {['ALL', 'BOH', 'FOH', 'MOH'].map((cat) => (
                      <Button
                        key={cat}
                        variant={filterCategory === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {displayStations.map((station) => {
                    const training = getStaffTrainings(selectedStaff.id).find(
                      t => t.station_name === station.name
                    );
                    const isTrained = training?.is_trained || false;
                    const avgRating = getStaffRankings(selectedStaff.id, station.name);
                    const signedOff = hasSignOff(selectedStaff.id, station.name);

                    return (
                      <div
                        key={station.name}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded flex items-center justify-center ${
                              isTrained ? 'bg-success text-success-foreground' : 'bg-muted'
                            }`}
                          >
                            {isTrained ? '✓' : '×'}
                          </div>
                          <div>
                            <div className="font-medium">{station.name}</div>
                            <div className="text-sm text-muted-foreground">{station.category}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {signedOff && (
                            <div className="flex items-center gap-1 text-sm text-success">
                              <Shield className="w-4 h-4" />
                              Signed
                            </div>
                          )}
                          {avgRating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{avgRating}</span>
                            </div>
                          )}
                          {!signedOff && isTrained && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddSignOff(selectedStaff.id, station.name)}
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              Sign Off
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a staff member to view training details</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
