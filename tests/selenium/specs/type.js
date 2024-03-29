/*!
 * WikiLambda browser test suite for "Create a new type"
 *
 * @see https://phabricator.wikimedia.org/T318943.
 *
 * Test go through the following steps
 * [1] Create a new type
 * [a] Login and Navigate to the Type form page
 * [b] Fill the entries in the About and Content block
 * [c] Publish the type and assert that entries are displayed as expected
 *
 * [2] Edit the type
 * [a] Open the Type form
 * [b] Edit the details in the about block
 * [c] Publish the type and assert that entries are displayed as expected
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const LoginPage = require( 'wdio-mediawiki/LoginPage' );
const TypeForm = require( '../pageobjects/type/TypeForm.page' );
const TypePage = require( '../pageobjects/type/Type.page' );

describe( 'Type (CUJ 7)', () => {

	describe( 'Create a new type', () => {

		/**
		 * Details about the entries in Validator block
		 */
		const validatorBlockEntries = {
			label: 'validator',
			value: 'Validate object'
		};

		/**
		 * Details about the entries in Equality block
		 */
		const equalityBlockEntries = {
			label: 'equality',
			value: 'Echo'
		};

		/**
		 * Details about the entries in Renderer block
		 */
		const rendererBlockEntries = {
			label: 'renderer',
			value: 'Echo'
		};

		/**
		 * Details about the entries in Parser block
		 */
		const parserBlockEntries = {
			label: 'parser',
			value: 'Echo'
		};

		/**
		 * Details about the entries in Keys block
		 */
		const keysBlockEntries = {
			firstKey: {
				index: 0,
				selectorIndex: 0,
				valueType: 'String',
				keyId: 'Z0K1',
				textArray: [
					{
						language: 'English',
						languageShortName: 'EN',
						text: 'key1'
					},
					{
						language: 'French',
						languageShortName: 'FR',
						text: 'key1-français'
					}
				]
			},
			secondKey: {
				index: 1,
				selectorIndex: 3,
				valueType: 'String',
				keyId: 'Z0K2',
				textArray: [
					{
						language: 'English',
						languageShortName: 'EN',
						text: 'key2'
					}
				]
			},
			thirdKey: {
				index: 2,
				selectorIndex: 5,
				valueType: 'String',
				keyId: 'Z0K3',
				textArray: [
					{
						language: 'English',
						languageShortName: 'EN',
						text: 'key3'
					},
					{
						language: 'Hindi',
						languageShortName: 'HI',
						text: 'key3-हिंदी'
					}
				]
			}
		};

		/**
		 * About block entries in different languages
		 */
		let aboutBlockEntriesEnglish, aboutBlockEntriesFrench,
			aboutBlockEntriesHindi;

		/**
		 * Initialize the entries of the About block before the test
		 */
		before( () => {
			/**
			 * Date.now() is being used so that label will be unique and
			 * not collide in case of retries.
			 */
			const time = Date.now();
			aboutBlockEntriesEnglish = {
				language: 'English',
				label: `e2e-Create-A-New-Type-${ time }-English`,
				description: 'This is the description for the new type in English',
				alias: 'alias in English'
			};
			aboutBlockEntriesFrench = {
				language: 'French',
				label: `e2e-Create-A-New-Type-${ time }-français`,
				description: 'Ceci est la description du nouveau type en français',
				alias: 'alias en français'
			};
			aboutBlockEntriesHindi = {
				language: 'Hindi',
				label: `e2e-Create-A-New-Type-${ time }-हिंदी`,
				description: 'यह हिंदी में नए प्रकार के लिए विवरण है',
				alias: 'उपनाम हिंदी में'
			};
		} );

		it( 'should navigate to the type form', async () => {
			await LoginPage.loginAdmin();
			/**
			 * If login is successful then browser is redirected from "Special:UserLogin"
			 * to URL containing "Main_Page"
			 */
			await expect( browser ).toHaveUrlContaining( 'Main_Page',
				{ message: 'Login failed' } );

			await TypeForm.open();
			/**
			 * If the type form is opened then Keys block should be displayed
			 */
			await expect( await TypeForm.keysBlock ).toBeDisplayed( { message: 'Type Form is not opened' } );
		} );

		it( 'should fill the entries in the about section', async () => {
			/**
			 * Add and Submit About block entries in English
			 */
			await TypeForm.openAboutBlockDialogBox();
			await expect( await TypeForm.aboutBlockDialogBox ).toBeDisplayed();
			await TypeForm.addAboutBlockEntries( aboutBlockEntriesEnglish );
			await TypeForm.submitAboutBlockEntries();
			await expect( await TypeForm.aboutBlockDialogBox ).not.toBeDisplayed();

			/**
			 * Add and Submit About block entries in French
			 */
			await TypeForm.openAboutBlockDialogBox();
			await expect( await TypeForm.aboutBlockDialogBox ).toBeDisplayed();
			await TypeForm.addAboutBlockEntries( aboutBlockEntriesFrench );
			await TypeForm.submitAboutBlockEntries();
			await expect( await TypeForm.aboutBlockDialogBox ).not.toBeDisplayed();

			/**
			 * Add and Submit About block entries in Hindi
			 */
			await TypeForm.openAboutBlockDialogBox();
			await expect( await TypeForm.aboutBlockDialogBox ).toBeDisplayed();
			await TypeForm.addAboutBlockEntries( aboutBlockEntriesHindi );
			await TypeForm.submitAboutBlockEntries();
			await expect( await TypeForm.aboutBlockDialogBox ).not.toBeDisplayed();
		} );

		it( 'should fill the entries in the keys block', async () => {
			/**
			 * Set the first key
			 */
			await TypeForm.addKey();
			await TypeForm.setKey( keysBlockEntries.firstKey );

			/**
			 * Set the second key
			 */
			await TypeForm.addKey();
			await TypeForm.setKey( keysBlockEntries.secondKey );

			/**
			 * Set the third key
			 */
			await TypeForm.addKey();
			await TypeForm.setKey( keysBlockEntries.thirdKey );
		} );

		it( 'should fill the entries in the validator block', async () => {
			await TypeForm.setTypeFunction( validatorBlockEntries.label, validatorBlockEntries.value );
		} );

		it( 'should fill the entries in the equality block', async () => {
			await TypeForm.setTypeFunction( equalityBlockEntries.label, equalityBlockEntries.value );
		} );

		it( 'should fill the entries in the renderer block', async () => {
			await TypeForm.setTypeFunction( rendererBlockEntries.label, rendererBlockEntries.value );
		} );

		it( 'should fill the entries in the parser block', async () => {
			await TypeForm.setTypeFunction( parserBlockEntries.label, parserBlockEntries.value );
		} );

		it( 'should publish the type', async () => {
			await TypeForm.publishType();
			/**
			 * When type is published successfully, the browser is redirected to URL
			 * containing param "success=true"
			 */
			await expect( browser ).toHaveUrlContaining( 'success=true',
				{ message: 'Unable to publish the type' } );

			/**
			 * Confirm that the Type Page is open
			 */
			await expect( await TypePage.getTypeTitle() )
				.toBe( aboutBlockEntriesEnglish.label );
		} );

		describe( 'Show details of new type created', () => {

			before( async () => {
				const typeZId = await TypePage.getTypeZId();
				keysBlockEntries.firstKey.keyId = `${ typeZId }K1`;
				keysBlockEntries.secondKey.keyId = `${ typeZId }K2`;
				keysBlockEntries.thirdKey.keyId = `${ typeZId }K3`;
			} );

			it( 'should display the description in the about section', async () => {
				await expect( await TypePage.getTypeDescription() ).toBe(
					aboutBlockEntriesEnglish.description,
					{ message: `Type page is not displaying the type description as expected to be ${ aboutBlockEntriesEnglish.description }` } );
			} );

			it( 'should display the entries in the keys block', async () => {
				const keyArr = [ 'firstKey', 'secondKey', 'thirdKey' ];
				for ( const key of keyArr ) {
					const [ valueTypeSelector, keyIdSelector, textSelectorArray ] =
					await TypePage.getKeysBlockItemSelectors( keysBlockEntries[ key ] );
					await expect( valueTypeSelector ).toBeExisting( { message: `${ key } is not displaying the value Type as expected` } );
					await expect( keyIdSelector ).toBeExisting( { message: `${ key } is not displaying the key id as expected` } );

					for ( const i in textSelectorArray ) {
						await expect( textSelectorArray[ i ].languageSelector ).toBeExisting( { message: `${ key } ${ i + 1 }th label is not displaying the language as expected` } );
						await expect( textSelectorArray[ i ].textSelector ).toBeExisting( { message: `${ key } ${ i + 1 }th label is not displaying the text as expected` } );
					}
				}
			} );

			it( 'should display the entries in the validator block', async () => {
				await expect( await TypePage.getTypeFunctionSelector(
					validatorBlockEntries.label,
					validatorBlockEntries.value
				) ).toBeDisplayed( { message: 'Validator is not displayed as expected' } );
			} );

			it( 'should display the entries in the equality block', async () => {
				await expect( await TypePage.getTypeFunctionSelector(
					equalityBlockEntries.label,
					equalityBlockEntries.value
				) ).toBeDisplayed( { message: 'Equality is not displayed as expected' } );
			} );

			it( 'should display the entries in the renderer block', async () => {
				await expect( await TypePage.getTypeFunctionSelector(
					rendererBlockEntries.label,
					rendererBlockEntries.value
				) ).toBeDisplayed( { message: 'Renderer is not displayed as expected' } );
			} );

			it( 'should display the entries in the parser block', async () => {
				await expect( await TypePage.getTypeFunctionSelector(
					parserBlockEntries.label,
					parserBlockEntries.value
				) ).toBeDisplayed( { message: 'Parser is not displayed as expected' } );
			} );

		} );
	} );

	describe( 'Edit the type', () => {

		/**
		 * About block edit entries in English
		 */
		let aboutBlockEditEntries;

		before( () => {
			/**
			 * Date.now() is being used so that label will be unique and
			 * not collide in case of retries.
			 */
			const time = Date.now();
			aboutBlockEditEntries = {
				language: 'English',
				label: `e2e-edit-type-${ time }-English`,
				description: 'This is edited description for the type in English',
				alias: 'edited alias in English'
			};
		} );

		it( 'should open the type form', async () => {
			await TypePage.openEditSource();
			/**
			 * If the type form is opened, then browser is redirected to URL
			 * containing the param "action=edit"
			 */
			await expect( browser ).toHaveUrlContaining( 'action=edit',
				{ message: 'type form is not opened' } );
		} );

		it( 'should edit the "English" entries in about block ', async () => {
			/**
			 * Edit About information in English
			 */
			await TypeForm.openAboutBlockDialogBox();
			await expect( await TypeForm.aboutBlockDialogBox ).toBeDisplayed();
			await TypeForm.addAboutBlockEntries( aboutBlockEditEntries );
			await TypeForm.submitAboutBlockEntries();
			await expect( await TypeForm.aboutBlockDialogBox ).not.toBeDisplayed();
		} );

		it( 'should publish the edited type', async () => {
			await TypeForm.publishType();
			/**
			 * When type is published successfully, the browser is redirected to url
			 * containing param "success=true"
			 */
			await expect( browser ).toHaveUrlContaining( 'success=true',
				{ message: 'Unable to publish edited type' } );

			/**
			 * Confirm that the type View Page is open
			 */
			await expect( await TypePage.getTypeTitle() ).toBe(
				aboutBlockEditEntries.label,
				{ message: 'Type Page is not opened' } );
		} );

		describe( 'Show details of edited type', () => {

			it( 'should display the description in the about section', async () => {
				await expect( await TypePage.getTypeDescription() ).toBe(
					aboutBlockEditEntries.description,
					{ message: `Type page is not displaying the type description as expected to be ${ aboutBlockEditEntries.description }` } );
			} );

		} );
	} );
} );
