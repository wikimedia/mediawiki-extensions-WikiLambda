/*!
 * Function Form page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const { LanguageContainerComponent, FirstLanguageContainerComponent } = require( '../../componentobjects/function-form/LanguageContainer.component' );
const ZObjectPublish = require( '../../componentobjects/ZObjectPublish' );

class FunctionForm extends Page {
	get addLabelInAnotherLanguageBtn() {
		return $( 'button*=Add labels in another language' );
	}

	async open() {
		await super.openTitle( 'Special:CreateObject', { zid: 'Z8' } );
	}

	getFirstLanguageContainer() {
		return $( '.ext-wikilambda-function-language-block:first-of-type' );
	}

	getLastLanguageContainer() {
		return $( '.ext-wikilambda-function-language-block:last-of-type' );
	}

	async removeInput( inputIndex ) {
		const firstLanguageContainerComp = new FirstLanguageContainerComponent(
			this.getFirstLanguageContainer()
		);
		await firstLanguageContainerComp.removeInput( inputIndex );
	}

	async fillFirstLanguageContainer( argProps ) {
		const firstContainer = await this.getFirstLanguageContainer();
		await firstContainer.waitForExist();
		const firstLanguageContainerComp = new FirstLanguageContainerComponent(
			firstContainer
		);
		return firstLanguageContainerComp.fill( argProps );
	}

	async addLanguageContainer( argProps ) {
		await this.addLabelInAnotherLanguageBtn.click();

		const languageContainerComp = new LanguageContainerComponent(
			this.getLastLanguageContainer()
		);
		return languageContainerComp.fill( argProps );
	}

	async publishFunction() {
		// Dirty workaround to let the model being updated after the last debounce
		// (see the FunctionEditorInputsItem.vue file)
		// eslint-disable-next-line wdio/no-pause
		await browser.pause( 300 );
		await ZObjectPublish.publish();
	}
}

module.exports = new FunctionForm();
