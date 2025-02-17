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
	return extensionJson.ResourceModules[ 'ext.wikilambda.app' ].codexComponents;
}

const codexComponents = loadCodexComponents();
const codex = codexComponents.reduce( ( acc, component ) => {
	acc[ component ] = require( '@wikimedia/codex' )[ component ];
	return acc;
}, {} );

module.exports = codex;
