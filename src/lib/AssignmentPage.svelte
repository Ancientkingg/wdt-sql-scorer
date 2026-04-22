<script>
	import { createEventDispatcher } from 'svelte';
	import { appStore } from './store.js';
	import { parseStatistics, normalizeQuery, MODEL_QUERY_SENTINEL } from './utils.js';
	import RubricTab from './RubricTab.svelte';
	import ReviewTab from './ReviewTab.svelte';
	import StatisticsTab from './StatisticsTab.svelte';
	import Modal from './Modal.svelte';

	export let assignment;
	export let currentQueryIndex;

	const dispatch = createEventDispatcher();

	let activeTab = 'rubric';
	let statisticsFileInput;
	let useFeedbackDescriptions = false;
	let showFilenameModal = false;
	let exportFilename = '';
	let pendingExportBlob = null;
	let showTaskModal = false;
	let taskDescription = assignment.taskDescription || '';
	let schemaImageUrl = assignment.schemaImage || '';
	let schemaFileInput;
	let isEditingTitle = false;
	let editTitle = assignment.name;

	function switchTab(tabName) {
		// Block statistics tab when no data loaded
		if (tabName === 'statistics' && !assignment.hasStatistics) {
			return;
		}
		activeTab = tabName;
	}

	function buildExportQueries(includeSelectedReasons = false) {
		return assignment.queries.map((query) => {
			let score = 100;
			query.selectedReasons.forEach(reasonId => {
				const reason = assignment.rubric.find(r => r.id === reasonId);
				if (reason) {
					score += reason.points;
				}
			});
			score = Math.max(0, Math.min(100, score));

			let feedback;
			if (query.selectedReasons.length > 0) {
				if (useFeedbackDescriptions) {
					// Export full descriptions prefixed with reason ID (e.g., R1: ...)
					feedback = query.selectedReasons
						.map(reasonId => {
							const reason = assignment.rubric.find(r => r.id === reasonId);
							return reason ? `${reason.id}: ${reason.description}` : reasonId;
						})
						.join(', ');
				} else {
					// Export reason IDs (R1, R2, etc.)
					feedback = query.selectedReasons.join(', ');
				}
			} else {
				feedback = query.originalFeedback;
			}

			const exportedQuery = {
				query: query.query,
				points: score,
				feedback
			};

			if (includeSelectedReasons) {
				exportedQuery._selectedReasons = query.selectedReasons;
			}

			return exportedQuery;
		});
	}

	function buildShareExportData() {
		return {
			...assignment.originalData,
			_metadata: {
				exportedWith: 'wdt-sql-scorer',
				exportDate: new Date().toISOString(),
				feedbackFormat: useFeedbackDescriptions ? 'descriptions' : 'ids'
			},
			taskDescription: assignment.taskDescription || undefined,
			schemaImage: assignment.schemaImage || undefined,
			rubric: assignment.rubric.map(r => ({
				id: r.id,
				description: r.description,
				points: r.points
			})),
			queries: buildExportQueries(true)
		};
	}

	async function copyTextToClipboard(text) {
		if (navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch (error) {
				console.error('Clipboard API copy failed:', error);
			}
		}

		try {
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.left = '-9999px';
			textArea.style.top = '0';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			const copied = document.execCommand('copy');
			document.body.removeChild(textArea);
			return copied;
		} catch (error) {
			console.error('Fallback clipboard copy failed:', error);
			return false;
		}
	}

	function buildWebLabExportData() {
		const baseData = Object.fromEntries(
			Object.entries(assignment.originalData || {}).filter(([key]) => (
				!key.startsWith('_') &&
				key !== 'taskDescription' &&
				key !== 'schemaImage' &&
				key !== 'rubric' &&
				key !== 'queries'
			))
		);

		return {
			...baseData,
			queries: buildExportQueries(false)
		};
	}

	async function saveExportData(exportData, suggestedFilename) {
		const dataStr = JSON.stringify(exportData, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });

		// Native save dialog (File System Access API)
		if ('showSaveFilePicker' in window) {
			try {
				// @ts-ignore - showSaveFilePicker not universally typed
				const handle = await window.showSaveFilePicker({
					suggestedName: suggestedFilename,
					types: [{
						description: 'JSON Files',
						accept: { 'application/json': ['.json'] }
					}]
				});
				const writable = await handle.createWritable();
				await writable.write(blob);
				await writable.close();
			} catch (err) {
				if (err.name !== 'AbortError') console.error('Save failed:', err);
			}
		} else {
			// Fallback for browsers without File System Access API
			pendingExportBlob = blob;
			exportFilename = suggestedFilename.replace(/\.json$/i, '');
			showFilenameModal = true;
		}
	}

	async function handleShareExport() {
		await saveExportData(buildShareExportData(), `${assignment.name}_share.json`);
	}

	async function handleWebLabExport() {
		const exportData = buildWebLabExportData();
		const dataStr = JSON.stringify(exportData, null, 2);
		const copied = await copyTextToClipboard(dataStr);

		if (copied) {
			showAlert('Copied to Clipboard', 'WebLab JSON was copied to clipboard.');
			return;
		}

		showAlert('Clipboard Copy Failed', 'Could not copy WebLab JSON to clipboard, so a file download will be used instead.');
		await saveExportData(exportData, `${assignment.name}_graded.json`);
	}

	function handleFilenameConfirm() {
		if (pendingExportBlob && exportFilename.trim()) {
			const url = URL.createObjectURL(pendingExportBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = exportFilename.endsWith('.json') ? exportFilename : `${exportFilename}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			// Clean up
			pendingExportBlob = null;
			showFilenameModal = false;
		}
	}

	function handleFilenameCancel() {
		pendingExportBlob = null;
		showFilenameModal = false;
	}

	function handleStatisticsClick() {
		statisticsFileInput.click();
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

	function handleStatisticsImport(event) {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const content = e.target.result;
				if (typeof content === 'string') {
					const data = { statistics: content };
					const queryCounts = parseStatistics(data);

					if (queryCounts.size === 0) {
						showAlert('Import Error', 'No valid statistics found in file');
						return;
					}

					// Match queries to cluster counts
					let matchedCount = 0;
					let unmatchedCount = 0;
					let totalStudents = 0;

					appStore.update(s => {
						const updatedAssignments = s.assignments.map(a => {
							if (a.id === assignment.id) {
								const updatedQueries = a.queries.map(q => {
									const normalizedQuery = normalizeQuery(q.query);
									const isCorrect = q.originalPoints === 100 && q.originalFeedback?.toLowerCase().includes('correct');
									const clusterCount = queryCounts.get(normalizedQuery) ?? (isCorrect ? queryCounts.get(MODEL_QUERY_SENTINEL) : undefined);

									if (clusterCount) {
										matchedCount++;
										totalStudents += clusterCount;
										return { ...q, clusterCount };
									} else {
										unmatchedCount++;
										totalStudents += 1;
										logStatisticsMismatch(q.query, normalizedQuery, queryCounts, `statistics import query "${q.query.slice(0, 40)}"`);
										return { ...q, clusterCount: 1 };
									}
								});

								return {
									...a,
									hasStatistics: true,
									queries: updatedQueries
								};
							}
							return a;
						});

						const newState = { ...s, assignments: updatedAssignments };
						appStore.saveState(newState);
						return newState;
					});

					// Report match results
					const totalQueries = matchedCount + unmatchedCount;
					const matchPercentage = Math.round((matchedCount / totalQueries) * 100);
					
					if (unmatchedCount === 0) {
						showAlert(
							'Statistics Loaded',
							`✓ All ${totalQueries} queries matched successfully!\n\nTotal students: ${totalStudents}`
						);
					} else if (matchPercentage >= 80) {
						showAlert(
							'Statistics Loaded',
							`Statistics loaded with ${matchedCount}/${totalQueries} queries matched (${matchPercentage}%).\n\n${unmatchedCount} unmatched queries will default to 1 student each.\n\nTotal students: ${totalStudents}`
						);
					} else {
						showAlert(
							'Partial Match Warning',
							`⚠️ Only ${matchedCount}/${totalQueries} queries matched (${matchPercentage}%).\n\n${unmatchedCount} queries not found in statistics file will default to 1 student each.\n\nThis may indicate the statistics file doesn't match this assignment.\n\nTotal students: ${totalStudents}`
						);
					}
				}
				event.target.value = '';
			} catch (error) {
				showAlert('Import Error', 'Error parsing statistics file: ' + error.message);
			}
		};
		reader.readAsText(file);
	}

	// Title editing
	function startEditTitle() {
		editTitle = assignment.name;
		isEditingTitle = true;
	}

	function saveTitle() {
		const newTitle = editTitle.trim();
		if (!newTitle) return;
		appStore.update(s => {
			const updatedAssignments = s.assignments.map(a => {
				if (a.id === assignment.id) return { ...a, name: newTitle };
				return a;
			});
			const newState = { ...s, assignments: updatedAssignments };
			appStore.saveState(newState);
			return newState;
		});
		isEditingTitle = false;
	}

	function cancelEditTitle() {
		isEditingTitle = false;
	}

	function handleTitleKeydown(e) {
		if (e.key === 'Enter') saveTitle();
		if (e.key === 'Escape') cancelEditTitle();
	}

	// Task configuration
	function openTaskModal() {
		taskDescription = assignment.taskDescription || '';
		schemaImageUrl = assignment.schemaImage || '';
		showTaskModal = true;
	}

	function handleSchemaFileUpload(event) {
		const file = event.target.files[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			showAlert('Invalid File', 'Please select an image file (PNG, JPG, GIF, etc.)');
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => {
			schemaImageUrl = e.target.result;
		};
		reader.readAsDataURL(file);
	}

	function saveTaskInfo() {
		appStore.update(s => {
			const updatedAssignments = s.assignments.map(a => {
				if (a.id === assignment.id) {
					return {
						...a,
						taskDescription: taskDescription.trim(),
						schemaImage: schemaImageUrl.trim()
					};
				}
				return a;
			});

			const newState = { ...s, assignments: updatedAssignments };
			appStore.saveState(newState);
			return newState;
		});
		showTaskModal = false;
	}

	function cancelTaskInfo() {
		showTaskModal = false;
	}

	// Modal state
	let modalOpen = false;
	let modalTitle = '';
	let modalMessage = '';

	function showAlert(title, message) {
		modalTitle = title;
		modalMessage = message;
		modalOpen = true;
	}

	function handleModalClose() {
		modalOpen = false;
	}
</script>

<input
	type="file"
	accept=".txt"
	bind:this={statisticsFileInput}
	on:change={handleStatisticsImport}
	style="display: none;"
/>

<div class="page active">
	<header class="assignment-header">
		<button class="secondary-btn" on:click={() => dispatch('back')}>
			← Back to Overview
		</button>
		{#if isEditingTitle}
			<div class="title-edit">
				<input
					class="title-input"
					type="text"
					bind:value={editTitle}
					on:keydown={handleTitleKeydown}
				/>
				<button class="icon-btn" on:click={saveTitle} title="Save">✓</button>
				<button class="icon-btn" on:click={cancelEditTitle} title="Cancel">✕</button>
			</div>
		{:else}
			<h1 class="editable-title" on:dblclick={startEditTitle} title="Double-click to rename">{assignment.name}</h1>
		{/if}
		<div class="header-actions">
			{#if !assignment.hasStatistics}
				<button class="secondary-btn" on:click={handleStatisticsClick}>
					📊 Upload Statistics
				</button>
			{:else}
				<span class="stats-badge" title="Statistics loaded">✓ Statistics</span>
			{/if}
			<button class="secondary-btn" on:click={openTaskModal} title="Add task description and schema">
				📝 Task Info
			</button>
			<div class="feedback-toggle-container">
				<span class="toggle-label" title="Export feedback as reason IDs (e.g., R1, R2, R3)">🔤 IDs</span>
				<label class="apple-toggle">
					<input 
						type="checkbox" 
						bind:checked={useFeedbackDescriptions}
						title={useFeedbackDescriptions ? 'Currently exporting full feedback with reason IDs (e.g., R1: ...)' : 'Currently exporting reason IDs (R1, R2...)'}
					/>
					<span class="slider"></span>
				</label>
				<span class="toggle-label" title="Export feedback as full text with reason IDs">📝 Full</span>
			</div>
			<button class="secondary-btn" on:click={handleShareExport} title="Export project-specific JSON with metadata for sharing and re-importing">
				Share JSON
			</button>
			<button class="primary-btn" on:click={handleWebLabExport} title="Copy WebLab-compatible JSON to clipboard without project metadata and selected reasons">
				Export WebLab JSON
			</button>
		</div>
	</header>

	<div class="tabs">
		<button
			class="tab-btn"
			class:active={activeTab === 'rubric'}
			on:click={() => switchTab('rubric')}
		>
			Rubric
		</button>
		<button
			class="tab-btn"
			class:active={activeTab === 'review'}
			on:click={() => switchTab('review')}
		>
			Review Queries
		</button>
		<button
			class="tab-btn"
			class:active={activeTab === 'statistics'}
			disabled={!assignment.hasStatistics}
			title={assignment.hasStatistics ? 'View statistics' : 'Upload statistics file to enable'}
			on:click={() => switchTab('statistics')}
		>
			📊 Statistics
		</button>
	</div>

	{#if activeTab === 'rubric'}
		<RubricTab {assignment} />
	{:else if activeTab === 'review'}
		<ReviewTab {assignment} {currentQueryIndex} />
	{:else if activeTab === 'statistics'}
		<StatisticsTab {assignment} />
	{/if}
</div>

{#if modalOpen}
	<Modal
		isOpen={modalOpen}
		title={modalTitle}
		message={modalMessage}
		type="alert"
		on:confirm={handleModalClose}
		on:cancel={handleModalClose}
	/>
{/if}

{#if showFilenameModal}
	<Modal
		isOpen={showFilenameModal}
		title="Save File"
		message="Enter a filename for the exported JSON:"
		type="input"
		bind:inputValue={exportFilename}
		inputPlaceholder="filename"
		on:confirm={handleFilenameConfirm}
		on:cancel={handleFilenameCancel}
	/>
{/if}
{#if showTaskModal}
	<div class="modal-overlay" on:click={cancelTaskInfo} on:keydown={(e) => e.key === 'Escape' && cancelTaskInfo()} role="button" tabindex="-1">
		<div class="modal-content task-modal-content" on:click|stopPropagation on:keydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="0">
			<div class="modal-header">
				<h3>Configure Task & Schema</h3>
			</div>
			<div class="modal-body">
				<div class="form-group">
					<label for="task-desc">Task Description</label>
					<textarea
						id="task-desc"
						bind:value={taskDescription}
						placeholder="Enter the task description that will be shown to reviewers..."
						rows="8"
					></textarea>
					<span class="form-hint">This will be displayed above the queries in the Review tab</span>
				</div>
				<div class="form-group">
					<label for="schema-upload">Schema Image</label>
					<div class="schema-upload-row">
						<input
							id="schema-upload"
							type="file"
							accept="image/*"
							class="file-input"
							bind:this={schemaFileInput}
							on:change={handleSchemaFileUpload}
						/>
						<button class="secondary-btn upload-btn" on:click={() => schemaFileInput.click()}>
							📁 Upload Image
						</button>
						<span class="schema-or">or</span>
						<input
							type="text"
							class="schema-url-input"
							bind:value={schemaImageUrl}
							placeholder="https://example.com/schema.png"
						/>
					</div>
					<span class="form-hint">Upload an image file or paste a URL</span>
					{#if schemaImageUrl}
						<button class="danger-btn clear-schema-btn" on:click={() => schemaImageUrl = ''}>
							✕ Clear Image
						</button>
					{/if}
				</div>
				{#if schemaImageUrl}
					<div class="schema-preview">
						<h4>Preview:</h4>
						<img src={schemaImageUrl} alt="Schema preview" on:error={() => schemaImageUrl = ''} />
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="secondary-btn" on:click={cancelTaskInfo}>Cancel</button>
				<button class="primary-btn" on:click={saveTaskInfo}>Save</button>
			</div>
		</div>
	</div>
{/if}