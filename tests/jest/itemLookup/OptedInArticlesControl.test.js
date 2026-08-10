/*!
 * WikiLambda unit tests for the CommunityConfiguration opted-in articles control.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount, flushPromises } = require( '@vue/test-utils' );
const { CdxButton, CdxChipInput, CdxField, CdxLookup } = require( '@wikimedia/codex' );

const OptedInArticlesControl =
	require( '../../../resources/ext.wikilambda.itemLookup/OptedInArticlesControl.vue' );
const itemLookupApi =
	require( '../../../resources/ext.wikilambda.itemLookup/itemLookupApi.js' );

const SCHEMA = {
	type: 'array',
	items: {
		type: 'object',
		properties: {
			title: { type: 'array', items: { type: 'string' }, minItems: 1 },
			qid: { type: 'string', pattern: '^Q[1-9]\\d*$' }
		},
		required: [ 'title', 'qid' ],
		additionalProperties: false
	}
};

function mountControl( { data = { OptedInArticles: [] } } = {} ) {
	const jsonform = { data, errors: {} };
	const wrapper = mount( OptedInArticlesControl, {
		props: {
			schema: SCHEMA,
			uischema: {
				name: 'OptedInArticles',
				scope: '#/properties/OptedInArticles',
				type: 'Control'
			}
		},
		global: { provide: { jsonform } }
	} );
	return { wrapper, jsonform };
}

const rows = ( wrapper ) => wrapper.findAll( '.ext-wikilambda-optedInArticles__row' );

describe( 'OptedInArticlesControl', () => {
	beforeEach( () => {
		mw.config.get = jest.fn( ( key ) => {
			switch ( key ) {
				case 'wgUserLanguage':
					return 'en';
				case 'wgWikiLambdaClientModeOffline':
					return false;
				default:
					return null;
			}
		} );
		mw.util = { getUrl: jest.fn( ( title ) => `/wiki/${ title }` ) };
		// Enough of mw.Title to tell an article title from the rest.
		mw.Title.newFromText = ( text ) => {
			const name = text.trim().replace( /_/g, ' ' );
			if ( !name || /[#<>[\]{}|]/.test( name ) ) {
				return null;
			}
			const normal = name.charAt( 0 ).toUpperCase() + name.slice( 1 );
			return {
				getNamespaceId: () => ( normal.startsWith( 'Talk:' ) ? 1 : 0 ),
				getPrefixedText: () => normal
			};
		};
		jest.spyOn( itemLookupApi, 'fetchItemLabels' ).mockResolvedValue( { Q42: 'Douglas Adams' } );
	} );

	describe( 'the stored list', () => {
		it( 'shows one row for each article, with its titles as chips', () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'Douglas Adams', 'Adams, Douglas' ], qid: 'Q42' },
				{ title: [ 'Berlin' ], qid: 'Q64' }
			] } } );

			expect( rows( wrapper ) ).toHaveLength( 2 );
			expect( wrapper.findAllComponents( CdxChipInput )[ 0 ].props( 'inputChips' ) ).toEqual( [
				{ value: 'Douglas Adams', label: 'Douglas Adams' },
				{ value: 'Adams, Douglas', label: 'Adams, Douglas' }
			] );
		} );

		it( 'shows no row for an empty list', () => {
			const { wrapper } = mountControl();

			expect( rows( wrapper ) ).toHaveLength( 0 );
		} );

		it( 'asks Wikidata for the labels of the topics and the stored items together', async () => {
			mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: 'Q42' },
				{ title: [ 'B' ], qid: 'Q90' }
			] } } );
			await flushPromises();

			expect( itemLookupApi.fetchItemLabels ).toHaveBeenCalledTimes( 1 );
			expect( itemLookupApi.fetchItemLabels ).toHaveBeenCalledWith(
				expect.objectContaining( { ids: [ 'Q42', 'Q64', 'Q90' ], language: 'en' } )
			);
		} );

		it( 'shows the name of a stored item in place of its bare QID', async () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: 'Q42' }
			] } } );
			await flushPromises();

			expect( wrapper.findComponent( CdxLookup ).props( 'inputValue' ) )
				.toBe( 'Douglas Adams (Q42)' );
		} );

		it( 'keeps the bare QID when Wikidata has no label for it', async () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'B' ], qid: 'Q64' }
			] } } );
			await flushPromises();

			expect( wrapper.findComponent( CdxLookup ).props( 'inputValue' ) ).toBe( 'Q64' );
		} );

		it( 'keeps the bare QID when the label request fails', async () => {
			itemLookupApi.fetchItemLabels.mockRejectedValue( new Error( 'network' ) );
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: 'Q42' }
			] } } );
			await flushPromises();

			expect( wrapper.findComponent( CdxLookup ).props( 'inputValue' ) ).toBe( 'Q42' );
		} );
	} );

	describe( 'the buttons', () => {
		it( 'do not submit the form around the control', () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: 'Q42' }
			] } } );

			// The remove button of each chip belongs to Codex.
			const types = wrapper.findAll( 'button:not( .cdx-input-chip__button )' )
				.map( ( button ) => button.attributes( 'type' ) );
			expect( types ).toEqual( [ 'button', 'button' ] );
		} );
	} );

	describe( 'the links', () => {
		const links = ( wrapper ) => wrapper.findAll( 'a' );

		it( 'open the topic on Abstract Wikipedia and the first title, in a new tab', () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'Douglas Adams', 'Adams, Douglas' ], qid: 'Q42' }
			] } } );

			expect( links( wrapper ).map( ( link ) => link.attributes( 'href' ) ) ).toEqual( [
				'https://abstract.example/wiki/Q42',
				'/wiki/Douglas Adams'
			] );
			links( wrapper ).forEach( ( link ) => {
				expect( link.attributes( 'target' ) ).toBe( '_blank' );
				expect( link.attributes( 'rel' ) ).toBe( 'noopener' );
			} );
		} );

		it( 'stay in place, disabled, while the row has no topic and no title', () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [], qid: '' }
			] } } );

			expect( links( wrapper ) ).toHaveLength( 2 );
			links( wrapper ).forEach( ( link ) => {
				expect( link.attributes( 'href' ) ).toBeUndefined();
				expect( link.attributes( 'aria-disabled' ) ).toBe( 'true' );
				expect( link.classes() ).toContain( 'cdx-button--fake-button--disabled' );
			} );
		} );
	} );

	describe( 'offering topics', () => {
		async function menuFor( data, value, index = 0 ) {
			const { wrapper } = mountControl( { data: { OptedInArticles: data } } );
			await flushPromises();
			const lookup = wrapper.findAllComponents( CdxLookup )[ index ];
			lookup.vm.$emit( 'update:input-value', value );
			await flushPromises();
			return lookup.props( 'menuItems' );
		}

		it( 'offers the allowed topics whose name matches, with their QID', async () => {
			expect( await menuFor( [ { title: [ 'A' ], qid: '' } ], 'doug' ) ).toEqual( [
				{ value: 'Q42', label: 'Douglas Adams (Q42)' }
			] );
		} );

		it( 'finds a topic by its QID, also when it has no name', async () => {
			expect( await menuFor( [ { title: [ 'A' ], qid: '' } ], 'q64' ) ).toEqual( [
				{ value: 'Q64', label: 'Q64' }
			] );
		} );

		it( 'offers nothing outside the allowed topics', async () => {
			expect( await menuFor( [ { title: [ 'A' ], qid: '' } ], 'Q90' ) ).toEqual( [] );
		} );

		it( 'offers nothing for an empty text', async () => {
			expect( await menuFor( [ { title: [ 'A' ], qid: '' } ], '' ) ).toEqual( [] );
		} );

		it( 'leaves out a topic that another row has', async () => {
			expect( await menuFor( [
				{ title: [ 'A' ], qid: 'Q42' },
				{ title: [ 'B' ], qid: '' }
			], 'q', 1 ) ).toEqual( [
				{ value: 'Q64', label: 'Q64' }
			] );
		} );
	} );

	describe( 'with no topic', () => {
		const topicStatus = ( wrapper ) => wrapper.findAllComponents( CdxField )
			.find( ( field ) => field.classes( 'ext-wikilambda-optedInArticles__item' ) )
			.props( 'status' );

		it( 'is not wrong before the sysop has been to the field', () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: '' }
			] } } );

			expect( topicStatus( wrapper ) ).toBe( 'default' );
		} );

		it( 'is wrong once the sysop leaves the field, and right again with a topic', async () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: '' }
			] } } );
			await flushPromises();
			const lookup = wrapper.findComponent( CdxLookup );

			lookup.vm.$emit( 'blur' );
			await flushPromises();
			expect( topicStatus( wrapper ) ).toBe( 'error' );

			lookup.vm.$emit( 'update:input-value', 'doug' );
			lookup.vm.$emit( 'update:selected', 'Q42' );
			await flushPromises();
			expect( topicStatus( wrapper ) ).toBe( 'default' );
		} );
	} );

	describe( 'checking titles', () => {
		function validatorFor( data, index = 0 ) {
			const { wrapper } = mountControl( { data: { OptedInArticles: data } } );
			return wrapper.findAllComponents( CdxChipInput )[ index ].props( 'chipValidator' );
		}

		it( 'accepts the title of an article', () => {
			expect( validatorFor( [ { title: [], qid: 'Q42' } ] )( 'Douglas Adams' ) ).toBe( true );
		} );

		it( 'does not mark an empty input as wrong', () => {
			expect( validatorFor( [ { title: [], qid: 'Q42' } ] )( '' ) ).toBe( true );
		} );

		it( 'refuses a title that cannot be a page', () => {
			expect( validatorFor( [ { title: [], qid: 'Q42' } ] )( 'Adams [writer]' ) ).toBe( false );
		} );

		it( 'refuses a page outside the main namespace', () => {
			expect( validatorFor( [ { title: [], qid: 'Q42' } ] )( 'Talk:Douglas Adams' ) ).toBe( false );
		} );

		it( 'refuses a title that a row already has, in any form', () => {
			const isValid = validatorFor( [
				{ title: [ 'Douglas Adams' ], qid: 'Q42' },
				{ title: [], qid: 'Q64' }
			], 1 );

			expect( isValid( 'douglas_Adams' ) ).toBe( false );
		} );

		describe( 'with no title', () => {
			const titlesStatus = ( wrapper ) => wrapper.findAllComponents( CdxField )
				.find( ( field ) => field.classes( 'ext-wikilambda-optedInArticles__titles' ) )
				.props( 'status' );

			it( 'is not wrong before the sysop has been to the field', () => {
				const { wrapper } = mountControl( { data: { OptedInArticles: [
					{ title: [], qid: 'Q42' }
				] } } );

				expect( titlesStatus( wrapper ) ).toBe( 'default' );
			} );

			it( 'is wrong once the sysop leaves the field', async () => {
				const { wrapper } = mountControl( { data: { OptedInArticles: [
					{ title: [], qid: 'Q42' }
				] } } );

				await wrapper.find( '.ext-wikilambda-optedInArticles__titles input' ).trigger( 'focusout' );

				expect( titlesStatus( wrapper ) ).toBe( 'error' );
			} );

			it( 'is wrong once the last title goes, and right again with a new one', async () => {
				const { wrapper } = mountControl( { data: { OptedInArticles: [
					{ title: [ 'A' ], qid: 'Q42' }
				] } } );
				const chipInput = wrapper.findComponent( CdxChipInput );

				chipInput.vm.$emit( 'update:input-chips', [] );
				await flushPromises();
				expect( titlesStatus( wrapper ) ).toBe( 'error' );

				chipInput.vm.$emit( 'update:input-chips', [ { value: 'B', label: 'B' } ] );
				await flushPromises();
				expect( titlesStatus( wrapper ) ).toBe( 'default' );
			} );
		} );

		it( 'writes each title in its normal form', async () => {
			const { wrapper, jsonform } = mountControl( { data: { OptedInArticles: [
				{ title: [], qid: 'Q42' }
			] } } );

			wrapper.findComponent( CdxChipInput ).vm.$emit( 'update:input-chips', [
				{ value: 'douglas_Adams', label: 'douglas_Adams' }
			] );
			await flushPromises();

			expect( jsonform.data.OptedInArticles ).toEqual( [
				{ title: [ 'Douglas Adams' ], qid: 'Q42' }
			] );
		} );
	} );

	describe( 'writing the value', () => {
		it( 'keeps the shape of the stored value', async () => {
			const { wrapper, jsonform } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: '' }
			] } } );
			await flushPromises();

			const lookup = wrapper.findComponent( CdxLookup );
			lookup.vm.$emit( 'update:input-value', 'doug' );
			await flushPromises();
			lookup.vm.$emit( 'update:selected', 'Q42' );
			await flushPromises();

			// Nothing that reads the configuration changes, so each entry has to stay a title
			// list and a QID, and nothing else.
			expect( jsonform.data.OptedInArticles ).toEqual( [
				{ title: [ 'A' ], qid: 'Q42' }
			] );
		} );

		it( 'shows the QID of a newly chosen item', async () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: '' }
			] } } );
			await flushPromises();

			const lookup = wrapper.findComponent( CdxLookup );
			lookup.vm.$emit( 'update:input-value', 'doug' );
			await flushPromises();
			lookup.vm.$emit( 'update:selected', 'Q42' );
			await flushPromises();

			expect( lookup.props( 'inputValue' ) ).toBe( 'Douglas Adams (Q42)' );
		} );

		it( 'writes the titles of the row that changed', async () => {
			const { wrapper, jsonform } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: 'Q42' },
				{ title: [ 'B' ], qid: 'Q64' }
			] } } );
			await flushPromises();

			wrapper.findAllComponents( CdxChipInput )[ 1 ].vm.$emit( 'update:input-chips', [
				{ value: 'Berlin', label: 'Berlin' },
				{ value: 'Berlin, Germany', label: 'Berlin, Germany' }
			] );
			await flushPromises();

			expect( jsonform.data.OptedInArticles ).toEqual( [
				{ title: [ 'A' ], qid: 'Q42' },
				{ title: [ 'Berlin', 'Berlin, Germany' ], qid: 'Q64' }
			] );
		} );

		it( 'does not empty a row when the lookup clears its selection', async () => {
			const { wrapper, jsonform } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: 'Q42' }
			] } } );
			await flushPromises();

			// CdxLookup clears the selection as soon as the text stops matching an item, which
			// happens on every keystroke. That must not throw away the QID already stored.
			wrapper.findComponent( CdxLookup ).vm.$emit( 'update:selected', null );
			await flushPromises();

			expect( jsonform.data.OptedInArticles ).toEqual( [
				{ title: [ 'A' ], qid: 'Q42' }
			] );
		} );

		it( 'adds a row without writing it, because it is not yet valid', async () => {
			const { wrapper, jsonform } = mountControl();

			await wrapper.findComponent( CdxButton ).trigger( 'click' );

			expect( rows( wrapper ) ).toHaveLength( 1 );
			// An entry with no item and no title would fail validation, and the sysop is still
			// filling it in.
			expect( jsonform.data.OptedInArticles ).toEqual( [] );
		} );

		it( 'writes the shorter list when a row goes', async () => {
			const { wrapper, jsonform } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: 'Q42' },
				{ title: [ 'B' ], qid: 'Q64' }
			] } } );
			await flushPromises();

			await wrapper.find( '.ext-wikilambda-optedInArticles__remove' ).trigger( 'click' );

			expect( rows( wrapper ) ).toHaveLength( 1 );
			expect( jsonform.data.OptedInArticles ).toEqual( [
				{ title: [ 'B' ], qid: 'Q64' }
			] );
		} );
	} );

	describe( 'offline client mode', () => {
		beforeEach( () => {
			mw.config.get = jest.fn( ( key ) => (
				key === 'wgWikiLambdaClientModeOffline' ? true : null
			) );
		} );

		it( 'shows the stored list but lets nobody change it', async () => {
			const { wrapper } = mountControl( { data: { OptedInArticles: [
				{ title: [ 'A' ], qid: 'Q42' }
			] } } );
			await flushPromises();

			expect( rows( wrapper ) ).toHaveLength( 1 );
			expect( wrapper.findComponent( CdxLookup ).props( 'disabled' ) ).toBe( true );
			expect( wrapper.findComponent( CdxChipInput ).props( 'disabled' ) ).toBe( true );
			// There is no connection to Wikidata, so there is nothing to look up.
			expect( itemLookupApi.fetchItemLabels ).not.toHaveBeenCalled();
		} );
	} );
} );
