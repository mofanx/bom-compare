export function detectEncoding(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);

	// UTF-8 BOM
	if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
		return 'utf-8';
	}

	// UTF-16 LE BOM
	if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
		return 'utf-16le';
	}

	// UTF-16 BE BOM
	if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
		return 'utf-16be';
	}

	// Try to detect GBK by checking for high bytes
	let hasHighBytes = false;
	let isValidUTF8 = true;
	let i = 0;
	let gbkCharCount = 0;

	while (i < Math.min(bytes.length, 8192)) {
		const b = bytes[i];
		if (b > 0x7F) {
			hasHighBytes = true;
			// Check UTF-8 multi-byte sequence
			if ((b & 0xE0) === 0xC0) {
				if (i + 1 >= bytes.length || (bytes[i + 1] & 0xC0) !== 0x80) {
					isValidUTF8 = false;
					gbkCharCount++;
					i++;
				} else {
					i += 2;
				}
			} else if ((b & 0xF0) === 0xE0) {
				if (i + 2 >= bytes.length || (bytes[i + 1] & 0xC0) !== 0x80 || (bytes[i + 2] & 0xC0) !== 0x80) {
					isValidUTF8 = false;
					gbkCharCount++;
					i++;
				} else {
					i += 3;
				}
			} else if ((b & 0xF8) === 0xF0) {
				if (i + 3 >= bytes.length || (bytes[i + 1] & 0xC0) !== 0x80 || (bytes[i + 2] & 0xC0) !== 0x80 || (bytes[i + 3] & 0xC0) !== 0x80) {
					isValidUTF8 = false;
					gbkCharCount++;
					i++;
				} else {
					i += 4;
				}
			} else {
				isValidUTF8 = false;
				gbkCharCount++;
				i++;
			}
		} else {
			i++;
		}
	}

	// If there are many high bytes that don't match UTF-8 pattern, likely GBK
	if (!hasHighBytes) {
		return 'utf-8';
	}

	if (isValidUTF8) {
		return 'utf-8';
	}

	// If more than 10% of high bytes don't match UTF-8, assume GBK
	const totalHighBytes = bytes.filter(b => b > 0x7F).length;
	if (gbkCharCount > totalHighBytes * 0.1) {
		return 'gbk';
	}

	return 'utf-8';
}
