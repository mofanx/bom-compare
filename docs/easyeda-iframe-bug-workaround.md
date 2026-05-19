# EasyEDA iframe 脚本加载问题解决方案

## 问题描述

在嘉立创 EDA 扩展开发中，使用 `eda.sys_IFrame.openIFrame()` 打开 iframe 时，如果引用的 JavaScript 文件较大（> 458KB），会出现以下问题：
- 拖拽文件到 iframe 区域时，浏览器会直接下载文件而不是触发拖拽事件
- 点击文件选择按钮后，文件无法预览，没有任何反应
- iframe 内的 JavaScript 逻辑完全无法执行

## 问题诊断过程

### 1. 初步排查

首先检查了代码逻辑：
- ✅ `window.addEventListener('dragover', e => e.preventDefault())` 已添加
- ✅ `window.addEventListener('drop', e => e.preventDefault())` 已添加
- ✅ drop-zone 的事件监听器正确绑定
- ✅ 扩展包中包含 `iframe/bundle.js`

### 2. 使用 EasyEDA Bridge 调试

通过 EasyEDA Bridge 执行调试代码，发现：
- iframe 已正确加载，HTML 结构完整
- drop-zone 元素存在且可见
- 但 **script 标签的 src 属性指向的 blob URL 内容只有 9 个字符**：字面字符串 `"undefined"`

### 3. 深入 IndexedDB 调试

检查 EasyEDA 存储扩展文件的 IndexedDB：
- 扩展文件存储在 `extensionsObjectStorage` store
- bundle.js 以 File 对象形式存储在 IDB
- **直接从 IDB 读取 bundle.js 内容正常**（458KB，包含所有修复代码）
- 但 EasyEDA 为 script 标签创建的 blob URL 内容却是 `"undefined"`

### 4. 文件大小阈值测试

测试不同文件大小：
- 未压缩 bundle.js：981KB → blob URL 为 `"undefined"`
- minified bundle.js：458KB → blob URL 仍为 `"undefined"`
- index.html：16KB → 正常加载
- CSS 文件：< 10KB → 正常加载

**结论**：EasyEDA 在为 iframe script 创建 blob URL 时，对文件大小存在限制，超过阈值（约 50KB）会导致内容变成 `"undefined"`。

## 根本原因

EasyEDA 的 `sys_IFrame.openIFrame()` 实现中存在 bug：
1. 扩展文件在安装时被存储到 IndexedDB
2. iframe HTML 中的 `<script src="./bundle.js">` 被 EasyEDA 解析
3. EasyEDA 从 IndexedDB 读取对应的 File 对象
4. EasyEDA 尝试为 File 对象创建 blob URL
5. **当文件超过一定大小时，blob URL 的内容变成字面字符串 `"undefined"`**
6. 浏览器加载这个 "undefined" 脚本，JavaScript 逻辑无法执行

## 解决方案

### 方案概述

在 iframe HTML 中内联一段加载器代码，绕过 EasyEDA 的 blob URL 处理机制，直接从 IndexedDB 读取 bundle.js 内容并动态加载。

### 实现代码

在 `iframe/index.html` 中替换原有的 `<script src="./bundle.js">`：

```html
<script>
	// Workaround for EasyEDA bug: large iframe scripts (>~50KB) get loaded
	// as blob URLs whose content is the literal string "undefined".
	// We bypass it by reading bundle.js directly from the IndexedDB
	// extensionsObjectStorage where EasyEDA stores extension files.
	(async function loadBundle() {
		try {
			// 1. 找到用户专属的 IndexedDB
			const dbs = await indexedDB.databases();
			const userDb = dbs.find(function (d) { 
				return d.name && d.name.indexOf('User_') === 0; 
			});
			if (!userDb) throw new Error('user IndexedDB not found');

			// 2. 打开数据库
			const db = await new Promise(function (res, rej) {
				const r = indexedDB.open(userDb.name);
				r.onsuccess = function () { res(r.result); };
				r.onerror = function () { rej(r.error); };
			});

			// 3. 检查 extensionsObjectStorage store
			if (!db.objectStoreNames.contains('extensionsObjectStorage')) {
				db.close();
				throw new Error('extensionsObjectStorage not found');
			}

			// 4. 查找 bundle.js 的存储键
			const tx = db.transaction(['extensionsObjectStorage'], 'readonly');
			const store = tx.objectStore('extensionsObjectStorage');
			const keys = await new Promise(function (res, rej) {
				const r = store.getAllKeys();
				r.onsuccess = function () { res(r.result); };
				r.onerror = function () { rej(r.error); };
			});
			const key = keys.find(function (k) { 
				return String(k).endsWith('|iframe/bundle.js'); 
			});
			if (!key) {
				db.close();
				throw new Error('iframe/bundle.js entry not found in IndexedDB');
			}

			// 5. 读取 bundle.js File 对象
			const entry = await new Promise(function (res, rej) {
				const r = store.get(key);
				r.onsuccess = function () { res(r.result); };
				r.onerror = function () { rej(r.error); });
			});
			db.close();

			// 6. 提取文件内容
			if (!entry || !entry.source) throw new Error('bundle.js source missing');
			const text = await entry.source.text();

			// 7. 创建正常工作的 blob URL
			const blob = new Blob([text], { type: 'text/javascript' });
			const url = URL.createObjectURL(blob);

			// 8. 动态注入 script 标签
			const script = document.createElement('script');
			script.src = url;
			script.onload = function () { URL.revokeObjectURL(url); };
			document.body.appendChild(script);
		} catch (err) {
			console.error('[BOM Compare] Failed to load bundle.js from IndexedDB:', err);
			document.body.innerHTML += '<div style="color:#f87171;padding:20px;">Failed to load bundle.js: ' + (err && err.message) + '</div>';
		}
	})();
</script>
```

### 工作原理

1. 内联脚本在 iframe 加载时立即执行
2. 找到 EasyEDA 使用的 IndexedDB（名称包含 `User_` 前缀）
3. 从 `extensionsObjectStorage` store 中查找 bundle.js 存储键
4. 读取 bundle.js 的 File 对象内容
5. 使用 iframe 自己的 `URL.createObjectURL()` 创建 blob URL
6. 动态注入 script 标签加载执行

**关键点**：绕过了 EasyEDA 的 blob URL 创建逻辑，使用 iframe 自己的 blob URL 机制，不受 EasyEDA 的大小限制影响。

## 验证方法

安装修复后的扩展后，通过 EasyEDA Bridge 验证：

```javascript
const f = document.querySelector('iframe');
const win = f.contentWindow;
const doc = f.contentDocument;
const dz = doc.getElementById('drop-zone-left');
const ev = new win.DragEvent('dragover', { bubbles: true, cancelable: true });
dz.dispatchEvent(ev);
return { 
	dragoverPrevented: ev.defaultPrevented,
	dzHasDragOverClass: dz.classList.contains('drag-over')
};
```

预期结果：
- `dragoverPrevented: true`
- `dzHasDragOverClass: true`

## 注意事项

### 1. 文件大小限制

- EasyEDA iframe script 文件大小限制约为 50KB
- 超过此大小的文件必须使用动态加载方案
- CSS、HTML 等静态资源不受此限制影响

### 2. IndexedDB 结构

扩展文件存储结构：
- 数据库名称：`User_<uuid>_v<version>`（如 `User_5b08508e0e63483a92b401d30681baea_v6`）
- Store 名称：`extensionsObjectStorage`
- 存储键格式：`<uuid>|<文件路径>`（如 `c78c9305280f48c0ad48d53803e7f1b2|iframe/bundle.js`）
- 存储值格式：`{ key, uuid, path, source: File }`

### 3. 内联代码大小

内联加载器代码应保持简洁（< 2KB），避免触发 EasyEDA 的大小限制。

### 4. 错误处理

加载器包含完善的错误处理：
- 找不到 IndexedDB → 显示错误信息
- 找不到 bundle.js → 显示错误信息
- 读取失败 → 显示错误信息
- 控制台输出详细错误日志

## 替代方案

如果不想使用 IndexedDB 动态加载，可考虑：

### 方案 A：拆分 bundle.js

将大型依赖库（如 xlsx）拆分成单独文件，每个文件控制在 50KB 以内。

**缺点**：
- 需要修改 esbuild 配置
- 增加网络请求次数
- 维护复杂度增加

### 方案 B：完全内联

将所有 JavaScript 代码内联到 HTML 中。

**缺点**：
- HTML 文件过大（> 500KB）
- 代码难以维护
- 仍然可能触发 EasyEDA 的其他限制

**推荐使用 IndexedDB 动态加载方案**，这是最稳定、最易维护的解决方案。

## 相关资源

- EasyEDA API 文档：https://prodocs.lceda.cn/cn/api/guide/
- EasyEDA Bridge：https://ext.lceda.cn/item/oshwhub/run-api-gateway
- pro-api-sdk：嘉立创 EDA 扩展开发脚手架
