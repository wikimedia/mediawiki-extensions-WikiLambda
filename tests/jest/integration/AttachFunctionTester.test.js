/*
 * WikiLambda integration test for attaching a function tester.
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

	it( 'allows attaching a function tester', async () => {
		const { findByLabelText, findByRole } = renderForFunctionViewer();

		// ACT: select the 'details' tab.
		await fireEvent.click( await findByRole( 'tab', { name: 'Details' } ) );

		// ASSERT: The "unattached" tester is shown in the table.
		const testersTable = await findByLabelText( 'Test cases' );
		const firstTesterRow = within( testersTable ).getAllByRole( 'row' )[ 1 ];
		await waitFor( () => expect( firstTesterRow ).toHaveTextContent( 'Tester name, in English' ) );

		// ASSERT: The "unattached" tester is shown as deactivated.
		expect( firstTesterRow ).toHaveTextContent( 'Deactivated' );

		// ASSERT: The "unattached" tester shows as passing all implementation tests.
		await waitFor( () => expect( within( firstTesterRow ).getAllByText( 'Pass' ) ).toHaveLength( 2 ) );

		// ACT: Select the "unattached" implementation in the table.
		await fireEvent.update( within( firstTesterRow ).getByRole( 'checkbox' ), true );

		// ACT: Click approve button.
		await fireEvent.click( within( testersTable ).getByText( 'Approve' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: '',
			zid: functionZid,
			zobject:
				JSON.stringify(
					expected.zFunctionWithImplementationsAndTesters(
						[ implementationByCompositionZid ], [ existingFailedTesterZid, existingSuccessTesterZid ]
					)
				)
		} );
	} );
} );
