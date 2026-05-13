import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { WorkspaceProvider, useWorkspace } from '../contexts/WorkspaceContext';

describe('WorkspaceContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }) => (
    <WorkspaceProvider>{children}</WorkspaceProvider>
  );

  describe('initialization', () => {
    it('should initialize with default workspaces', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      expect(result.current.workspaces).toBeInstanceOf(Array);
      expect(result.current.workspaces.length).toBeGreaterThan(0);
      
      // Should include "All Tools" workspace
      const allTools = result.current.workspaces.find(w => w.id === 'all');
      expect(allTools).toBeDefined();
      expect(allTools.name).toBe('All Tools');
    });

    it('should set "all" as default active workspace', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      expect(result.current.activeWorkspaceId).toBe('all');
    });

    it('should load persisted workspaces from localStorage', () => {
      const customWorkspaces = [
        { id: 'all', name: 'All Tools', toolIds: ['tool1', 'tool2'] },
        { id: 'emergency', name: 'Emergency', toolIds: ['tool1'], color: '#ff6b6b', icon: 'Siren' }
      ];

      localStorage.setItem('careDroid.workspaces.v1', JSON.stringify({
        workspaces: customWorkspaces,
        activeWorkspaceId: 'emergency'
      }));

      const { result } = renderHook(() => useWorkspace(), { wrapper });

      expect(result.current.workspaces).toHaveLength(2);
      expect(result.current.activeWorkspaceId).toBe('emergency');
      
      const emergencyWs = result.current.workspaces.find(w => w.id === 'emergency');
      expect(emergencyWs.color).toBe('#ff6b6b');
      expect(emergencyWs.icon).toBe('Siren');
    });
  });

  describe('addWorkspace', () => {
    it('should add a new workspace', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const newWorkspace = {
        id: 'custom-1',
        name: 'My Custom Workspace',
        toolIds: ['drug-checker', 'lab-interpreter'],
        color: '#00ff88',
        icon: 'Hospital'
      };

      act(() => {
        result.current.addWorkspace(newWorkspace);
      });

      expect(result.current.workspaces).toContainEqual(newWorkspace);
    });

    it('should persist workspace to localStorage', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const newWorkspace = {
        id: 'test-workspace',
        name: 'Test Workspace',
        toolIds: ['tool1']
      };

      act(() => {
        result.current.addWorkspace(newWorkspace);
      });

      const saved = localStorage.getItem('careDroid.workspaces.v1');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved);
      expect(parsed.workspaces).toContainEqual(newWorkspace);
    });

    it('should allow multiple custom workspaces', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const workspace1 = { id: 'ws1', name: 'Workspace 1', toolIds: ['tool1'] };
      const workspace2 = { id: 'ws2', name: 'Workspace 2', toolIds: ['tool2'] };

      act(() => {
        result.current.addWorkspace(workspace1);
        result.current.addWorkspace(workspace2);
      });

      expect(result.current.workspaces.length).toBeGreaterThanOrEqual(6); // 4 default + 2 custom
      expect(result.current.workspaces).toContainEqual(workspace1);
      expect(result.current.workspaces).toContainEqual(workspace2);
    });
  });

  describe('updateWorkspace', () => {
    it('should update an existing workspace', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const newWorkspace = {
        id: 'test-ws',
        name: 'Original Name',
        toolIds: ['tool1']
      };

      act(() => {
        result.current.addWorkspace(newWorkspace);
      });

      act(() => {
        result.current.updateWorkspace('test-ws', {
          name: 'Updated Name',
          toolIds: ['tool1', 'tool2']
        });
      });

      const updated = result.current.workspaces.find(w => w.id === 'test-ws');
      expect(updated.name).toBe('Updated Name');
      expect(updated.toolIds).toEqual(['tool1', 'tool2']);
    });

    it('should not affect other workspaces when updating one', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const ws1 = { id: 'ws1', name: 'Workspace 1', toolIds: ['tool1'] };
      const ws2 = { id: 'ws2', name: 'Workspace 2', toolIds: ['tool2'] };

      act(() => {
        result.current.addWorkspace(ws1);
        result.current.addWorkspace(ws2);
      });

      act(() => {
        result.current.updateWorkspace('ws1', { name: 'Modified WS1' });
      });

      const ws1Updated = result.current.workspaces.find(w => w.id === 'ws1');
      const ws2Unchanged = result.current.workspaces.find(w => w.id === 'ws2');

      expect(ws1Updated.name).toBe('Modified WS1');
      expect(ws2Unchanged.name).toBe('Workspace 2');
    });

    it('should persist updates to localStorage', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      act(() => {
        result.current.addWorkspace({ id: 'test', name: 'Test', toolIds: [] });
        result.current.updateWorkspace('test', { name: 'Updated Test' });
      });

      const saved = localStorage.getItem('careDroid.workspaces.v1');
      const parsed = JSON.parse(saved);
      
      const updated = parsed.workspaces.find(w => w.id === 'test');
      expect(updated.name).toBe('Updated Test');
    });
  });

  describe('removeWorkspace', () => {
    it('should remove a workspace by id', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const workspace = { id: 'to-remove', name: 'Remove Me', toolIds: [] };

      act(() => {
        result.current.addWorkspace(workspace);
      });

      const beforeCount = result.current.workspaces.length;

      act(() => {
        result.current.removeWorkspace('to-remove');
      });

      expect(result.current.workspaces).not.toContainEqual(workspace);
      expect(result.current.workspaces.length).toBe(beforeCount - 1);
    });

    it('should reset active workspace to "all" if removed workspace was active', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const workspace = { id: 'active-ws', name: 'Active', toolIds: [] };

      act(() => {
        result.current.addWorkspace(workspace);
        result.current.setActiveWorkspaceId('active-ws');
      });

      expect(result.current.activeWorkspaceId).toBe('active-ws');

      act(() => {
        result.current.removeWorkspace('active-ws');
      });

      expect(result.current.activeWorkspaceId).toBe('all');
    });

    it('should not change active workspace if a different one is removed', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const ws1 = { id: 'ws1', name: 'WS1', toolIds: [] };
      const ws2 = { id: 'ws2', name: 'WS2', toolIds: [] };

      act(() => {
        result.current.addWorkspace(ws1);
        result.current.addWorkspace(ws2);
        result.current.setActiveWorkspaceId('ws1');
      });

      act(() => {
        result.current.removeWorkspace('ws2');
      });

      expect(result.current.activeWorkspaceId).toBe('ws1');
    });

    it('should persist removal to localStorage', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      act(() => {
        result.current.addWorkspace({ id: 'remove-me', name: 'Remove', toolIds: [] });
        result.current.removeWorkspace('remove-me');
      });

      const saved = localStorage.getItem('careDroid.workspaces.v1');
      const parsed = JSON.parse(saved);
      
      const removed = parsed.workspaces.find(w => w.id === 'remove-me');
      expect(removed).toBeUndefined();
    });
  });

  describe('setActiveWorkspaceId', () => {
    it('should change the active workspace', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      act(() => {
        result.current.setActiveWorkspaceId('diagnostic');
      });

      expect(result.current.activeWorkspaceId).toBe('diagnostic');
    });

    it('should persist active workspace selection', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      act(() => {
        result.current.setActiveWorkspaceId('calculator');
      });

      const saved = localStorage.getItem('careDroid.workspaces.v1');
      const parsed = JSON.parse(saved);

      expect(parsed.activeWorkspaceId).toBe('calculator');
    });

    it('should allow switching between multiple workspaces', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      act(() => {
        result.current.setActiveWorkspaceId('diagnostic');
      });
      expect(result.current.activeWorkspaceId).toBe('diagnostic');

      act(() => {
        result.current.setActiveWorkspaceId('calculator');
      });
      expect(result.current.activeWorkspaceId).toBe('calculator');

      act(() => {
        result.current.setActiveWorkspaceId('all');
      });
      expect(result.current.activeWorkspaceId).toBe('all');
    });
  });

  describe('workspace tool filtering', () => {
    it('should create workspaces with specific tool sets', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const emergencyWorkspace = {
        id: 'emergency',
        name: 'Emergency',
        toolIds: ['abc-assessment', 'trauma-score', 'vitals-monitor']
      };

      act(() => {
        result.current.addWorkspace(emergencyWorkspace);
      });

      const workspace = result.current.workspaces.find(w => w.id === 'emergency');
      expect(workspace.toolIds).toHaveLength(3);
      expect(workspace.toolIds).toContain('abc-assessment');
    });

    it('should support empty tool lists', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const emptyWorkspace = {
        id: 'empty',
        name: 'Empty Workspace',
        toolIds: []
      };

      act(() => {
        result.current.addWorkspace(emptyWorkspace);
      });

      const workspace = result.current.workspaces.find(w => w.id === 'empty');
      expect(workspace.toolIds).toEqual([]);
    });
  });

  describe('workspace customization', () => {
    it('should support custom colors', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const coloredWorkspace = {
        id: 'colored',
        name: 'Colored Workspace',
        toolIds: [],
        color: '#ff6b6b'
      };

      act(() => {
        result.current.addWorkspace(coloredWorkspace);
      });

      const workspace = result.current.workspaces.find(w => w.id === 'colored');
      expect(workspace.color).toBe('#ff6b6b');
    });

    it('should support custom icons', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const iconWorkspace = {
        id: 'icon-ws',
        name: 'Icon Workspace',
        toolIds: [],
        icon: 'Rocket'
      };

      act(() => {
        result.current.addWorkspace(iconWorkspace);
      });

      const workspace = result.current.workspaces.find(w => w.id === 'icon-ws');
      expect(workspace.icon).toBe('Rocket');
    });

    it('should allow both color and icon customization', () => {
      const { result } = renderHook(() => useWorkspace(), { wrapper });

      const customWorkspace = {
        id: 'full-custom',
        name: 'Fully Customized',
        toolIds: ['tool1'],
        color: '#a855f7',
        icon: 'Dna'
      };

      act(() => {
        result.current.addWorkspace(customWorkspace);
      });

      const workspace = result.current.workspaces.find(w => w.id === 'full-custom');
      expect(workspace.color).toBe('#a855f7');
      expect(workspace.icon).toBe('Dna');
      expect(workspace.toolIds).toEqual(['tool1']);
    });
  });
});
