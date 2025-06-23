/*
 * WikiLambda integration test for disconnecting a function implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { fireEvent, waitFor } = require( '@testing-library/vue' );
const { within } = require( '@testing-library/dom' );
const { nextTick } = require( 'vue' );
require( '@testing-library/jest-dom' );

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const { renderForFunctionViewer, runSetup, runTeardown } = require( './helpers/functionViewerDetailsTestHelpers.js' );
const existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' );
const existingTesterFromApi = require( './objects/existingTesterFromApi.js' );
const expected = require( './objects/expectedZFunctionWithImplementationsAndTesters.js' );

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
		const { findByLabelText } = renderForFunctionViewer();

		// ASSERT: The "connected" implementation is shown in the table.
		const implementationsTable = await findByLabelText( 'Implementations' );
		await waitFor( () => expect( within( implementationsTable ).getAllByRole( 'row' ) ).toHaveLength( 3 ) );
		const firstImplementationRow = within( implementationsTable ).getAllByRole( 'row' )[ 1 ];
		await waitFor(
			() => expect( firstImplementationRow ).toHaveTextContent( 'Implementation by composition, in English' ) );

		// ASSERT: The "connected" implementation is shown as connected.
		expect( firstImplementationRow ).toHaveTextContent( 'Connected' );

		// ACT: Select the "connected" implementation in the table.
		await fireEvent.update( within( firstImplementationRow ).getByRole( 'checkbox' ), true );

		// ACT: Click the disconnect button.
		await fireEvent.click( within( implementationsTable ).getByText( 'Disconnect' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			format: 'json',
			formatversion: '2',
			uselang: 'en',
			summary: 'Removed $1 from the approved list of implementations',
			zid: functionZid,
			zobject:
				JSON.stringify( expected.zFunctionWithImplementationsAndTesters( [], [ existingFailedTesterZid ] ) )
		}, { signal: undefined } );
	} );

	it( 'shows a message in the function evaluator when disconnecting all implementations', async () => {
		const { findByLabelText, findByTestId, queryByTestId } = renderForFunctionViewer();

		// ASSERT: The "connected" implementation is shown in the table.
		const implementationsTable = await findByLabelText( 'Implementations' );
		await waitFor( () => expect( within( implementationsTable ).getAllByRole( 'row' ) ).toHaveLength( 3 ) );
		const firstImplementationRow = within( implementationsTable ).getAllByRole( 'row' )[ 1 ];
		await waitFor(
			() => expect( firstImplementationRow ).toHaveTextContent( 'Implementation by composition, in English' ) );

		// ASSERT: The "connected" implementation is shown as connected.
		expect( firstImplementationRow ).toHaveTextContent( 'Connected' );

		// ASSERT: The function evaluator message is hidden
		expect( queryByTestId( 'function-evaluator-message' ) ).not.toBeInTheDocument();

		// Filter rows to get only those that contain the text "connected"
		const connectedRows = within( implementationsTable ).getAllByRole( 'row' ).filter( ( row ) => within( row ).queryByText( 'Connected' ) );

		// ACT: Select the "connected" implementations in the table.
		for ( const row of connectedRows ) {
			await fireEvent.update( within( row ).getByRole( 'checkbox' ), true );
		}

		// ACT: Click the disconnect button.
		await fireEvent.click( within( implementationsTable ).getByText( 'Disconnect' ) );

		// ASSERT: API was called to disconnect the implementations.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith(
			expect.objectContaining( {
				action: 'wikilambda_edit',
				format: 'json',
				formatversion: '2',
				uselang: 'en',
				summary: 'Removed $1 from the approved list of implementations',
				zid: functionZid
			} ), { signal: undefined }
		);

		// ASSERT: All rows are "Disconnected" and not active (Checkmark is not shown)
		await waitFor( () => {
			connectedRows.forEach( ( row ) => {
				expect( row ).toHaveTextContent( 'Disconnected' );
			} );
		} );

		// ASSERT: The function evaluator message is shown.
		expect( await findByTestId( 'function-evaluator-message' ) ).toHaveTextContent( 'This function has no connected implementations.' );
	} );

	it( 'can connect a disconnected test again', async () => {
		const { findByLabelText } = renderForFunctionViewer();

		// ASSERT: The "connected" implementation is shown in the table.
		const implementationsTable = await findByLabelText( 'Implementations' );
		await waitFor( () => expect( within( implementationsTable ).getAllByRole( 'row' ) ).toHaveLength( 3 ) );
		const firstImplementationRow = within( implementationsTable ).getAllByRole( 'row' )[ 1 ];
		await waitFor(
			() => expect( firstImplementationRow ).toHaveTextContent( 'Implementation by composition, in English' ) );

		// ASSERT: The "connected" implementation is shown as connected.
		expect( firstImplementationRow ).toHaveTextContent( 'Connected' );

		// ACT: Select the "connected" implementation in the table.
		await fireEvent.update( within( firstImplementationRow ).getByRole( 'checkbox' ), true );

		// ACT: Click the disconnect button.
		await fireEvent.click( within( implementationsTable ).getByText( 'Disconnect' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			format: 'json',
			formatversion: '2',
			uselang: 'en',
			summary: 'Removed $1 from the approved list of implementations',
			zid: functionZid,
			zobject:
				JSON.stringify( expected.zFunctionWithImplementationsAndTesters( [], [ existingFailedTesterZid ] ) )
		}, { signal: undefined } );

		// ASSERT: The "disconnected" implementation is shown as disconnected.
		expect( firstImplementationRow ).toHaveTextContent( 'Disconnected' );

		// Ensures state is consistent after a few ticks (fading in message and implementation state updates)
		// This is necessary because we can not verify this targeting the UI directly
		// TODO: Make this work without waiting for the nextTick
		await nextTick();
		await nextTick();
		await nextTick();
		await nextTick();
		await nextTick();
		await nextTick();

		// ACT: Select the first "disconnected" implementation in the table.
		await fireEvent.update( within( firstImplementationRow ).getByRole( 'checkbox' ), true );

		// ACT: Click the connect button.
		await fireEvent.click( within( implementationsTable ).getByText( 'Connect' ) );

		// ASSERT: API was called to connect the implementation
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith(
			expect.objectContaining( {
				action: 'wikilambda_edit',
				format: 'json',
				formatversion: '2',
				uselang: 'en',
				summary: 'Added $1 to the approved list of implementations',
				zid: functionZid
			} ), { signal: undefined }
		);

		// ASSERT: The "connected" implementation is shown as connected.
		expect( firstImplementationRow ).toHaveTextContent( 'Connected' );
	} );
} );
