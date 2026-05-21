import { state } from './state';

let loadingOverlay: HTMLElement | null = null;

import { t } from '../utils/i18n';

export function showLoading(message?: string): void {
	const msg = message || t('loading');
	state.loading = true;
	state.loadingMessage = msg;
	state.loadingProgress = 0;

	if (!loadingOverlay) {
		loadingOverlay = createLoadingOverlay();
		document.body.appendChild(loadingOverlay);
	}

	updateLoadingUI();
}

export function updateLoadingProgress(progress: number, message?: string): void {
	state.loadingProgress = Math.min(100, Math.max(0, progress));
	if (message) state.loadingMessage = message;
	updateLoadingUI();
}

export function hideLoading(): void {
	state.loading = false;
	state.loadingProgress = 0;
	state.loadingMessage = '';

	if (loadingOverlay) {
		loadingOverlay.remove();
		loadingOverlay = null;
	}
}

function createLoadingOverlay(): HTMLElement {
	const overlay = document.createElement('div');
	overlay.className = 'loading-overlay';
	overlay.innerHTML = `
		<div class="loading-content">
			<div class="loading-spinner"></div>
			<div class="loading-message" id="loading-message">${state.loadingMessage}</div>
			<div class="loading-progress">
				<div class="loading-progress-bar" id="loading-progress-bar" style="width: 0%"></div>
			</div>
			<div class="loading-percentage" id="loading-percentage">0%</div>
		</div>
	`;
	return overlay;
}

function updateLoadingUI(): void {
	if (!loadingOverlay) return;

	const messageEl = loadingOverlay.querySelector('#loading-message');
	const progressBarEl = loadingOverlay.querySelector('#loading-progress-bar');
	const percentageEl = loadingOverlay.querySelector('#loading-percentage');

	if (messageEl) messageEl.textContent = state.loadingMessage;
	if (progressBarEl) (progressBarEl as HTMLElement).style.width = `${state.loadingProgress}%`;
	if (percentageEl) percentageEl.textContent = `${state.loadingProgress}%`;
}
