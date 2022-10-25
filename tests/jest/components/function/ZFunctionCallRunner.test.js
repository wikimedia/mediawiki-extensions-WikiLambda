/*!
 * WikiLambda unit test suite for the ZFunctionCallRunner component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const VueTestUtils = require( '@vue/test-utils' ),
	ZFunctionCallRunner = require( '../../../../resources/ext.wikilambda.edit/components/function/ZFunctionCallRunner.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );
const { CdxButton } = require( '@wikimedia/codex' );

const zobjectId = 123;
const functionCallFunctionId = 456;
const resultId = 789;
const functionZid = 'Z123';

describe( 'ZFunctionCallRunner', () => {
	let currentZObjectType;
	let currentZObject;
	let callZFunctionMock;
	beforeEach( function () {
		currentZObjectType = Constants.Z_FUNCTION;
		callZFunctionMock = jest.fn();
		currentZObject = {};
		global.store.hotUpdate( {
			getters: {
				getZObjectChildrenById: () => ( parentId ) => {
					if ( parentId === zobjectId ) {
						return [
							{ id: functionCallFunctionId, key: Constants.Z_FUNCTION_CALL_FUNCTION, value: 'object' }
						];
					} else if ( parentId === functionCallFunctionId ) {
						return [
							{ key: Constants.Z_REFERENCE_ID, value: functionZid }
						];
					}
				},
				getZkeys: () => {
					return {
						[ functionZid ]: {
							[ Constants.Z_PERSISTENTOBJECT_ID ]: {},
							[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
								[ Constants.Z_FUNCTION_ARGUMENTS ]: [ Constants.Z_ARGUMENT ],
								[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [ Constants.Z_IMPLEMENTATION ]
							}
						}
					};
				},
				getZObjectAsJsonById: () => ( id ) => {
					if ( id === zobjectId ) {
						return {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL
						};
					}
				},
				getCurrentZObjectType: () => currentZObjectType,
				getZObjectAsJson: () => currentZObject
			},
			actions: {
				fetchZKeys: jest.fn(),
				initializeResultId: () => resultId,
				callZFunction: callZFunctionMock
			}
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = VueTestUtils.shallowMount( ZFunctionCallRunner, { props: { zobjectId: zobjectId } } );
		expect( wrapper.find( '.ext-wikilambda-function-call-block__runner' ).exists() ).toBe( true );
	} );

	it( 'calls function correctly when object type is implementation and call button is pressed', async () => {
		currentZObjectType = Constants.Z_IMPLEMENTATION;
		currentZObject = {
			[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
				[ Constants.Z_IMPLEMENTATION_FUNCTION ]: {
					[ Constants.Z_REFERENCE_ID ]: functionZid
				},
				[ Constants.Z_IMPLEMENTATION_CODE ]: {
					[ Constants.Z_CODE_CODE ]: 'my lovely code'
				}
			}
		};
		const wrapper = VueTestUtils.shallowMount( ZFunctionCallRunner, { props: { zobjectId: zobjectId } } );

		wrapper.getComponent( CdxButton ).vm.$emit( 'click' );
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		expect( callZFunctionMock ).toHaveBeenCalledWith( expect.anything(), {
			resultId: resultId,
			zobject: {
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
				[ Constants.Z_FUNCTION_CALL_FUNCTION ]: {
					[ Constants.Z_FUNCTION_ARGUMENTS ]: [ Constants.Z_ARGUMENT ],
					[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [
						Constants.Z_IMPLEMENTATION,
						{
							[ Constants.Z_IMPLEMENTATION_FUNCTION ]: {
								[ Constants.Z_REFERENCE_ID ]: functionZid
							},
							[ Constants.Z_IMPLEMENTATION_CODE ]: {
								[ Constants.Z_CODE_CODE ]: 'my lovely code'
							}
						}
					]
				}
			}
		} );
	} );
} );
