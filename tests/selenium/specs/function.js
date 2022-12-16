/*!
 * WikiLambda browser test suite for functions
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const assert = require( 'assert' ),
	ListZObjectsByType = require( '../pageobjects/ListZObjectsByType.page' ),
	FunctionForm = require( '../pageobjects/FunctionForm.page' ),
	FunctionPage = require( '../pageobjects/Function.page' ),
	util = require( 'wdio-mediawiki/Util' ),
	LoginPage = require( 'wdio-mediawiki/LoginPage' );

describe( 'Function', function () {
	describe( 'Function viewer (CUJ1)', function () {
		it( 'should allow to evaluate a function', async function () {
			await ListZObjectsByType.open();
			const ListFunctions = await ListZObjectsByType.openFunctionsList();
			await ListFunctions.openFunction( 'echo' );

			await FunctionPage.callFunctionWithString( 'foobar' );
			await expect( await FunctionPage.responseEnvelopZObject ).toHaveText( 'foobar', { message: 'The response should be "foobar"' } );
		} );
	} );
	describe( 'Function editor (CUJ2)', function () {
		let functionTitle;
		let alias;
		const ALIASES = {
			get ENGLISH() { return alias + '-English'; },
			get FRENCH() { return alias + '-French'; },
			get GERMAN() { return alias + '-German'; }
		};
		const ARGUMENT_LABELS = {
			ENGLISH: [ 'first argument', 'second argument' ],
			FRENCH: [ 'premier argument', 'second argument' ],
			GERMAN: [ 'erstes Argument', 'zweites Argument' ]
		};
		before( function () {
			functionTitle = 'zzz-FunctionCreationTest-' + Date.now();
			alias = util.getTestString( 'alias-' );
		} );

		it( 'should create a function', async function () {
			await LoginPage.loginAdmin();
			await FunctionForm.open();
			await FunctionForm.fillFirstLanguageContainer( {
				language: 'English',
				name: functionTitle,
				alias: ALIASES.ENGLISH,
				inputs: [
					{ type: 'String', label: ARGUMENT_LABELS.ENGLISH[ 0 ] },
					{ type: 'Boolean', label: ARGUMENT_LABELS.ENGLISH[ 1 ] }
				],
				outputType: 'String'
			} );
			await FunctionForm.addLanguageContainer( {
				language: 'French',
				name: functionTitle + '-French',
				alias: ALIASES.FRENCH,
				inputs: ARGUMENT_LABELS.FRENCH
			} );
			await FunctionForm.addLanguageContainer( {
				language: 'German',
				name: functionTitle + '-German',
				alias: ALIASES.GERMAN,
				inputs: ARGUMENT_LABELS.GERMAN
			} );
			await FunctionForm.publishFunction();
		} );

		it( 'should display the function name', async function () {
			await FunctionPage.callButton.waitForExist();
			await FunctionPage.showNameInOtherLanguages.click();
			assert.strictEqual( await FunctionPage.functionTitle.getText(), functionTitle );
			assert.strictEqual( await FunctionPage.getNameInOtherLanguage( functionTitle + '-French' ).isExisting(), true, 'Should display function name in French' );
			assert.strictEqual( await FunctionPage.getNameInOtherLanguage( functionTitle + '-German' ).isExisting(), true, 'Should display function name in German' );
		} );

		it( 'should display the function aliases', async function () {
			await FunctionPage.showMoreAliases.click();
			assert.strictEqual( await FunctionPage.getAliasLabel( ALIASES.ENGLISH ).isExisting(), true, `Alias ${ALIASES.ENGLISH} should be displayed in alias list` );
			assert.strictEqual( await FunctionPage.getAliasLabel( ALIASES.FRENCH ).isExisting(), true, `Alias ${ALIASES.FRENCH} should be displayed in alias list` );
			assert.strictEqual( await FunctionPage.getAliasLabel( ALIASES.GERMAN ).isExisting(), true, `Alias ${ALIASES.GERMAN} should be displayed in alias list` );
		} );

		it( 'should display the function arguments', async function () {
			await FunctionPage.detailsTab.click();
			await FunctionPage.showMoreLanguageButton.click();
			await FunctionPage.hideListButton.waitForDisplayed();
			// FIXME: EcmaScript 2019, we can use Array.prototype.flat(). Chrome supports that.
			// But Eslint seems to be unhappy, so let's use this trick:
			const labelValues = [].concat( ...Object.values( ARGUMENT_LABELS ) );
			for ( const label of labelValues ) {
				assert.strictEqual( await FunctionPage.getArgumentLabel( label ).isExisting(), true, `label "${label}" should exist in the list of arguments in the Details view` );
			}
		} );

		it( 'should edit the function to remove a label', async function () {
			await FunctionPage.editFunction();
			await FunctionForm.removeInput( 1 );
			await FunctionForm.publishFunction();
		} );

		it( 'should display the function details without the removed label', async function () {
			await FunctionPage.callButton.waitForExist();
			await FunctionPage.detailsTab.click();
			await FunctionPage.showMoreLanguageButton.click();
			assert.strictEqual( await FunctionPage.getArgumentLabel( ARGUMENT_LABELS.FRENCH[ 0 ] ).isExisting(), true, 'French first argument should exist' );
			assert.strictEqual( await FunctionPage.getArgumentLabel( ARGUMENT_LABELS.FRENCH[ 1 ] ).isExisting(), false, 'French second argument should NOT exist anymore' );
		} );
	} );
} );
