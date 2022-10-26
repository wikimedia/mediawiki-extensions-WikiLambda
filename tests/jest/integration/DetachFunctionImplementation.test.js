/*
 * WikiLambda integration test for detaching a function implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	{ ticksUntilTrue, pageChange } = require( './helpers/interactionHelpers.js' ),
	{ runSetup } = require( './helpers/functionViewerDetailsTestSetup.js' ),
	FunctionViewerDetailsTable = require( '../../../resources/ext.wikilambda.edit/views/function/details/FunctionViewerDetailsTable.vue' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' ),
	existingTesterFromApi = require( './objects/existingTesterFromApi.js' ),
	expected = require( './objects/expectedZFunctionWithImplementationsAndTesters.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const existingFailedTesterZid = existingTesterFromApi.failedTesterZid;

describe( 'WikiLambda frontend, function viewer details tab', () => {
	let apiPostWithEditTokenMock;
	let wrapper;
	beforeEach( () => {
		const setupResult = runSetup();
		wrapper = setupResult.wrapper;
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;
	} );
	it( 'allows detaching a function implementation', async () => {
		// ACT: select the 'details' tab.
		await wrapper.get( '#cdx-function-details-1-label a' ).trigger( 'click' );

		const implementationTable = wrapper.findAll( '.ext-wikilambda-function-details-table' )[ 0 ];
		await ticksUntilTrue( wrapper, () => implementationTable && implementationTable.exists() );
		const firstImplementationRow = implementationTable.findAll( '.ext-wikilambda-table__content__row' )[ 1 ];

		// ASSERT: The "attached" implementation is shown in the table.
		expect( firstImplementationRow.findAll( '.ext-wikilambda-table__content__row__item' )[ 1 ]
			.text() ).toEqual( 'Implementation by composition, in English' );

		// ASSERT: The "attached" implementation is shown as available.
		expect( firstImplementationRow.get( '.ext-wikilambda-chip' ).attributes( 'text' ) )
			.toEqual( 'wikilambda-function-implementation-state-available' );

		// ACT: Select the "attached" implementation in the table.
		wrapper.findAllComponents( FunctionViewerDetailsTable )[ 0 ]
			.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
		await wrapper.vm.$nextTick();

		// ACT: Click the deactivate button.
		await wrapper.get( '.ext-wikilambda-function-details-table__title__buttons__deactivate-button' ).trigger( 'click' );

		await pageChange( wrapper );

		// ASSERT: Location is changed to page returned by API.
		expect( window.location.href ).toEqual( 'newPage' );

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
