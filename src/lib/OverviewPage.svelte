<script>
	import { createEventDispatcher } from 'svelte';

	export let assignments = [];

	const dispatch = createEventDispatcher();

	function handleOpenAssignment(id) {
		dispatch('open', id);
	}

	function handleDeleteAssignment(id, event) {
		event.stopPropagation();
		dispatch('delete', id);
	}
</script>

<div class="page active">
	<header>
		<h1>SQL Query Reviewer</h1>
		<div class="header-actions">
			<button class="primary-btn" on:click={() => dispatch('import')}>
				Import JSON File
			</button>
			<button
				class="secondary-btn"
				on:click={() => dispatch('bulkExport')}
				disabled={assignments.length === 0}
				title={assignments.length === 0 ? 'Import at least one assignment to export' : 'Export all assignments as a ZIP file'}
			>
				Bulk Export ZIP
			</button>
		</div>
	</header>

	<div class="assignments-container">
		<h2>Assignments</h2>
		<div id="assignments-list">
			{#if assignments.length === 0}
				<p class="empty-state">
					No assignments yet. Import a JSON file to get started.
				</p>
			{:else}
				{#each assignments as assignment (assignment.id)}
					{@const totalQueries = assignment.queries.length}
					{@const gradedQueries = assignment.queries.filter(q => q.graded).length}
					{@const rubricReasons = assignment.rubric.length}

					<div
						class="assignment-card"
						on:click={() => handleOpenAssignment(assignment.id)}
						on:keydown={(e) => e.key === 'Enter' && handleOpenAssignment(assignment.id)}
						role="button"
						tabindex="0"
					>
						<div class="assignment-card-header">
							<div>
								<div class="assignment-name">{assignment.name}</div>
								<div class="assignment-schema">Schema: {assignment.schema}</div>
							</div>
							<button
								class="danger-btn delete-btn"
								on:click={(e) => handleDeleteAssignment(assignment.id, e)}
							>
								Delete
							</button>
						</div>
						<div class="assignment-stats">
							<span class="stat-badge">📝 {totalQueries} queries</span>
							<span class="stat-badge">✅ {gradedQueries} graded</span>
							<span class="stat-badge">📋 {rubricReasons} rubric reasons</span>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
