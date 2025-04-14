/*!
 * WikiLambda extension's VisualEditor ContentEditable class for Wikifunctions calls.
 *
 * @copyright Abstract Wikipedia Team and others
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable layer for the Wikifunctions call node.
 *
 * @class
 * @extends ve.ce.LeafNode
 *
 * @constructor
 * @param {ve.dm.WikifunctionsCallNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.WikifunctionsCallNode = function VeCeWikifunctionsCallNode() {
	// Parent constructor
	ve.ce.WikifunctionsCallNode.super.apply( this, arguments );
};

/* Inheritance */
OO.inheritClass( ve.ce.WikifunctionsCallNode, ve.ce.MWTransclusionInlineNode );

/* Static properties */
ve.ce.WikifunctionsCallNode.static.name = 'WikifunctionsCall';

ve.ce.WikifunctionsCallNode.static.primaryCommandName = 'wikifunctionsCall';

ve.ce.WikifunctionsCallNode.static.iconWhenInvisible = 'functionObject';

ve.ce.WikifunctionsCallNode.static.tagName = 'span';

ve.ce.WikifunctionsCallNode.static.reloadTime = 2000;

ve.ce.WikifunctionsCallNode.static.maxRetries = 10;

/* Properties */
ve.ce.WikifunctionsCallNode.prototype.reloadTimeout = null;

/* Methods */

/**
 * @inheritdoc
 */
ve.ce.WikifunctionsCallNode.prototype.onSetup = function () {
	// Parent method
	ve.ce.WikifunctionsCallNode.super.prototype.onSetup.call( this );

	// DOM changes
	this.$element.addClass( 've-ce-wikifunctionsCallNode' );
};

/**
 * Builds new element for Function Call Loading state
 *
 * @return {jQuery}
 */
ve.ce.WikifunctionsCallNode.prototype.getLoadingState = function () {
	const loadingMsg = OO.ui.msg( 'wikilambda-visualeditor-wikifunctionscall-ce-loading' );

	const $loadingContainer = $( '<span>' )
		.addClass( 'ext-wikilambda-visualeditor-loading' );
	const $spinner = $( '<div>' )
		.addClass( 'cdx-progress-indicator' )
		.append(
			$( '<div>' )
				.addClass( 'cdx-progress-indicator__indicator' )
				.append(
					$( '<progress>' )
						.addClass( 'cdx-progress-indicator__indicator__progress' )
						.attr( 'aria-label', loadingMsg )
				)
		);

	$loadingContainer.append( $spinner ).append( loadingMsg );
	return $loadingContainer;
};

/**
 * Builds new element for Function Call Abort state
 *
 * @return {jQuery}
 */
ve.ce.WikifunctionsCallNode.prototype.getAbortState = function () {
	const abortMsg = OO.ui.msg( 'wikilambda-visualeditor-wikifunctionscall-ce-abort' );
	const $abort = $( '<span>' )
		.addClass( 'ext-wikilambda-visualeditor-abort' )
		.text( abortMsg );

	return $abort;
};

/**
 * Overrides ve.ce.GeneratedContentNode.prototype.generateContents as it isn't working for us.
 *
 * @inheritdoc
 */
ve.ce.WikifunctionsCallNode.prototype.generateContents = function ( config = {} ) {
	const deferred = ve.getProp( config, 'deferred' ) || ve.createDeferred();
	const model = this.getModel();

	// eslint-disable-next-line no-jquery/no-done-fail
	const xhr = ve.init.target.parseWikitextFragment(
		model.getWikitext(), true, model.getDocument()
	).done( ( response ) => {
		// Request not successful: render aborted state
		if ( ve.getProp( response, 'visualeditor', 'result' ) !== 'success' ) {
			deferred.resolve( this.getAbortState().get() );
			return;
		}

		// Handle content as MwTransclusionNode:
		const contentNodes = $.parseHTML(
			response.visualeditor.content, this.model && this.getModelHtmlDocument()
		) || [];
		const domElements = this.constructor.static.filterRendering( contentNodes );

		if ( domElements[ 0 ].classList.contains( 'mw-async-not-ready' ) ) {
			const loading = ve.getProp( config, 'loading' );

			// If loading=false, this is the first attempt:
			// * resolve deferred promise with "Loading..." element
			// * initialize the second forceUpdate process with loading=true in config
			if ( !loading ) {
				deferred.resolve( this.getLoadingState().get() );
				config.loading = true;
				// eslint-disable-next-line no-useless-call
				this.forceUpdate.call( this, config );
				return;
			}

			// If loading=true, this is the second or subsequent attempt:
			// * the "Loading..." element is already rendered
			// * clear the timeout if there was another pending
			// * we won't resolve the deferred promise until we have the content
			// * we retrigger this.generateContents with loading=true, retryCount and the second deferred
			if ( this.reloadTimeout !== null ) {
				clearTimeout( this.reloadTimeout );
			}

			this.reloadTimeout = setTimeout( () => {
				// get retry count or initialize to 0
				const retryCount = ve.getProp( config, 'retryCount' ) || 0;
				const surfaceModel = this.focusableSurface && this.focusableSurface.getModel();

				// Can we keep retrying?
				if ( surfaceModel && ( retryCount < ve.ce.WikifunctionsCallNode.static.maxRetries ) ) {
					config.retryCount = retryCount + 1;
					config.deferred = deferred;
					// eslint-disable-next-line no-useless-call
					this.generateContents.call( this, config );
				} else {
					deferred.resolve( this.getAbortState().get() );
				}
			}, ve.ce.WikifunctionsCallNode.static.reloadTime );

		} else {
			deferred.resolve( domElements );
		}

	} ).fail( () => {
		// Failed request: render abort state
		deferred.resolve( this.getAbortState().get() );
	} );

	return deferred.promise( { abort: xhr.abort } );
};

/**
 * Overrides ve.ce.GeneratedContentNode.prototype.doneGenerating to capture the
 * additional state attributes after the DOM fragment has been generated:
 * * isError: failed function call, DOM is error box
 *
 * @inheritdoc
 */
ve.ce.WikifunctionsCallNode.prototype.doneGenerating = function ( generatedContents, config, staged ) {

	// Call parent with empty to avoid Loading state being stored permanently
	ve.ce.WikifunctionsCallNode.super.prototype.doneGenerating.call( this, generatedContents, {}, staged );

	// Infer error state from generatedContents
	const hasError = generatedContents[ 0 ].classList.contains( 'cdx-message--error' );
	const hadError = this.model.getAttribute( 'isError' );

	// If isError attribute changed, update the model
	if ( hadError !== hasError ) {
		const surfaceModel = this.focusableSurface.getModel();
		if ( surfaceModel ) {
			surfaceModel.change(
				ve.dm.TransactionBuilder.static.newFromAttributeChanges(
					surfaceModel.getDocument(),
					this.model.getOuterRange().start,
					{ isError: hasError }
				)
			);
		}
	}
};

/* Registration */

ve.ce.nodeFactory.register( ve.ce.WikifunctionsCallNode );
