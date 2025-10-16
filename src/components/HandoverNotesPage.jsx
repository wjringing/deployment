import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from '../lib/toast';
import {
  Plus, CheckCircle, AlertTriangle, Info, Wrench, Users as UsersIcon,
  Clock, Calendar, Filter, Trash2, MessageSquare
} from 'lucide-react';

export default function HandoverNotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterResolved, setFilterResolved] = useState('unresolved');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [newNote, setNewNote] = useState({
    date: new Date().toISOString().split('T')[0],
    shift_type: 'Day Shift',
    note_type: 'info',
    priority: 'medium',
    title: '',
    content: ''
  });

  useEffect(() => {
    loadNotes();
  }, [selectedDate, filterType, filterResolved]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - 7);

      const { data, error } = await supabase
        .from('shift_handover_notes')
        .select(`
          *,
          created_by:staff!shift_handover_notes_created_by_staff_id_fkey(id, name),
          resolved_by:staff!shift_handover_notes_resolved_by_staff_id_fkey(id, name)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredNotes = data || [];

      if (filterType !== 'all') {
        filteredNotes = filteredNotes.filter(n => n.note_type === filterType);
      }

      if (filterResolved !== 'all') {
        const resolvedValue = filterResolved === 'resolved';
        filteredNotes = filteredNotes.filter(n => n.is_resolved === resolvedValue);
      }

      setNotes(filteredNotes);
    } catch (error) {
      toast.error('Failed to load notes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNote.title || !newNote.content) {
      toast.error('Please enter title and content');
      return;
    }

    try {
      const { error } = await supabase
        .from('shift_handover_notes')
        .insert([newNote]);

      if (error) throw error;

      toast.success('Handover note created');
      setNewNote({
        date: new Date().toISOString().split('T')[0],
        shift_type: 'Day Shift',
        note_type: 'info',
        priority: 'medium',
        title: '',
        content: ''
      });
      await loadNotes();
    } catch (error) {
      toast.error('Failed to create note: ' + error.message);
    }
  };

  const handleResolveNote = async (note) => {
    const resolution = prompt('Resolution notes (optional):');
    if (resolution === null) return;

    try {
      const { error } = await supabase
        .from('shift_handover_notes')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution
        })
        .eq('id', note.id);

      if (error) throw error;

      toast.success('Note marked as resolved');
      await loadNotes();
    } catch (error) {
      toast.error('Failed to resolve note: ' + error.message);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!confirm('Delete this handover note?')) return;

    try {
      const { error } = await supabase
        .from('shift_handover_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Note deleted');
      await loadNotes();
    } catch (error) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const getNoteTypeIcon = (type) => {
    const icons = {
      issue: <AlertTriangle className="w-5 h-5" />,
      stock: <Info className="w-5 h-5" />,
      info: <MessageSquare className="w-5 h-5" />,
      equipment: <Wrench className="w-5 h-5" />,
      staff: <UsersIcon className="w-5 h-5" />
    };
    return icons[type] || <Info className="w-5 h-5" />;
  };

  const getNoteTypeColor = (type) => {
    const colors = {
      issue: 'bg-red-100 text-red-800 border-red-300',
      stock: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      info: 'bg-blue-100 text-blue-800 border-blue-300',
      equipment: 'bg-orange-100 text-orange-800 border-orange-300',
      staff: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800 font-bold'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shift Handover Notes</h2>
          <p className="text-gray-600">Manager communication between shifts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Create Note</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <Input
                type="date"
                value={newNote.date}
                onChange={(e) => setNewNote({ ...newNote, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Shift</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={newNote.shift_type}
                onChange={(e) => setNewNote({ ...newNote, shift_type: e.target.value })}
              >
                <option value="Day Shift">Day Shift</option>
                <option value="Night Shift">Night Shift</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={newNote.note_type}
                onChange={(e) => setNewNote({ ...newNote, note_type: e.target.value })}
              >
                <option value="info">Information</option>
                <option value="issue">Issue</option>
                <option value="stock">Stock Level</option>
                <option value="equipment">Equipment</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={newNote.priority}
                onChange={(e) => setNewNote({ ...newNote, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="Brief summary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Details</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 min-h-32"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Detailed information for incoming shift..."
              />
            </div>

            <Button onClick={handleCreateNote} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Create Note
            </Button>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Notes (7 days)</h3>
            <div className="flex gap-2">
              <select
                className="border rounded-lg px-3 py-1 text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="issue">Issues</option>
                <option value="stock">Stock</option>
                <option value="info">Info</option>
                <option value="equipment">Equipment</option>
                <option value="staff">Staff</option>
              </select>
              <select
                className="border rounded-lg px-3 py-1 text-sm"
                value={filterResolved}
                onChange={(e) => setFilterResolved(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto">
            {notes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No handover notes found</p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-4 border-2 rounded-lg ${
                    note.is_resolved
                      ? 'bg-gray-50 border-gray-200'
                      : note.priority === 'urgent'
                      ? 'bg-red-50 border-red-600'
                      : note.priority === 'high'
                      ? 'bg-orange-50 border-orange-400'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${getNoteTypeColor(note.note_type)}`}>
                        {getNoteTypeIcon(note.note_type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{note.title}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(note.priority)}`}>
                            {note.priority.toUpperCase()}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                            {note.shift_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {note.is_resolved ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleResolveNote(note)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Resolve
                      </Button>
                    )}
                  </div>

                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{note.content}</p>

                  {note.created_by && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Created by:</span> {note.created_by.name}
                      {' · '}
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                    </div>
                  )}

                  {note.is_resolved && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-green-700">Resolved</div>
                          {note.resolution_notes && (
                            <p className="text-gray-600 mt-1">{note.resolution_notes}</p>
                          )}
                          {note.resolved_by && (
                            <p className="text-gray-500 mt-1">
                              By {note.resolved_by.name} · {new Date(note.resolved_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
