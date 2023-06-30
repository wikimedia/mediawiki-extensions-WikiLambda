/*!
 * WikiLambda integration test for creating new tester.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

require( '@testing-library/jest-dom' );

const { fireEvent, render, waitFor } = require( '@testing-library/vue' ),
	{ within } = require( '@testing-library/dom' ),
	{ clickLookupResult } = require( './helpers/interactionHelpers.js' ),
	store = require( '../../../resources/ext.wikilambda.edit/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
	ApiMock = require( './helpers/apiMock.js' ),
	apiGetMock = require( './helpers/apiGetMock.js' ),
	existingFunctionFromApi = require( './objects/existingFunctionFromApi.js' ),
	expectedNewTesterPostedToApi = require( './objects/expectedNewTesterPostedToApi.js' );

const initializeRootZObject =
	new ApiMock( apiGetMock.loadZObjectsRequest, apiGetMock.loadZObjectsResponse, apiGetMock.loadZObjectsMatcher );
const lookupZObjectTypeLabels =
	new ApiMock( apiGetMock.functionLabelsRequest, apiGetMock.labelsResponse, apiGetMock.labelsMatcher );
const performTest =
	new ApiMock( apiGetMock.performTestRequest, apiGetMock.performTestResponse, apiGetMock.actionMatcher );
const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

describe( 'WikiLambda frontend, on zobject-editor view', () => {
	let apiPostWithEditTokenMock;
	beforeEach( () => {
		jest.useFakeTimers();

		Object.defineProperty( window, 'location', {
			value: {
				href: '/w/index.php?title=Special:CreateZObject&zid=Z20&Z20K1=' + functionZid
			}
		} );
		const queryParams = {
			title: Constants.PATHS.CREATE_Z_OBJECT_TITLE,
			zid: Constants.Z_TESTER,
			[ Constants.Z_TESTER_FUNCTION ]: functionZid
		};
		window.mw.Uri.mockImplementation( function () {
			return {
				query: queryParams,
				path: new window.mw.Title( Constants.PATHS.CREATE_Z_OBJECT_TITLE ).getUrl( queryParams )
			};
		} );
		global.mw.config.get = ( endpoint ) => {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
						createNewPage: true,
						zId: Constants.Z_TESTER
					};
				case 'wgExtensionAssetsPath':
					return '/w/extensions';
				default:
					return {};
			}
		};

		apiPostWithEditTokenMock = jest.fn( () => Promise.resolve( {
			wikilambda_edit: {
				page: 'newPage'
			}
		} ) );
		mw.Api = jest.fn( () => {
			return {
				postWithEditToken: apiPostWithEditTokenMock,
				get: apiGetMock.createMockApi( [
					initializeRootZObject,
					lookupZObjectTypeLabels,
					performTest
				] )
			};
		} );
	} );

	afterEach( () => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	} );

	it.only( 'allows creating a new tester', async () => {
		const {
			findByRole,
			findByTestId
		} = render( App, { global: { plugins: [ store ] } } );

		//* -- Function call section
		// ASSERT: The function specified in URL is pre-selected as the function under test.
		const testerFunctionSelectContainer = await findByTestId( 'z-test-function-select-container' );
		expect( within( testerFunctionSelectContainer ).getByRole( 'combobox' ) )
			.toHaveDisplayValue( 'function name, in Chinese' );

		//* -- Call section
		const testerCallContainer = await findByRole( 'ext-wikilambda-tester-call' );

		// ACT: Click the link to open the function call section.
		const selectCallFunctionLink = testerCallContainer.getElementsByTagName( 'a' )[ 0 ];
		await fireEvent.click( selectCallFunctionLink );

		// ACT: Select the function under test as the function to call
		const testerCallAccordionContainer = await within( testerCallContainer ).getByTestId( 'z-object-key-value-set' );
		const callFunctionAccordion = await within( testerCallAccordionContainer ).getAllByTestId( 'z-object-key-value' )[ 1 ];
		const callFunctionSelector = within( callFunctionAccordion ).getByRole( 'combobox' );

		const testerCallFunctionName = 'function name, in Chinese';

		await fireEvent.update( callFunctionSelector, testerCallFunctionName );
		await clickLookupResult( callFunctionAccordion, testerCallFunctionName );

		// ASSERT: The function under test is selected as the function to call.
		expect( callFunctionSelector.value ).toBe( testerCallFunctionName );

		const testerCallAccordionList = await within( testerCallAccordionContainer ).getAllByTestId( 'z-object-key-value' );

		// ACT: Enter value for first argument.
		const firstCallArgumentAccordion = testerCallAccordionList[ 2 ];
		const firstCallArgumentInput = within( firstCallArgumentAccordion ).getByTestId( 'text-input' );

		await fireEvent.update( firstCallArgumentInput, 'first argument value' );

		// ACT: Enter value for second argument.
		const secondCallArgumentAccordion = testerCallAccordionList[ 3 ];
		const secondCallArgumentInput = within( secondCallArgumentAccordion ).getByTestId( 'text-input' );
		await fireEvent.update( secondCallArgumentInput, 'second argument value' );

		//* -- Validation section
		const testerValidationContainer = await findByRole( 'ext-wikilambda-tester-validation' );

		// ACT: Click the link to open the function call section.
		const selectValidationFunctionLink = testerValidationContainer.getElementsByTagName( 'a' )[ 0 ];
		await fireEvent.click( selectValidationFunctionLink );

		// ACT: Select String Equality as the validation call function.
		const testerValidationAccordionContainer = await within( testerValidationContainer ).getByTestId( 'z-object-key-value-set' );
		const validationFunctionAccordion = await within( testerValidationAccordionContainer ).getAllByTestId( 'z-object-key-value' )[ 1 ];
		const validationFunctionSelector = within( validationFunctionAccordion ).getByRole( 'combobox' );

		const validationFunctionNameToSelect = 'String equality';

		await fireEvent.update( validationFunctionSelector, validationFunctionNameToSelect );
		await clickLookupResult( validationFunctionAccordion, validationFunctionNameToSelect );

		// ASSERT: The function under test is selected as the function to call.
		expect( validationFunctionSelector.value ).toBe( validationFunctionNameToSelect );

		const testerValidationAccordionList = await within( testerValidationContainer ).getAllByTestId( 'z-object-key-value' );

		// ACT: Enter expected value to which function call result should be compared.
		const validationArgumentAccordion = testerValidationAccordionList[ 3 ];
		const validationArgumentInput = await within( validationArgumentAccordion ).getByTestId( 'text-input' );
		await fireEvent.update( validationArgumentInput, 'expected value' );

		// ASSERT: The expected value is set.
		expect( validationArgumentInput.value ).toBe( 'expected value' );

		//* -- Label section
		// ACT: Set the label for the code implementation
		const openLanguageDialogButton = await findByTestId( 'open-language-dialog-button' );
		await fireEvent.click( openLanguageDialogButton );

		const languageDialog = await findByTestId( 'edit-label-dialog' );
		const languageDialogInputs = within( languageDialog ).getAllByTestId( 'text-input' );
		const languageDialogEditLabelInput = languageDialogInputs[ 0 ];

		fireEvent.update( languageDialogEditLabelInput, 'tester name' );

		// Since the button does not have a role and is built into the codex dialog component, we need to use getByText
		const confirmEditLabelButton = within( languageDialog ).getByText( 'Done' );
		fireEvent.click( confirmEditLabelButton );

		//* -- Publish section
		// ACT: Publish the implementation
		const publishButton = await findByTestId( 'publish-button' );
		await fireEvent.click( publishButton );

		// ACT: Confirm publish in publish dialog that opens
		const confirmPublishDialog = await findByTestId( 'confirm-publish-dialog' );
		const confirmPublishButton = await within( confirmPublishDialog ).getByTestId( 'confirm-publish-button' );

		await fireEvent.click( confirmPublishButton );

		// ASSERT: Location is changed to page returned by API.
		await waitFor( () => expect( window.location.href ).toEqual( '/wiki/newPage?success=true' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			summary: '',
			zid: undefined,
			zobject: JSON.stringify( expectedNewTesterPostedToApi )
		} );
	} );
} );
