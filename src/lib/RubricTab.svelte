<script>
	import { appStore } from './store.js';
	import Modal from './Modal.svelte';

	export let assignment;

	let showAddForm = false;
	let description = '';
	let points = '';

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

	function showForm() {
		showAddForm = true;
		description = '';
		points = '';
	}

	function hideForm() {
		showAddForm = false;
	}

	function saveReason() {
		if (!description.trim()) {
			showAlert('Validation Error', 'Please enter a description');
			return;
		}

		const pointsNum = parseInt(points);
		if (!pointsNum || pointsNum < 1 || pointsNum > 100) {
			showAlert('Validation Error', 'Please enter a valid point value (1-100)');
			return;
		}

		const reasonNumber = assignment.rubric.length + 1;

		appStore.update(s => {
			const updatedAssignments = s.assignments.map(a => {
				if (a.id === assignment.id) {
					return {
						...a,
						rubric: [...a.rubric, {
							id: `R${reasonNumber}`,
							description: description.trim(),
							points: pointsNum
						}]
					};
				}
				return a;
			});

			const newState = { ...s, assignments: updatedAssignments };
			appStore.saveState(newState);
			return newState;
		});

		hideForm();
	}

	function deleteReason(index) {
		showConfirm(
			'Delete Reason',
			'Are you sure you want to delete this reason? This will also remove it from all graded queries.',
			() => {
				appStore.update(s => {
				const updatedAssignments = s.assignments.map(a => {
					if (a.id === assignment.id) {
						const deletedReasonId = a.rubric[index].id;
						const newRubric = [...a.rubric];
						newRubric.splice(index, 1);

						// Renumber remaining reasons
						newRubric.forEach((reason, i) => {
							reason.id = `R${i + 1}`;
						});

						// Update all queries to remove/update references
						const updatedQueries = a.queries.map(query => {
							const updatedReasons = query.selectedReasons
								.filter(rid => rid !== deletedReasonId)
								.map(rid => {
									const num = parseInt(rid.substring(1));
									const deletedNum = parseInt(deletedReasonId.substring(1));
									if (num > deletedNum) {
										return `R${num - 1}`;
									}
									return rid;
								});

							return {
								...query,
								selectedReasons: updatedReasons
							};
						});

						return {
							...a,
							rubric: newRubric,
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
		);
	}
</script>

<div class="tab-content active">
	<div class="rubric-container">
		<div class="rubric-header">
			<h2>Grading Rubric</h2>
			<button class="primary-btn" on:click={showForm}>+ Add Reason</button>
		</div>

		<div id="rubric-list">
			{#if assignment.rubric.length === 0}
				<p class="empty-state">
					No rubric reasons yet. Add your first reason to get started.
				</p>
			{:else}
				{#each assignment.rubric as reason, index (reason.id)}
					<div class="reason-item">
						<div class="reason-content">
							<div class="reason-id">{reason.id}</div>
							<div class="reason-description">{reason.description}</div>
							<div class="reason-points">-{reason.points} points</div>
						</div>
						<div class="reason-actions">
							<button class="danger-btn" on:click={() => deleteReason(index)}>
								Delete
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		{#if showAddForm}
			<div class="form-container">
				<h3>Add New Reason</h3>
				<div class="form-group">
					<label for="reason-description">Description:</label>
					<textarea
						id="reason-description"
						rows="3"
						placeholder="Enter reason description..."
						bind:value={description}
					></textarea>
				</div>
				<div class="form-group">
					<label for="reason-points">Points Deducted:</label>
					<input
						type="number"
						id="reason-points"
						min="1"
						max="100"
						placeholder="e.g., 10"
						bind:value={points}
					/>
				</div>
				<div class="form-actions">
					<button class="primary-btn" on:click={saveReason}>Save Reason</button>
					<button class="secondary-btn" on:click={hideForm}>Cancel</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<Modal
	bind:isOpen={modalOpen}
	title={modalTitle}
	message={modalMessage}
	type={modalType}
	on:confirm={handleModalConfirm}
	on:cancel={handleModalCancel}
/>
