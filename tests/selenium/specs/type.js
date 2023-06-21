/**
 * @file contains the tests for "Create a new type".
 * @see https://phabricator.wikimedia.org/T318943
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
			validator: 'Validate object'
		};

		/**
		 * Details about the entries in Keys block
		 */
		const keysBlockEntries = {
			firstKey: {
				index: '0',
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
				index: '1',
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
				index: '2',
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
				label: `e2e-Create-A-New-Type-${time}-English`,
				description: 'This is the description for the new type in English',
				alias: 'alias in English'
			};
			aboutBlockEntriesFrench = {
				language: 'French',
				label: `e2e-Create-A-New-Type-${time}-français`,
				description: 'Ceci est la description du nouveau type en français',
				alias: 'alias en français'
			};
			aboutBlockEntriesHindi = {
				language: 'Hindi',
				label: `e2e-Create-A-New-Type-${time}-हिंदी`,
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

		// TODO (T340774) Re-enable and fix once Default View is done
		it.skip( 'should fill the entries in the keys block', async () => {
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
			await TypeForm.setValidator( validatorBlockEntries.validator );
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
				keysBlockEntries.firstKey.keyId = `${typeZId}K1`;
				keysBlockEntries.secondKey.keyId = `${typeZId}K2`;
				keysBlockEntries.thirdKey.keyId = `${typeZId}K3`;
			} );

			it( 'should display the entries in the about section', async () => {
				await expect( await TypePage.getTypeLabel() ).toBe(
					aboutBlockEntriesEnglish.label,
					{ message: `Type page is not displaying the type label as expected to be ${aboutBlockEntriesEnglish.label}` } );
				await expect( await TypePage.getTypeDescription() ).toBe(
					aboutBlockEntriesEnglish.description,
					{ message: `Type page is not displaying the type description as expected to be ${aboutBlockEntriesEnglish.description}` } );
			} );

			it( 'should display the entries in the keys block', async () => {
				[ 'firstKey', 'secondKey', 'thirdKey' ].forEach( async ( key ) => {
					const [ valueTypeSelector, keyIdSelector, textSelectorArray ] =
					await TypePage.getKeysBlockItemSelectors( keysBlockEntries[ key ] );
					await expect( valueTypeSelector ).toBeExisting( `${key} is not displaying the value Type as expected` );
					await expect( keyIdSelector ).toBeExisting( `${key} is not displaying the key id as expected` );

					for ( const i in textSelectorArray ) {
						await expect( textSelectorArray[ i ].languageSelector ).toBeExisting( `${key} ${i + 1}th label is not displaying the language as expected` );
						await expect( textSelectorArray[ i ].textSelector ).toBeExisting( `${key} ${i + 1}th label is not displaying the text as expected` );
					}
				} );
			} );

			it( 'should display the entries in the validator block', async () => {
				await expect( await TypePage.getValidatorSelector(
					validatorBlockEntries.validator ) ).toBeDisplayed( { message: 'Validator is not displayed as expected' } );
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
				label: `e2e-edit-type-${time}-English`,
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

			it( 'should display the information in the about section', async () => {
				await expect( await TypePage.getTypeLabel() ).toBe(
					aboutBlockEditEntries.label,
					{ message: `Type page is not displaying the type label as expected to be ${aboutBlockEditEntries.label}` } );
				await expect( await TypePage.getTypeDescription() ).toBe(
					aboutBlockEditEntries.description,
					{ message: `Type page is not displaying the type description as expected to be ${aboutBlockEditEntries.description}` } );
			} );

		} );
	} );
} );
