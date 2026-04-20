import { writable } from 'svelte/store';

/**
 * App-level Svelte store backed by localStorage.
 * Holds the list of assignments and navigation state.
 */
function createAppStore() {
    const { subscribe, set, update } = writable({
        assignments: [],
        currentAssignmentId: null,
        currentQueryIndex: 0
    });

    // Restore previous session from localStorage
    const saved = localStorage.getItem('sqlReviewerState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            set({
                assignments: parsed.assignments || [],
                currentAssignmentId: null,
                currentQueryIndex: 0
            });
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }

    return {
        subscribe,
        set,
        update,
        /** Persist assignment data to localStorage. */
        saveState: (state) => {
            localStorage.setItem('sqlReviewerState', JSON.stringify({
                assignments: state.assignments
            }));
        }
    };
}

export const appStore = createAppStore();
