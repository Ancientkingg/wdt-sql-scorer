<script>
	import { createEventDispatcher } from 'svelte';

	export let isOpen = false;
	export let title = '';
	export let message = '';
	export let type = 'alert'; // 'alert' or 'confirm'

	const dispatch = createEventDispatcher();

	function handleConfirm() {
		dispatch('confirm');
		close();
	}

	function handleCancel() {
		dispatch('cancel');
		close();
	}

	function close() {
		isOpen = false;
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			handleCancel();
		} else if (event.key === 'Enter' && type === 'alert') {
			handleConfirm();
		}
	}
</script>

{#if isOpen}
	<div class="modal-overlay" on:click={handleCancel} on:keydown={handleKeydown} role="button" tabindex="-1">
		<div class="modal-content" on:click|stopPropagation on:keydown={handleKeydown} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
			<div class="modal-header">
				<h3 id="modal-title">{title}</h3>
			</div>
			<div class="modal-body">
				<p>{message}</p>
			</div>
			<div class="modal-footer">
				{#if type === 'confirm'}
					<button class="secondary-btn" on:click={handleCancel}>Cancel</button>
					<button class="danger-btn" on:click={handleConfirm}>Confirm</button>
				{:else}
					<button class="primary-btn" on:click={handleConfirm}>OK</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: var(--modal-overlay-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-content {
		background: var(--bg-secondary);
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		min-width: 400px;
		max-width: 500px;
		animation: slideUp 0.2s ease-out;
	}

	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	.modal-body {
		padding: 1.5rem;
	}

	.modal-body p {
		margin: 0;
		color: var(--text-primary);
		line-height: 1.6;
	}

	.modal-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-color);
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	@media (max-width: 480px) {
		.modal-content {
			min-width: unset;
			max-width: 90%;
			margin: 1rem;
		}
	}
</style>
