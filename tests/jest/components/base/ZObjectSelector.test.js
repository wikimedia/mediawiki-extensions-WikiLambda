/*!
 * WikiLambda unit test suite for the ZObjectSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { mount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const { mockEnumValues, mockLookupValues } = require( '../../fixtures/mocks.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZObjectSelector = require( '../../../../resources/ext.wikilambda.app/components/base/ZObjectSelector.vue' );

describe( 'ZObjectSelector', () => {
	let store;

	/**
	 * Helper function to render ZObjectSelector component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZObjectSelector( props = {}, options = {} ) {
		const defaultProps = {
			type: Constants.Z_TYPE
		};
		return mount( ZObjectSelector, { props: { ...defaultProps, ...props }, ...options } );
	}

	describe( 'Lookup', () => {
		beforeEach( () => {
			// Update the Pinia store with the getters and actions
			store = useMainStore();
			store.isEnumType = createGettersWithFunctionsMock( false );
			store.getErrors = createGettersWithFunctionsMock( [] );
			store.getUserRequestedLang = 'en';
			store.getFetchedObject = createGettersWithFunctionsMock();
			store.getLabelData = createLabelDataMock( {
				Z6: 'String',
				Z4: 'Type',
				Z40: 'Boolean',
				Z60: 'Natural language',
				Z1001: 'Arabic',
				Z1002: 'English',
				Z1003: 'Spanish',
				Z1004: 'French',
				Z1005: 'Russian',
				Z1672: 'Chinese (traditional)',
				Z1645: 'Chinese (simplified)'
			} );
			store.fetchZids.mockResolvedValue();
		} );

		it( 'renders without errors', () => {
			const wrapper = renderZObjectSelector();
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'on lookup, sends the the type in the payload', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = renderZObjectSelector( {
				type: Constants.Z_STRING
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Stri' );

			await waitFor( () => expect( store.lookupZObjectLabels ).toHaveBeenLastCalledWith( {
				input: 'Stri',
				types: [ Constants.Z_STRING ],
				returnTypes: undefined,
				searchContinue: null,
				signal: expect.any( Object )
			} ) );
		} );

		it( 'on lookup, searches for the Zid when pasting a Wikifunctions URL', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = renderZObjectSelector( {
				type: Constants.Z_STRING
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'https://www.wikifunctions.org/view/fr/Z801' );

			await waitFor( () => expect( store.lookupZObjectLabels ).toHaveBeenLastCalledWith( {
				input: 'Z801',
				types: [ Constants.Z_STRING ],
				returnTypes: undefined,
				searchContinue: null,
				signal: expect.any( Object )
			} ) );

			// The pasted URL stays in the field, and the results are not discarded as stale
			expect( lookup.props( 'inputValue' ) ).toBe( 'https://www.wikifunctions.org/view/fr/Z801' );
		} );

		it( 'on lookup for types, sends type and return type in the payload', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = renderZObjectSelector( {
				type: Constants.Z_TYPE
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Stri' );

			await waitFor( () => expect( store.lookupZObjectLabels ).toHaveBeenLastCalledWith( {
				input: 'Stri',
				types: [ Constants.Z_TYPE, Constants.Z_FUNCTION_CALL ],
				returnTypes: [ Constants.Z_TYPE, Constants.Z_OBJECT ],
				searchContinue: null,
				signal: expect.any( Object )
			} ) );
		} );

		it( 'on lookup for strict types, sends type and return type in the payload', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = renderZObjectSelector( {
				type: Constants.Z_TYPE,
				strictReturnType: true
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Stri' );

			await waitFor( () => expect( store.lookupZObjectLabels ).toHaveBeenLastCalledWith( {
				input: 'Stri',
				types: [ Constants.Z_TYPE, Constants.Z_FUNCTION_CALL ],
				returnTypes: [ Constants.Z_TYPE ],
				searchContinue: null,
				signal: expect.any( Object )
			} ) );
		} );

		it( 'on input change, shows lookup results', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = renderZObjectSelector( {
				type: Constants.Z_TYPE,
				strictReturnType: true
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'text' );

			const lookupPayload = {
				input: 'text',
				types: [ Constants.Z_TYPE, Constants.Z_FUNCTION_CALL ],
				returnTypes: [ Constants.Z_TYPE ],
				searchContinue: null,
				signal: expect.any( Object )
			};
			const lookupItems = [ {
				description: 'Type',
				icon: undefined,
				label: 'Monolingual text',
				supportingText: '',
				value: 'Z11'
			}, {
				description: 'Type',
				icon: undefined,
				label: 'Multilingual text',
				supportingText: '',
				value: 'Z12'
			} ];

			await waitFor( () => {
				expect( store.lookupZObjectLabels ).toHaveBeenLastCalledWith( lookupPayload );
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
				expect( lookup.props( 'menuItems' ) ).toEqual( lookupItems );
			} );
		} );

		it( 'on input change, shows function/instance icons when no type restriction', async () => {
			const mixedResults = {
				labels: [ {
					page_title: 'Z10001',
					page_type: Constants.Z_FUNCTION,
					label: 'Some function',
					match_label: 'Some function',
					type_label: 'Function'
				}, {
					page_title: 'Z10002',
					page_type: Constants.Z_TYPE,
					label: 'Some type',
					match_label: 'Some type',
					type_label: 'Type'
				} ]
			};
			store.lookupZObjectLabels.mockResolvedValue( mixedResults );

			const wrapper = renderZObjectSelector( { type: undefined } );
			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'some' );

			await waitFor( () => {
				const items = lookup.props( 'menuItems' );
				expect( items.length ).toBe( 2 );
				expect( items[ 0 ].icon ).toBe( '<path data-testid="mock-icon-cdxIconFunction"/>' );
				expect( items[ 1 ].icon ).toBe( '<path data-testid="mock-icon-cdxIconInstance"/>' );
			} );
		} );

		it( 'shows the function icon inside the input when selecting a function', () => {
			const wrapper = renderZObjectSelector( { type: Constants.Z_FUNCTION } );
			expect( wrapper.vm.startIcon ).toBe( '<path data-testid="mock-icon-cdxIconFunction"/>' );
		} );

		it( 'shows the language icon inside the input when selecting a language', () => {
			const wrapper = renderZObjectSelector( { type: Constants.Z_NATURAL_LANGUAGE } );
			expect( wrapper.vm.startIcon ).toBe( '<path data-testid="mock-icon-cdxIconLanguage"/>' );
		} );

		it( 'shows no icon inside the input for other types', () => {
			const wrapper = renderZObjectSelector( { type: Constants.Z_TYPE } );
			expect( wrapper.vm.startIcon ).toBeUndefined();
		} );

		it( 'on initialization, sets suggested objects', async () => {
			const wrapper = renderZObjectSelector( {
				type: Constants.Z_TYPE
			} );

			const commonTypes = [ {
				label: 'Suggested types',
				value: 'suggestion',
				disabled: true
			}, {
				value: 'Z6',
				label: 'String',
				description: 'Type',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z40',
				label: 'Boolean',
				description: 'Type',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			} ];
			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );

			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 3 ) );
			expect( lookup.props( 'menuItems' ) ).toEqual( commonTypes );
		} );

		it( 'on type change, sets suggested objects', async () => {
			const wrapper = renderZObjectSelector();

			wrapper.setProps( { type: Constants.Z_NATURAL_LANGUAGE } );

			const commonLangs = [ {
				label: 'Suggested languages',
				value: 'suggestion',
				disabled: true
			}, {
				value: 'Z1002',
				label: 'English',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1001',
				label: 'Arabic',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1003',
				label: 'Spanish',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1004',
				label: 'French',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1005',
				label: 'Russian',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1672',
				label: 'Chinese (traditional)',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1645',
				label: 'Chinese (simplified)',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			} ];
			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );

			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 8 ) );
			expect( lookup.props( 'menuItems' ) ).toEqual( commonLangs );
		} );

		it( 'on blur, try to match and ignore if no matching value', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = renderZObjectSelector( {
				type: Constants.Z_TYPE,
				selectedZid: Constants.Z_STRING
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'text' );

			await waitFor( () => {
				expect( lookup.props( 'inputValue' ) ).toBe( 'text' );
				expect( store.lookupZObjectLabels ).toHaveBeenCalled();
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
				expect( lookup.props( 'menuItems' )[ 0 ].label ).toEqual( 'Monolingual text' );
			} );

			lookup.vm.$emit( 'blur' );

			// No exact match for "text", input value remains as typed
			expect( lookup.props( 'inputValue' ) ).toBe( 'text' );
		} );

		it( 'on blur, try to match and select the matching value', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = renderZObjectSelector( {
				type: Constants.Z_TYPE,
				selectedZid: Constants.Z_STRING
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Monolingual text' );

			await waitFor( () => {
				expect( lookup.props( 'inputValue' ) ).toBe( 'Monolingual text' );
				expect( store.lookupZObjectLabels ).toHaveBeenCalled();
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
				expect( lookup.props( 'menuItems' )[ 0 ].label ).toEqual( 'Monolingual text' );
			} );

			lookup.vm.$emit( 'blur' );

			// Found exact match for "Monolingual text", set as selected
			expect( lookup.props( 'inputValue' ) ).toBe( 'Monolingual text' );
		} );

		it( 'on blur, does not select a value when more than one option has the input label', async () => {
			store.lookupZObjectLabels.mockResolvedValue( {
				labels: [
					{ page_title: 'Z11', page_type: 'Z4', label: 'Text', match_label: 'Text', type_label: 'Type' },
					{ page_title: 'Z12', page_type: 'Z4', label: 'Text', match_label: 'Text', type_label: 'Type' }
				]
			} );

			const onSelectItem = jest.fn();
			const wrapper = renderZObjectSelector( {
				type: Constants.Z_TYPE,
				selectedZid: Constants.Z_STRING,
				onSelectItem
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Text' );
			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 2 ) );

			lookup.vm.$emit( 'blur' );

			// Two objects have the label "Text": select none, restore the selected label
			await waitFor( () => expect( lookup.props( 'inputValue' ) ).toBe( 'String' ) );
			expect( onSelectItem ).not.toHaveBeenCalled();
		} );

		it( 'on blur, selects a value that matches in more than one option', async () => {
			// The same object can match the search more than once (for example, by an alias)
			store.lookupZObjectLabels.mockResolvedValue( {
				labels: [
					{ page_title: 'Z11', page_type: 'Z4', label: 'Monolingual text', match_label: 'Monolingual text', type_label: 'Type' },
					{ page_title: 'Z11', page_type: 'Z4', label: 'Monolingual text', match_label: 'Text', type_label: 'Type' }
				]
			} );

			const onSelectItem = jest.fn();
			const wrapper = renderZObjectSelector( {
				type: Constants.Z_TYPE,
				selectedZid: Constants.Z_STRING,
				onSelectItem
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Monolingual text' );
			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 2 ) );

			lookup.vm.$emit( 'blur' );

			expect( onSelectItem ).toHaveBeenCalledWith( 'Z11' );
		} );

		it( 'on blur while unmounting, does not select a matching value', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			// Use a listener: wrapper.unmount() clears the emitted events
			const onSelectItem = jest.fn();
			const wrapper = renderZObjectSelector( {
				type: Constants.Z_TYPE,
				selectedZid: '',
				onSelectItem
			} );

			// The search text is the label of the first option
			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Monolingual text' );
			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 2 ) );

			// The user selects the second option
			lookup.vm.$emit( 'update:selected', 'Z12' );
			expect( onSelectItem.mock.calls ).toEqual( [ [ 'Z12' ] ] );

			// The selection replaces the parent object, which removes this selector.
			// Like Chrome, blur the input when it is removed from the page.
			const input = wrapper.get( 'input' ).element;
			const removeChild = Node.prototype.removeChild;
			let blurred = false;
			const removeChildSpy = jest.spyOn( Node.prototype, 'removeChild' ).mockImplementation( function ( child ) {
				if ( !blurred && child.contains( input ) ) {
					blurred = true;
					input.dispatchEvent( new Event( 'blur' ) );
				}
				return removeChild.call( this, child );
			} );
			wrapper.unmount();
			removeChildSpy.mockRestore();

			// The blur does not select the first option
			expect( blurred ).toBe( true );
			expect( onSelectItem.mock.calls ).toEqual( [ [ 'Z12' ] ] );
		} );

		it( 'appends lookup results when loading more', async () => {
			jest.useFakeTimers();
			try {
				const firstBatch = {
					labels: [ {
						page_title: 'Z11',
						label: 'Monolingual text',
						match_label: 'Monolingual text',
						page_type: Constants.Z_TYPE,
						type_label: 'Type'
					} ],
					searchContinue: 'continue-1'
				};
				const secondBatch = {
					labels: [ {
						page_title: 'Z12',
						label: 'Multilingual text',
						match_label: 'Multilingual text',
						page_type: Constants.Z_TYPE,
						type_label: 'Type'
					} ],
					searchContinue: null
				};

				store.lookupZObjectLabels.mockReset();
				store.lookupZObjectLabels
					.mockResolvedValueOnce( firstBatch )
					.mockResolvedValueOnce( secondBatch );

				const wrapper = renderZObjectSelector( {
					type: Constants.Z_TYPE
				} );
				const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );

				lookup.vm.$emit( 'update:input-value', 'Mon' );
				jest.runAllTimers();

				await waitFor( () => {
					expect( lookup.props( 'menuItems' ).length ).toBe( 1 );
					expect( lookup.props( 'menuItems' )[ 0 ].value ).toBe( 'Z11' );
				} );

				lookup.vm.$emit( 'load-more' );

				await waitFor( () => {
					expect( store.lookupZObjectLabels ).toHaveBeenCalledTimes( 2 );
					expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
					expect( lookup.props( 'menuItems' ).map( ( item ) => item.value ) ).toEqual( [ 'Z11', 'Z12' ] );
				} );
			} finally {
				jest.useRealTimers();
			}
		} );

		describe( 'no-results slot', () => {
			// Renders the content that the lookup menu shows when a search finds nothing
			const lookupStub = {
				name: 'cdx-lookup',
				template: '<div class="no-results"><slot name="no-results"></slot></div>'
			};

			it( 'shows the no results message if the slot is not set', () => {
				const wrapper = renderZObjectSelector( {}, { global: { stubs: { 'cdx-lookup': lookupStub } } } );

				expect( wrapper.get( '.no-results' ).text() ).toBe( 'No results found.' );
			} );

			it( 'replaces the no results message with the slot content', () => {
				const wrapper = renderZObjectSelector( {}, {
					slots: { 'no-results': '<a class="help-link" href="#">Help</a>' },
					global: { stubs: { 'cdx-lookup': lookupStub } }
				} );

				const noResults = wrapper.get( '.no-results' );
				expect( noResults.text() ).toBe( 'Help' );
				expect( noResults.find( '.help-link' ).exists() ).toBe( true );
			} );
		} );

		it( 'shows a progress bar and not the no-results content until the search is finished', async () => {
			store.lookupZObjectLabels.mockResolvedValue( { labels: [], searchContinue: null } );
			const wrapper = renderZObjectSelector();
			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );

			expect( lookup.props( 'menuConfig' ) ).toEqual( expect.objectContaining( {
				showPending: false,
				showNoResultsSlot: null
			} ) );

			lookup.vm.$emit( 'update:input-value', 'nothing' );
			await wrapper.vm.$nextTick();

			expect( lookup.props( 'menuConfig' ) ).toEqual( expect.objectContaining( {
				showPending: true,
				showNoResultsSlot: false
			} ) );

			await waitFor( () => expect( lookup.props( 'menuConfig' ) ).toEqual( expect.objectContaining( {
				searchQuery: 'nothing',
				showPending: false,
				showNoResultsSlot: null
			} ) ) );
		} );

		it( 'shows a progress bar when the focus starts a search for the selected label', async () => {
			let resolveLookup;
			store.lookupZObjectLabels.mockReturnValue( new Promise( ( resolve ) => {
				resolveLookup = resolve;
			} ) );
			const wrapper = renderZObjectSelector( { selectedZid: Constants.Z_STRING } );
			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			await wrapper.vm.$nextTick();

			expect( lookup.props( 'inputValue' ) ).toBe( 'String' );
			expect( lookup.props( 'menuConfig' ).showPending ).toBe( false );

			lookup.vm.$emit( 'focus' );
			await wrapper.vm.$nextTick();

			expect( store.lookupZObjectLabels ).toHaveBeenCalledWith( expect.objectContaining( { input: 'String' } ) );
			expect( lookup.props( 'menuConfig' ) ).toEqual( expect.objectContaining( {
				showPending: true,
				showNoResultsSlot: false
			} ) );

			resolveLookup( mockLookupValues );

			await waitFor( () => expect( lookup.props( 'menuConfig' ) ).toEqual( expect.objectContaining( {
				showPending: false,
				showNoResultsSlot: null
			} ) ) );
		} );

		it( 'does not show a progress bar after a value is selected', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );
			const wrapper = renderZObjectSelector();
			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );

			lookup.vm.$emit( 'update:input-value', 'Str' );
			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 2 ) );

			await wrapper.setProps( { selectedZid: Constants.Z_STRING } );
			await wrapper.vm.$nextTick();

			// The lookup has the selected value as key, so it is a new component
			const newLookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			expect( newLookup.props( 'inputValue' ) ).toBe( 'String' );
			expect( newLookup.props( 'menuConfig' ).showPending ).toBe( false );
		} );

		it( 'shows the no-results content after a failed search', async () => {
			store.lookupZObjectLabels.mockRejectedValue( { code: 'http' } );
			const wrapper = renderZObjectSelector();
			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );

			lookup.vm.$emit( 'update:input-value', 'nothing' );

			await waitFor( () => expect( lookup.props( 'menuConfig' ) ).toEqual( expect.objectContaining( {
				showPending: false,
				showNoResultsSlot: null
			} ) ) );
		} );
	} );

	describe( 'Select', () => {
		const mockEnumZid = 'Z30000';

		beforeEach( () => {
			store = useMainStore();
			store.isEnumType = createGettersWithFunctionsMock( true );
			store.getEnumValues = createGettersWithFunctionsMock( mockEnumValues );
			store.getErrors = createGettersWithFunctionsMock( [] );
			store.getUserRequestedLang = 'en';
			store.getLabelData = createLabelDataMock( {
				Z6: 'String',
				Z4: 'Type',
				Z40: 'Boolean',
				Z60: 'Natural language',
				Z1001: 'Arabic',
				Z1002: 'English',
				Z1003: 'Spanish',
				Z1004: 'French',
				Z1005: 'Russian',
				Z1006: 'Chinese',
				Z30004: 'April',
				Z30005: 'May',
				Z30006: 'June',
				Z30007: 'July',
				Z30008: 'August',
				Z30009: 'September',
				Z30010: 'October',
				Z30011: 'November',
				Z30012: 'December'
			} );
			store.fetchZids.mockResolvedValue();
		} );

		it( 'renders without errors', () => {
			const wrapper = renderZObjectSelector();
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'renders a selector instead of lookup component', () => {
			const wrapper = renderZObjectSelector( {
				type: mockEnumZid
			} );

			expect( wrapper.findComponent( { name: 'cdx-select' } ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-lookup' } ).exists() ).toBe( false );
		} );

		it( 'fetches enum values on initialization', async () => {
			const wrapper = renderZObjectSelector( {
				type: mockEnumZid
			} );

			const enumMenuItems = [ {
				value: 'Z30001',
				label: 'January'
			}, {
				value: 'Z30002',
				label: 'February'
			}, {
				value: 'Z30003',
				label: 'March'
			} ];

			const select = wrapper.getComponent( { name: 'cdx-select' } );
			await waitFor( () => expect( select.props( 'menuItems' ).length ).toBe( 3 ) );
			expect( store.getEnumValues ).toHaveBeenCalledWith( mockEnumZid, '' );
			expect( select.props( 'menuItems' ) ).toEqual( enumMenuItems );
		} );

		it( 'sorts enum menu items by Zid using natural ordering', async () => {
			const unsortedEnumValues = [
				{ page_title: 'Z30010', label: 'October' },
				{ page_title: 'Z30002', label: 'February' },
				{ page_title: 'Z30001', label: 'January' },
				{ page_title: 'Z30005', label: 'May' }
			];
			store.getEnumValues = createGettersWithFunctionsMock( unsortedEnumValues );

			const wrapper = renderZObjectSelector( {
				type: mockEnumZid
			} );

			const select = wrapper.getComponent( { name: 'cdx-select' } );
			await waitFor( () => expect( select.props( 'menuItems' ).length ).toBe( 4 ) );
			expect( select.props( 'menuItems' ) ).toEqual( [
				{ value: 'Z30001', label: 'January' },
				{ value: 'Z30002', label: 'February' },
				{ value: 'Z30005', label: 'May' },
				{ value: 'Z30010', label: 'October' }
			] );
		} );

		it( 'sets new value on selector update', async () => {
			const wrapper = renderZObjectSelector( {
				type: mockEnumZid
			} );

			const select = wrapper.getComponent( { name: 'cdx-select' } );
			select.vm.$emit( 'update:selected', 'Z30003' );

			expect( wrapper.emitted() ).toHaveProperty( 'select-item', [ [ 'Z30003' ] ] );
		} );

		it( 'prepends the selected value if not present in the batch', async () => {
			store.getEnumValues = jest.fn().mockImplementation( ( zid, selected ) => {
				const selectedValue = { page_title: 'Z30004', label: 'April' };
				return ( selected === 'Z30004' ) ? [ selectedValue, ...mockEnumValues ] : mockEnumValues;
			} );

			const wrapper = renderZObjectSelector( {
				type: mockEnumZid,
				selectedZid: 'Z30004'
			} );

			const select = wrapper.getComponent( { name: 'cdx-select' } );
			await waitFor( () => expect( select.props( 'menuItems' ).length ).toBe( 4 ) );
			expect( store.getEnumValues ).toHaveBeenCalledWith( mockEnumZid, 'Z30004' );
			expect( select.props( 'menuItems' ) ).toEqual( [
				{ value: 'Z30001', label: 'January' },
				{ value: 'Z30002', label: 'February' },
				{ value: 'Z30003', label: 'March' },
				{ value: 'Z30004', label: 'April' }
			] );
		} );
	} );
} );
