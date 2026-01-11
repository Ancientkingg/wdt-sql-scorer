<script>
	import { createEventDispatcher } from 'svelte';
	import { appStore } from './store.js';
	import RubricTab from './RubricTab.svelte';
	import ReviewTab from './ReviewTab.svelte';

	export let assignment;
	export let currentQueryIndex;

	const dispatch = createEventDispatcher();

	let activeTab = 'rubric';

	function switchTab(tabName) {
		activeTab = tabName;
	}

	function handleExport() {
		const exportData = {
			...assignment.originalData,
			queries: assignment.queries.map((query, index) => {
				let score = 100;
				query.selectedReasons.forEach(reasonId => {
					const reason = assignment.rubric.find(r => r.id === reasonId);
					if (reason) {
						score -= reason.points;
					}
				});
				score = Math.max(0, score);

				const feedback = query.selectedReasons.length > 0
					? query.selectedReasons.join(', ')
					: query.originalFeedback;

				return {
					query: query.query,
					points: score,
					feedback: feedback
				};
			})
		};

		const dataStr = JSON.stringify(exportData, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `${assignment.name}_graded.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

<div class="page active">
	<header>
		<button class="secondary-btn" on:click={() => dispatch('back')}>
			← Back to Overview
		</button>
		<h1>{assignment.name}</h1>
		<div class="header-actions">
			<button class="primary-btn" on:click={handleExport}>
				Export JSON
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
	</div>

	{#if activeTab === 'rubric'}
		<RubricTab {assignment} />
	{:else if activeTab === 'review'}
		<ReviewTab {assignment} {currentQueryIndex} />
	{/if}
</div>
