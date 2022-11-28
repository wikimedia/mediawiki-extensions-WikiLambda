/*
 * WikiLambda integration test for attaching a function implementation.
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
	existingImplementationInCodeFromApi = require( './objects/existingImplementationInCodeFromApi.js' ),
	existingImplementationByCompositionFromApi = require( './objects/existingImplementationByCompositionFromApi.js' ),
	existingTesterFromApi = require( './objects/existingTesterFromApi.js' ),
	expected = require( './objects/expectedZFunctionWithImplementationsAndTesters.js' );

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

		mw.track = jest.fn( function ( trackkey, trackmessage ) {
			// eslint-disable-next-line no-console
			console.log( 'Log emitted: ' + trackkey + ' - ' + trackmessage );
		} );
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'allows attaching a function implementation', async () => {
		const { findByLabelText, findByRole } = renderForFunctionViewer();

		// ACT: select the 'details' tab.
		await fireEvent.click( await findByRole( 'tab', { name: 'Details' } ) );

		// ASSERT: The "unattached" implementation is shown in the table.
		const implementationsTable = await findByLabelText( 'Implementations' );
		const secondImplementationRow = within( implementationsTable ).getAllByRole( 'row' )[ 2 ];
		await waitFor(
			() => expect( secondImplementationRow ).toHaveTextContent( 'Implementation in code, in English' ) );

		// ASSERT: The "unattached" implementation is shown as deactivated.
		expect( secondImplementationRow ).toHaveTextContent( 'Deactivated' );

		// ACT: Select the "unattached" implementation in the table.
		await fireEvent.update( within( secondImplementationRow ).getByRole( 'checkbox' ), true );

		// ACT: Click approve button.
		await fireEvent.click( within( implementationsTable ).getByText( 'Approve' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: '',
			zid: functionZid,
			zobject:
				JSON.stringify(
					expected.zFunctionWithImplementationsAndTesters(
						[ implementationByCompositionZid, implementationInCodeZid ], [ existingFailedTesterZid ]
					)
				)
		} );
	} );
} );
