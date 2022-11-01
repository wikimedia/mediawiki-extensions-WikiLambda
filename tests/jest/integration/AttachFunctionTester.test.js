/*
 * WikiLambda integration test for attaching a function tester.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	{ ticksUntilTrue } = require( './helpers/interactionHelpers.js' ),
	{ runSetup } = require( './helpers/functionViewerDetailsTestSetup.js' ),
	FunctionViewerDetailsTable = require( '../../../resources/ext.wikilambda.edit/views/function/details/FunctionViewerDetailsTable.vue' ),
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
	let wrapper;
	beforeEach( () => {
		const setupResult = runSetup();
		wrapper = setupResult.wrapper;
		apiPostWithEditTokenMock = setupResult.apiPostWithEditTokenMock;
	} );

	it( 'allows attaching a function tester', async () => {
		// ACT: select the 'details' tab.
		await wrapper.get( '#cdx-function-details-1-label a' ).trigger( 'click' );

		const testerTable = wrapper.findAll( '.ext-wikilambda-function-details-table' )[ 1 ];
		await ticksUntilTrue( wrapper, () => testerTable && testerTable.exists() );
		const firstTesterRow = testerTable.findAll( '.ext-wikilambda-table__content__row' )[ 1 ];

		// ASSERT: The "unattached" tester is shown in the table.
		expect( firstTesterRow.findAll( '.ext-wikilambda-table__content__row__item' )[ 1 ]
			.text() ).toEqual( 'Tester name, in English' );

		// ASSERT: The "unattached" tester is shown as proposed.
		expect( firstTesterRow.get( '.ext-wikilambda-chip' ).attributes( 'text' ) )
			.toEqual( 'wikilambda-function-implementation-state-proposed' );

		await ticksUntilTrue( wrapper, () => wrapper.findAll( '.ext-wikilambda-tester-result-status--RUNNING' ).length === 0 );

		// ASSERT: The "unattached" tester shows as passing all implementation tests.
		expect( firstTesterRow.findAll( '.ext-wikilambda-tester-result-status--PASS' ).length )
			.toEqual( 2 );

		// ACT: Select the "unattached" implementation in the table.
		wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ]
			.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
		await wrapper.vm.$nextTick();

		// ACT: Click approve button.
		await wrapper.findAllComponents( FunctionViewerDetailsTable )[ 1 ]
			.get( '.ext-wikilambda-function-details-table__title__buttons__approve-button' ).trigger( 'click' );

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
