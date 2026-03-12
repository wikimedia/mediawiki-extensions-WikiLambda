/*!
 * WikiLambda unit test setup loadCodexComponents helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

function loadCodexComponents() {
	const extensionJsonPath = path.resolve( __dirname, '../../../extension.json' );
	const extensionJson = JSON.parse( fs.readFileSync( extensionJsonPath, 'utf8' ) );
	const modules = [
		'ext.wikilambda.app',
		'ext.wikilambda.languageselector',
		'ext.wikilambda.references.vue'
	];

	// Collect all unique Codex components from all modules
	const allComponents = new Set();
	modules.forEach( ( moduleName ) => {
		const module = extensionJson.ResourceModules[ moduleName ];
		if ( module && module.codexComponents ) {
			module.codexComponents.forEach( ( component ) => {
				allComponents.add( component );
			} );
		}
	} );

	return Array.from( allComponents );
}

const codexComponents = loadCodexComponents();
const codexPackage = require( '@wikimedia/codex' );
const codex = codexComponents.reduce( ( acc, component ) => {
	acc[ component ] = codexPackage[ component ];
	return acc;
}, {} );
codex.useToast = codexPackage.useToast;

module.exports = codex;
