/* eslint-disable no-implicit-globals */
/* global global, jest, mockLocalStorage */
// Assign things to "global" here if you want them to be globally available during tests
global.$ = require( 'jquery' );

global.mockLocalStorage = {};

function Api() {}
Api.prototype.get = jest.fn().mockReturnValue( $.Deferred().resolve().promise() );

class Title {
	constructor( page ) {
		this.page = page;
	}

	getUrl() {
		return this.page;
	}
}

class Mocki18n {
	constructor( string ) {
		this.string = string;
	}

	text() {
		return this.string;
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
						zlangZid: 'Z1002'
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
		isAnon: jest.fn().mockReturnValue( true )
	},
	language: {
		getFallbackLanguageChain: function () {
			return [ 'en' ];
		}
	},
	storage: {
		get: jest.fn( function () {
			return function ( key ) {
				return mockLocalStorage[ key ];
			};
		} ),
		set: jest.fn( function () {
			return function ( key, value ) {
				mockLocalStorage[ key ] = value;
			};
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
var vueTestUtils = require( '@vue/test-utils' );
var vuex = require( 'vuex' );

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
