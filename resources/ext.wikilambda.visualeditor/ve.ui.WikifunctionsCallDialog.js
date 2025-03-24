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
 * Runs once, when the dialog is created. It doesn't run when the dialog
 * is open a second time. So setup needs to be done in getSetupProcess
 * instead.
 *
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.initialize = function () {
	// Parent method
	ve.ui.WikifunctionsCallDialog.super.prototype.initialize.call( this );

	// Create a div element for Vue inside the dialog
	const vueContainer = new OO.ui.Widget( {
		$element: $( '<div>' ).attr( 'id', 'wikilambda-visualeditor-wikifunctionscall-app' )
	} );

	// Add the Vue div inside the dialog content
	this.$element.addClass( 've-ui-WikifunctionsCallDialog' );
	this.$body.append( vueContainer.$element );

	ve.init.mw.WikifunctionsCall.vueAppLoaded.then( () => {
		const thisDialog = this;
		const Vue = require( 'vue' );
		const { FunctionCallSetup } = require( 'ext.wikilambda.app' );

		// Initialize Vue app inside the dialog
		const app = Vue.createMwApp( {
			components: {
				'wl-function-call-setup': FunctionCallSetup
			},
			template: `<wl-function-call-setup
						@function-name-updated="onFunctionNameUpdated"
						@function-inputs-updated="onFunctionInputsUpdated"
						@loading-start="onLoadingStart"
						@loading-end="onLoadingEnd"
					></wl-function-call-setup>`,
			methods: {
				/**
				 * On Function name updated, set the dialog status.
				 *
				 * @param {string} newName
				 */
				onFunctionNameUpdated: function ( newName ) {
					// Update dialog title
					thisDialog.setTitle( newName );
					// Update dialog actions
					thisDialog.updateActions();
				},
				/**
				 * On Function setup update, set the dialog status.
				 */
				onFunctionInputsUpdated: function () {
					thisDialog.updateActions();
				},
				/**
				 * On Loading start, push pending.
				 */
				onLoadingStart: function () {
					// ⏳ Show loading indicator
					thisDialog.pushPending();
				},
				/**
				 * On Loading end, pop pending.
				 */
				onLoadingEnd: function () {
					// Remove loading indicator
					thisDialog.popPending();
				}
			}
		} );

		// Use the already initialized global Pinia store
		app.use( ve.init.mw.WikifunctionsCall.pinia );
		app.mount( '#wikilambda-visualeditor-wikifunctionscall-app' );
	} );
};

/**
 * FIXME doc
 *
 * @param {string} title
 */
ve.ui.WikifunctionsCallDialog.prototype.setTitle = function ( title ) {
	const defaultTitle = OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-title' );
	this.title.setLabel( title || defaultTitle );
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.getSetupProcess = function ( data ) {
	return ve.ui.WikifunctionsCallDialog.super.prototype.getSetupProcess.call( this, data )
		.next( () => {
			// Wait till the Vue app is loaded, so we can access piniaStore
			ve.init.mw.WikifunctionsCall.vueAppLoaded.then( () => {
				// Get the suggested functions messages and parse the JSON (if any)
				let suggestedFunctions = [];
				try {
					suggestedFunctions = JSON.parse( OO.ui.msg( 'wikilambda-suggested-functions.json' ) );
				} catch ( e ) {}

				// No selected node: new Wikifunction with
				// * functionId: undefined
				// * functionParams: []
				// * suggestedFunctions: Array
				const functionPayload = {
					functionId: undefined,
					functionParams: [],
					suggestedFunctions,
					isEditing: this.isEditing()
				};
				const node = this.getSelectedNode();

				// Selected node: existing Wikifunction with
				// * functionId: Zid or null
				// * functionParams: Array
				if ( node ) {
					// Get Function Id
					const template = ve.getProp( node, 'element', 'attributes', 'mw', 'parts', 0, 'template' );
					const [ , functionId ] = ve.getProp( template, 'target', 'wt' ).split( ':' );

					// Get Function Params
					const functionParamsObject = ve.getProp( template, 'params' ) || {};
					const functionParams = [];
					for ( const key in functionParamsObject ) {
						if ( Object.prototype.hasOwnProperty.call( functionParamsObject, key ) ) {
							// Make sure that the array contains items in the right order (keys start at 1)
							functionParams[ parseInt( key ) - 1 ] = functionParamsObject[ key ].wt;
						}
					}
					functionPayload.functionId = functionId;
					functionPayload.functionParams = functionParams;
				}

				// Set Wikifunction payload in the store
				ve.init.mw.WikifunctionsCall.piniaStore.initializeVEFunctionCallEditor( functionPayload );

				// Update action button depending on Wikifunction call completeness
				this.updateActions();
			} );
		} );
};

/**
 * Disable the "Done" button if the function call is not fully configured
 */
ve.ui.WikifunctionsCallDialog.prototype.updateActions = function () {
	ve.init.mw.WikifunctionsCall.vueAppLoaded.then( () => {
		// Set 'done' action button status.
		// * If editing existing function call:
		//   * Function must be set
		//   * Function params must be set and valid
		// * If inserting new function call:
		//   * Function must be set
		//   * Function params must be set and valid
		const functionValid = ve.init.mw.WikifunctionsCall.piniaStore.validateVEFunctionId;
		const functionParamsValid = ve.init.mw.WikifunctionsCall.piniaStore.validateVEFunctionParams;
		this.actions.setAbilities( { done: functionValid && functionParamsValid } );
	} );
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.getReadyProcess = function ( data ) {
	// TODO (T373118): Replace the below with focussing the input of our Vue application
	return ve.ui.WikifunctionsCallDialog.super.prototype.getReadyProcess.call( this, data )
		.next( () => {
			// this.functionInput.focus();
		} );
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.getTeardownProcess = function ( data ) {
	return ve.ui.WikifunctionsCallDialog.super.prototype.getTeardownProcess.call( this, data )
		.next( () => {
			// Reset the store to blank values
			ve.init.mw.WikifunctionsCall.piniaStore.initializeVEFunctionCallEditor();
		} );
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'done' ) {

		// Make sure App is loaded before accessing piniaStore
		ve.init.mw.WikifunctionsCall.vueAppLoaded.then( () => {
			// Get values from the store:
			const functionId = ve.init.mw.WikifunctionsCall.piniaStore.getVEFunctionId;
			const functionParams = ve.init.mw.WikifunctionsCall.piniaStore.getVEFunctionParams;

			// Place our values into the model
			const mwData = {
				parts: [ {
					template: {
						target: { wt: `#function:${ functionId }`, function: 'function' },
						params: functionParams.reduce( ( acc, param, index ) => {
							acc[ ( index + 1 ).toString() ] = { wt: param };
							return acc;
						}, {} )
					}
				} ]
			};

			// Update the visual editor model with the new data
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
				this.getFragment().collapseToEnd().insertContent( [ {
					type: 'WikifunctionsCall',
					attributes: { mw: mwData }
				} ] );
			}

			// Close dialog, setTeardownProcess will be called and reset the store
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
	return 350;
};

/* Registration */

ve.ui.windowFactory.register( ve.ui.WikifunctionsCallDialog );
