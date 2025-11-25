/*!
 * LanguageContainer Component Object for WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import ObjectSelector from './ObjectSelector.js';
import i18n from '../../utils/i18n.js';

class LanguageContainerComponent {
	get languageField() {
		return this.languageContext.$( `input[placeholder="${ i18n[ 'wikilambda-editor-label-addlanguage-label' ] }"` );
	}

	get nameField() {
		return this.languageContext.$( `input[placeholder="${ i18n[ 'wikilambda-function-definition-name-placeholder' ] }"` );
	}

	get aliasField() {
		return this.languageContext.$( `input[placeholder="${ i18n[ 'wikilambda-function-definition-alias-placeholder' ] }"` );
	}

	get inputLabelsField() {
		return this.languageContext.$$( `input[placeholder="${ i18n[ 'wikilambda-function-definition-inputs-item-input-placeholder' ] }"` );
	}

	constructor( languageContext ) {
		this.languageContext = languageContext;
	}

	async setLanguage( language ) {
		if ( await this.languageField.getValue() === language ) {
			return;
		}
		const languageSelector = await ObjectSelector.fromInputField( this.languageField );
		return languageSelector.select( language );
	}

	setName( name ) {
		return this.nameField.setValue( name );
	}

	async setAlias( alias ) {
		await this.aliasField.setValue( alias + '\n' );
	}

	async fill( props ) {
		await this.setLanguage( props.language );
		await this.setName( props.name );
		await this.setAlias( props.alias );
		const inputLabelsInput = await this.inputLabelsField;
		for ( const [ index, inputLabel ] of props.inputs.entries() ) {
			await inputLabelsInput[ index ].setValue( inputLabel );
		}
	}
}

class FirstLanguageContainerComponent extends LanguageContainerComponent {
	get outputTypeField() {
		return this.languageContext.$( `[data-testid='function-editor-output'] input[placeholder='${ i18n[ 'wikilambda-function-definition-output-selector' ] }']` );
	}

	get anotherInputBtn() {
		return this.languageContext.$( `button*=${ i18n[ 'wikilambda-function-definition-inputs-item-add-input-button' ] }` );
	}

	constructor( languageContext ) {
		super( languageContext );
	}

	getInput( inputIndex ) {
		return this.languageContext.$( `[data-testid="function-editor-input-item"]:nth-of-type(${ inputIndex + 1 })` );
	}

	async getInputTypeField( index ) {
		return this.getInput( index ).$( `input[placeholder='${ i18n[ 'wikilambda-function-definition-inputs-item-selector-placeholder' ] }']` );
	}

	getDeleteButtonForInput( inputIndex ) {
		return this.getInput( inputIndex ).$( '[data-testid="remove-input"]' );
	}

	async getOrCreateInputTypeField( index ) {
		const input = await this.getInput( index );
		if ( !input || !await input.isExisting() ) {
			await this.anotherInputBtn.click();
		}
		return this.getInputTypeField( index );
	}

	async setOutputType( outputType ) {
		const outputSelector = await ObjectSelector.fromInputField( this.outputTypeField );
		return outputSelector.select( outputType );
	}

	async fill( props ) {
		await this.setOutputType( props.outputType );
		for ( const [ index, { type } ] of props.inputs.entries() ) {
			const typeField = await this.getOrCreateInputTypeField( index );
			const typeSelector = await ObjectSelector.fromInputField( typeField );
			await typeSelector.select( type );
		}
		return super.fill( {
			...props,
			inputs: props.inputs.map( ( input ) => input.label )
		} );
	}

	async removeInput( inputIndex ) {
		return this.getDeleteButtonForInput( inputIndex ).click();
	}
}

export { LanguageContainerComponent, FirstLanguageContainerComponent };
