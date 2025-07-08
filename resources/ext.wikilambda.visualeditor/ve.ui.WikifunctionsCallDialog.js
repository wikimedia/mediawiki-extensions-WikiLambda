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

ve.ui.WikifunctionsCallDialog.static.actions = [
	...ve.ui.MWExtensionDialog.static.actions,
	{
		action: 'back',
		title: OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-back' ),
		flags: [ 'safe', 'back' ],
		modes: [ 'insert' ]
	}
];

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
				 * On Function name updated, set the dialog title.
				 *
				 * @param {string} newName
				 */
				onFunctionNameUpdated: function ( newName ) {
					thisDialog.setTitle( newName );
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
 * Sets the dialog title to either a generic title or to the selected function name.
 *
 * @param {string|undefined} title
 */
ve.ui.WikifunctionsCallDialog.prototype.setTitle = function ( title ) {
	const defaultTitle = OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-title' );
	this.title.setLabel( title || defaultTitle );
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallDialog.prototype.getEscapeAction = function () {
	const backOrClose = this.actions.get( { flags: [ 'back', 'close' ], visible: true } );
	if ( backOrClose.length ) {
		return backOrClose[ 0 ].getAction();
	}
	return null;
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

				// Trim to the first five elements of the array, so it's not too long for users.
				suggestedFunctions = suggestedFunctions.slice( 0, 5 );

				// No selected node: new Wikifunction with
				// * functionId: undefined
				// * functionParams: []
				// * suggestedFunctions: Array
				const functionPayload = {
					functionId: undefined,
					functionParams: [],
					suggestedFunctions
				};
				const node = this.getSelectedNode();

				// Selected node: existing Wikifunction with
				// * functionId: Zid or null
				// * functionParams: Array
				if ( node ) {
					const pf = ve.getProp( node, 'element', 'attributes', 'mw', 'parts', 0, 'parserfunction' );
					const functionCallObject = ve.getProp( pf, 'params' ) || {};

					// Get Function Params
					const functionParams = [];
					for ( const key in functionCallObject ) {
						if ( Object.prototype.hasOwnProperty.call( functionCallObject, key ) ) {
							// Make sure that the array uses the right order (keys start at 1)
							functionParams[ parseInt( key ) - 1 ] = functionCallObject[ key ].wt;
						}
					}

					// Get Function Id; it's just the first parameter in the array
					functionPayload.functionId = functionParams[ 0 ];
					// … and splice out said first argument from the rest of the parameters
					functionPayload.functionParams = functionParams.slice( 1 );
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
		// Enable DONE button when:
		// * function is valid, AND
		// * function params are all valid, AND
		// * we are creating a new function configuration OR we have changed an existing one.
		const functionValid = ve.init.mw.WikifunctionsCall.piniaStore.validateVEFunctionId;
		const functionParamsValid = ve.init.mw.WikifunctionsCall.piniaStore.validateVEFunctionParams;
		const functionParamsDirty = ve.init.mw.WikifunctionsCall.piniaStore.isParameterSetupDirty;
		const functionParamsNew = ve.init.mw.WikifunctionsCall.piniaStore.isNewParameterSetup;
		const newOrChanged = functionParamsNew || functionParamsDirty;
		this.actions.setAbilities( { done: functionValid && functionParamsValid && newOrChanged } );

		// Replace CLOSE button with BACK button when:
		// * we are in insert mode
		// * we are in the second screen (function is selected and valid)
		const isInsertMode = this.getMode() === 'insert';
		const canGoBack = isInsertMode && functionValid;
		const backButton = this.actions.get( { flags: [ 'back' ] } ).pop();
		const closeButton = this.actions.get( { flags: [ 'close' ] } ).pop();
		if ( backButton ) {
			backButton.toggle( !!canGoBack );
		}
		if ( closeButton ) {
			closeButton.toggle( !canGoBack );
		}
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
	if ( action === 'back' ) {
		ve.init.mw.WikifunctionsCall.vueAppLoaded.then( () => {
			ve.init.mw.WikifunctionsCall.piniaStore.setVEFunctionId();
			ve.init.mw.WikifunctionsCall.piniaStore.setVEFunctionParams();
			this.updateActions();
			this.setTitle();
		} );
	}

	if ( action === 'done' ) {
		// Make sure App is loaded before accessing piniaStore
		ve.init.mw.WikifunctionsCall.vueAppLoaded.then( () => {
			// Get values from the store:
			const functionId = ve.init.mw.WikifunctionsCall.piniaStore.getVEFunctionId;
			const functionParams = ve.init.mw.WikifunctionsCall.piniaStore.getVEFunctionParams.map(
				// eslint-disable-next-line no-unused-vars
				( param, _index ) => param
			);

			// Place our values into the model
			const mwData = {
				parts: [ {
					parserfunction: {
						target: { wt: '#function', key: 'function' },
						params: functionParams.reduce( ( acc, param, index ) => {
							acc[ ( index + 2 ) ] = { wt: param };
							return acc;
						}, {} )
					}
				} ]
			};
			// Add the functionId as the first parameter
			mwData.parts[ 0 ].parserfunction.params[ 1 ] = { wt: functionId };

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
