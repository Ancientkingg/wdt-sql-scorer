<script>
	import { onMount, onDestroy } from 'svelte';
	import { appStore } from './store.js';
	import { isCorrectQuery, calculateQueryScore, highlightSQL } from './utils.js';

	export let assignment;
	export let currentQueryIndex;

	let state = { currentQueryIndex };
	let taskExpanded = false;
	let taskSectionRef;
	let splitLayout = false;
	let paneWidth = 66.66;
	let isDragging = false;
	let containerRef;

	$: query = assignment.queries[state.currentQueryIndex];
	$: reviewableQueries = assignment.queries.filter(q => !isCorrectQuery(q));
	$: totalQueries = reviewableQueries.length;
	$: gradedQueries = reviewableQueries.filter(q => q.graded).length;
	$: displayIndex = assignment.queries
		.slice(0, state.currentQueryIndex)
		.filter(q => !isCorrectQuery(q)).length + 1;
	$: correctQuery = assignment.queries.find(q => isCorrectQuery(q));
	$: correctStudentCount = assignment.queries
		.filter(q => isCorrectQuery(q))
		.reduce((sum, q) => sum + (q.clusterCount || 1), 0);
	$: totalStudentCount = assignment.queries
		.reduce((sum, q) => sum + (q.clusterCount || 1), 0);
	$: score = query ? calculateQueryScore(query, assignment.rubric) : 100;
	$: hasPrev = checkHasPrev();
	$: hasNext = checkHasNext();
	$: keyboardHint = getKeyboardHint(assignment.rubric.length);

	function formatReasonPoints(pointsValue) {
		const pointsNumber = Number(pointsValue);
		if (Number.isNaN(pointsNumber)) return String(pointsValue);

		return pointsNumber > 0 ? `+${pointsNumber}` : `${pointsNumber}`;
	}

	function checkHasPrev() {
		for (let i = state.currentQueryIndex - 1; i >= 0; i--) {
			if (!isCorrectQuery(assignment.queries[i])) {
				return true;
			}
		}
		return false;
	}

	function checkHasNext() {
		for (let i = state.currentQueryIndex + 1; i < assignment.queries.length; i++) {
			if (!isCorrectQuery(assignment.queries[i])) {
				return true;
			}
		}
		return false;
	}

	function previousQuery() {
		let newIndex = state.currentQueryIndex - 1;
		while (newIndex >= 0 && isCorrectQuery(assignment.queries[newIndex])) {
			newIndex--;
		}

		if (newIndex >= 0) {
			state.currentQueryIndex = newIndex;
			appStore.update(s => ({ ...s, currentQueryIndex: newIndex }));
		}
	}

	function nextQuery() {
		let newIndex = state.currentQueryIndex + 1;
		while (newIndex < assignment.queries.length && isCorrectQuery(assignment.queries[newIndex])) {
			newIndex++;
		}

		if (newIndex < assignment.queries.length) {
			state.currentQueryIndex = newIndex;
			appStore.update(s => ({ ...s, currentQueryIndex: newIndex }));
		}
	}

	function toggleReason(reasonId) {
		appStore.update(s => {
			const updatedAssignments = s.assignments.map(a => {
				if (a.id === assignment.id) {
					const updatedQueries = a.queries.map((q, idx) => {
						if (idx === state.currentQueryIndex) {
							const index = q.selectedReasons.indexOf(reasonId);
							let newReasons;
							if (index > -1) {
								newReasons = q.selectedReasons.filter(r => r !== reasonId);
							} else {
								newReasons = [...q.selectedReasons, reasonId];
							}

							// Sort reasons numerically
							newReasons.sort((a, b) => {
								const numA = parseInt(a.substring(1));
								const numB = parseInt(b.substring(1));
								return numA - numB;
							});

							return {
								...q,
								selectedReasons: newReasons,
								graded: true
							};
						}
						return q;
					});

					return {
						...a,
						queries: updatedQueries
					};
				}
				return a;
			});

			const newState = { ...s, assignments: updatedAssignments };
			appStore.saveState(newState);
			return newState;
		});
	}

	function getKeyboardHint(rubricLength) {
		if (rubricLength === 0) return '';
		if (rubricLength === 1) return '(Press 1 to toggle)';
		if (rubricLength <= 9) return `(Press 1-${rubricLength} to toggle)`;
		return '(Press 1-9, 0 to toggle)';
	}

	function getKeyForIndex(index) {
		if (index < 9) return (index + 1).toString();
		if (index === 9) return '0';
		return null;
	}

	function handleKeydown(event) {
		// Skip form fields for keyboard shortcuts
		if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

		// Keys 1-9, 0 toggle rubric items (up to 10)
		if ((event.key >= '1' && event.key <= '9') || event.key === '0') {
			const reasonIndex = event.key === '0' ? 9 : parseInt(event.key) - 1;
			if (reasonIndex < assignment.rubric.length) {
				const reasonId = assignment.rubric[reasonIndex].id;
				toggleReason(reasonId);
				event.preventDefault();
			}
		}

		// Arrow keys for prev/next query
		if (event.key === 'ArrowLeft') {
			previousQuery();
			event.preventDefault();
		} else if (event.key === 'ArrowRight') {
			nextQuery();
			event.preventDefault();
		}
	}

	function toggleTaskSection() {
		taskExpanded = !taskExpanded;
		if (taskExpanded && taskSectionRef) {
			setTimeout(() => {
				taskSectionRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 100);
		}
	}

	function toggleLayout() {
		splitLayout = !splitLayout;
		localStorage.setItem('reviewLayoutMode', splitLayout ? 'split' : 'default');
	}

	function startDrag(event) {
		if (!containerRef) return;
		isDragging = true;
		event.preventDefault();
	}

	function handleDrag(event) {
		if (!isDragging || !containerRef) return;
		const containerRect = containerRef.getBoundingClientRect();
		const newWidth = ((event.clientX - containerRect.left) / containerRect.width) * 100;
		// Clamp pane width to 40-80%
		if (newWidth >= 40 && newWidth <= 80) {
			paneWidth = newWidth;
			localStorage.setItem('reviewPaneWidth', paneWidth.toString());
		}
	}

	function stopDrag() {
		isDragging = false;
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		document.addEventListener('mousemove', handleDrag);
		document.addEventListener('mouseup', stopDrag);
		
		// Restore saved layout prefs
		const savedLayout = localStorage.getItem('reviewLayoutMode');
		if (savedLayout === 'split') {
			splitLayout = true;
		}
		const savedWidth = localStorage.getItem('reviewPaneWidth');
		if (savedWidth) {
			paneWidth = parseFloat(savedWidth);
		}
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
		document.removeEventListener('mousemove', handleDrag);
		document.removeEventListener('mouseup', stopDrag);
	});
</script>

<div class="tab-content active">
	<div class="review-container" class:split-layout={splitLayout} bind:this={containerRef}>
		<div class="review-header">
			<div class="progress-info">
				<h2>Query Review</h2>
				<div class="progress-stats">
					<span>Query {displayIndex}/{totalQueries}</span>
					<span class="separator">•</span>
					<span>Graded: {gradedQueries}/{totalQueries}</span>
					{#if assignment.hasStatistics}
						<span class="separator">•</span>
						<span 
							class="stats-highlight" 
							title="{correctStudentCount} students with correct query out of {totalStudentCount} total"
						>
							✓ {correctStudentCount} students correct
						</span>
					{/if}
				</div>
			</div>
			<button class="layout-toggle-btn" on:click={toggleLayout} title="Toggle split layout">
				{splitLayout ? '⬌ Single' : '⬍⬍ Split'}
			</button>
		</div>

		{#if splitLayout}
			<div class="split-panes">
				<div class="left-pane" style="width: {paneWidth}%">
					{#if assignment.taskDescription || assignment.schemaImage}
						<div class="task-info-section" bind:this={taskSectionRef}>
							<button class="task-toggle" on:click={toggleTaskSection}>
								<span class="toggle-icon">{taskExpanded ? '▼' : '▶'}</span>
								<span class="task-title">Task & Schema</span>
							</button>
							{#if taskExpanded}
								<div class="task-content">
									{#if assignment.taskDescription}
										<div class="task-description">
											<h4>Task Description</h4>
											<div class="task-text">{assignment.taskDescription}</div>
										</div>
									{/if}
									{#if assignment.schemaImage}
										<div class="schema-display">
											<h4>Database Schema</h4>
											<img src={assignment.schemaImage} alt="Database Schema" class="schema-image" />
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/if}

					{#if correctQuery}
						<div class="query-display correct-query">
							<div class="query-header">
								<h3>✓ Correct Query</h3>
							</div>
							<pre><code class="sql">{@html highlightSQL(correctQuery.query)}</code></pre>
						</div>
					{/if}

					{#if query}
						<div class="query-display">
							<div class="query-header">
								<h3>Query {displayIndex}</h3>
								<div class="score-display">
									<span>Score: <strong>{score}</strong> points</span>
									<span 
										class="query-stat" 
										class:disabled={!assignment.hasStatistics}
										title={assignment.hasStatistics 
											? `This query represents ${query.clusterCount} student${query.clusterCount !== 1 ? 's' : ''}` 
											: 'Upload statistics file to view student count'}
									>
										👥 {assignment.hasStatistics ? query.clusterCount : '—'}
									</span>
								</div>
							</div>
							<pre><code class="sql">{@html highlightSQL(query.query)}</code></pre>
						</div>
					{/if}
				</div>

				<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
				<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
				<div class="divider" on:mousedown={startDrag} role="separator" tabindex="0"></div>

				<div class="right-pane" style="width: {100 - paneWidth}%">
					{#if query}
						<div class="grading-section">
							<h3>Apply Rubric Reasons {#if keyboardHint}<span class="keyboard-hint">{keyboardHint}</span>{/if}</h3>
							<div id="reasons-checkboxes">
								{#if assignment.rubric.length === 0}
									<p class="empty-state">Create rubric reasons first to grade queries.</p>
								{:else}
									{#each assignment.rubric as reason, index (reason.id)}
										<label class="reason-checkbox">
											{#if getKeyForIndex(index)}
												<div class="keyboard-shortcut-badge">{getKeyForIndex(index)}</div>
											{/if}
											<input
												type="checkbox"
												value={reason.id}
												checked={query.selectedReasons.includes(reason.id)}
												on:change={() => toggleReason(reason.id)}
											/>
											<div class="reason-checkbox-content">
												<div class="reason-checkbox-id">{reason.id}</div>
												<div class="reason-checkbox-desc">{reason.description}</div>
												<div class="reason-checkbox-points">{formatReasonPoints(reason.points)} points</div>
											</div>
										</label>
									{/each}
								{/if}
							</div>

							<div class="feedback-preview">
								<h4>Current Feedback</h4>
								<div class="feedback-box">
									{#if query.selectedReasons.length === 0}
										No reasons selected
									{:else}
										{query.selectedReasons.join(', ')}
									{/if}
								</div>
							</div>
						</div>

						<div class="navigation-buttons">
							<button class="secondary-btn" on:click={previousQuery} disabled={!hasPrev}>
								← Previous Query
							</button>
							<button class="primary-btn" on:click={nextQuery} disabled={!hasNext}>
								Next Query →
							</button>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			{#if assignment.taskDescription || assignment.schemaImage}
			<div class="task-info-section" bind:this={taskSectionRef}>
				<button class="task-toggle" on:click={toggleTaskSection}>
					<span class="toggle-icon">{taskExpanded ? '▼' : '▶'}</span>
					<span class="task-title">Task & Schema</span>
				</button>
				{#if taskExpanded}
					<div class="task-content">
						{#if assignment.taskDescription}
							<div class="task-description">
								<h4>Task Description</h4>
								<div class="task-text">{assignment.taskDescription}</div>
							</div>
						{/if}
						{#if assignment.schemaImage}
							<div class="schema-display">
								<h4>Database Schema</h4>
								<img src={assignment.schemaImage} alt="Database Schema" class="schema-image" />
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if correctQuery}
			<div class="query-display correct-query">
				<div class="query-header">
					<h3>✓ Correct Query</h3>
				</div>
				<pre><code class="sql">{@html highlightSQL(correctQuery.query)}</code></pre>
			</div>
		{/if}

		{#if query}
			<div class="query-display">
				<div class="query-header">
					<h3>Query {displayIndex}</h3>
					<div class="score-display">
						<span>Score: <strong>{score}</strong> points</span>
						<span 
							class="query-stat" 
							class:disabled={!assignment.hasStatistics}
							title={assignment.hasStatistics 
								? `This query represents ${query.clusterCount} student${query.clusterCount !== 1 ? 's' : ''}` 
								: 'Upload statistics file to view student count'}
						>
							👥 {assignment.hasStatistics ? query.clusterCount : '—'}
						</span>
					</div>
				</div>
				<pre><code class="sql">{@html highlightSQL(query.query)}</code></pre>
			</div>

			<div class="grading-section">
				<h3>Apply Rubric Reasons {#if keyboardHint}<span class="keyboard-hint">{keyboardHint}</span>{/if}</h3>
				<div id="reasons-checkboxes">
					{#if assignment.rubric.length === 0}
						<p class="empty-state">Create rubric reasons first to grade queries.</p>
					{:else}
						{#each assignment.rubric as reason, index (reason.id)}
							<label class="reason-checkbox">
								{#if getKeyForIndex(index)}
									<div class="keyboard-shortcut-badge">{getKeyForIndex(index)}</div>
								{/if}
								<input
									type="checkbox"
									value={reason.id}
									checked={query.selectedReasons.includes(reason.id)}
									on:change={() => toggleReason(reason.id)}
								/>
								<div class="reason-checkbox-content">
									<div class="reason-checkbox-id">{reason.id}</div>
									<div class="reason-checkbox-desc">{reason.description}</div>
									<div class="reason-checkbox-points">{formatReasonPoints(reason.points)} points</div>
								</div>
							</label>
						{/each}
					{/if}
				</div>

				<div class="feedback-preview">
					<h4>Current Feedback</h4>
					<div class="feedback-box">
						{#if query.selectedReasons.length === 0}
							No reasons selected
						{:else}
							{query.selectedReasons.join(', ')}
						{/if}
					</div>
				</div>
			</div>

			<div class="navigation-buttons">
				<button class="secondary-btn" on:click={previousQuery} disabled={!hasPrev}>
					← Previous Query
				</button>
				<button class="primary-btn" on:click={nextQuery} disabled={!hasNext}>
					Next Query →
				</button>
			</div>
		{/if}
	{/if}
	</div>
</div>
