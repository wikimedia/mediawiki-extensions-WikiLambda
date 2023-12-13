/*!
 * WikiLambda integration test for disconnecting a function test.
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
	existingImplementationByCompositionFromApi = require( './objects/existingImplementationByCompositionFromApi.js' ),
	expected = require( './objects/expectedZFunctionWithImplementationsAndTesters.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const implementationByCompositionZid =
	existingImplementationByCompositionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

describe( 'WikiLambda frontend, function viewer details tab', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		const setupResult = runSetup();
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;
	} );

	afterEach( () => {
		runTeardown();
	} );

	it( 'allows disconnecting a function test', async () => {
		const { findByLabelText } = renderForFunctionViewer();

		// ASSERT: The "connected" tester is shown in the table.
		const testsTable = await findByLabelText( 'Tests' );
		await waitFor( () => expect( within( testsTable ).getAllByRole( 'row' ) ).toHaveLength( 3 ) );
		const secondTesterRow = within( testsTable ).getAllByRole( 'row' )[ 2 ];
		await waitFor( () => expect( secondTesterRow ).toHaveTextContent( 'Tester name, in English' ) );

		// ASSERT: The "connected" tester is shown as connected.
		expect( secondTesterRow ).toHaveTextContent( 'Connected' );

		// ASSERT: The "connected" tester shows as failing all implementation tests.
		await waitFor( () => expect( within( secondTesterRow ).getAllByText( 'Failed' ) ).toHaveLength( 2 ) );

		// ACT: Select the "connected" implementation in the table.
		await fireEvent.update( within( secondTesterRow ).getByRole( 'checkbox' ), true );

		// ACT: Click disconnect button.
		await fireEvent.click( within( testsTable ).getByText( 'Disconnect' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: '',
			zid: functionZid,
			zobject:
				JSON.stringify(
					expected.zFunctionWithImplementationsAndTesters(
						[ implementationByCompositionZid ], []
					)
				)
		} );
	} );
} );
