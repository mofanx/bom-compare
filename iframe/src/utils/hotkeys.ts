export function initHotkeys(): void {
	document.addEventListener('keydown', (e) => {
		if (e.key === 'F3' && !e.shiftKey) {
			e.preventDefault();
			document.getElementById('btn-next-diff')?.click();
		}

		if (e.key === 'F3' && e.shiftKey) {
			e.preventDefault();
			document.getElementById('btn-prev-diff')?.click();
		}

		if (e.ctrlKey && e.key === 'd') {
			e.preventDefault();
			document.getElementById('btn-compare')?.click();
		}

		if (e.ctrlKey && e.key === 'f') {
			e.preventDefault();
			const searchInput = document.getElementById('search-input') as HTMLInputElement;
			searchInput?.focus();
		}
	});
}
