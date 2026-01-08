import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  Box, FormControl, InputLabel, MenuItem, Select, 
  Button, TextField, Chip, CircularProgress, Alert
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { X, PlusCircle, Check, AlertTriangle } from 'lucide-react';

const EnumConfigPage = ({
  allowedTypes,
  defaultType,
  title = 'Manage Enumerations',
  description
}) => {
  const [enumTypes, setEnumTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [enumValues, setEnumValues] = useState([]);
  const [newValue, setNewValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchEnumValues = async (type) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("admin-token");
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/admin/config/type/${type}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setEnumValues(response.data.data.values || []);
      } else {
        setError('Failed to fetch enum values');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectType = async (type) => {
    setSelectedType(type);
    setEnumValues([]);
    setNewValue('');
    setError(null);
    setSuccess(null);

    if (!type) {
      return;
    }

    await fetchEnumValues(type);
  };

  const fetchEnumTypes = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("admin-token");
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/admin/config`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        let configs = response.data.data || [];

        if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
          configs = configs.filter((enumConfig) => allowedTypes.includes(enumConfig.type));
        }

        setEnumTypes(configs);

        if (configs.length === 0) {
          setSelectedType('');
          setEnumValues([]);
          setNewValue('');
          return;
        }

        if (defaultType && configs.some((enumConfig) => enumConfig.type === defaultType)) {
          await selectType(defaultType);
        } else if (!defaultType && configs.length === 1) {
          await selectType(configs[0].type);
        } else {
          setSelectedType('');
          setEnumValues([]);
          setNewValue('');
        }
      } else {
        setError('Failed to fetch enum types');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error');
      toast.error('Failed to load configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnumTypes();
  }, []);

  const handleTypeChange = (event) => {
    const { value } = event.target;
    selectType(value);
  };

  const handleAddValue = () => {
    if (!newValue.trim()) return;
    
    // Check for duplicates
    if (enumValues.includes(newValue.trim())) {
      toast.warning('This value already exists');
      return;
    }
    
    setEnumValues([...enumValues, newValue.trim()]);
    setNewValue('');
  };

  const handleRemoveValue = (value) => {
    setEnumValues(enumValues.filter(v => v !== value));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(enumValues);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setEnumValues(items);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem("admin-token");
      const response = await axios.put(
        `${import.meta.env.VITE_BASE_URL}/admin/config/type/${selectedType}`,
        { values: enumValues },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        toast.success(`${selectedType} configuration updated successfully`);
      } else {
        setError(response.data.message);
        toast.error(response.data.message);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update configuration';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {description && (
        <Alert severity="info" className="mb-4">
          {description}
        </Alert>
      )}

      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" className="mb-4" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <FormControl fullWidth className="mb-6">
        <InputLabel id="enum-type-label">Select Enum Type</InputLabel>
        <Select
          labelId="enum-type-label"
          value={selectedType}
          label="Select Enum Type"
          onChange={handleTypeChange}
          disabled={isLoading}
        >
          <MenuItem value="">Select a type</MenuItem>
          {enumTypes.map(enumConfig => (
            <MenuItem key={enumConfig._id} value={enumConfig.type}>
              {enumConfig.type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {selectedType && (
        <>
          <div className="mb-6 flex gap-2">
            <TextField
              label="New Value"
              variant="outlined"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              disabled={isLoading}
              className="flex-grow"
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddValue}
              disabled={isLoading || !newValue.trim()}
              startIcon={<PlusCircle size={16} />}
            >
              Add
            </Button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Current Values</h3>
            {enumValues.length === 0 ? (
              <p className="text-gray-500">No values defined yet.</p>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="enum-values">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="border rounded-lg p-2 min-h-[100px]"
                    >
                      {enumValues.map((value, index) => (
                        <Draggable key={value} draggableId={value} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="flex items-center justify-between p-3 mb-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                            >
                              <span className="font-medium">{value}</span>
                              <Button
                                color="error"
                                size="small"
                                onClick={() => handleRemoveValue(value)}
                                disabled={isLoading}
                                className="min-w-0 p-1"
                              >
                                <X size={18} />
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={isLoading || enumValues.length === 0}
              startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <Check size={16} />}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default EnumConfigPage;