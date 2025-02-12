/*!
 * WikiLambda Vue standalone language selector initialisation code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createMwApp } = require( 'vue' );
const WlLanguageSelector = require( './components/LanguageSelector.vue' );

createMwApp( WlLanguageSelector )
	.mount( '#ext-wikilambda-language-selector' );
