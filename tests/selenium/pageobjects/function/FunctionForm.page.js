/*!
 * Function Form page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import Page from 'wdio-mediawiki/Page.js';
import { LanguageContainerComponent, FirstLanguageContainerComponent } from '../../componentobjects/function-form/LanguageContainer.component.js';
import ZObjectPublish from '../../componentobjects/ZObjectPublish.js';

class FunctionForm extends Page {
	get addLabelInAnotherLanguageBtn() {
		return $( '[data-testid="add-language-button"]' );
	}

	async open() {
		await super.openTitle( 'Special:CreateObject', { zid: 'Z8' } );
	}

	getFirstLanguageContainer() {
		return $( '[data-testid="function-editor-language-block"]:first-of-type' );
	}

	getLastLanguageContainer() {
		return $( '[data-testid="function-editor-language-block"]:last-of-type' );
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

export default new FunctionForm();
