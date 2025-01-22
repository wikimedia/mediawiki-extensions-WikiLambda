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
	{ clickMenuOption } = require( './helpers/interactionHelpers.js' ),
	store = require( '../../../resources/ext.wikilambda.app/store/index.js' ),
	App = require( '../../../resources/ext.wikilambda.app/components/App.vue' ),
	Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' ),
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
				href: '/w/index.php?title=Special:CreateObject&zid=Z20&Z20K1=' + functionZid
			}
		} );

		const queryParams = {
			title: Constants.PATHS.CREATE_OBJECT_TITLE,
			zid: Constants.Z_TESTER,
			[ Constants.Z_TESTER_FUNCTION ]: functionZid
		};
		window.mw.Uri = jest.fn( () => ( {
			query: queryParams,
			path: new window.mw.Title( Constants.PATHS.CREATE_OBJECT_TITLE ).getUrl( queryParams )
		} ) );

		global.mw.config.get = ( endpoint ) => {
			switch ( endpoint ) {
				case 'wgWikiLambda':
					return {
						vieMode: false,
						createNewPage: true,
						zlangZid: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
						zlang: 'en'
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

		mw.Api = jest.fn( () => ( {
			postWithEditToken: apiPostWithEditTokenMock,
			get: apiGetMock.createMockApi( [
				initializeRootZObject,
				lookupZObjectTypeLabels,
				performTest
			] )
		} ) );
	} );

	afterEach( () => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	} );

	it( 'allows creating a new tester', async () => {
		const { findByTestId } = render( App, {
			global: { plugins: [ store ], stubs: {
				teleport: true,
				WlFunctionEvaluatorWidget: true
			} }
		} );

		//* -- Function call section
		// ASSERT: The function specified in URL is pre-selected as the function under test.
		const testerFunctionSelectContainer = await findByTestId( 'tester-function-select' );
		expect( within( testerFunctionSelectContainer ).getByRole( 'combobox' ) )
			.toHaveDisplayValue( 'function name, in Chinese' );

		//* -- Call section
		const testerCallContainer = await findByTestId( 'tester-call' );

		// ACT: Expand toggle
		const expandTesterCall = within( testerCallContainer ).getByTestId( 'expanded-toggle' );
		await fireEvent.click( expandTesterCall );

		// ACT: Select the function under test as the function to call
		const testerCallAccordionContainer = await within( testerCallContainer ).getByTestId( 'z-object-key-value-set' );
		const callFunctionReference = await within( testerCallAccordionContainer ).getAllByTestId( 'z-reference-selector' )[ 1 ];
		const callFunctionSelector = within( callFunctionReference ).getByRole( 'combobox' );

		const testerCallFunctionName = 'function name, in Chinese';

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
		const testerValidationContainer = await findByTestId( 'tester-validation' );

		// ACT: Expand toggle
		const expandValidationCall = within( testerValidationContainer ).getByTestId( 'expanded-toggle' );
		await fireEvent.click( expandValidationCall );

		// ACT: Select String Equality as the validation call function.
		const testerValidationAccordionContainer = await within( testerValidationContainer ).getByTestId( 'z-object-key-value-set' );
		const validationFunctionReference = await within( testerValidationAccordionContainer ).getAllByTestId( 'z-reference-selector' )[ 1 ];
		const validationFunctionSelector = within( validationFunctionReference ).getByRole( 'combobox' );

		const validationFunctionNameToSelect = 'String equality';

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
		// ACT: Set the label for the tester
		const nameField = await findByTestId( 'about-name-field' );
		const nameInput = within( nameField ).getByTestId( 'text-input' );
		fireEvent.update( nameInput, 'tester name' );
		fireEvent.change( nameInput );

		//* -- Publish section
		// ACT: Publish the implementation
		const publishButton = await findByTestId( 'publish-button' );
		await fireEvent.click( publishButton );

		// ACT: Confirm publish in publish dialog that opens
		const confirmPublishDialog = await findByTestId( 'confirm-publish-dialog' );
		const confirmPublishButton = await within( confirmPublishDialog ).findByText( 'Publish' );

		await fireEvent.click( confirmPublishButton );

		// ASSERT: Location is changed to page returned by API.
		await waitFor( () => expect( window.location.href ).toEqual( '/view/en/newPage?success=true' ) );

		// ASSERT: Correct ZObject was posted to the API.
		expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith( {
			action: 'wikilambda_edit',
			uselang: 'en',
			summary: '',
			zid: undefined,
			zobject: JSON.stringify( expectedNewTesterPostedToApi )
		} );

	} );

	it( 'allows changing the selected function call and ensures the function report testers are updated, but not executed', async () => {
		const { findByTestId } = render( App, {
			global: { plugins: [ store ], stubs: {
				teleport: true,
				WlFunctionEvaluatorWidget: true
			} }
		} );

		//* -- Function report widget
		const functionReportWidget = await findByTestId( 'function-report-widget' );
		// ASSERT: The implementation is shown in the function report widget.
		expect( functionReportWidget ).toHaveTextContent( 'Implementation by composition, in English' );
		expect( functionReportWidget ).not.toHaveTextContent( 'Untitled' );

		//* -- Function call section
		const testerFunctionSelectContainer = await findByTestId( 'tester-function-select' );
		// ASSERT: The function specified in URL is pre-selected as the function under test.
		expect( within( testerFunctionSelectContainer ).getByRole( 'combobox' ) )
			.toHaveDisplayValue( 'function name, in Chinese' );

		// ACT: Select a different function to use for the new tester
		const testerFunctionSelector = within( testerFunctionSelectContainer ).getByRole( 'combobox' );
		const functionNameToSelect = 'another function name, in Chinese';
		await fireEvent.update( testerFunctionSelector, 'function' );
		await fireEvent.click( testerFunctionSelector );

		// ASSERT: The results from the API are loaded in the dropdown
		await waitFor( () => expect( testerFunctionSelectContainer ).toHaveTextContent( functionNameToSelect ) );

		await clickMenuOption( testerFunctionSelectContainer, functionNameToSelect );

		//* -- Function report widget
		// ASSERT: The new implementation is shown in the function report widget and the old one is not.
		expect( functionReportWidget ).not.toHaveTextContent( 'Implementation by composition, in English' );
		expect( functionReportWidget ).toHaveTextContent( 'Untitled' );

		// ASSERT: wikilambda_perform_test should not be called
		expect( mw.Api ).not.toHaveBeenCalledWith( expect.objectContaining( {
			action: 'wikilambda_perform_test'
		} ) );
	} );
} );
