/*!
 * WikiLambda integration test for detaching a function tester.
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

	it( 'allows detaching a function tester', async () => {
		const { findByLabelText, findByRole } = renderForFunctionViewer();

		// ACT: select the 'details' tab.
		await fireEvent.click( await findByRole( 'tab', { name: 'Details' } ) );

		// ASSERT: The "attached" tester is shown in the table.
		const testersTable = await findByLabelText( 'Test cases' );
		const secondTesterRow = within( testersTable ).getAllByRole( 'row' )[ 2 ];
		await waitFor( () => expect( secondTesterRow ).toHaveTextContent( 'Tester name, in English' ) );

		// ASSERT: The "attached" tester is shown as available.
		expect( secondTesterRow ).toHaveTextContent( 'Available' );

		// ASSERT: The "attached" tester shows as failing all implementation tests.
		await waitFor( () => expect( within( secondTesterRow ).getAllByText( 'Fail' ) ).toHaveLength( 2 ) );

		// ACT: Select the "attached" implementation in the table.
		await fireEvent.update( within( secondTesterRow ).getByRole( 'checkbox' ), true );

		// ACT: Click deactivate button.
		await fireEvent.click( within( testersTable ).getByText( 'Deactivate' ) );

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
