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

// Register our special search client for Vector 2022, so type-ahead search works
const { vectorSearchClient } = require( './vector-2022SearchIntegration.js' );
mw.config.set( 'wgVectorSearchClient', vectorSearchClient );
