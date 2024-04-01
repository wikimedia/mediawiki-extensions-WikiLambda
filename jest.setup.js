/*!
 * Rigging for the WikiLambda browser jest UX unit testing suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

/* eslint-disable no-implicit-globals, no-undef */
/* global global, jest, mockLocalStorage */
// Assign things to "global" here if you want them to be globally available during tests

const fs = require( 'fs' ),
	path = require( 'path' ),
	Constants = require( './resources/ext.wikilambda.edit/Constants.js' ),
	vueTestUtils = require( '@vue/test-utils' ),
	vuex = require( 'vuex' );

global.$ = require( 'jquery' );

global.mockLocalStorage = {};

global.toQueryParam = function ( param ) {
	return Object.keys( param )
		.map( ( key ) => {
			return key + '=' + param[ key ];
		} )
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

// eslint-disable-next-line security/detect-non-literal-fs-filename
const englishMessages = JSON.parse( fs.readFileSync( path.join( __dirname, './i18n/en.json' ) ) );

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

	parse() {
		return englishMessages[ this.string ];
	}
}

// Mock MW object
global.mw = {
	Api: Api,
	config: {
		get: jest.fn( function ( endpoint ) {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						createNewPage: true,
						viewmode: true,
						zobject: { Z1K1: 'Z2', Z2K1: 'Z0' },
						zlangZid: 'Z1002',
						zlang: 'en'
					};
				default:
					return {};
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
		}
	},
	storage: {
		get: jest.fn( function ( key ) {
			return mockLocalStorage[ key ];
		} ),
		set: jest.fn( function ( key, value ) {
			mockLocalStorage[ key ] = value;
		} )
	},
	track: jest.fn( function ( trackkey, trackmessage ) {
		// eslint-disable-next-line no-console
		console.log( 'Log emitted: ' + trackkey + ' - ' + trackmessage );
	} ),
	eventLog: {
		dispatch: jest.fn( function ( eventName, customData ) {
			// eslint-disable-next-line no-console
			console.log( 'Metrics Platform event emitted: ' + eventName + ' - ' + JSON.stringify( customData ) );
		} )
	},
	message: jest.fn( function ( str ) {
		return new Mocki18n( str );
	} ),
	Uri: jest.fn().mockReturnValue( {
		path: jest.fn(),
		query: jest.fn()
	} ),
	Title: Title

	// other mw properties as needed...
};

// Mock i18n & store for all tests
global.$i18n = jest.fn( function ( str ) {
	return new Mocki18n( str );
} );
global.getters = {};
global.state = {};
global.mutations = {};
global.actions = {};
global.modules = {};
global.store = vuex.createStore( {
	state() {
		return global.state;
	},
	getters: global.getters,
	mutations: global.mutations,
	actions: global.actions,
	modules: global.modules
} );

vueTestUtils.config.global.mocks = {
	$i18n: global.$i18n
};

vueTestUtils.config.global.plugins = [ global.store ];
