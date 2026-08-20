/*!
 * WikiLambda content: Entry-point that initialises the references, image and abstractpreview
 * modules.
 *
 * ResourceLoader only auto-executes the first file in packageFiles, so this thin
 * entry-point require()s each init file to ensure they all run on module load.
 *
 * @module ext.wikilambda.content
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '../ext.wikilambda.references/init.js' );
require( '../ext.wikilambda.image/init.js' );
require( '../ext.wikilambda.abstractpreview/init.js' );
