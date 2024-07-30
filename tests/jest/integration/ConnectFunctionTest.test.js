/*
 * WikiLambda integration test for connecting a function test
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, waitFor } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' ),
	{ renderForFunctionViewer, runSetup, runTeardown } = require( './helpers/functionViewerDetailsTestHelpers.js' ),
	Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' ),
	existingImplementationByCompositionFromApi = require( './objects/existingImplementationByCompositionFromApi.js' ),
	existingTesterFromApi = require( './objects/existingTesterFromApi.js' ),
	expected = require( './objects/expectedZFunctionWithImplementationsAndTesters.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const implementationByCompositionZid =
	existingImplementationByCompositionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const existingSuccessTesterZid = existingTesterFromApi.successTesterZid;
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

	it( 'allows connecting a function test', async () => {
		const { findByLabelText } = renderForFunctionViewer();

		// ASSERT: The "disconnected" test is shown in the table.
		const testsTable = await findByLabelText( 'Tests' );
		await waitFor( () => expect( within( testsTable ).getAllByRole( 'row' ) ).toHaveLength( 3 ) );
		const firstTestRow = within( testsTable ).getAllByRole( 'row' )[ 1 ];
		await waitFor( () => expect( firstTestRow ).toHaveTextContent( 'Tester name, in English' ) );

		// ASSERT: The "disconnected" test is shown as deactivated.
		expect( firstTestRow ).toHaveTextContent( 'Disconnected' );

		// ASSERT: The "disconnected" test shows as passing all implementation tests.
		await waitFor( () => expect( within( firstTestRow ).getAllByText( 'Passed' ) ).toHaveLength( 2 ) );

		// ACT: Select the "disconnected" implementation in the table.
		await fireEvent.update( within( firstTestRow ).getByRole( 'checkbox' ), true );

		// ACT: Click connect button.
		await fireEvent.click( within( testsTable ).getByText( 'Connect' ) );

		// ASSERT: Correct ZObject was posted to the API.
		await waitFor( () => expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: 'Added $1 to the approved list of test cases',
			zid: functionZid,
			zobject:
				JSON.stringify(
					expected.zFunctionWithImplementationsAndTesters(
						[ implementationByCompositionZid ], [ existingFailedTesterZid, existingSuccessTesterZid ]
					)
				)
		} ) );
	} );
} );
