/*!
 * WikiLambda extension's VisualEditor UserInterface class for the dialog to inject/edit Wikifunctions calls.
 *
 * @copyright Abstract Wikipedia Team and others
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Dialog for editing WikifunctionsCalls
 *
 * @class
 * @extends ve.ui.MWExtensionDialog
 *
 * @constructor
 * @param {Object} [config] Configuration options
 */
ve.ui.WikifunctionsCallDialog = function VeUiWikifunctionsCallDialog() {
	// Parent constructor
	ve.ui.WikifunctionsCallDialog.super.apply( this, arguments );

	this.$element.addClass( 've-ui-WikifunctionsCallDialog' );
};

/* Inheritance */

OO.inheritClass( ve.ui.WikifunctionsCallDialog, ve.ui.NodeDialog );

/* Static properties */

ve.ui.WikifunctionsCallDialog.static.name = 'WikifunctionsCall';

ve.ui.WikifunctionsCallDialog.static.size = 'large';

ve.ui.WikifunctionsCallDialog.static.title = OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-title' );

ve.ui.WikifunctionsCallDialog.static.modelClasses = [ ve.dm.WikifunctionsCallNode ];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.WikifunctionsCallDialog.super.prototype.initialize.call( this );

	// TODO (T373118): Replace the below with our Vue application

	// Properties
	this.panel = new OO.ui.PanelLayout( {
		padded: true
	} );
	this.functionInput = new OO.ui.TextInputWidget( {
		label: ve.msg( 'wikilambda-visualeditor-wikifunctionscall-target' )
	} );
	this.paramInput = new OO.ui.TextInputWidget( {
		label: ve.msg( 'wikilambda-visualeditor-wikifunctionscall-parameters' )
	} );

	// Initialization
	this.$element.addClass( 've-ui-WikifunctionsCallDialog' );
	this.panel.$element.append( this.functionInput.$element );
	this.panel.$element.append( this.paramInput.$element );
	this.$body.append( this.panel.$element );
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.getSetupProcess = function ( data ) {
	// TODO (T373118): Replace the below with injections into the Pinia store of our Vue application

	return ve.ui.WikifunctionsCallDialog.super.prototype.getSetupProcess.call( this, data )
		.next( () => {
			const node = this.getSelectedNode();
			const template = ve.getProp( node, 'element', 'attributes', 'mw', 'parts', 0, 'template' );
			this.functionInput.setValue( ( ve.getProp( template, 'target', 'pf' ) || '' ) );

			const functionParamsObject = ve.getProp( template, 'params', 'data' ) || {};
			const functionParamsArray = [];
			for ( const key in functionParamsObject ) {
				if ( Object.prototype.hasOwnProperty.call( functionParamsObject, key ) ) {
					functionParamsArray[ key ] = functionParamsObject[ key ];

				}
			}
			this.paramInput.setValue( functionParamsArray.map( ( pos, val ) => pos + '=' + val.wt ).join( '|' ) );
		} );
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.getReadyProcess = function ( data ) {
	// TODO (T373118): Replace the below with focussing the input of our Vue application

	return ve.ui.WikifunctionsCallDialog.super.prototype.getReadyProcess.call( this, data )
		.next( () => {
			this.functionInput.focus();
		} );
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.getActionProcess = function ( action ) {
	// TODO (T373118): Replace the below with reading from the Pinia store of our Vue application

	if ( action === 'done' ) {
		return new OO.ui.Process( () => {
			const functionName = this.functionInput.getValue();
			const dataValue = this.paramInput.getValue();
			const mwData = { parts: [ { template: { target: { pf: 'function', wt: 'function' }, params: {} } } ] };

			// Place our values into the model
			const payload = dataValue.split( '|' ).map( ( pair ) => pair.split( '=' ) );
			payload[ 0 ] = functionName;
			mwData.parts[ 0 ].template.params = payload.reduce( ( acc, val, pos ) => {
				acc[ pos + 1 ] = { wt: val };
				return acc;
			}, {} );

			const surfaceModel = this.getFragment().getSurface();
			if ( this.selectedNode ) {
				surfaceModel.change(
					ve.dm.TransactionBuilder.static.newFromAttributeChanges(
						surfaceModel.getDocument(),
						this.selectedNode.getOuterRange().start,
						{ mw: mwData }
					)
				);
			} else {
				this.getFragment().collapseToEnd().insertContent( [
					{
						type: 'WikifunctionsCall',
						attributes: {
							mw: mwData
						}
					}
				] );
			}
			this.close( { action: 'done' } );
		} );
	}
	// Parent method
	return ve.ui.WikifunctionsCallDialog.super.prototype.getActionProcess.call( this, action );
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.getBodyHeight = function () {
	return 250;
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.WikifunctionsCallDialog );
