let tooltip: HTMLElement | null = null;
let hideTimeout: number | null = null;

export function initTooltip(): void {
	document.addEventListener('mouseover', handleMouseOver);
	document.addEventListener('mouseout', handleMouseOut);
}

function handleMouseOver(e: MouseEvent): void {
	const target = e.target as HTMLElement;
	
	// Check if the element has truncated content
	if (target.classList.contains('has-tooltip') && target.textContent) {
		const isTruncated = target.scrollWidth > target.clientWidth;
		if (isTruncated) {
			showTooltip(target.textContent || '', e.clientX, e.clientY);
		}
	}
}

function handleMouseOut(): void {
	hideTooltip();
}

function showTooltip(text: string, x: number, y: number): void {
	hideTooltip();

	tooltip = document.createElement('div');
	tooltip.className = 'tooltip';
	tooltip.textContent = text;
	document.body.appendChild(tooltip);

	// Position tooltip
	const rect = tooltip.getBoundingClientRect();
	let posX = x + 10;
	let posY = y + 10;

	// Prevent tooltip from going off screen
	if (posX + rect.width > window.innerWidth) {
		posX = x - rect.width - 10;
	}
	if (posY + rect.height > window.innerHeight) {
		posY = y - rect.height - 10;
	}

	tooltip.style.left = `${posX}px`;
	tooltip.style.top = `${posY}px`;
}

function hideTooltip(): void {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}
	
	hideTimeout = window.setTimeout(() => {
		if (tooltip) {
			tooltip.remove();
			tooltip = null;
		}
	}, 100);
}

export function addTooltipSupport(element: HTMLElement): void {
	element.classList.add('has-tooltip');
}
