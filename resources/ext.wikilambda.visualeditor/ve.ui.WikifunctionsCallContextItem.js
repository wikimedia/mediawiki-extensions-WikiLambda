/*!
 * WikiLambda extension's VisualEditor UserInterface class for the context item for Wikifunctions calls.
 *
 * @copyright Abstract Wikipedia Team and others
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Context item for a WikifunctionsCall node.
 *
 * @class
 * @extends ve.ui.LinearContextItem
 *
 * @param {ve.ui.LinearContext} context Context the item is in
 * @param {ve.dm.Model} model Model the item is related to
 * @param {Object} config Configuration options
 */
ve.ui.WikifunctionsCallContextItem = function VeUiWikifunctionsCallContextItem() {
	// Parent constructor
	ve.ui.WikifunctionsCallContextItem.super.apply( this, arguments );

	this.$element.addClass( 've-ui-WikifunctionsCallContextItem' );
};

/* Inheritance */

OO.inheritClass( ve.ui.WikifunctionsCallContextItem, ve.ui.LinearContextItem );

/* Static Properties */

ve.ui.WikifunctionsCallContextItem.static.name = 'WikifunctionsCall';

ve.ui.WikifunctionsCallContextItem.static.icon = 'function';

ve.ui.WikifunctionsCallContextItem.static.label = OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-title' );

ve.ui.WikifunctionsCallContextItem.static.modelClasses = [ ve.dm.WikifunctionsCallNode ];

ve.ui.WikifunctionsCallContextItem.static.embeddable = false;

ve.ui.WikifunctionsCallContextItem.static.commandName = 'WikifunctionsCall';

ve.ui.WikifunctionsCallContextItem.static.suppresses = [ 'transclusion' ];

/* Methods */

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallContextItem.prototype.renderBody = function () {
	// Add loading message
	const $loading = $( '<div>' )
		.text( OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-popup-loading' ) )
		.css( { color: '#72777d' } );

	this.$body.append( $loading );

	// Make sure App is loaded before accessing piniaStore
	ve.init.mw.WikifunctionsCall.vueAppLoaded.then( () => {
		// Get the mw data object
		const mwData = this.model.getAttribute( 'mw' );
		const mwPart = ( mwData.parts || [] )[ 0 ];
		const functionCall = ve.getProp( mwPart, 'template', 'target', 'wt' );
		const functionId = functionCall.split( ':' )[ 1 ];

		// If no function Id, show "no function" error message
		if ( !functionId ) {
			$loading.text( OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-error-bad-function' ) );
			this.context.updateDimensions();
			return;
		}

		// If function Is is not valid, show "no valid function" error message
		const isValidZid = ( id ) => ( /^Z\d+$/.test( id ) );
		if ( !isValidZid( functionId ) ) {
			$loading.text( OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-error-bad-function' ) );
			this.context.updateDimensions();
			return;
		}

		// Request the function information
		ve.init.mw.WikifunctionsCall.piniaStore
			.fetchZids( { zids: [ functionId ] } )
			.then( () => {
				const fetched = ve.init.mw.WikifunctionsCall.piniaStore.getFetchedObject( functionId );

				// Fetch didn't succeed
				if ( !fetched.success ) {
					$loading.text( OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-error-bad-function' ) );
					this.context.updateDimensions();
					return;
				}

				// Fetched object is not a function
				const type = fetched.data.Z2K2.Z1K1;
				if ( type !== 'Z8' ) {
					$loading.text( OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-error-bad-function' ) );
					this.context.updateDimensions();
					return;
				}

				const functionLabelData = ve.init.mw.WikifunctionsCall.piniaStore.getLabelData( functionId );
				const wikifunctionsUrl = mw.config.get( 'wgWikifunctionsBaseUrl' ) || '';
				const userLangCode = mw.config.get( 'wgUserLanguage' );
				const functionUri = `${ wikifunctionsUrl }/view/${ userLangCode }/${ functionId }`;

				// TODO (T387361): getDescription full LabelData instead, so that we can set language information
				const functionDescription = ve.init.mw.WikifunctionsCall.piniaStore.getDescription( functionId );

				// Create a link to the Function.
				const $link = $( '<a>' )
					.attr( 'href', functionUri )
					.attr( 'target', '_blank' )
					.css( { 'font-weight': 'bold', display: 'block' } )
					.text( functionLabelData.label );

				// Create a Function description paragraph.
				const $description = $( '<p>' )
					.text( functionDescription )
					.css( { 'margin-bottom': '0' } );

				this.$body.empty().append( $link, $description );
				this.context.updateDimensions();
			} );

	} );
};

/* Registration */

ve.ui.contextItemFactory.register( ve.ui.WikifunctionsCallContextItem );
