/*!
 * WikiLambda unit test suite for the function-viewer-aliases component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	Constants = require( '../../../../../resources/ext.wikilambda.edit/Constants.js' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionViewerAliases = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/about/FunctionViewerAboutAliases.vue' ),
	FunctionViewerSidebar = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/FunctionViewerSidebar.vue' );

describe( 'FunctionViewerAliases', function () {
	var getters;
	const multilingualStringsetValueId = 1;
	const monolingualStringsetId = 2;
	const englishMonolingualStringsetLanguageId = 3;
	const afrikaansMonolingualStringsetLanguageId = 4;
	const englishMonolingualStringsetValueId = 5;
	const afrikaansMonolingualStringsetValueId = 6;
	const multilingualStringValueId = 7;
	const afrikaansStringId = 8;
	const englishStringId = 9;
	const stringId = 10;
	beforeEach( function () {
		getters = {
			getUserLangZid: jest.fn().mockReturnValue( Constants.Z_NATURAL_LANGUAGE_ENGLISH ),
			getStoredObject: jest.fn( () => ( zid ) => {
				const objects = {
					[ Constants.Z_NATURAL_LANGUAGE_AFRIKAANS ]: {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_NATURAL_LANGUAGE_ISO_CODE ]: Constants.Z_NATURAL_LANGUAGE_ISO_CODE
						}
					},
					[ Constants.Z_NATURAL_LANGUAGE_ENGLISH ]: {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_NATURAL_LANGUAGE_ISO_CODE ]: Constants.Z_NATURAL_LANGUAGE_ISO_CODE
						}
					}
				};
				return objects[ zid ];
			} ),
			getLabel: () => ( zid ) => {
				const labels = {
					[ Constants.Z_NATURAL_LANGUAGE_AFRIKAANS ]: 'AF',
					[ Constants.Z_NATURAL_LANGUAGE_ENGLISH ]: 'EN'
				};
				return labels[ zid ];
			},
			getAllItemsFromListById: () => ( parentId ) => {
				if ( parentId === multilingualStringsetValueId ) {
					return [ { id: monolingualStringsetId } ];
				} else if ( parentId === multilingualStringValueId ) {
					return [ { id: englishMonolingualStringsetLanguageId, key: '1', value: 'object' },
						{ id: afrikaansMonolingualStringsetLanguageId, key: '2', value: 'object' } ];
				} else if ( parentId === englishMonolingualStringsetValueId ) {
					return [ { id: englishStringId, key: '1', value: 'object', language: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
						languageString: { value: 'english alias' } } ];
				} else if ( parentId === afrikaansMonolingualStringsetValueId ) {
					return [ { id: afrikaansStringId, key: '2', value: 'object', language: Constants.Z_NATURAL_LANGUAGE_AFRIKAANS,
						languageString: { value: 'afrikaans alias' } } ];
				} else if ( parentId === afrikaansMonolingualStringsetLanguageId ) {
					return [ { id: stringId, key: '1', value: 'object' } ];
				} else if ( parentId === englishMonolingualStringsetLanguageId ) {
					return [ { id: stringId, key: '1', value: 'object' } ];
				}
			},
			getNestedZObjectById: () => ( id, keys ) => {
				if ( id === 0 && keys.length === 2 &&
					keys[ 0 ] === Constants.Z_PERSISTENTOBJECT_ALIASES &&
					keys[ 1 ] === Constants.Z_MULTILINGUALSTRINGSET_VALUE ) {
					return { id: multilingualStringsetValueId };
				} else if ( id === 0 &&
					keys[ 0 ] === Constants.Z_PERSISTENTOBJECT_LABEL &&
					keys[ 1 ] === Constants.Z_MULTILINGUALSTRING_VALUE ) {
					return { id: multilingualStringValueId };
				} else if ( id === englishMonolingualStringsetLanguageId && keys.length === 2 &&
					keys[ 0 ] === Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE &&
					keys[ 1 ] === Constants.Z_REFERENCE_ID ) {
					return { value: Constants.Z_NATURAL_LANGUAGE_ENGLISH };
				} else if ( id === afrikaansMonolingualStringsetLanguageId && keys.length === 2 &&
					keys[ 0 ] === Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE &&
					keys[ 1 ] === Constants.Z_REFERENCE_ID ) {
					return { value: Constants.Z_NATURAL_LANGUAGE_AFRIKAANS };
				} else if ( id === englishMonolingualStringsetLanguageId && keys.length === 1 &&
					keys[ 0 ] === Constants.Z_MONOLINGUALSTRINGSET_VALUE ) {
					return { id: englishMonolingualStringsetValueId };
				} else if ( id === afrikaansMonolingualStringsetLanguageId && keys.length === 1 &&
					keys[ 0 ] === Constants.Z_MONOLINGUALSTRINGSET_VALUE ) {
					return { id: afrikaansMonolingualStringsetValueId };
				}
			},
			getZObjectChildrenById: () => ( parentId ) => {
				if ( parentId === multilingualStringsetValueId ) {
					return [
						{ id: englishMonolingualStringsetLanguageId, key: Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE },
						{ id: afrikaansMonolingualStringsetLanguageId, key: Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE }
					];
				}
			},
			getZObjectAsJsonById: createGettersWithFunctionsMock(
				{
					[ Constants.Z_OBJECT_TYPE ]: {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
						[ Constants.Z_REFERENCE_ID ]: Constants.Z_MULTILINGUALSTRINGSET
					},
					[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ]: [
						{
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
							[ Constants.Z_REFERENCE_ID ]: Constants.Z_MONOLINGUALSTRINGSET
						},
						{
							[ Constants.Z_OBJECT_TYPE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: Constants.Z_MONOLINGUALSTRINGSET
							},
							[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH
							},
							[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ]: [
								{
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
									[ Constants.Z_REFERENCE_ID ]: Constants.Z_STRING
								},
								{
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
									[ Constants.Z_STRING_VALUE ]: 'English alias'
								}
							]
						},
						{
							[ Constants.Z_OBJECT_TYPE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: Constants.Z_MONOLINGUALSTRINGSET
							},
							[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ]: {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: Constants.Z_NATURAL_LANGUAGE_AFRIKAANS
							},
							[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ]: [
								{
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
									[ Constants.Z_REFERENCE_ID ]: Constants.Z_STRING
								},
								{
									[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
									[ Constants.Z_STRING_VALUE ]: 'Afrikaans alias'
								}
							]
						}
					]
				}
			)
		};
		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors the sidebar component', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerAliases );

		expect( wrapper.find( '.ext-wikilambda-function-viewer-aliases' ).exists() ).toBeTruthy();
		expect( wrapper.findComponent( FunctionViewerSidebar ).exists() ).toBeTruthy();
		expect( wrapper.find( '.ext-wikilambda-function-viewer-aliases__header' ).text() ).toEqual( 'Aliases' );
	} );

	it( 'filters function aliases to current language when showAllLangs is false', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewerAliases );
		var selectedFunctionAliases = wrapper.vm.getSelectedAliases( 'Z1002' );

		expect( selectedFunctionAliases ).toEqual( [ { isoCode: 'Z60K1', label: 'english alias', language: 'Z1002', languageLabel: 'EN' } ] );
	} );

	it( 'displays an alias chip for every alias in current language', async function () {
		var wrapper = VueTestUtils.mount( FunctionViewerAliases );

		expect( wrapper.findAll( '.ext-wikilambda-function-viewer-sidebar__chip-item' ).length ).toBe( 1 );
		expect( wrapper.findAll( '.ext-wikilambda-function-viewer-sidebar__chip-container' )[ 0 ].text() ).toBe( 'Z60K1 english alias' );
	} );

	it( 'displays an alias chip for all languages when show more languages expansion button is clicked', async function () {
		var wrapper = VueTestUtils.mount( FunctionViewerAliases );

		await wrapper.findComponent( '.ext-wikilambda-function-viewer-sidebar__button' ).trigger( 'click' );
		await wrapper.vm.$nextTick();

		expect( wrapper.findAll( '.ext-wikilambda-function-viewer-sidebar__chip-item' ).length ).toBe( 2 );
		expect( wrapper.findAll( '.ext-wikilambda-function-viewer-sidebar__chip-container' )[ 1 ].text() ).toBe( 'Z60K1 afrikaans alias' );
	} );
} );
