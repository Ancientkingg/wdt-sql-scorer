import { writable } from 'svelte/store';

function createAppStore() {
    const { subscribe, set, update } = writable({
        assignments: [],
        currentAssignmentId: null,
        currentQueryIndex: 0
    });

    // Load from localStorage
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
        saveState: (state) => {
            localStorage.setItem('sqlReviewerState', JSON.stringify({
                assignments: state.assignments
            }));
        }
    };
}

export const appStore = createAppStore();
