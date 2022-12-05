/* eslint-disable compat/compat */
'use strict';

const runSetup = function () {
	// Needed because of the Teleported component.
	const el = document.createElement( 'div' );
	el.id = 'ext-wikilambda-app';
	document.body.appendChild( el );

	jest.useFakeTimers();

	global.window = Object.create( window );
	Object.defineProperty( window, 'location', {
		value: {
			href: 'currentPage'
		}
	} );

	// This is necessary to allow FunctionDefinition to attempt to scroll to second language without crashing.
	document.getElementById = ( selector ) => {
		if ( selector === 'fnDefinitionContainer' ) {
			return {};
		}
	};

	const apiPostWithEditTokenMock = jest.fn( () => Promise.resolve( {
		wikilambda_edit: {
			page: 'newPage'
		}
	} ) );

	return {
		apiPostWithEditTokenMock: apiPostWithEditTokenMock
	};
};

const runTeardown = () => {
	document.body.outerHTML = '';
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
};

module.exports = {
	runSetup: runSetup,
	runTeardown: runTeardown
};
