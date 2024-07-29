/*!
 * WikiLambda unit test suite for About Metadata Dialog
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { config, mount } = require( '@vue/test-utils' ),
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock,
	AboutEditMetadataDialog = require( '../../../../../resources/ext.wikilambda.app/components/widgets/about/AboutEditMetadataDialog.vue' );

// Ignore all "teleport" behavior for the purpose of testing Dialog;
// see https://test-utils.vuejs.org/guide/advanced/teleport.html
config.global.stubs = {
	teleport: true
};

// Helper function to setup jQuery mocks
function setupJQueryPageTitleMocks() {
	global.$ = jest.fn();

	const $pageTitle = {
		text: jest.fn().mockReturnThis(),
		toggleClass: jest.fn().mockReturnThis()
	};

	const $langChip = {
		text: jest.fn().mockReturnThis(),
		toggleClass: jest.fn().mockReturnThis(),
		attr: jest.fn().mockReturnThis()
	};

	const $firstHeading = {
		find: jest.fn().mockImplementation( ( selector ) => {
			if ( selector === '.ext-wikilambda-editpage-header__title--function-name' ) {
				return {
					first: jest.fn().mockReturnValue( $pageTitle )
				};
			} else if ( selector === '.ext-wikilambda-editpage-header__bcp47-code-name' ) {
				return $langChip;
			}
		} )
	};

	$.mockImplementation( ( selector ) => {
		if ( selector === '#firstHeading' ) {
			return $firstHeading;
		}
	} );

	return { $pageTitle, $langChip };
}

describe( 'AboutEditMetadataDialog', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getFallbackLanguageZids: createGetterMock( [ 'Z1002', 'Z1003' ] ),
			getRowByKeyPath: createGettersWithFunctionsMock( { id: 1 } ),
			getUserLangZid: createGetterMock( 'Z1002' ),
			getZMonolingualTextValue: createGettersWithFunctionsMock( '' ),
			getZMonolingualStringsetValues: createGettersWithFunctionsMock( [] ),
			getZPersistentAlias: createGettersWithFunctionsMock( undefined ),
			getZPersistentDescription: createGettersWithFunctionsMock( undefined ),
			getZPersistentName: createGettersWithFunctionsMock( undefined ),
			getErrors: createGettersWithFunctionsMock( {} ),
			getZArgumentLabelForLanguage: createGettersWithFunctionsMock( undefined ),
			getZFunctionInputs: createGettersWithFunctionsMock( [] ),
			isEnumType: createGettersWithFunctionsMock( false ),
			getLabelData: createLabelDataMock( {
				Z2K3: 'name',
				Z2K4: 'also known as',
				Z2K5: 'description',
				Z1002: 'English',
				Z1003: 'Spanish',
				Z11K1: 'language'
			} )
		};

		actions = {
			fetchZids: jest.fn(),
			changeType: jest.fn(),
			setDirty: jest.fn(),
			removeItemFromTypedList: jest.fn(),
			setValueByRowIdAndPath: jest.fn()
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

			expect( wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog' ).exists() ).toBe( true );
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

		it( 'updates page title when name is provided', async () => {
			const { $pageTitle, $langChip } = setupJQueryPageTitleMocks();

			const wrapper = mount( AboutEditMetadataDialog, {
				props: {
					edit: true,
					canEdit: true,
					open: true,
					isFunction: false,
					forLanguage: 'Z1002'
				}
			} );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ACT: Update name
			wrapper.vm.name = 'new name';
			await wrapper.vm.$nextTick();

			// Update the store with the new persistent name
			getters.getZPersistentName = createGettersWithFunctionsMock( { langZid: 'Z1002', langIsoCode: 'en', rowId: 1 } );
			// Update the store with the new name
			getters.getZMonolingualTextValue = createGettersWithFunctionsMock( 'new name' );
			global.store.hotUpdate( { getters } );

			// ACT: Click "Done"
			await wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Check if DOM manipulations were called with the correct arguments
			expect( wrapper.vm.pageTitleObject ).toEqual( { title: 'new name', hasChip: false, chip: 'en', chipName: 'English' } );
			expect( $pageTitle.text ).toHaveBeenCalledWith( 'new name' );
			expect( $langChip.text ).toHaveBeenCalledWith( 'en' );
			expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', true );
			expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', false );
		} );

		it( 'updates page title when fallback language has a new name and current name is not set', async () => {
			// Set the fallback language to be defined
			getters.getZPersistentName = () => ( langZid ) => langZid === 'Z1003' ?
				{ langZid: 'Z1003', langIsoCode: 'es', rowId: 11 } :
				undefined;
			global.store.hotUpdate( { getters } );

			const { $pageTitle, $langChip } = setupJQueryPageTitleMocks();

			const wrapper = mount( AboutEditMetadataDialog, {
				props: {
					edit: true,
					canEdit: true,
					open: true,
					isFunction: false,
					forLanguage: 'Z1003'
				}
			} );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ACT: Empty the name
			wrapper.vm.name = 'new fallback name';
			await wrapper.vm.$nextTick();

			// Update the store with the new fallback name
			getters.getZMonolingualTextValue = createGettersWithFunctionsMock( 'new fallback name' );
			global.store.hotUpdate( { getters } );

			// ACT: Click "Done"
			await wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Check if DOM manipulations were called with the correct arguments
			expect( wrapper.vm.pageTitleObject ).toEqual( { title: 'new fallback name', hasChip: true, chip: 'es', chipName: 'Spanish' } );
			expect( $pageTitle.text ).toHaveBeenCalledWith( 'new fallback name' );
			expect( $langChip.text ).toHaveBeenCalledWith( 'es' );
			expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', false );
			expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', false );
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
			const languageBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__language' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.selected ).toBe( 'Z1002' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.initialInputValue ).toBe( 'English' );

			// ASSERT: Values are initialized to empty
			expect( wrapper.vm.name ).toEqual( '' );
			expect( wrapper.vm.description ).toEqual( '' );
			expect( wrapper.vm.aliases ).toStrictEqual( [] );

			// ASSERT: Name block renders text input component
			const nameBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__field-name' );
			expect( nameBlock.findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( nameBlock.find( '.cdx-field__help-text' ).text() ).toBe( '100' );

			// ASSERT: Description block renders text input component
			const descriptionBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__field-description' );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).exists() ).toBe( true );
			expect( descriptionBlock.find( '.cdx-field__help-text' ).text() ).toBe( '100' );

			// ASSERT: Aliases are empty
			const aliasBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__alias' );
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
				getZMonolingualTextValue: () => ( rowId ) => rowId === 1 ? 'name' : 'some description'
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
			const languageBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__language' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.selected ).toBe( 'Z1002' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.initialInputValue ).toBe( 'English' );

			// ASSERT: Values are initialized
			expect( wrapper.vm.name ).toEqual( 'name' );
			expect( wrapper.vm.description ).toEqual( 'some description' );
			expect( wrapper.vm.aliases ).toEqual( [ { id: 4, value: 'one' }, { id: 5, value: 'two' } ] );

			// ASSERT: Name block renders text input component
			const nameBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__field-name' );
			expect( nameBlock.findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( nameBlock.find( 'input' ).attributes( 'disabled' ) ).not.toBeDefined();
			expect( nameBlock.find( '.cdx-field__help-text' ).text() ).toBe( '96' );

			// ASSERT: Description block renders text area component
			const descriptionBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__field-description' );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).exists() ).toBe( true );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).props( 'disabled' ) ).toBe( false );
			expect( descriptionBlock.find( '.cdx-field__help-text' ).text() ).toBe( '84' );

			// ASSERT: After initialization, aliases have value
			const aliasBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__alias' );
			expect( aliasBlock.findComponent( { name: 'wl-chip-container' } ).vm.chips ).toHaveLength( 2 );
			expect( aliasBlock.findComponent( { name: 'wl-chip-container' } ).props( 'disabled' ) ).toBe( false );

			// ASSERT: Primary action is disabled
			const publishButton = wrapper.find( '.cdx-dialog__footer__primary-action' );
			expect( publishButton.attributes( 'disabled' ) ).toBeDefined();
		} );

		it( 'updates page title when current name is changed', async () => {
			const { $pageTitle, $langChip } = setupJQueryPageTitleMocks();

			const wrapper = mount( AboutEditMetadataDialog, {
				props: {
					edit: true,
					canEdit: true,
					open: true,
					isFunction: false,
					forLanguage: 'Z1002'
				}
			} );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ACT: Update name
			wrapper.vm.name = 'new name';
			await wrapper.vm.$nextTick();

			// ASSERT: Primary action is enabled
			expect(
				wrapper.find( '.cdx-dialog__footer__primary-action' ).attributes( 'disabled' )
			).toBeUndefined();

			// Update the store with the new name
			getters.getZMonolingualTextValue = createGettersWithFunctionsMock( 'new name' );
			global.store.hotUpdate( { getters } );

			// ACT: Click "Done"
			await wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Check if DOM manipulations were called with the correct arguments
			expect( wrapper.vm.pageTitleObject ).toEqual( { title: 'new name', hasChip: false, chip: 'en', chipName: 'English' } );
			expect( $pageTitle.text ).toHaveBeenCalledWith( 'new name' );
			expect( $langChip.text ).toHaveBeenCalledWith( 'en' );
			expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', true );
			expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', false );
		} );

		it( 'updates page title when name is removed and there is a fallback', async () => {
			const { $pageTitle, $langChip } = setupJQueryPageTitleMocks();

			const wrapper = mount( AboutEditMetadataDialog, {
				props: {
					edit: true,
					canEdit: true,
					open: true,
					isFunction: false,
					forLanguage: 'Z1002'
				}
			} );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ACT: Empty the name
			wrapper.vm.name = '';
			await wrapper.vm.$nextTick();

			// Update the store with the new persistent name: empty name and set fallback language
			getters.getZPersistentName = () => ( langZid ) => langZid === 'Z1003' ?
				{ langZid: 'Z1003', langIsoCode: 'es', rowId: 11 } :
				undefined;
			// Update the store with the fallback name
			getters.getZMonolingualTextValue = () => ( rowId ) => rowId === 11 ? 'Fallback Page Title in Spanish' : '';
			global.store.hotUpdate( { getters } );

			// ACT: Click "Done"
			await wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Check if DOM manipulations were called with the correct arguments
			expect( wrapper.vm.pageTitleObject ).toEqual( { title: 'Fallback Page Title in Spanish', hasChip: true, chip: 'es', chipName: 'Spanish' } );
			expect( $pageTitle.text ).toHaveBeenCalledWith( 'Fallback Page Title in Spanish' );
			expect( $langChip.text ).toHaveBeenCalledWith( 'es' );
			expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', false );
			expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', false );
		} );

		it( 'updates page title to undefined when name is removed and there is no fallback', async () => {
			const { $pageTitle, $langChip } = setupJQueryPageTitleMocks();

			const wrapper = mount( AboutEditMetadataDialog, {
				props: {
					edit: true,
					canEdit: true,
					open: true,
					isFunction: false,
					forLanguage: 'Z1002'
				}
			} );

			// ACT: initialize and wait
			wrapper.vm.initialize();
			await wrapper.vm.$nextTick();

			// ACT: Empty the name
			wrapper.vm.name = '';
			await wrapper.vm.$nextTick();

			// Update the store with the empty name and fallback language data
			getters.getZPersistentName = createGettersWithFunctionsMock( undefined );
			getters.getZMonolingualTextValue = createGettersWithFunctionsMock( '' );
			global.store.hotUpdate( { getters } );

			// ACT: Click "Done"
			await wrapper.find( '.cdx-dialog__footer__primary-action' ).trigger( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: Check if DOM manipulations were called with the correct arguments
			expect( wrapper.vm.pageTitleObject ).toEqual( { title: null, hasChip: false, chip: null, chipName: null } );
			expect( $pageTitle.text ).toHaveBeenCalledWith( 'Untitled' );
			expect( $langChip.text ).toHaveBeenCalledWith( null );
			expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', true );
			expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', true );
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
				getZMonolingualTextValue: () => ( rowId ) => rowId === 1 ? 'name' : 'some description'
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

			expect( wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog' ).exists() ).toBe( true );
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
			const languageBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__language' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.selected ).toBe( 'Z1002' );
			expect( languageBlock.findComponent( { name: 'cdx-lookup' } ).vm.initialInputValue ).toBe( 'English' );

			// ASSERT: Values are initialized
			expect( wrapper.vm.name ).toEqual( 'name' );
			expect( wrapper.vm.description ).toEqual( 'some description' );
			expect( wrapper.vm.aliases ).toEqual( [ { id: 4, value: 'one' }, { id: 5, value: 'two' } ] );

			// ASSERT: Name block renders text input component
			const nameBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__field-name' );
			expect( nameBlock.findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( nameBlock.find( 'input' ).attributes( 'disabled' ) ).toBeDefined();
			expect( nameBlock.find( '.cdx-field__help-text' ).text() ).toBe( '96' );

			// ASSERT: Description block renders text area component
			const descriptionBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__field-description' );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).exists() ).toBe( true );
			expect( descriptionBlock.findComponent( { name: 'cdx-text-area' } ).props( 'disabled' ) ).toBe( true );
			expect( descriptionBlock.find( '.cdx-field__help-text' ).text() ).toBe( '84' );

			// ASSERT: After initialization, aliases have value
			const aliasBlock = wrapper.find( '.ext-wikilambda-app-about-edit-metadata-dialog__alias' );
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
			const inputFields = wrapper.findAll( '.ext-wikilambda-app-about-edit-metadata-dialog__field-input' );
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
			const inputFields = wrapper.findAll( '.ext-wikilambda-app-about-edit-metadata-dialog__field-input' );
			expect( inputFields.length ).toBe( 2 );

			// ASSERT: input fields have right value
			expect( inputFields[ 0 ].findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( inputFields[ 0 ].findComponent( { name: 'cdx-text-input' } ).vm.modelValue ).toBe( 'first' );
			expect( inputFields[ 1 ].findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
			expect( inputFields[ 1 ].findComponent( { name: 'cdx-text-input' } ).vm.modelValue ).toBe( 'second' );
		} );
	} );
} );
