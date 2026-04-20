<script>
	import { appStore } from './lib/store.js';
	import { parseFeedbackToReasons, parseStatistics, normalizeQuery, MODEL_QUERY_SENTINEL } from './lib/utils.js';
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

	function logStatisticsMismatch(queryText, normalizedQuery, queryCounts, context) {
		// if (!import.meta.env.DEV) return;
		console.group(`[Statistics] mismatch @ ${context}`);
		console.log('original query:', queryText);
		console.log('normalized query:', normalizedQuery);
		console.log(`statistics has ${queryCounts.size} keys`);
		console.log('all statistics keys:', Array.from(queryCounts.keys()));
		const closeMatches = Array.from(queryCounts.keys()).filter(k =>
			k.includes(normalizedQuery.slice(0, 20)) || normalizedQuery.includes(k.slice(0, 20))
		);
		if (closeMatches.length) console.log('possible close matches:', closeMatches);
		console.groupEnd();
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
		// Get cluster counts from statistics data
		const queryCounts = parseStatistics(data);
		const hasStatistics = queryCounts.size > 0;
		
		let matchedCount = 0;
		let unmatchedCount = 0;
		
		const importedRubric = data.rubric && Array.isArray(data.rubric) ? data.rubric : [];
		
		// Detect how feedback was exported so we can re-parse it
		const feedbackFormat = data._metadata?.feedbackFormat || 'unknown';
		
		const assignment = {
			id: Date.now().toString(),
			name: filename.replace(/\.(json|txt)$/, ''),
			schema: data.schema || 'unknown',
			originalData: data,
			hasStatistics: hasStatistics,
			taskDescription: data.taskDescription || '',
			schemaImage: data.schemaImage || '',
			queries: data.queries.map((q, index) => {
				const queryText = q.query ? q.query.trim() : '';
				const normalizedQuery = normalizeQuery(queryText);

				let clusterCount = 1;
				let selectedReasons = [];
				if (hasStatistics) {
					const isCorrect = q.points === 100 && q.feedback?.toLowerCase().includes('correct');
					const foundCount = queryCounts.get(normalizedQuery) ?? (isCorrect ? queryCounts.get(MODEL_QUERY_SENTINEL) : undefined);
					if (foundCount) {
						clusterCount = foundCount;
						matchedCount++;
					} else {
						unmatchedCount++;
							logStatisticsMismatch(queryText, normalizedQuery, queryCounts, `assignment import index ${index}`);
					}
				} else if (feedbackFormat === 'ids' || feedbackFormat === 'unknown') {
					// Parse R1, R2, etc. from feedback text
					selectedReasons = parseFeedbackToReasons(q.feedback);
				} else if (feedbackFormat === 'descriptions' && importedRubric.length > 0) {
					// Match full descriptions back to reason IDs
					const feedbackText = q.feedback || '';
					importedRubric.forEach(reason => {
						if (feedbackText.includes(reason.description)) {
							selectedReasons.push(reason.id);
						}
					});
				}
				
				return {
					query: queryText,
					originalPoints: q.points,
					originalFeedback: q.feedback,
					selectedReasons: selectedReasons,
					graded: q.feedback && q.feedback.trim() !== '',
					clusterCount: clusterCount
				};
			}),
			rubric: importedRubric,
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
		
		// Warn if many queries didn't match statistics
		if (hasStatistics) {
			const totalQueries = matchedCount + unmatchedCount;
			const matchPercentage = Math.round((matchedCount / totalQueries) * 100);
			
			if (unmatchedCount > 0 && matchPercentage < 80) {
				showAlert(
					'Import Notice',
					`Assignment imported successfully!\n\n⚠️ Statistics Note: Only ${matchedCount}/${totalQueries} queries matched (${matchPercentage}%). ${unmatchedCount} queries will default to 1 student each.`
				);
			}
		}
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

		// Skip to first non-correct query
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
