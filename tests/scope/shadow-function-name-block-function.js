import {name} from '../export/function-name.js';
import {name as importedName} from '../export/function-name.js';

{
	function name() {
		/* scoped */
	}
	console.trace(importedName, name);
}
