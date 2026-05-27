export function initColumnResize(): void {
	document.addEventListener('mousedown', handleMouseDown);
}

function handleMouseDown(e: MouseEvent): void {
	const target = e.target as HTMLElement;
	if (!target.classList.contains('column-resize-handle')) return;

	const th = target.parentElement as HTMLTableCellElement;
	if (!th || !th.dataset.field) return;

	e.preventDefault();
	e.stopPropagation();

	const startX = e.clientX;
	const startWidth = th.offsetWidth;
	const table = th.closest('table') as HTMLTableElement;
	if (!table) return;

	const resizeOverlay = document.createElement('div');
	resizeOverlay.className = 'resize-overlay';
	document.body.appendChild(resizeOverlay);

	function onMouseMove(e: MouseEvent): void {
		const dx = e.clientX - startX;
		const newWidth = Math.max(60, startWidth + dx);
		th.style.width = `${newWidth}px`;
	}

	function onMouseUp(): void {
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
		resizeOverlay.remove();
	}

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
}

export function addResizeHandles(table: HTMLTableElement): void {
	const headers = table.querySelectorAll('th');
	headers.forEach(th => {
		if (th.querySelector('.column-resize-handle')) return;

		const resizeHandle = document.createElement('div');
		resizeHandle.className = 'column-resize-handle';
		(th as HTMLElement).style.position = 'relative';
		th.appendChild(resizeHandle);
	});
}
