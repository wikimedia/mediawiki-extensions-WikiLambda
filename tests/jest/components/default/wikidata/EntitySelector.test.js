/*!
 * WikiLambda unit test suite for the Wikidata Entity Selector component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' ),
	{ waitFor } = require( '@testing-library/vue' ),
	{ mockLookupLexemes } = require( '../../../fixtures/mocks.js' ),
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	WikidataEntitySelector = require( '../../../../../resources/ext.wikilambda.app/components/default-view-types/wikidata/EntitySelector.vue' );

describe( 'WikidataEntitySelector', () => {
	let actions;
	beforeEach( () => {
		actions = {
			lookupWikidataEntities: jest.fn()
		};
		global.store.hotUpdate( { actions } );
	} );

	it( 'renders for lexeme without errors', () => {
		const wrapper = shallowMount( WikidataEntitySelector, {
			props: {
				entityId: null,
				entityLabel: '',
				type: Constants.Z_WIKIDATA_LEXEME
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-wikidata-entity-selector' ).exists() ).toBe( true );
	} );

	it( 'renders for lexeme form without errors', () => {
		const wrapper = shallowMount( WikidataEntitySelector, {
			props: {
				entityId: null,
				entityLabel: '',
				type: Constants.Z_WIKIDATA_LEXEME_FORM
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-wikidata-entity-selector' ).exists() ).toBe( true );
	} );

	it( 'renders for item without errors', () => {
		const wrapper = shallowMount( WikidataEntitySelector, {
			props: {
				entityId: null,
				entityLabel: '',
				type: Constants.Z_WIKIDATA_ITEM
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-wikidata-entity-selector' ).exists() ).toBe( true );
	} );

	it( 'initializes selected lexeme', async () => {
		const wrapper = shallowMount( WikidataEntitySelector, {
			props: {
				entityId: 'L333333',
				entityLabel: 'turtle',
				type: Constants.Z_WIKIDATA_LEXEME
			}
		} );

		await wrapper.vm.$nextTick();
		const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

		expect( lookup.exists() ).toBe( true );
		expect( lookup.vm.selected ).toBe( 'L333333' );
		expect( lookup.vm.inputValue ).toBe( 'turtle' );
	} );

	it( 're-initializes selected lexeme', async () => {
		const wrapper = shallowMount( WikidataEntitySelector, {
			props: {
				entityId: null,
				entityLabel: '',
				type: Constants.Z_WIKIDATA_LEXEME
			}
		} );

		const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

		expect( lookup.vm.inputValue ).toBe( '' );
		wrapper.setProps( { entityId: 'L333333', entityLabel: 'turtle' } );
		await wrapper.vm.$nextTick();

		expect( lookup.exists() ).toBe( true );
		expect( lookup.vm.selected ).toBe( 'L333333' );
		expect( lookup.vm.inputValue ).toBe( 'turtle' );
	} );

	describe( 'on update inputValue', () => {
		it( 'clears lookup results when clearing the input field', () => {
			const wrapper = shallowMount( WikidataEntitySelector, {
				props: {
					entityId: 'L333333',
					entityLabel: 'turtle',
					type: Constants.Z_WIKIDATA_LEXEME
				}
			} );

			wrapper.setData( { lookupResults: [ {
				description: 'English, noun',
				label: 'pangolin',
				value: 'L290326'
			} ] } );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:inputValue', '' );
			expect( wrapper.vm.lookupResults.length ).toBe( 0 );
		} );

		it( 'performs lookup when updating input value field', async () => {
			actions.lookupWikidataEntities = jest.fn().mockResolvedValue( mockLookupLexemes );
			global.store.hotUpdate( { actions } );

			const wrapper = shallowMount( WikidataEntitySelector, {
				props: {
					entityId: null,
					entityLabel: '',
					type: Constants.Z_WIKIDATA_LEXEME
				}
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:inputValue', 'pangoli' );

			// Wait for lookup API to be called:
			await waitFor( () => expect( actions.lookupWikidataEntities )
				.toHaveBeenCalledWith( expect.anything(), { search: 'pangoli', type: 'lexeme' } ) );

			expect( wrapper.vm.lookupConfig.searchQuery ).toBe( 'pangoli' );
			expect( lookup.vm.menuItems.length ).toBe( 2 );
			expect( lookup.vm.menuItems[ 0 ] ).toEqual( {
				description: 'English, noun',
				label: 'pangolin',
				value: 'L290326'
			} );
			expect( lookup.vm.menuItems[ 1 ] ).toEqual( {
				description: 'Italian, noun',
				label: 'pangolino',
				value: 'L1208742'
			} );
		} );
	} );

	describe( 'on blur', () => {
		it( 'does nothing when input value is the same as selected value', () => {
			const wrapper = shallowMount( WikidataEntitySelector, {
				props: {
					entityId: 'L333333',
					entityLabel: 'turtle',
					type: Constants.Z_WIKIDATA_LEXEME
				}
			} );

			// Previously selected value: turtle
			expect( wrapper.vm.inputValue ).toBe( 'turtle' );

			// Search for "turtle" generated two results
			wrapper.setData( {
				inputValue: 'turtle',
				lookupResults: [ {
					description: 'English, noun',
					label: 'turtle',
					value: 'L45131'
				}, {
					description: 'English, verb',
					label: 'turtle',
					value: 'L333333'
				} ]
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'blur' );

			// Do nothing
			expect( wrapper.vm.inputValue ).toBe( 'turtle' );
			expect( wrapper.emitted() ).not.toHaveProperty( 'select-wikidata-entity' );
		} );

		it( 'resets to previous value when input has no match', () => {
			const wrapper = shallowMount( WikidataEntitySelector, {
				props: {
					entityId: 'L333333',
					entityLabel: 'turtle',
					type: Constants.Z_WIKIDATA_LEXEME
				}
			} );

			// Previously selected value: turtle
			expect( wrapper.vm.inputValue ).toBe( 'turtle' );

			// Search for "pangol" generated two results: none fully match
			wrapper.setData( {
				inputValue: 'pangol',
				lookupResults: [ {
					description: 'English, noun',
					label: 'pangolin',
					value: 'L290326'
				}, {
					description: 'Italian, noun',
					label: 'pangolino',
					value: 'L1208742'
				} ]
			} );

			const lookup = wrapper.findComponent( { name: 'wl-wikidata-entity-selector' } );
			lookup.vm.$emit( 'blur' );

			// Reset to previous value
			expect( wrapper.vm.inputValue ).toBe( 'turtle' );
		} );

		it( 'sets new value when input has a match', () => {
			const wrapper = shallowMount( WikidataEntitySelector, {
				props: {
					entityId: 'L333333',
					entityLabel: 'turtle',
					type: Constants.Z_WIKIDATA_LEXEME
				}
			} );

			// Previously selected value: turtle
			expect( wrapper.vm.inputValue ).toBe( 'turtle' );

			// Search for "pangolin" generated two results: one fully matches
			wrapper.setData( {
				inputValue: 'pangolin',
				lookupResults: [ {
					description: 'English, noun',
					label: 'pangolin',
					value: 'L290326'
				}, {
					description: 'Italian, noun',
					label: 'pangolino',
					value: 'L1208742'
				} ]
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'blur' );

			// Set new value
			expect( wrapper.vm.inputValue ).toBe( 'pangolin' );
			expect( wrapper.emitted() ).toHaveProperty( 'select-wikidata-entity', [ [ 'L290326' ] ] );
		} );
	} );

	describe( 'on update selected', () => {
		it( 'does nothing if lookup emits empty select event', async () => {
			const wrapper = shallowMount( WikidataEntitySelector, {
				props: {
					entityId: null,
					entityLabel: '',
					type: Constants.Z_WIKIDATA_LEXEME
				}
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', null );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).not.toHaveProperty( 'select-wikidata-entity' );
		} );

		it( 'does nothing if lookup emits already selected value', async () => {
			const wrapper = shallowMount( WikidataEntitySelector, {
				props: {
					entityId: 'L333333',
					entityLabel: 'turtle',
					type: Constants.Z_WIKIDATA_LEXEME
				}
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', 'L333333' );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).not.toHaveProperty( 'select-wikidata-entity' );
		} );

		it( 'emits select event when when selecting valid option from the menu', async () => {
			const wrapper = shallowMount( WikidataEntitySelector, {
				props: {
					entityId: null,
					entityLabel: '',
					type: Constants.Z_WIKIDATA_LEXEME
				}
			} );

			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:selected', 'L1208742' );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'select-wikidata-entity', [ [ 'L1208742' ] ] );
		} );
	} );
} );
