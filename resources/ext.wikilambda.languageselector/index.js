/*!
 * WikiLambda Vue standalone language selector initialisation code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Vue = require( 'vue' ),
	WlLanguageSelector = require( './components/LanguageSelector.vue' );

Vue.createMwApp( WlLanguageSelector )
	.mount( '#ext-wikilambda-pagelanguagebutton' );
