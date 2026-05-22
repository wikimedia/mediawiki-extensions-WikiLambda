/*!
 * WikiLambda content: Entry-point that initialises both the references and image modules.
 *
 * ResourceLoader only auto-executes the first file in packageFiles, so this thin
 * entry-point require()s both init files to ensure both run on module load.
 *
 * @module ext.wikilambda.content
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '../ext.wikilambda.references/init.js' );
require( '../ext.wikilambda.image/init.js' );
