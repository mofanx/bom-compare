export function initPanelDivider(): void {
	const divider = document.getElementById('panel-divider')!;
	const container = document.querySelector('.panels-container') as HTMLElement;
	const leftPanel = document.getElementById('panel-left')!;
	const rightPanel = document.getElementById('panel-right')!;

	let isDragging = false;
	let startX = 0;
	let startLeftWidth = 0;

	divider.addEventListener('mousedown', (e) => {
		isDragging = true;
		startX = e.clientX;
		startLeftWidth = leftPanel.offsetWidth;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
		e.preventDefault();
	});

	document.addEventListener('mousemove', (e) => {
		if (!isDragging) return;
		const dx = e.clientX - startX;
		const containerWidth = container.offsetWidth - divider.offsetWidth;
		const newLeftWidth = Math.max(200, Math.min(containerWidth - 200, startLeftWidth + dx));
		const leftPercent = (newLeftWidth / containerWidth) * 100;

		leftPanel.style.flex = `0 0 ${leftPercent}%`;
		rightPanel.style.flex = `1 1 0`;
	});

	document.addEventListener('mouseup', () => {
		if (!isDragging) return;
		isDragging = false;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	});
}

export function initSyncScroll(): void {
	const leftTable = document.getElementById('table-left');
	const rightTable = document.getElementById('table-right');
	if (!leftTable || !rightTable) return;

	let syncing = false;

	leftTable.addEventListener('scroll', () => {
		if (syncing) return;
		syncing = true;
		rightTable.scrollTop = leftTable.scrollTop;
		syncing = false;
	});

	rightTable.addEventListener('scroll', () => {
		if (syncing) return;
		syncing = true;
		leftTable.scrollTop = rightTable.scrollTop;
		syncing = false;
	});
}
