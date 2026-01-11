<script>
	import { onMount, onDestroy } from 'svelte';
	import { appStore } from './store.js';
	import { isCorrectQuery, calculateQueryScore, highlightSQL } from './utils.js';

	export let assignment;
	export let currentQueryIndex;

	let state = { currentQueryIndex };

	$: query = assignment.queries[state.currentQueryIndex];
	$: reviewableQueries = assignment.queries.filter(q => !isCorrectQuery(q));
	$: totalQueries = reviewableQueries.length;
	$: gradedQueries = reviewableQueries.filter(q => q.graded).length;
	$: displayIndex = assignment.queries
		.slice(0, state.currentQueryIndex)
		.filter(q => !isCorrectQuery(q)).length + 1;
	$: correctQuery = assignment.queries.find(q => isCorrectQuery(q));
	$: score = query ? calculateQueryScore(query, assignment.rubric) : 100;
	$: hasPrev = checkHasPrev();
	$: hasNext = checkHasNext();

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

	function handleKeydown(event) {
		// Don't handle shortcuts when typing in form fields
		if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

		// Number keys 1-6 to toggle reasons
		if (event.key >= '1' && event.key <= '6') {
			const reasonIndex = parseInt(event.key) - 1;
			if (reasonIndex < assignment.rubric.length) {
				const reasonId = assignment.rubric[reasonIndex].id;
				toggleReason(reasonId);
				event.preventDefault();
			}
		}

		// Arrow keys for navigation
		if (event.key === 'ArrowLeft') {
			previousQuery();
			event.preventDefault();
		} else if (event.key === 'ArrowRight') {
			nextQuery();
			event.preventDefault();
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="tab-content active">
	<div class="review-container">
		<div class="review-header">
			<div class="progress-info">
				<h2>Query Review</h2>
				<div class="progress-stats">
					<span>Query {displayIndex}/{totalQueries}</span>
					<span class="separator">•</span>
					<span>Graded: {gradedQueries}/{totalQueries}</span>
				</div>
			</div>
		</div>

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
					</div>
				</div>
				<pre><code class="sql">{@html highlightSQL(query.query)}</code></pre>
			</div>

			<div class="grading-section">
				<h3>Apply Rubric Reasons <span class="keyboard-hint">(Press 1-6 to toggle)</span></h3>
				<div id="reasons-checkboxes">
					{#if assignment.rubric.length === 0}
						<p class="empty-state">Create rubric reasons first to grade queries.</p>
					{:else}
						{#each assignment.rubric as reason (reason.id)}
							<label class="reason-checkbox">
								<input
									type="checkbox"
									value={reason.id}
									checked={query.selectedReasons.includes(reason.id)}
									on:change={() => toggleReason(reason.id)}
								/>
								<div class="reason-checkbox-content">
									<div class="reason-checkbox-id">{reason.id}</div>
									<div class="reason-checkbox-desc">{reason.description}</div>
									<div class="reason-checkbox-points">-{reason.points} points</div>
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
