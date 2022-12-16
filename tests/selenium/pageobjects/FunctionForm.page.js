'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const { LanguageContainerComponent, FirstLanguageContainerComponent } = require( '../componentobjects/function-form/LanguageContainer.component' );
const CreateZObjectPage = require( './CreateZObject.page' );

class FunctionForm extends Page {
	get publishFunctionButton() { return $( 'button=Publish' ); }
	get publishFunctionInValidationPopupButton() { return $( '#publish-dialog' ).$( 'button=Publish' ); }
	get editSummaryInValidationPopupField() { return $( 'input[aria-label="Edit summary"]' ); }
	get addLabelInAnotherLanguageBtn() {
		return $( 'button*=Add labels in another language' );
	}

	async open() {
		await CreateZObjectPage.open( 'Special:CreateZObject?zid=z8' );
		await CreateZObjectPage.switchToFunctionView();
	}

	getFirstLanguageContainer() {
		return $( '.ext-wikilambda-function-definition__container__input:first-of-type' );
	}

	getLastLanguageContainer() {
		return $( '.ext-wikilambda-function-definition__container__input:last-of-type' );
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

	async publishFunction( summary = 'Published function for tests' ) {
		// Dirty workaround to let the model being updated after the last debounce
		// (see the FunctionEditorInputsItem.vue file)
		await browser.pause( 300 );
		await this.publishFunctionButton.click();
		await this.editSummaryInValidationPopupField.setValue( summary );
		await this.publishFunctionInValidationPopupButton.click();
	}
}

module.exports = new FunctionForm();
