/*
 * WikiLambda integration test for detaching a function implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, waitFor } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' ),
	{ renderForFunctionViewer, runSetup, runTeardown } = require( './helpers/functionViewerDetailsTestHelpers.js' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' ),
	existingTesterFromApi = require( './objects/existingTesterFromApi.js' ),
	expected = require( './objects/expectedZFunctionWithImplementationsAndTesters.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const existingFailedTesterZid = existingTesterFromApi.failedTesterZid;

describe( 'WikiLambda frontend, function viewer details tab', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		const setupResult = runSetup();
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'allows detaching a function implementation', async () => {
		const { findByLabelText, findByRole } = renderForFunctionViewer();

		// ACT: select the 'details' tab.
		await fireEvent.click( await findByRole( 'tab', { name: 'Details' } ) );

		// ASSERT: The "attached" implementation is shown in the table.
		const implementationsTable = await findByLabelText( 'Implementations' );
		const firstImplementationRow = within( implementationsTable ).getAllByRole( 'row' )[ 1 ];
		await waitFor(
			() => expect( firstImplementationRow ).toHaveTextContent( 'Implementation by composition, in English' ) );

		// ASSERT: The "attached" implementation is shown as connected.
		expect( firstImplementationRow ).toHaveTextContent( 'Connected' );

		// ACT: Select the "attached" implementation in the table.
		await fireEvent.update( within( firstImplementationRow ).getByRole( 'checkbox' ), true );

		// ACT: Click the disconnect button.
		await fireEvent.click( within( implementationsTable ).getByText( 'Disconnect' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: '',
			zid: functionZid,
			zobject:
				JSON.stringify( expected.zFunctionWithImplementationsAndTesters( [], [ existingFailedTesterZid ] ) )
		} );
	} );
} );
