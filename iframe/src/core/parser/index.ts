import type { BomFile } from '../../types';
import { parseCSV } from './csv-parser';
import { parseExcel } from './excel-parser';
import { detectEncoding } from '../../utils/encoding';
import { selectSheetForExcel } from '../../ui/sheet-selector';

export async function parseFile(file: File): Promise<BomFile> {
	const ext = file.name.split('.').pop()?.toLowerCase() || '';

	if (ext === 'xls' || ext === 'xlsx') {
		const buffer = await file.arrayBuffer();
		const sheetName = await selectSheetForExcel(buffer, file.name);
		return parseExcel(buffer, file.name, sheetName);
	}

	const buffer = await file.arrayBuffer();
	const encoding = detectEncoding(buffer);
	const decoder = new TextDecoder(encoding);
	const text = decoder.decode(buffer);
	return parseCSV(text, file.name);
}
