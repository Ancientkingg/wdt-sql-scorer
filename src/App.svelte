<script>
	import { appStore } from './lib/store.js';
	import { parseFeedbackToReasons } from './lib/utils.js';
	import OverviewPage from './lib/OverviewPage.svelte';
	import AssignmentPage from './lib/AssignmentPage.svelte';
	import Modal from './lib/Modal.svelte';

	let state = {
		assignments: [],
		currentAssignmentId: null,
		currentQueryIndex: 0
	};

	let currentPage = 'overview';
	let fileInput;

	// Modal state
	let modalOpen = false;
	let modalTitle = '';
	let modalMessage = '';
	let modalType = 'alert';
	let modalCallback = null;

	function showAlert(title, message) {
		modalTitle = title;
		modalMessage = message;
		modalType = 'alert';
		modalOpen = true;
	}

	function showConfirm(title, message, callback) {
		modalTitle = title;
		modalMessage = message;
		modalType = 'confirm';
		modalCallback = callback;
		modalOpen = true;
	}

	function handleModalConfirm() {
		if (modalCallback) {
			modalCallback();
			modalCallback = null;
		}
		modalOpen = false;
	}

	function handleModalCancel() {
		modalCallback = null;
		modalOpen = false;
	}

	appStore.subscribe(value => {
		state = value;
	});

	function handleImportClick() {
		fileInput.click();
	}

	function handleFileImport(event) {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const result = e.target.result;
				if (typeof result === 'string') {
					const data = JSON.parse(result);
					importAssignment(data, file.name);
				}
				event.target.value = '';
			} catch (error) {
				showAlert('Import Error', 'Error parsing JSON file: ' + error.message);
			}
		};
		reader.readAsText(file);
	}

	function importAssignment(data, filename) {
		const assignment = {
			id: Date.now().toString(),
			name: filename.replace(/\.(json|txt)$/, ''),
			schema: data.schema || 'unknown',
			originalData: data,
			queries: data.queries.map((q, index) => ({
				query: q.query ? q.query.trim() : '',
				originalPoints: q.points,
				originalFeedback: q.feedback,
				selectedReasons: parseFeedbackToReasons(q.feedback),
				graded: q.feedback && q.feedback.trim() !== ''
			})),
			rubric: [],
			createdAt: new Date().toISOString()
		};

		appStore.update(s => {
			const newState = {
				...s,
				assignments: [...s.assignments, assignment]
			};
			appStore.saveState(newState);
			return newState;
		});
	}

	function deleteAssignment(id) {
		showConfirm(
			'Delete Assignment',
			'Are you sure you want to delete this assignment? This action cannot be undone.',
			() => {
				appStore.update(s => {
					const newState = {
						...s,
						assignments: s.assignments.filter(a => a.id !== id)
					};
					appStore.saveState(newState);
					return newState;
				});
			}
		);
	}

	function openAssignment(id) {
		const assignment = state.assignments.find(a => a.id === id);
		if (!assignment) return;

		// Find first non-correct query to start with
		let queryIndex = 0;
		while (queryIndex < assignment.queries.length) {
			const query = assignment.queries[queryIndex];
			if (!(query.originalPoints === 100 && query.originalFeedback && query.originalFeedback.toLowerCase().includes('correct'))) {
				break;
			}
			queryIndex++;
		}

		appStore.update(s => ({
			...s,
			currentAssignmentId: id,
			currentQueryIndex: queryIndex
		}));

		currentPage = 'assignment';
	}

	function backToOverview() {
		currentPage = 'overview';
	}
</script>

<div id="app">
	<input
		type="file"
		accept=".json,.txt"
		style="display: none;"
		bind:this={fileInput}
		on:change={handleFileImport}
	/>

	{#if currentPage === 'overview'}
		<OverviewPage
			assignments={state.assignments}
			on:import={handleImportClick}
			on:delete={(e) => deleteAssignment(e.detail)}
			on:open={(e) => openAssignment(e.detail)}
		/>
	{:else if currentPage === 'assignment'}
		<AssignmentPage
			assignment={state.assignments.find(a => a.id === state.currentAssignmentId)}
			currentQueryIndex={state.currentQueryIndex}
			on:back={backToOverview}
		/>
	{/if}

	<Modal
		bind:isOpen={modalOpen}
		title={modalTitle}
		message={modalMessage}
		type={modalType}
		on:confirm={handleModalConfirm}
		on:cancel={handleModalCancel}
	/>
</div>

<style>
	#app {
		min-height: 100vh;
	}
</style>
