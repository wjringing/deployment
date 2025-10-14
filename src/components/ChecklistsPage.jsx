import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';
import {
  Plus, Trash2, Save, CheckCircle, Circle, Download, Calendar,
  Clock, AlertCircle, FileText, Edit2, Copy, Printer, CheckSquare, X
} from 'lucide-react';

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateItems, setTemplateItems] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('manage');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('Day Shift');

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    checklist_type: 'opening',
    area: 'Kitchen',
    description: ''
  });

  const [newItem, setNewItem] = useState({
    item_text: '',
    display_order: 0,
    is_critical: false,
    estimated_minutes: 5,
    requires_manager_verification: false
  });

  const [currentCompletion, setCurrentCompletion] = useState(null);
  const [itemCompletions, setItemCompletions] = useState({});

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateItems(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (viewMode === 'complete' && selectedDate) {
      loadCompletions();
    }
  }, [viewMode, selectedDate, selectedShift]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      toast.error('Failed to load templates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateItems = async (templateId) => {
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_template_id', templateId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTemplateItems(data || []);
    } catch (error) {
      toast.error('Failed to load items: ' + error.message);
    }
  };

  const loadCompletions = async () => {
    try {
      const { data, error } = await supabase
        .from('checklist_completions')
        .select(`
          *,
          checklist_template:checklist_templates(*),
          completed_by:staff!checklist_completions_completed_by_staff_id_fkey(name),
          verified_by:staff!checklist_completions_verified_by_staff_id_fkey(name)
        `)
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift);

      if (error) throw error;
      setCompletions(data || []);
    } catch (error) {
      toast.error('Failed to load completions: ' + error.message);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.checklist_type || !newTemplate.area) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('checklist_templates')
        .insert([newTemplate])
        .select()
        .single();

      if (error) throw error;

      toast.success('Template created successfully');
      setNewTemplate({
        name: '',
        checklist_type: 'opening',
        area: 'Kitchen',
        description: ''
      });
      await loadTemplates();
      setSelectedTemplate(data);
    } catch (error) {
      toast.error('Failed to create template: ' + error.message);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this checklist template? All items will be removed.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template deleted successfully');
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (error) {
      toast.error('Failed to delete template: ' + error.message);
    }
  };

  const handleAddItem = async () => {
    if (!selectedTemplate || !newItem.item_text) {
      toast.error('Please select a template and enter item text');
      return;
    }

    try {
      const { error } = await supabase
        .from('checklist_items')
        .insert([{
          ...newItem,
          checklist_template_id: selectedTemplate.id
        }]);

      if (error) throw error;

      toast.success('Item added successfully');
      setNewItem({
        item_text: '',
        display_order: 0,
        is_critical: false,
        estimated_minutes: 5,
        requires_manager_verification: false
      });
      await loadTemplateItems(selectedTemplate.id);
    } catch (error) {
      toast.error('Failed to add item: ' + error.message);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Item deleted successfully');
      await loadTemplateItems(selectedTemplate.id);
    } catch (error) {
      toast.error('Failed to delete item: ' + error.message);
    }
  };

  const handleStartCompletion = async (template) => {
    try {
      const { data: existingCompletion, error: checkError } = await supabase
        .from('checklist_completions')
        .select('*, checklist_template:checklist_templates(*)')
        .eq('checklist_template_id', template.id)
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCompletion) {
        const { data: existingItems, error: itemsError } = await supabase
          .from('checklist_item_completions')
          .select('*')
          .eq('checklist_completion_id', existingCompletion.id);

        if (itemsError) throw itemsError;

        const completionMap = {};
        existingItems.forEach(item => {
          completionMap[item.checklist_item_id] = item;
        });

        setCurrentCompletion(existingCompletion);
        setItemCompletions(completionMap);
        toast.info('Resuming existing checklist');
      } else {
        const { data: newCompletion, error } = await supabase
          .from('checklist_completions')
          .insert([{
            checklist_template_id: template.id,
            date: selectedDate,
            shift_type: selectedShift
          }])
          .select('*, checklist_template:checklist_templates(*)')
          .single();

        if (error) throw error;

        setCurrentCompletion(newCompletion);
        setItemCompletions({});
        toast.success('Started new checklist');
      }

      await loadTemplateItems(template.id);
    } catch (error) {
      toast.error('Failed to start checklist: ' + error.message);
    }
  };

  const handleToggleItemCompletion = async (item) => {
    if (!currentCompletion) return;

    try {
      const existingCompletion = itemCompletions[item.id];

      if (existingCompletion) {
        const { error } = await supabase
          .from('checklist_item_completions')
          .update({
            is_completed: !existingCompletion.is_completed,
            completed_at: !existingCompletion.is_completed ? new Date().toISOString() : null
          })
          .eq('id', existingCompletion.id);

        if (error) throw error;

        setItemCompletions(prev => ({
          ...prev,
          [item.id]: {
            ...existingCompletion,
            is_completed: !existingCompletion.is_completed
          }
        }));
      } else {
        const { data, error } = await supabase
          .from('checklist_item_completions')
          .insert([{
            checklist_completion_id: currentCompletion.id,
            checklist_item_id: item.id,
            is_completed: true,
            completed_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        setItemCompletions(prev => ({
          ...prev,
          [item.id]: data
        }));
      }
    } catch (error) {
      toast.error('Failed to update item: ' + error.message);
    }
  };

  const handleCompleteChecklist = async () => {
    if (!currentCompletion) return;

    const allItems = templateItems;
    const completedItems = Object.values(itemCompletions).filter(c => c.is_completed).length;
    const criticalItems = allItems.filter(i => i.is_critical);
    const completedCritical = criticalItems.filter(i => itemCompletions[i.id]?.is_completed).length;

    if (completedCritical < criticalItems.length) {
      toast.error(`Complete all ${criticalItems.length} critical items before finishing`);
      return;
    }

    try {
      const { error } = await supabase
        .from('checklist_completions')
        .update({
          completion_time: new Date().toISOString()
        })
        .eq('id', currentCompletion.id);

      if (error) throw error;

      toast.success(`Checklist completed! ${completedItems}/${allItems.length} items done`);
      setCurrentCompletion(null);
      setItemCompletions({});
      await loadCompletions();
    } catch (error) {
      toast.error('Failed to complete checklist: ' + error.message);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      opening: 'bg-green-100 text-green-800 border-green-300',
      closing: 'bg-blue-100 text-blue-800 border-blue-300',
      cleaning: 'bg-purple-100 text-purple-800 border-purple-300',
      pre_peak: 'bg-orange-100 text-orange-800 border-orange-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getTypeLabel = (type) => {
    const labels = {
      opening: 'Opening',
      closing: 'Closing',
      cleaning: 'Cleaning',
      pre_peak: 'Pre-Peak'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const handlePrintAll = async () => {
    try {
      const { data: allTemplates, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write('<html><head><title>All Checklists</title>');
      printWindow.document.write('<style>');
      printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }');
      printWindow.document.write('h1 { color: #d32f2f; margin-bottom: 10px; }');
      printWindow.document.write('h2 { color: #333; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #d32f2f; padding-bottom: 5px; }');
      printWindow.document.write('.checklist { page-break-after: always; margin-bottom: 40px; }');
      printWindow.document.write('.item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }');
      printWindow.document.write('.critical { background-color: #ffebee; border-left: 4px solid #d32f2f; }');
      printWindow.document.write('.checkbox { display: inline-block; width: 20px; height: 20px; border: 2px solid #333; margin-right: 10px; vertical-align: middle; }');
      printWindow.document.write('.metadata { color: #666; font-size: 12px; margin-top: 5px; }');
      printWindow.document.write('@media print { .checklist { page-break-after: always; } }');
      printWindow.document.write('</style></head><body>');
      printWindow.document.write(`<h1>KFC Shift Checklists - ${selectedDate} (${selectedShift})</h1>`);

      for (const template of allTemplates) {
        const { data: items } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('checklist_template_id', template.id)
          .order('display_order');

        printWindow.document.write('<div class="checklist">');
        printWindow.document.write(`<h2>${template.name}</h2>`);
        printWindow.document.write(`<p><strong>Type:</strong> ${template.checklist_type} | <strong>Area:</strong> ${template.area}</p>`);
        if (template.description) {
          printWindow.document.write(`<p>${template.description}</p>`);
        }

        if (items && items.length > 0) {
          items.forEach((item, index) => {
            const itemClass = item.is_critical ? 'item critical' : 'item';
            printWindow.document.write(`<div class="${itemClass}">`);
            printWindow.document.write(`<span class="checkbox"></span>`);
            printWindow.document.write(`<strong>${index + 1}. ${item.item_text}</strong>`);
            if (item.is_critical) {
              printWindow.document.write(' <span style="color: #d32f2f; font-weight: bold;">[CRITICAL]</span>');
            }
            printWindow.document.write('<div class="metadata">');
            printWindow.document.write(`Est. Time: ${item.estimated_minutes} min`);
            if (item.requires_manager_verification) {
              printWindow.document.write(' | Manager Verification Required');
            }
            printWindow.document.write('</div></div>');
          });
        } else {
          printWindow.document.write('<p><em>No items in this checklist</em></p>');
        }

        printWindow.document.write('</div>');
      }

      printWindow.document.write('<div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #333;">');
      printWindow.document.write('<p><strong>Completed By:</strong> ___________________________ <strong>Date:</strong> _______________</p>');
      printWindow.document.write('<p><strong>Verified By (Manager):</strong> ___________________________ <strong>Time:</strong> _______________</p>');
      printWindow.document.write('</div>');

      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('Error printing checklists:', error);
      toast.error('Failed to generate printable checklists');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Opening & Closing Checklists</h2>
          <p className="text-gray-600">Manage and complete daily operational checklists</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintAll}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print All
          </Button>
          <Button
            variant={viewMode === 'manage' ? 'default' : 'outline'}
            onClick={() => setViewMode('manage')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Manage
          </Button>
          <Button
            variant={viewMode === 'complete' ? 'default' : 'outline'}
            onClick={() => setViewMode('complete')}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Complete
          </Button>
        </div>
      </div>

      {viewMode === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Morning Opening - Kitchen"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={newTemplate.checklist_type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, checklist_type: e.target.value })}
                >
                  <option value="opening">Opening</option>
                  <option value="closing">Closing</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="pre_peak">Pre-Peak</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Area</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={newTemplate.area}
                  onChange={(e) => setNewTemplate({ ...newTemplate, area: e.target.value })}
                >
                  <option value="Kitchen">Kitchen</option>
                  <option value="Front">Front Counter</option>
                  <option value="Lobby">Lobby</option>
                  <option value="Drive-Thru">Drive-Thru</option>
                  <option value="All">All Areas</option>
                </select>
              </div>
              <Button onClick={handleCreateTemplate} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Templates</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedTemplate?.id === template.id
                        ? 'bg-red-100 border-2 border-red-600'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-600">{template.area}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded border ${getTypeColor(template.checklist_type)}`}>
                        {getTypeLabel(template.checklist_type)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            {selectedTemplate ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                    <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Add Item</h4>
                  <div className="space-y-3">
                    <Input
                      value={newItem.item_text}
                      onChange={(e) => setNewItem({ ...newItem, item_text: e.target.value })}
                      placeholder="Task description"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        value={newItem.display_order}
                        onChange={(e) => setNewItem({ ...newItem, display_order: parseInt(e.target.value) })}
                        placeholder="Order"
                      />
                      <Input
                        type="number"
                        value={newItem.estimated_minutes}
                        onChange={(e) => setNewItem({ ...newItem, estimated_minutes: parseInt(e.target.value) })}
                        placeholder="Minutes"
                      />
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newItem.is_critical}
                          onChange={(e) => setNewItem({ ...newItem, is_critical: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">Critical</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newItem.requires_manager_verification}
                          onChange={(e) => setNewItem({ ...newItem, requires_manager_verification: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">Manager Verify</span>
                      </label>
                    </div>
                    <Button onClick={handleAddItem} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Items ({templateItems.length})</h4>
                  {templateItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-gray-400 text-sm w-8">{item.display_order}</div>
                        <div className="flex-1">
                          <div className="font-medium">{item.item_text}</div>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1">
                            <span>{item.estimated_minutes} min</span>
                            {item.is_critical && <span className="text-red-600 font-bold">CRITICAL</span>}
                            {item.requires_manager_verification && <span className="text-blue-600">MGR</span>}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a template</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {viewMode === 'complete' && (
        <div>
          <Card className="p-6 mb-6">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Shift</label>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                >
                  <option value="Day Shift">Day Shift</option>
                  <option value="Night Shift">Night Shift</option>
                  <option value="Both Shifts">Both Shifts</option>
                </select>
              </div>
            </div>
          </Card>

          {currentCompletion ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">{currentCompletion.checklist_template.name}</h3>
                  <p className="text-gray-600">{currentCompletion.checklist_template.area}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentCompletion(null)} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleCompleteChecklist} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finish
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {templateItems.map((item) => {
                  const completed = itemCompletions[item.id]?.is_completed;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToggleItemCompletion(item)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        completed
                          ? 'bg-green-50 border-green-600'
                          : item.is_critical
                          ? 'bg-red-50 border-red-200 hover:bg-red-100'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {completed ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400" />
                        )}
                        <div className="flex-1">
                          <div className={`font-medium ${completed ? 'line-through text-gray-500' : ''}`}>
                            {item.item_text}
                          </div>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1">
                            <span>{item.estimated_minutes} min</span>
                            {item.is_critical && <span className="text-red-600 font-bold">CRITICAL</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => {
                const completion = completions.find(c => c.checklist_template_id === template.id);
                return (
                  <Card
                    key={template.id}
                    className={`p-6 cursor-pointer hover:shadow-lg transition ${
                      completion?.completion_time
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => handleStartCompletion(template)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold">{template.name}</h3>
                      {completion?.completion_time ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : completion ? (
                        <Clock className="w-5 h-5 text-orange-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{template.area}</p>
                    <span className={`text-xs px-2 py-1 rounded border ${getTypeColor(template.checklist_type)}`}>
                      {getTypeLabel(template.checklist_type)}
                    </span>
                    {completion && (
                      <div className="mt-3 text-xs text-gray-600">
                        {completion.completion_time
                          ? `Done: ${new Date(completion.completion_time).toLocaleTimeString()}`
                          : 'In Progress'}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
