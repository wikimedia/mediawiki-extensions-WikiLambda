/* eslint-disable */
/*!
 * WikiLambda integration test for detaching a function tester.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	{ pageChange, ticksUntilTrue } = require( './helpers/interactionHelpers.js' ),
	{ runSetup } = require( './helpers/functionViewerDetailsTestSetup.js' ),
	FunctionViewerDetailsTable = require( '../../../resources/ext.wikilambda.edit/views/function/details/FunctionViewerDetailsTable.vue' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' ),
	existingImplementationByCompositionFromApi = require( './objects/existingImplementationByCompositionFromApi.js' ),
	expected = require( './objects/expectedZFunctionWithImplementationsAndTesters.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const implementationByCompositionZid =
	existingImplementationByCompositionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

describe( 'WikiLambda frontend, function viewer details tab', () => {
	let apiPostWithEditTokenMock;
	let wrapper;
	beforeEach( () => {
		const setupResult = runSetup();
		wrapper = setupResult.wrapper;
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;
	} );

	it( 'allows detaching a function tester', async () => {
		// ACT: select the 'details' tab.
		await wrapper.get( '#cdx-function-details-1-label a' ).trigger( 'click' );

		const testerTable = wrapper.findAll( '.ext-wikilambda-function-details-table' )[ 1 ];
		await ticksUntilTrue( wrapper, () => testerTable && testerTable.exists() );
		const secondTesterRow = testerTable.findAll( '.ext-wikilambda-table__content__row' )[ 2 ];

		// ASSERT: The "attached" tester is shown in the table.
		expect( secondTesterRow.findAll( '.ext-wikilambda-table__content__row__item' )[ 1 ]
			.text() ).toEqual( 'Tester name, in English' );

		// ASSERT: The "attached" tester is shown as available.
		expect( secondTesterRow.get( '.ext-wikilambda-chip' ).attributes( 'text' ) )
			.toEqual( 'wikilambda-function-implementation-state-available' );

		await ticksUntilTrue( wrapper, () => wrapper.findAll( '.ext-wikilambda-tester-result-status--RUNNING' ).length === 0 );

		// ASSERT: The "attached" tester shows as failing all implementation tests.
		expect( secondTesterRow.findAll( '.ext-wikilambda-tester-result-status--FAIL' ).length )
			.toEqual( 2 );

		// ACT: Select the "attached" implementation in the table.
		wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ]
			.props( 'body' )[ 1 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
		await wrapper.vm.$nextTick();

		// ACT: Click deactivate button.
		await wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ]
			.get( '.ext-wikilambda-function-details-table__title__buttons__deactivate-button' ).trigger( 'click' );

		await pageChange( wrapper );

		// ASSERT: Location is changed to page returned by API.
		expect( window.location.href ).toEqual( 'newPage' );

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
