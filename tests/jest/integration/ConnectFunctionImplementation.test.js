/*
 * WikiLambda integration test for connecting a function implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, waitFor } = require( '@testing-library/vue' );
const { within } = require( '@testing-library/dom' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' );
const existingImplementationByCompositionFromApi = require( './objects/existingImplementationByCompositionFromApi.js' );
const existingImplementationInCodeFromApi = require( './objects/existingImplementationInCodeFromApi.js' );
const existingTesterFromApi = require( './objects/existingTesterFromApi.js' );
const expected = require( './objects/expectedZFunctionWithImplementationsAndTesters.js' );
const { renderForFunctionViewer, runSetup, runTeardown } = require( './helpers/functionViewerDetailsTestHelpers.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const implementationInCodeZid =
	existingImplementationInCodeFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const implementationByCompositionZid =
	existingImplementationByCompositionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
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

	it( 'allows connecting a function implementation', async () => {
		const { findByLabelText } = renderForFunctionViewer();

		// ASSERT: The "disconnected" implementation is shown in the table.
		const implementationsTable = await findByLabelText( 'Implementations' );
		await waitFor( () => expect( within( implementationsTable ).getAllByRole( 'row' ) ).toHaveLength( 3 ) );
		const secondImplementationRow = within( implementationsTable ).getAllByRole( 'row' )[ 2 ];
		await waitFor(
			() => expect( secondImplementationRow ).toHaveTextContent( 'Implementation in code, in English' ) );

		// ASSERT: The "disconnected" implementation is shown as deactivated.
		expect( secondImplementationRow ).toHaveTextContent( 'Disconnected' );

		// ACT: Select the "disconnected" implementation in the table.
		await fireEvent.update( within( secondImplementationRow ).getByRole( 'checkbox' ), true );

		// ACT: Click connect button.
		await fireEvent.click( within( implementationsTable ).getByText( 'Connect' ) );

		// ASSERT: Correct ZObject was posted to the API.
		await waitFor( () => expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			format: 'json',
			formatversion: '2',
			uselang: 'en',
			summary: 'Added $1 to the approved list of implementations',
			zid: functionZid,
			zobject:
				JSON.stringify(
					expected.zFunctionWithImplementationsAndTesters(
						[ implementationByCompositionZid, implementationInCodeZid ], [ existingFailedTesterZid ]
					)
				)
		} ) );
	} );
} );
