import React, { useState } from 'react';
import toolRegistry from '../data/toolRegistry';
import { NavIcon } from '../navigation/NavIcon';
import { getToolIcon, getWorkspaceIcon, WORKSPACE_ICON_CHOICES, WORKSPACE_PICK_KEYS, CHROME_ICONS } from '../navigation/iconRegistry';
import './WorkspaceCreationModal.css';

/**
 * Workspace Creation Modal
 * Allows users to create custom workspaces with selected tools
 */
const WorkspaceCreationModal = ({ isOpen, onClose, onCreateWorkspace }) => {
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedColor, setSelectedColor] = useState('var(--accent-1)');
  const [selectedIcon, setSelectedIcon] = useState('Hospital');
  const [selectedTools, setSelectedTools] = useState([]);
  const [errors, setErrors] = useState({});

  const availableColors = [
    { name: 'Green', value: 'var(--accent-1)' },
    { name: 'Blue', value: '#00d4ff' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Orange', value: '#ff922b' },
    { name: 'Red', value: '#ff6b6b' },
    { name: 'Pink', value: '#ff5cb8' },
    { name: 'Yellow', value: '#ffd43b' },
    { name: 'Teal', value: '#4ecdc4' }
  ];

  const workspaceTemplates = [
    {
      name: 'Emergency Medicine',
      iconKey: 'Siren',
      color: '#ff6b6b',
      tools: ['drug-check', 'sofa-score', 'lab-interp', 'protocols', 'calc-gfr'],
    },
    {
      name: 'ICU/Critical Care',
      iconKey: 'Hospital',
      color: '#4ecdc4',
      tools: ['sofa-score', 'lab-interp', 'drug-check', 'calc-gfr', 'protocols'],
    },
    {
      name: 'Ambulatory Care',
      iconKey: 'Stethoscope',
      color: 'var(--accent-1)',
      tools: ['diagnosis', 'drug-check', 'protocols', 'calc-bmi', 'calc-chads2vasc'],
    },
    {
      name: 'Oncology',
      iconKey: 'Dna',
      color: '#a855f7',
      tools: ['drug-check', 'lab-interp', 'protocols', 'calculators'],
    },
  ];

  const handleTemplateSelect = (template) => {
    setWorkspaceName(template.name);
    setSelectedIcon(template.iconKey);
    setSelectedColor(template.color);
    setSelectedTools(template.tools.filter(toolId =>
      toolRegistry.some(t => t.id === toolId)
    ));
    setErrors({});
  };

  const handleToolToggle = (toolId) => {
    setSelectedTools(prev =>
      prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
    if (errors.tools) {
      setErrors(prev => ({ ...prev, tools: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!workspaceName.trim()) {
      newErrors.name = 'Workspace name is required';
    }

    if (selectedTools.length === 0) {
      newErrors.tools = 'Select at least one tool';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;

    const newWorkspace = {
      id: `workspace_${Date.now()}`,
      name: workspaceName.trim(),
      color: selectedColor,
      icon: selectedIcon,
      toolIds: selectedTools,
      createdAt: new Date().toISOString()
    };

    onCreateWorkspace(newWorkspace);
    handleClose();
  };

  const handleClose = () => {
    setWorkspaceName('');
    setSelectedColor('var(--accent-1)');
    setSelectedIcon('Hospital');
    setSelectedTools([]);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  // Group tools by category
  const toolsByCategory = toolRegistry.reduce((acc, tool) => {
    const category = tool.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tool);
    return acc;
  }, {});

  return (
    <div className="workspace-modal-overlay" onClick={handleClose}>
      <div className="workspace-modal" onClick={(e) => e.stopPropagation()}>
        <div className="workspace-modal-header">
          <h2 className="workspace-modal-title">Create New Workspace</h2>
          <button type="button" className="workspace-modal-close" onClick={handleClose} aria-label="Close">
            <NavIcon icon={CHROME_ICONS.close} size={20} />
          </button>
        </div>

        <div className="workspace-modal-content">
          {/* Templates */}
          <div className="workspace-section">
            <label className="workspace-label">Quick Templates</label>
            <div className="workspace-templates">
              {workspaceTemplates.map((template, idx) => (
                <button
                  key={idx}
                  className="workspace-template-btn"
                  onClick={() => handleTemplateSelect(template)}
                  style={{ borderColor: template.color }}
                >
                  <span className="template-icon" aria-hidden>
                    <NavIcon icon={WORKSPACE_ICON_CHOICES[template.iconKey]} size={22} />
                  </span>
                  <span className="template-name">{template.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="workspace-section">
            <label className="workspace-label">
              Workspace Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`workspace-input ${errors.name ? 'error' : ''}`}
              value={workspaceName}
              onChange={(e) => {
                setWorkspaceName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: null }));
              }}
              placeholder="e.g., Emergency Medicine"
              maxLength={50}
            />
            {errors.name && <div className="workspace-error">{errors.name}</div>}
          </div>

          {/* Icon Selector */}
          <div className="workspace-section">
            <label className="workspace-label">Icon</label>
            <div className="workspace-icon-grid">
              {WORKSPACE_PICK_KEYS.map((key) => {
                const IconComp = WORKSPACE_ICON_CHOICES[key];
                if (!IconComp) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`workspace-icon-btn ${selectedIcon === key ? 'selected' : ''}`}
                    onClick={() => setSelectedIcon(key)}
                    title={key}
                  >
                    <NavIcon icon={IconComp} size={22} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div className="workspace-section">
            <label className="workspace-label">Color</label>
            <div className="workspace-color-grid">
              {availableColors.map((color, idx) => (
                <button
                  key={idx}
                  className={`workspace-color-btn ${selectedColor === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                >
                  {selectedColor === color.value && <span className="color-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="workspace-section">
            <label className="workspace-label">Preview</label>
            <div
              className="workspace-preview"
              style={{
                borderColor: selectedColor,
                background: `linear-gradient(135deg, ${selectedColor}15, ${selectedColor}05)`
              }}
            >
              <span className="preview-icon" aria-hidden>
                <NavIcon icon={getWorkspaceIcon(selectedIcon)} size={28} />
              </span>
              <span className="preview-name">{workspaceName || 'Workspace Name'}</span>
              <span className="preview-count">{selectedTools.length} tools</span>
            </div>
          </div>

          {/* Tool Selector */}
          <div className="workspace-section">
            <label className="workspace-label">
              Select Tools <span className="required">*</span>
              {selectedTools.length > 0 && (
                <span className="tool-count-badge">{selectedTools.length} selected</span>
              )}
            </label>
            {errors.tools && <div className="workspace-error">{errors.tools}</div>}

            <div className="workspace-tools-container">
              {Object.entries(toolsByCategory).map(([category, tools]) => (
                <div key={category} className="workspace-tool-category">
                  <div className="workspace-category-header">{category}</div>
                  <div className="workspace-tool-list">
                    {tools.map((tool) => (
                      <label key={tool.id} className="workspace-tool-item">
                        <input
                          type="checkbox"
                          checked={selectedTools.includes(tool.id)}
                          onChange={() => handleToolToggle(tool.id)}
                        />
                        <span className="tool-item-icon" aria-hidden>
                          <NavIcon icon={getToolIcon(tool.id)} size={18} />
                        </span>
                        <span className="tool-item-name">{tool.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="workspace-modal-footer">
          <button className="workspace-btn workspace-btn-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="workspace-btn workspace-btn-create"
            onClick={handleCreate}
            style={{ background: selectedColor }}
          >
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCreationModal;
