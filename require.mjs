import {createRequireFromPath} from 'module';
import {fileURLToPath} from 'url';

export default createRequireFromPath(fileURLToPath(import.meta.url));
