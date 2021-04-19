/* eslint-disable no-undef */
// Assign things to "global" here if you want them to be globally available during tests
global.$ = require( 'jquery' );

// Mock MW object
global.mw = {
	config: {
		get: jest.fn( function ( endpoint ) {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						createNewPage: true,
						zobject: { Z1K1: 'Z2', Z2K1: 'Z0' }
					};
				default:
					return {};
			}
		} )
	},
	user: {
		isAnon: jest.fn().mockReturnValue( true )
	}
// other mw properties as needed...
};
