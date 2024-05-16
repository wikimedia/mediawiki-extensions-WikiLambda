/*!
 * WikiLambda unit test suite for About Metadata Dialog
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { config, mount } = require( '@vue/test-utils' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	AboutEditMetadataDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/AboutEditMetadataDialog.vue' );

// Ignore all "teleport" behavior for the purpose of testing Dialog;
// see https://test-utils.vuejs.org/guide/advanced/teleport.html
config.global.stubs = {
	teleport: true
};

describe( 'AboutEditMetadataDialog', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getRowByKeyPath: createGettersWithFunctionsMock( { id: 1 } ),
			getZMonolingualTextValue: createGettersWithFunctionsMock( '' ),
			getZMonolingualStringsetValues: createGettersWithFunctionsMock( [] ),
			getZPersistentAlias: createGettersWithFunctionsMock( undefined ),
			getZPersistentDescription: createGettersWithFunctionsMock( undefined ),
			getZPersistentName: createGettersWithFunctionsMock( undefined ),
			getErrors: createGettersWithFunctionsMock( {} ),
			getZArgumentLabelForLanguage: createGettersWithFunctionsMock( undefined ),
			getZFunctionInputs: createGettersWithFunctionsMock( [] ),
			getLabelData: createLabelDataMock( {
				Z2K3: 'name',
				Z2K4: 'also known as',
				Z2K5: 'description',
				Z1002: 'English',
				Z11K1: 'language'
			} )
		};

		actions = {
			fetchZids: jest.fn(),
			changeType: jest.fn(),
			setDirty: jest.fn()
		};
		global.store.hotUpdate( { getters: getters, actions: actions } );
	} );

	describe( 'No metadata', () => {
		it( 'renders without errors', () => {
			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: true,
				canEdit: true,
				open: true,
				isFunction: false,
				forLanguage: 'Z1002'
			} } );

			expect( wrapper.find( '.ext-wikilambda-about-edit-metadata' ).exists() ).toBe( true );
		} );

		it( 'renders done button when in edit mode', async () => {
			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: true,
				canEdit: true,
				open: true,
				isFunction: false,
				forLanguage: 'Z1002'
			} } );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ASSERT: Primary action is "Done"
			expect( wrapper.find( '.cdx-dialog__footer__primary-action' ).exists() ).toBeTruthy();
			expect( wrapper.find( '.cdx-dialog__footer__primary-action' ).text() ).toBe( 'Done' );

			// ACT: Update name
			wrapper.vm.name = 'new name';
			await wrapper.vm.$nextTick();

			// ACT: Click "Done"
			await wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Events changeSelectedLanguage and close are emitted
			expect( wrapper.emitted( 'change-selected-language' ) ).toBeTruthy();
			expect( wrapper.emitted( 'close' ) ).toBeTruthy();

			// ASSERT: Event publish is not emitted
			expect( wrapper.emitted( 'publish' ) ).toBeFalsy();

			// ASSERT: isDirty called with true
			expect( actions.setDirty ).toHaveBeenCalledWith( expect.anything(), true );
		} );

		it( 'renders publish button when in view mode', async () => {
			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: false,
				canEdit: true,
				open: true,
				isFunction: false,
				forLanguage: 'Z1002'
			} } );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ASSERT: Primary action is "Done"
			expect( wrapper.find( '.cdx-dialog__footer__primary-action' ).exists() ).toBeTruthy();
			expect( wrapper.find( '.cdx-dialog__footer__primary-action' ).text() ).toBe( 'Continue to publish' );

			// ACT: Update name
			wrapper.vm.name = 'new name';
			await wrapper.vm.$nextTick();

			// ACT: Click "Done"
			await wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Events publish, changeSelectedLanguage and close are emitted
			expect( wrapper.emitted( 'publish' ) ).toBeTruthy();
			expect( wrapper.emitted( 'change-selected-language' ) ).toBeTruthy();
			expect( wrapper.emitted( 'close' ) ).toBeTruthy();
		} );

		it( 'renders empty metadata fields', async () => {
			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: true,
				canEdit: true,
				open: true,
				isFunction: false,
				forLanguage: 'Z1002'
			} } );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ASSERT: Language is intiialized
			const languageBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-language' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.selected ).toBe( 'Z1002' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.initialInputValue ).toBe( 'English' );

			// ASSERT: Values are initialized to empty
			expect( wrapper.vm.name ).toEqual( '' );
			expect( wrapper.vm.description ).toEqual( '' );
			expect( wrapper.vm.aliases ).toStrictEqual( [] );

			// ASSERT: Name block renders text input component
			const nameBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-name' );
			expect( nameBlock.findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( nameBlock.find( '.cdx-field__help-text' ).text() ).toBe( '100' );

			// ASSERT: Description block renders text input component
			const descriptionBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-description' );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).exists() ).toBe( true );
			expect( descriptionBlock.find( '.cdx-field__help-text' ).text() ).toBe( '100' );

			// ASSERT: Aliases are empty
			const aliasBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-alias' );
			expect( aliasBlock.findComponent( { name: 'wl-chip-container' } ).vm.chips ).toStrictEqual( [] );

			// ASSERT: Primary action is disabled
			const publishButton = wrapper.find( '.cdx-dialog__footer__primary-action' );
			expect( publishButton.attributes( 'disabled' ) ).toBeDefined();
		} );
	} );

	describe( 'There is metadata', () => {
		beforeEach( () => {
			const name = { langIsoCode: 'en', langZid: 'Z1002', rowId: 1 };
			const description = { langIsoCode: 'en', langZid: 'Z1002', rowId: 2 };
			const alias = { langIsoCode: 'en', langZid: 'Z1002', rowId: 3 };
			const aliasValues = [ { rowId: 4, value: 'one' }, { rowId: 5, value: 'two' } ];

			getters = Object.assign( getters, {
				getZPersistentAlias: createGettersWithFunctionsMock( alias ),
				getZPersistentDescription: createGettersWithFunctionsMock( description ),
				getZPersistentName: createGettersWithFunctionsMock( name ),
				getZMonolingualStringsetValues: createGettersWithFunctionsMock( aliasValues ),
				getZMonolingualTextValue: () => ( rowId ) => {
					return rowId === 1 ? 'name' : 'some description';
				}
			} );

			global.store.hotUpdate( { getters: getters, actions: actions } );
		} );

		it( 'renders metadata fields and values', async () => {
			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: true,
				canEdit: true,
				open: true,
				isFunction: false,
				forLanguage: 'Z1002'
			} } );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ASSERT: Language is intiialized to user language
			const languageBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-language' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.selected ).toBe( 'Z1002' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.initialInputValue ).toBe( 'English' );

			// ASSERT: Values are initialized
			expect( wrapper.vm.name ).toEqual( 'name' );
			expect( wrapper.vm.description ).toEqual( 'some description' );
			expect( wrapper.vm.aliases ).toEqual( [ { id: 4, value: 'one' }, { id: 5, value: 'two' } ] );

			// ASSERT: Name block renders text input component
			const nameBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-name' );
			expect( nameBlock.findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( nameBlock.find( 'input' ).attributes( 'disabled' ) ).not.toBeDefined();
			expect( nameBlock.find( '.cdx-field__help-text' ).text() ).toBe( '96' );

			// ASSERT: Description block renders text area component
			const descriptionBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-description' );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).exists() ).toBe( true );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).props( 'disabled' ) ).toBe( false );
			expect( descriptionBlock.find( '.cdx-field__help-text' ).text() ).toBe( '84' );

			// ASSERT: After initialization, aliases have value
			const aliasBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-alias' );
			expect( aliasBlock.findComponent( { name: 'wl-chip-container' } ).vm.chips ).toHaveLength( 2 );
			expect( aliasBlock.findComponent( { name: 'wl-chip-container' } ).props( 'disabled' ) ).toBe( false );

			// ASSERT: Primary action is disabled
			const publishButton = wrapper.find( '.cdx-dialog__footer__primary-action' );
			expect( publishButton.attributes( 'disabled' ) ).toBeDefined();
		} );

		it( 'enables publish button when making changes', async () => {
			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: true,
				canEdit: true,
				open: true,
				isFunction: false,
				forLanguage: 'Z1002'
			} } );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ASSERT: Primary action is disabled
			expect(
				wrapper.find( '.cdx-dialog__footer__primary-action' ).attributes( 'disabled' )
			).toBeDefined();

			// ACT: Update name
			wrapper.vm.name = 'new name';
			await wrapper.vm.$nextTick();

			// ASSERT: Primary action is enabled
			expect(
				wrapper.find( '.cdx-dialog__footer__primary-action' ).attributes( 'disabled' )
			).toBeUndefined();

			// ACT: Reset
			wrapper.vm.name = 'name';
			await wrapper.vm.$nextTick();
			expect(
				wrapper.find( '.cdx-dialog__footer__primary-action' ).attributes( 'disabled' )
			).toBeDefined();

			// ACT: Update description
			wrapper.vm.description = 'more text';
			await wrapper.vm.$nextTick();

			// ASSERT: Primary action is enabled
			expect(
				wrapper.find( '.cdx-dialog__footer__primary-action' ).attributes( 'disabled' )
			).toBeUndefined();

			// ACT: Reset
			wrapper.vm.description = 'some description';
			await wrapper.vm.$nextTick();
			expect(
				wrapper.find( '.cdx-dialog__footer__primary-action' ).attributes( 'disabled' )
			).toBeDefined();

			// ACT: Update aliases
			wrapper.vm.aliases.push( { id: 1000, value: 'new' } );
			await wrapper.vm.$nextTick();

			// ASSERT: Primary action is enabled
			expect(
				wrapper.find( '.cdx-dialog__footer__primary-action' ).attributes( 'disabled' )
			).toBeUndefined();
		} );
	} );

	describe( 'No edit rights', () => {

		beforeEach( () => {
			const name = { langIsoCode: 'en', langZid: 'Z1002', rowId: 1 };
			const description = { langIsoCode: 'en', langZid: 'Z1002', rowId: 2 };
			const alias = { langIsoCode: 'en', langZid: 'Z1002', rowId: 3 };
			const aliasValues = [ { rowId: 4, value: 'one' }, { rowId: 5, value: 'two' } ];

			getters = Object.assign( getters, {
				getZPersistentAlias: createGettersWithFunctionsMock( alias ),
				getZPersistentDescription: createGettersWithFunctionsMock( description ),
				getZPersistentName: createGettersWithFunctionsMock( name ),
				getZMonolingualStringsetValues: createGettersWithFunctionsMock( aliasValues ),
				getZMonolingualTextValue: () => ( rowId ) => {
					return rowId === 1 ? 'name' : 'some description';
				}
			} );

			global.store.hotUpdate( { getters: getters, actions: actions } );
		} );

		it( 'renders without errors', () => {
			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: true,
				canEdit: false,
				open: true,
				isFunction: false,
				forLanguage: 'Z1002'
			} } );

			expect( wrapper.find( '.ext-wikilambda-about-edit-metadata' ).exists() ).toBe( true );
		} );

		it( 'renders disabled metadata fields and values', async () => {
			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: true,
				canEdit: false,
				open: true,
				isFunction: false,
				forLanguage: 'Z1002'
			} } );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ASSERT: Language is intiialized to user language
			const languageBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-language' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.selected ).toBe( 'Z1002' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.initialInputValue ).toBe( 'English' );

			// ASSERT: Values are initialized
			expect( wrapper.vm.name ).toEqual( 'name' );
			expect( wrapper.vm.description ).toEqual( 'some description' );
			expect( wrapper.vm.aliases ).toEqual( [ { id: 4, value: 'one' }, { id: 5, value: 'two' } ] );

			// ASSERT: Name block renders text input component
			const nameBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-name' );
			expect( nameBlock.findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( nameBlock.find( 'input' ).attributes( 'disabled' ) ).toBeDefined();
			expect( nameBlock.find( '.cdx-field__help-text' ).text() ).toBe( '96' );

			// ASSERT: Description block renders text area component
			const descriptionBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-description' );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).exists() ).toBe( true );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).props( 'disabled' ) ).toBe( true );
			expect( descriptionBlock.find( '.cdx-field__help-text' ).text() ).toBe( '84' );

			// ASSERT: After initialization, aliases have value
			const aliasBlock = wrapper.find( '.ext-wikilambda-about-edit-metadata-alias' );
			expect( aliasBlock.findComponent( { name: 'wl-chip-container' } ).vm.chips ).toHaveLength( 2 );
			expect( aliasBlock.findComponent( { name: 'wl-chip-container' } ).props( 'disabled' ) ).toBe( true );

			// ASSERT: Primary action is disabled
			const publishButton = wrapper.find( '.cdx-dialog__footer__primary-action' );
			expect( publishButton.attributes( 'disabled' ) ).toBeDefined();
		} );
	} );

	describe( 'About widget for Function View page', () => {

		it( 'renders input fields with no labels', async () => {
			const inputs = [ { id: 20 }, { id: 30 } ];
			getters.getZFunctionInputs = createGettersWithFunctionsMock( inputs );
			getters.getZArgumentLabelForLanguage = createGettersWithFunctionsMock( undefined );
			global.store.hotUpdate( { getters: getters } );

			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: true,
				canEdit: false,
				open: true,
				isFunction: true,
				forLanguage: 'Z1002'
			} } );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ASSERT: inputs and initial value are being initialized properly
			expect( wrapper.vm.inputs ).toEqual( [ '', '' ] );
			expect( wrapper.vm.initialInputs ).toEqual( '["",""]' );

			// ASSERT: two fields exist in the form
			const inputFields = wrapper.findAll( '.ext-wikilambda-about-edit-metadata-input' );
			expect( inputFields.length ).toBe( 2 );

			// ASSERT: input fields have right value
			expect( inputFields[ 0 ].findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( inputFields[ 0 ].findComponent( { name: 'cdx-text-input' } ).vm.modelValue ).toBe( '' );
			expect( inputFields[ 1 ].findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( inputFields[ 1 ].findComponent( { name: 'cdx-text-input' } ).vm.modelValue ).toBe( '' );
		} );

		it( 'renders input fields with existing labels', async () => {
			const inputs = [ { id: 20 }, { id: 30 } ];
			const inputLabelObjects = {
				20: { id: 22, parent: 21 },
				30: { id: 32, parent: 31 }
			};
			const inputLabels = {
				22: 'first',
				32: 'second'
			};
			getters.getZFunctionInputs = createGettersWithFunctionsMock( inputs );
			getters.getZArgumentLabelForLanguage = () => ( id ) => inputLabelObjects[ id ];
			getters.getZMonolingualTextValue = () => ( id ) => inputLabels[ id ];
			global.store.hotUpdate( { getters: getters } );

			const wrapper = mount( AboutEditMetadataDialog, { props: {
				edit: true,
				canEdit: false,
				open: true,
				isFunction: true,
				forLanguage: 'Z1002'
			} } );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ASSERT: inputs and initial value are being initialized properly
			expect( wrapper.vm.inputs ).toEqual( [ 'first', 'second' ] );
			expect( wrapper.vm.initialInputs ).toEqual( '["first","second"]' );

			// ASSERT: two fields exist in the form
			const inputFields = wrapper.findAll( '.ext-wikilambda-about-edit-metadata-input' );
			expect( inputFields.length ).toBe( 2 );

			// ASSERT: input fields have right value
			expect( inputFields[ 0 ].findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( inputFields[ 0 ].findComponent( { name: 'cdx-text-input' } ).vm.modelValue ).toBe( 'first' );
			expect( inputFields[ 1 ].findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( inputFields[ 1 ].findComponent( { name: 'cdx-text-input' } ).vm.modelValue ).toBe( 'second' );
		} );
	} );
} );
