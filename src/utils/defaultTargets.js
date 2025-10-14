// Default Target Values Manager
// Created: 2025-01-22
// Purpose: Manage permanent default target configurations

export class DefaultTargetsManager {
  constructor() {
    this.defaultTargets = [
      {
        id: 'default-1',
        name: 'DWELL',
        value: '120 seconds',
        priority: 1,
        is_active: true,
        category: 'Speed'
      },
      {
        id: 'default-2',
        name: 'Peak Avalability',
        value: '98%',
        priority: 2,
        is_active: true,
        category: 'Cooks'
      },
      {
        id: 'default-3',
        name: 'Gold Standard',
        value: '100%',
        priority: 3,
        is_active: true,
        category: 'Cooks'
      },
      {
        id: 'default-4',
        name: 'FC Pack Time',
        value: '2 Minutes',
        priority: 4,
        is_active: true,
        category: 'Speed'
      },
      {
        id: 'default-5',
        name: 'Upgrades',
        value: '60%',
        priority: 5,
        is_active: true,
        category: 'Sales'
      },
      {
        id: 'default-6',
        name: 'Handover Time',
        value: '3 Minutes',
        priority: 6,
        is_active: true,
        category: 'Speed'
      }
    ];
  }

  // Get default target values
  getDefaultTargets() {
    return JSON.parse(JSON.stringify(this.defaultTargets)); // Deep copy
  }

  // Check if current targets match defaults
  areTargetsDefault(currentTargets) {
    if (currentTargets.length !== this.defaultTargets.length) {
      return false;
    }

    return this.defaultTargets.every(defaultTarget => {
      const currentTarget = currentTargets.find(t => 
        t.name === defaultTarget.name && 
        t.value === defaultTarget.value &&
        t.priority === defaultTarget.priority
      );
      return currentTarget !== undefined;
    });
  }

  // Get targets that differ from defaults
  getTargetDifferences(currentTargets) {
    const differences = {
      added: [],
      modified: [],
      removed: []
    };

    // Find added targets
    currentTargets.forEach(current => {
      const defaultExists = this.defaultTargets.find(def => def.name === current.name);
      if (!defaultExists) {
        differences.added.push(current);
      }
    });

    // Find modified targets
    this.defaultTargets.forEach(defaultTarget => {
      const current = currentTargets.find(t => t.name === defaultTarget.name);
      if (current && (current.value !== defaultTarget.value || current.priority !== defaultTarget.priority)) {
        differences.modified.push({
          current,
          default: defaultTarget
        });
      }
    });

    // Find removed targets
    this.defaultTargets.forEach(defaultTarget => {
      const currentExists = currentTargets.find(t => t.name === defaultTarget.name);
      if (!currentExists) {
        differences.removed.push(defaultTarget);
      }
    });

    return differences;
  }

  // Generate reset preview
  generateResetPreview(currentTargets) {
    const differences = this.getTargetDifferences(currentTargets);
    const preview = {
      willBeAdded: differences.removed.length,
      willBeModified: differences.modified.length,
      willBeRemoved: differences.added.length,
      totalChanges: differences.removed.length + differences.modified.length + differences.added.length
    };

    return preview;
  }
}