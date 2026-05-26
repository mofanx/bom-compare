import type { BomFile, DiffResult, FilterType } from '../types';

export interface State {
	oldFile: BomFile | null;
	newFile: BomFile | null;
	diffResult: DiffResult | null;
	filter: FilterType;
	searchKeyword: string;
	searchMode: 'search' | 'filter';
	searchMatches: Set<string>;
	selectedRowIndex: number;
	sortField: string | null;
	sortDirection: 'asc' | 'desc';
	loading: boolean;
	loadingProgress: number;
	loadingMessage: string;
}

export const state: State = {
	oldFile: null,
	newFile: null,
	diffResult: null,
	filter: 'all',
	searchKeyword: '',
	searchMode: 'search',
	searchMatches: new Set(),
	selectedRowIndex: -1,
	sortField: null,
	sortDirection: 'asc',
	loading: false,
	loadingProgress: 0,
	loadingMessage: '',
};
