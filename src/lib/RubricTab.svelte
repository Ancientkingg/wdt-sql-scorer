<script>
	import { onMount, onDestroy } from 'svelte';
	import { appStore } from './store.js';
	import Modal from './Modal.svelte';

	export let assignment;

	let showAddForm = false;
	let description = '';
	let points = '';
	
	// Edit state
	let editingIndex = -1;
	let editDescription = '';
	let editPoints = '';

	// Modal state
	let modalOpen = false;
	let modalTitle = '';
	let modalMessage = '';
	let modalType = 'alert';
	let modalCallback = null;

	// Per-reason stats: how many queries/students use each reason
	function calculateReasonStats(reasonId) {
		const affectedQueries = assignment.queries.filter(q => 
			q.selectedReasons.includes(reasonId)
		);
		
		const queriesAffected = affectedQueries.length;
		const studentsAffected = affectedQueries.reduce((sum, q) => {
			return sum + (q.clusterCount || 1);
		}, 0);
		
		return { queriesAffected, studentsAffected };
	}

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

	function startEdit(index) {
		editingIndex = index;
		editDescription = assignment.rubric[index].description;
		editPoints = assignment.rubric[index].points.toString();
	}

	function cancelEdit() {
		editingIndex = -1;
		editDescription = '';
		editPoints = '';
	}

	function saveEdit(index) {
		if (!editDescription.trim()) {
			showAlert('Validation Error', 'Please enter a description');
			return;
		}

		const pointsNum = parseInt(editPoints);
		if (isNaN(pointsNum) || pointsNum < -100 || pointsNum > 100 || pointsNum === 0) {
			showAlert('Validation Error', 'Please enter a valid point value (-100 to 100, excluding 0)');
			return;
		}

		appStore.update(s => {
			const updatedAssignments = s.assignments.map(a => {
				if (a.id === assignment.id) {
					const updatedRubric = [...a.rubric];
					updatedRubric[index] = {
						...updatedRubric[index],
						description: editDescription.trim(),
						points: pointsNum
					};

					return {
						...a,
						rubric: updatedRubric
					};
				}
				return a;
			});

			const newState = { ...s, assignments: updatedAssignments };
			appStore.saveState(newState);
			return newState;
		});

		cancelEdit();
	}

	function moveUp(index) {
		if (index === 0) return;

		appStore.update(s => {
			const updatedAssignments = s.assignments.map(a => {
				if (a.id === assignment.id) {
					const newRubric = [...a.rubric];
					[newRubric[index - 1], newRubric[index]] = [newRubric[index], newRubric[index - 1]];

					// Renumber
					newRubric.forEach((reason, i) => {
						reason.id = `R${i + 1}`;
					});

					// Update query references
					const updatedQueries = a.queries.map(query => {
						const updatedReasons = query.selectedReasons.map(rid => {
							const num = parseInt(rid.substring(1));
							if (num === index + 1) return `R${index}`;
							if (num === index) return `R${index + 1}`;
							return rid;
						}).sort((a, b) => {
							const numA = parseInt(a.substring(1));
							const numB = parseInt(b.substring(1));
							return numA - numB;
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

	function moveDown(index) {
		if (index === assignment.rubric.length - 1) return;

		appStore.update(s => {
			const updatedAssignments = s.assignments.map(a => {
				if (a.id === assignment.id) {
					const newRubric = [...a.rubric];
					[newRubric[index], newRubric[index + 1]] = [newRubric[index + 1], newRubric[index]];

					// Renumber
					newRubric.forEach((reason, i) => {
						reason.id = `R${i + 1}`;
					});

					// Update query references
					const updatedQueries = a.queries.map(query => {
						const updatedReasons = query.selectedReasons.map(rid => {
							const num = parseInt(rid.substring(1));
							if (num === index + 1) return `R${index + 2}`;
							if (num === index + 2) return `R${index + 1}`;
							return rid;
						}).sort((a, b) => {
							const numA = parseInt(a.substring(1));
							const numB = parseInt(b.substring(1));
							return numA - numB;
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

	function saveReason() {
		if (!description.trim()) {
			showAlert('Validation Error', 'Please enter a description');
			return;
		}

		const pointsNum = parseInt(points);
		if (isNaN(pointsNum) || pointsNum < -100 || pointsNum > 100 || pointsNum === 0) {
			showAlert('Validation Error', 'Please enter a valid point value (-100 to 100, excluding 0)');
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

	function copyAsHTMLTable() {
		if (assignment.rubric.length === 0) {
			showAlert('No Rubric', 'Create rubric reasons first before copying.');
			return;
		}

		const stats = assignment.rubric.map(reason => calculateReasonStats(reason.id));
		
		let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';
		html += '<thead><tr>';
		html += '<th style="padding: 8px; background: #f0f0f0;">ID</th>';
		html += '<th style="padding: 8px; background: #f0f0f0;">Description</th>';
		html += '<th style="padding: 8px; background: #f0f0f0;">Points</th>';
		if (assignment.hasStatistics) {
			html += '<th style="padding: 8px; background: #f0f0f0;">Students</th>';
		}
		html += '<th style="padding: 8px; background: #f0f0f0;">Queries</th>';
		html += '</tr></thead><tbody>';
		
		assignment.rubric.forEach((reason, index) => {
			html += '<tr>';
			html += `<td style="padding: 8px;">${reason.id}</td>`;
			html += `<td style="padding: 8px;">${reason.description}</td>`;
			html += `<td style="padding: 8px;">${reason.points > 0 ? '+' : ''}${reason.points}</td>`;
			if (assignment.hasStatistics) {
				html += `<td style="padding: 8px;">${stats[index].studentsAffected}</td>`;
			}
			html += `<td style="padding: 8px;">${stats[index].queriesAffected}</td>`;
			html += '</tr>';
		});
		
		html += '</tbody></table>';
		
		try {
			navigator.clipboard.write([
				new ClipboardItem({
					'text/html': new Blob([html], { type: 'text/html' }),
					'text/plain': new Blob([html], { type: 'text/plain' })
				})
			]).then(() => {
				showAlert('Copied!', 'Rubric table copied to clipboard. You can now paste it into Word.');
			}).catch(() => {
				fallbackCopyHTML(html);
			});
		} catch (err) {
			fallbackCopyHTML(html);
		}
	}

	function copyAsTSV() {
		if (assignment.rubric.length === 0) {
			showAlert('No Rubric', 'Create rubric reasons first before copying.');
			return;
		}

		const stats = assignment.rubric.map(reason => calculateReasonStats(reason.id));
		
		let tsv = 'ID\tDescription\tPoints';
		if (assignment.hasStatistics) {
			tsv += '\tStudents';
		}
		tsv += '\tQueries\n';
		
		assignment.rubric.forEach((reason, index) => {
			tsv += `${reason.id}\t${reason.description}\t${reason.points > 0 ? '+' : ''}${reason.points}`;
			if (assignment.hasStatistics) {
				tsv += `\t${stats[index].studentsAffected}`;
			}
			tsv += `\t${stats[index].queriesAffected}\n`;
		});
		
		navigator.clipboard.writeText(tsv).then(() => {
			showAlert('Copied!', 'Rubric table copied as tab-separated values. Paste into Word and convert to table (Insert > Table > Convert Text to Table).');
		}).catch((err) => {
			showAlert('Copy Failed', 'Could not copy to clipboard: ' + err.message);
		});
	}

	function fallbackCopyHTML(html) {
		// ClipboardItem not supported, use execCommand
		const textarea = document.createElement('textarea');
		textarea.value = html;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		try {
			document.execCommand('copy');
			showAlert('Copied!', 'Rubric HTML copied to clipboard. You can paste it into Word.');
		} catch (err) {
			showAlert('Copy Failed', 'Could not copy to clipboard. Please try again.');
		}
		document.body.removeChild(textarea);
	}

	let showCopyMenu = false;
	let copyMenuContainer;

	function toggleCopyMenu() {
		showCopyMenu = !showCopyMenu;
	}

	function handleCopyOption(format) {
		showCopyMenu = false;
		if (format === 'html') {
			copyAsHTMLTable();
		} else if (format === 'tsv') {
			copyAsTSV();
		}
	}

	function handleClickOutside(event) {
		if (copyMenuContainer && !copyMenuContainer.contains(event.target)) {
			showCopyMenu = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
	});

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="tab-content active">
	<div class="rubric-container">
		<div class="rubric-header">
			<h2>Grading Rubric</h2>
			<div class="rubric-actions">
				{#if assignment.rubric.length > 0}
					<div class="copy-menu-container" bind:this={copyMenuContainer}>
						<button class="secondary-btn" on:click={toggleCopyMenu}>
							📋 Copy as Table {showCopyMenu ? '▲' : '▼'}
						</button>
						{#if showCopyMenu}
							<div class="copy-menu">
								<button class="menu-item" on:click={() => handleCopyOption('html')}>
									<span class="menu-icon">📄</span>
									<div class="menu-text">
										<div class="menu-title">Copy as Formatted Table</div>
										<div class="menu-desc">Paste directly into Word</div>
									</div>
								</button>
								<button class="menu-item" on:click={() => handleCopyOption('tsv')}>
									<span class="menu-icon">📊</span>
									<div class="menu-text">
										<div class="menu-title">Copy as Tab-Separated</div>
										<div class="menu-desc">Convert to table in Word</div>
									</div>
								</button>
							</div>
						{/if}
					</div>
				{/if}
				<button class="primary-btn" on:click={showForm}>+ Add Reason</button>
			</div>
		</div>

		<div id="rubric-list">
			{#if assignment.rubric.length === 0}
				{#if showAddForm}
					<!-- Add form replaces empty state when no reasons exist -->
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
							<label for="reason-points">Points:</label>
							<input
								type="number"
								id="reason-points"
								min="-100"
								max="100"
								placeholder="e.g., -10 (deduction) or +5 (bonus)"
								bind:value={points}
							/>
						</div>
						<div class="form-actions">
							<button class="primary-btn" on:click={saveReason}>Save Reason</button>
							<button class="secondary-btn" on:click={hideForm}>Cancel</button>
						</div>
					</div>
				{:else}
					<p class="empty-state">
						No rubric reasons yet. Add your first reason to get started.
					</p>
				{/if}
			{:else}
				{#each assignment.rubric as reason, index (reason.id)}
					<div class="reason-item">
						{#if editingIndex === index}
							<!-- Edit Mode -->
							<div class="reason-edit-form">
								<div class="reason-id">{reason.id}</div>
								<div class="edit-form-content">
									<div class="form-group">
										<label for="edit-description-{index}">Description:</label>
										<textarea
											id="edit-description-{index}"
											rows="3"
											bind:value={editDescription}
										></textarea>
									</div>
									<div class="form-group">
										<label for="edit-points-{index}">Points:</label>
										<input
											type="number"
											id="edit-points-{index}"
											min="1"
											max="100"
											bind:value={editPoints}
										/>
									</div>
									<div class="form-actions">
										<button class="primary-btn" on:click={() => saveEdit(index)}>
											Save
										</button>
										<button class="secondary-btn" on:click={cancelEdit}>
											Cancel
										</button>
									</div>
								</div>
							</div>
						{:else}
							<!-- Normal View -->
							<div class="reason-content">
								<div class="reason-id">{reason.id}</div>
								<div class="reason-description">{reason.description}</div>
								<div class="reason-points" class:positive-points={reason.points > 0}>{reason.points > 0 ? '+' : ''}{reason.points} points</div>
								{#if assignment.queries.length > 0}
									{@const stats = calculateReasonStats(reason.id)}
								<div class="reason-stats" class:disabled={!assignment.hasStatistics}>
									<span 
										class="stat-item" 
										title={assignment.hasStatistics ? 'Number of students affected' : 'Upload statistics file to view'}
									>
										👥 {assignment.hasStatistics ? stats.studentsAffected : '—'}
									</span>
									<span 
										class="stat-item" 
										title={assignment.hasStatistics ? 'Number of queries affected' : 'Upload statistics file to view'}
									>
											📝 {stats.queriesAffected}
										</span>
									</div>
								{/if}
							</div>
							<div class="reason-actions">
								<div class="reorder-buttons">
									<button 
										class="icon-btn" 
										on:click={() => moveUp(index)}
										disabled={index === 0}
										title="Move up"
									>
										↑
									</button>
									<button 
										class="icon-btn" 
										on:click={() => moveDown(index)}
										disabled={index === assignment.rubric.length - 1}
										title="Move down"
									>
										↓
									</button>
								</div>
								<button class="secondary-btn" on:click={() => startEdit(index)}>
									Edit
								</button>
								<button class="danger-btn" on:click={() => deleteReason(index)}>
									Delete
								</button>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		{#if showAddForm && assignment.rubric.length > 0}
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
					<label for="reason-points">Points:</label>
					<input
						type="number"
						id="reason-points"
						min="-100"
						max="100"
						placeholder="e.g., -10 (deduction) or +5 (bonus)"
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
