/* eslint-disable no-implicit-globals */
/* global global, jest, mockLocalStorage */
// Assign things to "global" here if you want them to be globally available during tests
global.$ = require( 'jquery' );

global.mockLocalStorage = {};

// Mock MW object
global.mw = {
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
		} )
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
	}
// other mw properties as needed...
};

// Mock i18n for all tests
var vueTestUtils = require( '@vue/test-utils' );

vueTestUtils.config.global.mocks = {
	$i18n: jest.fn( function ( str ) {
		return str;
	} )
};
