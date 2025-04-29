/*!
 * Rigging for the WikiLambda browser jest UX unit testing suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/* global jest, mockLocalStorage, $ */
// Assign things to "global" here if you want them to be globally available during tests

const fs = require( 'fs' ),
	path = require( 'path' ),
	Constants = require( './resources/ext.wikilambda.app/Constants.js' ),
	vueTestUtils = require( '@vue/test-utils' ),
	{ createTestingPinia } = require( '@pinia/testing' );

// Mocking window.location.href
Object.defineProperty( global.window, 'location', {
	writable: true,
	value: { href: jest.fn(), protocol: 'http:', origin: 'http://localhost' }
} );

global.$ = require( 'jquery' );

global.mockLocalStorage = {};

global.toQueryParam = function ( param ) {
	return Object.keys( param )
		.map( ( key ) => key + '=' + param[ key ] )
		.join( '&' );
};

function Api() {}
Api.prototype.get = jest.fn().mockReturnValue( $.Deferred().resolve().promise() );

class Title {
	constructor( page ) {
		this.page = page;
	}

	getUrl( param ) {
		if ( param && Object.keys( param ).length > 0 ) {
			param.title = this.page;
			return Constants.PATHS.ROUTE_FORMAT_ONE + '?' + global.toQueryParam( param );
		}

		return Constants.PATHS.ROUTE_FORMAT_TWO + this.page;
	}
}

const upstreami18n = { 'colon-separator': ':' };
let englishMessages = JSON.parse( fs.readFileSync( path.join( __dirname, './i18n/en.json' ) ) );
const englishVeMessages = JSON.parse( fs.readFileSync( path.join( __dirname, './i18n/ve/en.json' ) ) );
englishMessages = Object.assign( englishMessages, englishVeMessages, upstreami18n );

class Mocki18n {
	constructor( string ) {
		this.string = string;
	}

	text() {
		return englishMessages[ this.string ];
	}

	toString() {
		return this.text();
	}

	params() {
		return this;
	}

	parse() {
		return englishMessages[ this.string ];
	}
}

// Mock MW object
global.mw = {
	Api: Api,
	config: {
		get: jest.fn( ( endpoint ) => {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						createNewPage: true,
						viewmode: true,
						zobject: { Z1K1: 'Z2', Z2K1: 'Z0' },
						zlangZid: 'Z1002',
						zlang: 'en'
					};
				case 'wgWikifunctionsBaseUrl':
					return null;
				case 'wgUserLanguage':
					return 'en';
				case 'wgPageContentLanguage':
					return 'en';
				default:
					return null;
			}
		} ),
		values: {
			wgUserName: 'username'
		}
	},
	user: {
		isAnon: jest.fn().mockReturnValue( true ),
		getRights: jest.fn().mockReturnValue( {
			then: jest.fn().mockReturnValue( [] )
		} )
	},
	language: {
		getFallbackLanguageChain: function () {
			return [ 'en' ];
		},
		listToText: function () {
			return 'list';
		}
	},
	storage: {
		get: jest.fn( ( key ) => mockLocalStorage[ key ] ),
		set: jest.fn( ( key, value ) => {
			mockLocalStorage[ key ] = value;
		} )
	},
	track: jest.fn( ( trackkey, trackmessage ) => {

		console.log( 'Log emitted: ' + trackkey + ' - ' + trackmessage );
	} ),
	eventLog: {
		dispatch: jest.fn( ( eventName, customData ) => {

			console.log( 'Metrics Platform event emitted: ' + eventName + ' - ' + JSON.stringify( customData ) );
		} ),
		submitInteraction: jest.fn( ( streamName, schemaID, action, interactionData ) => {

			console.log( 'Metrics Platform event emitted using submitInteraction: ' + action + ' - ' + JSON.stringify( interactionData ) );
		} )
	},
	message: jest.fn( ( str ) => new Mocki18n( str ) ),
	Uri: jest.fn().mockReturnValue( {
		path: jest.fn(),
		query: jest.fn()
	} ),
	Title: Title

	// other mw properties as needed...
};

// Mock i18n & store for all tests
global.$i18n = jest.fn( ( str ) => new Mocki18n( str ) );
global.store = createTestingPinia();

vueTestUtils.config.global.mocks = {
	$i18n: global.$i18n
};

vueTestUtils.config.global.plugins = [ global.store ];
