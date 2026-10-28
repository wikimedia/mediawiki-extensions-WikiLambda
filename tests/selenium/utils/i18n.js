import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname( fileURLToPath( import.meta.url ) );

export default JSON.parse( fs.readFileSync( path.join( dirname, '../../../i18n/en.json' ) ) );
