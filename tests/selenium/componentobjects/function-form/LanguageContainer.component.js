/*!
 * LanguageContainer Component Object for WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const ObjectSelector = require( './ObjectSelector' ),
	i18n = require( '../../utils/i18n.js' )();

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
		return this.languageContext.$( ".ext-wikilambda-function-definition-output input[placeholder='Select type']" );
	}

	get anotherInputBtn() {
		return this.languageContext.$( 'button*=Add another input' );
	}

	constructor( languageContext ) {
		super( languageContext );
	}

	getInput( inputIndex ) {
		return this.languageContext.$( `.ext-wikilambda-editor-input-list-item:nth-of-type(${ inputIndex + 1 })` );
	}

	async getInputTypeField( index ) {
		return this.getInput( index ).$( "input[placeholder='Select type']" );
	}

	getDeleteButtonForInput( inputIndex ) {
		return this.getInput( inputIndex ).$( 'button[aria-label="Remove input"]' );
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

module.exports = {
	LanguageContainerComponent,
	FirstLanguageContainerComponent
};
