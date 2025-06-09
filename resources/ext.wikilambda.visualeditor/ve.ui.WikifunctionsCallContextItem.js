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

ve.ui.WikifunctionsCallContextItem.static.icon = 'functionObject';

ve.ui.WikifunctionsCallContextItem.static.label = OO.ui.deferMsg( 'wikilambda-visualeditor-wikifunctionscall-title' );

ve.ui.WikifunctionsCallContextItem.static.modelClasses = [ ve.dm.WikifunctionsCallNode ];

ve.ui.WikifunctionsCallContextItem.static.embeddable = false;

ve.ui.WikifunctionsCallContextItem.static.commandName = 'WikifunctionsCall';

ve.ui.WikifunctionsCallContextItem.static.suppresses = [ 'transclusion' ];

/* Methods */

/**
 * Maps error keys to grouped error message keys.
 *
 * @param {string} key
 * @return {string}
 */
ve.ui.WikifunctionsCallContextItem.getErrorMessageKey = function ( key ) {
	switch ( key ) {
		case 'wikilambda-functioncall-error-unknown-zid':
		case 'wikilambda-functioncall-error-nonfunction':
			return 'wikilambda-functioncall-error-message-unknown';
		case 'wikilambda-functioncall-error-nonstringinput':
		case 'wikilambda-functioncall-error-nonstringoutput':
			return 'wikilambda-functioncall-error-message-not-supported';
		case 'wikilambda-functioncall-error-bad-inputs':
			return 'wikilambda-functioncall-error-message-bad-inputs';
		case 'wikilambda-functioncall-error-bad-input-type':
			return 'wikilambda-functioncall-error-message-bad-input-type';
		case 'wikilambda-functioncall-error-bad-langs':
			return 'wikilambda-functioncall-error-message-bad-langs';
		case 'wikilambda-functioncall-error-disabled':
			return 'wikilambda-functioncall-error-message-disabled';
		case 'wikilambda-functioncall-error-bad-output':
		case 'wikilambda-functioncall-error-evaluation':
		case 'wikilambda-functioncall-error-unclear':
		case 'wikilambda-functioncall-error-invalid-zobject':
			return 'wikilambda-functioncall-error-message-system';
		default:
			return 'wikilambda-functioncall-error-message';
	}
};

/**
 * Set the error state of the context item.
 * This is called when the function call fails to load.
 *
 * @param {string} errorKey
 */
ve.ui.WikifunctionsCallContextItem.prototype.setErrorState = function ( errorKey ) {
	const groupedErrorMessageKey = ve.ui.WikifunctionsCallContextItem.getErrorMessageKey( errorKey );
	const $errorMsg = $( '<div>' )
		.addClass( 'cdx-message__content' )
		.append(
			// eslint-disable-next-line mediawiki/msg-doc
			mw.message( groupedErrorMessageKey,
				// eslint-disable-next-line mediawiki/msg-doc
				mw.message( errorKey || 'wikilambda-functioncall-error' ).text()
			).parse()
		);

	const $error = $( '<div>' )
		.addClass( 'cdx-message cdx-message--inline cdx-message--error' )
		.append( $( '<span>' ).addClass( 'cdx-message__icon' ) )
		.append( $errorMsg );

	this.$body.empty().append( $error );
	this.context.updateDimensions();
};

/**
 * @inheritdoc
 */
ve.ui.WikifunctionsCallContextItem.prototype.renderBody = function () {
	// Add loading message
	const $loading = $( '<div>' )
		.addClass( 'cdx-progress-indicator' )
		.css( { justifyContent: 'center', width: '100%' } )
		.append(
			$( '<div>' )
				.addClass( 'cdx-progress-indicator__indicator' )
				.append(
					$( '<progress>' )
						.addClass( 'cdx-progress-indicator__indicator__progress' )
						.attr( 'aria-label',
							OO.ui.msg( 'wikilambda-visualeditor-wikifunctionscall-popup-loading' )
						)
				)
		);

	this.$body.append( $loading );

	// Make sure App is loaded before accessing piniaStore
	ve.init.mw.WikifunctionsCall.vueAppLoaded.then( () => {
		// Get the mw data object
		const mwData = this.model.getAttribute( 'mw' );
		const isError = this.model.getAttribute( 'isError' );
		const errorKey = this.model.getAttribute( 'errorKey' );
		const mwPart = ( mwData.parts || [] )[ 0 ];
		const functionCall = ve.getProp( mwPart, 'parserfunction', 'params' );
		const functionId = functionCall[ 1 ].wt;

		// Request the function information
		ve.init.mw.WikifunctionsCall.piniaStore
			.fetchZids( { zids: [ functionId ] } )
			.then( () => {
				// Show error state if the function call failed for any reason
				// (e.g. server error, not found, invalid arguments, etc.),
				// Even if errors are detected earlier, we must set error state after fetching the function Zid.
				if ( isError ) {
					this.setErrorState( errorKey );
					return;
				}

				// If the function call is valid, show the function name and description.
				const functionLabelData = ve.init.mw.WikifunctionsCall.piniaStore.getLabelData( functionId );
				const functionLabel = functionLabelData.isUntitled ?
					OO.ui.deferMsg( 'brackets', OO.ui.msg( 'wikilambda-visualeditor-wikifunctionscall-no-name' ) ) :
					functionLabelData.label;

				const functionDescriptionData = ve.init.mw.WikifunctionsCall.piniaStore.getDescription( functionId );
				const functionDescription = !functionDescriptionData || functionDescriptionData.isUntitled ?
					OO.ui.deferMsg( 'brackets', OO.ui.msg( 'wikilambda-visualeditor-wikifunctionscall-no-description' ) ) :
					functionDescriptionData.label;

				const wikifunctionsUrl = mw.config.get( 'wgWikifunctionsBaseUrl' ) || '';
				const userLangCode = mw.config.get( 'wgUserLanguage' );
				const functionUri = `${ wikifunctionsUrl }/view/${ userLangCode }/${ functionId }`;

				// Create a link to the Function.
				const $link = $( '<a>' )
					.attr( 'href', functionUri )
					.attr( 'target', '_blank' )
					.css( { 'font-weight': 'bold', display: 'block' } )
					.text( functionLabel );

				// Create a Function description paragraph.
				const $description = $( '<p>' )
					.text( functionDescription )
					.attr( 'title', functionDescription )
					.css( {
						'margin-bottom': '0',
						display: '-webkit-box',
						'-webkit-line-clamp': '2',
						'-webkit-box-orient': 'vertical',
						overflow: 'hidden'
					} );

				// Set to placeholder color if there is no descriptio
				if ( !functionDescriptionData || functionDescriptionData.isUntitled ) {
					$description.css( { color: '#72777d' } );
				}

				this.$body.empty().append( $link, $description );
				this.context.updateDimensions();
			} );

	} );
};

/* Registration */

ve.ui.contextItemFactory.register( ve.ui.WikifunctionsCallContextItem );
